import { db } from "../db";

/**
 * Check for click fraud on a tracking link (burst detection, IP abuse)
 */
export async function checkClickFraud(trackingLinkId: string): Promise<void> {
  const link = await db.trackingLink.findUnique({
    where: { id: trackingLinkId },
    select: { campaignId: true, creatorId: true },
  });

  if (!link) return;

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  // Check for click burst (>50 clicks in last hour)
  const recentClicks = await db.clickEvent.count({
    where: {
      trackingLinkId,
      createdAt: { gte: oneHourAgo },
    },
  });

  if (recentClicks > 50) {
    await createFraudFlag({
      type: "CLICK_ANOMALY",
      campaignId: link.campaignId,
      creatorId: link.creatorId,
      severity: recentClicks > 200 ? 5 : recentClicks > 100 ? 4 : 3,
      description: `Click burst detected: ${recentClicks} clicks in last hour on tracking link ${trackingLinkId}`,
      evidence: { trackingLinkId, clickCount: recentClicks, window: "1h" },
    });
  }

  // Check for IP abuse (single IP >20 clicks in last hour)
  const ipCounts = await db.clickEvent.groupBy({
    by: ["ip"],
    where: {
      trackingLinkId,
      createdAt: { gte: oneHourAgo },
    },
    _count: true,
    having: {
      ip: {
        _count: { gt: 20 },
      },
    },
  });

  for (const ipGroup of ipCounts) {
    await createFraudFlag({
      type: "IP_ABUSE",
      campaignId: link.campaignId,
      creatorId: link.creatorId,
      severity: ipGroup._count > 50 ? 5 : 4,
      description: `IP abuse: ${ipGroup.ip} made ${ipGroup._count} clicks in last hour`,
      evidence: { ip: ipGroup.ip, clickCount: ipGroup._count, trackingLinkId },
    });
  }
}

/**
 * Check for view spike on a participation
 */
export async function checkViewSpike(
  campaignId: string,
  creatorId: string,
  currentViews: number,
  previousViews: number
): Promise<void> {
  if (previousViews === 0) return;

  const growthRate = (currentViews - previousViews) / previousViews;

  // Flag if views grew by more than 500% in one snapshot interval
  if (growthRate > 5) {
    await createFraudFlag({
      type: "VIEW_SPIKE",
      campaignId,
      creatorId,
      severity: growthRate > 20 ? 5 : growthRate > 10 ? 4 : 3,
      description: `View spike: ${Math.round(growthRate * 100)}% growth (${previousViews} → ${currentViews})`,
      evidence: { previousViews, currentViews, growthRate },
    });
  }
}

/**
 * Check for conversion mismatch (conversions without corresponding clicks)
 */
export async function checkConversionMismatch(
  campaignId: string,
  creatorId: string
): Promise<void> {
  const metrics = await db.campaignMetrics.findUnique({
    where: { campaignId_creatorId: { campaignId, creatorId } },
  });

  if (!metrics || metrics.verifiedClicks === 0) return;

  const conversionRate = metrics.verifiedConversions / metrics.verifiedClicks;

  // Flag if conversion rate is unusually high (>30%)
  if (conversionRate > 0.3 && metrics.verifiedConversions > 10) {
    await createFraudFlag({
      type: "CONVERSION_MISMATCH",
      campaignId,
      creatorId,
      severity: conversionRate > 0.7 ? 5 : conversionRate > 0.5 ? 4 : 3,
      description: `Unusually high conversion rate: ${Math.round(conversionRate * 100)}% (${metrics.verifiedConversions}/${metrics.verifiedClicks})`,
      evidence: {
        clicks: metrics.verifiedClicks,
        conversions: metrics.verifiedConversions,
        rate: conversionRate,
      },
    });
  }
}

async function createFraudFlag(params: {
  type: "VIEW_SPIKE" | "CLICK_ANOMALY" | "CONVERSION_MISMATCH" | "BOT_DETECTED" | "IP_ABUSE";
  campaignId: string;
  creatorId: string;
  severity: number;
  description: string;
  evidence: Record<string, unknown>;
}) {
  // Check for existing unresolved flag of same type for same campaign+creator
  const existing = await db.fraudFlag.findFirst({
    where: {
      type: params.type,
      campaignId: params.campaignId,
      status: { in: ["DETECTED", "INVESTIGATING"] },
    },
  });

  if (existing) {
    // Update existing flag with higher severity if applicable
    if (params.severity > existing.severity) {
      await db.fraudFlag.update({
        where: { id: existing.id },
        data: {
          severity: params.severity,
          description: params.description,
          evidence: params.evidence,
        },
      });
    }
    return;
  }

  await db.fraudFlag.create({
    data: {
      type: params.type,
      status: "DETECTED",
      severity: params.severity,
      description: params.description,
      evidence: params.evidence,
      campaignId: params.campaignId,
    },
  });
}
