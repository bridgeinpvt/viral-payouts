import { db } from "../db";
import { getPostMetrics as getIGMetrics } from "../services/instagram";
import { getVideoMetrics as getYTMetrics } from "../services/youtube";
import { checkViewSpike } from "../services/fraud";
import { updateMetrics } from "../services/metrics";

export async function syncViews(): Promise<void> {
  // Get all LIVE VIEW campaigns with active participations
  const campaigns = await db.campaign.findMany({
    where: { type: "VIEW", status: "LIVE" },
    include: {
      participations: {
        where: { status: { in: ["ACTIVE", "COMPLETED"] } },
        include: {
          creator: { select: { id: true } },
          contentItems: true,
        },
      },
    },
  });

  for (const campaign of campaigns) {
    for (const participation of campaign.participations) {
      try {
        // Get content URLs from participation (check contentUrl field or contentItems)
        const postUrl = participation.contentUrl;
        if (!postUrl) continue;

        // Determine platform and fetch metrics
        const platform = detectPlatform(postUrl);
        let metrics: { views: number; likes: number; comments: number } | null = null;

        if (platform === "INSTAGRAM") {
          metrics = await getIGMetrics(postUrl);
        } else if (platform === "YOUTUBE") {
          metrics = await getYTMetrics(postUrl);
        }

        if (!metrics) continue;

        // Get previous snapshot for comparison
        const previousSnapshot = await db.viewSnapshot.findFirst({
          where: {
            campaignId: campaign.id,
            creatorId: participation.creatorId,
            platform,
          },
          orderBy: { snapshotAt: "desc" },
        });

        // Create new snapshot
        await db.viewSnapshot.create({
          data: {
            campaignId: campaign.id,
            creatorId: participation.creatorId,
            platform,
            postUrl,
            viewCount: metrics.views,
            likeCount: metrics.likes,
            snapshotAt: new Date(),
          },
        });

        // Check for view spike fraud
        if (previousSnapshot) {
          await checkViewSpike(
            campaign.id,
            participation.creatorId,
            metrics.views,
            previousSnapshot.viewCount
          );
        }

        // Update campaign metrics
        await updateMetrics(campaign.id, participation.creatorId, {
          verifiedViews: metrics.views,
        });

        console.log(
          `[view-sync] Updated ${campaign.id}/${participation.creatorId}: ${metrics.views} views`
        );
      } catch (error) {
        console.error(
          `[view-sync] Error for participation ${participation.id}:`,
          error
        );
      }
    }
  }
}

function detectPlatform(url: string): string {
  if (url.includes("instagram.com")) return "INSTAGRAM";
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "YOUTUBE";
  return "OTHER";
}
