import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { verifyWebhookSignature } from "@/lib/razorpay";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("x-razorpay-signature");

    if (!signature || !verifyWebhookSignature(body, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(body);
    const eventType = event.event;

    switch (eventType) {
      case "payment.captured": {
        await handlePaymentCaptured(event.payload.payment.entity);
        break;
      }
      case "payout.processed": {
        await handlePayoutProcessed(event.payload.payout.entity);
        break;
      }
      case "payout.failed": {
        await handlePayoutFailed(event.payload.payout.entity);
        break;
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Razorpay webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

async function handlePaymentCaptured(payment: any) {
  const { order_id, amount, notes } = payment;
  const userId = notes?.userId;
  const walletId = notes?.walletId;

  if (!userId || !walletId) {
    console.error("Missing userId or walletId in payment notes");
    return;
  }

  const amountInRupees = amount / 100;

  await db.$transaction([
    // Credit brand wallet
    db.wallet.update({
      where: { id: walletId },
      data: {
        availableBalance: { increment: amountInRupees },
        lifetimeEarnings: { increment: amountInRupees },
      },
    }),
    // Create transaction record
    db.transaction.create({
      data: {
        walletId,
        toUserId: userId,
        amount: amountInRupees,
        type: "CAMPAIGN_FUND",
        status: "COMPLETED",
        description: `Wallet top-up via Razorpay`,
        referenceId: order_id,
        referenceType: "RAZORPAY_ORDER",
      },
    }),
  ]);
}

async function handlePayoutProcessed(payout: any) {
  const { reference_id, id: razorpayPayoutId } = payout;

  if (!reference_id) return;

  await db.payout.updateMany({
    where: { id: reference_id },
    data: {
      status: "COMPLETED",
      razorpayPayoutId,
      processedAt: new Date(),
    },
  });
}

async function handlePayoutFailed(payout: any) {
  const { reference_id, id: razorpayPayoutId, failure_reason } = payout;

  if (!reference_id) return;

  const existingPayout = await db.payout.findUnique({
    where: { id: reference_id },
    include: { wallet: true },
  });

  if (!existingPayout) return;

  await db.$transaction([
    // Mark payout as failed
    db.payout.update({
      where: { id: reference_id },
      data: {
        status: "FAILED",
        razorpayPayoutId,
        failedReason: failure_reason || "Payout failed",
      },
    }),
    // Refund to creator wallet
    db.wallet.update({
      where: { id: existingPayout.walletId },
      data: {
        availableBalance: { increment: existingPayout.amount },
      },
    }),
  ]);
}
