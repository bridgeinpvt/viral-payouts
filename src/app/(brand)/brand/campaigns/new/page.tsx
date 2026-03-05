"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  CampaignType,
  Platform,
  AudienceType,
} from "@prisma/client";
import { trpc } from "@/trpc/client";

type PromotionType = "UGC" | "CLIPPING" | "POSTING";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const PLATFORMS: Platform[] = [
  "INSTAGRAM",
  "YOUTUBE",
  "TWITTER",
  "LINKEDIN",
  "TIKTOK",
];

const LOCATIONS = [
  "India",
  "USA",
  "UK",
  "Canada",
  "Australia",
  "UAE",
  "Singapore",
  "Global",
];

const CAMPAIGN_TYPES: { value: CampaignType; label: string; description: string }[] = [
  {
    value: "VIEW",
    label: "View-based",
    description: "Pay creators based on views their content receives",
  },
  {
    value: "CLICK",
    label: "Click-based",
    description: "Pay creators based on clicks to your landing page",
  },
  {
    value: "CONVERSION",
    label: "Conversion-based",
    description: "Pay creators based on sales using promo codes",
  },
];

const PROMOTION_TYPES: { value: PromotionType; label: string; description: string }[] = [
  {
    value: "PAID",
    label: "Paid Promotion",
    description: "Creators disclose it's a paid promotion.",
  },
  {
    value: "ORGANIC",
    label: "Organic Promotion",
    description: "Creators promote organically without explicit disclosure.",
  },
];

const AUDIENCES: { value: AudienceType; label: string }[] = [
  { value: "BUSINESS", label: "Business & Professionals" },
  { value: "COLLEGE", label: "College Students" },
  { value: "EDUCATORS", label: "Educators & Teachers" },
  { value: "GAMERS", label: "Gamers & Esports" },
  { value: "TECH", label: "Tech Enthusiasts" },
  { value: "ARTISTS", label: "Artists & Creatives" },
  { value: "FASHION", label: "Fashion & Style" },
  { value: "BEAUTY", label: "Beauty & Makeup" },
  { value: "HEALTH_FITNESS", label: "Health & Fitness" },
  { value: "FOOD", label: "Food & Beverage" },
  { value: "TRAVEL", label: "Travel & Hospitality" },
  { value: "LIFESTYLE", label: "Lifestyle" },
];

interface FormData {
  name: string;
  type: CampaignType;
  promotionType?: PromotionType;
  description: string;
  targetPlatforms: Platform[];
  targetAudience: AudienceType[];
  locations: string[];
  startDate: string;
  endDate: string;
  payoutPer1KViews: string;
  oauthRequired: boolean;
  payoutPerClick: string;
  landingPageUrl: string;
  payoutPerSale: string;
  promoCodeFormat: string;
  maxPayoutPerCreator: string;
  totalBudget: string;
}

