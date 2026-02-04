"use client";

import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Search,
  Filter,
  Scissors,
  Video,
  Share2,
  Clock,
  DollarSign,
  Users,
  Bookmark,
  BookmarkCheck,
  ChevronRight,
  Loader2,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { trpc } from "@/trpc/client";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const campaignTypes = [
  { id: null, label: "All Campaigns", icon: Sparkles },
  { id: "CLIPPING", label: "Clipping", icon: Scissors },
  { id: "UGC", label: "UGC", icon: Video },
  { id: "JUST_POSTING", label: "Just Posting", icon: Share2 },
];

const categories = [
  "Tech", "Beauty", "Fashion", "Health & Food", "Gaming", "Lifestyle"
];

const typeIcons: Record<string, React.ElementType> = {
  CLIPPING: Scissors,
  UGC: Video,
  JUST_POSTING: Share2,
};

const typeColors: Record<string, string> = {
  CLIPPING: "bg-purple-100 text-purple-700",
  UGC: "bg-blue-100 text-blue-700",
  JUST_POSTING: "bg-green-100 text-green-700",
};

export default function MarketplacePage() {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: campaigns, isLoading } = trpc.campaign.getMarketplaceCampaigns.useQuery({
    type: selectedType as any,
    category: selectedCategory || undefined,
    search: searchQuery || undefined,
  });

  const { data: savedCampaigns } = trpc.campaign.getSavedCampaigns.useQuery();
  const savedIds = new Set(savedCampaigns?.map((c) => c.id) || []);

  const toggleSave = trpc.campaign.toggleSaveCampaign.useMutation({
    onSuccess: (data) => {
      toast.success(data.saved ? "Campaign saved" : "Campaign removed from saved");
    },
  });

  const getDaysRemaining = (endDate: Date | string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  const getPayoutRemaining = (campaign: any) => {
    const remaining = campaign.totalBudget - campaign.spentBudget;
    const percentage = Math.round((remaining / campaign.totalBudget) * 100);
    return { remaining, percentage };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Viral Payout Opportunities</h1>
        <p className="text-muted-foreground">
          Discover new opportunities to earn rewards
        </p>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search brands or products..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" />
          Filters
        </Button>
        <div className="text-sm text-muted-foreground flex items-center">
          Sort by: <span className="font-medium ml-1">Newest</span>
        </div>
      </div>

      {/* Type Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {campaignTypes.map((type) => (
          <button
            key={type.id || "all"}
            onClick={() => setSelectedType(type.id)}
            className={cn(
              "flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors",
              selectedType === type.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            <type.icon className="h-4 w-4" />
            {type.label}
          </button>
        ))}
      </div>

      {/* Category Pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(selectedCategory === category ? null : category)}
            className={cn(
              "whitespace-nowrap rounded-full border px-3 py-1 text-sm transition-colors",
              selectedCategory === category
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/50"
            )}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Campaigns Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : campaigns && campaigns.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => {
            const TypeIcon = typeIcons[campaign.type] || Video;
            const daysRemaining = getDaysRemaining(campaign.endDate);
            const { remaining, percentage } = getPayoutRemaining(campaign);
            const isSaved = savedIds.has(campaign.id);

            return (
              <Card key={campaign.id} className="group hover:shadow-lg transition-all overflow-hidden">
                {/* Header with Type Badge */}
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <Badge className={cn("gap-1", typeColors[campaign.type])}>
                      <TypeIcon className="h-3 w-3" />
                      {campaign.type === "JUST_POSTING" ? "Just Posting" : campaign.type}
                    </Badge>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        toggleSave.mutate({ campaignId: campaign.id });
                      }}
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      {isSaved ? (
                        <BookmarkCheck className="h-5 w-5 text-primary" />
                      ) : (
                        <Bookmark className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Category Badge */}
                  {campaign.targetCategories[0] && (
                    <Badge variant="outline" className="text-xs">
                      {campaign.targetCategories[0]}
                    </Badge>
                  )}

                  {/* Campaign Icon & Name */}
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
                      <TypeIcon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">
                        {campaign.name || campaign.productName || "Campaign"}
                      </h3>
                      <p className="text-sm text-muted-foreground truncate">
                        {campaign.brand.brandProfile?.companyName || campaign.brand.name}
                      </p>
                    </div>
                  </div>

                  {/* Brief */}
                  {campaign.campaignBrief && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {campaign.campaignBrief}
                    </p>
                  )}

                  {/* Stats Row */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <DollarSign className="h-4 w-4" />
                      <span className="font-medium text-foreground">
                        {formatCurrency(campaign.totalBudget)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{daysRemaining} Days</span>
                    </div>
                  </div>

                  {/* Payout Remaining Progress */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Payout Remaining</span>
                      <span className="font-medium">{percentage}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="gap-2 pt-0">
                  <Button variant="outline" className="flex-1" asChild>
                    <Link href={`/marketplace/${campaign.id}`}>
                      Details
                    </Link>
                  </Button>
                  <Button className="flex-1" asChild>
                    <Link href={`/marketplace/${campaign.id}?apply=true`}>
                      Participate
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">No campaigns found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchQuery || selectedType || selectedCategory
                ? "Try adjusting your filters"
                : "Check back later for new opportunities"}
            </p>
            {(searchQuery || selectedType || selectedCategory) && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedType(null);
                  setSelectedCategory(null);
                }}
              >
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
