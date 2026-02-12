"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

function formatCurrency(amount: number): string {
  return `\u20B9${amount.toLocaleString("en-IN")}`;
}

function getStatusColor(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "COMPLETED":
    case "APPROVED":
    case "ESCROW_RELEASE":
      return "default";
    case "PENDING":
    case "PENDING_APPROVAL":
    case "PROCESSING":
      return "secondary";
    case "FAILED":
    case "REJECTED":
      return "destructive";
    default:
      return "outline";
  }
}

function getTransactionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    EARNING: "Earning",
    WITHDRAWAL: "Withdrawal",
    BONUS: "Bonus",
    REFUND: "Refund",
    CAMPAIGN_FUND: "Campaign Fund",
    ESCROW_LOCK: "Escrow Lock",
    ESCROW_RELEASE: "Escrow Release",
    PLATFORM_FEE: "Platform Fee",
  };
  return labels[type] ?? type;
}

function BalanceSkeletons() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-28" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TableSkeletons({
  rows = 5,
  cols = 5,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: cols }).map((_, j) => (
            <TableCell key={j}>
              <Skeleton className="h-4 w-20" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

export default function CreatorWalletPage() {
  const utils = trpc.useUtils();

  const { data: wallet, isLoading: walletLoading } =
    trpc.wallet.getCreatorWallet.useQuery();
  const { data: transactionsData, isLoading: transactionsLoading } =
    trpc.wallet.getTransactions.useQuery({ limit: 20 });
  const { data: payouts, isLoading: payoutsLoading } =
    trpc.wallet.getPayouts.useQuery({ limit: 20 });

  const withdrawMutation = trpc.wallet.requestWithdrawal.useMutation({
    onSuccess: () => {
      utils.wallet.getCreatorWallet.invalidate();
      utils.wallet.getTransactions.invalidate();
      utils.wallet.getPayouts.invalidate();
      setWithdrawAmount("");
      setSelectedPaymentMethod("");
    },
  });

  const addPaymentMethodMutation = trpc.wallet.addPaymentMethod.useMutation({
    onSuccess: () => {
      utils.wallet.getCreatorWallet.invalidate();
      setShowAddPayment(false);
      resetPaymentForm();
    },
  });

  // Withdrawal form state
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");

  // Add payment method form state
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [paymentType, setPaymentType] = useState<"UPI" | "BANK_ACCOUNT">("UPI");
  const [upiId, setUpiId] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [accountName, setAccountName] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);

  function resetPaymentForm() {
    setPaymentType("UPI");
    setUpiId("");
    setAccountNumber("");
    setIfsc("");
    setAccountName("");
    setIsPrimary(false);
  }

  function handleWithdraw() {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount < 100) return;
    if (!selectedPaymentMethod) return;
    withdrawMutation.mutate({
      amount,
      paymentMethodId: selectedPaymentMethod,
    });
  }

  function handleAddPaymentMethod() {
    const details: Record<string, string> =
      paymentType === "UPI"
        ? { upiId }
        : { accountNumber, ifsc, accountName };

    addPaymentMethodMutation.mutate({
      type: paymentType,
      details,
      isPrimary,
    });
  }

  const isWithdrawValid =
    parseFloat(withdrawAmount) >= 100 &&
    !!selectedPaymentMethod &&
    !withdrawMutation.isPending;

  const isPaymentFormValid =
    paymentType === "UPI"
      ? upiId.trim().length > 0
      : accountNumber.trim().length > 0 &&
        ifsc.trim().length > 0 &&
        accountName.trim().length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Wallet</h1>
        <p className="text-muted-foreground mt-1">
          Manage your earnings, withdrawals, and payment methods.
        </p>
      </div>

      {/* Balance Cards */}
      {walletLoading ? (
        <BalanceSkeletons />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Available Balance</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(wallet?.availableBalance ?? 0)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pending Balance</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-yellow-600">
                {formatCurrency(wallet?.pendingBalance ?? 0)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Lifetime Earnings</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {formatCurrency(wallet?.lifetimeEarnings ?? 0)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Payment Methods & Withdrawal */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Payment Methods</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddPayment(!showAddPayment)}
              >
                {showAddPayment ? "Cancel" : "Add Payment Method"}
              </Button>
            </div>
            <CardDescription>
              Manage your payout destinations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {showAddPayment && (
              <div className="space-y-4 rounded-lg border p-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={paymentType}
                    onValueChange={(v) =>
                      setPaymentType(v as "UPI" | "BANK_ACCOUNT")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UPI">UPI</SelectItem>
                      <SelectItem value="BANK_ACCOUNT">
                        Bank Account
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {paymentType === "UPI" ? (
                  <div className="space-y-2">
                    <Label htmlFor="upiId">UPI ID</Label>
                    <Input
                      id="upiId"
                      placeholder="yourname@upi"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                    />
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="accountName">Account Holder Name</Label>
                      <Input
                        id="accountName"
                        placeholder="Full name as on bank account"
                        value={accountName}
                        onChange={(e) => setAccountName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="accountNumber">Account Number</Label>
                      <Input
                        id="accountNumber"
                        placeholder="Bank account number"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ifsc">IFSC Code</Label>
                      <Input
                        id="ifsc"
                        placeholder="e.g. SBIN0001234"
                        value={ifsc}
                        onChange={(e) => setIfsc(e.target.value)}
                      />
                    </div>
                  </>
                )}

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="isPrimary"
                    checked={isPrimary}
                    onCheckedChange={(checked) =>
                      setIsPrimary(checked === true)
                    }
                  />
                  <Label htmlFor="isPrimary" className="text-sm">
                    Set as primary payment method
                  </Label>
                </div>

                <Button
                  onClick={handleAddPaymentMethod}
                  disabled={
                    !isPaymentFormValid || addPaymentMethodMutation.isPending
                  }
                  className="w-full"
                >
                  {addPaymentMethodMutation.isPending
                    ? "Adding..."
                    : "Add Payment Method"}
                </Button>
                {addPaymentMethodMutation.isError && (
                  <p className="text-sm text-red-600">
                    {addPaymentMethodMutation.error.message}
                  </p>
                )}
              </div>
            )}

            {walletLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : wallet?.paymentMethods &&
              wallet.paymentMethods.length > 0 ? (
              <div className="space-y-3">
                {wallet.paymentMethods.map((method) => (
                  <div
                    key={method.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">
                          {method.type === "UPI"
                            ? "UPI"
                            : method.type === "BANK_ACCOUNT"
                              ? "Bank Account"
                              : method.type}
                        </p>
                        {method.isPrimary && (
                          <Badge variant="secondary">Primary</Badge>
                        )}
                        {method.isVerified && (
                          <Badge variant="default">Verified</Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground text-xs mt-1">
                        {method.type === "UPI"
                          ? (method.details as Record<string, string>).upiId
                          : method.type === "BANK_ACCOUNT"
                            ? `${(method.details as Record<string, string>).accountName} - ****${((method.details as Record<string, string>).accountNumber ?? "").slice(-4)}`
                            : JSON.stringify(method.details)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center text-sm py-4">
                No payment methods added yet.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Withdrawal Request */}
        <Card>
          <CardHeader>
            <CardTitle>Request Withdrawal</CardTitle>
            <CardDescription>
              Withdraw your available balance to a payment method. Minimum
              withdrawal amount is {formatCurrency(100)}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="withdrawAmount">Amount</Label>
              <Input
                id="withdrawAmount"
                type="number"
                min={100}
                placeholder="Enter amount (min \u20B9100)"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select
                value={selectedPaymentMethod}
                onValueChange={setSelectedPaymentMethod}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  {wallet?.paymentMethods?.map((method) => (
                    <SelectItem key={method.id} value={method.id}>
                      {method.type === "UPI"
                        ? `UPI - ${(method.details as Record<string, string>).upiId}`
                        : method.type === "BANK_ACCOUNT"
                          ? `Bank - ${(method.details as Record<string, string>).accountName}`
                          : method.type}
                      {method.isPrimary ? " (Primary)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-stretch gap-2">
            <Button
              onClick={handleWithdraw}
              disabled={!isWithdrawValid}
              className="w-full"
            >
              {withdrawMutation.isPending
                ? "Processing..."
                : "Request Withdrawal"}
            </Button>
            {withdrawMutation.isError && (
              <p className="text-sm text-red-600">
                {withdrawMutation.error.message}
              </p>
            )}
            {withdrawMutation.isSuccess && (
              <p className="text-sm text-green-600">
                Withdrawal request submitted successfully.
              </p>
            )}
          </CardFooter>
        </Card>
      </div>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>
            All wallet transactions including earnings, withdrawals, and fees.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactionsLoading ? (
                <TableSkeletons rows={5} cols={5} />
              ) : transactionsData?.transactions &&
                transactionsData.transactions.length > 0 ? (
                transactionsData.transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="text-sm">
                      {new Date(tx.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getTransactionTypeLabel(tx.type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {tx.description}
                    </TableCell>
                    <TableCell
                      className={`text-right text-sm font-medium ${
                        tx.type === "EARNING" ||
                        tx.type === "BONUS" ||
                        tx.type === "REFUND" ||
                        tx.type === "ESCROW_RELEASE"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {tx.type === "EARNING" ||
                      tx.type === "BONUS" ||
                      tx.type === "REFUND" ||
                      tx.type === "ESCROW_RELEASE"
                        ? "+"
                        : "-"}
                      {formatCurrency(Math.abs(tx.amount))}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(tx.status)}>
                        {tx.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-muted-foreground text-center"
                  >
                    No transactions yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Payout History */}
      <Card>
        <CardHeader>
          <CardTitle>Payout History</CardTitle>
          <CardDescription>
            Track all your withdrawal payouts and their statuses.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">TDS</TableHead>
                <TableHead className="text-right">Net</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment Method</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payoutsLoading ? (
                <TableSkeletons rows={5} cols={6} />
              ) : payouts && payouts.length > 0 ? (
                payouts.map((payout) => (
                  <TableRow key={payout.id}>
                    <TableCell className="text-sm">
                      {new Date(payout.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {formatCurrency(payout.amount)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-red-600">
                      -{formatCurrency(payout.tdsAmount)}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {formatCurrency(payout.netAmount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(payout.approvalStatus)}>
                        {payout.approvalStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {payout.paymentMethod.type === "UPI"
                        ? `UPI - ${(payout.paymentMethod.details as Record<string, string>).upiId}`
                        : payout.paymentMethod.type === "BANK_ACCOUNT"
                          ? `Bank - ${(payout.paymentMethod.details as Record<string, string>).accountName}`
                          : payout.paymentMethod.type}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-muted-foreground text-center"
                  >
                    No payouts yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
