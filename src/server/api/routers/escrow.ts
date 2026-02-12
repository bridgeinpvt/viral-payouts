import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  brandProcedure,
  adminProcedure,
} from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { WalletType } from "@prisma/client";

export const escrowRouter = createTRPCRouter({
  // Lock funds: BrandWallet → Escrow
  lockFunds: brandProcedure
    .input(
      z.object({
        campaignId: z.string(),
        amount: z.number().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const campaign = await ctx.db.campaign.findUnique({
        where: { id: input.campaignId },
      });

      if (!campaign || campaign.brandId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }

      if (campaign.status !== "DRAFT" && campaign.status !== "FUNDING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Can only fund campaigns in DRAFT or FUNDING status",
        });
      }

      const wallet = await ctx.db.wallet.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (!wallet || wallet.type !== WalletType.BRAND) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Brand wallet not found" });
      }

      if (wallet.availableBalance < input.amount) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Insufficient balance" });
      }

      // Check if escrow already exists
      const existingEscrow = await ctx.db.escrow.findUnique({
        where: { campaignId: input.campaignId },
      });

      if (existingEscrow) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Escrow already exists for this campaign",
        });
      }

      const commissionAmount = input.amount * campaign.platformCommissionRate;

      const [escrow] = await ctx.db.$transaction([
        ctx.db.escrow.create({
          data: {
            campaignId: input.campaignId,
            brandWalletId: wallet.id,
            totalAmount: input.amount,
            commissionAmount,
            status: "LOCKED",
          },
        }),
        ctx.db.wallet.update({
          where: { id: wallet.id },
          data: {
            availableBalance: { decrement: input.amount },
            escrowBalance: { increment: input.amount },
          },
        }),
        ctx.db.campaign.update({
          where: { id: input.campaignId },
          data: { status: "FUNDING" },
        }),
        ctx.db.transaction.create({
          data: {
            walletId: wallet.id,
            fromUserId: ctx.session.user.id,
            amount: -input.amount,
            type: "ESCROW_LOCK",
            status: "COMPLETED",
            description: `Escrow lock for campaign: ${campaign.name}`,
            referenceId: input.campaignId,
            referenceType: "campaign",
          },
        }),
      ]);

      return escrow;
    }),

  // Get escrow for a campaign
  getEscrow: protectedProcedure
    .input(z.object({ campaignId: z.string() }))
    .query(async ({ ctx, input }) => {
      const escrow = await ctx.db.escrow.findUnique({
        where: { campaignId: input.campaignId },
        include: {
          campaign: {
            select: { id: true, name: true, brandId: true, totalBudget: true },
          },
        },
      });

      if (!escrow) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Escrow not found" });
      }

      // Only brand owner or admin can view escrow
      if (escrow.campaign.brandId !== ctx.session.user.id && !ctx.session.user.isAdmin) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }

      return escrow;
    }),

  // Release escrow to creator wallets (admin only)
  releaseEscrow: adminProcedure
    .input(
      z.object({
        escrowId: z.string(),
        releases: z.array(
          z.object({
            creatorId: z.string(),
            amount: z.number().positive(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const escrow = await ctx.db.escrow.findUnique({
        where: { id: input.escrowId },
        include: { campaign: true },
      });

      if (!escrow) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Escrow not found" });
      }

      if (escrow.status === "FULLY_RELEASED" || escrow.status === "REFUNDED") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Escrow already fully released or refunded" });
      }

      const totalRelease = input.releases.reduce((sum, r) => sum + r.amount, 0);
      const remainingEscrow = escrow.totalAmount - escrow.releasedAmount;

      if (totalRelease > remainingEscrow) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Release amount (₹${totalRelease}) exceeds remaining escrow (₹${remainingEscrow})`,
        });
      }

      // Execute all releases in a transaction
      const operations = [];

      for (const release of input.releases) {
        // Get or create creator wallet
        const creatorWallet = await ctx.db.wallet.findUnique({
          where: { userId: release.creatorId },
        });

        if (!creatorWallet) continue;

        operations.push(
          ctx.db.wallet.update({
            where: { id: creatorWallet.id },
            data: {
              availableBalance: { increment: release.amount },
              lifetimeEarnings: { increment: release.amount },
            },
          })
        );

        operations.push(
          ctx.db.transaction.create({
            data: {
              walletId: creatorWallet.id,
              toUserId: release.creatorId,
              amount: release.amount,
              type: "ESCROW_RELEASE",
              status: "COMPLETED",
              description: `Escrow release for campaign: ${escrow.campaign.name}`,
              referenceId: escrow.id,
              referenceType: "escrow",
            },
          })
        );

        // Update campaign metrics
        operations.push(
          ctx.db.campaignMetrics.updateMany({
            where: {
              campaignId: escrow.campaignId,
              creatorId: release.creatorId,
            },
            data: { paidAmount: { increment: release.amount } },
          })
        );
      }

      const newReleasedAmount = escrow.releasedAmount + totalRelease;
      const newStatus =
        newReleasedAmount >= escrow.totalAmount ? "FULLY_RELEASED" : "PARTIALLY_RELEASED";

      operations.push(
        ctx.db.escrow.update({
          where: { id: input.escrowId },
          data: {
            releasedAmount: newReleasedAmount,
            status: newStatus,
            ...(newStatus === "FULLY_RELEASED" && { releasedAt: new Date() }),
          },
        })
      );

      // Deduct from brand wallet escrow balance
      operations.push(
        ctx.db.wallet.update({
          where: { id: escrow.brandWalletId },
          data: { escrowBalance: { decrement: totalRelease } },
        })
      );

      await ctx.db.$transaction(operations);

      return { released: totalRelease, newStatus };
    }),

  // Refund escrow back to brand (admin only — for cancelled campaigns)
  refundEscrow: adminProcedure
    .input(z.object({ escrowId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const escrow = await ctx.db.escrow.findUnique({
        where: { id: input.escrowId },
        include: { campaign: true },
      });

      if (!escrow) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Escrow not found" });
      }

      const refundAmount = escrow.totalAmount - escrow.releasedAmount;
      if (refundAmount <= 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No funds to refund" });
      }

      await ctx.db.$transaction([
        ctx.db.escrow.update({
          where: { id: input.escrowId },
          data: { status: "REFUNDED", releasedAt: new Date() },
        }),
        ctx.db.wallet.update({
          where: { id: escrow.brandWalletId },
          data: {
            availableBalance: { increment: refundAmount },
            escrowBalance: { decrement: refundAmount },
          },
        }),
        ctx.db.transaction.create({
          data: {
            walletId: escrow.brandWalletId,
            toUserId: escrow.campaign.brandId,
            amount: refundAmount,
            type: "REFUND",
            status: "COMPLETED",
            description: `Escrow refund for cancelled campaign: ${escrow.campaign.name}`,
            referenceId: escrow.id,
            referenceType: "escrow_refund",
          },
        }),
      ]);

      return { refunded: refundAmount };
    }),
});
