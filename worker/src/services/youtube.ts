// YouTube Data API + YouTube Analytics API client for fetching video metrics.
// Requires YOUTUBE_API_KEY env var for public data (fallback).
// Accepts a per-creator accessToken to use YouTube Analytics API v2 for richer metrics.

const YT_API_BASE = "https://www.googleapis.com/youtube/v3";
const YT_ANALYTICS_BASE = "https://youtubeanalytics.googleapis.com/v2";

export async function getVideoMetrics(
  videoUrl: string,
  tokenPayload?: string,
  creatorId?: string
): Promise<{
  views: number;
  likes: number;
  comments: number;
  watchTimeMinutes?: number;
  avgViewPercent?: number;
} | null> {
  const videoId = extractVideoId(videoUrl);
  if (!videoId) return null;

  let accessToken = tokenPayload;
  let refreshToken: string | undefined;
  let expiresAt: number | undefined;

  if (tokenPayload && tokenPayload.startsWith("{")) {
    try {
      const parsed = JSON.parse(tokenPayload);
      accessToken = parsed.accessToken;
      refreshToken = parsed.refreshToken;
      expiresAt = parsed.expiresAt;
    } catch (e) {
      // fallback to assuming it's a raw token string
    }
  }

  // Prefer YouTube Analytics API v2 when we have a creator OAuth token
  if (accessToken) {
    if (expiresAt && Date.now() > expiresAt - 5 * 60 * 1000 && refreshToken && creatorId) {
      try {
        const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: process.env.YOUTUBE_CLIENT_ID || "",
            client_secret: process.env.YOUTUBE_CLIENT_SECRET || "",
            refresh_token: refreshToken,
            grant_type: "refresh_token",
          }),
        });

        if (refreshResponse.ok) {
          const data = (await refreshResponse.json()) as any;
          accessToken = data.access_token;

          const { db } = require("../db");
          await db.creatorProfile.update({
            where: { userId: creatorId },
            data: {
              youtubeAccessToken: JSON.stringify({
                accessToken,
                refreshToken,
                expiresAt: Date.now() + data.expires_in * 1000
              })
            }
          });
          console.log(`[youtube] Refreshed YT access token for creator ${creatorId}`);
        }
      } catch (e) {
        console.error("[youtube] Failed to refresh token", e);
      }
    }

    const analyticsResult = await fetchAnalyticsMetrics(videoId, accessToken as string);
    if (analyticsResult) return analyticsResult;
    // Fall through to public API on analytics error
    console.warn(`[youtube] Analytics API failed for ${videoId}, falling back to public API`);
  }

  // Fallback: public YouTube Data API (API key only — standard metrics)
  return fetchPublicMetrics(videoId);
}

async function fetchAnalyticsMetrics(
  videoId: string,
  accessToken: string
): Promise<{
  views: number;
  likes: number;
  comments: number;
  watchTimeMinutes: number;
  avgViewPercent: number;
} | null> {
  try {
    const today = new Date().toISOString().split("T")[0];
    const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const url = new URL(`${YT_ANALYTICS_BASE}/reports`);
    url.searchParams.set("ids", "channel==MINE");
    url.searchParams.set("startDate", startDate!);
    url.searchParams.set("endDate", today!);
    url.searchParams.set("metrics", "views,likes,comments,estimatedMinutesWatched,averageViewPercentage");
    url.searchParams.set("filters", `video==${videoId}`);
    url.searchParams.set("dimensions", "video");

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      console.error(`[youtube] Analytics API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json() as any;
    const row = data.rows?.[0];
    if (!row) return null;

    // Row: [videoId, views, likes, comments, estimatedMinutesWatched, averageViewPercentage]
    return {
      views: row[1] ?? 0,
      likes: row[2] ?? 0,
      comments: row[3] ?? 0,
      watchTimeMinutes: row[4] ?? 0,
      avgViewPercent: row[5] ?? 0,
    };
  } catch (error) {
    console.error("[youtube] Analytics API error:", error);
    return null;
  }
}

async function fetchPublicMetrics(videoId: string): Promise<{
  views: number;
  likes: number;
  comments: number;
} | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.warn("[youtube] No YOUTUBE_API_KEY configured");
    return null;
  }

  try {
    const response = await fetch(
      `${YT_API_BASE}/videos?part=statistics&id=${videoId}&key=${apiKey}`
    );

    if (!response.ok) {
      console.error(`[youtube] Public API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json() as any;
    const stats = data.items?.[0]?.statistics;
    if (!stats) return null;

    return {
      views: parseInt(stats.viewCount ?? "0", 10),
      likes: parseInt(stats.likeCount ?? "0", 10),
      comments: parseInt(stats.commentCount ?? "0", 10),
    };
  } catch (error) {
    console.error("[youtube] Public API error:", error);
    return null;
  }
}

function extractVideoId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})/,
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/embed\/([A-Za-z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}
