import { z } from "zod";
import { createTRPCRouter, adminProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { FraudFlagStatus, ParticipationStatus } from "@prisma/client";

export const adminRouter = createTRPCRouter({
  // Dashboard stats
  getDashboardStats: adminProcedure.query(async ({ ctx }) => {
    const [
      totalBrands,
      totalCreators,
      totalCampaigns,
      liveCampaigns,
      pendingPayouts,
    ] = await Promise.all([
      ctx.db.user.count({ where: { role: "BRAND" } }),
      ctx.db.user.count({ where: { role: "CREATOR" } }),
      ctx.db.campaign.count(),
      ctx.db.campaign.count({ where: { status: "LIVE" } }),
      ctx.db.payout.count({ where: { approvalStatus: "PENDING_APPROVAL" } }),
    ]);

    // GMV, revenue, payouts from latest platform analytics
    const latestAnalytics = await ctx.db.platformDailyAnalytics.findFirst({
      orderBy: { date: "desc" },
    });

    // Active fraud flags
    const activeFraudFlags = await ctx.db.fraudFlag.count({
      where: { status: { in: ["DETECTED", "INVESTIGATING"] } },
    });

    // Total wallet balances
    const brandWallets = await ctx.db.wallet.aggregate({
      where: { type: "BRAND" },
      _sum: { availableBalance: true, escrowBalance: true },
    });

    const creatorWallets = await ctx.db.wallet.aggregate({
      where: { type: "CREATOR" },
      _sum: { availableBalance: true, pendingBalance: true, lifetimeEarnings: true },
    });

    return {
      totalBrands,
      totalCreators,
      totalCampaigns,
      liveCampaigns,
      pendingPayouts,
      activeFraudFlags,
      gmv: latestAnalytics?.totalGMV ?? 0,
      platformRevenue: latestAnalytics?.totalRevenue ?? 0,
      totalPayoutsProcessed: latestAnalytics?.totalPayouts ?? 0,
      fraudRate: latestAnalytics?.fraudRate ?? 0,
      brandFundsAvailable: brandWallets._sum.availableBalance ?? 0,
      brandFundsEscrow: brandWallets._sum.escrowBalance ?? 0,
      creatorEarningsTotal: creatorWallets._sum.lifetimeEarnings ?? 0,
      creatorBalanceAvailable: creatorWallets._sum.availableBalance ?? 0,
      creatorBalancePending: creatorWallets._sum.pendingBalance ?? 0,
    };
  }),

  // Campaign oversight — full campaign detail with fraud flags & ledger
  getCampaignOversight: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const campaign = await ctx.db.campaign.findUnique({
        where: { id: input.id },
        include: {
          brand: {
            select: {
              id: true,
              name: true,
              email: true,
              brandProfile: true,
            },
          },
          escrow: true,
          participations: {
            include: {
              creator: {
                select: {
                  id: true,
                  name: true,
                  creatorProfile: {
                    select: { displayName: true, tier: true, isVerified: true },
                  },
                },
              },
              trackingLinks: true,
              promoCode: true,
            },
          },
          metrics: true,
          dailyAnalytics: { orderBy: { date: "desc" }, take: 30 },
          fraudFlags: { orderBy: { createdAt: "desc" } },
        },
      });

      if (!campaign) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" });
      }

      return campaign;
    }),

  // List all campaigns (admin)
  listCampaigns: adminProcedure
    .input(
      z.object({
        status: z.string().optional(),
        search: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {};
      if (input.status) where.status = input.status;
      if (input.search) {
        where.OR = [
          { name: { contains: input.search, mode: "insensitive" } },
          { slug: { contains: input.search, mode: "insensitive" } },
        ];
      }

      const campaigns = await ctx.db.campaign.findMany({
        where,
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: "desc" },
        include: {
          brand: {
            select: { id: true, name: true, brandProfile: { select: { companyName: true } } },
          },
          escrow: { select: { totalAmount: true, releasedAmount: true, status: true } },
          _count: { select: { participations: true, fraudFlags: true } },
        },
      });

      let nextCursor: string | undefined;
      if (campaigns.length > input.limit) {
        const next = campaigns.pop();
        nextCursor = next!.id;
      }

      return { campaigns, nextCursor };
    }),

  // Freeze creator
  freezeCreator: adminProcedure
    .input(z.object({ creatorId: z.string(), reason: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const creator = await ctx.db.user.findUnique({ where: { id: input.creatorId } });
      if (!creator || creator.role !== "CREATOR") {
        throw new TRPCError({ code: "NOT_FOUND", message: "Creator not found" });
      }

      // Deactivate user
      await ctx.db.user.update({
        where: { id: input.creatorId },
        data: { isActive: false },
      });

      // Freeze all active participations
      await ctx.db.campaignParticipation.updateMany({
        where: {
          creatorId: input.creatorId,
          status: { in: [ParticipationStatus.APPROVED, ParticipationStatus.ACTIVE] },
        },
        data: { status: ParticipationStatus.FROZEN },
      });

      // Deactivate tracking links
      await ctx.db.trackingLink.updateMany({
        where: { creatorId: input.creatorId },
        data: { isActive: false },
      });

      // Deactivate promo codes
      await ctx.db.promoCode.updateMany({
        where: { creatorId: input.creatorId },
        data: { isActive: false },
      });

      return { success: true };
    }),

  // Pause campaign (admin override)
  adminPauseCampaign: adminProcedure
    .input(z.object({ campaignId: z.string(), reason: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const campaign = await ctx.db.campaign.findUnique({
        where: { id: input.campaignId },
      });

      if (!campaign) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" });
      }

      return await ctx.db.campaign.update({
        where: { id: input.campaignId },
        data: { status: "PAUSED" },
      });
    }),

  // Approve payout
  approvePayout: adminProcedure
    .input(z.object({ payoutId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const payout = await ctx.db.payout.findUnique({
        where: { id: input.payoutId },
      });

      if (!payout) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Payout not found" });
      }

      if (payout.approvalStatus !== "PENDING_APPROVAL") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Payout already processed" });
      }

      return await ctx.db.payout.update({
        where: { id: input.payoutId },
        data: {
          approvalStatus: "APPROVED",
          approvedBy: ctx.session.user.id,
          approvedAt: new Date(),
        },
      });
    }),

  // Reject payout
  rejectPayout: adminProcedure
    .input(z.object({ payoutId: z.string(), reason: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const payout = await ctx.db.payout.findUnique({
        where: { id: input.payoutId },
        include: { wallet: true },
      });

      if (!payout) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Payout not found" });
      }

      if (payout.approvalStatus !== "PENDING_APPROVAL") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Payout already processed" });
      }

      // Refund the amount back to creator wallet
      await ctx.db.$transaction([
        ctx.db.payout.update({
          where: { id: input.payoutId },
          data: {
            approvalStatus: "REJECTED",
            status: "CANCELLED",
            failedReason: input.reason,
          },
        }),
        ctx.db.wallet.update({
          where: { id: payout.walletId },
          data: {
            availableBalance: { increment: payout.amount },
            pendingBalance: { decrement: payout.amount },
          },
        }),
      ]);

      return { success: true };
    }),

  // Batch approve payouts
  batchApprovePayouts: adminProcedure
    .input(z.object({ payoutIds: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const results = await ctx.db.payout.updateMany({
        where: {
          id: { in: input.payoutIds },
          approvalStatus: "PENDING_APPROVAL",
        },
        data: {
          approvalStatus: "APPROVED",
          approvedBy: ctx.session.user.id,
          approvedAt: new Date(),
        },
      });

      return { approved: results.count };
    }),

  // Get pending payouts for admin approval
  getPendingPayouts: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const payouts = await ctx.db.payout.findMany({
        where: { approvalStatus: "PENDING_APPROVAL" },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: "asc" },
        include: {
          user: {
            select: { id: true, name: true, creatorProfile: { select: { displayName: true, tier: true } } },
          },
          paymentMethod: true,
        },
      });

      let nextCursor: string | undefined;
      if (payouts.length > input.limit) {
        const next = payouts.pop();
        nextCursor = next!.id;
      }

      return { payouts, nextCursor };
    }),

  // Reverse payout (after processing)
  reversePayout: adminProcedure
    .input(z.object({ payoutId: z.string(), reason: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const payout = await ctx.db.payout.findUnique({
        where: { id: input.payoutId },
      });

      if (!payout) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Payout not found" });
      }

      if (payout.status !== "COMPLETED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Can only reverse completed payouts",
        });
      }

      await ctx.db.$transaction([
        ctx.db.payout.update({
          where: { id: input.payoutId },
          data: { status: "FAILED", failedReason: `Reversed: ${input.reason}` },
        }),
        ctx.db.transaction.create({
          data: {
            walletId: payout.walletId,
            toUserId: payout.userId,
            amount: payout.amount,
            type: "REFUND",
            status: "COMPLETED",
            description: `Payout reversal: ${input.reason}`,
            referenceId: payout.id,
            referenceType: "payout_reversal",
          },
        }),
      ]);

      return { success: true };
    }),

  // ==========================================
  // FRAUD
  // ==========================================

  // Get fraud flags
  getFraudFlags: adminProcedure
    .input(
      z.object({
        status: z.nativeEnum(FraudFlagStatus).optional(),
        type: z.string().optional(),
        minSeverity: z.number().min(1).max(5).optional(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {};
      if (input.status) where.status = input.status;
      if (input.type) where.type = input.type;
      if (input.minSeverity) where.severity = { gte: input.minSeverity };

      const flags = await ctx.db.fraudFlag.findMany({
        where,
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: "desc" },
        include: {
          campaign: { select: { id: true, name: true, slug: true } },
        },
      });

      let nextCursor: string | undefined;
      if (flags.length > input.limit) {
        const next = flags.pop();
        nextCursor = next!.id;
      }

      return { flags, nextCursor };
    }),

  // Resolve fraud flag
  resolveFraudFlag: adminProcedure
    .input(
      z.object({
        flagId: z.string(),
        status: z.enum(["INVESTIGATING", "CONFIRMED", "DISMISSED"]),
        note: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const flag = await ctx.db.fraudFlag.findUnique({
        where: { id: input.flagId },
      });

      if (!flag) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Fraud flag not found" });
      }

      return await ctx.db.fraudFlag.update({
        where: { id: input.flagId },
        data: {
          status: input.status,
          resolvedBy: ctx.session.user.id,
          resolvedAt: new Date(),
          resolvedNote: input.note,
        },
      });
    }),

  // ==========================================
  // USER MANAGEMENT
  // ==========================================

  listUsers: adminProcedure
    .input(
      z.object({
        role: z.enum(["BRAND", "CREATOR"]).optional(),
        search: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {};
      if (input.role) where.role = input.role;
      if (input.search) {
        where.OR = [
          { name: { contains: input.search, mode: "insensitive" } },
          { email: { contains: input.search, mode: "insensitive" } },
        ];
      }

      const users = await ctx.db.user.findMany({
        where,
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isAdmin: true,
          isOnboarded: true,
          isActive: true,
          createdAt: true,
          brandProfile: { select: { companyName: true, isVerified: true } },
          creatorProfile: { select: { displayName: true, tier: true, isVerified: true } },
        },
      });

      let nextCursor: string | undefined;
      if (users.length > input.limit) {
        const next = users.pop();
        nextCursor = next!.id;
      }

      return { users, nextCursor };
    }),

  // Verify brand
  verifyBrand: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.brandProfile.update({
        where: { userId: input.userId },
        data: { isVerified: true },
      });
    }),

  // Verify creator
  verifyCreator: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.creatorProfile.update({
        where: { userId: input.userId },
        data: { isVerified: true },
      });
    }),
});
