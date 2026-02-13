import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  adminProcedure,
} from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const trackingRouter = createTRPCRouter({
  // Get tracking link for a campaign+creator


  // Get click events for a tracking link
  getClickEvents: protectedProcedure
    .input(
      z.object({
        trackingLinkId: z.string().optional(),
        campaignId: z.string().optional(),
        creatorId: z.string().optional(),
        startDate: z.coerce.date().optional(),
        endDate: z.coerce.date().optional(),
        limit: z.number().min(1).max(500).default(100),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {};

      if (input.trackingLinkId) where.trackingLinkId = input.trackingLinkId;
      if (input.campaignId) where.campaignId = input.campaignId;
      if (input.creatorId) where.creatorId = input.creatorId;
      if (input.startDate || input.endDate) {
        where.createdAt = {
          ...(input.startDate && { gte: input.startDate }),
          ...(input.endDate && { lte: input.endDate }),
        };
      }

      const events = await ctx.db.clickEvent.findMany({
        where,
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: "desc" },
      });

      let nextCursor: string | undefined;
      if (events.length > input.limit) {
        const next = events.pop();
        nextCursor = next!.id;
      }

      return { events, nextCursor };
    }),

  // Get view snapshots for a campaign+creator
  getViewSnapshots: protectedProcedure
    .input(
      z.object({
        campaignId: z.string(),
        creatorId: z.string().optional(),
        startDate: z.coerce.date().optional(),
        endDate: z.coerce.date().optional(),
        limit: z.number().min(1).max(500).default(100),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {
        campaignId: input.campaignId,
      };

      if (input.creatorId) where.creatorId = input.creatorId;
      if (input.startDate || input.endDate) {
        where.snapshotAt = {
          ...(input.startDate && { gte: input.startDate }),
          ...(input.endDate && { lte: input.endDate }),
        };
      }

      return await ctx.db.viewSnapshot.findMany({
        where,
        take: input.limit,
        orderBy: { snapshotAt: "desc" },
      });
    }),

  // Get conversion events
  getConversionEvents: protectedProcedure
    .input(
      z.object({
        campaignId: z.string().optional(),
        creatorId: z.string().optional(),
        promoCodeId: z.string().optional(),
        limit: z.number().min(1).max(500).default(100),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {};

      if (input.campaignId) where.campaignId = input.campaignId;
      if (input.creatorId) where.creatorId = input.creatorId;
      if (input.promoCodeId) where.promoCodeId = input.promoCodeId;

      const events = await ctx.db.conversionEvent.findMany({
        where,
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: "desc" },
        include: {
          promoCode: { select: { code: true } },
        },
      });

      let nextCursor: string | undefined;
      if (events.length > input.limit) {
        const next = events.pop();
        nextCursor = next!.id;
      }

      return { events, nextCursor };
    }),

  // Get click stats summary (for dashboards)
  getClickStats: protectedProcedure
    .input(
      z.object({
        campaignId: z.string(),
        creatorId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {
        campaignId: input.campaignId,
      };
      if (input.creatorId) where.creatorId = input.creatorId;

      const [totalClicks, fraudClicks, uniqueIps] = await Promise.all([
        ctx.db.clickEvent.count({ where }),
        ctx.db.clickEvent.count({ where: { ...where, isFraud: true } }),
        ctx.db.clickEvent.groupBy({
          by: ["ip"],
          where,
        }),
      ]);

      return {
        totalClicks,
        fraudClicks,
        validClicks: totalClicks - fraudClicks,
        uniqueIps: uniqueIps.length,
      };
    }),

  // Admin: get all tracking links for a campaign
  getCampaignTrackingLinks: adminProcedure
    .input(z.object({ campaignId: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.trackingLink.findMany({
        where: { campaignId: input.campaignId },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              creatorProfile: { select: { displayName: true } },
            },
          },
        },
      });
    }),
});
