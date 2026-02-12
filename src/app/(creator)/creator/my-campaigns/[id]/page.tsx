"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { trpc } from "@/trpc/client";
import { Platform } from "@prisma/client";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const statusColors: Record<string, string> = {
  APPLIED: "bg-yellow-100 text-yellow-700 border-yellow-200",
  APPROVED: "bg-blue-100 text-blue-700 border-blue-200",
  ACTIVE: "bg-green-100 text-green-700 border-green-200",
  COMPLETED: "bg-gray-100 text-gray-700 border-gray-200",
  REJECTED: "bg-red-100 text-red-700 border-red-200",
  FROZEN: "bg-purple-100 text-purple-700 border-purple-200",
};

const typeLabels: Record<string, string> = {
  VIEW: "Views",
  CLICK: "Clicks",
  CONVERSION: "Conversions",
};

const platformLabels: Record<Platform, string> = {
  INSTAGRAM: "Instagram",
  YOUTUBE: "YouTube",
  TWITTER: "Twitter",
  LINKEDIN: "LinkedIn",
  TIKTOK: "TikTok",
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function CreatorCampaignDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const utils = trpc.useUtils();

  const { data: participation, isLoading } =
    trpc.campaign.getMyParticipation.useQuery({ id });

  const submitMutation = trpc.campaign.submitContent.useMutation({
    onSuccess: () => {
      utils.campaign.getMyParticipation.invalidate({ id });
      setContentUrl("");
      setCaption("");
      alert("Content submitted successfully!");
    },
    onError: (error) => {
      alert(error.message || "Failed to submit content. Please try again.");
    },
  });

  const [contentUrl, setContentUrl] = useState("");
  const [platform, setPlatform] = useState<Platform | "">("");
  const [caption, setCaption] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  function handleCopy(text: string, label: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  function handleSubmitContent() {
    if (!contentUrl) {
      alert("Please enter your content URL.");
      return;
    }
    if (!platform) {
      alert("Please select a platform.");
      return;
    }
    submitMutation.mutate({
      participationId: id,
      contentUrl,
      platform,
      caption: caption || undefined,
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!participation) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Participation not found.</p>
        <Button variant="outline" className="mt-4" asChild>
          <a href="/creator/my-campaigns">Back to My Campaigns</a>
        </Button>
      </div>
    );
  }

  const { campaign, trackingLink, promoCode, metrics } = participation;
  const trackingUrl = trackingLink
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/go/${trackingLink.slug}`
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{campaign.name}</h1>
            <Badge className={statusColors[participation.status]}>
              {participation.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            by {campaign.brand.brandProfile?.companyName ?? campaign.brand.name}{" "}
            &middot; {typeLabels[campaign.type] ?? campaign.type} Campaign
          </p>
        </div>
        <Button variant="outline" asChild>
          <a href="/creator/my-campaigns">Back to My Campaigns</a>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Campaign Info */}
        <Card>
          <CardHeader>
            <CardTitle>Campaign Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {campaign.description && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Description
                </p>
                <p className="text-sm">{campaign.description}</p>
              </div>
            )}

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">
                Payout
              </p>
              <p className="text-sm font-semibold">
                {campaign.type === "VIEW" &&
                  `₹${campaign.payoutPer1KViews ?? 0} per 1K views`}
                {campaign.type === "CLICK" &&
                  `₹${campaign.payoutPerClick ?? 0} per click`}
                {campaign.type === "CONVERSION" &&
                  `₹${campaign.payoutPerSale ?? 0} per sale`}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {campaign.campaignBrief && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Campaign Brief
                </p>
                <p className="text-sm whitespace-pre-wrap">
                  {campaign.campaignBrief}
                </p>
              </div>
            )}
            {campaign.contentGuidelines && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Content Guidelines
                </p>
                <p className="text-sm whitespace-pre-wrap">
                  {campaign.contentGuidelines}
                </p>
              </div>
            )}
            {campaign.rules && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Rules
                </p>
                <p className="text-sm whitespace-pre-wrap">{campaign.rules}</p>
              </div>
            )}
            {!campaign.campaignBrief &&
              !campaign.contentGuidelines &&
              !campaign.rules && (
                <p className="text-sm text-muted-foreground">
                  No specific instructions provided.
                </p>
              )}
          </CardContent>
        </Card>
      </div>

      {/* Tracking Link (CLICK campaigns) */}
      {campaign.type === "CLICK" && trackingLink && trackingUrl && (
        <Card>
          <CardHeader>
            <CardTitle>Your Tracking Link</CardTitle>
            <CardDescription>
              Share this link with your audience. Clicks will be tracked
              automatically.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Input
                readOnly
                value={trackingUrl}
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                onClick={() => handleCopy(trackingUrl, "link")}
              >
                {copied === "link" ? "Copied!" : "Copy"}
              </Button>
            </div>
            {trackingLink.destinationUrl && (
              <p className="text-xs text-muted-foreground mt-2">
                Redirects to: {trackingLink.destinationUrl}
              </p>
            )}
            <p className="text-sm text-muted-foreground mt-2">
              Total clicks: <span className="font-medium">{trackingLink.totalClicks}</span>
            </p>
          </CardContent>
        </Card>
      )}

      {/* Promo Code (CONVERSION campaigns) */}
      {campaign.type === "CONVERSION" && promoCode && (
        <Card>
          <CardHeader>
            <CardTitle>Your Promo Code</CardTitle>
            <CardDescription>
              Share this code with your audience for conversions to be tracked.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="flex-1 rounded-md border bg-muted px-4 py-2.5 font-mono text-lg font-semibold tracking-wider">
                {promoCode.code}
              </div>
              <Button
                variant="outline"
                onClick={() => handleCopy(promoCode.code, "code")}
              >
                {copied === "code" ? "Copied!" : "Copy"}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Total uses: <span className="font-medium">{promoCode.totalUses}</span>
            </p>
          </CardContent>
        </Card>
      )}

      {/* Content Submission */}
      {(participation.status === "APPROVED" ||
        participation.status === "ACTIVE") && (
        <Card>
          <CardHeader>
            <CardTitle>Submit Content</CardTitle>
            <CardDescription>
              Submit the URL of your published content for verification.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {participation.contentUrl && (
              <div className="rounded-md border bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground mb-1">
                  Previously submitted
                </p>
                <a
                  href={participation.contentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary underline break-all"
                >
                  {participation.contentUrl}
                </a>
                {participation.platform && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({platformLabels[participation.platform as Platform] ?? participation.platform})
                  </span>
                )}
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                placeholder="https://instagram.com/p/..."
                value={contentUrl}
                onChange={(e) => setContentUrl(e.target.value)}
                className="flex-1"
              />
              <Select
                value={platform}
                onValueChange={(val) => setPlatform(val as Platform)}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Platform" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(platformLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input
              placeholder="Caption or notes (optional)"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
            <Button
              onClick={handleSubmitContent}
              disabled={submitMutation.isPending}
            >
              {submitMutation.isPending ? "Submitting..." : "Submit Content"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Metrics */}
      {metrics && (
        <Card>
          <CardHeader>
            <CardTitle>Live Metrics</CardTitle>
            <CardDescription>
              Your performance and earnings for this campaign.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="rounded-lg border p-4 text-center">
                <p className="text-2xl font-bold">
                  {metrics.verifiedViews.toLocaleString("en-IN")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Verified Views
                </p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <p className="text-2xl font-bold">
                  {metrics.verifiedClicks.toLocaleString("en-IN")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Verified Clicks
                </p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <p className="text-2xl font-bold">
                  {metrics.verifiedConversions.toLocaleString("en-IN")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Conversions
                </p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(metrics.earnedAmount)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Earned</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(metrics.paidAmount)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Paid Out</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
