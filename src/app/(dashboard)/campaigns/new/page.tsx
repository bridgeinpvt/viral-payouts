"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Scissors,
  Video,
  Share2,
  Check,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { trpc } from "@/trpc/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Link from "next/link";

type CampaignType = "CLIPPING" | "UGC" | "JUST_POSTING";

interface RewardOption {
  type: CampaignType;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ElementType;
  features: string[];
  payoutExample: string;
  popular?: boolean;
}

const rewardOptions: RewardOption[] = [
  {
    type: "CLIPPING",
    title: "Clipping",
    subtitle: "Trendy / viral",
    description: "Create viral clipping videos to make trend showing your product/service",
    icon: Scissors,
    features: [
      "Clip hooks",
      "Make videos",
      "Use trendy audio",
    ],
    payoutExample: "₹50-200 per 1K views",
  },
  {
    type: "UGC",
    title: "UGC",
    subtitle: "Creators / content",
    description: "Get authentic user-generated content from verified creators",
    icon: Video,
    features: [
      "Face videos",
      "Unboxing product",
      "Details and edits",
      "Sounds all",
    ],
    payoutExample: "₹500-2,000 per post + ₹100-500 per 1K views",
    popular: true,
  },
  {
    type: "JUST_POSTING",
    title: "Just Posting",
    subtitle: "Community / post",
    description: "Simple product image sharing and tagging to brand account",
    icon: Share2,
    features: [
      "Share product images",
      "Tag to brand account",
      "Easy participation",
    ],
    payoutExample: "₹100-500 per approved post",
  },
];

export default function SelectRewardPage() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<CampaignType | null>(null);

  const createCampaign = trpc.campaign.createCampaign.useMutation({
    onSuccess: (campaign) => {
      router.push(`/campaigns/new/configure?id=${campaign.id}&type=${campaign.type}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create campaign");
    },
  });

  const handleContinue = () => {
    if (!selectedType) {
      toast.error("Please select a campaign type");
      return;
    }
    createCampaign.mutate({ type: selectedType });
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/campaigns" className="hover:text-foreground">
          Campaigns
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">Select Reward</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Select Your Viral Reward</h1>
        <p className="text-muted-foreground mt-1">
          Choose the campaign style that best fits your marketing goals to start generating authentic engagement.
        </p>
      </div>

      {/* Reward Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {rewardOptions.map((option) => (
          <Card
            key={option.type}
            className={cn(
              "relative cursor-pointer transition-all hover:shadow-lg",
              selectedType === option.type
                ? "border-2 border-primary ring-2 ring-primary/20"
                : "border-border hover:border-primary/50"
            )}
            onClick={() => setSelectedType(option.type)}
          >
            {option.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                  <Sparkles className="h-3 w-3" />
                  POPULAR
                </span>
              </div>
            )}

            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className={cn(
                  "rounded-xl p-3",
                  selectedType === option.type ? "bg-primary text-primary-foreground" : "bg-muted"
                )}>
                  <option.icon className="h-6 w-6" />
                </div>
                {selectedType === option.type && (
                  <div className="rounded-full bg-primary p-1">
                    <Check className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
              </div>
              <CardTitle className="mt-4">{option.title}</CardTitle>
              <CardDescription>{option.subtitle}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{option.description}</p>

              <ul className="space-y-2">
                {option.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500" />
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="rounded-lg bg-muted p-3">
                <p className="text-xs text-muted-foreground">Payout Example</p>
                <p className="text-sm font-medium text-foreground">{option.payoutExample}</p>
              </div>

              <Button
                variant={selectedType === option.type ? "default" : "outline"}
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedType(option.type);
                }}
              >
                {selectedType === option.type ? "Selected" : `Use ${option.title}`}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bottom CTA */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="flex items-center justify-between p-6">
          <div>
            <h3 className="font-semibold text-lg">Ready to go viral?</h3>
            <p className="text-sm text-muted-foreground">
              Start your first campaign today and watch your engagement soar.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" asChild>
              <Link href="/campaigns">View Demo</Link>
            </Button>
            <Button
              onClick={handleContinue}
              disabled={!selectedType || createCampaign.isPending}
              className="gap-2"
            >
              Create Campaign
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
