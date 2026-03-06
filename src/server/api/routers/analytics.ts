import { z } from "zod";
import {
  createTRPCRouter,
  brandProcedure,
  creatorProcedure,
  adminProcedure,
  protectedProcedure,
} from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { FraudFlagStatus } from "@prisma/client";


export const analyticsRouter = createTRPCRouter({
  // ==========================================
  // BRAND ANALYTICS
  // ==========================================

  getBrandAnalytics: brandProcedure.query(async ({ ctx }) => {
    const campaigns = await ctx.db.campaign.findMany({
      where: { brandId: ctx.session.user.id },
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        totalBudget: true,
        spentBudget: true,
        totalViews: true,
        totalClicks: true,
        totalConversions: true,
        totalParticipants: true,
      },
    });

    const totalSpent = campaigns.reduce((sum, c) => sum + c.spentBudget, 0);
    const totalBudget = campaigns.reduce((sum, c) => sum + c.totalBudget, 0);
    const totalViews = campaigns.reduce((sum, c) => sum + c.totalViews, 0);
    const totalClicks = campaigns.reduce((sum, c) => sum + c.totalClicks, 0);
    const totalConversions = campaigns.reduce((sum, c) => sum + c.totalConversions, 0);
    const liveCampaigns = campaigns.filter((c) => c.status === "LIVE").length;

    // Top creators by earnings across brand's campaigns
    const campaignIds = campaigns.map((c) => c.id);
    const topCreators = campaignIds.length > 0
      ? await ctx.db.campaignMetrics.findMany({
        where: { campaignId: { in: campaignIds } },
        orderBy: { earnedAmount: "desc" },
        take: 10,
        select: {
          creatorId: true,
          earnedAmount: true,
          verifiedViews: true,
          verifiedClicks: true,
          verifiedConversions: true,
        },
      })
      : [];

    // Daily trends (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyTrends = campaignIds.length > 0
      ? await ctx.db.campaignDailyAnalytics.findMany({
        where: {
          campaignId: { in: campaignIds },
          date: { gte: thirtyDaysAgo },
        },
        orderBy: { date: "asc" },
      })
      : [];

    return {
      summary: {
        totalCampaigns: campaigns.length,
        liveCampaigns,
        totalBudget,
        totalSpent,
        totalViews,
        totalClicks,
        totalConversions,
        roi: totalSpent > 0 ? ((totalConversions * 100) / totalSpent).toFixed(2) : "0",
      },
      campaigns,
      topCreators,
      dailyTrends,
    };
  }),

  // ==========================================
  // CREATOR ANALYTICS
  // ==========================================

  getCreatorAnalytics: creatorProcedure.query(async ({ ctx }) => {
    const wallet = await ctx.db.wallet.findUnique({
      where: { userId: ctx.session.user.id },
    });

    const participations = await ctx.db.campaignParticipation.findMany({
      where: { creatorId: ctx.session.user.id },
      include: {
        campaign: {
          select: { id: true, name: true, type: true, status: true },
        },
      },
    });

    // Get metrics across all campaigns
    const metrics = await ctx.db.campaignMetrics.findMany({
      where: { creatorId: ctx.session.user.id },
      include: {
        campaign: { select: { id: true, name: true, type: true } },
      },
    });

    const totalEarned = metrics.reduce((sum, m) => sum + m.earnedAmount, 0);
    const totalPaid = metrics.reduce((sum, m) => sum + m.paidAmount, 0);
    const totalViews = metrics.reduce((sum, m) => sum + m.verifiedViews, 0);
    const totalClicks = metrics.reduce((sum, m) => sum + m.verifiedClicks, 0);
    const totalConversions = metrics.reduce((sum, m) => sum + m.verifiedConversions, 0);

    // Creator profile for tier info
    const profile = await ctx.db.creatorProfile.findUnique({
      where: { userId: ctx.session.user.id },
    });

    // Earnings timeline (from transactions)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentTransactions = wallet
      ? await ctx.db.transaction.findMany({
        where: {
          walletId: wallet.id,
          type: "EARNING",
          createdAt: { gte: thirtyDaysAgo },
        },
        orderBy: { createdAt: "asc" },
        select: { amount: true, createdAt: true, description: true },
      })
      : [];

    return {
      summary: {
        totalEarned,
        totalPaid,
        pendingEarnings: totalEarned - totalPaid,
        availableBalance: wallet?.availableBalance ?? 0,
        totalViews,
        totalClicks,
        totalConversions,
        activeCampaigns: participations.filter(
          (p) => p.status === "APPROVED" || p.status === "ACTIVE"
        ).length,
        completedCampaigns: participations.filter((p) => p.status === "COMPLETED").length,
      },
      tier: profile?.tier ?? "BRONZE",
      tierProgress: {
        currentTier: profile?.tier ?? "BRONZE",
        totalEarnings: profile?.totalEarnings ?? 0,
        totalCampaigns: profile?.totalCampaigns ?? 0,
      },
      metrics,
      recentTransactions,
    };
  }),

  // ==========================================
  // ADMIN ANALYTICS
  // ==========================================

  getAdminAnalytics: adminProcedure.query(async ({ ctx }) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Platform daily analytics
    const platformTrends = await ctx.db.platformDailyAnalytics.findMany({
      where: { date: { gte: thirtyDaysAgo } },
      orderBy: { date: "asc" },
    });

    // Funnel: signups → onboarded → active campaigns → conversions
    const [totalUsers, onboardedUsers, activeCampaigns, totalConversions] = await Promise.all([
      ctx.db.user.count(),
      ctx.db.user.count({ where: { isOnboarded: true } }),
      ctx.db.campaign.count({ where: { status: "LIVE" } }),
      ctx.db.conversionEvent.count({ where: { isVerified: true } }),
    ]);

    // Brand breakdown
    const brandStats = await ctx.db.user.groupBy({
      by: ["role"],
      _count: true,
    });

    // Campaign type breakdown
    const campaignTypeStats = await ctx.db.campaign.groupBy({
      by: ["type"],
      _count: true,
      _sum: { totalBudget: true, spentBudget: true },
    });

    // Top campaigns by spend
    const topCampaigns = await ctx.db.campaign.findMany({
      orderBy: { spentBudget: "desc" },
      take: 10,
      select: {
        id: true,
        name: true,
        type: true,
        totalBudget: true,
        spentBudget: true,
        totalParticipants: true,
        brand: { select: { name: true, brandProfile: { select: { companyName: true } } } },
      },
    });

    // Top creators by earnings
    const topCreators = await ctx.db.creatorProfile.findMany({
      orderBy: { totalEarnings: "desc" },
      take: 10,
      select: {
        userId: true,
        displayName: true,
        tier: true,
        totalEarnings: true,
        totalCampaigns: true,
        user: { select: { name: true } },
      },
    });

    return {
      funnel: { totalUsers, onboardedUsers, activeCampaigns, totalConversions },
      brandStats,
      campaignTypeStats,
      platformTrends,
      topCampaigns,
      topCreators,
    };
  }),

  // ==========================================
  // PER-CAMPAIGN ANALYTICS
  // ==========================================

  getCampaignAnalytics: protectedProcedure
    .input(z.object({ campaignId: z.string() }))
    .query(async ({ ctx, input }) => {
      const campaign = await ctx.db.campaign.findUnique({
        where: { id: input.campaignId },
      });

      if (!campaign) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" });
      }

      // Verify access: must be brand owner or admin
      if (campaign.brandId !== ctx.session.user.id && !ctx.session.user.isAdmin) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }

      const [dailyAnalytics, metrics, fraudFlags] = await Promise.all([
        ctx.db.campaignDailyAnalytics.findMany({
          where: { campaignId: input.campaignId },
          orderBy: { date: "asc" },
        }),
        ctx.db.campaignMetrics.findMany({
          where: { campaignId: input.campaignId },
          orderBy: { earnedAmount: "desc" },
        }),
        ctx.db.fraudFlag.findMany({
          where: { campaignId: input.campaignId },
          orderBy: { createdAt: "desc" },
        }),
      ]);

      return {
        campaign: {
          id: campaign.id,
          name: campaign.name,
          type: campaign.type,
          totalBudget: campaign.totalBudget,
          spentBudget: campaign.spentBudget,
          totalViews: campaign.totalViews,
          totalClicks: campaign.totalClicks,
          totalConversions: campaign.totalConversions,
          totalParticipants: campaign.totalParticipants,
        },
        dailyAnalytics,
        creatorMetrics: metrics,
        fraudFlags,
      };
    }),
  // ==========================================
  // CONTENT-LEVEL (PER-REEL/SHORT) ANALYTICS
  // ==========================================

  /**
   * Returns the latest ViewSnapshot for each unique (creatorId, postUrl) pair within a campaign.
   * This powers the per-reel content analytics view for brands.
   */
  getCampaignContentSnapshots: protectedProcedure
    .input(z.object({ campaignId: z.string() }))
    .query(async ({ ctx, input }) => {
      const campaign = await ctx.db.campaign.findUnique({
        where: { id: input.campaignId },
        select: { brandId: true },
      });

      if (!campaign) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" });
      }

      if (campaign.brandId !== ctx.session.user.id && !ctx.session.user.isAdmin) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }

      // Get all participations with creator info
      const participations = await ctx.db.campaignParticipation.findMany({
        where: { campaignId: input.campaignId, status: { in: ["ACTIVE", "COMPLETED"] } },
        select: {
          creatorId: true,
          contentUrl: true,
          platform: true,
          creator: {
            select: {
              name: true,
              image: true,
              creatorProfile: { select: { displayName: true, instagramHandle: true } },
            },
          },
        },
      });

      // For each participation, fetch the latest ViewSnapshot and the previous one for delta
      const contentSnapshots = await Promise.all(
        participations.map(async (p) => {
          const postUrl = p.contentUrl;
          if (!postUrl) return null;

          // Latest snapshot
          const latest = await ctx.db.viewSnapshot.findFirst({
            where: { campaignId: input.campaignId, creatorId: p.creatorId, postUrl },
            orderBy: { snapshotAt: "desc" },
          });

          // Previous snapshot (for trend indicator)
          const previous = latest
            ? await ctx.db.viewSnapshot.findFirst({
              where: {
                campaignId: input.campaignId,
                creatorId: p.creatorId,
                postUrl,
                snapshotAt: { lt: latest.snapshotAt },
              },
              orderBy: { snapshotAt: "desc" },
            })
            : null;

          // Check fraud flags for this creator in this campaign
          const fraudFlagCount = await ctx.db.fraudFlag.count({
            where: {
              campaignId: input.campaignId,
              creatorId: p.creatorId,
              status: FraudFlagStatus.DETECTED,
            },
          });

          return {
            creatorId: p.creatorId,
            creatorName:
              p.creator.creatorProfile?.displayName ?? p.creator.name ?? p.creatorId,
            creatorImage: p.creator.image,
            instagramHandle: p.creator.creatorProfile?.instagramHandle,
            platform: p.platform,
            postUrl,
            currentViews: latest?.viewCount ?? 0,
            deltaViews: latest?.deltaViews ?? 0,
            previousViews: previous?.viewCount ?? 0,
            likes: latest?.likeCount ?? 0,
            comments: latest?.commentCount ?? 0,
            shares: latest?.shareCount ?? 0,
            lastSyncedAt: latest?.snapshotAt ?? null,
            fraudFlags: fraudFlagCount,
          };
        })
      );

      return contentSnapshots.filter(Boolean);
    }),

  // ==========================================
  // CREATOR: PER-REEL SNAPSHOTS (for their own content)
  // ==========================================

  /**
   * Returns ViewSnapshots for the creator's own content in a specific participation.
   * Creator can only see their own snapshots.
   */
  getCreatorContentSnapshots: creatorProcedure
    .input(z.object({ participationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const participation = await ctx.db.campaignParticipation.findUnique({
        where: { id: input.participationId },
        select: {
          creatorId: true,
          campaignId: true,
          contentUrl: true,
          platform: true,
        },
      });

      if (!participation || participation.creatorId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }

      if (!participation.contentUrl) return [];

      // Get all snapshots for this creator + postUrl ordered by most recent
      const snapshots = await ctx.db.viewSnapshot.findMany({
        where: {
          campaignId: participation.campaignId,
          creatorId: participation.creatorId,
          postUrl: participation.contentUrl,
        },
        orderBy: { snapshotAt: "desc" },
        take: 1, // only the latest
      });

      const latest = snapshots[0];
      const previous = latest
        ? await ctx.db.viewSnapshot.findFirst({
          where: {
            campaignId: participation.campaignId,
            creatorId: participation.creatorId,
            postUrl: participation.contentUrl,
            snapshotAt: { lt: latest.snapshotAt },
          },
          orderBy: { snapshotAt: "desc" },
        })
        : null;

      if (!latest) return [];

      return [
        {
          postUrl: participation.contentUrl,
          platform: participation.platform,
          currentViews: latest.viewCount,
          deltaViews: latest.deltaViews ?? (previous ? Math.max(0, latest.viewCount - previous.viewCount) : 0),
          likes: latest.likeCount ?? 0,
          comments: latest.commentCount ?? 0,
          shares: latest.shareCount ?? 0,
          lastSyncedAt: latest.snapshotAt,
        },
      ];
    }),

  // ==========================================
  // BRAND: CONVERSION EVENTS LIST
  // ==========================================

  /**
   * Returns all ConversionEvents for a campaign (brand or admin only).
   * Used to show promo code redemptions in the brand campaign detail analytics tab.
   */
  getConversionEvents: protectedProcedure
    .input(z.object({ campaignId: z.string(), limit: z.number().max(200).default(50) }))
    .query(async ({ ctx, input }) => {
      const campaign = await ctx.db.campaign.findUnique({
        where: { id: input.campaignId },
        select: { brandId: true },
      });

      if (!campaign) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" });
      }

      if (campaign.brandId !== ctx.session.user.id && !ctx.session.user.isAdmin) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }

      const events = await ctx.db.conversionEvent.findMany({
        where: { campaignId: input.campaignId },
        orderBy: { createdAt: "desc" },
        take: input.limit,
        include: {
          promoCode: { select: { code: true } },
        },
      });

      // Fetch creator names separately (ConversionEvent has no direct creator relation)
      const creatorIds = [...new Set(events.map((e) => e.creatorId).filter(Boolean))];
      const creators = creatorIds.length > 0
        ? await ctx.db.user.findMany({
          where: { id: { in: creatorIds as string[] } },
          select: { id: true, name: true, creatorProfile: { select: { displayName: true } } },
        })
        : [];
      const creatorMap = new Map(creators.map((c) => [c.id, c]));

      return events.map((e) => {
        const creator = e.creatorId ? creatorMap.get(e.creatorId) : undefined;
        return {
          id: e.id,
          creatorName: creator?.creatorProfile?.displayName ?? creator?.name ?? "Unknown",
          promoCode: e.promoCode?.code ?? "—",
          orderId: e.orderId,
          orderAmount: e.orderAmount,
          isVerified: e.isVerified,
          createdAt: e.createdAt,
        };
      });
    }),
});

