"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  ArrowRight,
  Upload,
  Instagram,
  Linkedin,
  Twitter,
  Check,
  Lightbulb,
  Link as LinkIcon,
} from "lucide-react";
import { trpc } from "@/trpc/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Link from "next/link";

const platforms = [
  { id: "INSTAGRAM", label: "Instagram", icon: Instagram },
  { id: "LINKEDIN", label: "LinkedIn", icon: Linkedin },
  { id: "TWITTER", label: "X (Twitter)", icon: Twitter },
];

export default function ConfigureCampaignPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const campaignId = searchParams.get("id");
  const campaignType = searchParams.get("type") || "UGC";

  const [formData, setFormData] = useState({
    name: "",
    productName: "",
    campaignBrief: "",
    contentGuidelines: "",
    assetsLink: "",
    rules: "",
    targetPlatforms: ["INSTAGRAM"] as string[],
    coverImage: "",
  });

  // Payout structure state
  const [payoutStructure, setPayoutStructure] = useState({
    fixedPayout: { min: 500, max: 2000 },
    performanceBonus: { min: 100, max: 500 },
  });

  const updateCampaign = trpc.campaign.updateCampaign.useMutation({
    onSuccess: () => {
      router.push(`/campaigns/new/budget?id=${campaignId}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save campaign");
    },
  });

  const handlePlatformToggle = (platformId: string) => {
    setFormData((prev) => ({
      ...prev,
      targetPlatforms: prev.targetPlatforms.includes(platformId)
        ? prev.targetPlatforms.filter((p) => p !== platformId)
        : [...prev.targetPlatforms, platformId],
    }));
  };

  const handleContinue = () => {
    if (!formData.name) {
      toast.error("Please enter a campaign name");
      return;
    }

    updateCampaign.mutate({
      id: campaignId!,
      name: formData.name,
      productName: formData.productName,
      campaignBrief: formData.campaignBrief,
      contentGuidelines: formData.contentGuidelines,
      assetsLink: formData.assetsLink,
      rules: formData.rules,
      targetPlatforms: formData.targetPlatforms as any[],
      coverImage: formData.coverImage,
      minPayoutPerView: payoutStructure.performanceBonus.min,
      maxPayoutPerView: payoutStructure.performanceBonus.max,
      fixedPayout: payoutStructure.fixedPayout.min,
    });
  };

  const getPageTitle = () => {
    switch (campaignType) {
      case "CLIPPING":
        return "Configure Clipping Campaign";
      case "UGC":
        return "Configure UGC Campaign";
      case "JUST_POSTING":
        return "Configure Just Posting Campaign";
      default:
        return "Configure Campaign";
    }
  };

  const getPageDescription = () => {
    switch (campaignType) {
      case "CLIPPING":
        return "Define your product details, creative brief, and budget for your viral campaign.";
      case "UGC":
        return "Define your campaign details, rules, and budget for User Generated Content.";
      case "JUST_POSTING":
        return "Define your campaign details, rules, and budget for Image Posting.";
      default:
        return "Configure your campaign settings.";
    }
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
        <span className="text-foreground font-medium">Configure {campaignType}</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{getPageTitle()}</h1>
        <p className="text-muted-foreground mt-1">{getPageDescription()}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Campaign Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                  1
                </span>
                {campaignType === "CLIPPING" ? "Product & Content" : "Campaign Details"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  {campaignType === "CLIPPING" ? "Product Name" : "Name of campaign"}
                </Label>
                <Input
                  id="name"
                  placeholder={campaignType === "CLIPPING" ? "e.g. Smart Fitness Watch" : "e.g. Summer Video Challenge"}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              {campaignType !== "CLIPPING" && (
                <div className="space-y-2">
                  <Label htmlFor="assetsLink">Provide assets link</Label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="assetsLink"
                      className="pl-10"
                      placeholder="https://drive.google.com/..."
                      value={formData.assetsLink}
                      onChange={(e) => setFormData({ ...formData, assetsLink: e.target.value })}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Link to a folder with your logos, brand guidelines, or product shots.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="brief">
                  {campaignType === "CLIPPING" ? "Campaign Brief" : "Rules for campaign"}
                </Label>
                <Textarea
                  id="brief"
                  placeholder={
                    campaignType === "CLIPPING"
                      ? "Create viral clipping videos to make trend showing product/service"
                      : "Describe the content requirements, dos and don'ts for creators..."
                  }
                  rows={4}
                  value={formData.campaignBrief || formData.rules}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      campaignBrief: e.target.value,
                      rules: e.target.value,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground text-right">
                  {(formData.campaignBrief || formData.rules).length}/500 characters
                </p>
              </div>

              {campaignType === "CLIPPING" && (
                <div className="space-y-2">
                  <Label htmlFor="guidelines">Content Guidelines</Label>
                  <Textarea
                    id="guidelines"
                    placeholder="Use assets from drive&#10;Use viral hooks and songs"
                    rows={3}
                    value={formData.contentGuidelines}
                    onChange={(e) => setFormData({ ...formData, contentGuidelines: e.target.value })}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Targeting & Assets */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                  2
                </span>
                {campaignType === "CLIPPING" ? "Campaign Settings" : "Platforms"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Target Platforms</Label>
                <div className="flex flex-wrap gap-2">
                  {platforms.map((platform) => (
                    <button
                      key={platform.id}
                      type="button"
                      onClick={() => handlePlatformToggle(platform.id)}
                      className={cn(
                        "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                        formData.targetPlatforms.includes(platform.id)
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                    >
                      <platform.icon className="h-4 w-4" />
                      {platform.label}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payout Structure */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                  3
                </span>
                Payout Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border-2 border-primary bg-primary/5 p-4">
                  <p className="text-sm text-muted-foreground">
                    {campaignType === "CLIPPING" ? "Per View" : "Fixed Payout"}
                  </p>
                  <p className="text-2xl font-bold text-primary">
                    ₹{payoutStructure.fixedPayout.min.toLocaleString()}-{payoutStructure.fixedPayout.max.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {campaignType === "CLIPPING" ? "per 1K views" : "per approved post"}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Performance Bonus</p>
                  <p className="text-2xl font-bold">
                    ₹{payoutStructure.performanceBonus.min.toLocaleString()}-{payoutStructure.performanceBonus.max.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {campaignType === "CLIPPING" ? "per conversion" : "per 1K views"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Cover Image Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {campaignType === "CLIPPING" ? "Product Image" : "Campaign Cover"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-sm font-medium">Click to upload</p>
                <p className="text-xs text-muted-foreground">SVG, PNG, JPG (max 2MB)</p>
              </div>
            </CardContent>
          </Card>

          {/* Tips */}
          <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-amber-800 dark:text-amber-200">
                <Lightbulb className="h-5 w-5" />
                Tips for success
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-amber-700 dark:text-amber-300">
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 mt-0.5 shrink-0" />
                <p>Use a clear, catchy name for your campaign to attract creators.</p>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 mt-0.5 shrink-0" />
                <p>Short durations (under 14 days) create urgency but may limit reach.</p>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 mt-0.5 shrink-0" />
                <p>Ensure your start date gives you at least 24h to approve assets.</p>
              </div>
              <Link href="#" className="text-primary hover:underline inline-flex items-center gap-1 mt-2">
                View Best Practices
                <ArrowRight className="h-3 w-3" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button variant="outline" asChild>
          <Link href="/campaigns/new" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
        <Button
          onClick={handleContinue}
          disabled={updateCampaign.isPending}
          className="gap-2"
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
