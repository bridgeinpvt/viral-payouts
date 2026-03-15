import { db } from '../db';
import { getPostMetrics as getIGMetrics } from '../services/instagram';
import { getVideoMetrics as getYTMetrics } from '../services/youtube';
import { checkViewSpike } from '../services/fraud';
import { updateMetrics } from '../services/metrics';

export async function syncViews(): Promise<void> {
  // Fetch all LIVE VIEW campaigns with active/completed participations.
  // Include the creator's OAuth tokens so we can call IG/YT APIs on their behalf.
  const campaigns = await db.campaign.findMany({
    where: { type: 'VIEW', status: 'LIVE' },
    include: {
      participations: {
        where: { status: { in: ['ACTIVE', 'COMPLETED'] } },
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
        const postUrl =
          participation.contentUrl ?? participation.contentItems?.[0]?.url;

        if (!postUrl) {
          console.log(
            `[view-sync] No content URL for participation ${participation.id} — skipping`
          );
          continue;
        }

        // Extract per-creator tokens
        const igToken =
          participation.creator.creatorProfile?.instagramAccessToken ??
          undefined;
        const ytToken =
          participation.creator.creatorProfile?.youtubeAccessToken ?? undefined;

        // Determine platform and fetch metrics with the creator's own token
        const platform = detectPlatform(postUrl);
        let metrics: {
          views: number;
          likes: number;
          comments: number;
          saves?: number;
          shares?: number;
          reach?: number;
          avgWatchTime?: number | null;
          watchTimeMinutes?: number;
          avgViewPercent?: number;
        } | null = null;

        if (platform === 'INSTAGRAM') {
          if (!igToken) {
            console.warn(
              `[view-sync] No Instagram access token for creator ${participation.creatorId} — skipping`
            );
            continue;
          }
          metrics = await getIGMetrics(postUrl, igToken);
        } else if (platform === 'YOUTUBE') {
          // YouTube can fall back to public API with YOUTUBE_API_KEY — token is optional
          metrics = await getYTMetrics(
            postUrl,
            ytToken,
            participation.creatorId
          );
        } else {
          console.log(
            `[view-sync] Unsupported platform for URL: ${postUrl} — skipping`
          );
          continue;
        }

        if (!metrics) {
          console.warn(
            `[view-sync] No metrics returned for ${postUrl} — skipping`
          );
          continue;
        }

        // Get the most recent snapshot to calculate view delta
        const previousSnapshot = await db.viewSnapshot.findFirst({
          where: {
            campaignId: campaign.id,
            creatorId: participation.creatorId,
            platform: platform as any,
            postUrl,
          },
          orderBy: { snapshotAt: 'desc' },
        });

        // Calculate delta: how many new views since last snapshot
        const previousViewCount = previousSnapshot?.viewCount ?? 0;
        const deltaViews = Math.max(0, metrics.views - previousViewCount);

        // Store new snapshot — record both cumulative count and delta
        await db.viewSnapshot.create({
          data: {
            campaignId: campaign.id,
            creatorId: participation.creatorId,
            platform: platform as any,
            postUrl,
            viewCount: metrics.views,
            likeCount: metrics.likes,
            commentCount: metrics.comments,
            shareCount: metrics.shares ?? 0,
            deltaViews,
            reach: metrics.reach ?? null,
            saves: metrics.saves ?? null,
            avgWatchTime: metrics.avgWatchTime ?? null,
            snapshotAt: new Date(),
          },
        });

        // Fraud: check for view spike only when we have a previous baseline
        if (previousSnapshot) {
          await checkViewSpike(
            campaign.id,
            participation.creatorId,
            metrics.views,
            previousViewCount
          );
        }

        // Update aggregated CampaignMetrics by the DELTA (not total) to avoid double counting
        if (deltaViews > 0) {
          await updateMetrics(campaign.id, participation.creatorId, {
            verifiedViews: deltaViews,
          });
        }

        console.log(
          `[view-sync] ${campaign.id}/${participation.creatorId} on ${platform}: +${deltaViews} new views (total: ${metrics.views})`
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
  if (url.includes('instagram.com')) return 'INSTAGRAM';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'YOUTUBE';
  return 'OTHER';
}
