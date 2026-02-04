"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Scissors,
  Video,
  Share2,
  Upload,
  Link as LinkIcon,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Instagram,
  Linkedin,
  Twitter,
  ExternalLink,
  Info,
} from "lucide-react";
import { trpc } from "@/trpc/client";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const typeIcons: Record<string, React.ElementType> = {
  CLIPPING: Scissors,
  UGC: Video,
  JUST_POSTING: Share2,
};

const platformIcons: Record<string, React.ElementType> = {
  INSTAGRAM: Instagram,
  LINKEDIN: Linkedin,
  TWITTER: Twitter,
};

const platformUrlPatterns: Record<string, string> = {
  INSTAGRAM: "instagram.com",
  LINKEDIN: "linkedin.com",
  TWITTER: "twitter.com",
  YOUTUBE: "youtube.com",
  TIKTOK: "tiktok.com",
};

export default function SubmitContentPage() {
  const params = useParams();
  const router = useRouter();
  const submissionId = params.id as string;

  const [contentUrl, setContentUrl] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("");
  const [notes, setNotes] = useState("");
  const [urlError, setUrlError] = useState("");

  const { data: submission, isLoading } = trpc.campaign.getSubmission.useQuery(
    { id: submissionId },
    { enabled: !!submissionId }
  );

  const submitContent = trpc.campaign.submitContent.useMutation({
    onSuccess: () => {
      toast.success("Content submitted successfully!");
      router.push(`/my-campaigns/${submissionId}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit content");
    },
  });

  const validateUrl = (url: string) => {
    if (!url) {
      setUrlError("");
      return;
    }

    try {
      const parsed = new URL(url);
      if (selectedPlatform) {
        const expectedDomain = platformUrlPatterns[selectedPlatform];
        if (expectedDomain && !parsed.hostname.includes(expectedDomain.replace("www.", ""))) {
          setUrlError(`URL should be from ${expectedDomain}`);
          return;
        }
      }
      setUrlError("");
    } catch {
      setUrlError("Please enter a valid URL");
    }
  };

  const handleSubmit = () => {
    if (!contentUrl) {
      toast.error("Please enter your content URL");
      return;
    }
    if (!selectedPlatform) {
      toast.error("Please select a platform");
      return;
    }
    if (urlError) {
      toast.error("Please fix the URL error");
      return;
    }

    submitContent.mutate({
      submissionId,
      contentUrl,
      platform: selectedPlatform,
      notes: notes || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Submission not found</p>
        <Button asChild>
          <Link href="/my-campaigns">Back to My Campaigns</Link>
        </Button>
      </div>
    );
  }

  if (submission.status !== "APPROVED" && submission.status !== "PENDING") {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">
          {submission.status === "SUBMITTED"
            ? "Content already submitted"
            : "Cannot submit content at this stage"}
        </p>
        <Button asChild>
          <Link href={`/my-campaigns/${submissionId}`}>View Submission</Link>
        </Button>
      </div>
    );
  }

  const campaign = submission.campaign;
  const TypeIcon = typeIcons[campaign.type] || Video;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Back Button */}
      <Button variant="ghost" size="sm" asChild className="gap-2">
        <Link href={`/my-campaigns/${submissionId}`}>
          <ArrowLeft className="h-4 w-4" />
          Back to Submission
        </Link>
      </Button>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Submit Your Content</h1>
        <p className="text-muted-foreground mt-1">
          Share the link to your published content
        </p>
      </div>

      {/* Campaign Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
              <TypeIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">{campaign.name || campaign.productName || "Campaign"}</h3>
              <p className="text-sm text-muted-foreground">
                {campaign.brand.brandProfile?.companyName || campaign.brand.name}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submission Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Content Submission
          </CardTitle>
          <CardDescription>
            Paste the URL of your published post
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Platform Selection */}
          <div className="space-y-2">
            <Label>Platform</Label>
            <Select value={selectedPlatform} onValueChange={(v) => {
              setSelectedPlatform(v);
              if (contentUrl) validateUrl(contentUrl);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select where you posted" />
              </SelectTrigger>
              <SelectContent>
                {(submission.selectedPlatforms || [submission.platform]).map((platform: string) => {
                  const PlatformIcon = platformIcons[platform] || Share2;
                  return (
                    <SelectItem key={platform} value={platform}>
                      <div className="flex items-center gap-2">
                        <PlatformIcon className="h-4 w-4" />
                        {platform}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Content URL */}
          <div className="space-y-2">
            <Label>Content URL</Label>
            <div className="relative">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="https://instagram.com/p/..."
                className={cn("pl-10", urlError && "border-red-500")}
                value={contentUrl}
                onChange={(e) => {
                  setContentUrl(e.target.value);
                  validateUrl(e.target.value);
                }}
              />
            </div>
            {urlError && (
              <p className="text-sm text-red-500">{urlError}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Paste the full URL to your published post (must be public)
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Additional Notes (Optional)</Label>
            <Textarea
              placeholder="Any additional information about your submission..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Guidelines Reminder */}
          <div className="rounded-lg bg-muted/50 p-4 space-y-2">
            <div className="flex items-start gap-2">
              <Info className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm">Before submitting, make sure:</p>
                <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                  <li>• Your content follows the campaign guidelines</li>
                  <li>• The post is set to public visibility</li>
                  <li>• All required hashtags/mentions are included</li>
                  <li>• The URL is correct and accessible</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            className="w-full"
            size="lg"
            onClick={handleSubmit}
            disabled={submitContent.isPending || !contentUrl || !selectedPlatform || !!urlError}
          >
            {submitContent.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Submit Content
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Campaign Guidelines */}
      {campaign.contentGuidelines && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Content Guidelines</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none text-muted-foreground">
              <p className="whitespace-pre-wrap">{campaign.contentGuidelines}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
