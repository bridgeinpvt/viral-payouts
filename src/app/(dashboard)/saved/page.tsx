"use client";

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Scissors,
  Video,
  Share2,
  Clock,
  DollarSign,
  Bookmark,
  BookmarkCheck,
  Loader2,
  Search,
} from "lucide-react";
import { trpc } from "@/trpc/client";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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

export default function SavedCampaignsPage() {
  const { data: campaigns, isLoading, refetch } = trpc.campaign.getSavedCampaigns.useQuery();

  const toggleSave = trpc.campaign.toggleSaveCampaign.useMutation({
    onSuccess: (data) => {
      toast.success(data.saved ? "Campaign saved" : "Campaign removed from saved");
      refetch();
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
        <h1 className="text-2xl font-bold text-foreground">Saved Campaigns</h1>
        <p className="text-muted-foreground">
          Campaigns you've bookmarked for later
        </p>
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
                      className="text-primary hover:text-primary/80 transition-colors"
                    >
                      <BookmarkCheck className="h-5 w-5" />
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
              <Bookmark className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">No saved campaigns</h3>
            <p className="text-muted-foreground text-center mb-4">
              Save campaigns from the marketplace to review them later
            </p>
            <Button asChild>
              <Link href="/marketplace">Browse Marketplace</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
