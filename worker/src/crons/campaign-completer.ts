import { db } from '../db';
import { CampaignStatus } from '@prisma/client';

export async function completeExpiredCampaigns(): Promise<void> {
  const now = new Date();

  const expiredCampaigns = await db.campaign.findMany({
    where: {
      status: CampaignStatus.LIVE,
      endDate: {
        lt: now,
      },
    },
    select: {
      id: true,
      name: true,
      endDate: true,
    },
  });

  if (expiredCampaigns.length === 0) {
    console.log('[campaign-completer] No expired campaigns to complete');
    return;
  }

  console.log(
    `[campaign-completer] Marking ${expiredCampaigns.length} campaigns as COMPLETED`
  );

  await db.campaign.updateMany({
    where: {
      id: {
        in: expiredCampaigns.map((c) => c.id),
      },
    },
    data: {
      status: CampaignStatus.COMPLETED,
    },
  });

  console.log(
    `[campaign-completer] Completed ${expiredCampaigns.length} campaigns`
  );
}
