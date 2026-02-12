"use client";

import { trpc } from "@/trpc/client";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function StatSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-32" />
      </CardContent>
    </Card>
  );
}

export default function AdminAnalyticsPage() {
  const { data, isLoading } = trpc.analytics.getAdminAnalytics.useQuery();

  if (isLoading || !data) {
    return (
      <div className="space-y-8 p-6">
        <h1 className="text-3xl font-bold">Admin Analytics</h1>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatSkeleton key={i} />
          ))}
        </div>
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      <h1 className="text-3xl font-bold">Admin Analytics</h1>

      {/* Funnel */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">User Funnel</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Users</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{data.funnel.totalUsers}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Onboarded Users</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {data.funnel.onboardedUsers}
              </p>
              {data.funnel.totalUsers > 0 && (
                <p className="text-sm text-muted-foreground">
                  {(
                    (data.funnel.onboardedUsers / data.funnel.totalUsers) *
                    100
                  ).toFixed(1)}
                  % of total
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active Campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {data.funnel.activeCampaigns}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Conversions</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {data.funnel.totalConversions}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Campaign Type Breakdown */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">
          Campaign Type Breakdown
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.campaignTypeStats.map((stat) => (
            <Card key={stat.type}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{stat.type}</span>
                  <Badge variant="secondary">{stat._count} campaigns</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Budget</span>
                  <span className="font-medium">
                    {formatCurrency(stat._sum?.totalBudget ?? 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Spent Budget</span>
                  <span className="font-medium">
                    {formatCurrency(stat._sum?.spentBudget ?? 0)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
          {data.campaignTypeStats.length === 0 && (
            <p className="text-muted-foreground col-span-3">
              No campaign type data available
            </p>
          )}
        </div>
      </div>

      {/* Top Campaigns by Spend */}
      <Card>
        <CardHeader>
          <CardTitle>Top Campaigns by Spend</CardTitle>
          <CardDescription>
            Highest spending campaigns on the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Total Budget</TableHead>
                <TableHead className="text-right">Spent</TableHead>
                <TableHead className="text-right">Participants</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.topCampaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell className="font-medium">
                    <a
                      href={`/admin/campaigns/${campaign.id}`}
                      className="text-primary hover:underline"
                    >
                      {campaign.name}
                    </a>
                  </TableCell>
                  <TableCell>
                    {campaign.brand?.brandProfile?.companyName ??
                      campaign.brand?.name ??
                      "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{campaign.type}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(campaign.totalBudget)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(campaign.spentBudget)}
                  </TableCell>
                  <TableCell className="text-right">
                    {campaign.totalParticipants}
                  </TableCell>
                </TableRow>
              ))}
              {data.topCampaigns.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No campaign data available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Top Creators by Earnings */}
      <Card>
        <CardHeader>
          <CardTitle>Top Creators by Earnings</CardTitle>
          <CardDescription>
            Highest earning creators on the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Creator</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead className="text-right">Total Earnings</TableHead>
                <TableHead className="text-right">Campaigns</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.topCreators.map((creator) => (
                <TableRow key={creator.userId}>
                  <TableCell className="font-medium">
                    {creator.displayName ?? creator.user?.name ?? "Unknown"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{creator.tier}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(creator.totalEarnings)}
                  </TableCell>
                  <TableCell className="text-right">
                    {creator.totalCampaigns}
                  </TableCell>
                </TableRow>
              ))}
              {data.topCreators.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No creator data available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
