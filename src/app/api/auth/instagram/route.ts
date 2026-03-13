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

    // Use Facebook Login (Instagram Graph API) to get instagram_business_manage_insights scope.
    // This allows fetching richer metrics like reach and avg watch time from the Graph API.
    const authUrl = new URL("https://graph.facebook.com/v18.0/dialog/oauth");
    authUrl.searchParams.append("client_id", clientId);
    authUrl.searchParams.append("redirect_uri", redirectUri);
    authUrl.searchParams.append("scope", "instagram_business_manage_insights,pages_show_list,pages_read_engagement");
    authUrl.searchParams.append("response_type", "code");
    authUrl.searchParams.append("state", session.user.id);

    return NextResponse.redirect(authUrl.toString());
}
