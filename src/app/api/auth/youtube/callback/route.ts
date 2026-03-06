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
    const redirectUri = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/auth/youtube/callback`;

    if (error) {
        console.error("YouTube auth error:", error);
        return NextResponse.redirect(`${process.env.NEXTAUTH_URL || "http://localhost:3000"}/creator/dashboard?error=youtube_auth_failed`);
    }

    if (!code) {
        return NextResponse.redirect(`${process.env.NEXTAUTH_URL || "http://localhost:3000"}/creator/dashboard?error=missing_code`);
    }

    const clientId = process.env.YOUTUBE_CLIENT_ID;
    const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        console.error("Missing YOUTUBE_CLIENT_ID or YOUTUBE_CLIENT_SECRET");
        return NextResponse.redirect(`${process.env.NEXTAUTH_URL || "http://localhost:3000"}/creator/dashboard?error=server_configuration_error`);
    }

    try {
        // 1. Exchange the authorization code for an access token and a refresh token
        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                code,
                grant_type: "authorization_code",
                redirect_uri: redirectUri,
            }),
        });

        if (!tokenResponse.ok) {
            const errorData = await tokenResponse.json();
            console.error("Failed to fetch YouTube tokens:", errorData);
            return NextResponse.redirect(`${process.env.NEXTAUTH_URL || "http://localhost:3000"}/creator/dashboard?error=token_exchange_failed`);
        }

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;
        const refreshToken = tokenData.refresh_token;
        const expiresIn = tokenData.expires_in;

        // 2. Fetch basic channel info
        // The channel API returns the handle or title
        const channelUrl = new URL("https://www.googleapis.com/youtube/v3/channels");
        channelUrl.searchParams.append("part", "snippet,statistics");
        channelUrl.searchParams.append("mine", "true");

        let youtubeHandle = null;
        let youtubeSubscribers = null;

        try {
            const channelResponse = await fetch(channelUrl.toString(), {
                headers: { Authorization: `Bearer ${accessToken}` },
            });

            if (channelResponse.ok) {
                const channelData = await channelResponse.json();
                const channel = channelData.items?.[0];
                if (channel) {
                    youtubeHandle = channel.snippet?.customUrl || channel.snippet?.title;
                    youtubeSubscribers = parseInt(channel.statistics?.subscriberCount || "0", 10);
                }
            }
        } catch (e) {
            console.error("Failed to fetch YouTube channel info:", e);
        }

        // 3. Since our Prisma schema only has youtubeAccessToken (String?), we will store 
        // both tokens as a JSON string so our worker can refresh it later if needed.
        // If there's no refresh token in this response (can happen if user already authorized but we lost it),
        // we'll fetch the existing one and retain it.
        let storedTokenPayload: any = {
            accessToken,
            expiresAt: Date.now() + expiresIn * 1000,
        };

        if (refreshToken) {
            storedTokenPayload.refreshToken = refreshToken;
        } else {
            // Try to recover the old refresh token if we got a new access token without one 
            // (Google only sends refresh_token on the first prompt=consent request)
            const existingCreator = await db.creatorProfile.findUnique({
                where: { userId: session.user.id },
                select: { youtubeAccessToken: true }
            });

            if (existingCreator?.youtubeAccessToken) {
                try {
                    const parsed = JSON.parse(existingCreator.youtubeAccessToken);
                    if (parsed.refreshToken) {
                        storedTokenPayload.refreshToken = parsed.refreshToken;
                    }
                } catch (e) {
                    // Previously stored token wasn't JSON, ignore
                }
            }
        }

        // 4. Save to database
        await db.creatorProfile.update({
            where: { userId: session.user.id },
            data: {
                youtubeAccessToken: JSON.stringify(storedTokenPayload),
                ...(youtubeHandle ? { youtubeHandle } : {}),
                ...(youtubeSubscribers !== null ? { youtubeSubscribers } : {}),
            },
        });

        // 5. Redirect back to dashboard on success
        return NextResponse.redirect(`${process.env.NEXTAUTH_URL || "http://localhost:3000"}/creator/dashboard?success=youtube_connected`);
    } catch (error) {
        console.error("Error during YouTube OAuth callback:", error);
        return NextResponse.redirect(`${process.env.NEXTAUTH_URL || "http://localhost:3000"}/creator/dashboard?error=internal_server_error`);
    }
}
