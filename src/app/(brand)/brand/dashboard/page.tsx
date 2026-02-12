"use client";

import Link from "next/link";
import { trpc } from "@/trpc/client";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import {
  DollarSign,
  Megaphone,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Crown,
  ArrowRight,
  Plus,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("en-IN");
}

function statusVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  switch (status?.toUpperCase()) {
    case "ACTIVE":
    case "LIVE":
      return "default";
    case "PAUSED":
      return "secondary";
    case "DRAFT":
      return "outline";
    case "COMPLETED":
    case "ENDED":
      return "secondary";
    case "CANCELLED":
      return "destructive";
    default:
      return "outline";
  }
}

// ---------------------------------------------------------------------------
// Skeleton loaders
// ---------------------------------------------------------------------------

function KpiSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-5 rounded" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-32 mb-1" />
        <Skeleton className="h-3 w-20" />
      </CardContent>
    </Card>
  );
}

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// KPI Cards
// ---------------------------------------------------------------------------

function KpiCards({
  summary,
  isLoading,
}: {
  summary:
    | {
        totalCampaigns: number;
        liveCampaigns: number;
        totalBudget: number;
        totalSpent: number;
        totalViews: number;
        totalClicks: number;
        totalConversions: number;
        roi: string | number;
      }
    | undefined;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiSkeleton />
        <KpiSkeleton />
        <KpiSkeleton />
        <KpiSkeleton />
      </div>
    );
  }

  const kpis = [
    {
      label: "Total Spend",
      value: formatCurrency(summary?.totalSpent ?? 0),
      description: `of ${formatCurrency(summary?.totalBudget ?? 0)} budget`,
      icon: DollarSign,
    },
    {
      label: "Active Campaigns",
      value: formatNumber(summary?.liveCampaigns ?? 0),
      description: `${formatNumber(summary?.totalCampaigns ?? 0)} total campaigns`,
      icon: Megaphone,
    },
    {
      label: "Total Conversions",
      value: formatNumber(summary?.totalConversions ?? 0),
      description: `${formatNumber(summary?.totalClicks ?? 0)} clicks · ${formatNumber(summary?.totalViews ?? 0)} views`,
      icon: BarChart3,
    },
    {
      label: "ROI",
      value: `${(Number(summary?.roi ?? 0) * 100).toFixed(1)}%`,
      description: "Return on investment",
      icon: TrendingUp,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi) => (
        <Card key={kpi.label}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{kpi.label}</CardTitle>
            <kpi.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpi.value}</div>
            <p className="text-xs text-muted-foreground">{kpi.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Campaign Status Widget
// ---------------------------------------------------------------------------

interface CampaignRow {
  id: string;
  name: string;
  type: string;
  status: string;
  totalBudget: number;
  spentBudget: number;
  totalViews?: number;
  totalClicks?: number;
  totalConversions?: number;
  totalParticipants?: number;
  slug?: string;
  startDate: string;
  endDate: string;
  escrow?: { totalAmount: number; releasedAmount: number; status: string } | null;
  _count?: { participations: number };
}

function CampaignStatusWidget({
  campaigns,
  isLoading,
}: {
  campaigns: CampaignRow[] | undefined;
  isLoading: boolean;
}) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Recent Campaigns</CardTitle>
            <CardDescription>
              Status and budget overview of your campaigns
            </CardDescription>
          </div>
          <Link href="/brand/campaigns">
            <Button variant="outline" size="sm">
              View all
              <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <TableSkeleton rows={5} />
        ) : !campaigns || campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <p className="text-muted-foreground mb-4">
              No campaigns yet. Create your first campaign to get started.
            </p>
            <Link href="/brand/campaigns/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Campaign
              </Button>
            </Link>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Budget</TableHead>
                <TableHead className="text-right">Spent</TableHead>
                <TableHead className="text-right">Conversions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.slice(0, 6).map((campaign) => {
                const spentPercent =
                  campaign.totalBudget > 0
                    ? (campaign.spentBudget / campaign.totalBudget) * 100
                    : 0;
                return (
                  <TableRow key={campaign.id}>
                    <TableCell>
                      <Link
                        href={`/brand/campaigns/${campaign.id}`}
                        className="font-medium hover:underline"
                      >
                        {campaign.name}
                      </Link>
                      <div className="mt-1">
                        <Progress
                          value={spentPercent}
                          className="h-1.5 w-24"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(campaign.status)}>
                        {campaign.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(campaign.totalBudget)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(campaign.spentBudget ?? 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(campaign.totalConversions ?? 0)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Top Performing Creators
// ---------------------------------------------------------------------------

interface TopCreator {
  creatorId: string;
  earnedAmount: number;
  verifiedViews: number;
  verifiedClicks: number;
  verifiedConversions: number;
}

function TopCreators({
  topCreators,
  isLoading,
}: {
  topCreators: TopCreator[] | undefined;
  isLoading: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="h-4 w-4 text-yellow-500" />
          Top Creators (30d)
        </CardTitle>
        <CardDescription>Highest performing creators</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : !topCreators || topCreators.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No creator activity yet.
          </p>
        ) : (
          <div className="space-y-4">
            {topCreators.slice(0, 8).map((creator, index) => (
              <div
                key={creator.creatorId}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium leading-none">
                      Creator {creator.creatorId.slice(0, 8)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatNumber(creator.verifiedViews)} views &middot;{" "}
                      {formatNumber(creator.verifiedConversions)} conv.
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold">
                  {formatCurrency(creator.earnedAmount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Low Budget Alerts
// ---------------------------------------------------------------------------

function LowBudgetAlerts({
  campaigns,
  isLoading,
}: {
  campaigns: CampaignRow[] | undefined;
  isLoading: boolean;
}) {
  if (isLoading) return null;

  const lowBudgetCampaigns = (campaigns ?? []).filter((c) => {
    const isActive =
      c.status?.toUpperCase() === "ACTIVE" ||
      c.status?.toUpperCase() === "LIVE";
    if (!isActive || c.totalBudget <= 0) return false;
    const remaining = c.totalBudget - c.spentBudget;
    return remaining > 0 && remaining / c.totalBudget < 0.15;
  });

  if (lowBudgetCampaigns.length === 0) return null;

  return (
    <Card className="border-orange-300 dark:border-orange-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
          <AlertTriangle className="h-4 w-4" />
          Budget Alerts
        </CardTitle>
        <CardDescription>
          Active campaigns with less than 15% budget remaining.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {lowBudgetCampaigns.map((campaign) => {
            const remaining = campaign.totalBudget - campaign.spentBudget;
            const remainingPercent =
              (remaining / campaign.totalBudget) * 100;
            return (
              <div
                key={campaign.id}
                className="flex items-center justify-between gap-4 rounded-lg border border-orange-200 bg-orange-50 p-3 dark:border-orange-800 dark:bg-orange-950/30"
              >
                <div>
                  <Link
                    href={`/brand/campaigns/${campaign.id}`}
                    className="text-sm font-medium hover:underline"
                  >
                    {campaign.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(remaining)} remaining (
                    {remainingPercent.toFixed(0)}%)
                  </p>
                </div>
                <Link href={`/brand/campaigns/${campaign.id}`}>
                  <Button variant="outline" size="sm">
                    Manage
                  </Button>
                </Link>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function BrandDashboardPage() {
  const {
    data: analytics,
    isLoading: analyticsLoading,
  } = trpc.analytics.getBrandAnalytics.useQuery();

  const {
    data: campaigns,
    isLoading: campaignsLoading,
  } = trpc.campaign.getBrandCampaigns.useQuery();

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your campaigns, spend, and creator performance.
          </p>
        </div>
        <Link href="/brand/campaigns/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Campaign
          </Button>
        </Link>
      </div>

      {/* KPI cards */}
      <KpiCards summary={analytics?.summary} isLoading={analyticsLoading} />

      {/* Campaign table + Top creators */}
      <div className="grid gap-4 lg:grid-cols-3">
        <CampaignStatusWidget
          campaigns={campaigns as CampaignRow[] | undefined}
          isLoading={campaignsLoading}
        />
        <TopCreators
          topCreators={analytics?.topCreators}
          isLoading={analyticsLoading}
        />
      </div>

      {/* Low budget alerts */}
      <LowBudgetAlerts
        campaigns={campaigns as CampaignRow[] | undefined}
        isLoading={campaignsLoading}
      />
    </div>
  );
}
