import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Clearing database...");

  await prisma.transaction.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.payout.deleteMany({});
  await prisma.trackingLink.deleteMany({});
  await prisma.savedCampaign.deleteMany({});
  await prisma.campaignParticipation.deleteMany({});
  await prisma.promoCode.deleteMany({});
  await prisma.campaign.deleteMany({});
  await prisma.creatorProfile.deleteMany({});
  await prisma.brandProfile.deleteMany({});
  await prisma.wallet.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.account.deleteMany({});
  await prisma.oTP.deleteMany({});
  await prisma.verificationToken.deleteMany({});
  await prisma.user.deleteMany({});

  console.log("Database cleared!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
