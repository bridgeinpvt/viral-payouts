/**
 * Meta Instagram Webhook endpoint.
 *
 * Handles:
 *  - GET  /api/webhooks/instagram  — hub verification challenge (Meta subscription setup)
 *  - POST /api/webhooks/instagram  — incoming webhook events (mentions, story_insights, etc.)
 *
 * Required env vars:
 *  INSTAGRAM_WEBHOOK_VERIFY_TOKEN   — a random string you choose and configure in Meta App Dashboard
 *  INSTAGRAM_WEBHOOK_SECRET         — the App Secret used to verify X-Hub-Signature-256
 *
 * Meta webhook docs: https://developers.facebook.com/docs/graph-api/webhooks/getting-started
 */

import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/server/db';

// ==========================================
// GET — hub.challenge verification
// ==========================================

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (
    mode === 'subscribe' &&
    token === process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN
  ) {
    console.log('[webhook/instagram] Hub verification succeeded');
    return new Response(challenge, { status: 200 });
  }

  console.warn('[webhook/instagram] Hub verification failed — token mismatch');
  return new Response('Forbidden', { status: 403 });
}

// ==========================================
// POST — incoming events
// ==========================================

export async function POST(request: Request) {
  const rawBody = await request.text();

  // Verify X-Hub-Signature-256 to confirm the payload is from Meta
  const signature = request.headers.get('x-hub-signature-256');
  if (!verifySignature(rawBody, signature)) {
    console.warn('[webhook/instagram] Invalid signature — rejecting');
    return new Response('Unauthorized', { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response('Bad Request', { status: 400 });
  }

  // Process asynchronously — always return 200 immediately so Meta doesn't retry
  void handleEvents(payload).catch((err) =>
    console.error('[webhook/instagram] Event processing error:', err)
  );

  return new Response('OK', { status: 200 });
}

// ==========================================
// Signature verification
// ==========================================

function verifySignature(body: string, header: string | null): boolean {
  const secret = process.env.INSTAGRAM_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[webhook/instagram] INSTAGRAM_WEBHOOK_SECRET not set');
    return false;
  }
  if (!header) return false;

  const expected =
    'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(header));
  } catch {
    return false;
  }
}

// ==========================================
// Event handlers
// ==========================================

async function handleEvents(payload: any) {
  if (!Array.isArray(payload.entry)) return;

  for (const entry of payload.entry) {
    const changes: any[] = entry.changes ?? [];

    for (const change of changes) {
      const field = change.field as string;
      const value = change.value;

      switch (field) {
        case 'mentions':
          await handleMention(entry.id, value);
          break;

        case 'story_insights':
          await handleStoryInsights(entry.id, value);
          break;

        default:
          console.log(`[webhook/instagram] Unhandled field: ${field}`);
      }
    }
  }
}

/**
 * A creator's account was @mentioned in a comment or caption.
 * Log it — could be used for brand safety checks later.
 */
async function handleMention(igUserId: string, value: any) {
  console.log(
    `[webhook/instagram] Mention event for IG user ${igUserId}:`,
    JSON.stringify(value)
  );
  // Future: check if mentioned post belongs to a campaign, flag for review, etc.
}

/**
 * Story insights delivered via webhook (stories expire after 24h, so polling won't work).
 * Store as a ViewSnapshot so they appear in analytics.
 */
async function handleStoryInsights(igUserId: string, value: any) {
  try {
    const mediaId: string | undefined = value?.media_id;
    const impressions: number = value?.impressions ?? 0;
    const reach: number = value?.reach ?? 0;

    if (!mediaId) return;

    // Find the creator by their Instagram User ID
    const creatorProfile = await db.creatorProfile.findFirst({
      where: { instagramUserId: igUserId },
      select: { userId: true },
    });

    if (!creatorProfile) {
      console.log(
        `[webhook/instagram] No creator found for IG user ${igUserId}`
      );
      return;
    }

    // Find an active participation that references this story (by mediaId in contentUrl)
    const participation = await db.campaignParticipation.findFirst({
      where: {
        creatorId: creatorProfile.userId,
        status: { in: ['ACTIVE', 'COMPLETED'] },
        contentUrl: { contains: mediaId },
      },
      select: { campaignId: true, creatorId: true, contentUrl: true },
    });

    if (!participation?.contentUrl) {
      console.log(
        `[webhook/instagram] No participation found for media ${mediaId}`
      );
      return;
    }

    await db.viewSnapshot.create({
      data: {
        campaignId: participation.campaignId,
        creatorId: participation.creatorId,
        platform: 'INSTAGRAM',
        postUrl: participation.contentUrl,
        viewCount: impressions,
        reach,
        deltaViews: 0,
        snapshotAt: new Date(),
      },
    });

    console.log(
      `[webhook/instagram] Stored story insight for creator ${participation.creatorId}: impressions=${impressions} reach=${reach}`
    );
  } catch (err) {
    console.error('[webhook/instagram] handleStoryInsights error:', err);
  }
}
