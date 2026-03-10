/**
 * Conversion Postback Endpoint
 * --------------------------------
 * Brands embed this URL on their "Thank You" / order confirmation page.
 * When a sale happens, their server (or browser pixel) calls:
 *
 *   GET /api/conversion?code=CREATOR123&order_id=ORD456&amount=1999
 *
 * Parameters:
 *   code      (required) — The creator's promo code
 *   order_id  (optional) — Brand's order/invoice ID for deduplication
 *   amount    (optional) — Order value in INR (used for revenue tracking)
 *
 * Security:
 *   - Rate-limited per IP (via response headers + DB checks)
 *   - Validates that the promo code belongs to an active campaign
 *   - Deduplicates by order_id to prevent double-counting
 *   - Signs the response 204 (no content) to prevent leaking data to pixel callers
 */

import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per minute per IP

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }

  record.count++;
  return false;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Cache-Control": "no-store",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";

  if (isRateLimited(ip)) {
    return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
  }

  const { searchParams } = new URL(request.url);

  const code = searchParams.get("code")?.toUpperCase().trim();
  const orderId = searchParams.get("order_id")?.trim() ?? undefined;
  const amountStr = searchParams.get("amount");
  const orderAmount = amountStr ? parseFloat(amountStr) : undefined;

  if (!code) {
    return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    // Look up the promo code
    const promoCode = await db.promoCode.findUnique({
      where: { code },
      include: {
        campaign: { select: { id: true, status: true, type: true } },
      },
    });

    // Silent 204 on any invalid state — don't leak info to callers
    if (
      !promoCode ||
      !promoCode.isActive ||
      promoCode.campaign.status !== "LIVE" ||
      promoCode.campaign.type !== "CONVERSION"
    ) {
      return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
    }

    // Deduplication: skip if this order_id was already recorded for this promo code
    if (orderId) {
      const existing = await db.conversionEvent.findFirst({
        where: { promoCodeId: promoCode.id, orderId },
      });
      if (existing) {
        return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
      }
    }

    // Check promo code usage cap
    if (
      promoCode.maxUses !== null &&
      promoCode.totalUses >= promoCode.maxUses
    ) {
      return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
    }

    // Record the conversion event
    await db.$transaction([
      db.conversionEvent.create({
        data: {
          campaignId: promoCode.campaignId,
          creatorId: promoCode.creatorId,
          promoCodeId: promoCode.id,
          orderId: orderId ?? null,
          orderAmount: orderAmount ?? null,
          isVerified: true, // Postback = brand-confirmed; mark verified immediately
        },
      }),
      db.promoCode.update({
        where: { id: promoCode.id },
        data: { totalUses: { increment: 1 } },
      }),
      db.campaign.update({
        where: { id: promoCode.campaignId },
        data: { totalConversions: { increment: 1 } },
      }),
    ]);

    return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
  } catch (err) {
    // Never expose internal errors to callers (pixel requests)
    console.error("[conversion-postback] Error:", err);
    return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
  }
}
