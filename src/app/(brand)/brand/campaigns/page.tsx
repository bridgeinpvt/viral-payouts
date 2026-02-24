"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { FileText, Users, Eye, Copy, PauseCircle } from "lucide-react";

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700 border-gray-200",
  FUNDING: "bg-yellow-100 text-yellow-700 border-yellow-200",
  PENDING_REVIEW: "bg-yellow-100 text-yellow-700 border-yellow-200",
  LIVE: "bg-green-100 text-green-700 border-green-200",
  PAUSED: "bg-orange-100 text-orange-700 border-orange-200",
  COMPLETED: "bg-blue-100 text-blue-700 border-blue-200",
  CANCELLED: "bg-red-100 text-red-700 border-red-200",
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function BrandCampaignsPage() {
  const utils = trpc.useUtils();
  const { data: campaigns, isLoading } =
    trpc.campaign.getBrandCampaigns.useQuery();

  const pauseMutation = trpc.campaign.pauseCampaign.useMutation({
    onSuccess: () => {
      utils.campaign.getBrandCampaigns.invalidate();
    },
  });

  const duplicateMutation = trpc.campaign.duplicateCampaign.useMutation({
    onSuccess: () => {
      utils.campaign.getBrandCampaigns.invalidate();
    },
  });

  const [pausingId, setPausingId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  function handlePause(id: string) {
    setPausingId(id);
    pauseMutation.mutate(
      { id },
      {
        onSettled: () => setPausingId(null),
      }
    );
  }

  function handleDuplicate(id: string) {
    setDuplicatingId(id);
    duplicateMutation.mutate(
      { id },
      {
        onSettled: () => setDuplicatingId(null),
      }
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-36" />
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Campaigns</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your brand campaigns
          </p>
        </div>
        <Button asChild>
          <Link href="/brand/campaigns/new">Create Campaign</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {!campaigns || campaigns.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-card rounded-xl border">
            <p className="text-muted-foreground mb-4">
              You have not created any campaigns yet.
            </p>
            <Button asChild>
              <Link href="/brand/campaigns/new">Create Your First Campaign</Link>
            </Button>
          </div>
        ) : (
          campaigns.map((campaign) => {
            const progress = campaign.totalBudget > 0 ? (campaign.spentBudget / campaign.totalBudget) * 100 : 0;
            return (
              <Card key={campaign.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <CardTitle className="text-lg line-clamp-2">{campaign.name}</CardTitle>
                      <Badge variant="outline" className="font-normal">
                        {campaign.type}
                      </Badge>
                    </div>
                    <Badge
                      className={`whitespace-nowrap ${statusColors[campaign.status] ?? "bg-gray-100 text-gray-700"}`}
                    >
                      {campaign.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1">
                      <p className="text-muted-foreground text-xs">Total Budget</p>
                      <p className="font-semibold">{formatCurrency(campaign.totalBudget)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground text-xs">Participants</p>
                      <div className="flex items-center gap-1.5 font-semibold">
                        <Users className="h-3.5 w-3.5" />
                        {campaign._count.participations}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Spent: {formatCurrency(campaign.spentBudget)}</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                </CardContent>
                <CardFooter className="pt-4 border-t bg-muted/40 grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <Link href={`/brand/campaigns/${campaign.id}`}>
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Link>
                  </Button>
                  {campaign.status === "LIVE" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      disabled={pausingId === campaign.id}
                      onClick={() => handlePause(campaign.id)}
                    >
                      <PauseCircle className="h-4 w-4 mr-2" />
                      {pausingId === campaign.id ? "Pausing..." : "Pause"}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      disabled={duplicatingId === campaign.id}
                      onClick={() => handleDuplicate(campaign.id)}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      {duplicatingId === campaign.id ? "Copying..." : "Duplicate"}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
