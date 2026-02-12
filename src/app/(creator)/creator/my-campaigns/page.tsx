"use client";

import { useRouter } from "next/navigation";
import { trpc } from "@/trpc/client";
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
  APPLIED: "bg-yellow-100 text-yellow-700 border-yellow-200",
  APPROVED: "bg-blue-100 text-blue-700 border-blue-200",
  ACTIVE: "bg-green-100 text-green-700 border-green-200",
  COMPLETED: "bg-gray-100 text-gray-700 border-gray-200",
  REJECTED: "bg-red-100 text-red-700 border-red-200",
  FROZEN: "bg-purple-100 text-purple-700 border-purple-200",
};

const typeLabels: Record<string, string> = {
  VIEW: "Views",
  CLICK: "Clicks",
  CONVERSION: "Conversions",
};

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function MyCampaignsPage() {
  const router = useRouter();
  const { data: participations, isLoading } =
    trpc.campaign.getMyParticipations.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
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
      <div>
        <h1 className="text-2xl font-bold">My Campaigns</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track your campaign participations and earnings
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Participations</CardTitle>
          <CardDescription>
            {participations?.length ?? 0} campaign
            {participations?.length !== 1 ? "s" : ""} total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!participations || participations.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                You have not joined any campaigns yet. Visit the{" "}
                <a
                  href="/creator/marketplace"
                  className="text-primary underline"
                >
                  Marketplace
                </a>{" "}
                to find campaigns.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign Name</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Applied Date</TableHead>
                  <TableHead>Tracking</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {participations.map((participation) => (
                  <TableRow
                    key={participation.id}
                    className="cursor-pointer"
                    onClick={() =>
                      router.push(
                        `/creator/my-campaigns/${participation.id}`
                      )
                    }
                  >
                    <TableCell className="font-medium">
                      {participation.campaign.name}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {participation.campaign.brand.brandProfile
                          ?.companyLogo ? (
                          <img
                            src={
                              participation.campaign.brand.brandProfile
                                .companyLogo
                            }
                            alt={
                              participation.campaign.brand.brandProfile
                                .companyName ??
                              participation.campaign.brand.name
                            }
                            className="h-6 w-6 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                            <span className="text-xs font-medium text-muted-foreground">
                              {(
                                participation.campaign.brand.brandProfile
                                  ?.companyName ??
                                participation.campaign.brand.name
                              )
                                .charAt(0)
                                .toUpperCase()}
                            </span>
                          </div>
                        )}
                        <span>
                          {participation.campaign.brand.brandProfile
                            ?.companyName ??
                            participation.campaign.brand.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {typeLabels[participation.campaign.type] ??
                          participation.campaign.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          statusColors[participation.status] ??
                          "bg-gray-100 text-gray-700"
                        }
                      >
                        {participation.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(participation.createdAt)}</TableCell>
                    <TableCell>
                      {participation.trackingLink && (
                        <span className="text-xs text-muted-foreground">
                          {participation.trackingLink.totalClicks} clicks
                        </span>
                      )}
                      {participation.promoCode && (
                        <span className="text-xs text-muted-foreground">
                          {participation.promoCode.code} ({participation.promoCode.totalUses} uses)
                        </span>
                      )}
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
