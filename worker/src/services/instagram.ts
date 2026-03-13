// Instagram Graph API client for fetching post metrics
// Requires a per-creator access token (stored encrypted in CreatorProfile.instagramAccessToken).
// Falls back to INSTAGRAM_ACCESS_TOKEN env var for testing only.

import { decryptToken, isEncrypted } from "../lib/token-crypto";

const GRAPH_API_BASE = "https://graph.instagram.com/v18.0";

/** Resolve a stored token — decrypt if encrypted, pass through if raw (legacy/dev). */
function resolveToken(stored: string): string {
  if (isEncrypted(stored)) {
    const plain = decryptToken(stored);
    if (!plain) throw new Error("[instagram] Token decryption failed — check TOKEN_ENCRYPTION_KEY");
    return plain;
  }
  return stored; // legacy plaintext fallback
}

// In-memory cache: shortcode → numeric Media ID.
// Avoids repeated oEmbed lookups for the same post on every hourly sync.
const mediaIdCache = new Map<string, string>();

/**
 * fetch() wrapper with exponential backoff for Meta API rate limits.
 * Retries on 429 (rate limited) and 500/503 (transient server errors).
 * Logs the X-Business-Use-Case-Usage header at ≥ 80% consumption.
 */
async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  retries = 3,
  backoffMs = 2000
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const response = await fetch(url, options);

    // Log rate limit usage if header is present
    const usageHeader = response.headers.get("X-Business-Use-Case-Usage");
    if (usageHeader) {
      try {
        const usage = JSON.parse(usageHeader) as Record<string, Array<{ call_count: number; total_cputime: number; total_time: number }>>;
        for (const [appId, metrics] of Object.entries(usage)) {
          const m = metrics[0];
          if (m && (m.call_count >= 80 || m.total_time >= 80)) {
            console.warn(`[instagram] Rate limit warning for app ${appId}: calls=${m.call_count}% cpu=${m.total_cputime}% time=${m.total_time}%`);
          }
        }
      } catch { /* ignore parse errors */ }
    }

    if (response.status === 429 || response.status === 503) {
      if (attempt === retries) return response; // exhausted — caller handles it
      const delay = backoffMs * Math.pow(2, attempt);
      console.warn(`[instagram] Rate limited (${response.status}), retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`);
      await new Promise((r) => setTimeout(r, delay));
      continue;
    }

    return response;
  }
  // TypeScript requires a return here, but the loop above always returns
  throw new Error("[instagram] fetchWithRetry: unreachable");
}

interface IGMediaInsights {
  impressions: number;
  reach: number;
  video_views?: number;
  plays?: number;
  saved?: number;
  shares?: number;
  likes: number;
  comments: number;
  ig_reels_avg_watch_time?: number;
}

/**
 * Resolve an Instagram post/reel URL to a numeric Media ID using the oEmbed endpoint.
 * The IG Graph API /insights endpoint requires the numeric ID, not the URL shortcode.
 */
async function resolveMediaId(postUrl: string, accessToken: string): Promise<string | null> {
  // Extract shortcode to use as cache key
  const shortcodeMatch = postUrl.match(/instagram\.com\/(?:p|reel)\/([A-Za-z0-9_-]+)/);
  const shortcode = shortcodeMatch?.[1];
  if (!shortcode) return null;

  // Return cached value if we already resolved this shortcode
  if (mediaIdCache.has(shortcode)) {
    return mediaIdCache.get(shortcode)!;
  }

  try {
    // Use the IG media shortcode lookup to get the numeric Media ID
    const response = await fetchWithRetry(
      `${GRAPH_API_BASE}/${shortcode}?fields=id&access_token=${accessToken}`
    );

    if (!response.ok) {
      // Shortcode lookup failed — try oEmbed as an alternative (no auth needed)
      const oembed = await fetchWithRetry(
        `https://graph.facebook.com/v18.0/instagram_oembed?url=${encodeURIComponent(postUrl)}&access_token=${accessToken}`
      );
      if (!oembed.ok) {
        console.error(`[instagram] Cannot resolve Media ID for ${postUrl}: ${response.status}`);
        return null;
      }
      const oembedData = await oembed.json() as any;
      const mediaId: string | undefined = oembedData?.media_id ?? oembedData?.media?.id;
      if (mediaId) {
        mediaIdCache.set(shortcode, mediaId);
        return mediaId;
      }
      return null;
    }

    const data = await response.json() as any;
    const mediaId: string | undefined = data?.id;
    if (!mediaId) return null;

    mediaIdCache.set(shortcode, mediaId);
    return mediaId;
  } catch (error) {
    console.error(`[instagram] Error resolving Media ID for ${postUrl}:`, error);
    return null;
  }
}

/**
 * Fetch post/reel insights from Instagram Graph API.
 * Requires the creator's own OAuth access token.
 * Falls back to INSTAGRAM_ACCESS_TOKEN env var (dev/testing only).
 */
export async function getPostMetrics(
  postUrl: string,
  accessToken?: string
): Promise<{
  views: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  reach: number;
  avgWatchTime: number | null;
} | null> {
  const rawToken = accessToken ?? process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!rawToken) {
    console.warn("[instagram] No access token available — skipping.");
    return null;
  }
  const token = resolveToken(rawToken);

  try {
    const mediaId = await resolveMediaId(postUrl, token);
    if (!mediaId) return null;

    // Fetch Reels-specific insights (plays, saved, shares, avg watch time) + standard metrics
    const response = await fetchWithRetry(
      `${GRAPH_API_BASE}/${mediaId}/insights?metric=impressions,reach,video_views,plays,saved,shares,likes,comments,ig_reels_avg_watch_time&access_token=${token}`
    );

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
      reach: metrics.reach ?? 0,
      avgWatchTime: metrics.ig_reels_avg_watch_time ?? null,
    };
  } catch (error) {
    console.error("[instagram] API error:", error);
    return null;
  }
}

function parseInsights(data: any): IGMediaInsights {
  const result: IGMediaInsights = {
    impressions: 0,
    reach: 0,
    likes: 0,
    comments: 0,
  };

  if (data?.data) {
    for (const metric of data.data) {
      const value = metric.values?.[0]?.value ?? metric.value ?? 0;
      (result as any)[metric.name] = value;
    }
  }

  return result;
}
