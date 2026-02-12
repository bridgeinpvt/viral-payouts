import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { CampaignType, CampaignStatus, Platform, AudienceType } from "@prisma/client";

export const campaignRouter = createTRPCRouter({
  // Get all campaigns for brand
  getBrandCampaigns: protectedProcedure.query(async ({ ctx }) => {
    const campaigns = await ctx.db.campaign.findMany({
      where: { brandId: ctx.session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { submissions: true },
        },
      },
    });
    return campaigns;
  }),

  // Get single campaign
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
              brandProfile: true,
            },
          },
          submissions: {
            include: {
              creator: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                  creatorProfile: true,
                },
              },
            },
          },
          media: true,
          _count: {
            select: { submissions: true },
          },
        },
      });

      if (!campaign) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Campaign not found",
        });
      }

      return campaign;
    }),

  // Create campaign (draft)
  createCampaign: protectedProcedure
    .input(z.object({
      type: z.nativeEnum(CampaignType),
    }))
    .mutation(async ({ ctx, input }) => {
      const campaign = await ctx.db.campaign.create({
        data: {
          brandId: ctx.session.user.id,
          type: input.type,
          name: "",
          totalBudget: 0,
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          duration: 30,
          status: CampaignStatus.DRAFT,
        },
      });

      return campaign;
    }),

  // Update campaign details
  updateCampaign: protectedProcedure
    .input(z.object({
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
      totalBudget: z.number().optional(),
      minPayoutPerView: z.number().optional(),
      maxPayoutPerView: z.number().optional(),
      fixedPayout: z.number().optional(),
      conversionPayout: z.number().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      duration: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // Verify ownership
      const existing = await ctx.db.campaign.findUnique({
        where: { id },
      });

      if (!existing || existing.brandId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to update this campaign",
        });
      }

      const campaign = await ctx.db.campaign.update({
        where: { id },
        data,
      });

      return campaign;
    }),

  // Publish campaign
  publishCampaign: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const campaign = await ctx.db.campaign.findUnique({
        where: { id: input.id },
      });

      if (!campaign || campaign.brandId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized",
        });
      }

      // Validate required fields
      if (!campaign.name || !campaign.totalBudget || campaign.totalBudget < 25000) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Please complete all required fields. Minimum budget is ₹25,000",
        });
      }

      const updated = await ctx.db.campaign.update({
        where: { id: input.id },
        data: {
          status: CampaignStatus.ACTIVE,
          publishedAt: new Date(),
        },
      });

      // Update brand profile stats
      await ctx.db.brandProfile.update({
        where: { userId: ctx.session.user.id },
        data: {
          totalCampaigns: { increment: 1 },
        },
      });

      return updated;
    }),

  // Get marketplace campaigns (for creators)
  getMarketplaceCampaigns: protectedProcedure
    .input(z.object({
      type: z.nativeEnum(CampaignType).optional(),
      category: z.string().optional(),
      search: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const where: any = {
        status: CampaignStatus.ACTIVE,
        endDate: { gt: new Date() },
      };

      if (input.type) {
        where.type = input.type;
      }

      if (input.category) {
        where.targetCategories = { has: input.category };
      }

      if (input.search) {
        where.OR = [
          { name: { contains: input.search, mode: "insensitive" } },
          { productName: { contains: input.search, mode: "insensitive" } },
        ];
      }

      const campaigns = await ctx.db.campaign.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          brand: {
            select: {
              id: true,
              name: true,
              image: true,
              brandProfile: {
                select: {
                  companyName: true,
                  companyLogo: true,
                  isVerified: true,
                },
              },
            },
          },
          _count: {
            select: { submissions: true },
          },
        },
      });

      return campaigns;
    }),

  // Apply to campaign (creator)
  applyToCampaign: protectedProcedure
    .input(z.object({
      campaignId: z.string(),
      platforms: z.array(z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check if already applied
      const existing = await ctx.db.campaignSubmission.findUnique({
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

      // Generate unique tracking code
      const trackingCode = `VP${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

      const submission = await ctx.db.campaignSubmission.create({
        data: {
          campaignId: input.campaignId,
          creatorId: ctx.session.user.id,
          platform: input.platforms[0] as Platform,
          selectedPlatforms: input.platforms,
          trackingCode,
        },
      });

      // Update campaign submission count
      await ctx.db.campaign.update({
        where: { id: input.campaignId },
        data: { totalSubmissions: { increment: 1 } },
      });

      return submission;
    }),

  // Get single submission
  getSubmission: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const submission = await ctx.db.campaignSubmission.findUnique({
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
                    select: {
                      companyName: true,
                      companyLogo: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!submission) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Submission not found",
        });
      }

      // Verify ownership
      if (submission.creatorId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to view this submission",
        });
      }

      return submission;
    }),

  // Submit content for approved campaign
  submitContent: protectedProcedure
    .input(z.object({
      submissionId: z.string(),
      contentUrl: z.string().url(),
      platform: z.string(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const submission = await ctx.db.campaignSubmission.findUnique({
        where: { id: input.submissionId },
      });

      if (!submission) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Submission not found",
        });
      }

      if (submission.creatorId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized",
        });
      }

      if (submission.status !== "APPROVED" && submission.status !== "PENDING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot submit content at this stage",
        });
      }

      const updated = await ctx.db.campaignSubmission.update({
        where: { id: input.submissionId },
        data: {
          contentUrl: input.contentUrl,
          platform: input.platform as Platform,
          status: "SUBMITTED",
          submittedAt: new Date(),
        },
      });

      return updated;
    }),

  // Get creator's campaign submissions
  getMySubmissions: protectedProcedure.query(async ({ ctx }) => {
    const submissions = await ctx.db.campaignSubmission.findMany({
      where: { creatorId: ctx.session.user.id },
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
                  select: {
                    companyName: true,
                    companyLogo: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return submissions;
  }),

  // Save/unsave campaign
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
        await ctx.db.savedCampaign.delete({
          where: { id: existing.id },
        });
        return { saved: false };
      }

      await ctx.db.savedCampaign.create({
        data: {
          userId: ctx.session.user.id,
          campaignId: input.campaignId,
        },
      });

      return { saved: true };
    }),

  // Get saved campaigns
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
                  select: {
                    companyName: true,
                    companyLogo: true,
                  },
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

  // Get campaign submissions for brand
  getCampaignSubmissions: protectedProcedure
    .input(z.object({
      campaignId: z.string(),
      status: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      // Verify campaign ownership
      const campaign = await ctx.db.campaign.findUnique({
        where: { id: input.campaignId },
      });

      if (!campaign || campaign.brandId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to view submissions",
        });
      }

      const where: any = { campaignId: input.campaignId };
      if (input.status) {
        where.status = input.status;
      }

      return await ctx.db.campaignSubmission.findMany({
        where,
        orderBy: { createdAt: "desc" },
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
                  totalCampaigns: true,
                  totalEarnings: true,
                  instagramHandle: true,
                  instagramFollowers: true,
                  youtubeHandle: true,
                  youtubeSubscribers: true,
                },
              },
            },
          },
        },
      });
    }),

  // Approve submission (brand)
  approveSubmission: protectedProcedure
    .input(z.object({
      submissionId: z.string(),
      note: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const submission = await ctx.db.campaignSubmission.findUnique({
        where: { id: input.submissionId },
        include: { campaign: true },
      });

      if (!submission) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Submission not found",
        });
      }

      if (submission.campaign.brandId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized",
        });
      }

      const updated = await ctx.db.campaignSubmission.update({
        where: { id: input.submissionId },
        data: {
          status: "APPROVED",
          approvedAt: new Date(),
          reviewNote: input.note,
          reviewedAt: new Date(),
        },
      });

      // Update campaign approved count
      await ctx.db.campaign.update({
        where: { id: submission.campaignId },
        data: { approvedCount: { increment: 1 } },
      });

      return updated;
    }),

  // Reject submission (brand)
  rejectSubmission: protectedProcedure
    .input(z.object({
      submissionId: z.string(),
      reason: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const submission = await ctx.db.campaignSubmission.findUnique({
        where: { id: input.submissionId },
        include: { campaign: true },
      });

      if (!submission) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Submission not found",
        });
      }

      if (submission.campaign.brandId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized",
        });
      }

      return await ctx.db.campaignSubmission.update({
        where: { id: input.submissionId },
        data: {
          status: "REJECTED",
          reviewNote: input.reason,
          reviewedAt: new Date(),
        },
      });
    }),

  // Approve content (brand) - for submitted content
  approveContent: protectedProcedure
    .input(z.object({
      submissionId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const submission = await ctx.db.campaignSubmission.findUnique({
        where: { id: input.submissionId },
        include: { campaign: true },
      });

      if (!submission) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Submission not found",
        });
      }

      if (submission.campaign.brandId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized",
        });
      }

      // Calculate initial payout
      const fixedPayout = submission.campaign.fixedPayout || 0;

      return await ctx.db.campaignSubmission.update({
        where: { id: input.submissionId },
        data: {
          status: "PUBLISHED",
          earnedAmount: fixedPayout,
          calculatedPayout: fixedPayout,
          reviewedAt: new Date(),
        },
      });
    }),
});
