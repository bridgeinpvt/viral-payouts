import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { db } from "@/server/db";

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "CREATOR") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const redirectUri = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/auth/instagram/callback`;

    if (error) {
        const errorReason = searchParams.get("error_reason");
        const errorDescription = searchParams.get("error_description");
        console.error("Instagram auth error:", error, errorReason, errorDescription);
        return NextResponse.redirect(`${process.env.NEXTAUTH_URL || "http://localhost:3000"}/creator/dashboard?error=instagram_auth_failed`);
    }

    if (!code) {
        return NextResponse.redirect(`${process.env.NEXTAUTH_URL || "http://localhost:3000"}/creator/dashboard?error=missing_code`);
    }

    const clientId = process.env.INSTAGRAM_CLIENT_ID;
    const clientSecret = process.env.INSTAGRAM_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        console.error("Missing INSTAGRAM_CLIENT_ID or INSTAGRAM_CLIENT_SECRET");
        return NextResponse.redirect(`${process.env.NEXTAUTH_URL || "http://localhost:3000"}/creator/dashboard?error=server_configuration_error`);
    }

    try {
        // 1. Exchange the code for a short-lived access token
        const tokenFormData = new FormData();
        tokenFormData.append("client_id", clientId);
        tokenFormData.append("client_secret", clientSecret);
        tokenFormData.append("grant_type", "authorization_code");
        tokenFormData.append("redirect_uri", redirectUri);
        tokenFormData.append("code", code);

        const tokenResponse = await fetch("https://api.instagram.com/oauth/access_token", {
            method: "POST",
            body: tokenFormData,
        });

        if (!tokenResponse.ok) {
            const errorData = await tokenResponse.json();
            console.error("Failed to fetch short-lived token:", errorData);
            return NextResponse.redirect(`${process.env.NEXTAUTH_URL || "http://localhost:3000"}/creator/dashboard?error=token_exchange_failed`);
        }

        const tokenData = await tokenResponse.json();
        const shortLivedToken = tokenData.access_token;
        const userId = tokenData.user_id; // Instagram User ID

        // 2. Exchange short-lived token for a long-lived token (valid for 60 days)
        const longLivedUrl = new URL("https://graph.instagram.com/access_token");
        longLivedUrl.searchParams.append("grant_type", "ig_exchange_token");
        longLivedUrl.searchParams.append("client_secret", clientSecret);
        longLivedUrl.searchParams.append("access_token", shortLivedToken);

        const longLivedResponse = await fetch(longLivedUrl.toString(), {
            method: "GET",
        });

        if (!longLivedResponse.ok) {
            const errorData = await longLivedResponse.json();
            console.error("Failed to fetch long-lived token:", errorData);
            return NextResponse.redirect(`${process.env.NEXTAUTH_URL || "http://localhost:3000"}/creator/dashboard?error=long_lived_token_failed`);
        }

        const longLivedData = await longLivedResponse.json();
        const longLivedToken = longLivedData.access_token;

        // 3. Fetch basic user profile from Instagram (optional, but good to store the handle)
        const profileUrl = new URL("https://graph.instagram.com/me");
        profileUrl.searchParams.append("fields", "id,username");
        profileUrl.searchParams.append("access_token", longLivedToken);

        let instagramHandle = null;
        try {
            const profileResponse = await fetch(profileUrl.toString());
            if (profileResponse.ok) {
                const profileData = await profileResponse.json();
                instagramHandle = profileData.username;
            }
        } catch (e) {
            console.error("Failed to fetch Instagram profile:", e);
        }

        // 4. Save to database
        await db.creatorProfile.update({
            where: { userId: session.user.id },
            data: {
                instagramAccessToken: longLivedToken,
                ...(instagramHandle ? { instagramHandle } : {}),
            },
        });

        // 5. Redirect back to dashboard on success
        return NextResponse.redirect(`${process.env.NEXTAUTH_URL || "http://localhost:3000"}/creator/dashboard?success=instagram_connected`);
    } catch (error) {
        console.error("Error during Instagram OAuth callback:", error);
        return NextResponse.redirect(`${process.env.NEXTAUTH_URL || "http://localhost:3000"}/creator/dashboard?error=internal_server_error`);
    }
}
