// Instagram Graph API client for fetching post metrics
// Requires INSTAGRAM_ACCESS_TOKEN env var

const GRAPH_API_BASE = "https://graph.instagram.com/v18.0";

interface IGMediaInsights {
  impressions: number;
  reach: number;
  video_views?: number;
  likes: number;
  comments: number;
}

export async function getPostMetrics(postUrl: string, accessToken?: string): Promise<{
  views: number;
  likes: number;
  comments: number;
} | null> {
  const token = accessToken ?? process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) {
    console.warn("No Instagram access token configured");
    return null;
  }

  try {
    // Extract media ID from URL (simplified — in production, use oEmbed or shortcode lookup)
    const mediaId = extractMediaId(postUrl);
    if (!mediaId) return null;

    const response = await fetch(
      `${GRAPH_API_BASE}/${mediaId}/insights?metric=impressions,reach,video_views,likes,comments&access_token=${token}`
    );

    if (!response.ok) {
      console.error(`IG API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    const metrics = parseInsights(data);

    return {
      views: metrics.video_views ?? metrics.impressions,
      likes: metrics.likes,
      comments: metrics.comments,
    };
  } catch (error) {
    console.error("Instagram API error:", error);
    return null;
  }
}

function extractMediaId(postUrl: string): string | null {
  // This is a simplified extraction — in production, use the oEmbed endpoint
  // or maintain a mapping of post URLs to media IDs
  const match = postUrl.match(/instagram\.com\/(?:p|reel)\/([A-Za-z0-9_-]+)/);
  return match?.[1] ?? null;
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
      if (metric.name in result) {
        (result as any)[metric.name] = metric.values?.[0]?.value ?? 0;
      }
    }
  }

  return result;
}
