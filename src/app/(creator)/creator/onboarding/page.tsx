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

const NICHE_OPTIONS = [
  "Technology",
  "Fashion",
  "Beauty",
  "Health",
  "Food",
  "Travel",
  "Gaming",
  "Education",
  "Finance",
  "Entertainment",
  "Lifestyle",
  "Sports",
] as const;

const LANGUAGE_OPTIONS = [
  "English",
  "Hindi",
  "Tamil",
  "Telugu",
  "Kannada",
  "Malayalam",
  "Marathi",
  "Bengali",
  "Gujarati",
  "Other",
] as const;

const STEPS = [
  { title: "Profile", description: "Tell us about yourself" },
  { title: "Social Accounts", description: "Connect your social presence" },
  { title: "Payouts", description: "Set up your payout method" },
];

export default function CreatorOnboardingPage() {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [displayName, setDisplayName] = useState(session?.user?.name ?? "");
  const [niche, setNiche] = useState("");
  const [language, setLanguage] = useState("");
  const [location, setLocation] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");
  const [youtubeHandle, setYoutubeHandle] = useState("");
  const [upiId, setUpiId] = useState("");

  const completeOnboarding = trpc.auth.completeOnboarding.useMutation({
    onSuccess: async () => {
      // Force session update to reflect isOnboarded: true
      await update();
      router.push("/creator/dashboard");
      router.refresh();
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  function canProceed(): boolean {
    if (step === 0) {
      return displayName.trim() !== "" && niche !== "" && language !== "" && location.trim() !== "";
    }
    if (step === 1) {
      return instagramHandle.trim() !== "";
    }
    if (step === 2) {
      return upiId.trim() !== "";
    }
    return false;
  }

  function handleNext() {
    setError(null);
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    }
  }

  function handleBack() {
    setError(null);
    if (step > 0) {
      setStep(step - 1);
    }
  }

  function handleComplete() {
    setError(null);
    completeOnboarding.mutate({
      name: displayName.trim(),
      username: displayName.trim().toLowerCase().replace(/\s+/g, ""),
      displayName: displayName.trim(),
      niche,
      language,
      location: location.trim(),
      instagramHandle: instagramHandle.trim(),
      youtubeHandle: youtubeHandle.trim() || undefined,
      upiId: upiId.trim(),
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Creator Onboarding</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Complete your profile to start earning
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-2">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${i < step
                  ? "bg-primary text-primary-foreground"
                  : i === step
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
            >
              {i < step ? "\u2713" : i + 1}
            </div>
            <span
              className={`hidden text-sm sm:inline ${i === step ? "font-medium" : "text-muted-foreground"
                }`}
            >
              {s.title}
            </span>
            {i < STEPS.length - 1 && (
              <div
                className={`h-px w-8 ${i < step ? "bg-primary" : "bg-muted"
                  }`}
              />
            )}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{STEPS[step].title}</CardTitle>
          <CardDescription>{STEPS[step].description}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Step 1: Profile */}
          {step === 0 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  placeholder="Your creator name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="niche">Niche</Label>
                <Select value={niche} onValueChange={setNiche}>
                  <SelectTrigger id="niche">
                    <SelectValue placeholder="Select your niche" />
                  </SelectTrigger>
                  <SelectContent>
                    {NICHE_OPTIONS.map((n) => (
                      <SelectItem key={n} value={n}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="language">Primary Language</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger id="language">
                    <SelectValue placeholder="Select your language" />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGE_OPTIONS.map((l) => (
                      <SelectItem key={l} value={l}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="e.g. Mumbai, India"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            </>
          )}

          {/* Step 2: Social Accounts */}
          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="instagramHandle">Instagram Handle</Label>
                <Input
                  id="instagramHandle"
                  placeholder="@yourhandle"
                  value={instagramHandle}
                  onChange={(e) => setInstagramHandle(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Required. OAuth integration coming soon.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="youtubeHandle">YouTube Handle (optional)</Label>
                <Input
                  id="youtubeHandle"
                  placeholder="@yourchannel"
                  value={youtubeHandle}
                  onChange={(e) => setYoutubeHandle(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Optional. You can add this later.
                </p>
              </div>
            </>
          )}

          {/* Step 3: Payouts */}
          {step === 2 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="upiId">UPI ID</Label>
                <Input
                  id="upiId"
                  placeholder="yourname@upi"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Your earnings will be paid out to this UPI ID.
                </p>
              </div>
            </>
          )}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === 0}
          >
            Back
          </Button>

          {step < STEPS.length - 1 ? (
            <Button onClick={handleNext} disabled={!canProceed()}>
              Next
            </Button>
          ) : (
            <Button
              onClick={handleComplete}
              disabled={!canProceed() || completeOnboarding.isPending}
            >
              {completeOnboarding.isPending ? "Completing..." : "Complete"}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
