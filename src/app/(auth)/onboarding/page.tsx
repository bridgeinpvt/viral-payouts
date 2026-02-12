"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function OnboardingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated" && session?.user) {
      const role = session.user.role;
      if (session.user.isOnboarded) {
        router.push(role === "BRAND" ? "/brand/dashboard" : "/creator/dashboard");
      } else {
        router.push(role === "BRAND" ? "/brand/onboarding" : "/creator/onboarding");
      }
    }
  }, [status, session, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-muted-foreground">Redirecting...</p>
      </div>
    </div>
  );
}
