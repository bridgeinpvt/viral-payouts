"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  ArrowRight,
  Zap,
  Target,
  TrendingUp,
  Users,
  Briefcase,
  GraduationCap,
  Gamepad2,
  Cpu,
  Palette,
  Info,
} from "lucide-react";
import { trpc } from "@/trpc/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

const audienceTypes = [
  { id: "BUSINESS", label: "Business", icon: Briefcase },
  { id: "COLLEGE", label: "College", icon: GraduationCap },
  { id: "EDUCATORS", label: "Educators", icon: Users },
  { id: "GAMERS", label: "Gamers", icon: Gamepad2 },
  { id: "TECH", label: "Tech", icon: Cpu },
  { id: "ARTISTS", label: "Artists", icon: Palette },
];

const durationOptions = [
  { value: "7", label: "7 Days" },
  { value: "14", label: "14 Days" },
  { value: "30", label: "30 Days" },
  { value: "60", label: "60 Days" },
];

export default function BudgetTargetingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const campaignId = searchParams.get("id");

  const [budget, setBudget] = useState(50000);
  const [duration, setDuration] = useState("30");
  const [selectedAudiences, setSelectedAudiences] = useState<string[]>(["BUSINESS"]);

  // Calculate estimated reach based on budget
  const estimatedImpressions = Math.floor(budget / 100) * 1000; // ₹100 per 1K impressions
  const minImpressions = estimatedImpressions * 0.8;
  const maxImpressions = estimatedImpressions * 1.2;

  const updateCampaign = trpc.campaign.updateCampaign.useMutation({
    onSuccess: () => {
      router.push(`/campaigns/new/review?id=${campaignId}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save budget settings");
    },
  });

  const handleAudienceToggle = (audienceId: string) => {
    setSelectedAudiences((prev) =>
      prev.includes(audienceId)
        ? prev.filter((a) => a !== audienceId)
        : [...prev, audienceId]
    );
  };

  const handleContinue = () => {
    if (budget < 25000) {
      toast.error("Minimum budget is ₹25,000");
      return;
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + parseInt(duration));

    updateCampaign.mutate({
      id: campaignId!,
      totalBudget: budget,
      duration: parseInt(duration),
      startDate,
      endDate,
      targetAudience: selectedAudiences as any[],
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
        <span className="text-foreground font-medium">Budget & Targeting</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Budget & Targeting</h1>
          <p className="text-muted-foreground mt-1">
            Optimize your campaign reach by setting a budget and defining your audience.
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
          </span>
          Edit Campaign Details
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Budget & Reach */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Budget & Reach
              </CardTitle>
              <CardDescription>Define your investment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="budget" className="text-base">Set your budget</Label>
                  <span className="text-sm text-muted-foreground">INR</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                  <Input
                    id="budget"
                    type="number"
                    min={25000}
                    step={5000}
                    className="pl-8 text-lg font-semibold"
                    value={budget}
                    onChange={(e) => setBudget(parseInt(e.target.value) || 0)}
                  />
                </div>
                <input
                  type="range"
                  min={25000}
                  max={500000}
                  step={5000}
                  value={budget}
                  onChange={(e) => setBudget(parseInt(e.target.value))}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>₹25,000</span>
                  <span>₹5,00,000</span>
                </div>
              </div>

              <div className="rounded-lg bg-muted/50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Estimated Reach</span>
                </div>
                <p className="text-2xl font-bold text-primary">
                  {(minImpressions / 1000000).toFixed(2)}L - {(maxImpressions / 1000000).toFixed(2)}L
                  <span className="text-base font-normal text-muted-foreground ml-2">impressions</span>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Audience Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Select audience type
              </CardTitle>
              <CardDescription>Multiple allowed</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {audienceTypes.map((audience) => (
                  <button
                    key={audience.id}
                    type="button"
                    onClick={() => handleAudienceToggle(audience.id)}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all",
                      selectedAudiences.includes(audience.id)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className={cn(
                      "rounded-lg p-2",
                      selectedAudiences.includes(audience.id)
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}>
                      <audience.icon className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-medium">{audience.label}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Duration */}
          <Card>
            <CardHeader>
              <CardTitle>Duration of campaign</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger>
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  {durationOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Tips */}
        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-5 w-5 text-primary" />
                Maximizing ROI
              </CardTitle>
              <CardDescription>
                Strategic budgeting tips to double your campaign's potential.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-background/50">
                <Zap className="h-5 w-5 text-amber-500 mt-0.5" />
                <div>
                  <p className="font-medium">Start Conservative</p>
                  <p className="text-muted-foreground text-xs">
                    You can start with a smaller budget and scale up based on performance.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-background/50">
                <Target className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Narrow Audience</p>
                  <p className="text-muted-foreground text-xs">
                    Selecting specific audiences often yields better results than "Everyone".
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-background/50">
                <TrendingUp className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="font-medium">CPM Awareness</p>
                  <p className="text-muted-foreground text-xs">
                    Expected cost per 1000 impressions is usually ₹80-120 on average.
                  </p>
                </div>
              </div>
              <Link href="#" className="text-primary hover:underline inline-flex items-center gap-1 text-sm">
                View Audience Insights
                <ArrowRight className="h-3 w-3" />
              </Link>
            </CardContent>
          </Card>

          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Campaign Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Budget</span>
                <span className="font-medium">{formatCurrency(budget)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Duration</span>
                <span className="font-medium">{duration} Days</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Audiences</span>
                <span className="font-medium">{selectedAudiences.length} selected</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Est. Reach</span>
                <span className="font-medium text-primary">
                  {(minImpressions / 1000000).toFixed(1)}L+
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button variant="outline" asChild>
          <Link href={`/campaigns/new/configure?id=${campaignId}`} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
        <div className="flex gap-3">
          <Button variant="outline">Save Draft</Button>
          <Button
            onClick={handleContinue}
            disabled={updateCampaign.isPending}
            className="gap-2"
          >
            Review & Publish
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
