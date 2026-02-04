"use client";

import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Rocket,
  Eye,
  Plus,
  ArrowRight,
  CheckCircle2,
  Calendar,
  DollarSign,
  Share2,
  Copy,
  ExternalLink,
} from "lucide-react";
import { trpc } from "@/trpc/client";
import { toast } from "sonner";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { useEffect, useState } from "react";
import confetti from "canvas-confetti";

export default function CampaignLivePage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;
  const [showConfetti, setShowConfetti] = useState(true);

  const { data: campaign, isLoading } = trpc.campaign.getCampaign.useQuery(
    { id: campaignId },
    { enabled: !!campaignId }
  );

  useEffect(() => {
    if (showConfetti) {
      // Fire confetti
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;

      const randomInRange = (min: number, max: number) => {
        return Math.random() * (max - min) + min;
      };

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          clearInterval(interval);
          setShowConfetti(false);
          return;
        }

        const particleCount = 50 * (timeLeft / duration);

        confetti({
          particleCount,
          startVelocity: 30,
          spread: 360,
          origin: {
            x: randomInRange(0.1, 0.9),
            y: Math.random() - 0.2,
          },
          colors: ["#7847eb", "#a78bfa", "#c4b5fd", "#22c55e", "#fbbf24"],
        });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [showConfetti]);

  const copyLink = () => {
    const link = `${window.location.origin}/c/${campaignId}`;
    navigator.clipboard.writeText(link);
    toast.success("Campaign link copied!");
  };

  if (isLoading || !campaign) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-pulse text-center">
          <Rocket className="h-16 w-16 text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading campaign...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-8">
      {/* Success Animation */}
      <div className="text-center space-y-4">
        <div className="relative inline-flex">
          <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping" />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-green-600 mx-auto">
            <Rocket className="h-12 w-12 text-white" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-foreground">Campaign is Live!</h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Your campaign has been successfully published. Creators can now view your brief and submit content.
        </p>
      </div>

      {/* Campaign Summary Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg">CAMPAIGN SUMMARY</CardTitle>
          <Badge variant="default" className="bg-green-500 hover:bg-green-600">
            <span className="relative flex h-2 w-2 mr-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
            </span>
            Active
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Product</p>
              <p className="font-semibold text-lg">{campaign.name || campaign.productName || "Campaign"}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Budget</p>
                <p className="font-semibold">{formatCurrency(campaign.totalBudget)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Duration</p>
                <p className="font-semibold">{campaign.duration} Days</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Share Campaign */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Your Campaign
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 rounded-lg border bg-muted px-4 py-2 text-sm truncate">
              {`${typeof window !== 'undefined' ? window.location.origin : ''}/c/${campaignId}`}
            </div>
            <Button variant="outline" size="icon" onClick={copyLink}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" asChild>
              <a href={`/c/${campaignId}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Share this link with creators or on social media to get more submissions.
          </p>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button className="flex-1 gap-2" size="lg" asChild>
          <Link href={`/campaigns/${campaignId}`}>
            <Eye className="h-5 w-5" />
            Manage Campaign
          </Link>
        </Button>
        <Button variant="outline" className="flex-1 gap-2" size="lg" asChild>
          <Link href={`/campaigns/${campaignId}`}>
            <Eye className="h-5 w-5" />
            View Details
          </Link>
        </Button>
        <Button variant="outline" className="flex-1 gap-2" size="lg" asChild>
          <Link href="/campaigns/new">
            <Plus className="h-5 w-5" />
            New Campaign
          </Link>
        </Button>
      </div>

      {/* What's Next */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-base">What happens next?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                1
              </div>
              <div>
                <p className="font-medium">Creators discover your campaign</p>
                <p className="text-sm text-muted-foreground">
                  Your campaign is now visible in the marketplace for creators to browse.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                2
              </div>
              <div>
                <p className="font-medium">Creators apply & submit content</p>
                <p className="text-sm text-muted-foreground">
                  Review submissions and approve content that meets your guidelines.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                3
              </div>
              <div>
                <p className="font-medium">Track performance & payouts</p>
                <p className="text-sm text-muted-foreground">
                  Monitor views, engagement, and automatic creator payouts in real-time.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
