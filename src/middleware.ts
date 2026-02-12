import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: "viral-payouts.session-token",
  });

  const { pathname } = request.nextUrl;

  // Public routes - no auth required
  if (
    pathname === "/" ||
    pathname === "/marketplace" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  // Not authenticated - redirect to login
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = token.role as string;
  const isAdmin = token.isAdmin as boolean;
  const isOnboarded = token.isOnboarded as boolean;

  // Brand routes
  if (pathname.startsWith("/brand")) {
    if (role !== "BRAND") {
      const redirect = role === "CREATOR" ? "/creator/dashboard" : "/login";
      return NextResponse.redirect(new URL(redirect, request.url));
    }
    // Allow onboarding page even if not onboarded
    if (!isOnboarded && !pathname.startsWith("/brand/onboarding")) {
      return NextResponse.redirect(new URL("/brand/onboarding", request.url));
    }
    return NextResponse.next();
  }

  // Creator routes
  if (pathname.startsWith("/creator")) {
    if (role !== "CREATOR") {
      const redirect = role === "BRAND" ? "/brand/dashboard" : "/login";
      return NextResponse.redirect(new URL(redirect, request.url));
    }
    if (!isOnboarded && !pathname.startsWith("/creator/onboarding")) {
      return NextResponse.redirect(new URL("/creator/onboarding", request.url));
    }
    return NextResponse.next();
  }

  // Admin routes
  if (pathname.startsWith("/admin")) {
    if (!isAdmin) {
      const redirect = role === "BRAND" ? "/brand/dashboard" : "/creator/dashboard";
      return NextResponse.redirect(new URL(redirect, request.url));
    }
    return NextResponse.next();
  }

  // Onboarding route (legacy /onboarding)
  if (pathname === "/onboarding") {
    const redirect = role === "BRAND" ? "/brand/onboarding" : "/creator/onboarding";
    return NextResponse.redirect(new URL(redirect, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
