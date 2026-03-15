import { z } from 'zod';
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from '@/server/api/trpc';
import { TRPCError } from '@trpc/server';
import bcrypt from 'bcryptjs';
import { OTPType, UserRole, WalletType } from '@prisma/client';
import {
  sendOTPEmail,
  sendPhoneOTPVerify,
  verifyPhoneOTP,
} from '@/lib/otp-service';

function generateOTP(): string {
  if (process.env.NODE_ENV === 'development') {
    return '123456';
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
    .input(
      z.object({
        email: z.string().email(),
        type: z.nativeEnum(OTPType).default(OTPType.EMAIL_VERIFICATION),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { email, type } = input;

      if (type === OTPType.LOGIN || type === OTPType.PASSWORD_RESET) {
        const existingUser = await ctx.db.user.findUnique({
          where: { email },
        });

        if (!existingUser) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'No account found with this email address',
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

      // Deliver OTP via email (Resend or Firebase extension)
      try {
        await sendOTPEmail(email, code);
      } catch (deliveryError) {
        // Clean up the OTP record if delivery fails — don't leave a dangling code
        await ctx.db.oTP.delete({ where: { id: otp.id } });
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to send verification email. Please try again.',
        });
      }

      return { success: true, otpId: otp.id };
    }),

  sendPhoneOTP: publicProcedure
    .input(
      z.object({
        phone: z.string().min(7),
        countryCode: z.string().min(1).max(4),
        type: z.nativeEnum(OTPType).default(OTPType.PHONE_VERIFICATION),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { phone, countryCode, type } = input;

      if (type === OTPType.LOGIN || type === OTPType.PASSWORD_RESET) {
        const existingUser = await ctx.db.user.findUnique({
          where: { phone },
        });

        if (!existingUser) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'No account found with this phone number',
          });
        }
      }

      try {
        const result = await sendPhoneOTPVerify(phone, countryCode);
        return { success: true, verificationSid: result.sid };
      } catch (deliveryError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to send OTP. Please try again.',
        });
      }
    }),

  verifyOTPCode: publicProcedure
    .input(
      z.object({
        identifier: z.string(),
        code: z.string(),
        type: z.nativeEnum(OTPType),
        countryCode: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { identifier, code, type, countryCode } = input;

      if (type === OTPType.PHONE_VERIFICATION || type === OTPType.LOGIN) {
        const phone = identifier;
        const codeVal = countryCode || '91';

        const isValid = await verifyPhoneOTP(phone, codeVal, code);

        if (!isValid) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid OTP',
          });
        }

        return { success: true, verified: true };
      }

      const otp = await ctx.db.oTP.findFirst({
        where: {
          identifier,
          type,
          verified: false,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!otp) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid or expired OTP',
        });
      }

      if (otp.attempts >= 3) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: 'Too many attempts. Please request a new OTP',
        });
      }

      if (otp.code !== code) {
        await ctx.db.oTP.update({
          where: { id: otp.id },
          data: { attempts: otp.attempts + 1 },
        });

        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid OTP',
        });
      }

      await ctx.db.oTP.update({
        where: { id: otp.id },
        data: { verified: true },
      });

      return { success: true, otpId: otp.id };
    }),

  register: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        phone: z.string().min(7),
        countryCode: z.string().min(1).max(4),
        password: z.string().min(6),
        name: z.string().min(1),
        emailOtpId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { email, phone, countryCode, password, name, emailOtpId } = input;

      const existingEmail = await ctx.db.user.findUnique({
        where: { email },
      });

      if (existingEmail) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Email already registered',
        });
      }

      const existingPhone = await ctx.db.user.findUnique({
        where: { phone },
      });

      if (existingPhone) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Phone number already registered',
        });
      }

      const emailOtp = await ctx.db.oTP.findUnique({
        where: { id: emailOtpId },
      });

      if (!emailOtp || !emailOtp.verified || emailOtp.identifier !== email) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Please verify your email first',
        });
      }

      const hashedPassword = await hashPassword(password);

      const user = await ctx.db.user.create({
        data: {
          email,
          phone,
          countryCode,
          password: hashedPassword,
          name,
          emailVerified: new Date(),
          phoneVerified: new Date(),
          image: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=7847eb&color=fff`,
        },
      });

      await ctx.db.oTP.delete({ where: { id: emailOtpId } });

      return { success: true, userId: user.id };
    }),

  forgotPassword: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { email } = input;

      const existingUser = await ctx.db.user.findUnique({
        where: { email },
      });

      if (!existingUser) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No account found with this email address',
        });
      }

      const code = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await ctx.db.oTP.deleteMany({
        where: { identifier: email, type: OTPType.PASSWORD_RESET },
      });

      const otp = await ctx.db.oTP.create({
        data: {
          identifier: email,
          code,
          type: OTPType.PASSWORD_RESET,
          expiresAt,
        },
      });

      try {
        await sendOTPEmail(email, code);
      } catch (deliveryError) {
        await ctx.db.oTP.delete({ where: { id: otp.id } });
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to send verification email. Please try again.',
        });
      }

      return { success: true, otpId: otp.id };
    }),

  resetPassword: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        code: z.string(),
        newPassword: z.string().min(6),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { email, code, newPassword } = input;

      const otp = await ctx.db.oTP.findFirst({
        where: {
          identifier: email,
          type: OTPType.PASSWORD_RESET,
          verified: false,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!otp) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid or expired OTP',
        });
      }

      if (otp.attempts >= 3) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: 'Too many attempts. Please request a new OTP',
        });
      }

      if (otp.code !== code) {
        await ctx.db.oTP.update({
          where: { id: otp.id },
          data: { attempts: otp.attempts + 1 },
        });

        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid OTP',
        });
      }

      const user = await ctx.db.user.findUnique({
        where: { email },
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      const hashedPassword = await hashPassword(newPassword);

      await ctx.db.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });

      await ctx.db.oTP.delete({ where: { id: otp.id } });

      return { success: true };
    }),

  completeOnboarding: protectedProcedure
    .input(
      z.object({
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
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const role = ctx.session.user.role;
      const { name, username, ...profileData } = input;

      const existingUsername = await ctx.db.user.findUnique({
        where: { username: username.toLowerCase() },
      });

      if (existingUsername && existingUsername.id !== userId) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Username is already taken',
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
    .input(
      z.object({
        role: z.nativeEnum(UserRole),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Update user role
      await ctx.db.user.update({
        where: { id: userId },
        data: { role: input.role },
      });

      // Create appropriate wallet if not exists
      const walletType =
        input.role === UserRole.BRAND ? WalletType.BRAND : WalletType.CREATOR;
      await ctx.db.wallet.upsert({
        where: { userId },
        create: { userId, type: walletType },
        update: { type: walletType },
      });

      return { success: true };
    }),
});
