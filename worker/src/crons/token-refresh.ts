import cron from "node-cron";
import { db } from "../db";

export function startTokenRefreshCron() {
    // Run daily at 02:00 AM
    cron.schedule("0 2 * * *", async () => {
        console.log("[token-refresh] Starting Instagram long-lived token refresh job...");
        try {
            await refreshInstagramTokens();
        } catch (error) {
            console.error("[token-refresh] Job failed:", error);
        }
    });
}

async function refreshInstagramTokens() {
    // Find creators whose instagramAccessToken is populated.
    // We should ideally track when the token was last refreshed, but since Meta's /refresh_access_token 
    // can be called before it expires (and unexpired tokens will just be extended), we can fetch all or just those 
    // that haven't been refreshed in the last 50 days. As a V1, we'll try to refresh all tokens we have.
    // In a large system, we'd add `instagramTokenUpdatedAt` to CreatorProfile and filter by `< 10 days ago`.

    const creators = await db.creatorProfile.findMany({
        where: {
            instagramAccessToken: { not: null },
        },
        select: {
            id: true,
            userId: true,
            instagramAccessToken: true,
            updatedAt: true,
        },
    });

    let successCount = 0;
    let failureCount = 0;

    for (const creator of creators) {
        // Optimization: only refresh if the profile was last updated more than 45 days ago.
        // However, since updatedAt changes on ANY profile update, it's safer to just refresh the token 
        // if it's older than 45 days. Since we don't have exactly when the token was acquired, 
        // we'll attempt refresh. The Graph API will return a new token (or same token with extended life).

        // To be safe and polite to rate limits, let's just attempt it for all right now, 
        // or log that we are doing it. It's a daily cron, but we don't want to hit Meta API 
        // for active users every day if not needed.
        // Let's pretend it's fine for our small scale, or check if we should do it weekly.

        try {
            const url = new URL("https://graph.instagram.com/refresh_access_token");
            url.searchParams.append("grant_type", "ig_refresh_token");
            url.searchParams.append("access_token", creator.instagramAccessToken as string);

            const response = await fetch(url.toString(), { method: "GET" });

            if (!response.ok) {
                console.warn(`[token-refresh] Failed to refresh IG token for user ${creator.userId}: ${response.status}`);
                failureCount++;
                continue;
            }

            const data = (await response.json()) as any;

            if (data && data.access_token) {
                await db.creatorProfile.update({
                    where: { userId: creator.userId },
                    data: { instagramAccessToken: data.access_token },
                });
                successCount++;
            } else {
                failureCount++;
            }
        } catch (err) {
            console.error(`[token-refresh] Error refreshing token for ${creator.userId}`, err);
            failureCount++;
        }
    }

    console.log(`[token-refresh] Job complete. Success: ${successCount}, Failures: ${failureCount}`);
}
