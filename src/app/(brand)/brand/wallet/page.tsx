"use client";

import { useState, useCallback } from "react";
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
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => {
      open: () => void;
    };
  }
}

function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  EARNING: "Earning",
  WITHDRAWAL: "Withdrawal",
  BONUS: "Bonus",
  REFUND: "Refund",
  CAMPAIGN_FUND: "Campaign Fund",
  ESCROW_LOCK: "Escrow Lock",
  ESCROW_RELEASE: "Escrow Release",
  PLATFORM_FEE: "Platform Fee",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  COMPLETED: "default",
  PENDING: "outline",
  FAILED: "destructive",
  CANCELLED: "secondary",
  REFUNDED: "secondary",
};

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function BalanceSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-28" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-36" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function BrandWalletPage() {
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [amount, setAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const utils = trpc.useUtils();

  const { data: wallet, isLoading: walletLoading } =
    trpc.wallet.getBrandWallet.useQuery();

  const { data: txData, isLoading: txLoading } =
    trpc.wallet.getTransactions.useQuery({ limit: 20 });

  const recordFunding = trpc.wallet.recordBrandWalletFunding.useMutation({
    onSuccess: () => {
      utils.wallet.getBrandWallet.invalidate();
      utils.wallet.getTransactions.invalidate();
      setShowAddMoney(false);
      setAmount("");
    },
  });

  const handleAddMoney = useCallback(async () => {
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount < 1000) return;
    if (!wallet?.id) return;

    setIsProcessing(true);

    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        alert("Failed to load Razorpay. Please check your internet connection.");
        setIsProcessing(false);
        return;
      }

      const response = await fetch("/api/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: numericAmount, walletId: wallet.id }),
      });

      if (!response.ok) {
        alert("Failed to create payment order. Please try again.");
        setIsProcessing(false);
        return;
      }

      const orderData = await response.json();

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency || "INR",
        name: "Viral Payouts",
        description: "Add funds to wallet",
        order_id: orderData.orderId,
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
        }) => {
          try {
            await recordFunding.mutateAsync({
              amount: numericAmount,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpayOrderId: response.razorpay_order_id,
            });
          } catch {
            alert("Payment received but recording failed. Please contact support.");
          }
          setIsProcessing(false);
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
          },
        },
        theme: {
          color: "#6366f1",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch {
      alert("Something went wrong. Please try again.");
      setIsProcessing(false);
    }
  }, [amount, wallet?.id, recordFunding]);

  const availableBalance = wallet?.availableBalance ?? 0;
  const escrowBalance = wallet?.escrowBalance ?? (wallet as any)?.totalEscrowLocked ?? 0;
  const totalBalance = availableBalance + escrowBalance;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Wallet</h1>
        <p className="text-muted-foreground mt-1">
          Manage your funds, add money, and view transaction history.
        </p>
      </div>

      {/* Balance Cards */}
      {walletLoading ? (
        <BalanceSkeleton />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Available Balance</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(availableBalance)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Escrow Locked</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-amber-600">
                {formatCurrency(escrowBalance)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {formatCurrency(totalBalance)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Money Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Add Money</CardTitle>
              <CardDescription>
                Fund your wallet to run campaigns.
              </CardDescription>
            </div>
            {!showAddMoney && (
              <Button onClick={() => setShowAddMoney(true)}>Add Money</Button>
            )}
          </div>
        </CardHeader>
        {showAddMoney && (
          <CardContent>
            <div className="flex items-end gap-4">
              <div className="flex-1 space-y-2">
                <label
                  htmlFor="add-money-amount"
                  className="text-sm font-medium"
                >
                  Amount (min ₹1,000)
                </label>
                <Input
                  id="add-money-amount"
                  type="number"
                  min={1000}
                  step={100}
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleAddMoney}
                  disabled={
                    isProcessing ||
                    !amount ||
                    Number(amount) < 1000 ||
                    recordFunding.isPending
                  }
                >
                  {isProcessing ? "Processing..." : "Pay with Razorpay"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddMoney(false);
                    setAmount("");
                  }}
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>
            Your recent wallet transactions.
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
              {txLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : txData?.transactions.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground py-8"
                  >
                    No transactions yet.
                  </TableCell>
                </TableRow>
              ) : (
                txData?.transactions.map((tx) => {
                  const isCredit = [
                    "EARNING",
                    "BONUS",
                    "REFUND",
                    "ESCROW_RELEASE",
                  ].includes(tx.type);

                  return (
                    <TableRow key={tx.id}>
                      <TableCell>
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {TRANSACTION_TYPE_LABELS[tx.type] ?? tx.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {tx.description || "-"}
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium ${isCredit ? "text-green-600" : "text-red-600"
                          }`}
                      >
                        {isCredit ? "+" : "-"}
                        {formatCurrency(Math.abs(tx.amount))}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[tx.status] ?? "outline"}>
                          {tx.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
