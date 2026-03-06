"use strict";
// Instagram Graph API client for fetching post metrics
// Requires a per-creator access token (stored in CreatorProfile.instagramAccessToken).
// Falls back to INSTAGRAM_ACCESS_TOKEN env var for testing only.
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPostMetrics = getPostMetrics;
const GRAPH_API_BASE = "https://graph.instagram.com/v18.0";
// In-memory cache: shortcode → numeric Media ID.
// Avoids repeated oEmbed lookups for the same post on every hourly sync.
const mediaIdCache = new Map();
/**
 * Resolve an Instagram post/reel URL to a numeric Media ID using the oEmbed endpoint.
 * The IG Graph API /insights endpoint requires the numeric ID, not the URL shortcode.
 */
async function resolveMediaId(postUrl, accessToken) {
    // Extract shortcode to use as cache key
    const shortcodeMatch = postUrl.match(/instagram\.com\/(?:p|reel)\/([A-Za-z0-9_-]+)/);
    const shortcode = shortcodeMatch?.[1];
    if (!shortcode)
        return null;
    // Return cached value if we already resolved this shortcode
    if (mediaIdCache.has(shortcode)) {
        return mediaIdCache.get(shortcode);
    }
    try {
        // Use the IG media shortcode lookup to get the numeric Media ID
        const response = await fetch(`${GRAPH_API_BASE}/${shortcode}?fields=id&access_token=${accessToken}`);
        if (!response.ok) {
            // Shortcode lookup failed — try oEmbed as an alternative (no auth needed)
            const oembed = await fetch(`https://graph.facebook.com/v18.0/instagram_oembed?url=${encodeURIComponent(postUrl)}&access_token=${accessToken}`);
            if (!oembed.ok) {
                console.error(`[instagram] Cannot resolve Media ID for ${postUrl}: ${response.status}`);
                return null;
            }
            const oembedData = await oembed.json();
            const mediaId = oembedData?.media_id ?? oembedData?.media?.id;
            if (mediaId) {
                mediaIdCache.set(shortcode, mediaId);
                return mediaId;
            }
            return null;
        }
        const data = await response.json();
        const mediaId = data?.id;
        if (!mediaId)
            return null;
        mediaIdCache.set(shortcode, mediaId);
        return mediaId;
    }
    catch (error) {
        console.error(`[instagram] Error resolving Media ID for ${postUrl}:`, error);
        return null;
    }
}
/**
 * Fetch post/reel insights from Instagram Graph API.
 * Requires the creator's own OAuth access token.
 * Falls back to INSTAGRAM_ACCESS_TOKEN env var (dev/testing only).
 */
async function getPostMetrics(postUrl, accessToken) {
    const token = accessToken ?? process.env.INSTAGRAM_ACCESS_TOKEN;
    if (!token) {
        console.warn("[instagram] No access token available — skipping.");
        return null;
    }
    try {
        const mediaId = await resolveMediaId(postUrl, token);
        if (!mediaId)
            return null;
        // Fetch Reels-specific insights (plays, saved, shares) + standard metrics
        const response = await fetch(`${GRAPH_API_BASE}/${mediaId}/insights?metric=impressions,reach,video_views,plays,saved,shares,likes,comments&access_token=${token}`);
        if (!response.ok) {
            console.error(`[instagram] Insights API error: ${response.status} ${response.statusText}`);
            return null;
        }
        const data = await response.json();
        const metrics = parseInsights(data);
        return {
            // Prefer plays (Reels) > video_views > impressions as the "view" source
            views: metrics.plays ?? metrics.video_views ?? metrics.impressions,
            likes: metrics.likes,
            comments: metrics.comments,
            saves: metrics.saved ?? 0,
            shares: metrics.shares ?? 0,
        };
    }
    catch (error) {
        console.error("[instagram] API error:", error);
        return null;
    }
}
function parseInsights(data) {
    const result = {
        impressions: 0,
        reach: 0,
        likes: 0,
        comments: 0,
    };
    if (data?.data) {
        for (const metric of data.data) {
            const value = metric.values?.[0]?.value ?? metric.value ?? 0;
            result[metric.name] = value;
        }
    }
    return result;
}
//# sourceMappingURL=instagram.js.map