import { db } from "../db";
import { checkClickFraud, checkConversionMismatch } from "../services/fraud";

export async function detectFraud(): Promise<void> {
  console.log("[fraud-detection] Starting fraud detection sweep...");

  // 1. Check click fraud on active tracking links
  const activeLinks = await db.trackingLink.findMany({
    where: {
      isActive: true,
      campaign: { status: "LIVE" },
    },
    select: { id: true },
  });

  for (const link of activeLinks) {
    try {
      await checkClickFraud(link.id);
    } catch (error) {
      console.error(`[fraud-detection] Click fraud check failed for link ${link.id}:`, error);
    }
  }

  // 2. Check conversion mismatches on CONVERSION campaigns
  const conversionCampaigns = await db.campaign.findMany({
    where: { type: "CONVERSION", status: "LIVE" },
    include: {
      participations: {
        where: { status: "ACTIVE" },
        select: { creatorId: true, campaignId: true },
      },
    },
  });

  for (const campaign of conversionCampaigns) {
    for (const participation of campaign.participations) {
      try {
        await checkConversionMismatch(campaign.id, participation.creatorId);
      } catch (error) {
        console.error(
          `[fraud-detection] Conversion mismatch check failed for ${campaign.id}/${participation.creatorId}:`,
          error
        );
      }
    }
  }

  // 3. Bot detection — flag tracking links with high fraud ratio
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const linksWithClicks = await db.trackingLink.findMany({
    where: {
      isActive: true,
      clickEvents: {
        some: { createdAt: { gte: oneHourAgo } },
      },
    },
    include: {
      _count: {
        select: {
          clickEvents: {
            where: { createdAt: { gte: oneHourAgo } },
          },
        },
      },
      clickEvents: {
        where: { createdAt: { gte: oneHourAgo }, isFraud: true },
        select: { id: true },
      },
      campaign: { select: { id: true } },
    },
  });

  for (const link of linksWithClicks) {
    const totalClicks = link._count.clickEvents ?? 0;
    const fraudClicks = link.clickEvents.length;

    if (totalClicks > 10 && fraudClicks / totalClicks > 0.5) {
      // More than 50% fraud clicks — create bot detection flag
      const existing = await db.fraudFlag.findFirst({
        where: {
          type: "BOT_DETECTED",
          campaignId: link.campaign.id,
          status: { in: ["DETECTED", "INVESTIGATING"] },
        },
      });

      if (!existing) {
        await db.fraudFlag.create({
          data: {
            type: "BOT_DETECTED",
            status: "DETECTED",
            severity: fraudClicks / totalClicks > 0.8 ? 5 : 4,
            description: `High bot ratio: ${fraudClicks}/${totalClicks} (${Math.round((fraudClicks / totalClicks) * 100)}%) clicks flagged as fraud in last hour`,
            evidence: {
              trackingLinkId: link.id,
              totalClicks,
              fraudClicks,
              ratio: fraudClicks / totalClicks,
            },
            campaignId: link.campaign.id,
          },
        });
      }
    }
  }

  console.log("[fraud-detection] Fraud detection sweep completed");
}
