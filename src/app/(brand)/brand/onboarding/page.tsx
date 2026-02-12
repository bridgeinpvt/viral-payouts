"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { trpc } from "@/trpc/client";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
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
import { ArrowLeft, ArrowRight, Building2, CheckCircle2 } from "lucide-react";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const INDUSTRY_OPTIONS = [
  "Technology",
  "E-commerce",
  "Fashion",
  "Beauty",
  "Health",
  "Food",
  "Travel",
  "Gaming",
  "Education",
  "Finance",
  "Entertainment",
  "Other",
] as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BrandFormData {
  companyName: string;
  website: string;
  industry: string;
  gstin: string;
  contactPerson: string;
}

// ---------------------------------------------------------------------------
// Step 1: Company Information
// ---------------------------------------------------------------------------

function StepCompanyInfo({
  form,
  setForm,
  onNext,
}: {
  form: BrandFormData;
  setForm: React.Dispatch<React.SetStateAction<BrandFormData>>;
  onNext: () => void;
}) {
  const isValid =
    form.companyName.trim() !== "" &&
    form.website.trim() !== "" &&
    form.industry !== "" &&
    form.contactPerson.trim() !== "";

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Company Information
        </CardTitle>
        <CardDescription>
          Tell us about your company so we can personalize your experience.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="companyName">
            Company Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="companyName"
            placeholder="Acme Inc."
            value={form.companyName}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, companyName: e.target.value }))
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="website">
            Website <span className="text-destructive">*</span>
          </Label>
          <Input
            id="website"
            type="url"
            placeholder="https://example.com"
            value={form.website}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, website: e.target.value }))
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="industry">
            Industry <span className="text-destructive">*</span>
          </Label>
          <Select
            value={form.industry}
            onValueChange={(value) =>
              setForm((prev) => ({ ...prev, industry: value }))
            }
          >
            <SelectTrigger id="industry">
              <SelectValue placeholder="Select an industry" />
            </SelectTrigger>
            <SelectContent>
              {INDUSTRY_OPTIONS.map((industry) => (
                <SelectItem key={industry} value={industry}>
                  {industry}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="gstin">GSTIN (optional)</Label>
          <Input
            id="gstin"
            placeholder="22AAAAA0000A1Z5"
            value={form.gstin}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, gstin: e.target.value }))
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contactPerson">
            Contact Person Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="contactPerson"
            placeholder="John Doe"
            value={form.contactPerson}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, contactPerson: e.target.value }))
            }
          />
        </div>
      </CardContent>
      <CardFooter className="justify-end">
        <Button onClick={onNext} disabled={!isValid}>
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Step 2: Review & Complete
// ---------------------------------------------------------------------------

function StepReview({
  form,
  onBack,
  onSubmit,
  isSubmitting,
  error,
}: {
  form: BrandFormData;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  error: string | null;
}) {
  const fields = [
    { label: "Company Name", value: form.companyName },
    { label: "Website", value: form.website },
    { label: "Industry", value: form.industry },
    { label: "GSTIN", value: form.gstin || "Not provided" },
    { label: "Contact Person", value: form.contactPerson },
  ];

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5" />
          Review Your Information
        </CardTitle>
        <CardDescription>
          Please confirm your details before completing onboarding.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="divide-y rounded-lg border">
          {fields.map((field) => (
            <div
              key={field.label}
              className="flex items-center justify-between px-4 py-3"
            >
              <span className="text-sm text-muted-foreground">
                {field.label}
              </span>
              <span className="text-sm font-medium text-right max-w-[200px] truncate">
                {field.value}
              </span>
            </div>
          ))}
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-destructive/50 bg-destructive/10 p-3">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="justify-between">
        <Button variant="outline" onClick={onBack} disabled={isSubmitting}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={onSubmit} disabled={isSubmitting}>
          {isSubmitting ? "Completing..." : "Complete Onboarding"}
        </Button>
      </CardFooter>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Step Indicator
// ---------------------------------------------------------------------------

function StepIndicator({ currentStep }: { currentStep: number }) {
  const steps = [
    { number: 1, label: "Company Info" },
    { number: 2, label: "Review" },
  ];

  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((step, index) => (
        <div key={step.number} className="flex items-center gap-2">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors ${currentStep >= step.number
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
              }`}
          >
            {step.number}
          </div>
          <span
            className={`text-sm hidden sm:inline ${currentStep >= step.number
              ? "font-medium text-foreground"
              : "text-muted-foreground"
              }`}
          >
            {step.label}
          </span>
          {index < steps.length - 1 && (
            <div className="w-12 h-px bg-border mx-1" />
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function BrandOnboardingPage() {
  const router = useRouter();
  const { data: session, update } = useSession();

  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<BrandFormData>({
    companyName: "",
    website: "",
    industry: "",
    gstin: "",
    contactPerson: session?.user?.name ?? "",
  });

  const completeOnboarding = trpc.auth.completeOnboarding.useMutation({
    onSuccess: async () => {
      // Force session update to reflect isOnboarded: true
      await update();
      router.push("/brand/dashboard");
      router.refresh();
    },
    onError: (err) => {
      setError(err.message ?? "Something went wrong. Please try again.");
    },
  });

  function handleSubmit() {
    setError(null);
    completeOnboarding.mutate({
      name: form.contactPerson.trim(),
      username: form.companyName.trim().toLowerCase().replace(/\s+/g, "-"),
      companyName: form.companyName.trim(),
      website: form.website.trim(),
      industry: form.industry,
      gstin: form.gstin.trim() || undefined,
      contactPerson: form.contactPerson.trim(),
    });
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome to Viral Payouts
          </h1>
          <p className="text-muted-foreground mt-1">
            Set up your brand profile to start creating campaigns.
          </p>
        </div>

        <StepIndicator currentStep={step} />

        {step === 1 && (
          <StepCompanyInfo
            form={form}
            setForm={setForm}
            onNext={() => setStep(2)}
          />
        )}

        {step === 2 && (
          <StepReview
            form={form}
            onBack={() => {
              setError(null);
              setStep(1);
            }}
            onSubmit={handleSubmit}
            isSubmitting={completeOnboarding.isPending}
            error={error}
          />
        )}
      </div>
    </div>
  );
}
