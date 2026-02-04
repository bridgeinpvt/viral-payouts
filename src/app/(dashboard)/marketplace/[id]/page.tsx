"use client";

import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Scissors,
  Video,
  Share2,
  Clock,
  DollarSign,
  Users,
  Bookmark,
  BookmarkCheck,
  Calendar,
  Target,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  Instagram,
  Linkedin,
  Twitter,
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

export default function CampaignDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const campaignId = params.id as string;
  const shouldOpenApply = searchParams.get("apply") === "true";

  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  useEffect(() => {
    if (shouldOpenApply) {
      setShowApplyDialog(true);
    }
  }, [shouldOpenApply]);

  const { data: campaign, isLoading } = trpc.campaign.getCampaign.useQuery(
    { id: campaignId },
    { enabled: !!campaignId }
  );

  const { data: savedCampaigns } = trpc.campaign.getSavedCampaigns.useQuery();
  const isSaved = savedCampaigns?.some((c) => c.id === campaignId);

  const toggleSave = trpc.campaign.toggleSaveCampaign.useMutation({
    onSuccess: (data) => {
      toast.success(data.saved ? "Campaign saved" : "Campaign removed from saved");
    },
  });

  const applyToCampaign = trpc.campaign.applyToCampaign.useMutation({
    onSuccess: () => {
      toast.success("Application submitted successfully!");
      setShowApplyDialog(false);
      router.push("/my-campaigns");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to apply");
    },
  });

  const getDaysRemaining = (endDate: Date | string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  const getPayoutRemaining = (campaign: any) => {
    const remaining = campaign.totalBudget - campaign.spentBudget;
    const percentage = Math.round((remaining / campaign.totalBudget) * 100);
    return { remaining, percentage };
  };

  const handleApply = () => {
    if (selectedPlatforms.length === 0) {
      toast.error("Please select at least one platform");
      return;
    }
    if (!agreedToTerms) {
      toast.error("Please agree to the terms");
      return;
    }
    applyToCampaign.mutate({
      campaignId,
      platforms: selectedPlatforms,
    });
  };

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
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
          <Link href="/marketplace">Back to Marketplace</Link>
        </Button>
      </div>
    );
  }

  const TypeIcon = typeIcons[campaign.type] || Video;
  const daysRemaining = getDaysRemaining(campaign.endDate);
  const { remaining, percentage } = getPayoutRemaining(campaign);

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" size="sm" asChild className="gap-2">
        <Link href="/marketplace">
          <ArrowLeft className="h-4 w-4" />
          Back to Marketplace
        </Link>
      </Button>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-4">
                <Badge className={cn("gap-1", typeColors[campaign.type])}>
                  <TypeIcon className="h-3 w-3" />
                  {campaign.type === "JUST_POSTING" ? "Just Posting" : campaign.type}
                </Badge>
                <button
                  onClick={() => toggleSave.mutate({ campaignId })}
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  {isSaved ? (
                    <BookmarkCheck className="h-6 w-6 text-primary" />
                  ) : (
                    <Bookmark className="h-6 w-6" />
                  )}
                </button>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
                  <TypeIcon className="h-8 w-8 text-primary" />
                </div>
                <div className="flex-1">
                  <h1 className="text-2xl font-bold">
                    {campaign.name || campaign.productName || "Campaign"}
                  </h1>
                  <p className="text-muted-foreground">
                    by {campaign.brand.brandProfile?.companyName || campaign.brand.name}
                  </p>
                  {campaign.targetCategories[0] && (
                    <Badge variant="outline" className="mt-2">
                      {campaign.targetCategories[0]}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Campaign Brief */}
          <Card>
            <CardHeader>
              <CardTitle>Campaign Brief</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {campaign.campaignBrief ? (
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {campaign.campaignBrief}
                </p>
              ) : (
                <p className="text-muted-foreground italic">No brief provided</p>
              )}
            </CardContent>
          </Card>

          {/* Guidelines */}
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

          {/* Payout Structure */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Payout Structure
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {campaign.fixedPayout && (
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <p className="text-sm text-muted-foreground">Fixed Payout</p>
                    <p className="text-2xl font-bold text-primary">
                      {formatCurrency(campaign.fixedPayout)}
                    </p>
                    <p className="text-xs text-muted-foreground">per approved post</p>
                  </div>
                )}
                {campaign.minPayoutPerView && (
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <p className="text-sm text-muted-foreground">Per View Bonus</p>
                    <p className="text-2xl font-bold text-primary">
                      {formatCurrency(campaign.minPayoutPerView)} -{" "}
                      {formatCurrency(campaign.maxPayoutPerView || campaign.minPayoutPerView)}
                    </p>
                    <p className="text-xs text-muted-foreground">per 1K views</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Target Platforms */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Target Platforms
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {campaign.targetPlatforms.map((platform) => {
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

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Apply Card */}
          <Card className="border-primary sticky top-6">
            <CardHeader>
              <CardTitle>Join This Campaign</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Stats */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    Total Budget
                  </span>
                  <span className="font-semibold">{formatCurrency(campaign.totalBudget)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    Days Remaining
                  </span>
                  <span className="font-semibold">{daysRemaining} days</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    Participants
                  </span>
                  <span className="font-semibold">{campaign._count?.submissions || 0}</span>
                </div>
              </div>

              {/* Payout Remaining */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Payout Pool Remaining</span>
                  <span className="font-medium">{percentage}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(remaining)} remaining of {formatCurrency(campaign.totalBudget)}
                </p>
              </div>

              {/* Apply Button */}
              <Button className="w-full" size="lg" onClick={() => setShowApplyDialog(true)}>
                Apply Now
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Complete your application to participate
              </p>
            </CardContent>
          </Card>

          {/* Campaign Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Start Date</span>
                <span className="font-medium">
                  {new Date(campaign.startDate).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">End Date</span>
                <span className="font-medium">
                  {new Date(campaign.endDate).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Duration</span>
                <span className="font-medium">{campaign.duration} days</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Apply Dialog */}
      <Dialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Apply to Campaign</DialogTitle>
            <DialogDescription>
              Select the platforms where you'll post content for this campaign.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Platform Selection */}
            <div className="space-y-3">
              <Label>Select Platforms</Label>
              <div className="grid gap-2">
                {campaign.targetPlatforms.map((platform) => {
                  const PlatformIcon = platformIcons[platform] || Share2;
                  const isSelected = selectedPlatforms.includes(platform);
                  return (
                    <button
                      key={platform}
                      onClick={() => togglePlatform(platform)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border p-3 transition-colors",
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-full",
                          isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                        )}
                      >
                        <PlatformIcon className="h-4 w-4" />
                      </div>
                      <span className="font-medium">{platform}</span>
                      {isSelected && (
                        <CheckCircle2 className="h-5 w-5 text-primary ml-auto" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Terms Checkbox */}
            <div className="flex items-start space-x-2">
              <Checkbox
                id="terms"
                checked={agreedToTerms}
                onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
              />
              <Label htmlFor="terms" className="text-sm leading-snug">
                I agree to follow the campaign guidelines and terms of service.
                I understand that my content may be rejected if it doesn't meet the requirements.
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApplyDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleApply}
              disabled={applyToCampaign.isPending || selectedPlatforms.length === 0 || !agreedToTerms}
            >
              {applyToCampaign.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Application"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
