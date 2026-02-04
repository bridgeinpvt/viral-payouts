"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign,
  Plus,
  Building2,
  Smartphone,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  ArrowDownLeft,
  ArrowUpRight,
  Trash2,
  Star,
  ChevronRight,
  Download,
} from "lucide-react";
import { trpc } from "@/trpc/client";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const paymentMethodIcons: Record<string, React.ElementType> = {
  BANK_ACCOUNT: Building2,
  UPI: Smartphone,
  PAYPAL: CreditCard,
};

const transactionTypeLabels: Record<string, { label: string; color: string }> = {
  EARNING: { label: "Earning", color: "text-green-600" },
  WITHDRAWAL: { label: "Withdrawal", color: "text-red-600" },
  BONUS: { label: "Bonus", color: "text-blue-600" },
  REFUND: { label: "Refund", color: "text-orange-600" },
};

const payoutStatusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  PENDING: { label: "Pending", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  PROCESSING: { label: "Processing", color: "bg-blue-100 text-blue-700", icon: Loader2 },
  COMPLETED: { label: "Completed", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  FAILED: { label: "Failed", color: "bg-red-100 text-red-700", icon: AlertCircle },
};

export default function WalletPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [showAddMethod, setShowAddMethod] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [selectedMethodId, setSelectedMethodId] = useState("");

  // Form state for new payment method
  const [newMethodType, setNewMethodType] = useState<"BANK_ACCOUNT" | "UPI" | "PAYPAL">("UPI");
  const [newMethodDetails, setNewMethodDetails] = useState({
    upiId: "",
    accountNumber: "",
    ifscCode: "",
    accountName: "",
    bankName: "",
    paypalEmail: "",
  });

  const utils = trpc.useUtils();
  const { data: wallet, isLoading: walletLoading } = trpc.wallet.getWallet.useQuery();
  const { data: transactionsData } = trpc.wallet.getTransactions.useQuery({ limit: 10 });
  const { data: payouts } = trpc.wallet.getPayouts.useQuery({ limit: 10 });

  const addPaymentMethod = trpc.wallet.addPaymentMethod.useMutation({
    onSuccess: () => {
      toast.success("Payment method added successfully");
      setShowAddMethod(false);
      setNewMethodDetails({
        upiId: "",
        accountNumber: "",
        ifscCode: "",
        accountName: "",
        bankName: "",
        paypalEmail: "",
      });
      utils.wallet.getWallet.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add payment method");
    },
  });

  const deletePaymentMethod = trpc.wallet.deletePaymentMethod.useMutation({
    onSuccess: () => {
      toast.success("Payment method removed");
      utils.wallet.getWallet.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to remove payment method");
    },
  });

  const updatePaymentMethod = trpc.wallet.updatePaymentMethod.useMutation({
    onSuccess: () => {
      toast.success("Payment method updated");
      utils.wallet.getWallet.invalidate();
    },
  });

  const requestWithdrawal = trpc.wallet.requestWithdrawal.useMutation({
    onSuccess: () => {
      toast.success("Withdrawal request submitted");
      setShowWithdraw(false);
      setWithdrawAmount("");
      utils.wallet.getWallet.invalidate();
      utils.wallet.getPayouts.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to request withdrawal");
    },
  });

  const handleAddMethod = () => {
    let details: Record<string, string> = {};
    if (newMethodType === "UPI") {
      details = { upiId: newMethodDetails.upiId };
    } else if (newMethodType === "BANK_ACCOUNT") {
      details = {
        accountNumber: newMethodDetails.accountNumber,
        ifscCode: newMethodDetails.ifscCode,
        accountName: newMethodDetails.accountName,
        bankName: newMethodDetails.bankName,
      };
    } else if (newMethodType === "PAYPAL") {
      details = { email: newMethodDetails.paypalEmail };
    }

    addPaymentMethod.mutate({
      type: newMethodType,
      details,
      isPrimary: wallet?.paymentMethods?.length === 0,
    });
  };

  const handleWithdraw = () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount < 100) {
      toast.error("Minimum withdrawal amount is ₹100");
      return;
    }
    if (!selectedMethodId) {
      toast.error("Please select a payment method");
      return;
    }
    requestWithdrawal.mutate({ amount, paymentMethodId: selectedMethodId });
  };

  if (walletLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Wallet</h1>
        <p className="text-muted-foreground">
          Manage your earnings and payment methods
        </p>
      </div>

      {/* Balance Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-primary">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Available Balance</p>
                <p className="text-3xl font-bold text-primary">
                  {formatCurrency(wallet?.availableBalance || 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Ready to withdraw</p>
              </div>
              <div className="rounded-lg bg-primary/10 p-3">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
            </div>
            <Button
              className="w-full mt-4"
              onClick={() => setShowWithdraw(true)}
              disabled={(wallet?.availableBalance || 0) < 100}
            >
              Withdraw Funds
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Balance</p>
                <p className="text-2xl font-bold">{formatCurrency(wallet?.pendingBalance || 0)}</p>
                <p className="text-xs text-muted-foreground mt-1">Processing earnings</p>
              </div>
              <div className="rounded-lg bg-yellow-100 p-3">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Lifetime Earnings</p>
                <p className="text-2xl font-bold">{formatCurrency(wallet?.lifetimeEarnings || 0)}</p>
                <p className="text-xs text-muted-foreground mt-1">All time</p>
              </div>
              <div className="rounded-lg bg-green-100 p-3">
                <ArrowUpRight className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="payouts">Payouts</TabsTrigger>
          <TabsTrigger value="payment-methods">Payment Methods</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Recent Transactions */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Recent Transactions</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab("transactions")}>
                  View All
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </CardHeader>
              <CardContent>
                {transactionsData?.transactions && transactionsData.transactions.length > 0 ? (
                  <div className="space-y-3">
                    {transactionsData.transactions.slice(0, 5).map((tx) => {
                      const typeConfig = transactionTypeLabels[tx.type];
                      const isPositive = tx.amount > 0;
                      return (
                        <div
                          key={tx.id}
                          className="flex items-center justify-between py-2 border-b last:border-0"
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "flex h-8 w-8 items-center justify-center rounded-full",
                              isPositive ? "bg-green-100" : "bg-red-100"
                            )}>
                              {isPositive ? (
                                <ArrowDownLeft className="h-4 w-4 text-green-600" />
                              ) : (
                                <ArrowUpRight className="h-4 w-4 text-red-600" />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{tx.description}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(tx.createdAt).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                })}
                              </p>
                            </div>
                          </div>
                          <span className={cn("font-semibold", typeConfig.color)}>
                            {isPositive ? "+" : ""}{formatCurrency(tx.amount)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-sm text-muted-foreground">No transactions yet</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Methods */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Payment Methods</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowAddMethod(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </CardHeader>
              <CardContent>
                {wallet?.paymentMethods && wallet.paymentMethods.length > 0 ? (
                  <div className="space-y-3">
                    {wallet.paymentMethods.map((method) => {
                      const Icon = paymentMethodIcons[method.type] || CreditCard;
                      const details = method.details as Record<string, string>;
                      return (
                        <div
                          key={method.id}
                          className="flex items-center justify-between p-3 rounded-lg border"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                              <Icon className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm">
                                  {method.type === "UPI" && details.upiId}
                                  {method.type === "BANK_ACCOUNT" && `****${details.accountNumber?.slice(-4)}`}
                                  {method.type === "PAYPAL" && details.email}
                                </p>
                                {method.isPrimary && (
                                  <Badge variant="secondary" className="text-xs">
                                    <Star className="h-3 w-3 mr-1" />
                                    Primary
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {method.type.replace("_", " ")}
                              </p>
                            </div>
                          </div>
                          {method.isVerified ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : (
                            <Badge variant="outline" className="text-xs">Pending</Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground mb-3">No payment methods added</p>
                    <Button size="sm" onClick={() => setShowAddMethod(true)}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Payment Method
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>All your wallet transactions</CardDescription>
            </CardHeader>
            <CardContent>
              {transactionsData?.transactions && transactionsData.transactions.length > 0 ? (
                <div className="space-y-3">
                  {transactionsData.transactions.map((tx) => {
                    const typeConfig = transactionTypeLabels[tx.type];
                    const isPositive = tx.amount > 0;
                    return (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between p-4 rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-full",
                            isPositive ? "bg-green-100" : "bg-red-100"
                          )}>
                            {isPositive ? (
                              <ArrowDownLeft className="h-5 w-5 text-green-600" />
                            ) : (
                              <ArrowUpRight className="h-5 w-5 text-red-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{tx.description}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {typeConfig.label}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(tx.createdAt).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                        <span className={cn("text-lg font-semibold", typeConfig.color)}>
                          {isPositive ? "+" : ""}{formatCurrency(tx.amount)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No transactions yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payouts Tab */}
        <TabsContent value="payouts" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Payout History</CardTitle>
              <CardDescription>Track your withdrawal requests</CardDescription>
            </CardHeader>
            <CardContent>
              {payouts && payouts.length > 0 ? (
                <div className="space-y-3">
                  {payouts.map((payout) => {
                    const statusConfig = payoutStatusConfig[payout.status];
                    const StatusIcon = statusConfig.icon;
                    const methodDetails = payout.paymentMethod?.details as Record<string, string>;
                    return (
                      <div
                        key={payout.id}
                        className="flex items-center justify-between p-4 rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                            <Download className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium">{formatCurrency(payout.amount)}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-muted-foreground">
                                To {payout.paymentMethod?.type === "UPI" ? methodDetails?.upiId :
                                    payout.paymentMethod?.type === "BANK_ACCOUNT" ? `****${methodDetails?.accountNumber?.slice(-4)}` :
                                    methodDetails?.email}
                              </span>
                              <span className="text-xs text-muted-foreground">•</span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(payout.createdAt).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Badge className={cn("gap-1", statusConfig.color)}>
                          <StatusIcon className={cn("h-3 w-3", payout.status === "PROCESSING" && "animate-spin")} />
                          {statusConfig.label}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Download className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No payouts yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your withdrawal history will appear here
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Methods Tab */}
        <TabsContent value="payment-methods" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Payment Methods</CardTitle>
                <CardDescription>Manage your withdrawal destinations</CardDescription>
              </div>
              <Button onClick={() => setShowAddMethod(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Method
              </Button>
            </CardHeader>
            <CardContent>
              {wallet?.paymentMethods && wallet.paymentMethods.length > 0 ? (
                <div className="space-y-3">
                  {wallet.paymentMethods.map((method) => {
                    const Icon = paymentMethodIcons[method.type] || CreditCard;
                    const details = method.details as Record<string, string>;
                    return (
                      <div
                        key={method.id}
                        className="flex items-center justify-between p-4 rounded-lg border"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                            <Icon className="h-6 w-6" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">
                                {method.type === "UPI" && details.upiId}
                                {method.type === "BANK_ACCOUNT" && `${details.bankName} - ****${details.accountNumber?.slice(-4)}`}
                                {method.type === "PAYPAL" && details.email}
                              </p>
                              {method.isPrimary && (
                                <Badge className="text-xs bg-primary/10 text-primary">
                                  <Star className="h-3 w-3 mr-1" />
                                  Primary
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {method.type.replace("_", " ")}
                              {method.isVerified ? " • Verified" : " • Pending verification"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!method.isPrimary && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updatePaymentMethod.mutate({ id: method.id, isPrimary: true })}
                            >
                              Set Primary
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => deletePaymentMethod.mutate({ id: method.id })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No payment methods added</p>
                  <p className="text-sm text-muted-foreground mt-1 mb-4">
                    Add a payment method to withdraw your earnings
                  </p>
                  <Button onClick={() => setShowAddMethod(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Payment Method
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Payment Method Dialog */}
      <Dialog open={showAddMethod} onOpenChange={setShowAddMethod}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Payment Method</DialogTitle>
            <DialogDescription>
              Add a new method to receive your earnings
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Method Type</Label>
              <Select value={newMethodType} onValueChange={(v: any) => setNewMethodType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="BANK_ACCOUNT">Bank Account</SelectItem>
                  <SelectItem value="PAYPAL">PayPal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newMethodType === "UPI" && (
              <div className="space-y-2">
                <Label>UPI ID</Label>
                <Input
                  placeholder="yourname@upi"
                  value={newMethodDetails.upiId}
                  onChange={(e) => setNewMethodDetails({ ...newMethodDetails, upiId: e.target.value })}
                />
              </div>
            )}

            {newMethodType === "BANK_ACCOUNT" && (
              <>
                <div className="space-y-2">
                  <Label>Account Holder Name</Label>
                  <Input
                    placeholder="Full name"
                    value={newMethodDetails.accountName}
                    onChange={(e) => setNewMethodDetails({ ...newMethodDetails, accountName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bank Name</Label>
                  <Input
                    placeholder="Bank name"
                    value={newMethodDetails.bankName}
                    onChange={(e) => setNewMethodDetails({ ...newMethodDetails, bankName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Account Number</Label>
                  <Input
                    placeholder="Account number"
                    value={newMethodDetails.accountNumber}
                    onChange={(e) => setNewMethodDetails({ ...newMethodDetails, accountNumber: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>IFSC Code</Label>
                  <Input
                    placeholder="IFSC code"
                    value={newMethodDetails.ifscCode}
                    onChange={(e) => setNewMethodDetails({ ...newMethodDetails, ifscCode: e.target.value })}
                  />
                </div>
              </>
            )}

            {newMethodType === "PAYPAL" && (
              <div className="space-y-2">
                <Label>PayPal Email</Label>
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={newMethodDetails.paypalEmail}
                  onChange={(e) => setNewMethodDetails({ ...newMethodDetails, paypalEmail: e.target.value })}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddMethod(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddMethod} disabled={addPaymentMethod.isPending}>
              {addPaymentMethod.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Method"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Withdraw Dialog */}
      <Dialog open={showWithdraw} onOpenChange={setShowWithdraw}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Withdraw Funds</DialogTitle>
            <DialogDescription>
              Available balance: {formatCurrency(wallet?.availableBalance || 0)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  className="pl-8"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  min={100}
                  max={wallet?.availableBalance || 0}
                />
              </div>
              <p className="text-xs text-muted-foreground">Minimum withdrawal: ₹100</p>
            </div>

            <div className="space-y-2">
              <Label>Withdraw To</Label>
              <Select value={selectedMethodId} onValueChange={setSelectedMethodId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  {wallet?.paymentMethods?.map((method) => {
                    const details = method.details as Record<string, string>;
                    return (
                      <SelectItem key={method.id} value={method.id}>
                        {method.type === "UPI" && details.upiId}
                        {method.type === "BANK_ACCOUNT" && `${details.bankName} - ****${details.accountNumber?.slice(-4)}`}
                        {method.type === "PAYPAL" && details.email}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {(!wallet?.paymentMethods || wallet.paymentMethods.length === 0) && (
                <Button
                  variant="link"
                  className="h-auto p-0 text-sm"
                  onClick={() => {
                    setShowWithdraw(false);
                    setShowAddMethod(true);
                  }}
                >
                  Add a payment method first
                </Button>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWithdraw(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleWithdraw}
              disabled={requestWithdrawal.isPending || !selectedMethodId || !withdrawAmount}
            >
              {requestWithdrawal.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Withdraw"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
