import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const walletRouter = createTRPCRouter({
  // Get user's wallet
  getWallet: protectedProcedure.query(async ({ ctx }) => {
    const wallet = await ctx.db.wallet.findUnique({
      where: { userId: ctx.session.user.id },
      include: {
        paymentMethods: true,
      },
    });

    if (!wallet) {
      // Create wallet if it doesn't exist
      return await ctx.db.wallet.create({
        data: {
          userId: ctx.session.user.id,
          availableBalance: 0,
          pendingBalance: 0,
          lifetimeEarnings: 0,
        },
        include: {
          paymentMethods: true,
        },
      });
    }

    return wallet;
  }),

  // Get wallet transactions
  getTransactions: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().optional(),
        type: z.enum(["EARNING", "WITHDRAWAL", "BONUS", "REFUND"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const wallet = await ctx.db.wallet.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (!wallet) {
        return { transactions: [], nextCursor: undefined };
      }

      const transactions = await ctx.db.transaction.findMany({
        where: {
          walletId: wallet.id,
          ...(input.type && { type: input.type }),
        },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: "desc" },
        include: {
          submission: {
            include: {
              campaign: {
                select: {
                  id: true,
                  name: true,
                  productName: true,
                  type: true,
                },
              },
            },
          },
        },
      });

      let nextCursor: string | undefined;
      if (transactions.length > input.limit) {
        const nextItem = transactions.pop();
        nextCursor = nextItem!.id;
      }

      return { transactions, nextCursor };
    }),

  // Get payouts
  getPayouts: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        status: z.enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const wallet = await ctx.db.wallet.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (!wallet) {
        return [];
      }

      return await ctx.db.payout.findMany({
        where: {
          walletId: wallet.id,
          ...(input.status && { status: input.status }),
        },
        take: input.limit,
        orderBy: { createdAt: "desc" },
        include: {
          paymentMethod: true,
        },
      });
    }),

  // Request withdrawal
  requestWithdrawal: protectedProcedure
    .input(
      z.object({
        amount: z.number().min(100), // Minimum ₹100 withdrawal
        paymentMethodId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const wallet = await ctx.db.wallet.findUnique({
        where: { userId: ctx.session.user.id },
        include: { paymentMethods: true },
      });

      if (!wallet) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Wallet not found",
        });
      }

      if (wallet.availableBalance < input.amount) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Insufficient balance",
        });
      }

      const paymentMethod = wallet.paymentMethods.find(
        (pm) => pm.id === input.paymentMethodId
      );

      if (!paymentMethod) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payment method not found",
        });
      }

      // Create payout and deduct from wallet
      const [payout] = await ctx.db.$transaction([
        ctx.db.payout.create({
          data: {
            walletId: wallet.id,
            paymentMethodId: input.paymentMethodId,
            userId: ctx.session.user.id,
            amount: input.amount,
            status: "PENDING",
          },
        }),
        ctx.db.wallet.update({
          where: { id: wallet.id },
          data: {
            availableBalance: { decrement: input.amount },
          },
        }),
        ctx.db.transaction.create({
          data: {
            walletId: wallet.id,
            amount: -input.amount,
            type: "WITHDRAWAL",
            status: "PENDING",
            description: `Withdrawal to ${paymentMethod.type}`,
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
        wallet = await ctx.db.wallet.create({
          data: {
            userId: ctx.session.user.id,
            availableBalance: 0,
            pendingBalance: 0,
            lifetimeEarnings: 0,
          },
        });
      }

      // If this is primary, unset other primary methods
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
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Wallet not found",
        });
      }

      const paymentMethod = wallet.paymentMethods.find((pm) => pm.id === input.id);
      if (!paymentMethod) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payment method not found",
        });
      }

      // If setting as primary, unset others
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
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Wallet not found",
        });
      }

      const paymentMethod = wallet.paymentMethods.find((pm) => pm.id === input.id);
      if (!paymentMethod) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payment method not found",
        });
      }

      // Check if there are pending payouts using this method
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

      return await ctx.db.paymentMethod.delete({
        where: { id: input.id },
      });
    }),
});
