import { type Session } from "next-auth";
import { type JWT } from "next-auth/jwt";

export type UserLike = {
  role?: string | null;
  isAdmin?: boolean | null;
  isOnboarded?: boolean | null;
};

export function isBrandUser(user: UserLike | null): boolean {
  return user?.role === "BRAND";
}

export function isCreatorUser(user: UserLike | null): boolean {
  return user?.role === "CREATOR";
}

export function isAdminUser(user: UserLike | null): boolean {
  return user?.isAdmin === true;
}

export function isOnboarded(user: UserLike | null): boolean {
  return user?.isOnboarded === true;
}

/**
 * varying user objects (Session['user'] or JWT token)
 */
export function getDashboardPath(user: UserLike | null): string {
  if (!user) return "/login";

  // Admin always goes to admin dashboard
  if (user.isAdmin) {
    return "/admin/dashboard";
  }

  // Check onboarding status
  if (!user.isOnboarded) {
    // If role is selected, go to role specific onboarding
    if (user.role === "BRAND") return "/brand/onboarding";
    if (user.role === "CREATOR") return "/creator/onboarding";

    // If no role, go to role selection
    return "/choose-role";
  }

  // Dashboard based on role
  if (user.role === "BRAND") return "/brand/dashboard";
  if (user.role === "CREATOR") return "/creator/dashboard";

  // Fallback (should ideally not happen for authenticated users)
  return "/choose-role";
}
