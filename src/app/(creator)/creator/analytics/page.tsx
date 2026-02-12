"use client";

import { trpc } from "@/trpc/client";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const TIER_THRESHOLDS: Record<string, number> = {
  BRONZE: 0,
  SILVER: 10_000,
  GOLD: 50_000,
  PLATINUM: 200_000,
  DIAMOND: 500_000,
};

const TIER_ORDER = ["BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND"] as const;

function formatCurrency(amount: number): string {
  return `\u20B9${amount.toLocaleString("en-IN")}`;
}

function getTierProgressPercent(
  currentTier: string,
  totalEarnings: number
): number {
  const currentIndex = TIER_ORDER.indexOf(
    currentTier as (typeof TIER_ORDER)[number]
  );
  if (currentIndex === TIER_ORDER.length - 1) return 100;

  const nextTier = TIER_ORDER[currentIndex + 1];
  if (!nextTier) return 100;

  const currentThreshold = TIER_THRESHOLDS[currentTier] ?? 0;
  const nextThreshold = TIER_THRESHOLDS[nextTier] ?? 0;
  const range = nextThreshold - currentThreshold;
  if (range <= 0) return 100;

  const progress = ((totalEarnings - currentThreshold) / range) * 100;
  return Math.min(Math.max(progress, 0), 100);
}

function getNextTier(currentTier: string): string | null {
  const currentIndex = TIER_ORDER.indexOf(
    currentTier as (typeof TIER_ORDER)[number]
  );
  if (currentIndex === -1 || currentIndex === TIER_ORDER.length - 1)
    return null;
  return TIER_ORDER[currentIndex + 1] ?? null;
}

function getTierColor(tier: string): string {
  switch (tier) {
    case "BRONZE":
      return "bg-amber-700 text-white";
    case "SILVER":
      return "bg-gray-400 text-white";
    case "GOLD":
      return "bg-yellow-500 text-white";
    case "PLATINUM":
      return "bg-cyan-600 text-white";
    case "DIAMOND":
      return "bg-purple-600 text-white";
    default:
      return "bg-gray-500 text-white";
  }
}

function KPISkeletons() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {Array.from({ length: 5 }).map((_, i) => (
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
  );
}

function TableSkeletons({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: cols }).map((_, j) => (
            <TableCell key={j}>
              <Skeleton className="h-4 w-20" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

export default function CreatorAnalyticsPage() {
  const { data, isLoading } = trpc.analytics.getCreatorAnalytics.useQuery();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Creator Analytics</h1>
        <p className="text-muted-foreground mt-1">
          Track your performance, earnings, and campaign metrics.
        </p>
      </div>

      {/* KPI Cards */}
      {isLoading ? (
        <KPISkeletons />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Earned</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {formatCurrency(data?.summary.totalEarned ?? 0)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Paid</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {formatCurrency(data?.summary.totalPaid ?? 0)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pending</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-yellow-600">
                {formatCurrency(data?.summary.pendingEarnings ?? 0)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active Campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {data?.summary.activeCampaigns ?? 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Completed Campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {data?.summary.completedCampaigns ?? 0}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tier Progress */}
      {isLoading ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-48" />
          </CardContent>
        </Card>
      ) : data?.tierProgress ? (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <CardTitle>Tier Progress</CardTitle>
              <Badge className={getTierColor(data.tier)}>{data.tier}</Badge>
            </div>
            <CardDescription>
              Your current tier is based on total earnings and campaign
              participation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress
              value={getTierProgressPercent(
                data.tier,
                data.tierProgress.totalEarnings
              )}
            />
            <div className="text-muted-foreground flex justify-between text-sm">
              <span>
                {formatCurrency(data.tierProgress.totalEarnings)} earned
              </span>
              {getNextTier(data.tier) ? (
                <span>
                  Next tier ({getNextTier(data.tier)}):{" "}
                  {formatCurrency(
                    TIER_THRESHOLDS[getNextTier(data.tier)!] ?? 0
                  )}
                </span>
              ) : (
                <span>Maximum tier reached</span>
              )}
            </div>
            <p className="text-muted-foreground text-sm">
              {data.tierProgress.totalCampaigns} campaign
              {data.tierProgress.totalCampaigns !== 1 ? "s" : ""} completed
            </p>
          </CardContent>
        </Card>
      ) : null}

      {/* Campaign-wise Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Breakdown</CardTitle>
          <CardDescription>
            Performance metrics for each campaign you participated in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Views</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
                <TableHead className="text-right">Conversions</TableHead>
                <TableHead className="text-right">Earned</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableSkeletons rows={5} cols={6} />
              ) : data?.metrics && data.metrics.length > 0 ? (
                data.metrics.map((metric) => (
                  <TableRow key={metric.campaignId}>
                    <TableCell className="font-medium">
                      {metric.campaign.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{metric.campaign.type}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {metric.verifiedViews.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="text-right">
                      {metric.verifiedClicks.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="text-right">
                      {metric.verifiedConversions.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(metric.earnedAmount)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-muted-foreground text-center"
                  >
                    No campaign data available yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Earnings Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Earnings</CardTitle>
          <CardDescription>
            Your latest transactions and earnings activity.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-5 w-20" />
                </div>
              ))}
            </div>
          ) : data?.recentTransactions &&
            data.recentTransactions.length > 0 ? (
            <div className="space-y-4">
              {data.recentTransactions.map((tx, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="text-sm font-medium">{tx.description}</p>
                    <p className="text-muted-foreground text-xs">
                      {new Date(tx.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-semibold ${
                      tx.amount >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {tx.amount >= 0 ? "+" : ""}
                    {formatCurrency(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center text-sm">
              No recent transactions.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
