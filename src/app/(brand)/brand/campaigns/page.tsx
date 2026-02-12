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
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

      <Card>
        <CardHeader>
          <CardTitle>All Campaigns</CardTitle>
          <CardDescription>
            {campaigns?.length ?? 0} campaign{campaigns?.length !== 1 ? "s" : ""} total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!campaigns || campaigns.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                You have not created any campaigns yet.
              </p>
              <Button asChild>
                <Link href="/brand/campaigns/new">Create Your First Campaign</Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Spent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Participants</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell className="font-medium">
                      {campaign.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{campaign.type}</Badge>
                    </TableCell>
                    <TableCell>
                      {formatCurrency(campaign.totalBudget)}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(campaign.spentBudget)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          statusColors[campaign.status] ?? "bg-gray-100 text-gray-700"
                        }
                      >
                        {campaign.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{campaign._count.participations}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/brand/campaigns/${campaign.id}`}>
                            View
                          </Link>
                        </Button>
                        {campaign.status === "LIVE" && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={pausingId === campaign.id}
                            onClick={() => handlePause(campaign.id)}
                          >
                            {pausingId === campaign.id ? "Pausing..." : "Pause"}
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={duplicatingId === campaign.id}
                          onClick={() => handleDuplicate(campaign.id)}
                        >
                          {duplicatingId === campaign.id
                            ? "Duplicating..."
                            : "Duplicate"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
