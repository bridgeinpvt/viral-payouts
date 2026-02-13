import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { getDashboardPath } from "@/lib/rbac";

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
    pathname.startsWith("/choose-role") ||
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

  // Use centralized logic for path determination
  const user = {
    role: token.role as string | undefined,
    isAdmin: token.isAdmin as boolean | undefined,
    isOnboarded: token.isOnboarded as boolean | undefined,
  };

  // 1. Admin Handling
  if (user.isAdmin) {
    // Admins only access /admin/* or generic public routes
    if (pathname.startsWith("/admin")) {
      // Root admin should go to dashboard
      if (pathname === "/admin") {
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      }
      return NextResponse.next();
    }

    // If admin is on root or any other role path, redirect to admin dashboard
    if (pathname === "/" || pathname.startsWith("/brand") || pathname.startsWith("/creator")) {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
  }

  // 2. Brand/Creator Handling
  // If user is trying to access a role-specific path, check if they are authorized
  if (pathname.startsWith("/brand")) {
    if (user.role !== "BRAND") {
      // Redirect to their correct dashboard
      const correctPath = getDashboardPath(user);
      return NextResponse.redirect(new URL(correctPath, request.url));
    }
    // Check onboarding
    if (!user.isOnboarded && !pathname.startsWith("/brand/onboarding")) {
      return NextResponse.redirect(new URL("/brand/onboarding", request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/creator")) {
    if (user.role !== "CREATOR") {
      const correctPath = getDashboardPath(user);
      return NextResponse.redirect(new URL(correctPath, request.url));
    }
    // Check onboarding
    if (!user.isOnboarded && !pathname.startsWith("/creator/onboarding")) {
      return NextResponse.redirect(new URL("/creator/onboarding", request.url));
    }
    return NextResponse.next();
  }

  // 3. Root Path / Onboarding / Choose Role - let getDashboardPath handle it
  if (pathname === "/" || pathname === "/onboarding" || (pathname === "/choose-role" && user.role)) {
    const targetPath = getDashboardPath(user);
    if (targetPath !== pathname) {
      return NextResponse.redirect(new URL(targetPath, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
