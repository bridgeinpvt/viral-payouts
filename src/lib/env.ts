export const env = {
  NODE_ENV: process.env.NODE_ENV as "development" | "production" | "test",
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET!,
  DATABASE_URL: process.env.DATABASE_URL!,

  // Google OAuth
  GOOGLE_CLIENT_ID: process.env.AUTH_GOOGLE_ID || "",
  GOOGLE_CLIENT_SECRET: process.env.AUTH_GOOGLE_SECRET || "",

  // App URL
  APP_URL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:4001",
} as const;
