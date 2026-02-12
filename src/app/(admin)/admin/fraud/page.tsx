"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const FRAUD_STATUSES = ["DETECTED", "INVESTIGATING", "CONFIRMED", "DISMISSED"] as const;
const FRAUD_TYPES = [
  "VIEW_SPIKE",
  "CLICK_ANOMALY",
  "CONVERSION_MISMATCH",
  "BOT_DETECTED",
  "IP_ABUSE",
] as const;

function getSeverityColor(severity: number): string {
  if (severity >= 4) return "bg-red-500 text-white";
  if (severity === 3) return "bg-orange-500 text-white";
  return "bg-yellow-500 text-white";
}

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "CONFIRMED":
      return "destructive";
    case "DISMISSED":
      return "outline";
    case "INVESTIGATING":
      return "default";
    default:
      return "secondary";
  }
}

export default function FraudMonitoringPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [minSeverity, setMinSeverity] = useState<string>("all");
  const [resolveNotes, setResolveNotes] = useState<Record<string, string>>({});

  const utils = trpc.useUtils();

  const queryParams: {
    status?: "DETECTED" | "INVESTIGATING" | "CONFIRMED" | "DISMISSED";
    type?: string;
    minSeverity?: number;
    limit: number;
  } = { limit: 50 };

  if (statusFilter !== "all") queryParams.status = statusFilter as "DETECTED" | "INVESTIGATING" | "CONFIRMED" | "DISMISSED";
  if (typeFilter !== "all") queryParams.type = typeFilter;
  if (minSeverity !== "all") queryParams.minSeverity = parseInt(minSeverity);

  const { data, isLoading } = trpc.admin.getFraudFlags.useQuery(queryParams);

  const resolveMutation = trpc.admin.resolveFraudFlag.useMutation({
    onSuccess: () => {
      utils.admin.getFraudFlags.invalidate();
    },
  });

  function handleResolve(flagId: string, status: "INVESTIGATING" | "CONFIRMED" | "DISMISSED") {
    resolveMutation.mutate({
      flagId,
      status,
      note: resolveNotes[flagId] ?? "",
    });
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">Fraud Monitoring</h1>

      {/* Filter Bar */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <div className="w-48">
              <label className="mb-1 block text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {FRAUD_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-48">
              <label className="mb-1 block text-sm font-medium">Type</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {FRAUD_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-48">
              <label className="mb-1 block text-sm font-medium">
                Min Severity
              </label>
              <Select value={minSeverity} onValueChange={setMinSeverity}>
                <SelectTrigger>
                  <SelectValue placeholder="Any Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Severity</SelectItem>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <SelectItem key={s} value={s.toString()}>
                      {s}+
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fraud Flags Table */}
      <Card>
        <CardHeader>
          <CardTitle>Fraud Flags</CardTitle>
          <CardDescription>
            {data?.flags?.length ?? 0} flags found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.flags?.map((flag) => (
                  <TableRow key={flag.id}>
                    <TableCell className="whitespace-nowrap">
                      {new Date(flag.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {flag.type.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getSeverityColor(flag.severity)}>
                        {flag.severity}/5
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {flag.campaign ? (
                        <a
                          href={`/admin/campaigns/${flag.campaign.id}`}
                          className="text-primary hover:underline"
                        >
                          {flag.campaign.name}
                        </a>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {flag.description}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(flag.status)}>
                        {flag.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {flag.status !== "CONFIRMED" &&
                        flag.status !== "DISMISSED" && (
                          <div className="flex items-center gap-2">
                            <Input
                              placeholder="Note..."
                              value={resolveNotes[flag.id] ?? ""}
                              onChange={(e) =>
                                setResolveNotes((prev) => ({
                                  ...prev,
                                  [flag.id]: e.target.value,
                                }))
                              }
                              className="w-24"
                            />
                            {flag.status === "DETECTED" && (
                              <Button
                                size="sm"
                                variant="secondary"
                                disabled={resolveMutation.isPending}
                                onClick={() =>
                                  handleResolve(flag.id, "INVESTIGATING")
                                }
                              >
                                Investigate
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={resolveMutation.isPending}
                              onClick={() =>
                                handleResolve(flag.id, "CONFIRMED")
                              }
                            >
                              Confirm
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={resolveMutation.isPending}
                              onClick={() =>
                                handleResolve(flag.id, "DISMISSED")
                              }
                            >
                              Dismiss
                            </Button>
                          </div>
                        )}
                      {(flag.status === "CONFIRMED" ||
                        flag.status === "DISMISSED") && (
                        <span className="text-sm text-muted-foreground">
                          Resolved
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {(!data?.flags || data.flags.length === 0) && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-muted-foreground"
                    >
                      No fraud flags found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
