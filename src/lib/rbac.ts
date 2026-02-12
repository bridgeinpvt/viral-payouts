import { type Session } from "next-auth";

export function isBrandUser(session: Session | null): boolean {
  return session?.user?.role === "BRAND";
}

export function isCreatorUser(session: Session | null): boolean {
  return session?.user?.role === "CREATOR";
}

export function isAdminUser(session: Session | null): boolean {
  return session?.user?.isAdmin === true;
}

export function isOnboarded(session: Session | null): boolean {
  return session?.user?.isOnboarded === true;
}

export function getDashboardPath(session: Session | null): string {
  if (!session?.user) return "/login";
  if (!session.user.isOnboarded) {
    return session.user.role === "BRAND" ? "/brand/onboarding" : "/creator/onboarding";
  }
  return session.user.role === "BRAND" ? "/brand/dashboard" : "/creator/dashboard";
}
