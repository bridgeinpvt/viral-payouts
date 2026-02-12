"use client";

import { useState } from "react";
import Link from "next/link";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CAMPAIGN_TYPES = ["VIEW", "CLICK", "CONVERSION"] as const;
type CampaignType = (typeof CAMPAIGN_TYPES)[number];

const PLATFORMS = [
  "INSTAGRAM",
  "YOUTUBE",
  "TWITTER",
  "LINKEDIN",
  "TIKTOK",
] as const;
type Platform = (typeof PLATFORMS)[number];

const TYPE_BADGE_STYLES: Record<CampaignType, string> = {
  VIEW: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100",
  CLICK: "bg-green-100 text-green-800 border-green-200 hover:bg-green-100",
  CONVERSION:
    "bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-100",
};

const PLATFORM_LABELS: Record<Platform, string> = {
  INSTAGRAM: "Instagram",
  YOUTUBE: "YouTube",
  TWITTER: "Twitter",
  LINKEDIN: "LinkedIn",
  TIKTOK: "TikTok",
};

function formatPayout(campaign: {
  type?: string | null;
  payoutPer1KViews?: number | null;
  payoutPerClick?: number | null;
  payoutPerSale?: number | null;
}) {
  switch (campaign.type) {
    case "VIEW":
      return `\u20B9${campaign.payoutPer1KViews ?? 0} per 1K views`;
    case "CLICK":
      return `\u20B9${campaign.payoutPerClick ?? 0} per click`;
    case "CONVERSION":
      return `\u20B9${campaign.payoutPerSale ?? 0} per sale`;
    default:
      return "";
  }
}

function CampaignCardSkeleton() {
  return (
    <Card className="flex flex-col">
      <CardHeader className="space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <Skeleton className="h-5 w-3/4" />
      </CardHeader>
      <CardContent className="flex-1 space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </CardContent>
      <CardFooter>
        <Skeleton className="h-9 w-full rounded-md" />
      </CardFooter>
    </Card>
  );
}

export default function MarketplacePage() {
  const [typeFilter, setTypeFilter] = useState<CampaignType | "ALL">("ALL");
  const [platformFilter, setPlatformFilter] = useState<Platform | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(
    null
  );

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (debounceTimer) clearTimeout(debounceTimer);
    const timer = setTimeout(() => {
      setDebouncedSearch(value);
    }, 400);
    setDebounceTimer(timer);
  };

  const queryInput = {
    ...(typeFilter !== "ALL" && { type: typeFilter as CampaignType }),
    ...(platformFilter !== "ALL" && { platform: platformFilter as Platform }),
    ...(debouncedSearch.trim() && { search: debouncedSearch.trim() }),
    limit: 20,
  };

  const {
    data,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = trpc.campaign.getMarketplaceCampaigns.useInfiniteQuery(queryInput, {
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const campaigns = data?.pages.flatMap((page) => page.campaigns) ?? [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Hero Section */}
      <section className="border-b bg-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Campaign Marketplace
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground sm:text-xl">
              Browse campaigns from top brands. Sign up to apply!
            </p>
          </div>
        </div>
      </section>

      {/* Filter Bar */}
      <section className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex flex-1 gap-3">
              <Select
                value={typeFilter}
                onValueChange={(v) => setTypeFilter(v as CampaignType | "ALL")}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Campaign Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  <SelectItem value="VIEW">View</SelectItem>
                  <SelectItem value="CLICK">Click</SelectItem>
                  <SelectItem value="CONVERSION">Conversion</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={platformFilter}
                onValueChange={(v) => setPlatformFilter(v as Platform | "ALL")}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Platforms</SelectItem>
                  {PLATFORMS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {PLATFORM_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Input
              placeholder="Search campaigns..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="sm:max-w-xs"
            />
          </div>
        </div>
      </section>

      {/* Campaign Grid */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <CampaignCardSkeleton key={i} />
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="rounded-full bg-muted p-6">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
            </div>
            <h3 className="mt-6 text-lg font-semibold">No campaigns found</h3>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              There are no campaigns matching your filters right now. Try
              adjusting your search criteria or check back later.
            </p>
            <Button
              variant="outline"
              className="mt-6"
              onClick={() => {
                setTypeFilter("ALL");
                setPlatformFilter("ALL");
                setSearchQuery("");
                setDebouncedSearch("");
              }}
            >
              Clear filters
            </Button>
          </div>
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {campaigns.map((campaign) => {
                const brandName =
                  campaign.brand.brandProfile?.companyName ||
                  campaign.brand.name;
                const isVerified =
                  campaign.brand.brandProfile?.isVerified ?? false;
                const participantCount =
                  campaign.totalParticipants ??
                  campaign._count?.participations ??
                  0;

                return (
                  <Card
                    key={campaign.id}
                    className="flex flex-col transition-shadow hover:shadow-md"
                  >
                    <CardHeader>
                      {/* Brand Info */}
                      <div className="flex items-center gap-3">
                        {campaign.brand.brandProfile?.companyLogo ? (
                          <img
                            src={campaign.brand.brandProfile.companyLogo}
                            alt={brandName ?? "Brand"}
                            className="h-10 w-10 rounded-full object-cover border"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                            {(brandName ?? "B").charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-sm font-medium">
                              {brandName}
                            </span>
                            {isVerified && (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4 shrink-0 text-blue-500"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Campaign Title + Type Badge */}
                      <div className="flex items-start justify-between gap-2 pt-1">
                        <CardTitle className="text-base leading-snug">
                          {campaign.name}
                        </CardTitle>
                        <Badge
                          className={`shrink-0 text-[11px] ${TYPE_BADGE_STYLES[campaign.type as CampaignType]}`}
                        >
                          {campaign.type}
                        </Badge>
                      </div>

                      {campaign.description && (
                        <CardDescription className="line-clamp-2 text-sm">
                          {campaign.description}
                        </CardDescription>
                      )}
                    </CardHeader>

                    <CardContent className="flex-1 space-y-4">
                      {/* Platforms */}
                      {campaign.targetPlatforms &&
                        campaign.targetPlatforms.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {(campaign.targetPlatforms as Platform[]).map(
                              (platform) => (
                                <Badge
                                  key={platform}
                                  variant="secondary"
                                  className="text-[11px] font-normal"
                                >
                                  {PLATFORM_LABELS[platform] ?? platform}
                                </Badge>
                              )
                            )}
                          </div>
                        )}

                      {/* Payout Info */}
                      <div className="rounded-lg bg-muted/50 px-3 py-2.5">
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Payout
                        </p>
                        <p className="mt-0.5 text-lg font-semibold">
                          {formatPayout(campaign)}
                        </p>
                      </div>

                      {/* Participants */}
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                          />
                        </svg>
                        <span>
                          {participantCount}{" "}
                          {participantCount === 1
                            ? "participant"
                            : "participants"}
                        </span>
                      </div>
                    </CardContent>

                    <CardFooter>
                      <Button asChild className="w-full">
                        <Link href="/signup">Sign up to apply</Link>
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>

            {/* Load More */}
            {hasNextPage && (
              <div className="mt-10 flex justify-center">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage ? "Loading..." : "Load more campaigns"}
                </Button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
