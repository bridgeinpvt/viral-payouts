import { db } from "../db";

/**
 * Calculate earnings for a campaign participation based on campaign type and verified metrics.
 */
export async function calculateEarnings(
  campaignId: string,
  creatorId: string
): Promise<number> {
  const campaign = await db.campaign.findUnique({
    where: { id: campaignId },
    select: {
      type: true,
      payoutPer1KViews: true,
      payoutPerClick: true,
      payoutPerSale: true,
      maxPayoutPerCreator: true,
    },
  });

  if (!campaign) return 0;

  const metrics = await db.campaignMetrics.findUnique({
    where: {
      campaignId_creatorId: { campaignId, creatorId },
    },
  });

  if (!metrics) return 0;

  let earnings = 0;

  switch (campaign.type) {
    case "VIEW":
      if (campaign.payoutPer1KViews) {
        earnings = (metrics.verifiedViews / 1000) * campaign.payoutPer1KViews;
      }
      break;
    case "CLICK":
      if (campaign.payoutPerClick) {
        earnings = metrics.verifiedClicks * campaign.payoutPerClick;
      }
      break;
    case "CONVERSION":
      if (campaign.payoutPerSale) {
        earnings = metrics.verifiedConversions * campaign.payoutPerSale;
      }
      break;
  }

  // Apply max payout cap if set
  if (campaign.maxPayoutPerCreator && earnings > campaign.maxPayoutPerCreator) {
    earnings = campaign.maxPayoutPerCreator;
  }

  return Math.round(earnings * 100) / 100; // Round to 2 decimal places
}

/**
 * Update CampaignMetrics with new verified counts
 */
export async function updateMetrics(
  campaignId: string,
  creatorId: string,
  updates: {
    verifiedViews?: number;
    verifiedClicks?: number;
    verifiedConversions?: number;
  }
) {
  const earnings = await calculateEarnings(campaignId, creatorId);

  await db.campaignMetrics.upsert({
    where: {
      campaignId_creatorId: { campaignId, creatorId },
    },
    create: {
      campaignId,
      creatorId,
      verifiedViews: updates.verifiedViews ?? 0,
      verifiedClicks: updates.verifiedClicks ?? 0,
      verifiedConversions: updates.verifiedConversions ?? 0,
      earnedAmount: earnings,
    },
    update: {
      ...updates,
      earnedAmount: earnings,
    },
  });
}
