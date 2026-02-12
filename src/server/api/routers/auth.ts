import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { OTPType, UserRole, WalletType } from "@prisma/client";

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

  sendEmailOTP: publicProcedure
    .input(z.object({
      email: z.string().email(),
      type: z.nativeEnum(OTPType).default(OTPType.EMAIL_VERIFICATION),
    }))
    .mutation(async ({ ctx, input }) => {
      const { email, type } = input;

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

      await ctx.db.oTP.deleteMany({
        where: { identifier: email, type },
      });

      const otp = await ctx.db.oTP.create({
        data: { identifier: email, code, type, expiresAt },
      });

      if (process.env.NODE_ENV === "development") {
        console.log(`OTP for ${email}: ${code}`);
      }

      return { success: true, otpId: otp.id };
    }),

  sendPhoneOTP: publicProcedure
    .input(z.object({
      phone: z.string().min(7),
      countryCode: z.string().min(1).max(4),
      type: z.nativeEnum(OTPType).default(OTPType.PHONE_VERIFICATION),
    }))
    .mutation(async ({ ctx, input }) => {
      const { phone, countryCode, type } = input;

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

      await ctx.db.oTP.deleteMany({
        where: { identifier: phone, type },
      });

      const otp = await ctx.db.oTP.create({
        data: { identifier: phone, code, type, expiresAt },
      });

      if (process.env.NODE_ENV === "development") {
        console.log(`OTP for +${countryCode} ${phone}: ${code}`);
      }

      return { success: true, otpId: otp.id };
    }),

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

  registerWithEmail: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(6),
      name: z.string().min(1),
      role: z.nativeEnum(UserRole),
      otpId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { email, password, name, role, otpId } = input;

      const existingUser = await ctx.db.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Email already registered",
        });
      }

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

      const walletType = role === UserRole.BRAND ? WalletType.BRAND : WalletType.CREATOR;

      const user = await ctx.db.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          emailVerified: new Date(),
          image: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=7847eb&color=fff`,
          role,
          wallet: {
            create: { type: walletType },
          },
        },
      });

      await ctx.db.oTP.delete({ where: { id: otpId } });

      return { success: true, userId: user.id };
    }),

  registerWithPhone: publicProcedure
    .input(z.object({
      phone: z.string().min(7),
      countryCode: z.string().min(1).max(4),
      name: z.string().min(1),
      role: z.nativeEnum(UserRole),
      otpId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { phone, countryCode, name, role, otpId } = input;

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

      const walletType = role === UserRole.BRAND ? WalletType.BRAND : WalletType.CREATOR;

      const user = await ctx.db.user.create({
        data: {
          phone,
          countryCode,
          name,
          phoneVerified: new Date(),
          image: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=7847eb&color=fff`,
          role,
          wallet: {
            create: { type: walletType },
          },
        },
      });

      await ctx.db.oTP.delete({ where: { id: otpId } });

      return { success: true, userId: user.id };
    }),

  completeOnboarding: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      username: z.string().min(3).max(30),
      // Brand fields
      companyName: z.string().optional(),
      website: z.string().optional(),
      industry: z.string().optional(),
      gstin: z.string().optional(),
      contactPerson: z.string().optional(),
      // Creator fields
      displayName: z.string().optional(),
      bio: z.string().optional(),
      niche: z.string().optional(),
      language: z.string().optional(),
      location: z.string().optional(),
      instagramHandle: z.string().optional(),
      youtubeHandle: z.string().optional(),
      upiId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const role = ctx.session.user.role;
      const { name, username, ...profileData } = input;

      const existingUsername = await ctx.db.user.findUnique({
        where: { username: username.toLowerCase() },
      });

      if (existingUsername && existingUsername.id !== userId) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Username is already taken",
        });
      }

      await ctx.db.user.update({
        where: { id: userId },
        data: {
          name,
          username: username.toLowerCase(),
          isOnboarded: true,
        },
      });

      if (role === UserRole.BRAND) {
        await ctx.db.brandProfile.upsert({
          where: { userId },
          create: {
            userId,
            companyName: profileData.companyName,
            website: profileData.website,
            industry: profileData.industry,
            gstin: profileData.gstin,
            contactPerson: profileData.contactPerson,
          },
          update: {
            companyName: profileData.companyName,
            website: profileData.website,
            industry: profileData.industry,
            gstin: profileData.gstin,
            contactPerson: profileData.contactPerson,
          },
        });
      } else {
        await ctx.db.creatorProfile.upsert({
          where: { userId },
          create: {
            userId,
            displayName: profileData.displayName,
            bio: profileData.bio,
            niche: profileData.niche,
            language: profileData.language,
            location: profileData.location,
            instagramHandle: profileData.instagramHandle,
            youtubeHandle: profileData.youtubeHandle,
            upiId: profileData.upiId,
          },
          update: {
            displayName: profileData.displayName,
            bio: profileData.bio,
            niche: profileData.niche,
            language: profileData.language,
            location: profileData.location,
            instagramHandle: profileData.instagramHandle,
            youtubeHandle: profileData.youtubeHandle,
            upiId: profileData.upiId,
          },
        });
      }

      return { success: true };
    }),

  setUserRole: protectedProcedure
    .input(z.object({
      role: z.nativeEnum(UserRole),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Update user role
      await ctx.db.user.update({
        where: { id: userId },
        data: { role: input.role },
      });

      // Create appropriate wallet if not exists
      const walletType = input.role === UserRole.BRAND ? WalletType.BRAND : WalletType.CREATOR;
      await ctx.db.wallet.upsert({
        where: { userId },
        create: { userId, type: walletType },
        update: { type: walletType },
      });

      return { success: true };
    }),
});