const initialFormData: FormData = {
  name: "",
  type: "VIEW",
  promotionType: undefined,
  description: "",
  targetPlatforms: [],
  targetAudience: [],
  locations: [],
  startDate: "",
  endDate: "",
  payoutPer1KViews: "",
  oauthRequired: false,
  payoutPerClick: "",
  landingPageUrl: "",
  payoutPerSale: "",
  promoCodeFormat: "",
  maxPayoutPerCreator: "",
  totalBudget: "",
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function CreateCampaignPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(initialFormData);
  const [error, setError] = useState<string | null>(null);

  const createMutation = trpc.campaign.createCampaign.useMutation({
    onSuccess: (campaign) => {
      router.push(`/brand/campaigns/${campaign.id}`);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  function updateForm(updates: Partial<FormData>) {
    setForm((prev) => ({ ...prev, ...updates }));
  }

  function togglePlatform(platform: Platform) {
    setForm((prev) => ({
      ...prev,
      targetPlatforms: prev.targetPlatforms.includes(platform)
        ? prev.targetPlatforms.filter((p) => p !== platform)
        : [...prev.targetPlatforms, platform],
    }));
    function toggleLocation(location: string) {
      setForm((prev) => ({
        ...prev,
        locations: prev.locations.includes(location)
          ? prev.locations.filter((l) => l !== location)
          : [...prev.locations, location],
      }));
    }

    function toggleAudience(audience: AudienceType) {
      setForm((prev) => ({
        ...prev,
        targetAudience: prev.targetAudience.includes(audience)
          ? prev.targetAudience.filter((a) => a !== audience)
          : [...prev.targetAudience, audience],
      }));
    }

    const duration = useMemo(() => {
      if (!form.startDate || !form.endDate) return 0;
      const start = new Date(form.startDate);
      const end = new Date(form.endDate);
      const diffMs = end.getTime() - start.getTime();
      return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    }, [form.startDate, form.endDate]);

    const estimatedReach = useMemo(() => {
      const budget = parseFloat(form.totalBudget) || 0;
      if (budget === 0) return null;

      if (form.type === "VIEW") {
        const payout = parseFloat(form.payoutPer1KViews) || 0;
        if (payout === 0) return null;
        return { label: "Estimated Views", value: Math.floor((budget / payout) * 1000) };
      }
      if (form.type === "CLICK") {
        const payout = parseFloat(form.payoutPerClick) || 0;
        if (payout === 0) return null;
        return { label: "Estimated Clicks", value: Math.floor(budget / payout) };
      }
      if (form.type === "CONVERSION") {
        const payout = parseFloat(form.payoutPerSale) || 0;
        if (payout === 0) return null;
        return { label: "Estimated Conversions", value: Math.floor(budget / payout) };
      }
      return null;
    }, [form.totalBudget, form.type, form.payoutPer1KViews, form.payoutPerClick, form.payoutPerSale]);

    function canProceed(): boolean {
      if (step === 1) {
        return form.name.trim().length > 0 && form.type !== undefined;
      }
      if (step === 2) {
        return form.targetAudience.length > 0 && form.locations.length > 0;
      }
      if (step === 3) {
        if (!form.promotionType) return false;
        return parseFloat(form.totalBudget) >= 25000;
      }
      return true;
    }
    function handleSubmit() {
      setError(null);

      const input: Record<string, unknown> = {
        name: form.name.trim(),
        type: form.type,
        promotionType: form.promotionType,
        description: form.description.trim() || undefined,
        targetPlatforms: form.targetPlatforms,
        targetAudience: form.targetAudience,
        locations: form.locations,
        startDate: new Date(form.startDate),
        endDate: new Date(form.endDate),
        duration,
        totalBudget: parseFloat(form.totalBudget),
      };

      createMutation.mutate(input as Parameters<typeof createMutation.mutate>[0]);
    }

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Create Campaign</h1>
        </div>
        {/* Step Indicator */}
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div
                className={`h-2 rounded-full flex-1 transition-colors ${s <= step ? "bg-primary" : "bg-muted"
                  }`}
              />
            </div>
          ))}
        </div>

        {/* Step 1: Basics */}
        {step === 1 && (
          <Card className="bg-[#111111] border-[#222222] text-white">
            <CardHeader>
              <CardTitle className="text-xl">Campaign Basics</CardTitle>
              <CardDescription className="text-zinc-400">
                Define the core details of your campaign to get started.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-zinc-300">Campaign Name</Label>
                <Input
                  id="name"
                  className="bg-[#1A1A1A] border-[#333333] focus-visible:ring-primary"
                  placeholder="e.g. Summer Product Launch"
                  value={form.name}
                  onChange={(e) => updateForm({ name: e.target.value })}
                />
              </div>

              <div className="space-y-3">
                <Label className="text-zinc-300">Campaign Goal</Label>
                <div className="grid gap-3">
                  {[
                    { value: "VIEW", label: "Brand Awareness", desc: "Maximize your reach and get your brand seen by new audiences." },
                    { value: "CONVERSION", label: "Sales & Conversions", desc: "Drive sales and actions on your website or store." },
                    { value: "CLICK", label: "Engagement", desc: "Increase likes, comments, shares and community interaction." }
                  ].map((ct) => (
                    <label
                      key={ct.value}
                      className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${form.type === ct.value
                        ? "border-primary bg-primary/10"
                        : "border-[#333333] hover:border-[#444444] bg-[#1A1A1A]"
                        }`}
                    >
                      <input
                        type="radio"
                        name="type"
                        value={ct.value}
                        checked={form.type === ct.value}
                        onChange={() => updateForm({ type: ct.value as CampaignType })}
                        className="mt-1"
                      />
                      <div>
                        <div className="font-medium text-white">{ct.label}</div>
                        <div className="text-sm text-zinc-400">
                          {ct.desc}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-zinc-300">Description</Label>
                <Textarea
                  id="description"
                  className="bg-[#1A1A1A] border-[#333333] focus-visible:ring-primary min-h-[120px]"
                  placeholder="Describe your campaign..."
                  value={form.description}
                  onChange={(e) => updateForm({ description: e.target.value })}
                  maxLength={500}
                />
                <div className="text-right text-xs text-zinc-500">
                  {form.description.length}/500 characters
                </div>
              </div>
            </CardContent>
            <CardFooter className="justify-end">
              <Button disabled={!canProceed()} onClick={() => setStep(2)}>
                Next
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Step 2: Audience */}
        {step === 2 && (
          <Card className="bg-[#111111] border-[#222222] text-white">
            <CardHeader>
              <CardTitle className="text-xl">Demographics & Location</CardTitle>
              <CardDescription className="text-zinc-400">
                Select the audience demographics you want to reach
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label className="text-zinc-300">Audience Categories</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {AUDIENCES.map((audience) => (
                    <label
                      key={audience.value}
                      className="flex items-center gap-2 rounded-lg border border-[#333333] p-4 cursor-pointer hover:bg-[#1A1A1A] transition-colors"
                    >
                      <Checkbox
                        checked={form.targetAudience.includes(audience.value)}
                        onCheckedChange={() => toggleAudience(audience.value)}
                      />
                      <span className="text-sm font-medium text-white">{audience.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-zinc-300">Target Platforms</Label>
                <div className="flex flex-wrap gap-4">
                  {PLATFORMS.map((platform) => (
                    <label
                      key={platform}
                      className="flex items-center gap-2 cursor-pointer bg-[#1A1A1A] px-4 py-2 rounded-full border border-[#333333]"
                    >
                      <Checkbox
                        checked={form.targetPlatforms.includes(platform)}
                        onCheckedChange={() => togglePlatform(platform)}
                      />
                      <span className="text-sm text-white">{platform}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-zinc-300">Target Locations</Label>
                <div className="flex flex-wrap gap-4">
                  {LOCATIONS.map((location) => (
                    <label
                      key={location}
                      className="flex items-center gap-2 cursor-pointer bg-[#1A1A1A] px-4 py-2 rounded-full border border-[#333333]"
                    >
                      <Checkbox
                        checked={form.locations.includes(location)}
                        onCheckedChange={() => toggleLocation(location)}
                      />
                      <span className="text-sm text-white">{location}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate" className="text-zinc-300">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    className="bg-[#1A1A1A] border-[#333333] focus-visible:ring-primary text-white"
                    value={form.startDate}
                    onChange={(e) => updateForm({ startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate" className="text-zinc-300">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    className="bg-[#1A1A1A] border-[#333333] focus-visible:ring-primary text-white"
                    value={form.endDate}
                    onChange={(e) => updateForm({ endDate: e.target.value })}
                  />
                </div>
              </div>
              {duration > 0 && (
                <p className="text-sm text-zinc-400">
                  Campaign duration: {duration} day{duration !== 1 ? "s" : ""}
                </p>
              )}

            </CardContent>
            <CardFooter className="justify-between">
              <Button variant="outline" className="border-[#333333] text-zinc-300 hover:text-white" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button disabled={!canProceed()} onClick={() => setStep(3)}>
                Next
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Step 3: Budget & Optimization */}
        {step === 3 && (
          <Card className="bg-[#111111] border-[#222222] text-white">
            <CardHeader>
              <CardTitle className="text-xl">Budget & Optimization</CardTitle>
              <CardDescription className="text-zinc-400">
                Set the total budget and promotion constraints.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                <h3 className="font-semibold text-primary mb-2">AI Budget Recommendation</h3>
                <p className="text-sm text-zinc-300">
                  Based on your selected Target Audience and location constraints, our AI suggests a budget of around ₹20,000 to ₹40,000 for optimal reach and saturation.
                </p>
              </div>

              <div className="space-y-3">
                <Label className="text-zinc-300">Promotion Type</Label>
                <div className="grid gap-3">
                  {[
                    { value: "UGC", label: "User Generated Content (UGC)", desc: "Creators will create videos using face and product/service (explanation, showcasing, etc)." },
                    { value: "CLIPPING", label: "Clipping", desc: "Using viral hooks and then creating a viral video for brand and creators." },
                    { value: "POSTING", label: "Posting", desc: "Post product/service images for brands and creators so that they get views." }
                  ].map((pt) => (
                    <label
                      key={pt.value}
                      className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${form.promotionType === pt.value
                        ? "border-primary bg-primary/10"
                        : "border-[#333333] hover:border-[#444444] bg-[#1A1A1A]"
                        }`}
                    >
                      <input
                        type="radio"
                        name="promotionType"
                        value={pt.value}
                        checked={form.promotionType === pt.value}
                        onChange={() => updateForm({ promotionType: pt.value as PromotionType })}
                        className="mt-1"
                      />
                      <div>
                        <div className="font-medium text-white">{pt.label}</div>
                        <div className="text-sm text-zinc-400">
                          {pt.desc}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="totalBudget" className="text-zinc-300">Total Budget Allocation (INR)</Label>
                <p className="text-xs text-zinc-500 pb-2">Automatically adjust bids in real-time to maximize ROAS.</p>
                <Input
                  id="totalBudget"
                  type="number"
                  min="25000"
                  step="1000"
                  placeholder="25000"
                  className="bg-[#1A1A1A] border-[#333333] focus-visible:ring-primary text-xl font-medium"
                  value={form.totalBudget}
                  onChange={(e) => updateForm({ totalBudget: e.target.value })}
                />
                {parseFloat(form.totalBudget) > 0 &&
                  parseFloat(form.totalBudget) < 25000 && (
                    <p className="text-sm text-red-500">
                      Minimum budget is 25,000 INR
                    </p>
                  )}
              </div>

              {parseFloat(form.totalBudget) >= 25000 && (
                <div className="p-4 bg-[#1A1A1A] border border-[#333333] rounded-lg space-y-4">
                  <h3 className="font-semibold text-white">Projected Performance</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-xs text-zinc-400 mb-1">Est. Reach</div>
                      <div className="text-lg font-bold text-primary">450k+</div>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-400 mb-1">Proj. ROAS</div>
                      <div className="text-lg font-bold text-primary">3.8x+</div>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-400 mb-1">Visits</div>
                      <div className="text-lg font-bold text-primary">1.2k</div>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-400 mb-1">CPA</div>
                      <div className="text-lg font-bold text-primary">~₹15.4</div>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-500 text-center">Your budget is optimized for maximum conversions.</p>
                </div>
              )}
            </CardContent>
            <CardFooter className="justify-between">
              <Button variant="outline" className="border-[#333333] text-zinc-300 hover:text-white" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button
                disabled={createMutation.isPending || !canProceed()}
                onClick={handleSubmit}
              >
                {createMutation.isPending ? "Creating..." : "Create Campaign"}
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Step 4: Review & Launch */}
        {step === 4 && (
          <Card className="bg-[#111111] border-[#222222] text-white">
            <CardHeader>
              <CardTitle className="text-xl">Review & Create</CardTitle>
              <CardDescription className="text-zinc-400">
                Review your campaign details before creating
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {error && (
                <div className="rounded-lg border border-red-900/50 bg-red-900/20 p-4 text-sm text-red-200">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-zinc-400">Campaign Name</p>
                    <p className="font-medium text-white">{form.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-400">Campaign Goal</p>
                    <p className="font-medium text-white">{form.type}</p>
                  </div>
                </div>

                {form.description && (
                  <div>
                    <p className="text-sm text-zinc-400">Description</p>
                    <p className="text-sm text-white">{form.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-zinc-400">Platforms</p>
                    <p className="font-medium text-white">
                      {form.targetPlatforms.join(", ")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-400">Audience Categories</p>
                    <p className="font-medium text-white">
                      {form.targetAudience.join(", ")}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-zinc-400">Locations</p>
                    <p className="font-medium text-white">
                      {form.locations.join(", ")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-400">Duration</p>
                    <p className="font-medium text-white">
                      {duration} day{duration !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-zinc-400">Start Date</p>
                    <p className="font-medium text-white">
                      {new Date(form.startDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-400">End Date</p>
                    <p className="font-medium text-white">
                      {new Date(form.endDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <hr className="border-[#333333]" />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-zinc-400">Total Budget</p>
                    <p className="text-xl font-bold text-white">
                      {formatCurrency(parseFloat(form.totalBudget) || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-400">Promotion Type</p>
                    <p className="text-xl font-bold text-white">
                      {form.promotionType}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="justify-between">
              <Button variant="outline" className="border-[#333333] text-zinc-300 hover:text-white" onClick={() => setStep(3)}>
                Back
              </Button>
              <Button
                disabled={createMutation.isPending}
                onClick={handleSubmit}
              >
                {createMutation.isPending ? "Creating..." : "Create Campaign"}
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    );
  }
}
