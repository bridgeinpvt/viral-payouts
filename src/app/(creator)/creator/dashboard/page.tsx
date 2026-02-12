"use client";

import { trpc } from "@/trpc/client";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

const TIER_ORDER = ["BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND"] as const;

const TIER_THRESHOLDS: Record<string, number> = {
  BRONZE: 0,
  SILVER: 10_000,
  GOLD: 50_000,
  PLATINUM: 200_000,
  DIAMOND: 500_000,
};

const TIER_COLORS: Record<string, string> = {
  BRONZE: "bg-orange-700 text-white",
  SILVER: "bg-gray-400 text-white",
  GOLD: "bg-yellow-500 text-white",
  PLATINUM: "bg-cyan-600 text-white",
  DIAMOND: "bg-violet-600 text-white",
};

function formatCurrency(amount: number): string {
  return `\u20B9${amount.toLocaleString("en-IN")}`;
}

function getTierProgress(currentTier: string, totalEarnings: number): number {
  const currentIndex = TIER_ORDER.indexOf(currentTier as (typeof TIER_ORDER)[number]);
  if (currentIndex === TIER_ORDER.length - 1) return 100;

  const nextTier = TIER_ORDER[currentIndex + 1];
  const currentThreshold = TIER_THRESHOLDS[currentTier] ?? 0;
  const nextThreshold = TIER_THRESHOLDS[nextTier] ?? 0;

  const progress =
    ((totalEarnings - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
  return Math.min(Math.max(progress, 0), 100);
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default function CreatorDashboardPage() {
  const analyticsQuery = trpc.analytics.getCreatorAnalytics.useQuery();
  const participationsQuery = trpc.campaign.getMyParticipations.useQuery();

  const isLoading = analyticsQuery.isLoading || participationsQuery.isLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Creator Dashboard</h1>
        <DashboardSkeleton />
      </div>
    );
  }

  const analytics = analyticsQuery.data;
  const participations = participationsQuery.data;

  if (!analytics) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Creator Dashboard</h1>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Unable to load dashboard data. Please try again later.
          </CardContent>
        </Card>
      </div>
    );
  }

  const { summary, tier, tierProgress } = analytics;
  const progressPercent = getTierProgress(
    tierProgress.currentTier,
    tierProgress.totalEarnings
  );
  const currentTierIndex = TIER_ORDER.indexOf(tier as (typeof TIER_ORDER)[number]);
  const nextTier =
    currentTierIndex < TIER_ORDER.length - 1
      ? TIER_ORDER[currentTierIndex + 1]
      : null;
  const nextThreshold = nextTier ? TIER_THRESHOLDS[nextTier] : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Creator Dashboard</h1>
        <Badge className={TIER_COLORS[tier] ?? ""}>
          {tier}
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Earned</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(summary.totalEarned)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending Earnings</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCurrency(summary.pendingEarnings)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Available Balance</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCurrency(summary.availableBalance)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Campaigns</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{summary.activeCampaigns}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tier Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tier Progress</CardTitle>
          <CardDescription>
            {nextTier
              ? `${formatCurrency(tierProgress.totalEarnings)} / ${formatCurrency(nextThreshold!)} to reach ${nextTier}`
              : "You have reached the highest tier!"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Progress value={progressPercent} className="h-3" />
          <div className="flex justify-between text-xs text-muted-foreground">
            {TIER_ORDER.map((t) => (
              <span
                key={t}
                className={
                  t === tier ? "font-semibold text-foreground" : ""
                }
              >
                {t}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Campaigns */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Campaigns</CardTitle>
          <CardDescription>Your latest campaign participations</CardDescription>
        </CardHeader>
        <CardContent>
          {!participations || participations.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              You have not joined any campaigns yet. Browse the marketplace to get
              started.
            </p>
          ) : (
            <div className="space-y-3">
              {participations.slice(0, 5).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{p.campaign.name}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>
                        {p.campaign.brand?.brandProfile?.companyName ??
                          p.campaign.brand?.name ??
                          "Unknown Brand"}
                      </span>
                      <span>-</span>
                      <Badge variant="outline" className="text-xs">
                        {p.campaign.type}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        p.status === "ACTIVE"
                          ? "default"
                          : p.status === "COMPLETED"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {p.status}
                    </Badge>
                    <Link href={`/creator/my-campaigns/${p.campaignId}`}>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
        {participations && participations.length > 5 && (
          <CardFooter>
            <Link href="/creator/my-campaigns">
              <Button variant="link" className="px-0">
                View all campaigns
              </Button>
            </Link>
          </CardFooter>
        )}
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link href="/creator/marketplace">
          <Card className="cursor-pointer transition-colors hover:bg-accent">
            <CardHeader>
              <CardTitle className="text-base">Browse Marketplace</CardTitle>
              <CardDescription>
                Discover new campaigns to join and earn
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/creator/my-campaigns">
          <Card className="cursor-pointer transition-colors hover:bg-accent">
            <CardHeader>
              <CardTitle className="text-base">My Campaigns</CardTitle>
              <CardDescription>
                Manage your active campaign participations
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/creator/wallet">
          <Card className="cursor-pointer transition-colors hover:bg-accent">
            <CardHeader>
              <CardTitle className="text-base">Wallet</CardTitle>
              <CardDescription>
                View balance and request payouts
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
