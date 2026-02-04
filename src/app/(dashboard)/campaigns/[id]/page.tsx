"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Scissors,
  Video,
  Share2,
  Clock,
  DollarSign,
  Eye,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  Calendar,
  TrendingUp,
  Edit2,
  Pause,
  Play,
} from "lucide-react";
import { trpc } from "@/trpc/client";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const typeIcons: Record<string, React.ElementType> = {
  CLIPPING: Scissors,
  UGC: Video,
  JUST_POSTING: Share2,
};

const statusConfig: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Draft", color: "bg-gray-100 text-gray-700" },
  PENDING_REVIEW: { label: "Pending Review", color: "bg-yellow-100 text-yellow-700" },
  ACTIVE: { label: "Active", color: "bg-green-100 text-green-700" },
  PAUSED: { label: "Paused", color: "bg-orange-100 text-orange-700" },
  COMPLETED: { label: "Completed", color: "bg-blue-100 text-blue-700" },
  CANCELLED: { label: "Cancelled", color: "bg-red-100 text-red-700" },
};

const submissionStatusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  PENDING: { label: "Pending", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  APPROVED: { label: "Approved", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  SUBMITTED: { label: "Content Submitted", color: "bg-blue-100 text-blue-700", icon: Eye },
  PUBLISHED: { label: "Published", color: "bg-primary/10 text-primary", icon: TrendingUp },
  REJECTED: { label: "Rejected", color: "bg-red-100 text-red-700", icon: XCircle },
  COMPLETED: { label: "Completed", color: "bg-primary/10 text-primary", icon: CheckCircle2 },
};

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const utils = trpc.useUtils();

  const { data: campaign, isLoading } = trpc.campaign.getCampaign.useQuery(
    { id: campaignId },
    { enabled: !!campaignId }
  );

  const { data: submissions, isLoading: submissionsLoading } = trpc.campaign.getCampaignSubmissions.useQuery(
    { campaignId },
    { enabled: !!campaignId }
  );

  const approveSubmission = trpc.campaign.approveSubmission.useMutation({
    onSuccess: () => {
      toast.success("Submission approved");
      utils.campaign.getCampaignSubmissions.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to approve");
    },
  });

  const rejectSubmission = trpc.campaign.rejectSubmission.useMutation({
    onSuccess: () => {
      toast.success("Submission rejected");
      setShowRejectDialog(false);
      setRejectReason("");
      utils.campaign.getCampaignSubmissions.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to reject");
    },
  });

  const approveContent = trpc.campaign.approveContent.useMutation({
    onSuccess: () => {
      toast.success("Content approved and published");
      utils.campaign.getCampaignSubmissions.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to approve content");
    },
  });

  const formatViews = (views: number) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views.toString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Campaign not found</p>
        <Button asChild>
          <Link href="/campaigns">Back to Campaigns</Link>
        </Button>
      </div>
    );
  }

  const TypeIcon = typeIcons[campaign.type] || Video;
  const status = statusConfig[campaign.status];
  const daysRemaining = Math.max(0, Math.ceil((new Date(campaign.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  const budgetUsedPercent = Math.round((campaign.spentBudget / campaign.totalBudget) * 100);

  const pendingSubmissions = submissions?.filter(s => s.status === "PENDING") || [];
  const approvedSubmissions = submissions?.filter(s => ["APPROVED", "SUBMITTED", "PUBLISHED"].includes(s.status)) || [];
  const completedSubmissions = submissions?.filter(s => s.status === "COMPLETED") || [];

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" size="sm" asChild className="gap-2">
        <Link href="/campaigns">
          <ArrowLeft className="h-4 w-4" />
          Back to Campaigns
        </Link>
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
            <TypeIcon className="h-7 w-7 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{campaign.name || "Untitled Campaign"}</h1>
              <Badge className={cn(status.color)}>{status.label}</Badge>
            </div>
            <p className="text-muted-foreground">{campaign.type} Campaign</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/campaigns/new/configure?id=${campaignId}`}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </Button>
          {campaign.status === "ACTIVE" ? (
            <Button variant="outline">
              <Pause className="h-4 w-4 mr-2" />
              Pause
            </Button>
          ) : campaign.status === "PAUSED" ? (
            <Button>
              <Play className="h-4 w-4 mr-2" />
              Resume
            </Button>
          ) : null}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Budget</p>
                <p className="text-2xl font-bold">{formatCurrency(campaign.totalBudget)}</p>
                <p className="text-xs text-muted-foreground">{budgetUsedPercent}% used</p>
              </div>
              <div className="rounded-lg bg-primary/10 p-2">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Views</p>
                <p className="text-2xl font-bold">{formatViews(campaign.totalViews)}</p>
              </div>
              <div className="rounded-lg bg-blue-100 p-2">
                <Eye className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Submissions</p>
                <p className="text-2xl font-bold">{campaign.totalSubmissions}</p>
                <p className="text-xs text-muted-foreground">{campaign.approvedCount} approved</p>
              </div>
              <div className="rounded-lg bg-green-100 p-2">
                <Users className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Days Remaining</p>
                <p className="text-2xl font-bold">{daysRemaining}</p>
              </div>
              <div className="rounded-lg bg-orange-100 p-2">
                <Calendar className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="submissions" className="gap-2">
            Submissions
            {pendingSubmissions.length > 0 && (
              <Badge variant="secondary" className="ml-1">{pendingSubmissions.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="creators">Active Creators</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Campaign Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {campaign.campaignBrief && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Brief</p>
                    <p className="text-sm">{campaign.campaignBrief}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Duration</p>
                    <p className="font-medium">{campaign.duration} days</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Platforms</p>
                    <div className="flex gap-1 mt-1">
                      {campaign.targetPlatforms.map((p) => (
                        <Badge key={p} variant="outline" className="text-xs">{p}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payout Structure</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {campaign.fixedPayout && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fixed Payout</span>
                    <span className="font-medium">{formatCurrency(campaign.fixedPayout)}/post</span>
                  </div>
                )}
                {campaign.minPayoutPerView && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Per 1K Views</span>
                    <span className="font-medium">
                      {formatCurrency(campaign.minPayoutPerView)} - {formatCurrency(campaign.maxPayoutPerView || campaign.minPayoutPerView)}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Submissions Tab */}
        <TabsContent value="submissions" className="mt-6">
          {submissionsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : pendingSubmissions.length > 0 ? (
            <div className="space-y-4">
              <h3 className="font-semibold">Pending Applications ({pendingSubmissions.length})</h3>
              {pendingSubmissions.map((submission) => (
                <Card key={submission.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={submission.creator.image || ""} />
                          <AvatarFallback>
                            {submission.creator.name?.charAt(0) || "C"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {submission.creator.creatorProfile?.displayName || submission.creator.name}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant="outline" className="text-xs">
                              {submission.creator.creatorProfile?.tier || "BRONZE"}
                            </Badge>
                            <span>
                              {submission.creator.creatorProfile?.totalCampaigns || 0} campaigns
                            </span>
                          </div>
                          {submission.creator.creatorProfile?.instagramHandle && (
                            <p className="text-xs text-muted-foreground mt-1">
                              @{submission.creator.creatorProfile.instagramHandle} • {formatViews(submission.creator.creatorProfile.instagramFollowers || 0)} followers
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => {
                            setSelectedSubmission(submission);
                            setShowRejectDialog(true);
                          }}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => approveSubmission.mutate({ submissionId: submission.id })}
                          disabled={approveSubmission.isPending}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mb-3" />
                <p className="font-medium">No pending submissions</p>
                <p className="text-sm text-muted-foreground">New applications will appear here</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Active Creators Tab */}
        <TabsContent value="creators" className="mt-6">
          {approvedSubmissions.length > 0 ? (
            <div className="space-y-4">
              {approvedSubmissions.map((submission) => {
                const subStatus = submissionStatusConfig[submission.status];
                const SubIcon = subStatus.icon;
                return (
                  <Card key={submission.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={submission.creator.image || ""} />
                            <AvatarFallback>
                              {submission.creator.name?.charAt(0) || "C"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {submission.creator.creatorProfile?.displayName || submission.creator.name}
                            </p>
                            <Badge className={cn("mt-1", subStatus.color)}>
                              <SubIcon className="h-3 w-3 mr-1" />
                              {subStatus.label}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {submission.contentUrl && (
                            <Button variant="outline" size="sm" asChild>
                              <a href={submission.contentUrl} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4 mr-1" />
                                View Content
                              </a>
                            </Button>
                          )}
                          {submission.status === "SUBMITTED" && (
                            <Button
                              size="sm"
                              onClick={() => approveContent.mutate({ submissionId: submission.id })}
                              disabled={approveContent.isPending}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Approve Content
                            </Button>
                          )}
                          <div className="text-right">
                            <p className="font-semibold text-green-600">
                              {formatCurrency(submission.earnedAmount || 0)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatViews(submission.totalViews || 0)} views
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mb-3" />
                <p className="font-medium">No active creators yet</p>
                <p className="text-sm text-muted-foreground">Approved creators will appear here</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="mt-6">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <TrendingUp className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="font-medium">Analytics Coming Soon</p>
              <p className="text-sm text-muted-foreground">
                Detailed performance metrics will be available here
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Application</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this application. The creator will be notified.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Enter reason for rejection..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedSubmission && rejectReason) {
                  rejectSubmission.mutate({
                    submissionId: selectedSubmission.id,
                    reason: rejectReason,
                  });
                }
              }}
              disabled={!rejectReason || rejectSubmission.isPending}
            >
              {rejectSubmission.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rejecting...
                </>
              ) : (
                "Reject Application"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
