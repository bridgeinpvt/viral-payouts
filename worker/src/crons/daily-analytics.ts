import { db } from "../db";

export async function aggregateDailyAnalytics(): Promise<void> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  const today = new Date(yesterday);
  today.setDate(today.getDate() + 1);

  // Aggregate per-campaign daily analytics
  const liveCampaigns = await db.campaign.findMany({
    where: { status: { in: ["LIVE", "COMPLETED"] } },
    select: { id: true },
  });

  for (const campaign of liveCampaigns) {
    try {
      // Count clicks for yesterday
      const clicks = await db.clickEvent.count({
        where: {
          campaignId: campaign.id,
          createdAt: { gte: yesterday, lt: today },
          isFraud: false,
        },
      });

      // Count conversions for yesterday
      const conversions = await db.conversionEvent.count({
        where: {
          campaignId: campaign.id,
          createdAt: { gte: yesterday, lt: today },
          isVerified: true,
        },
      });

      // Count view snapshots for yesterday (sum of viewCount)
      const viewSnapshots = await db.viewSnapshot.aggregate({
        where: {
          campaignId: campaign.id,
          snapshotAt: { gte: yesterday, lt: today },
        },
        _sum: { viewCount: true },
      });

      // Calculate spend for the day - transactions related to this campaign
      const transactions = await db.transaction.aggregate({
        where: {
          participation: {
            campaignId: campaign.id,
          },
          createdAt: { gte: yesterday, lt: today },
          type: "EARNING",
          status: "COMPLETED",
        },
        _sum: { amount: true },
      });

      await db.campaignDailyAnalytics.upsert({
        where: {
          campaignId_date: {
            campaignId: campaign.id,
            date: yesterday,
          },
        },
        create: {
          campaignId: campaign.id,
          date: yesterday,
          views: viewSnapshots._sum.viewCount ?? 0,
          clicks,
          conversions,
          spend: Math.abs(transactions._sum.amount ?? 0),
        },
        update: {
          views: viewSnapshots._sum.viewCount ?? 0,
          clicks,
          conversions,
          spend: Math.abs(transactions._sum.amount ?? 0),
        },
      });
    } catch (error) {
      console.error(`[daily-analytics] Error for campaign ${campaign.id}:`, error);
    }
  }

  // Aggregate platform-level daily analytics
  try {
    const totalGMV = await db.transaction.aggregate({
      where: {
        createdAt: { gte: yesterday, lt: today },
        type: "CAMPAIGN_FUND",
        status: "COMPLETED",
      },
      _sum: { amount: true },
    });

    const totalPayouts = await db.payout.aggregate({
      where: {
        processedAt: { gte: yesterday, lt: today },
        status: "COMPLETED",
      },
      _sum: { netAmount: true },
    });

    const totalRevenue = await db.transaction.aggregate({
      where: {
        createdAt: { gte: yesterday, lt: today },
        type: "PLATFORM_FEE",
        status: "COMPLETED",
      },
      _sum: { amount: true },
    });

    const fraudFlags = await db.fraudFlag.count({
      where: {
        createdAt: { gte: yesterday, lt: today },
      },
    });

    const totalFlags = await db.fraudFlag.count({
      where: { createdAt: { lt: today } },
    });

    const confirmedFraud = await db.fraudFlag.count({
      where: {
        status: "CONFIRMED",
        createdAt: { lt: today },
      },
    });

    await db.platformDailyAnalytics.upsert({
      where: { date: yesterday },
      create: {
        date: yesterday,
        totalGMV: totalGMV._sum.amount ?? 0,
        totalRevenue: totalRevenue._sum.amount ?? 0,
        totalPayouts: totalPayouts._sum.netAmount ?? 0,
        fraudRate: totalFlags > 0 ? confirmedFraud / totalFlags : 0,
      },
      update: {
        totalGMV: totalGMV._sum.amount ?? 0,
        totalRevenue: totalRevenue._sum.amount ?? 0,
        totalPayouts: totalPayouts._sum.netAmount ?? 0,
        fraudRate: totalFlags > 0 ? confirmedFraud / totalFlags : 0,
      },
    });

    console.log("[daily-analytics] Platform analytics aggregated for", yesterday.toISOString().split("T")[0]);
  } catch (error) {
    console.error("[daily-analytics] Error aggregating platform analytics:", error);
  }
}
