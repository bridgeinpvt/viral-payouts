"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { CampaignType, Platform } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const typeLabels: Record<CampaignType, string> = {
  VIEW: "Views",
  CLICK: "Clicks",
  CONVERSION: "Conversions",
};

const typeColors: Record<CampaignType, string> = {
  VIEW: "bg-blue-100 text-blue-700 border-blue-200",
  CLICK: "bg-green-100 text-green-700 border-green-200",
  CONVERSION: "bg-purple-100 text-purple-700 border-purple-200",
};

const platformLabels: Record<Platform, string> = {
  INSTAGRAM: "Instagram",
  YOUTUBE: "YouTube",
  TWITTER: "Twitter",
  LINKEDIN: "LinkedIn",
  TIKTOK: "TikTok",
};

function formatPayout(
  type: CampaignType,
  campaign: {
    payoutPer1KViews?: number | null;
    payoutPerClick?: number | null;
    payoutPerSale?: number | null;
  }
) {
  switch (type) {
    case "VIEW":
      return `₹${campaign.payoutPer1KViews ?? 0} per 1K views`;
    case "CLICK":
      return `₹${campaign.payoutPerClick ?? 0} per click`;
    case "CONVERSION":
      return `₹${campaign.payoutPerSale ?? 0} per sale`;
  }
}

export default function CreatorMarketplacePage() {
  const utils = trpc.useUtils();

  const [typeFilter, setTypeFilter] = useState<CampaignType | undefined>(
    undefined
  );
  const [platformFilter, setPlatformFilter] = useState<Platform | undefined>(
    undefined
  );
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [selectedPlatforms, setSelectedPlatforms] = useState<
    Record<string, Platform>
  >({});

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    trpc.campaign.getMarketplaceCampaigns.useInfiniteQuery(
      {
        type: typeFilter,
        platform: platformFilter,
        search: search || undefined,
        limit: 20,
      },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
      }
    );

  const applyMutation = trpc.campaign.applyToCampaign.useMutation({
    onSuccess: (_data, variables) => {
      if (variables) {
        setAppliedIds((prev) => new Set(prev).add(variables.campaignId));
      }
      utils.campaign.getMarketplaceCampaigns.invalidate();
    },
  });

  function handleApply(campaignId: string) {
    const platform = selectedPlatforms[campaignId];
    if (!platform) {
      alert("Please select a platform before applying.");
      return;
    }
    setApplyingId(campaignId);
    applyMutation.mutate(
      { campaignId, platforms: [platform] },
      {
        onSettled: () => setApplyingId(null),
        onError: (error) => {
          alert(error.message || "Failed to apply. Please try again.");
        },
      }
    );
  }

  function handleSearch() {
    setSearch(searchInput);
  }

  const campaigns = data?.pages.flatMap((page) => page.campaigns) ?? [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Marketplace</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Discover campaigns and start earning
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={typeFilter ?? "ALL"}
          onValueChange={(val) =>
            setTypeFilter(val === "ALL" ? undefined : (val as CampaignType))
          }
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Campaign Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            <SelectItem value="VIEW">Views</SelectItem>
            <SelectItem value="CLICK">Clicks</SelectItem>
            <SelectItem value="CONVERSION">Conversions</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={platformFilter ?? "ALL"}
          onValueChange={(val) =>
            setPlatformFilter(val === "ALL" ? undefined : (val as Platform))
          }
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Platforms</SelectItem>
            {Object.entries(platformLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          <Input
            placeholder="Search campaigns..."
            className="w-[240px]"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
          />
          <Button variant="outline" onClick={handleSearch}>
            Search
          </Button>
        </div>
      </div>

      {/* Campaign Grid */}
      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No campaigns found. Try adjusting your filters.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {campaigns.map((campaign) => (
              <Card key={campaign.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      {campaign.brand.brandProfile?.companyLogo ? (
                        <img
                          src={campaign.brand.brandProfile.companyLogo}
                          alt={
                            campaign.brand.brandProfile.companyName ??
                            campaign.brand.name
                          }
                          className="h-10 w-10 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-medium text-muted-foreground">
                            {(
                              campaign.brand.brandProfile?.companyName ??
                              campaign.brand.name
                            )
                              .charAt(0)
                              .toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm text-muted-foreground truncate">
                          {campaign.brand.brandProfile?.companyName ??
                            campaign.brand.name}
                          {campaign.brand.brandProfile?.isVerified && (
                            <span className="ml-1 text-blue-500" title="Verified">
                              &#10003;
                            </span>
                          )}
                        </p>
                        <CardTitle className="text-base truncate">
                          {campaign.name}
                        </CardTitle>
                      </div>
                    </div>
                    <Badge className={typeColors[campaign.type]}>
                      {typeLabels[campaign.type]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-3">
                  {campaign.description && (
                    <CardDescription className="line-clamp-2">
                      {campaign.description}
                    </CardDescription>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {campaign.targetPlatforms.map((p: string) => (
                      <Badge key={p} variant="outline" className="text-xs">
                        {platformLabels[p as Platform] ?? p}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-sm font-semibold text-primary">
                    {formatPayout(campaign.type, campaign)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {campaign._count.participations} participant
                    {campaign._count.participations !== 1 ? "s" : ""}
                  </p>
                </CardContent>
                <CardFooter className="flex items-center gap-2">
                  <Select
                    value={selectedPlatforms[campaign.id] ?? ""}
                    onValueChange={(val) =>
                      setSelectedPlatforms((prev) => ({
                        ...prev,
                        [campaign.id]: val as Platform,
                      }))
                    }
                  >
                    <SelectTrigger className="w-[130px]">
                      <SelectValue placeholder="Platform" />
                    </SelectTrigger>
                    <SelectContent>
                      {campaign.targetPlatforms.map((p: string) => (
                        <SelectItem key={p} value={p}>
                          {platformLabels[p as Platform] ?? p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    className="flex-1"
                    disabled={
                      applyingId === campaign.id || appliedIds.has(campaign.id)
                    }
                    onClick={() => handleApply(campaign.id)}
                  >
                    {appliedIds.has(campaign.id)
                      ? "Applied"
                      : applyingId === campaign.id
                        ? "Applying..."
                        : "Apply"}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>

          {hasNextPage && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? "Loading..." : "Load More"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
