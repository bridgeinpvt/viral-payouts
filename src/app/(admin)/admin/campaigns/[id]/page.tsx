'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { trpc } from '@/trpc/client';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export default function AdminCampaignDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [pauseReason, setPauseReason] = useState('');
  const [freezeReason, setFreezeReason] = useState('');
  const [freezeCreatorId, setFreezeCreatorId] = useState<string | null>(null);
  const [resolveNote, setResolveNote] = useState('');

  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.admin.getCampaignOversight.useQuery({ id });

  // Per-reel content analytics (reuses brand/analytics query — admin has access via protectedProcedure)
  const { data: contentSnapshots } =
    trpc.analytics.getCampaignContentSnapshots.useQuery(
      { campaignId: id },
      { enabled: !!id }
    );

  const pauseMutation = trpc.admin.adminPauseCampaign.useMutation({
    onSuccess: () => {
      utils.admin.getCampaignOversight.invalidate({ id });
      setPauseReason('');
    },
  });

  const approveMutation = trpc.admin.approveCampaign.useMutation({
    onSuccess: () => utils.admin.getCampaignOversight.invalidate({ id }),
    onError: (err) => toast.error(err.message),
  });

  const rejectMutation = trpc.admin.rejectCampaign.useMutation({
    onSuccess: () => utils.admin.getCampaignOversight.invalidate({ id }),
    onError: (err) => toast.error(err.message),
  });

  const freezeMutation = trpc.admin.freezeCreator.useMutation({
    onSuccess: () => {
      utils.admin.getCampaignOversight.invalidate({ id });
      setFreezeCreatorId(null);
      setFreezeReason('');
    },
  });

  const resolveFraudMutation = trpc.admin.resolveFraudFlag.useMutation({
    onSuccess: () => {
      utils.admin.getCampaignOversight.invalidate({ id });
      setResolveNote('');
    },
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const campaign = data;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{campaign.name}</h1>
          <p className="text-muted-foreground">
            Campaign Oversight - {campaign.slug}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {campaign.status === 'PENDING_REVIEW' ? (
            <>
              <Button
                variant="default"
                disabled={approveMutation.isPending}
                onClick={() => approveMutation.mutate({ campaignId: id })}
              >
                {approveMutation.isPending ? 'Approving...' : 'Approve'}
              </Button>
              <Button
                variant="destructive"
                disabled={rejectMutation.isPending}
                onClick={() => rejectMutation.mutate({ campaignId: id })}
              >
                {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
              </Button>
            </>
          ) : campaign.status === 'LIVE' ? (
            <>
              <Input
                placeholder="Pause reason..."
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
                className="w-48"
              />
              <Button
                variant="destructive"
                disabled={!pauseReason || pauseMutation.isPending}
                onClick={() =>
                  pauseMutation.mutate({ campaignId: id, reason: pauseReason })
                }
              >
                {pauseMutation.isPending ? 'Pausing...' : 'Pause Campaign'}
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="creators">Creators</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="tracking">Tracking Links</TabsTrigger>
          <TabsTrigger value="reels">Reel Analytics</TabsTrigger>
          <TabsTrigger value="fraud">Fraud Flags</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Campaign Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <Badge variant="secondary">{campaign.type}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge>{campaign.status}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Budget</span>
                  <span className="font-medium">
                    {formatCurrency(campaign.totalBudget)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Spent Budget</span>
                  <span className="font-medium">
                    {formatCurrency(campaign.spentBudget)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rate per Action</span>
                  <span className="font-medium">
                    {campaign.type === 'VIEW'
                      ? `₹${campaign.payoutPer1KViews ?? 0}/1K views`
                      : campaign.type === 'CLICK'
                        ? `₹${campaign.payoutPerClick ?? 0}/click`
                        : `₹${campaign.payoutPerSale ?? 0}/sale`}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Brand Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Brand</span>
                  <span className="font-medium">{campaign.brand?.name}</span>
                </div>
                {campaign.brand?.brandProfile && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Company</span>
                    <span className="font-medium">
                      {campaign.brand.brandProfile.companyName}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Escrow Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {campaign.escrow ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Total Amount
                      </span>
                      <span className="font-medium">
                        {formatCurrency(campaign.escrow.totalAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Released</span>
                      <span className="font-medium">
                        {formatCurrency(campaign.escrow.releasedAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Remaining</span>
                      <span className="font-medium">
                        {formatCurrency(
                          (campaign.escrow.totalAmount ?? 0) -
                            (campaign.escrow.releasedAmount ?? 0)
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status</span>
                      <Badge variant="secondary">
                        {campaign.escrow.status}
                      </Badge>
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground">No escrow data</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Budget Progress */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Budget Progress</CardTitle>
              <CardDescription>
                {formatCurrency(campaign.spentBudget)} of{' '}
                {formatCurrency(campaign.totalBudget)} spent (
                {campaign.totalBudget > 0
                  ? (
                      (campaign.spentBudget / campaign.totalBudget) *
                      100
                    ).toFixed(1)
                  : 0}
                %)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-3 w-full rounded-full bg-muted">
                <div
                  className="h-3 rounded-full bg-primary transition-all"
                  style={{
                    width: `${Math.min(
                      campaign.totalBudget > 0
                        ? (campaign.spentBudget / campaign.totalBudget) * 100
                        : 0,
                      100
                    )}%`,
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Creators Tab */}
        <TabsContent value="creators">
          <Card>
            <CardHeader>
              <CardTitle>Participations</CardTitle>
              <CardDescription>
                {campaign.participations?.length ?? 0} creators participating
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Creator</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tracking Link</TableHead>
                    <TableHead>Promo Code</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaign.participations?.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {p.creator?.displayName ??
                              p.creator?.user?.name ??
                              'Unknown'}
                          </p>
                          {p.creator?.tier && (
                            <Badge variant="outline" className="mt-1">
                              {p.creator.tier}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{p.status}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] text-sm">
                        {p.trackingLinks && p.trackingLinks.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {p.trackingLinks.map((link: any) => (
                              <div
                                key={link.id}
                                className="flex justify-between text-xs"
                              >
                                <span className="truncate" title={link.slug}>
                                  {link.slug} ({link.platform ?? 'Gen'})
                                </span>
                                <span className="text-muted-foreground ml-1">
                                  {link.totalClicks}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>{p.promoCode?.code ?? '-'}</TableCell>
                      <TableCell>
                        {freezeCreatorId === p.creatorId ? (
                          <div className="flex items-center gap-2">
                            <Input
                              placeholder="Reason..."
                              value={freezeReason}
                              onChange={(e) => setFreezeReason(e.target.value)}
                              className="w-32"
                            />
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={
                                !freezeReason || freezeMutation.isPending
                              }
                              onClick={() =>
                                freezeMutation.mutate({
                                  creatorId: p.creatorId,
                                  reason: freezeReason,
                                })
                              }
                            >
                              Confirm
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setFreezeCreatorId(null);
                                setFreezeReason('');
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setFreezeCreatorId(p.creatorId)}
                          >
                            Freeze Creator
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!campaign.participations ||
                    campaign.participations.length === 0) && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-muted-foreground"
                      >
                        No participations found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Metrics Tab */}
        <TabsContent value="metrics">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Metrics</CardTitle>
              <CardDescription>Performance per creator</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Creator</TableHead>
                    <TableHead className="text-right">Views</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                    <TableHead className="text-right">Conversions</TableHead>
                    <TableHead className="text-right">Earned</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaign.metrics?.map((m: any) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">
                        {m.creator?.displayName ??
                          m.creator?.user?.name ??
                          'Unknown'}
                      </TableCell>
                      <TableCell className="text-right">
                        {m.totalViews?.toLocaleString() ?? 0}
                      </TableCell>
                      <TableCell className="text-right">
                        {m.totalClicks?.toLocaleString() ?? 0}
                      </TableCell>
                      <TableCell className="text-right">
                        {m.totalConversions?.toLocaleString() ?? 0}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(m.totalEarned ?? 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!campaign.metrics || campaign.metrics.length === 0) && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-muted-foreground"
                      >
                        No metrics data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Daily Analytics */}
          {campaign.dailyAnalytics && campaign.dailyAnalytics.length > 0 && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Daily Analytics</CardTitle>
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
                    {campaign.dailyAnalytics.map((d: any) => (
                      <TableRow key={d.id ?? d.date}>
                        <TableCell>
                          {new Date(d.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {d.views?.toLocaleString() ?? 0}
                        </TableCell>
                        <TableCell className="text-right">
                          {d.clicks?.toLocaleString() ?? 0}
                        </TableCell>
                        <TableCell className="text-right">
                          {d.conversions?.toLocaleString() ?? 0}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(d.spend ?? 0)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Reel Analytics Tab */}
        <TabsContent value="reels">
          <Card>
            <CardHeader>
              <CardTitle>Reel &amp; Short Analytics</CardTitle>
              <CardDescription>
                Per-creator content performance — synced hourly
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!contentSnapshots || contentSnapshots.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No content submitted yet or views haven&apos;t synced.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Creator</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead className="text-right">Views</TableHead>
                      <TableHead className="text-right">+Delta</TableHead>
                      <TableHead className="text-right">Likes</TableHead>
                      <TableHead className="text-right">Comments</TableHead>
                      <TableHead className="text-right">Shares</TableHead>
                      <TableHead>Last Synced</TableHead>
                      <TableHead>Content</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contentSnapshots.map((snap, i) => {
                      if (!snap) return null;
                      return (
                        <TableRow key={`${snap.creatorId}-${i}`}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {snap.creatorImage && (
                                <img
                                  src={snap.creatorImage}
                                  alt=""
                                  className="h-7 w-7 rounded-full"
                                />
                              )}
                              <div>
                                <p className="text-sm font-medium">
                                  {snap.creatorName}
                                </p>
                                {snap.instagramHandle && (
                                  <p className="text-xs text-muted-foreground">
                                    @{snap.instagramHandle}
                                  </p>
                                )}
                              </div>
                              {snap.fraudFlags > 0 && (
                                <Badge className="bg-red-100 text-red-700 text-[10px]">
                                  ⚠ {snap.fraudFlags}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-[11px]">
                              {snap.platform ?? '—'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {snap.currentViews.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            {snap.deltaViews > 0 ? (
                              <span className="text-green-600">
                                +{snap.deltaViews.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {snap.likes.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            {snap.comments.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            {snap.shares.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {snap.lastSyncedAt
                              ? new Date(snap.lastSyncedAt).toLocaleString()
                              : 'Not yet'}
                          </TableCell>
                          <TableCell>
                            <a
                              href={snap.postUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button variant="outline" size="sm">
                                View
                              </Button>
                            </a>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tracking Links Tab */}
        <TabsContent value="tracking">
          <Card>
            <CardHeader>
              <CardTitle>Tracking Links</CardTitle>
              <CardDescription>
                All generated tracking links and their performance.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Creator</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Slug (URL)</TableHead>
                    <TableHead className="text-right">Total Clicks</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaign.trackingLinks?.map((link: any) => (
                    <TableRow key={link.id}>
                      <TableCell className="font-medium">
                        {link.creator?.displayName ??
                          link.creator?.user?.name ??
                          'Unknown'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {link.platform ?? 'General'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-mono text-xs">{link.slug}</span>
                          <a
                            href={`http://localhost:4002/go/${link.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-blue-500 hover:underline"
                          >
                            Test Link ↗
                          </a>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {link.totalClicks?.toLocaleString() ?? 0}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={link.isActive ? 'default' : 'destructive'}
                        >
                          {link.isActive ? 'Active' : 'Disabled'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(link.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!campaign.trackingLinks ||
                    campaign.trackingLinks.length === 0) && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-6 text-muted-foreground"
                      >
                        No tracking links generated for this campaign yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fraud Flags Tab */}
        <TabsContent value="fraud">
          <Card>
            <CardHeader>
              <CardTitle>Fraud Flags</CardTitle>
              <CardDescription>
                {campaign.fraudFlags?.length ?? 0} flags detected
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaign.fraudFlags?.map((flag: any) => (
                    <TableRow key={flag.id}>
                      <TableCell>
                        <Badge variant="outline">{flag.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            flag.severity >= 4
                              ? 'bg-red-500 text-white'
                              : flag.severity === 3
                                ? 'bg-orange-500 text-white'
                                : 'bg-yellow-500 text-white'
                          }
                        >
                          {flag.severity}/5
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{flag.status}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {flag.description}
                      </TableCell>
                      <TableCell>
                        {flag.status !== 'CONFIRMED' &&
                          flag.status !== 'DISMISSED' && (
                            <div className="flex items-center gap-2">
                              <Input
                                placeholder="Note..."
                                value={resolveNote}
                                onChange={(e) => setResolveNote(e.target.value)}
                                className="w-24"
                              />
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={resolveFraudMutation.isPending}
                                onClick={() =>
                                  resolveFraudMutation.mutate({
                                    flagId: flag.id,
                                    status: 'CONFIRMED',
                                    note: resolveNote,
                                  })
                                }
                              >
                                Confirm
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={resolveFraudMutation.isPending}
                                onClick={() =>
                                  resolveFraudMutation.mutate({
                                    flagId: flag.id,
                                    status: 'DISMISSED',
                                    note: resolveNote,
                                  })
                                }
                              >
                                Dismiss
                              </Button>
                            </div>
                          )}
                        {(flag.status === 'CONFIRMED' ||
                          flag.status === 'DISMISSED') && (
                          <span className="text-sm text-muted-foreground">
                            Resolved
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!campaign.fraudFlags ||
                    campaign.fraudFlags.length === 0) && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-muted-foreground"
                      >
                        No fraud flags
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
