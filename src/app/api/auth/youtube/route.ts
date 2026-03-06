import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "CREATOR") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clientId = process.env.YOUTUBE_CLIENT_ID;
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const redirectUri = `${baseUrl}/api/auth/youtube/callback`;

    if (!clientId) {
        console.error("Missing YOUTUBE_CLIENT_ID in environment variables");
        return NextResponse.json(
            { error: "YouTube integration is not configured." },
            { status: 500 }
        );
    }

    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.append("client_id", clientId);
    authUrl.searchParams.append("redirect_uri", redirectUri);
    authUrl.searchParams.append("response_type", "code");
    // We need youtube.readonly to fetch channel stats and video analytics 
    authUrl.searchParams.append("scope", "https://www.googleapis.com/auth/youtube.readonly");
    // Offline access guarantees a refresh token
    authUrl.searchParams.append("access_type", "offline");
    authUrl.searchParams.append("prompt", "consent");

    // Pass user ID as state
    authUrl.searchParams.append("state", session.user.id);

    return NextResponse.redirect(authUrl.toString());
}
