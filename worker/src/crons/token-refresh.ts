import cron from "node-cron";
import { db } from "../db";
import { decryptToken, encryptToken, isEncrypted } from "../lib/token-crypto";

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
    // Only refresh tokens expiring within the next 15 days (but not already expired).
    const fifteenDaysFromNow = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);

    const creators = await db.creatorProfile.findMany({
        where: {
            instagramAccessToken: { not: null },
            instagramTokenExpiresAt: {
                lte: fifteenDaysFromNow,
                gte: new Date(),
            },
        },
        select: {
            id: true,
            userId: true,
            instagramAccessToken: true,
            instagramTokenExpiresAt: true,
        },
    });

    let successCount = 0;
    let failureCount = 0;

    for (const creator of creators) {
        try {
            const storedToken = creator.instagramAccessToken as string;
            const plainToken = isEncrypted(storedToken)
                ? decryptToken(storedToken)
                : storedToken;

            if (!plainToken) {
                console.warn(`[token-refresh] Could not decrypt token for user ${creator.userId} — skipping`);
                failureCount++;
                continue;
            }

            // Facebook User Access Tokens (from Facebook Login) are refreshed via fb_exchange_token.
            // Instagram User Access Tokens (from Instagram Business Login) use ig_refresh_token on graph.instagram.com.
            // We use Facebook Login, so use the Facebook endpoint.
            const url = new URL("https://graph.facebook.com/oauth/access_token");
            url.searchParams.append("grant_type", "fb_exchange_token");
            url.searchParams.append("client_id", process.env.INSTAGRAM_CLIENT_ID!);
            url.searchParams.append("client_secret", process.env.INSTAGRAM_CLIENT_SECRET!);
            url.searchParams.append("fb_exchange_token", plainToken);

            const response = await fetch(url.toString(), { method: "GET" });

            if (!response.ok) {
                const errBody = await response.text();
                console.warn(`[token-refresh] Failed to refresh FB token for user ${creator.userId}: ${response.status} ${errBody}`);
                failureCount++;
                continue;
            }

            const data = (await response.json()) as any;

            if (data && data.access_token) {
                await db.creatorProfile.update({
                    where: { userId: creator.userId },
                    data: {
                        instagramAccessToken: encryptToken(data.access_token),
                        instagramTokenExpiresAt: new Date(Date.now() + (data.expires_in ?? 5184000) * 1000),
                    },
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
