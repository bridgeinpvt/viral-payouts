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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function KPISkeleton() {
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

function TableSkeleton({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
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

export default function BrandAnalyticsPage() {
  const { data, isLoading } = trpc.analytics.getBrandAnalytics.useQuery();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground mt-1">
          Track your campaign performance and ROI at a glance.
        </p>
      </div>

      {/* Global KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <KPISkeleton key={i} />)
        ) : (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Spent</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {formatCurrency(data?.summary.totalSpent ?? 0)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Views</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {(data?.summary.totalViews ?? 0).toLocaleString("en-IN")}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Clicks</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {(data?.summary.totalClicks ?? 0).toLocaleString("en-IN")}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Conversions</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {(data?.summary.totalConversions ?? 0).toLocaleString("en-IN")}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>ROI</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {data?.summary.roi ?? 0}%
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Campaign Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Performance</CardTitle>
          <CardDescription>
            Performance breakdown for each of your campaigns.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Budget</TableHead>
                <TableHead className="text-right">Spent</TableHead>
                <TableHead className="text-right">Views</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
                <TableHead className="text-right">Conversions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableSkeleton rows={5} cols={8} />
              ) : data?.campaigns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No campaigns found.
                  </TableCell>
                </TableRow>
              ) : (
                data?.campaigns.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell className="font-medium">{campaign.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{campaign.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          campaign.status === "LIVE"
                            ? "default"
                            : campaign.status === "PAUSED"
                            ? "outline"
                            : "secondary"
                        }
                      >
                        {campaign.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(campaign.totalBudget)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(campaign.spentBudget)}
                    </TableCell>
                    <TableCell className="text-right">
                      {campaign.totalViews.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="text-right">
                      {campaign.totalClicks.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="text-right">
                      {campaign.totalConversions.toLocaleString("en-IN")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Top Creators Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle>Top Creators</CardTitle>
          <CardDescription>
            Top 10 creators driving results for your campaigns.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Creator ID</TableHead>
                <TableHead className="text-right">Earned</TableHead>
                <TableHead className="text-right">Views</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
                <TableHead className="text-right">Conversions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableSkeleton rows={5} cols={6} />
              ) : data?.topCreators.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No creator data yet.
                  </TableCell>
                </TableRow>
              ) : (
                data?.topCreators.slice(0, 10).map((creator, index) => (
                  <TableRow key={creator.creatorId}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>{creator.creatorId}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(creator.earnedAmount)}
                    </TableCell>
                    <TableCell className="text-right">
                      {creator.verifiedViews.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="text-right">
                      {creator.verifiedClicks.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="text-right">
                      {creator.verifiedConversions.toLocaleString("en-IN")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Daily Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Trends</CardTitle>
          <CardDescription>
            Day-by-day breakdown of views, clicks, conversions, and spend.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Views</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
                <TableHead className="text-right">Conversions</TableHead>
                <TableHead className="text-right">Spend</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableSkeleton rows={7} cols={5} />
              ) : data?.dailyTrends.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No trend data available.
                  </TableCell>
                </TableRow>
              ) : (
                data?.dailyTrends.map((day) => (
                  <TableRow key={day.date}>
                    <TableCell className="font-medium">
                      {new Date(day.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {day.views.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="text-right">
                      {day.clicks.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="text-right">
                      {day.conversions.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(day.spend)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
