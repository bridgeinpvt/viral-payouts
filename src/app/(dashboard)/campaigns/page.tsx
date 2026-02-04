"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Users,
  DollarSign,
  Calendar,
  TrendingUp,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { trpc } from "@/trpc/client";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  PENDING_REVIEW: "bg-yellow-100 text-yellow-700",
  ACTIVE: "bg-green-100 text-green-700",
  PAUSED: "bg-orange-100 text-orange-700",
  COMPLETED: "bg-blue-100 text-blue-700",
  CANCELLED: "bg-red-100 text-red-700",
};

export default function CampaignsPage() {
  const { data: campaigns, isLoading } = trpc.campaign.getBrandCampaigns.useQuery();

  const stats = {
    totalCampaigns: campaigns?.length || 0,
    activeCampaigns: campaigns?.filter((c) => c.status === "ACTIVE").length || 0,
    totalBudget: campaigns?.reduce((acc, c) => acc + c.totalBudget, 0) || 0,
    totalSubmissions: campaigns?.reduce((acc, c) => acc + c._count.submissions, 0) || 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Campaigns</h1>
          <p className="text-muted-foreground">
            Manage and track all your marketing campaigns
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/campaigns/new">
            <Plus className="h-4 w-4" />
            New Campaign
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Campaigns</p>
                <p className="text-2xl font-bold">{stats.totalCampaigns}</p>
              </div>
              <div className="rounded-lg bg-primary/10 p-2">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">{stats.activeCampaigns}</p>
              </div>
              <div className="rounded-lg bg-green-100 p-2">
                <Eye className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Budget</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalBudget)}</p>
              </div>
              <div className="rounded-lg bg-blue-100 p-2">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Submissions</p>
                <p className="text-2xl font-bold">{stats.totalSubmissions}</p>
              </div>
              <div className="rounded-lg bg-purple-100 p-2">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search campaigns..." className="pl-10" />
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" />
          Filters
        </Button>
      </div>

      {/* Campaigns List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : campaigns && campaigns.length > 0 ? (
        <div className="space-y-4">
          {campaigns.map((campaign) => (
            <Card key={campaign.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <span className="text-lg font-bold text-primary">
                        {campaign.name?.charAt(0) || "C"}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">
                          {campaign.name || "Untitled Campaign"}
                        </h3>
                        <Badge className={cn("text-xs", statusColors[campaign.status])}>
                          {campaign.status}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {campaign.type}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          {formatCurrency(campaign.totalBudget)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {campaign.duration} days
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {campaign._count.submissions} submissions
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/campaigns/${campaign.id}`}>
                        View Details
                      </Link>
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Edit Campaign</DropdownMenuItem>
                        <DropdownMenuItem>Pause Campaign</DropdownMenuItem>
                        <DropdownMenuItem>Duplicate</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Plus className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">No campaigns yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first campaign to start reaching creators
            </p>
            <Button asChild>
              <Link href="/campaigns/new">Create Campaign</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
