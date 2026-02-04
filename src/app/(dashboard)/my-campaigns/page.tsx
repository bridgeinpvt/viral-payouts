"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Scissors,
  Video,
  Share2,
  Clock,
  DollarSign,
  Eye,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Upload,
  ExternalLink,
  TrendingUp,
  ChevronRight,
} from "lucide-react";
import { trpc } from "@/trpc/client";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

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

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  PENDING: { label: "Pending Review", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  APPROVED: { label: "Approved", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  REJECTED: { label: "Rejected", color: "bg-red-100 text-red-700", icon: XCircle },
  SUBMITTED: { label: "Content Submitted", color: "bg-blue-100 text-blue-700", icon: Upload },
  COMPLETED: { label: "Completed", color: "bg-primary/10 text-primary", icon: CheckCircle2 },
};

export default function MyCampaignsPage() {
  const [activeTab, setActiveTab] = useState("active");

  const { data: submissions, isLoading } = trpc.campaign.getMySubmissions.useQuery();

  const activeSubmissions = submissions?.filter(
    (s) => ["PENDING", "APPROVED", "SUBMITTED"].includes(s.status)
  ) || [];
  const completedSubmissions = submissions?.filter(
    (s) => ["COMPLETED", "REJECTED"].includes(s.status)
  ) || [];

  const stats = {
    active: activeSubmissions.length,
    completed: completedSubmissions.filter((s) => s.status === "COMPLETED").length,
    totalEarned: submissions?.reduce((acc, s) => acc + (s.earnedAmount || 0), 0) || 0,
    totalViews: submissions?.reduce((acc, s) => acc + (s.totalViews || 0), 0) || 0,
  };

  const formatViews = (views: number) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views.toString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Campaigns</h1>
        <p className="text-muted-foreground">
          Track your participation and earnings from campaigns
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Campaigns</p>
                <p className="text-2xl font-bold">{stats.active}</p>
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
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{stats.completed}</p>
              </div>
              <div className="rounded-lg bg-green-100 p-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Earned</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalEarned)}</p>
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
                <p className="text-sm text-muted-foreground">Total Views</p>
                <p className="text-2xl font-bold">{formatViews(stats.totalViews)}</p>
              </div>
              <div className="rounded-lg bg-purple-100 p-2">
                <Eye className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="active" className="gap-2">
            Active
            {stats.active > 0 && (
              <Badge variant="secondary" className="ml-1">
                {stats.active}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-2">
            Completed
            {stats.completed > 0 && (
              <Badge variant="secondary" className="ml-1">
                {completedSubmissions.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <TabsContent value="active" className="mt-6">
              {activeSubmissions.length > 0 ? (
                <div className="space-y-4">
                  {activeSubmissions.map((submission) => {
                    const campaign = submission.campaign;
                    const TypeIcon = typeIcons[campaign.type] || Video;
                    const status = statusConfig[submission.status];
                    const StatusIcon = status.icon;

                    return (
                      <Card key={submission.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-4">
                              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
                                <TypeIcon className="h-6 w-6 text-primary" />
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold">
                                    {campaign.name || campaign.productName || "Campaign"}
                                  </h3>
                                  <Badge className={cn("text-xs", typeColors[campaign.type])}>
                                    {campaign.type}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {campaign.brand.brandProfile?.companyName || campaign.brand.name}
                                </p>
                                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <DollarSign className="h-3 w-3" />
                                    {formatCurrency(submission.earnedAmount || 0)} earned
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Eye className="h-3 w-3" />
                                    {formatViews(submission.totalViews || 0)} views
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <Badge className={cn("gap-1", status.color)}>
                                <StatusIcon className="h-3 w-3" />
                                {status.label}
                              </Badge>
                              <Button variant="outline" size="sm" asChild>
                                <Link href={`/my-campaigns/${submission.id}`}>
                                  View Details
                                  <ChevronRight className="h-4 w-4 ml-1" />
                                </Link>
                              </Button>
                            </div>
                          </div>

                          {/* Action needed section */}
                          {submission.status === "APPROVED" && (
                            <div className="mt-4 rounded-lg bg-primary/5 border border-primary/20 p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <AlertCircle className="h-5 w-5 text-primary" />
                                  <span className="font-medium">Action Required</span>
                                </div>
                                <Button size="sm" asChild>
                                  <Link href={`/my-campaigns/${submission.id}/submit`}>
                                    <Upload className="h-4 w-4 mr-1" />
                                    Submit Content
                                  </Link>
                                </Button>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                Your application was approved. Submit your content to start earning.
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <div className="rounded-full bg-muted p-4 mb-4">
                      <TrendingUp className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">No active campaigns</h3>
                    <p className="text-muted-foreground text-center mb-4">
                      Browse the marketplace to find opportunities
                    </p>
                    <Button asChild>
                      <Link href="/marketplace">Explore Campaigns</Link>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="completed" className="mt-6">
              {completedSubmissions.length > 0 ? (
                <div className="space-y-4">
                  {completedSubmissions.map((submission) => {
                    const campaign = submission.campaign;
                    const TypeIcon = typeIcons[campaign.type] || Video;
                    const status = statusConfig[submission.status];
                    const StatusIcon = status.icon;

                    return (
                      <Card key={submission.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-4">
                              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                                <TypeIcon className="h-6 w-6 text-muted-foreground" />
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold">
                                    {campaign.name || campaign.productName || "Campaign"}
                                  </h3>
                                  <Badge variant="outline" className="text-xs">
                                    {campaign.type}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {campaign.brand.brandProfile?.companyName || campaign.brand.name}
                                </p>
                                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <DollarSign className="h-3 w-3" />
                                    {formatCurrency(submission.earnedAmount || 0)} earned
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Eye className="h-3 w-3" />
                                    {formatViews(submission.totalViews || 0)} views
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <Badge className={cn("gap-1", status.color)}>
                                <StatusIcon className="h-3 w-3" />
                                {status.label}
                              </Badge>
                              <Button variant="ghost" size="sm" asChild>
                                <Link href={`/my-campaigns/${submission.id}`}>
                                  View Details
                                </Link>
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <div className="rounded-full bg-muted p-4 mb-4">
                      <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">No completed campaigns yet</h3>
                    <p className="text-muted-foreground text-center">
                      Completed campaigns will appear here
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
