import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { db } from "./db";
import bcrypt from "bcryptjs";

const isLocalhost = process.env.NODE_ENV === 'development';

const getCookieConfig = () => {
  if (isLocalhost) {
    return {
      httpOnly: true,
      sameSite: 'lax' as const,
      path: '/',
      secure: false,
    };
  }

  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    secure: true,
  };
};

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      id: "email-password",
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) {
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          isAdmin: user.isAdmin,
          isOnboarded: user.isOnboarded,
        };
      },
    }),
    CredentialsProvider({
      id: "email-otp",
      name: "Email OTP",
      credentials: {
        email: { label: "Email", type: "email" },
        otpId: { label: "OTP ID", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.otpId) {
          return null;
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          isAdmin: user.isAdmin,
          isOnboarded: user.isOnboarded,
        };
      },
    }),
    CredentialsProvider({
      id: "phone-otp",
      name: "Phone OTP",
      credentials: {
        phone: { label: "Phone", type: "text" },
        countryCode: { label: "Country Code", type: "text" },
        otpId: { label: "OTP ID", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.phone || !credentials?.otpId) {
          return null;
        }

        const user = await db.user.findUnique({
          where: { phone: credentials.phone },
        });

        if (!user) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          isAdmin: user.isAdmin,
          isOnboarded: user.isOnboarded,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  cookies: {
    sessionToken: {
      name: `viral-payouts.session-token`,
      options: getCookieConfig(),
    },
    callbackUrl: {
      name: `viral-payouts.callback-url`,
      options: {
        ...getCookieConfig(),
        httpOnly: false,
      },
    },
    csrfToken: {
      name: `viral-payouts.csrf-token`,
      options: getCookieConfig(),
    },
  },
  useSecureCookies: false,
  pages: {
    signIn: "/login",
    newUser: "/onboarding",
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.userId = user.id;
      }

      if (trigger === "signIn" || trigger === "update" || user) {
        const userId = token.userId as string;
        if (userId) {
          const dbUser = await db.user.findUnique({
            where: { id: userId },
            select: {
              id: true,
              email: true,
              name: true,
              image: true,
              role: true,
              isAdmin: true,
              isOnboarded: true,
            },
          });

          if (dbUser) {
            token.userId = dbUser.id;
            token.email = dbUser.email;
            token.name = dbUser.name;
            token.picture = dbUser.image;
            token.role = dbUser.role;
            token.isAdmin = dbUser.isAdmin;
            token.isOnboarded = dbUser.isOnboarded;
          }
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token && token.userId) {
        session.user.id = token.userId as string;
        session.user.role = token.role!;
        session.user.isAdmin = token.isAdmin!;
        session.user.isOnboarded = token.isOnboarded!;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }

      try {
        const urlObj = new URL(url);
        if (urlObj.origin === baseUrl) {
          return url;
        }
      } catch (e) {
        return baseUrl;
      }

      return baseUrl;
    },
  },
};
