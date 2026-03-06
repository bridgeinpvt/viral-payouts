import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "CREATOR") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clientId = process.env.INSTAGRAM_CLIENT_ID;
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const redirectUri = `${baseUrl}/api/auth/instagram/callback`;

    if (!clientId) {
        console.error("Missing INSTAGRAM_CLIENT_ID in environment variables");
        return NextResponse.json(
            { error: "Instagram integration is not configured." },
            { status: 500 }
        );
    }

    // Instagram Display API authorization URL (or Instagram Graph API depending on app type)
    // For creator/business accounts fetching insights, we need the Instagram Graph API via Facebook Login.
    // Standard consumer IG apps use instagram.com/oauth/authorize.
    // We assume a standard Facebook Login flow with scopes for instagram_basic, instagram_manage_insights, pages_show_list, pages_read_engagement.
    // Since the scope isn't exactly specified, let's use the standard IG basic display for now or FB login.
    // The implementation plan says "redirects user to https://api.instagram.com/oauth/authorize with user_profile,user_media scopes", which implies Instagram Basic Display API.

    const authUrl = new URL("https://api.instagram.com/oauth/authorize");
    authUrl.searchParams.append("client_id", clientId);
    authUrl.searchParams.append("redirect_uri", redirectUri);
    authUrl.searchParams.append("scope", "user_profile,user_media");
    authUrl.searchParams.append("response_type", "code");
    // Pass user ID as state to link securely (or just use NextAuth session in callback)
    authUrl.searchParams.append("state", session.user.id);

    return NextResponse.redirect(authUrl.toString());
}
