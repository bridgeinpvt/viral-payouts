"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { trpc } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700 border-gray-200",
  FUNDING: "bg-yellow-100 text-yellow-700 border-yellow-200",
  PENDING_REVIEW: "bg-yellow-100 text-yellow-700 border-yellow-200",
  LIVE: "bg-green-100 text-green-700 border-green-200",
  PAUSED: "bg-orange-100 text-orange-700 border-orange-200",
  COMPLETED: "bg-blue-100 text-blue-700 border-blue-200",
  CANCELLED: "bg-red-100 text-red-700 border-red-200",
};

const participationStatusColors: Record<string, string> = {
  APPLIED: "bg-blue-100 text-blue-700 border-blue-200",
  APPROVED: "bg-green-100 text-green-700 border-green-200",
  ACTIVE: "bg-emerald-100 text-emerald-700 border-emerald-200",
  COMPLETED: "bg-blue-100 text-blue-700 border-blue-200",
  REJECTED: "bg-red-100 text-red-700 border-red-200",
  FROZEN: "bg-purple-100 text-purple-700 border-purple-200",
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatNumber(n: number) {
  return new Intl.NumberFormat("en-IN").format(n);
}

export default function CampaignDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const utils = trpc.useUtils();

  const { data: campaign, isLoading } =
    trpc.campaign.getBrandCampaignDetail.useQuery({ id });

  const [rejectReason, setRejectReason] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const approveMutation = trpc.campaign.approveParticipation.useMutation({
    onSuccess: () => {
      utils.campaign.getBrandCampaignDetail.invalidate({ id });
    },
  });

  const rejectMutation = trpc.campaign.rejectParticipation.useMutation({
    onSuccess: () => {
      utils.campaign.getBrandCampaignDetail.invalidate({ id });
      setRejectingId(null);
      setRejectReason("");
    },
  });

  const publishMutation = trpc.campaign.publishCampaign.useMutation({
    onSuccess: () => {
      utils.campaign.getBrandCampaignDetail.invalidate({ id });
    },
  });

  const lockFundsMutation = trpc.escrow.lockFunds.useMutation({
    onSuccess: () => {
      utils.campaign.getBrandCampaignDetail.invalidate({ id });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-10 w-96" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Campaign not found.</p>
      </div>
    );
  }

  const budgetUsedPercent =
    campaign.totalBudget > 0
      ? Math.min(100, (campaign.spentBudget / campaign.totalBudget) * 100)
      : 0;

  const totalViews =
    campaign.metrics?.reduce((sum, m) => sum + m.verifiedViews, 0) ?? 0;
  const totalClicks =
    campaign.metrics?.reduce((sum, m) => sum + m.verifiedClicks, 0) ?? 0;
  const totalConversions =
    campaign.metrics?.reduce((sum, m) => sum + m.verifiedConversions, 0) ?? 0;
  const totalEarned =
    campaign.metrics?.reduce((sum, m) => sum + m.earnedAmount, 0) ?? 0;

  const activeParticipations = campaign.participations.filter(
    (p) => p.status === "ACTIVE" || p.status === "COMPLETED"
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{campaign.name}</h1>
            <Badge className={statusColors[campaign.status] ?? ""}>
              {campaign.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {campaign.type} campaign &middot;{" "}
            {campaign.targetPlatforms.join(", ")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {campaign.status === "DRAFT" && !campaign.escrow && (
            <Button
              variant="outline"
              disabled={lockFundsMutation.isPending}
              onClick={() =>
                lockFundsMutation.mutate({
                  campaignId: campaign.id,
                  amount: campaign.totalBudget,
                })
              }
            >
              {lockFundsMutation.isPending ? "Funding..." : "Fund Escrow"}
            </Button>
          )}
          {(campaign.status === "DRAFT" || campaign.status === "FUNDING") &&
            campaign.escrow?.status === "LOCKED" && (
              <Button
                disabled={publishMutation.isPending}
                onClick={() => publishMutation.mutate({ id: campaign.id })}
              >
                {publishMutation.isPending ? "Publishing..." : "Publish Campaign"}
              </Button>
            )}
        </div>
      </div>

      {/* Error messages */}
      {lockFundsMutation.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {lockFundsMutation.error.message}
        </div>
      )}
      {publishMutation.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {publishMutation.error.message}
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="creators">
            Creators ({campaign.participations.length})
          </TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Budget</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {formatCurrency(campaign.totalBudget)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Spent</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {formatCurrency(campaign.spentBudget)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Participants</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {campaign.totalParticipants}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Escrow Status</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {campaign.escrow?.status ?? "Not Funded"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Budget Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Budget Usage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>{formatCurrency(campaign.spentBudget)} spent</span>
                <span>{formatCurrency(campaign.totalBudget)} total</span>
              </div>
              <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${budgetUsedPercent}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {budgetUsedPercent.toFixed(1)}% of budget used
              </p>
            </CardContent>
          </Card>

          {/* Campaign Details */}
          <Card>
            <CardHeader>
              <CardTitle>Campaign Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Start Date</p>
                  <p className="font-medium">
                    {new Date(campaign.startDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">End Date</p>
                  <p className="font-medium">
                    {new Date(campaign.endDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Duration</p>
                  <p className="font-medium">{campaign.duration} days</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Type</p>
                  <p className="font-medium">{campaign.type}</p>
                </div>
                {campaign.type === "VIEW" && campaign.payoutPer1KViews && (
                  <div>
                    <p className="text-muted-foreground">Payout per 1K Views</p>
                    <p className="font-medium">
                      {formatCurrency(campaign.payoutPer1KViews)}
                    </p>
                  </div>
                )}
                {campaign.type === "CLICK" && campaign.payoutPerClick && (
                  <>
                    <div>
                      <p className="text-muted-foreground">Payout per Click</p>
                      <p className="font-medium">
                        {formatCurrency(campaign.payoutPerClick)}
                      </p>
                    </div>
                    {campaign.landingPageUrl && (
                      <div>
                        <p className="text-muted-foreground">Landing Page</p>
                        <p className="font-medium text-sm break-all">
                          {campaign.landingPageUrl}
                        </p>
                      </div>
                    )}
                  </>
                )}
                {campaign.type === "CONVERSION" && campaign.payoutPerSale && (
                  <>
                    <div>
                      <p className="text-muted-foreground">Payout per Sale</p>
                      <p className="font-medium">
                        {formatCurrency(campaign.payoutPerSale)}
                      </p>
                    </div>
                    {campaign.maxPayoutPerCreator && (
                      <div>
                        <p className="text-muted-foreground">
                          Max Payout per Creator
                        </p>
                        <p className="font-medium">
                          {formatCurrency(campaign.maxPayoutPerCreator)}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
              {campaign.description && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-muted-foreground text-sm mb-1">
                    Description
                  </p>
                  <p className="text-sm">{campaign.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Fraud Flags */}
          {campaign.fraudFlags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">Fraud Flags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {campaign.fraudFlags.map((flag) => (
                    <div
                      key={flag.id}
                      className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3 text-sm"
                    >
                      <div>
                        <p className="font-medium text-red-700">{flag.type}</p>
                        <p className="text-red-600">{flag.description}</p>
                      </div>
                      <Badge
                        className={
                          flag.status === "DISMISSED"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }
                      >
                        {flag.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Creators Tab */}
        <TabsContent value="creators" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Creators</CardTitle>
              <CardDescription>
                {campaign.participations.length} creator
                {campaign.participations.length !== 1 ? "s" : ""} in this
                campaign
              </CardDescription>
            </CardHeader>
            <CardContent>
              {campaign.participations.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No creators have applied to this campaign yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Creator</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaign.participations.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {p.creator.image && (
                              <img
                                src={p.creator.image}
                                alt=""
                                className="h-8 w-8 rounded-full object-cover"
                              />
                            )}
                            <div>
                              <p className="font-medium">
                                {p.creator.creatorProfile?.displayName ??
                                  p.creator.name ??
                                  "Unknown"}
                              </p>
                              {p.creator.creatorProfile?.instagramHandle && (
                                <p className="text-xs text-muted-foreground">
                                  @{p.creator.creatorProfile.instagramHandle}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {p.creator.creatorProfile?.tier ?? "N/A"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              participationStatusColors[p.status] ?? ""
                            }
                          >
                            {p.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(p.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {p.status === "APPLIED" && (
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                disabled={approveMutation.isPending}
                                onClick={() =>
                                  approveMutation.mutate({
                                    participationId: p.id,
                                  })
                                }
                              >
                                Approve
                              </Button>
                              {rejectingId === p.id ? (
                                <div className="flex items-center gap-2">
                                  <Input
                                    placeholder="Reason..."
                                    value={rejectReason}
                                    onChange={(e) =>
                                      setRejectReason(e.target.value)
                                    }
                                    className="w-40 h-8 text-sm"
                                  />
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    disabled={
                                      rejectMutation.isPending ||
                                      !rejectReason.trim()
                                    }
                                    onClick={() =>
                                      rejectMutation.mutate({
                                        participationId: p.id,
                                        reason: rejectReason.trim(),
                                      })
                                    }
                                  >
                                    Confirm
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setRejectingId(null);
                                      setRejectReason("");
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setRejectingId(p.id)}
                                >
                                  Reject
                                </Button>
                              )}
                            </div>
                          )}
                          {p.status === "ACTIVE" && p.contentUrl && (
                            <a
                              href={p.contentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:underline"
                            >
                              View Content
                            </a>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Submitted Content</CardTitle>
              <CardDescription>
                Content submitted by active creators
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeParticipations.filter((p) => p.contentUrl).length ===
              0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No content has been submitted yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {activeParticipations
                    .filter((p) => p.contentUrl)
                    .map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between rounded-lg border p-4"
                      >
                        <div className="flex items-center gap-3">
                          {p.creator.image && (
                            <img
                              src={p.creator.image}
                              alt=""
                              className="h-8 w-8 rounded-full object-cover"
                            />
                          )}
                          <div>
                            <p className="font-medium text-sm">
                              {p.creator.creatorProfile?.displayName ??
                                p.creator.name ??
                                "Unknown"}
                            </p>
                            {p.platform && (
                              <p className="text-xs text-muted-foreground">
                                {p.platform}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {p.submittedAt && (
                            <span className="text-xs text-muted-foreground">
                              {new Date(p.submittedAt).toLocaleDateString()}
                            </span>
                          )}
                          <Badge
                            className={
                              participationStatusColors[p.status] ?? ""
                            }
                          >
                            {p.status}
                          </Badge>
                          <a
                            href={p.contentUrl!}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button variant="outline" size="sm">
                              View
                            </Button>
                          </a>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {/* Campaign Media */}
              {campaign.media.length > 0 && (
                <div className="mt-6 pt-6 border-t">
                  <h3 className="font-medium mb-3">Campaign Media</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {campaign.media.map((m) => (
                      <div
                        key={m.id}
                        className="rounded-lg border overflow-hidden"
                      >
                        {m.type === "IMAGE" ? (
                          <img
                            src={m.url}
                            alt={m.filename ?? ""}
                            className="w-full h-32 object-cover"
                          />
                        ) : (
                          <div className="h-32 bg-muted flex items-center justify-center text-sm text-muted-foreground">
                            {m.type}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6 mt-4">
          {/* Summary Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Views</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatNumber(totalViews)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Clicks</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {formatNumber(totalClicks)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Conversions</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {formatNumber(totalConversions)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Spend</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {formatCurrency(totalEarned)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Per-Creator Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Creator Performance</CardTitle>
              <CardDescription>
                Metrics breakdown by creator
              </CardDescription>
            </CardHeader>
            <CardContent>
              {campaign.metrics.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No metrics data available yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Creator</TableHead>
                      <TableHead className="text-right">Views</TableHead>
                      <TableHead className="text-right">Clicks</TableHead>
                      <TableHead className="text-right">Conversions</TableHead>
                      <TableHead className="text-right">Earned</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaign.metrics.map((m) => {
                      const participation = campaign.participations.find(
                        (p) => p.creatorId === m.creatorId
                      );
                      return (
                        <TableRow key={m.id}>
                          <TableCell className="font-medium">
                            {participation?.creator.creatorProfile
                              ?.displayName ??
                              participation?.creator.name ??
                              m.creatorId}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatNumber(m.verifiedViews)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatNumber(m.verifiedClicks)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatNumber(m.verifiedConversions)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(m.earnedAmount)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(m.paidAmount)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Daily Analytics */}
          {campaign.dailyAnalytics.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Daily Analytics</CardTitle>
                <CardDescription>Last 30 days of activity</CardDescription>
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
                    {campaign.dailyAnalytics.map((day) => (
                      <TableRow key={day.id}>
                        <TableCell>
                          {new Date(day.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(day.views)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(day.clicks)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(day.conversions)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(day.spend)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
