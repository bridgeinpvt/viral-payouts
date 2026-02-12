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
import { Checkbox } from "@/components/ui/checkbox";

function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function getApprovalBadgeVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "APPROVED":
      return "default";
    case "REJECTED":
      return "destructive";
    case "PENDING":
      return "secondary";
    default:
      return "outline";
  }
}

export default function AdminPayoutsPage() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>(
    {}
  );
  const [showRejectInput, setShowRejectInput] = useState<string | null>(null);

  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.admin.getPendingPayouts.useQuery({
    limit: 50,
  });

  const approveMutation = trpc.admin.approvePayout.useMutation({
    onSuccess: () => {
      utils.admin.getPendingPayouts.invalidate();
    },
  });

  const rejectMutation = trpc.admin.rejectPayout.useMutation({
    onSuccess: () => {
      utils.admin.getPendingPayouts.invalidate();
      setShowRejectInput(null);
    },
  });

  const batchApproveMutation = trpc.admin.batchApprovePayouts.useMutation({
    onSuccess: () => {
      utils.admin.getPendingPayouts.invalidate();
      setSelectedIds(new Set());
    },
  });

  function toggleSelect(payoutId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(payoutId)) {
        next.delete(payoutId);
      } else {
        next.add(payoutId);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    if (!data?.payouts) return;
    if (selectedIds.size === data.payouts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.payouts.map((p) => p.id)));
    }
  }

  function handleBatchApprove() {
    if (selectedIds.size === 0) return;
    batchApproveMutation.mutate({ payoutIds: Array.from(selectedIds) });
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Payout Management</h1>
        {selectedIds.size > 0 && (
          <Button
            onClick={handleBatchApprove}
            disabled={batchApproveMutation.isPending}
          >
            {batchApproveMutation.isPending
              ? "Approving..."
              : `Batch Approve (${selectedIds.size})`}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Payouts</CardTitle>
          <CardDescription>
            {data?.payouts?.length ?? 0} payouts awaiting review
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
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        data?.payouts &&
                        data.payouts.length > 0 &&
                        selectedIds.size === data.payouts.length
                      }
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Creator</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">TDS</TableHead>
                  <TableHead className="text-right">Net Amount</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.payouts?.map((payout) => (
                  <TableRow key={payout.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(payout.id)}
                        onCheckedChange={() => toggleSelect(payout.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {payout.user?.creatorProfile?.displayName ??
                            payout.user?.name ??
                            "Unknown"}
                        </p>
                        {payout.user?.creatorProfile?.tier && (
                          <Badge variant="outline" className="mt-1">
                            {payout.user.creatorProfile.tier}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(payout.amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(payout.tdsAmount)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(payout.netAmount)}
                    </TableCell>
                    <TableCell>
                      {payout.paymentMethod ? (
                        <div>
                          <Badge variant="secondary">
                            {payout.paymentMethod.type}
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {new Date(payout.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={getApprovalBadgeVariant(
                          payout.approvalStatus
                        )}
                      >
                        {payout.approvalStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {payout.approvalStatus === "PENDING_APPROVAL" && (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            disabled={approveMutation.isPending}
                            onClick={() =>
                              approveMutation.mutate({ payoutId: payout.id })
                            }
                          >
                            Approve
                          </Button>

                          {showRejectInput === payout.id ? (
                            <div className="flex items-center gap-1">
                              <Input
                                placeholder="Reason..."
                                value={rejectReasons[payout.id] ?? ""}
                                onChange={(e) =>
                                  setRejectReasons((prev) => ({
                                    ...prev,
                                    [payout.id]: e.target.value,
                                  }))
                                }
                                className="w-32"
                              />
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={
                                  !rejectReasons[payout.id] ||
                                  rejectMutation.isPending
                                }
                                onClick={() =>
                                  rejectMutation.mutate({
                                    payoutId: payout.id,
                                    reason: rejectReasons[payout.id]!,
                                  })
                                }
                              >
                                Confirm
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setShowRejectInput(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setShowRejectInput(payout.id)}
                            >
                              Reject
                            </Button>
                          )}
                        </div>
                      )}
                      {payout.approvalStatus !== "PENDING_APPROVAL" && (
                        <span className="text-sm text-muted-foreground">
                          {payout.approvalStatus === "APPROVED"
                            ? "Approved"
                            : "Rejected"}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {(!data?.payouts || data.payouts.length === 0) && (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="text-center text-muted-foreground"
                    >
                      No pending payouts
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
