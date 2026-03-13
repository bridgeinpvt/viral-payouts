import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { db } from "@/server/db";
import { encryptToken } from "@/lib/token-crypto";

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "CREATOR") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const redirectUri = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/auth/instagram/callback`;
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

    if (error) {
        const errorDescription = searchParams.get("error_description");
        console.error("Instagram auth error:", error, errorDescription);
        return NextResponse.redirect(`${baseUrl}/creator/dashboard?error=instagram_auth_failed`);
    }

    if (!code) {
        return NextResponse.redirect(`${baseUrl}/creator/dashboard?error=missing_code`);
    }

    const clientId = process.env.INSTAGRAM_CLIENT_ID;
    const clientSecret = process.env.INSTAGRAM_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        console.error("Missing INSTAGRAM_CLIENT_ID or INSTAGRAM_CLIENT_SECRET");
        return NextResponse.redirect(`${baseUrl}/creator/dashboard?error=server_configuration_error`);
    }

    try {
        // 1. Exchange code for short-lived token via Facebook Login endpoint
        const tokenFormData = new FormData();
        tokenFormData.append("client_id", clientId);
        tokenFormData.append("client_secret", clientSecret);
        tokenFormData.append("grant_type", "authorization_code");
        tokenFormData.append("redirect_uri", redirectUri);
        tokenFormData.append("code", code);

        const tokenResponse = await fetch("https://graph.facebook.com/v18.0/oauth/access_token", {
            method: "POST",
            body: tokenFormData,
        });

        if (!tokenResponse.ok) {
            const errorData = await tokenResponse.json();
            console.error("Failed to fetch short-lived token:", errorData);
            return NextResponse.redirect(`${baseUrl}/creator/dashboard?error=token_exchange_failed`);
        }

        const tokenData = await tokenResponse.json();
        const shortLivedToken = tokenData.access_token;

        // 2. Exchange short-lived token for a long-lived token (~60 days)
        const longLivedUrl = new URL("https://graph.facebook.com/v18.0/oauth/access_token");
        longLivedUrl.searchParams.append("grant_type", "fb_exchange_token");
        longLivedUrl.searchParams.append("client_id", clientId);
        longLivedUrl.searchParams.append("client_secret", clientSecret);
        longLivedUrl.searchParams.append("fb_exchange_token", shortLivedToken);

        const longLivedResponse = await fetch(longLivedUrl.toString(), { method: "GET" });

        if (!longLivedResponse.ok) {
            const errorData = await longLivedResponse.json();
            console.error("Failed to fetch long-lived token:", errorData);
            return NextResponse.redirect(`${baseUrl}/creator/dashboard?error=long_lived_token_failed`);
        }

        const longLivedData = await longLivedResponse.json();
        const longLivedToken = longLivedData.access_token;
        const expiresIn: number = longLivedData.expires_in ?? 5184000; // default 60 days

        // 3. Resolve Instagram Business Account ID via Facebook Pages
        let instagramUserId: string | null = null;

        try {
            const pagesResponse = await fetch(
                `https://graph.facebook.com/v18.0/me/accounts?access_token=${longLivedToken}`
            );
            if (pagesResponse.ok) {
                const pagesData = await pagesResponse.json();
                const firstPage = pagesData?.data?.[0];
                if (firstPage?.id) {
                    const igAccountResponse = await fetch(
                        `https://graph.facebook.com/v18.0/${firstPage.id}?fields=instagram_business_account&access_token=${longLivedToken}`
                    );
                    if (igAccountResponse.ok) {
                        const igAccountData = await igAccountResponse.json();
                        instagramUserId = igAccountData?.instagram_business_account?.id ?? null;
                    }
                }
            }
        } catch (e) {
            console.error("Failed to resolve Instagram Business Account ID:", e);
        }

        // 4. Fetch Instagram username
        let instagramHandle: string | null = null;

        if (instagramUserId) {
            try {
                const profileResponse = await fetch(
                    `https://graph.facebook.com/v18.0/${instagramUserId}?fields=username&access_token=${longLivedToken}`
                );
                if (profileResponse.ok) {
                    const profileData = await profileResponse.json();
                    instagramHandle = profileData.username ?? null;
                }
            } catch (e) {
                console.error("Failed to fetch Instagram profile:", e);
            }
        }

        // 5. Save to database — token is encrypted at rest
        await db.creatorProfile.update({
            where: { userId: session.user.id },
            data: {
                instagramAccessToken: encryptToken(longLivedToken),
                instagramTokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
                ...(instagramUserId ? { instagramUserId } : {}),
                ...(instagramHandle ? { instagramHandle } : {}),
            },
        });

        return NextResponse.redirect(`${baseUrl}/creator/dashboard?success=instagram_connected`);
    } catch (error) {
        console.error("Error during Instagram OAuth callback:", error);
        return NextResponse.redirect(`${baseUrl}/creator/dashboard?error=internal_server_error`);
    }
}
