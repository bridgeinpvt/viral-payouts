"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  TrendingUp,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Download,
  Loader2,
  Wallet,
  Clock,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { trpc } from "@/trpc/client";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default function EarningsPage() {
  const { data: submissions, isLoading } = trpc.campaign.getMySubmissions.useQuery();
  const { data: wallet } = trpc.wallet.getWallet.useQuery();

  // Calculate earnings stats
  const stats = {
    totalEarned: submissions?.reduce((acc, s) => acc + (s.earnedAmount || 0), 0) || 0,
    pendingPayout: wallet?.pendingBalance || 0,
    availableBalance: wallet?.availableBalance || 0,
    totalViews: submissions?.reduce((acc, s) => acc + (s.totalViews || 0), 0) || 0,
    thisMonth: submissions?.filter((s) => {
      const now = new Date();
      const submissionDate = new Date(s.createdAt);
      return submissionDate.getMonth() === now.getMonth() &&
             submissionDate.getFullYear() === now.getFullYear();
    }).reduce((acc, s) => acc + (s.earnedAmount || 0), 0) || 0,
    lastMonth: submissions?.filter((s) => {
      const now = new Date();
      const lastMonth = new Date(now.setMonth(now.getMonth() - 1));
      const submissionDate = new Date(s.createdAt);
      return submissionDate.getMonth() === lastMonth.getMonth() &&
             submissionDate.getFullYear() === lastMonth.getFullYear();
    }).reduce((acc, s) => acc + (s.earnedAmount || 0), 0) || 0,
  };

  const monthlyGrowth = stats.lastMonth > 0
    ? ((stats.thisMonth - stats.lastMonth) / stats.lastMonth) * 100
    : stats.thisMonth > 0 ? 100 : 0;

  const formatViews = (views: number) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views.toString();
  };

  // Recent earnings from submissions
  const recentEarnings = submissions
    ?.filter((s) => s.earnedAmount && s.earnedAmount > 0)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Earnings</h1>
          <p className="text-muted-foreground">
            Track your campaign earnings and payouts
          </p>
        </div>
        <Button variant="outline" className="gap-2" asChild>
          <Link href="/wallet">
            <Wallet className="h-4 w-4" />
            View Wallet
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Earned</p>
                    <p className="text-2xl font-bold">{formatCurrency(stats.totalEarned)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Lifetime earnings</p>
                  </div>
                  <div className="rounded-lg bg-green-100 p-2">
                    <DollarSign className="h-5 w-5 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">This Month</p>
                    <p className="text-2xl font-bold">{formatCurrency(stats.thisMonth)}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {monthlyGrowth >= 0 ? (
                        <ArrowUpRight className="h-3 w-3 text-green-600" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3 text-red-600" />
                      )}
                      <span className={cn(
                        "text-xs",
                        monthlyGrowth >= 0 ? "text-green-600" : "text-red-600"
                      )}>
                        {Math.abs(monthlyGrowth).toFixed(0)}% vs last month
                      </span>
                    </div>
                  </div>
                  <div className="rounded-lg bg-primary/10 p-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Available Balance</p>
                    <p className="text-2xl font-bold">{formatCurrency(stats.availableBalance)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Ready to withdraw</p>
                  </div>
                  <div className="rounded-lg bg-blue-100 p-2">
                    <Wallet className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Views</p>
                    <p className="text-2xl font-bold">{formatViews(stats.totalViews)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Across all content</p>
                  </div>
                  <div className="rounded-lg bg-purple-100 p-2">
                    <Eye className="h-5 w-5 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Recent Earnings */}
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Recent Earnings</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/my-campaigns">
                    View All
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {recentEarnings.length > 0 ? (
                  <div className="space-y-4">
                    {recentEarnings.map((earning) => (
                      <div
                        key={earning.id}
                        className="flex items-center justify-between py-3 border-b last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                            <DollarSign className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {earning.campaign.name || earning.campaign.productName || "Campaign"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(earning.updatedAt).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-green-600">
                            +{formatCurrency(earning.earnedAmount || 0)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatViews(earning.totalViews || 0)} views
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No earnings yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Complete campaigns to start earning
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payout Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Payout Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Balance Breakdown */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Available</span>
                    </div>
                    <span className="font-semibold">{formatCurrency(stats.availableBalance)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm">Pending</span>
                    </div>
                    <span className="font-semibold">{formatCurrency(stats.pendingPayout)}</span>
                  </div>
                  <div className="h-px bg-border" />
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Total Balance</span>
                    <span className="font-bold text-primary">
                      {formatCurrency(stats.availableBalance + stats.pendingPayout)}
                    </span>
                  </div>
                </div>

                {/* Withdraw Button */}
                <Button className="w-full" asChild>
                  <Link href="/wallet">
                    Withdraw Funds
                  </Link>
                </Button>

                {/* Info */}
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">
                    Pending earnings are released after content verification.
                    Usually takes 3-7 business days.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Earnings Breakdown */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Earnings by Campaign Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {['CLIPPING', 'UGC', 'JUST_POSTING'].map((type) => {
                  const typeEarnings = submissions
                    ?.filter((s) => s.campaign.type === type)
                    .reduce((acc, s) => acc + (s.earnedAmount || 0), 0) || 0;
                  const typeViews = submissions
                    ?.filter((s) => s.campaign.type === type)
                    .reduce((acc, s) => acc + (s.totalViews || 0), 0) || 0;
                  const typeCount = submissions?.filter((s) => s.campaign.type === type).length || 0;

                  const typeLabels: Record<string, string> = {
                    CLIPPING: "Clipping",
                    UGC: "UGC",
                    JUST_POSTING: "Just Posting",
                  };

                  const typeColors: Record<string, string> = {
                    CLIPPING: "bg-purple-100 text-purple-700",
                    UGC: "bg-blue-100 text-blue-700",
                    JUST_POSTING: "bg-green-100 text-green-700",
                  };

                  return (
                    <div key={type} className="rounded-lg border p-4">
                      <Badge className={cn("mb-3", typeColors[type])}>
                        {typeLabels[type]}
                      </Badge>
                      <p className="text-2xl font-bold">{formatCurrency(typeEarnings)}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span>{typeCount} campaigns</span>
                        <span>{formatViews(typeViews)} views</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
