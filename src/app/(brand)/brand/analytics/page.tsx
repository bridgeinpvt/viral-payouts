'use client';

import { useState } from 'react';
import { trpc } from '@/trpc/client';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Instagram, Youtube, Twitter } from 'lucide-react';

function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
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

function TableSkeleton({
  rows = 5,
  cols = 6,
}: {
  rows?: number;
  cols?: number;
}) {
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
  const [selectedCreatorId, setSelectedCreatorId] = useState<string | null>(
    null
  );

  // We can derive the selected creator's data from the existing list,
  // or use a separate query. Here we just find them in the list.
  const selectedCreator = data?.topCreators.find(
    (c) => c.creatorId === selectedCreatorId
  );

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
                  {(data?.summary.totalViews ?? 0).toLocaleString('en-IN')}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Clicks</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {(data?.summary.totalClicks ?? 0).toLocaleString('en-IN')}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Conversions</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {(data?.summary.totalConversions ?? 0).toLocaleString(
                    'en-IN'
                  )}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>ROI</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{data?.summary.roi ?? 0}%</p>
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
                  <TableCell
                    colSpan={8}
                    className="text-center text-muted-foreground py-8"
                  >
                    No campaigns found.
                  </TableCell>
                </TableRow>
              ) : (
                data?.campaigns.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell className="font-medium">
                      {campaign.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{campaign.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          campaign.status === 'LIVE'
                            ? 'default'
                            : campaign.status === 'PAUSED'
                              ? 'outline'
                              : 'secondary'
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
                      {campaign.totalViews.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell className="text-right">
                      {campaign.totalClicks.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell className="text-right">
                      {campaign.totalConversions.toLocaleString('en-IN')}
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
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableSkeleton rows={5} cols={6} />
              ) : data?.topCreators.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground py-8"
                  >
                    No creator data yet.
                  </TableCell>
                </TableRow>
              ) : (
                data?.topCreators.slice(0, 10).map((creator, index) => (
                  <TableRow key={creator.creatorId}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell
                      className="max-w-[150px] truncate"
                      title={creator.creatorId}
                    >
                      {creator.creatorId}
                    </TableCell>
                    <TableCell className="text-right font-medium text-green-600">
                      {formatCurrency(creator.earnedAmount)}
                    </TableCell>
                    <TableCell className="text-right">
                      {creator.verifiedViews.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell className="text-right">
                      {creator.verifiedClicks.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell className="text-right">
                      {creator.verifiedConversions.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedCreatorId(creator.creatorId)}
                      >
                        View Profile
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Profile Drawer */}
      <Sheet
        open={!!selectedCreatorId}
        onOpenChange={(open) => !open && setSelectedCreatorId(null)}
      >
        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
          <SheetHeader className="pb-6 border-b">
            <SheetTitle>Creator Profile</SheetTitle>
            <SheetDescription>
              Detailed performance metrics and social links.
            </SheetDescription>
          </SheetHeader>

          {selectedCreator ? (
            <div className="py-6 space-y-8">
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedCreator.creatorId}`}
                  />
                  <AvatarFallback>CR</AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <h3 className="font-semibold text-lg">
                    Creator {selectedCreator.creatorId.substring(0, 8)}...
                  </h3>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Gold Tier</Badge>
                    <Badge
                      variant="outline"
                      className="text-emerald-600 bg-emerald-50 border-emerald-200"
                    >
                      Highly Active
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Social Reach</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="p-2 bg-pink-100 text-pink-600 rounded-md">
                      <Instagram className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Instagram</p>
                      <p className="font-semibold text-sm">45.2K</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="p-2 bg-red-100 text-red-600 rounded-md">
                      <Youtube className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">YouTube</p>
                      <p className="font-semibold text-sm">128K</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Campaign Performance</h4>
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="p-4 pb-2">
                      <CardDescription className="text-xs">
                        Total Views
                      </CardDescription>
                      <CardTitle className="text-lg">
                        {selectedCreator.verifiedViews.toLocaleString()}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="p-4 pb-2">
                      <CardDescription className="text-xs">
                        Total Earned
                      </CardDescription>
                      <CardTitle className="text-lg text-green-600">
                        {formatCurrency(selectedCreator.earnedAmount)}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="p-4 pb-2">
                      <CardDescription className="text-xs">
                        Conversions
                      </CardDescription>
                      <CardTitle className="text-lg">
                        {selectedCreator.verifiedConversions.toLocaleString()}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="p-4 pb-2">
                      <CardDescription className="text-xs">
                        Avg. Click Rate
                      </CardDescription>
                      <CardTitle className="text-lg">
                        {selectedCreator.verifiedViews > 0
                          ? (
                              (selectedCreator.verifiedClicks /
                                selectedCreator.verifiedViews) *
                              100
                            ).toFixed(1) + '%'
                          : '0%'}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <Button className="flex-1">Invite to New Campaign</Button>
                <Button variant="outline" className="flex-1">
                  Message
                </Button>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              Loading creator details...
            </div>
          )}
        </SheetContent>
      </Sheet>

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
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground py-8"
                  >
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
                      {day.views.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell className="text-right">
                      {day.clicks.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell className="text-right">
                      {day.conversions.toLocaleString('en-IN')}
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
