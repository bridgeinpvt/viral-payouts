"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncViews = syncViews;
const db_1 = require("../db");
const instagram_1 = require("../services/instagram");
const youtube_1 = require("../services/youtube");
const fraud_1 = require("../services/fraud");
const metrics_1 = require("../services/metrics");
async function syncViews() {
    // Fetch all LIVE VIEW campaigns with active/completed participations.
    // Include the creator's OAuth tokens so we can call IG/YT APIs on their behalf.
    const campaigns = await db_1.db.campaign.findMany({
        where: { type: "VIEW", status: "LIVE" },
        include: {
            participations: {
                where: { status: { in: ["ACTIVE", "COMPLETED"] } },
                include: {
                    creator: {
                        select: {
                            id: true,
                            creatorProfile: {
                                select: {
                                    instagramAccessToken: true,
                                    youtubeAccessToken: true,
                                },
                            },
                        },
                    },
                    contentItems: true,
                },
            },
        },
    });
    for (const campaign of campaigns) {
        for (const participation of campaign.participations) {
            try {
                // Get the URL to track — prefer contentUrl, then first contentItem
                const postUrl = participation.contentUrl ??
                    participation.contentItems?.[0]?.url;
                if (!postUrl) {
                    console.log(`[view-sync] No content URL for participation ${participation.id} — skipping`);
                    continue;
                }
                // Extract per-creator tokens
                const igToken = participation.creator.creatorProfile?.instagramAccessToken ??
                    undefined;
                const ytToken = participation.creator.creatorProfile?.youtubeAccessToken ??
                    undefined;
                // Determine platform and fetch metrics with the creator's own token
                const platform = detectPlatform(postUrl);
                let metrics = null;
                if (platform === "INSTAGRAM") {
                    if (!igToken) {
                        console.warn(`[view-sync] No Instagram access token for creator ${participation.creatorId} — skipping`);
                        continue;
                    }
                    metrics = await (0, instagram_1.getPostMetrics)(postUrl, igToken);
                }
                else if (platform === "YOUTUBE") {
                    // YouTube can fall back to public API with YOUTUBE_API_KEY — token is optional
                    metrics = await (0, youtube_1.getVideoMetrics)(postUrl, ytToken, participation.creatorId);
                }
                else {
                    console.log(`[view-sync] Unsupported platform for URL: ${postUrl} — skipping`);
                    continue;
                }
                if (!metrics) {
                    console.warn(`[view-sync] No metrics returned for ${postUrl} — skipping`);
                    continue;
                }
                // Get the most recent snapshot to calculate view delta
                const previousSnapshot = await db_1.db.viewSnapshot.findFirst({
                    where: {
                        campaignId: campaign.id,
                        creatorId: participation.creatorId,
                        platform: platform,
                        postUrl,
                    },
                    orderBy: { snapshotAt: "desc" },
                });
                // Calculate delta: how many new views since last snapshot
                const previousViewCount = previousSnapshot?.viewCount ?? 0;
                const deltaViews = Math.max(0, metrics.views - previousViewCount);
                // Store new snapshot — record both cumulative count and delta
                await db_1.db.viewSnapshot.create({
                    data: {
                        campaignId: campaign.id,
                        creatorId: participation.creatorId,
                        platform: platform,
                        postUrl,
                        viewCount: metrics.views,
                        likeCount: metrics.likes,
                        commentCount: metrics.comments,
                        shareCount: metrics.shares ?? 0,
                        deltaViews,
                        snapshotAt: new Date(),
                    },
                });
                // Fraud: check for view spike only when we have a previous baseline
                if (previousSnapshot) {
                    await (0, fraud_1.checkViewSpike)(campaign.id, participation.creatorId, metrics.views, previousViewCount);
                }
                // Update aggregated CampaignMetrics by the DELTA (not total) to avoid double counting
                if (deltaViews > 0) {
                    await (0, metrics_1.updateMetrics)(campaign.id, participation.creatorId, {
                        verifiedViews: deltaViews,
                    });
                }
                console.log(`[view-sync] ${campaign.id}/${participation.creatorId} on ${platform}: +${deltaViews} new views (total: ${metrics.views})`);
            }
            catch (error) {
                console.error(`[view-sync] Error for participation ${participation.id}:`, error);
            }
        }
    }
}
function detectPlatform(url) {
    if (url.includes("instagram.com"))
        return "INSTAGRAM";
    if (url.includes("youtube.com") || url.includes("youtu.be"))
        return "YOUTUBE";
    return "OTHER";
}
//# sourceMappingURL=view-sync.js.map