// YouTube Data API client for fetching video metrics
// Requires YOUTUBE_API_KEY env var

const YT_API_BASE = "https://www.googleapis.com/youtube/v3";

export async function getVideoMetrics(videoUrl: string): Promise<{
  views: number;
  likes: number;
  comments: number;
} | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.warn("No YouTube API key configured");
    return null;
  }

  try {
    const videoId = extractVideoId(videoUrl);
    if (!videoId) return null;

    const response = await fetch(
      `${YT_API_BASE}/videos?part=statistics&id=${videoId}&key=${apiKey}`
    );

    if (!response.ok) {
      console.error(`YT API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    const stats = data.items?.[0]?.statistics;

    if (!stats) return null;

    return {
      views: parseInt(stats.viewCount ?? "0", 10),
      likes: parseInt(stats.likeCount ?? "0", 10),
      comments: parseInt(stats.commentCount ?? "0", 10),
    };
  } catch (error) {
    console.error("YouTube API error:", error);
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
