import Razorpay from "razorpay";
import crypto from "crypto";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export { razorpay };

// Create a Razorpay customer (for brand onboarding)
export async function createRazorpayCustomer(params: {
  name: string;
  email: string;
  contact?: string;
}) {
  const customer = await razorpay.customers.create({
    name: params.name,
    email: params.email,
    contact: params.contact || "",
    fail_existing: 0,
  });
  return customer;
}

// Create a Razorpay order (for brand wallet top-up)
export async function createRazorpayOrder(params: {
  amount: number; // in rupees
  receipt: string;
  notes?: Record<string, string>;
}) {
  const order = await razorpay.orders.create({
    amount: Math.round(params.amount * 100), // convert to paise
    currency: "INR",
    receipt: params.receipt,
    notes: params.notes || {},
  });
  return order;
}

// Verify Razorpay payment signature
export function verifyPaymentSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}) {
  const body = `${params.orderId}|${params.paymentId}`;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(body)
    .digest("hex");
  return expectedSignature === params.signature;
}

// Verify webhook signature
export function verifyWebhookSignature(body: string, signature: string) {
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(body)
    .digest("hex");
  return expectedSignature === signature;
}

// Create a fund account for creator payouts
export async function createFundAccount(params: {
  contactId: string;
  accountType: "vpa" | "bank_account";
  vpa?: { address: string };
  bankAccount?: {
    name: string;
    ifsc: string;
    accountNumber: string;
  };
}) {
  const fundAccount = await (razorpay as any).fundAccount.create({
    contact_id: params.contactId,
    account_type: params.accountType,
    ...(params.accountType === "vpa" && { vpa: params.vpa }),
    ...(params.accountType === "bank_account" && {
      bank_account: {
        name: params.bankAccount!.name,
        ifsc: params.bankAccount!.ifsc,
        account_number: params.bankAccount!.accountNumber,
      },
    }),
  });
  return fundAccount;
}

// Create a payout to creator
export async function createRazorpayPayout(params: {
  fundAccountId: string;
  amount: number; // in rupees
  purpose: string;
  referenceId: string;
  narration?: string;
}) {
  const payout = await (razorpay as any).payouts.create({
    account_number: process.env.RAZORPAY_ACCOUNT_NUMBER,
    fund_account_id: params.fundAccountId,
    amount: Math.round(params.amount * 100), // convert to paise
    currency: "INR",
    mode: "UPI", // or NEFT, IMPS, RTGS
    purpose: params.purpose,
    queue_if_low_balance: true,
    reference_id: params.referenceId,
    narration: params.narration || "Nocage Creator Payout",
  });
  return payout;
}
