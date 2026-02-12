import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { db } from "@/server/db";
import { createRazorpayOrder } from "@/lib/razorpay";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "BRAND") {
      return NextResponse.json({ error: "Only brands can fund wallets" }, { status: 403 });
    }

    const { amount } = await request.json();

    if (!amount || amount < 1000) {
      return NextResponse.json(
        { error: "Minimum top-up amount is Rs. 1,000" },
        { status: 400 }
      );
    }

    // Get or create brand wallet
    let wallet = await db.wallet.findUnique({
      where: { userId: session.user.id },
    });

    if (!wallet) {
      wallet = await db.wallet.create({
        data: {
          userId: session.user.id,
          type: "BRAND",
        },
      });
    }

    const order = await createRazorpayOrder({
      amount,
      receipt: `wallet_${wallet.id}_${Date.now()}`,
      notes: {
        userId: session.user.id,
        walletId: wallet.id,
        purpose: "wallet_topup",
      },
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Razorpay order creation error:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}
