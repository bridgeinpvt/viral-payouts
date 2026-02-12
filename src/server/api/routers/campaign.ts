import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
  brandProcedure,
  creatorProcedure,
} from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import {
  CampaignType,
  CampaignStatus,
  Platform,
  AudienceType,
  ParticipationStatus,
} from "@prisma/client";

function generateSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") +
    "-" +
    Date.now().toString(36)
  );
}

function generatePromoCode(format?: string | null): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const random = Array.from({ length: 6 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join("");
  return format ? format.replace("{{CODE}}", random) : random;
}

export const campaignRouter = createTRPCRouter({
  // ==========================================
  // BRAND PROCEDURES
  // ==========================================

  // Create campaign (brand) — 4-step wizard data
  createCampaign: brandProcedure
    .input(
      z.object({
        // Step 1: Basics
        name: z.string().min(1),
        type: z.nativeEnum(CampaignType),
        description: z.string().optional(),
        coverImage: z.string().optional(),
        productName: z.string().optional(),
        campaignBrief: z.string().optional(),
        contentGuidelines: z.string().optional(),
        assetsLink: z.string().optional(),
        rules: z.string().optional(),
        targetPlatforms: z.array(z.nativeEnum(Platform)).optional(),
        targetAudience: z.array(z.nativeEnum(AudienceType)).optional(),
        targetCategories: z.array(z.string()).optional(),
        startDate: z.coerce.date(),
        endDate: z.coerce.date(),
        duration: z.number().int().positive(),

        // Step 2: Payout config (conditional per type)
        payoutPer1KViews: z.number().positive().optional(),
        oauthRequired: z.boolean().optional(),
        payoutPerClick: z.number().positive().optional(),
        landingPageUrl: z.string().url().optional(),
        payoutPerSale: z.number().positive().optional(),
        promoCodeFormat: z.string().optional(),
        maxPayoutPerCreator: z.number().positive().optional(),

        // Step 3: Budget
        totalBudget: z.number().min(25000),
        platformCommissionRate: z.number().min(0).max(1).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const slug = generateSlug(input.name);

      const campaign = await ctx.db.campaign.create({
        data: {
          brandId: ctx.session.user.id,
          slug,
          name: input.name,
          type: input.type,
          description: input.description,
          coverImage: input.coverImage,
          productName: input.productName,
          campaignBrief: input.campaignBrief,
          contentGuidelines: input.contentGuidelines,
          assetsLink: input.assetsLink,
          rules: input.rules,
          targetPlatforms: input.targetPlatforms ?? [],
          targetAudience: input.targetAudience ?? [],
          targetCategories: input.targetCategories ?? [],
          startDate: input.startDate,
          endDate: input.endDate,
          duration: input.duration,
          totalBudget: input.totalBudget,
          platformCommissionRate: input.platformCommissionRate ?? 0.15,
          // Type-specific fields
          payoutPer1KViews: input.payoutPer1KViews,
          oauthRequired: input.oauthRequired ?? false,
          payoutPerClick: input.payoutPerClick,
          landingPageUrl: input.landingPageUrl,
          payoutPerSale: input.payoutPerSale,
          promoCodeFormat: input.promoCodeFormat,
          maxPayoutPerCreator: input.maxPayoutPerCreator,
          status: CampaignStatus.DRAFT,
        },
      });

      return campaign;
    }),

  // Update campaign (brand)
  updateCampaign: brandProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        coverImage: z.string().optional(),
        productName: z.string().optional(),
        campaignBrief: z.string().optional(),
        contentGuidelines: z.string().optional(),
        assetsLink: z.string().optional(),
        rules: z.string().optional(),
        targetPlatforms: z.array(z.nativeEnum(Platform)).optional(),
        targetAudience: z.array(z.nativeEnum(AudienceType)).optional(),
        targetCategories: z.array(z.string()).optional(),
        totalBudget: z.number().min(25000).optional(),
        payoutPer1KViews: z.number().positive().optional(),
        oauthRequired: z.boolean().optional(),
        payoutPerClick: z.number().positive().optional(),
        landingPageUrl: z.string().url().optional(),
        payoutPerSale: z.number().positive().optional(),
        promoCodeFormat: z.string().optional(),
        maxPayoutPerCreator: z.number().positive().optional(),
        startDate: z.coerce.date().optional(),
        endDate: z.coerce.date().optional(),
        duration: z.number().int().positive().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const existing = await ctx.db.campaign.findUnique({ where: { id } });
      if (!existing || existing.brandId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }

      if (existing.status !== CampaignStatus.DRAFT) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only draft campaigns can be edited",
        });
      }

      return await ctx.db.campaign.update({ where: { id }, data });
    }),

  // Publish campaign — validate escrow funded → set LIVE
  publishCampaign: brandProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const campaign = await ctx.db.campaign.findUnique({
        where: { id: input.id },
        include: { escrow: true },
      });

      if (!campaign || campaign.brandId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }

      if (!campaign.name || !campaign.totalBudget || campaign.totalBudget < 25000) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Please complete all required fields. Minimum budget is ₹25,000",
        });
      }

      if (!campaign.escrow || campaign.escrow.status !== "LOCKED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Campaign budget must be funded in escrow before publishing",
        });
      }

      const updated = await ctx.db.campaign.update({
        where: { id: input.id },
        data: {
          status: CampaignStatus.LIVE,
          publishedAt: new Date(),
        },
      });

      await ctx.db.brandProfile.update({
        where: { userId: ctx.session.user.id },
        data: { totalCampaigns: { increment: 1 } },
      });

      return updated;
    }),

  // Pause campaign
  pauseCampaign: brandProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const campaign = await ctx.db.campaign.findUnique({
        where: { id: input.id },
      });

      if (!campaign || campaign.brandId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }

      if (campaign.status !== CampaignStatus.LIVE) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only live campaigns can be paused",
        });
      }

      return await ctx.db.campaign.update({
        where: { id: input.id },
        data: { status: CampaignStatus.PAUSED },
      });
    }),

  // Resume campaign
  resumeCampaign: brandProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const campaign = await ctx.db.campaign.findUnique({
        where: { id: input.id },
      });

      if (!campaign || campaign.brandId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }

      if (campaign.status !== CampaignStatus.PAUSED) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only paused campaigns can be resumed",
        });
      }

      return await ctx.db.campaign.update({
        where: { id: input.id },
        data: { status: CampaignStatus.LIVE },
      });
    }),

  // Duplicate campaign
  duplicateCampaign: brandProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const source = await ctx.db.campaign.findUnique({
        where: { id: input.id },
      });

      if (!source || source.brandId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }

      const slug = generateSlug(source.name + " copy");

      return await ctx.db.campaign.create({
        data: {
          brandId: ctx.session.user.id,
          slug,
          name: `${source.name} (Copy)`,
          type: source.type,
          description: source.description,
          coverImage: source.coverImage,
          productName: source.productName,
          campaignBrief: source.campaignBrief,
          contentGuidelines: source.contentGuidelines,
          assetsLink: source.assetsLink,
          rules: source.rules,
          targetPlatforms: source.targetPlatforms,
          targetAudience: source.targetAudience,
          targetCategories: source.targetCategories,
          totalBudget: source.totalBudget,
          platformCommissionRate: source.platformCommissionRate,
          payoutPer1KViews: source.payoutPer1KViews,
          oauthRequired: source.oauthRequired,
          payoutPerClick: source.payoutPerClick,
          landingPageUrl: source.landingPageUrl,
          payoutPerSale: source.payoutPerSale,
          promoCodeFormat: source.promoCodeFormat,
          maxPayoutPerCreator: source.maxPayoutPerCreator,
          startDate: new Date(),
          endDate: new Date(Date.now() + source.duration * 24 * 60 * 60 * 1000),
          duration: source.duration,
          status: CampaignStatus.DRAFT,
        },
      });
    }),

  // Get brand's campaigns
  getBrandCampaigns: brandProcedure.query(async ({ ctx }) => {
    return await ctx.db.campaign.findMany({
      where: { brandId: ctx.session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        escrow: { select: { totalAmount: true, releasedAmount: true, status: true } },
        _count: { select: { participations: true } },
      },
    });
  }),

  // Get single campaign (any authenticated user)
  getCampaign: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const campaign = await ctx.db.campaign.findUnique({
        where: { id: input.id },
        include: {
          brand: {
            select: {
              id: true,
              name: true,
              image: true,
              brandProfile: {
                select: { companyName: true, companyLogo: true, isVerified: true },
              },
            },
          },
          escrow: true,
          _count: { select: { participations: true, trackingLinks: true } },
        },
      });

      if (!campaign) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" });
      }

      return campaign;
    }),

  // Get brand campaign detail with 4-tab data
  getBrandCampaignDetail: brandProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const campaign = await ctx.db.campaign.findUnique({
        where: { id: input.id },
        include: {
          escrow: true,
          participations: {
            include: {
              creator: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                  creatorProfile: {
                    select: {
                      displayName: true,
                      tier: true,
                      instagramHandle: true,
                      instagramFollowers: true,
                      youtubeHandle: true,
                      youtubeSubscribers: true,
                    },
                  },
                },
              },
              trackingLink: true,
              promoCode: true,
            },
            orderBy: { createdAt: "desc" },
          },
          metrics: { orderBy: { earnedAmount: "desc" } },
          dailyAnalytics: { orderBy: { date: "desc" }, take: 30 },
          fraudFlags: { orderBy: { createdAt: "desc" } },
          media: { orderBy: { sortOrder: "asc" } },
        },
      });

      if (!campaign || campaign.brandId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }

      return campaign;
    }),

  // Invite creator to campaign (brand)
  inviteCreator: brandProcedure
    .input(
      z.object({
        campaignId: z.string(),
        creatorId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const campaign = await ctx.db.campaign.findUnique({
        where: { id: input.campaignId },
      });

      if (!campaign || campaign.brandId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }

      // Check not already participating
      const existing = await ctx.db.campaignParticipation.findUnique({
        where: {
          campaignId_creatorId: {
            campaignId: input.campaignId,
            creatorId: input.creatorId,
          },
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Creator is already part of this campaign",
        });
      }

      // Verify creator exists and is a CREATOR
      const creator = await ctx.db.user.findUnique({
        where: { id: input.creatorId },
      });

      if (!creator || creator.role !== "CREATOR") {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Creator not found",
        });
      }

      // Create participation as APPROVED (invited by brand)
      const participation = await ctx.db.campaignParticipation.create({
        data: {
          campaignId: input.campaignId,
          creatorId: input.creatorId,
          status: ParticipationStatus.APPROVED,
          approvedAt: new Date(),
        },
      });

      // Create tracking link for CLICK campaigns
      if (campaign.type === CampaignType.CLICK && campaign.landingPageUrl) {
        const linkSlug = `${campaign.slug}-${Date.now().toString(36)}`;
        const trackingLink = await ctx.db.trackingLink.create({
          data: {
            campaignId: input.campaignId,
            creatorId: input.creatorId,
            slug: linkSlug,
            destinationUrl: campaign.landingPageUrl,
          },
        });
        await ctx.db.campaignParticipation.update({
          where: { id: participation.id },
          data: { trackingLinkId: trackingLink.id },
        });
      }

      // Create promo code for CONVERSION campaigns
      if (campaign.type === CampaignType.CONVERSION) {
        const code = generatePromoCode(campaign.promoCodeFormat);
        const promoCode = await ctx.db.promoCode.create({
          data: {
            campaignId: input.campaignId,
            creatorId: input.creatorId,
            code,
          },
        });
        await ctx.db.campaignParticipation.update({
          where: { id: participation.id },
          data: { promoCodeId: promoCode.id },
        });
      }

      // Create campaign metrics record
      await ctx.db.campaignMetrics.create({
        data: {
          campaignId: input.campaignId,
          creatorId: input.creatorId,
        },
      });

      await ctx.db.campaign.update({
        where: { id: input.campaignId },
        data: { totalParticipants: { increment: 1 } },
      });

      return participation;
    }),

  // Approve participation (brand)
  approveParticipation: brandProcedure
    .input(z.object({ participationId: z.string(), note: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const participation = await ctx.db.campaignParticipation.findUnique({
        where: { id: input.participationId },
        include: { campaign: true },
      });

      if (!participation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Participation not found" });
      }

      if (participation.campaign.brandId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }

      if (participation.status !== ParticipationStatus.APPLIED) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Can only approve pending applications",
        });
      }

      const updated = await ctx.db.campaignParticipation.update({
        where: { id: input.participationId },
        data: {
          status: ParticipationStatus.APPROVED,
          approvedAt: new Date(),
          reviewNote: input.note,
          reviewedAt: new Date(),
        },
      });

      const campaign = participation.campaign;

      // Create tracking link for CLICK campaigns
      if (campaign.type === CampaignType.CLICK && campaign.landingPageUrl) {
        const linkSlug = `${campaign.slug}-${Date.now().toString(36)}`;
        const trackingLink = await ctx.db.trackingLink.create({
          data: {
            campaignId: campaign.id,
            creatorId: participation.creatorId,
            slug: linkSlug,
            destinationUrl: campaign.landingPageUrl,
          },
        });
        await ctx.db.campaignParticipation.update({
          where: { id: input.participationId },
          data: { trackingLinkId: trackingLink.id },
        });
      }

      // Create promo code for CONVERSION campaigns
      if (campaign.type === CampaignType.CONVERSION) {
        const code = generatePromoCode(campaign.promoCodeFormat);
        const promoCode = await ctx.db.promoCode.create({
          data: {
            campaignId: campaign.id,
            creatorId: participation.creatorId,
            code,
          },
        });
        await ctx.db.campaignParticipation.update({
          where: { id: input.participationId },
          data: { promoCodeId: promoCode.id },
        });
      }

      // Create campaign metrics record
      await ctx.db.campaignMetrics.create({
        data: {
          campaignId: campaign.id,
          creatorId: participation.creatorId,
        },
      });

      return updated;
    }),

  // Reject participation (brand)
  rejectParticipation: brandProcedure
    .input(z.object({ participationId: z.string(), reason: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const participation = await ctx.db.campaignParticipation.findUnique({
        where: { id: input.participationId },
        include: { campaign: true },
      });

      if (!participation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Participation not found" });
      }

      if (participation.campaign.brandId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }

      return await ctx.db.campaignParticipation.update({
        where: { id: input.participationId },
        data: {
          status: ParticipationStatus.REJECTED,
          reviewNote: input.reason,
          reviewedAt: new Date(),
        },
      });
    }),

  // ==========================================
  // CREATOR PROCEDURES
  // ==========================================

  // Apply to campaign (creator)
  applyToCampaign: creatorProcedure
    .input(
      z.object({
        campaignId: z.string(),
        platforms: z.array(z.nativeEnum(Platform)),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const campaign = await ctx.db.campaign.findUnique({
        where: { id: input.campaignId },
      });

      if (!campaign || campaign.status !== CampaignStatus.LIVE) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Campaign is not accepting applications",
        });
      }

      // Check if already applied
      const existing = await ctx.db.campaignParticipation.findUnique({
        where: {
          campaignId_creatorId: {
            campaignId: input.campaignId,
            creatorId: ctx.session.user.id,
          },
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "You have already applied to this campaign",
        });
      }

      const participation = await ctx.db.campaignParticipation.create({
        data: {
          campaignId: input.campaignId,
          creatorId: ctx.session.user.id,
          platform: input.platforms[0],
          selectedPlatforms: input.platforms,
          status: ParticipationStatus.APPLIED,
        },
      });

      return participation;
    }),

  // Submit content (creator)
  submitContent: creatorProcedure
    .input(
      z.object({
        participationId: z.string(),
        contentUrl: z.string().url(),
        platform: z.nativeEnum(Platform),
        caption: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const participation = await ctx.db.campaignParticipation.findUnique({
        where: { id: input.participationId },
      });

      if (!participation || participation.creatorId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }

      if (
        participation.status !== ParticipationStatus.APPROVED &&
        participation.status !== ParticipationStatus.ACTIVE
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot submit content at this stage",
        });
      }

      return await ctx.db.campaignParticipation.update({
        where: { id: input.participationId },
        data: {
          contentUrl: input.contentUrl,
          platform: input.platform,
          caption: input.caption,
          status: ParticipationStatus.ACTIVE,
          submittedAt: new Date(),
        },
      });
    }),

  // Get creator's participations
  getMyParticipations: creatorProcedure
    .input(
      z.object({
        status: z.nativeEnum(ParticipationStatus).optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      return await ctx.db.campaignParticipation.findMany({
        where: {
          creatorId: ctx.session.user.id,
          ...(input?.status && { status: input.status }),
        },
        orderBy: { createdAt: "desc" },
        include: {
          campaign: {
            include: {
              brand: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                  brandProfile: {
                    select: { companyName: true, companyLogo: true },
                  },
                },
              },
            },
          },
          trackingLink: true,
          promoCode: true,
        },
      });
    }),

  // Get single participation detail (creator)
  getMyParticipation: creatorProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const participation = await ctx.db.campaignParticipation.findUnique({
        where: { id: input.id },
        include: {
          campaign: {
            include: {
              brand: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                  brandProfile: {
                    select: { companyName: true, companyLogo: true },
                  },
                },
              },
            },
          },
          trackingLink: true,
          promoCode: true,
          contentItems: true,
        },
      });

      if (!participation || participation.creatorId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Participation not found" });
      }

      // Get metrics for this participation
      const metrics = await ctx.db.campaignMetrics.findUnique({
        where: {
          campaignId_creatorId: {
            campaignId: participation.campaignId,
            creatorId: ctx.session.user.id,
          },
        },
      });

      return { ...participation, metrics };
    }),

  // ==========================================
  // PUBLIC / MARKETPLACE
  // ==========================================

  // Get marketplace campaigns (public — no auth required)
  getMarketplaceCampaigns: publicProcedure
    .input(
      z.object({
        type: z.nativeEnum(CampaignType).optional(),
        platform: z.nativeEnum(Platform).optional(),
        category: z.string().optional(),
        search: z.string().optional(),
        cursor: z.string().optional(),
        limit: z.number().min(1).max(50).default(20),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {
        status: CampaignStatus.LIVE,
        endDate: { gt: new Date() },
      };

      if (input?.type) where.type = input.type;
      if (input?.platform) where.targetPlatforms = { has: input.platform };
      if (input?.category) where.targetCategories = { has: input.category };
      if (input?.search) {
        where.OR = [
          { name: { contains: input.search, mode: "insensitive" } },
          { productName: { contains: input.search, mode: "insensitive" } },
        ];
      }

      const limit = input?.limit ?? 20;
      const campaigns = await ctx.db.campaign.findMany({
        where,
        take: limit + 1,
        cursor: input?.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: "desc" },
        include: {
          brand: {
            select: {
              id: true,
              name: true,
              image: true,
              brandProfile: {
                select: { companyName: true, companyLogo: true, isVerified: true },
              },
            },
          },
          _count: { select: { participations: true } },
        },
      });

      let nextCursor: string | undefined;
      if (campaigns.length > limit) {
        const next = campaigns.pop();
        nextCursor = next!.id;
      }

      return { campaigns, nextCursor };
    }),

  // ==========================================
  // SAVED CAMPAIGNS
  // ==========================================

  toggleSaveCampaign: protectedProcedure
    .input(z.object({ campaignId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.savedCampaign.findUnique({
        where: {
          userId_campaignId: {
            userId: ctx.session.user.id,
            campaignId: input.campaignId,
          },
        },
      });

      if (existing) {
        await ctx.db.savedCampaign.delete({ where: { id: existing.id } });
        return { saved: false };
      }

      await ctx.db.savedCampaign.create({
        data: { userId: ctx.session.user.id, campaignId: input.campaignId },
      });

      return { saved: true };
    }),

  getSavedCampaigns: protectedProcedure.query(async ({ ctx }) => {
    const saved = await ctx.db.savedCampaign.findMany({
      where: { userId: ctx.session.user.id },
      include: {
        campaign: {
          include: {
            brand: {
              select: {
                id: true,
                name: true,
                image: true,
                brandProfile: {
                  select: { companyName: true, companyLogo: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return saved.map((s) => s.campaign);
  }),
});
