"use client";

import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Scissors,
  Video,
  Share2,
  Clock,
  DollarSign,
  Eye,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Upload,
  ExternalLink,
  Calendar,
  Target,
  Link as LinkIcon,
  Instagram,
  Linkedin,
  Twitter,
  Copy,
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

const typeColors: Record<string, string> = {
  CLIPPING: "bg-purple-100 text-purple-700",
  UGC: "bg-blue-100 text-blue-700",
  JUST_POSTING: "bg-green-100 text-green-700",
};

const platformIcons: Record<string, React.ElementType> = {
  INSTAGRAM: Instagram,
  LINKEDIN: Linkedin,
  TWITTER: Twitter,
};

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType; description: string }> = {
  PENDING: {
    label: "Pending Review",
    color: "bg-yellow-100 text-yellow-700",
    icon: Clock,
    description: "Your application is being reviewed by the brand",
  },
  APPROVED: {
    label: "Approved",
    color: "bg-green-100 text-green-700",
    icon: CheckCircle2,
    description: "You've been approved! Submit your content to start earning",
  },
  REJECTED: {
    label: "Rejected",
    color: "bg-red-100 text-red-700",
    icon: XCircle,
    description: "Your application was not approved",
  },
  SUBMITTED: {
    label: "Content Submitted",
    color: "bg-blue-100 text-blue-700",
    icon: Upload,
    description: "Your content is being reviewed",
  },
  COMPLETED: {
    label: "Completed",
    color: "bg-primary/10 text-primary",
    icon: CheckCircle2,
    description: "Campaign completed successfully",
  },
};

export default function SubmissionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const submissionId = params.id as string;

  const { data: submission, isLoading } = trpc.campaign.getSubmission.useQuery(
    { id: submissionId },
    { enabled: !!submissionId }
  );

  const formatViews = (views: number) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views.toString();
  };

  const copyLink = () => {
    if (submission?.contentUrl) {
      navigator.clipboard.writeText(submission.contentUrl);
      toast.success("Link copied!");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Submission not found</p>
        <Button asChild>
          <Link href="/my-campaigns">Back to My Campaigns</Link>
        </Button>
      </div>
    );
  }

  const campaign = submission.campaign;
  const TypeIcon = typeIcons[campaign.type] || Video;
  const status = statusConfig[submission.status];
  const StatusIcon = status.icon;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" size="sm" asChild className="gap-2">
        <Link href="/my-campaigns">
          <ArrowLeft className="h-4 w-4" />
          Back to My Campaigns
        </Link>
      </Button>

      {/* Status Banner */}
      <Card className={cn("border-l-4",
        submission.status === "APPROVED" && "border-l-green-500",
        submission.status === "PENDING" && "border-l-yellow-500",
        submission.status === "REJECTED" && "border-l-red-500",
        submission.status === "SUBMITTED" && "border-l-blue-500",
        submission.status === "COMPLETED" && "border-l-primary"
      )}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-full", status.color)}>
                <StatusIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">{status.label}</p>
                <p className="text-sm text-muted-foreground">{status.description}</p>
              </div>
            </div>
            {submission.status === "APPROVED" && (
              <Button asChild>
                <Link href={`/my-campaigns/${submissionId}/submit`}>
                  <Upload className="h-4 w-4 mr-2" />
                  Submit Content
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Campaign Info */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
                  <TypeIcon className="h-7 w-7 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={cn("gap-1", typeColors[campaign.type])}>
                      <TypeIcon className="h-3 w-3" />
                      {campaign.type === "JUST_POSTING" ? "Just Posting" : campaign.type}
                    </Badge>
                  </div>
                  <h1 className="text-xl font-bold">
                    {campaign.name || campaign.productName || "Campaign"}
                  </h1>
                  <p className="text-muted-foreground">
                    by {campaign.brand.brandProfile?.companyName || campaign.brand.name}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Campaign Brief */}
          <Card>
            <CardHeader>
              <CardTitle>Campaign Brief</CardTitle>
            </CardHeader>
            <CardContent>
              {campaign.campaignBrief ? (
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {campaign.campaignBrief}
                </p>
              ) : (
                <p className="text-muted-foreground italic">No brief provided</p>
              )}
            </CardContent>
          </Card>

          {/* Content Guidelines */}
          {campaign.contentGuidelines && (
            <Card>
              <CardHeader>
                <CardTitle>Content Guidelines</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none text-muted-foreground">
                  <p className="whitespace-pre-wrap">{campaign.contentGuidelines}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Submitted Content */}
          {submission.contentUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LinkIcon className="h-5 w-5" />
                  Your Submitted Content
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30">
                  <div className="flex-1 truncate text-sm">
                    {submission.contentUrl}
                  </div>
                  <Button variant="ghost" size="icon" onClick={copyLink}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" asChild>
                    <a href={submission.contentUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
                {submission.platform && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Platform:</span>
                    <Badge variant="outline" className="gap-1">
                      {platformIcons[submission.platform] && (
                        (() => {
                          const PIcon = platformIcons[submission.platform];
                          return <PIcon className="h-3 w-3" />;
                        })()
                      )}
                      {submission.platform}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Earnings Card */}
          <Card>
            <CardHeader>
              <CardTitle>Your Earnings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-primary/5 p-4 text-center">
                <p className="text-sm text-muted-foreground mb-1">Total Earned</p>
                <p className="text-3xl font-bold text-primary">
                  {formatCurrency(submission.earnedAmount || 0)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Views</p>
                  <p className="text-lg font-semibold">
                    {formatViews(submission.totalViews || 0)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Engagement</p>
                  <p className="text-lg font-semibold">
                    {((submission.engagementRate || 0) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payout Structure */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payout Structure</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {campaign.fixedPayout && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Fixed Payout</span>
                  <span className="font-medium">{formatCurrency(campaign.fixedPayout)}</span>
                </div>
              )}
              {campaign.minPayoutPerView && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Per 1K Views</span>
                  <span className="font-medium">
                    {formatCurrency(campaign.minPayoutPerView)} - {formatCurrency(campaign.maxPayoutPerView || campaign.minPayoutPerView)}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Applied</span>
                <span className="font-medium">
                  {new Date(submission.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
              {submission.approvedAt && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Approved</span>
                  <span className="font-medium">
                    {new Date(submission.approvedAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              )}
              {submission.submittedAt && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Content Submitted</span>
                  <span className="font-medium">
                    {new Date(submission.submittedAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              )}
              <div className="h-px bg-border" />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Campaign Ends</span>
                <span className="font-medium">
                  {new Date(campaign.endDate).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Selected Platforms */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your Platforms</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {submission.selectedPlatforms?.map((platform: string) => {
                  const PlatformIcon = platformIcons[platform] || Share2;
                  return (
                    <Badge key={platform} variant="secondary" className="gap-1 px-3 py-1">
                      <PlatformIcon className="h-4 w-4" />
                      {platform}
                    </Badge>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
