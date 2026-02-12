"use client";

import { api } from "@/trpc/provider";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { Search } from "lucide-react";
import Link from "next/link";

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  FUNDING: "bg-yellow-100 text-yellow-800",
  LIVE: "bg-green-100 text-green-800",
  PAUSED: "bg-orange-100 text-orange-800",
  COMPLETED: "bg-blue-100 text-blue-800",
  CANCELLED: "bg-red-100 text-red-800",
};

export default function AdminCampaignsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>(
    undefined
  );

  const { data, isLoading } = api.admin.listCampaigns.useQuery({
    search: search || undefined,
    status: statusFilter,
    limit: 50,
  });

  const statuses = ["ALL", "LIVE", "DRAFT", "FUNDING", "PAUSED", "COMPLETED", "CANCELLED"];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">All Campaigns</h1>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">All Campaigns</h1>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search campaigns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border bg-background pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s === "ALL" ? undefined : s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                (s === "ALL" && !statusFilter) || statusFilter === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Campaign List */}
      <div className="space-y-3">
        {data?.campaigns && data.campaigns.length > 0 ? (
          data.campaigns.map((campaign) => (
            <Link key={campaign.id} href={`/admin/campaigns/${campaign.id}`}>
              <Card className="hover:bg-muted/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{campaign.name}</p>
                        <Badge variant="outline">{campaign.type}</Badge>
                        {(campaign._count.fraudFlags ?? 0) > 0 && (
                          <Badge variant="destructive">
                            {campaign._count.fraudFlags} fraud flags
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Brand:{" "}
                        {campaign.brand.brandProfile?.companyName ??
                          campaign.brand.name}{" "}
                        · {campaign._count.participations} creators
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          ₹{campaign.spentBudget.toLocaleString("en-IN")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          of ₹{campaign.totalBudget.toLocaleString("en-IN")}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          statusColors[campaign.status] ?? statusColors.DRAFT
                        }`}
                      >
                        {campaign.status}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        ) : (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">No campaigns found.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
