import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export interface PayoutParams {
  fundAccountId: string;
  amount: number; // in rupees
  referenceId: string;
  narration: string;
}

export async function createPayout(params: PayoutParams) {
  const { fundAccountId, amount, referenceId, narration } = params;

  const payout = await (razorpay as any).payouts.create({
    account_number: process.env.RAZORPAY_ACCOUNT_NUMBER!,
    fund_account_id: fundAccountId,
    amount: Math.round(amount * 100), // Convert to paise
    currency: "INR",
    mode: "UPI", // Default to UPI
    purpose: "payout",
    queue_if_low_balance: true,
    reference_id: referenceId,
    narration,
  } as any);

  return payout;
}

export { razorpay };
