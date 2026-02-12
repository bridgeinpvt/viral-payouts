"use client";

import { useSession } from "next-auth/react";
import { BrandDashboard } from "@/components/dashboard/BrandDashboard";
import { CreatorDashboard } from "@/components/dashboard/CreatorDashboard";

export default function DashboardPage() {
  const { data: session } = useSession();
  const activeRole = (session?.user as any)?.activeRole || "CREATOR";

  return activeRole === "BRAND" ? <BrandDashboard /> : <CreatorDashboard />;
}
