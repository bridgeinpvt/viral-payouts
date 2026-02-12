import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  brandProcedure,
  creatorProcedure,
} from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { WalletType } from "@prisma/client";

export const walletRouter = createTRPCRouter({
  // ==========================================
  // BRAND WALLET
  // ==========================================

  getBrandWallet: brandProcedure.query(async ({ ctx }) => {
    const wallet = await ctx.db.wallet.findUnique({
      where: { userId: ctx.session.user.id },
      include: { paymentMethods: true },
    });

    if (!wallet) {
      return await ctx.db.wallet.create({
        data: {
          userId: ctx.session.user.id,
          type: WalletType.BRAND,
          availableBalance: 0,
          pendingBalance: 0,
          escrowBalance: 0,
          lifetimeEarnings: 0,
        },
        include: { paymentMethods: true },
      });
    }

    // Include escrow summary
    const escrows = await ctx.db.escrow.findMany({
      where: { brandWalletId: wallet.id, status: "LOCKED" },
    });
    const totalEscrowLocked = escrows.reduce((sum, e) => sum + e.totalAmount - e.releasedAmount, 0);

    return { ...wallet, totalEscrowLocked };
  }),

  // Fund brand wallet (create Razorpay order is via REST API, this records the credit)
  recordBrandWalletFunding: brandProcedure
    .input(
      z.object({
        amount: z.number().min(1000),
        razorpayPaymentId: z.string(),
        razorpayOrderId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const wallet = await ctx.db.wallet.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (!wallet || wallet.type !== WalletType.BRAND) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Brand wallet not found" });
      }

      const [updatedWallet] = await ctx.db.$transaction([
        ctx.db.wallet.update({
          where: { id: wallet.id },
          data: { availableBalance: { increment: input.amount } },
        }),
        ctx.db.transaction.create({
          data: {
            walletId: wallet.id,
            toUserId: ctx.session.user.id,
            amount: input.amount,
            type: "CAMPAIGN_FUND",
            status: "COMPLETED",
            description: `Wallet top-up via Razorpay`,
            referenceId: input.razorpayPaymentId,
            referenceType: "razorpay_payment",
          },
        }),
      ]);

      return updatedWallet;
    }),

  // ==========================================
  // CREATOR WALLET
  // ==========================================

  getCreatorWallet: creatorProcedure.query(async ({ ctx }) => {
    const wallet = await ctx.db.wallet.findUnique({
      where: { userId: ctx.session.user.id },
      include: { paymentMethods: true },
    });

    if (!wallet) {
      return await ctx.db.wallet.create({
        data: {
          userId: ctx.session.user.id,
          type: WalletType.CREATOR,
          availableBalance: 0,
          pendingBalance: 0,
          lifetimeEarnings: 0,
        },
        include: { paymentMethods: true },
      });
    }

    return wallet;
  }),

  // ==========================================
  // SHARED
  // ==========================================

  // Get wallet (generic — works for both roles)
  getWallet: protectedProcedure.query(async ({ ctx }) => {
    const wallet = await ctx.db.wallet.findUnique({
      where: { userId: ctx.session.user.id },
      include: { paymentMethods: true },
    });

    if (!wallet) {
      const type = ctx.session.user.role === "BRAND" ? WalletType.BRAND : WalletType.CREATOR;
      return await ctx.db.wallet.create({
        data: {
          userId: ctx.session.user.id,
          type,
          availableBalance: 0,
          pendingBalance: 0,
          lifetimeEarnings: 0,
        },
        include: { paymentMethods: true },
      });
    }

    return wallet;
  }),

  // Get transactions
  getTransactions: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().optional(),
        type: z.enum(["EARNING", "WITHDRAWAL", "BONUS", "REFUND", "CAMPAIGN_FUND", "ESCROW_LOCK", "ESCROW_RELEASE", "PLATFORM_FEE"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const wallet = await ctx.db.wallet.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (!wallet) return { transactions: [], nextCursor: undefined };

      const transactions = await ctx.db.transaction.findMany({
        where: {
          walletId: wallet.id,
          ...(input.type && { type: input.type }),
        },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: "desc" },
        include: {
          participation: {
            include: {
              campaign: {
                select: { id: true, name: true, productName: true, type: true },
              },
            },
          },
        },
      });

      let nextCursor: string | undefined;
      if (transactions.length > input.limit) {
        const next = transactions.pop();
        nextCursor = next!.id;
      }

      return { transactions, nextCursor };
    }),

  // Get payouts
  getPayouts: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        status: z.enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const wallet = await ctx.db.wallet.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (!wallet) return [];

      return await ctx.db.payout.findMany({
        where: {
          walletId: wallet.id,
          ...(input.status && { status: input.status }),
        },
        take: input.limit,
        orderBy: { createdAt: "desc" },
        include: { paymentMethod: true },
      });
    }),

  // Request withdrawal (creator)
  requestWithdrawal: creatorProcedure
    .input(
      z.object({
        amount: z.number().min(100),
        paymentMethodId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const wallet = await ctx.db.wallet.findUnique({
        where: { userId: ctx.session.user.id },
        include: { paymentMethods: true },
      });

      if (!wallet || wallet.type !== WalletType.CREATOR) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Creator wallet not found" });
      }

      if (wallet.availableBalance < input.amount) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Insufficient balance" });
      }

      const paymentMethod = wallet.paymentMethods.find((pm) => pm.id === input.paymentMethodId);
      if (!paymentMethod) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Payment method not found" });
      }

      // Calculate TDS (10% for amounts > ₹20,000 per financial year)
      const tdsAmount = input.amount > 20000 ? input.amount * 0.1 : 0;
      const netAmount = input.amount - tdsAmount;

      const [payout] = await ctx.db.$transaction([
        ctx.db.payout.create({
          data: {
            walletId: wallet.id,
            paymentMethodId: input.paymentMethodId,
            userId: ctx.session.user.id,
            amount: input.amount,
            tdsAmount,
            netAmount,
            status: "PENDING",
            approvalStatus: "PENDING_APPROVAL",
          },
        }),
        ctx.db.wallet.update({
          where: { id: wallet.id },
          data: {
            availableBalance: { decrement: input.amount },
            pendingBalance: { increment: input.amount },
          },
        }),
        ctx.db.transaction.create({
          data: {
            walletId: wallet.id,
            fromUserId: ctx.session.user.id,
            amount: -input.amount,
            type: "WITHDRAWAL",
            status: "PENDING",
            description: `Withdrawal request to ${paymentMethod.type}`,
          },
        }),
      ]);

      return payout;
    }),

  // Add payment method
  addPaymentMethod: protectedProcedure
    .input(
      z.object({
        type: z.enum(["BANK_ACCOUNT", "UPI", "PAYPAL"]),
        details: z.record(z.string()),
        isPrimary: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      let wallet = await ctx.db.wallet.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (!wallet) {
        const type = ctx.session.user.role === "BRAND" ? WalletType.BRAND : WalletType.CREATOR;
        wallet = await ctx.db.wallet.create({
          data: {
            userId: ctx.session.user.id,
            type,
            availableBalance: 0,
            pendingBalance: 0,
            lifetimeEarnings: 0,
          },
        });
      }

      if (input.isPrimary) {
        await ctx.db.paymentMethod.updateMany({
          where: { walletId: wallet.id },
          data: { isPrimary: false },
        });
      }

      return await ctx.db.paymentMethod.create({
        data: {
          walletId: wallet.id,
          type: input.type,
          details: input.details,
          isPrimary: input.isPrimary,
          isVerified: false,
        },
      });
    }),

  // Update payment method
  updatePaymentMethod: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        isPrimary: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const wallet = await ctx.db.wallet.findUnique({
        where: { userId: ctx.session.user.id },
        include: { paymentMethods: true },
      });

      if (!wallet) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Wallet not found" });
      }

      const paymentMethod = wallet.paymentMethods.find((pm) => pm.id === input.id);
      if (!paymentMethod) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Payment method not found" });
      }

      if (input.isPrimary) {
        await ctx.db.paymentMethod.updateMany({
          where: { walletId: wallet.id, id: { not: input.id } },
          data: { isPrimary: false },
        });
      }

      return await ctx.db.paymentMethod.update({
        where: { id: input.id },
        data: { isPrimary: input.isPrimary },
      });
    }),

  // Delete payment method
  deletePaymentMethod: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const wallet = await ctx.db.wallet.findUnique({
        where: { userId: ctx.session.user.id },
        include: { paymentMethods: true },
      });

      if (!wallet) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Wallet not found" });
      }

      const paymentMethod = wallet.paymentMethods.find((pm) => pm.id === input.id);
      if (!paymentMethod) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Payment method not found" });
      }

      const pendingPayouts = await ctx.db.payout.count({
        where: {
          paymentMethodId: input.id,
          status: { in: ["PENDING", "PROCESSING"] },
        },
      });

      if (pendingPayouts > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot delete payment method with pending payouts",
        });
      }

      return await ctx.db.paymentMethod.delete({ where: { id: input.id } });
    }),
});
