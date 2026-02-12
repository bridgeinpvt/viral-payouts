"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { CampaignType, Platform } from "@prisma/client";
import { trpc } from "@/trpc/client";
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

interface FormData {
  name: string;
  type: CampaignType;
  description: string;
  targetPlatforms: Platform[];
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
  description: "",
  targetPlatforms: [],
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
      return (
        form.name.trim().length > 0 &&
        form.targetPlatforms.length > 0 &&
        form.startDate !== "" &&
        form.endDate !== "" &&
        duration > 0
      );
    }
    if (step === 2) {
      if (form.type === "VIEW") {
        return parseFloat(form.payoutPer1KViews) > 0;
      }
      if (form.type === "CLICK") {
        return (
          parseFloat(form.payoutPerClick) > 0 &&
          form.landingPageUrl.trim().length > 0
        );
      }
      if (form.type === "CONVERSION") {
        return parseFloat(form.payoutPerSale) > 0;
      }
    }
    if (step === 3) {
      return parseFloat(form.totalBudget) >= 25000;
    }
    return true;
  }

  function handleSubmit() {
    setError(null);

    const input: Record<string, unknown> = {
      name: form.name.trim(),
      type: form.type,
      description: form.description.trim() || undefined,
      targetPlatforms: form.targetPlatforms,
      startDate: new Date(form.startDate),
      endDate: new Date(form.endDate),
      duration,
      totalBudget: parseFloat(form.totalBudget),
    };

    if (form.type === "VIEW") {
      input.payoutPer1KViews = parseFloat(form.payoutPer1KViews);
      input.oauthRequired = form.oauthRequired;
    }
    if (form.type === "CLICK") {
      input.payoutPerClick = parseFloat(form.payoutPerClick);
      input.landingPageUrl = form.landingPageUrl.trim();
    }
    if (form.type === "CONVERSION") {
      input.payoutPerSale = parseFloat(form.payoutPerSale);
      if (form.promoCodeFormat.trim()) {
        input.promoCodeFormat = form.promoCodeFormat.trim();
      }
      if (parseFloat(form.maxPayoutPerCreator) > 0) {
        input.maxPayoutPerCreator = parseFloat(form.maxPayoutPerCreator);
      }
    }

    createMutation.mutate(input as Parameters<typeof createMutation.mutate>[0]);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Create Campaign</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Step {step} of 4
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div
              className={`h-2 rounded-full flex-1 transition-colors ${
                s <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          </div>
        ))}
      </div>

      {/* Step 1: Basics */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Campaign Basics</CardTitle>
            <CardDescription>
              Set the name, type, and timeline for your campaign
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Campaign Name</Label>
              <Input
                id="name"
                placeholder="e.g. Summer Product Launch"
                value={form.name}
                onChange={(e) => updateForm({ name: e.target.value })}
              />
            </div>

            <div className="space-y-3">
              <Label>Campaign Type</Label>
              <div className="grid gap-3">
                {CAMPAIGN_TYPES.map((ct) => (
                  <label
                    key={ct.value}
                    className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${
                      form.type === ct.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="type"
                      value={ct.value}
                      checked={form.type === ct.value}
                      onChange={() => updateForm({ type: ct.value })}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-medium">{ct.label}</div>
                      <div className="text-sm text-muted-foreground">
                        {ct.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Describe your campaign goals and requirements..."
                value={form.description}
                onChange={(e) => updateForm({ description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-3">
              <Label>Target Platforms</Label>
              <div className="flex flex-wrap gap-4">
                {PLATFORMS.map((platform) => (
                  <label
                    key={platform}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Checkbox
                      checked={form.targetPlatforms.includes(platform)}
                      onCheckedChange={() => togglePlatform(platform)}
                    />
                    <span className="text-sm">{platform}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => updateForm({ startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={form.endDate}
                  onChange={(e) => updateForm({ endDate: e.target.value })}
                />
              </div>
            </div>
            {duration > 0 && (
              <p className="text-sm text-muted-foreground">
                Campaign duration: {duration} day{duration !== 1 ? "s" : ""}
              </p>
            )}
          </CardContent>
          <CardFooter className="justify-end">
            <Button disabled={!canProceed()} onClick={() => setStep(2)}>
              Next
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 2: Payout Config */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Payout Configuration</CardTitle>
            <CardDescription>
              Configure how creators will be compensated
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {form.type === "VIEW" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="payoutPer1KViews">
                    Payout per 1,000 Views (INR)
                  </Label>
                  <Input
                    id="payoutPer1KViews"
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="e.g. 50"
                    value={form.payoutPer1KViews}
                    onChange={(e) =>
                      updateForm({ payoutPer1KViews: e.target.value })
                    }
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={form.oauthRequired}
                    onCheckedChange={(checked) =>
                      updateForm({ oauthRequired: checked === true })
                    }
                  />
                  <span className="text-sm">
                    Require OAuth verification for view tracking
                  </span>
                </label>
              </>
            )}

            {form.type === "CLICK" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="payoutPerClick">
                    Payout per Click (INR)
                  </Label>
                  <Input
                    id="payoutPerClick"
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="e.g. 5"
                    value={form.payoutPerClick}
                    onChange={(e) =>
                      updateForm({ payoutPerClick: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="landingPageUrl">Landing Page URL</Label>
                  <Input
                    id="landingPageUrl"
                    type="url"
                    placeholder="https://example.com/landing"
                    value={form.landingPageUrl}
                    onChange={(e) =>
                      updateForm({ landingPageUrl: e.target.value })
                    }
                  />
                </div>
              </>
            )}

            {form.type === "CONVERSION" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="payoutPerSale">
                    Payout per Sale (INR)
                  </Label>
                  <Input
                    id="payoutPerSale"
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="e.g. 200"
                    value={form.payoutPerSale}
                    onChange={(e) =>
                      updateForm({ payoutPerSale: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="promoCodeFormat">
                    Promo Code Format (optional)
                  </Label>
                  <Input
                    id="promoCodeFormat"
                    placeholder='e.g. BRAND-{{CODE}} (use {{CODE}} for random part)'
                    value={form.promoCodeFormat}
                    onChange={(e) =>
                      updateForm({ promoCodeFormat: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    {"Use {{CODE}} as a placeholder for the auto-generated part."}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxPayoutPerCreator">
                    Max Payout per Creator (INR, optional)
                  </Label>
                  <Input
                    id="maxPayoutPerCreator"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="e.g. 10000"
                    value={form.maxPayoutPerCreator}
                    onChange={(e) =>
                      updateForm({ maxPayoutPerCreator: e.target.value })
                    }
                  />
                </div>
              </>
            )}
          </CardContent>
          <CardFooter className="justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button disabled={!canProceed()} onClick={() => setStep(3)}>
              Next
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 3: Budget */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Campaign Budget</CardTitle>
            <CardDescription>
              Set the total budget for this campaign (minimum 25,000 INR)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="totalBudget">Total Budget (INR)</Label>
              <Input
                id="totalBudget"
                type="number"
                min="25000"
                step="1000"
                placeholder="25000"
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

            {estimatedReach && (
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">
                    {estimatedReach.label}
                  </p>
                  <p className="text-2xl font-bold">
                    {estimatedReach.value.toLocaleString("en-IN")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Based on your budget and payout configuration
                  </p>
                </CardContent>
              </Card>
            )}
          </CardContent>
          <CardFooter className="justify-between">
            <Button variant="outline" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button disabled={!canProceed()} onClick={() => setStep(4)}>
              Next
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 4: Review & Launch */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Review & Create</CardTitle>
            <CardDescription>
              Review your campaign details before creating
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Campaign Name</p>
                  <p className="font-medium">{form.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p className="font-medium">{form.type}</p>
                </div>
              </div>

              {form.description && (
                <div>
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="text-sm">{form.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Platforms</p>
                  <p className="font-medium">
                    {form.targetPlatforms.join(", ")}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Duration</p>
                  <p className="font-medium">
                    {duration} day{duration !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Start Date</p>
                  <p className="font-medium">
                    {new Date(form.startDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">End Date</p>
                  <p className="font-medium">
                    {new Date(form.endDate).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <hr />

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Payout Configuration
                </p>
                {form.type === "VIEW" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Payout per 1K Views
                      </p>
                      <p className="font-medium">
                        {formatCurrency(parseFloat(form.payoutPer1KViews) || 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        OAuth Required
                      </p>
                      <p className="font-medium">
                        {form.oauthRequired ? "Yes" : "No"}
                      </p>
                    </div>
                  </div>
                )}
                {form.type === "CLICK" && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Payout per Click
                        </p>
                        <p className="font-medium">
                          {formatCurrency(parseFloat(form.payoutPerClick) || 0)}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Landing Page
                      </p>
                      <p className="font-medium text-sm break-all">
                        {form.landingPageUrl}
                      </p>
                    </div>
                  </div>
                )}
                {form.type === "CONVERSION" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Payout per Sale
                      </p>
                      <p className="font-medium">
                        {formatCurrency(parseFloat(form.payoutPerSale) || 0)}
                      </p>
                    </div>
                    {form.promoCodeFormat && (
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Promo Code Format
                        </p>
                        <p className="font-medium">{form.promoCodeFormat}</p>
                      </div>
                    )}
                    {parseFloat(form.maxPayoutPerCreator) > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Max Payout per Creator
                        </p>
                        <p className="font-medium">
                          {formatCurrency(parseFloat(form.maxPayoutPerCreator))}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <hr />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Budget</p>
                  <p className="text-xl font-bold">
                    {formatCurrency(parseFloat(form.totalBudget) || 0)}
                  </p>
                </div>
                {estimatedReach && (
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {estimatedReach.label}
                    </p>
                    <p className="text-xl font-bold">
                      {estimatedReach.value.toLocaleString("en-IN")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter className="justify-between">
            <Button variant="outline" onClick={() => setStep(3)}>
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
