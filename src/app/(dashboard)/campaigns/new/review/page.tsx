"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Check,
  Edit2,
  Calendar,
  DollarSign,
  Users,
  Target,
  Megaphone,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { trpc } from "@/trpc/client";
import { toast } from "sonner";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

export default function ReviewCampaignPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const campaignId = searchParams.get("id");

  const { data: campaign, isLoading } = trpc.campaign.getCampaign.useQuery(
    { id: campaignId! },
    { enabled: !!campaignId }
  );

  const publishCampaign = trpc.campaign.publishCampaign.useMutation({
    onSuccess: () => {
      router.push(`/campaigns/live/${campaignId}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to publish campaign");
    },
  });

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
          <Link href="/campaigns/new">Create New Campaign</Link>
        </Button>
      </div>
    );
  }

  const handlePublish = () => {
    publishCampaign.mutate({ id: campaignId! });
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/campaigns" className="hover:text-foreground">
          Campaigns
        </Link>
        <span>/</span>
        <Link href="/campaigns/new" className="hover:text-foreground">
          Select Reward
        </Link>
        <span>/</span>
        <span className="text-muted-foreground">Configure</span>
        <span>/</span>
        <span className="text-muted-foreground">Budget</span>
        <span>/</span>
        <span className="text-foreground font-medium">Review</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Review & Publish</h1>
        <p className="text-muted-foreground mt-1">
          Review your campaign settings before going live.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Campaign Overview */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Megaphone className="h-5 w-5 text-primary" />
                  Campaign Details
                </CardTitle>
                <CardDescription>Basic information about your campaign</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/campaigns/new/configure?id=${campaignId}`}>
                  <Edit2 className="h-4 w-4 mr-1" />
                  Edit
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Campaign Name</p>
                  <p className="font-medium">{campaign.name || "Untitled Campaign"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Campaign Type</p>
                  <Badge variant="secondary">{campaign.type}</Badge>
                </div>
                {campaign.productName && (
                  <div>
                    <p className="text-sm text-muted-foreground">Product</p>
                    <p className="font-medium">{campaign.productName}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Platforms</p>
                  <div className="flex gap-1 mt-1">
                    {campaign.targetPlatforms.map((platform) => (
                      <Badge key={platform} variant="outline" className="text-xs">
                        {platform}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              {campaign.campaignBrief && (
                <div>
                  <p className="text-sm text-muted-foreground">Campaign Brief</p>
                  <p className="text-sm mt-1">{campaign.campaignBrief}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Budget & Duration */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  Budget & Duration
                </CardTitle>
                <CardDescription>Investment and timeline details</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/campaigns/new/budget?id=${campaignId}`}>
                  <Edit2 className="h-4 w-4 mr-1" />
                  Edit
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-sm text-muted-foreground">Total Budget</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(campaign.totalBudget)}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-sm text-muted-foreground">Duration</p>
                  <p className="text-2xl font-bold">{campaign.duration} Days</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-sm text-muted-foreground">Timeline</p>
                  <p className="text-sm font-medium">
                    {formatDate(campaign.startDate)} - {formatDate(campaign.endDate)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Target Audience */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Target Audience
                </CardTitle>
                <CardDescription>Who will see your campaign</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/campaigns/new/budget?id=${campaignId}`}>
                  <Edit2 className="h-4 w-4 mr-1" />
                  Edit
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {campaign.targetAudience.length > 0 ? (
                  campaign.targetAudience.map((audience) => (
                    <Badge key={audience} variant="secondary" className="px-3 py-1">
                      {audience}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">All audiences</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payout Structure */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Payout Structure
              </CardTitle>
              <CardDescription>How creators will be compensated</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {campaign.fixedPayout && (
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">Fixed Payout</p>
                    <p className="text-xl font-bold">{formatCurrency(campaign.fixedPayout)}</p>
                    <p className="text-xs text-muted-foreground">per approved post</p>
                  </div>
                )}
                {campaign.minPayoutPerView && (
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">Per View Bonus</p>
                    <p className="text-xl font-bold">
                      {formatCurrency(campaign.minPayoutPerView)} - {formatCurrency(campaign.maxPayoutPerView || campaign.minPayoutPerView)}
                    </p>
                    <p className="text-xs text-muted-foreground">per 1K views</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Publish Card */}
          <Card className="border-primary">
            <CardHeader>
              <CardTitle>Ready to Launch?</CardTitle>
              <CardDescription>
                Your campaign will go live immediately after publishing.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>Campaign details complete</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>Budget set ({formatCurrency(campaign.totalBudget)})</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>Target audience selected</span>
                </div>
              </div>
              <Button
                className="w-full"
                size="lg"
                onClick={handlePublish}
                disabled={publishCampaign.isPending}
              >
                {publishCampaign.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  "Review & Publish"
                )}
              </Button>
              <Button variant="outline" className="w-full">
                Save Draft
              </Button>
            </CardContent>
          </Card>

          {/* Estimated Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Estimated Performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Est. Impressions</span>
                <span className="font-medium">
                  {((campaign.totalBudget / 100) * 1000 / 1000000).toFixed(1)}L+
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Est. Creators</span>
                <span className="font-medium">15-25</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Est. Content Pieces</span>
                <span className="font-medium">40-60</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button variant="outline" asChild>
          <Link href={`/campaigns/new/budget?id=${campaignId}`} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
      </div>
    </div>
  );
}
