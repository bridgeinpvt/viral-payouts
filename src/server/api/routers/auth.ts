import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { OTPType, UserRole } from "@prisma/client";

// Helper functions
function generateOTP(): string {
  if (process.env.NODE_ENV === "development") {
    return "123456";
  }
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export const authRouter = createTRPCRouter({
  // Get current user
  getCurrentUser: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      include: {
        brandProfile: true,
        creatorProfile: true,
        wallet: true,
      },
    });
    return user;
  }),

  // Send Email OTP
  sendEmailOTP: publicProcedure
    .input(z.object({
      email: z.string().email(),
      type: z.nativeEnum(OTPType).default(OTPType.EMAIL_VERIFICATION),
    }))
    .mutation(async ({ ctx, input }) => {
      const { email, type } = input;

      // For login OTPs, check if user exists
      if (type === OTPType.LOGIN) {
        const existingUser = await ctx.db.user.findUnique({
          where: { email },
        });

        if (!existingUser) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "No account found with this email address",
          });
        }
      }

      const code = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      // Delete existing OTPs
      await ctx.db.oTP.deleteMany({
        where: { identifier: email, type },
      });

      // Create new OTP
      const otp = await ctx.db.oTP.create({
        data: { identifier: email, code, type, expiresAt },
      });

      // In development, log the OTP
      if (process.env.NODE_ENV === "development") {
        console.log(`📧 OTP for ${email}: ${code}`);
      }

      return { success: true, otpId: otp.id };
    }),

  // Send Phone OTP
  sendPhoneOTP: publicProcedure
    .input(z.object({
      phone: z.string().min(7),
      countryCode: z.string().min(1).max(4),
      type: z.nativeEnum(OTPType).default(OTPType.PHONE_VERIFICATION),
    }))
    .mutation(async ({ ctx, input }) => {
      const { phone, countryCode, type } = input;

      // For login OTPs, check if user exists
      if (type === OTPType.LOGIN) {
        const existingUser = await ctx.db.user.findUnique({
          where: { phone },
        });

        if (!existingUser) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "No account found with this phone number",
          });
        }
      }

      const code = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      // Delete existing OTPs
      await ctx.db.oTP.deleteMany({
        where: { identifier: phone, type },
      });

      // Create new OTP
      const otp = await ctx.db.oTP.create({
        data: { identifier: phone, code, type, expiresAt },
      });

      // In development, log the OTP
      if (process.env.NODE_ENV === "development") {
        console.log(`📱 OTP for +${countryCode} ${phone}: ${code}`);
      }

      return { success: true, otpId: otp.id };
    }),

  // Verify OTP
  verifyOTPCode: publicProcedure
    .input(z.object({
      identifier: z.string(),
      code: z.string(),
      type: z.nativeEnum(OTPType),
    }))
    .mutation(async ({ ctx, input }) => {
      const { identifier, code, type } = input;

      const otp = await ctx.db.oTP.findFirst({
        where: {
          identifier,
          type,
          verified: false,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: "desc" },
      });

      if (!otp) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid or expired OTP",
        });
      }

      if (otp.attempts >= 3) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Too many attempts. Please request a new OTP",
        });
      }

      if (otp.code !== code) {
        await ctx.db.oTP.update({
          where: { id: otp.id },
          data: { attempts: otp.attempts + 1 },
        });

        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid OTP",
        });
      }

      await ctx.db.oTP.update({
        where: { id: otp.id },
        data: { verified: true },
      });

      return { success: true, otpId: otp.id };
    }),

  // Register with email
  registerWithEmail: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(6),
      name: z.string().min(1),
      otpId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { email, password, name, otpId } = input;

      // Check if email exists
      const existingUser = await ctx.db.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Email already registered",
        });
      }

      // Verify OTP
      const otp = await ctx.db.oTP.findUnique({
        where: { id: otpId },
      });

      if (!otp || !otp.verified || otp.identifier !== email) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Please verify your email first",
        });
      }

      const hashedPassword = await hashPassword(password);

      // Create user with wallet
      const user = await ctx.db.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          emailVerified: new Date(),
          image: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=7847eb&color=fff`,
          isCreator: true, // Default to creator
          activeRole: UserRole.CREATOR,
          wallet: {
            create: {},
          },
        },
      });

      // Clean up OTP
      await ctx.db.oTP.delete({ where: { id: otpId } });

      return { success: true, userId: user.id };
    }),

  // Register with phone
  registerWithPhone: publicProcedure
    .input(z.object({
      phone: z.string().min(7),
      countryCode: z.string().min(1).max(4),
      name: z.string().min(1),
      otpId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { phone, countryCode, name, otpId } = input;

      const existingUser = await ctx.db.user.findUnique({
        where: { phone },
      });

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Phone number already registered",
        });
      }

      const otp = await ctx.db.oTP.findUnique({
        where: { id: otpId },
      });

      if (!otp || !otp.verified || otp.identifier !== phone) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Please verify your phone number first",
        });
      }

      const user = await ctx.db.user.create({
        data: {
          phone,
          countryCode,
          name,
          phoneVerified: new Date(),
          image: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=7847eb&color=fff`,
          isCreator: true,
          activeRole: UserRole.CREATOR,
          wallet: {
            create: {},
          },
        },
      });

      await ctx.db.oTP.delete({ where: { id: otpId } });

      return { success: true, userId: user.id };
    }),

  // Switch role (Brand <-> Creator)
  switchRole: protectedProcedure
    .input(z.object({
      role: z.nativeEnum(UserRole),
    }))
    .mutation(async ({ ctx, input }) => {
      const { role } = input;
      const userId = ctx.session.user.id;

      const updateData: any = { activeRole: role };

      // Enable the role if switching to it
      if (role === UserRole.BRAND) {
        updateData.isBrand = true;
      } else {
        updateData.isCreator = true;
      }

      const user = await ctx.db.user.update({
        where: { id: userId },
        data: updateData,
      });

      // Create brand profile if switching to brand for the first time
      if (role === UserRole.BRAND) {
        const existingProfile = await ctx.db.brandProfile.findUnique({
          where: { userId },
        });

        if (!existingProfile) {
          await ctx.db.brandProfile.create({
            data: { userId },
          });
        }
      }

      // Create creator profile if switching to creator for the first time
      if (role === UserRole.CREATOR) {
        const existingProfile = await ctx.db.creatorProfile.findUnique({
          where: { userId },
        });

        if (!existingProfile) {
          await ctx.db.creatorProfile.create({
            data: { userId },
          });
        }
      }

      return { success: true, activeRole: role };
    }),

  // Complete onboarding
  completeOnboarding: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      username: z.string().min(3).max(30),
      role: z.nativeEnum(UserRole),
      // Brand fields
      companyName: z.string().optional(),
      industry: z.string().optional(),
      // Creator fields
      bio: z.string().optional(),
      instagramHandle: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { name, username, role, companyName, industry, bio, instagramHandle } = input;

      // Check username availability
      const existingUsername = await ctx.db.user.findUnique({
        where: { username: username.toLowerCase() },
      });

      if (existingUsername && existingUsername.id !== userId) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Username is already taken",
        });
      }

      // Update user
      await ctx.db.user.update({
        where: { id: userId },
        data: {
          name,
          username: username.toLowerCase(),
          activeRole: role,
          isBrand: role === UserRole.BRAND,
          isCreator: role === UserRole.CREATOR,
          isOnboarded: true,
        },
      });

      // Create/update profile based on role
      if (role === UserRole.BRAND) {
        await ctx.db.brandProfile.upsert({
          where: { userId },
          create: {
            userId,
            companyName,
            industry,
          },
          update: {
            companyName,
            industry,
          },
        });
      } else {
        await ctx.db.creatorProfile.upsert({
          where: { userId },
          create: {
            userId,
            bio,
            instagramHandle,
          },
          update: {
            bio,
            instagramHandle,
          },
        });
      }

      return { success: true };
    }),
});
