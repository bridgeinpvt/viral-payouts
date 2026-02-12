import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // Clear existing data in correct order to avoid FK constraints
  console.log("🗑️  Clearing existing data...");

  await prisma.notification.deleteMany();
  await prisma.fraudFlag.deleteMany();
  await prisma.campaignDailyAnalytics.deleteMany();
  await prisma.campaignMetrics.deleteMany();
  await prisma.conversionEvent.deleteMany();
  await prisma.clickEvent.deleteMany();
  await prisma.viewSnapshot.deleteMany();
  await prisma.contentItem.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.payout.deleteMany();
  await prisma.paymentMethod.deleteMany();
  await prisma.campaignParticipation.deleteMany();
  await prisma.trackingLink.deleteMany();
  await prisma.promoCode.deleteMany();
  await prisma.savedCampaign.deleteMany();
  await prisma.escrow.deleteMany();
  await prisma.campaignMedia.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.creatorProfile.deleteMany();
  await prisma.brandProfile.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.verificationToken.deleteMany();
  await prisma.oTP.deleteMany();
  await prisma.user.deleteMany();
  await prisma.platformDailyAnalytics.deleteMany();

  console.log("✅ Cleared existing data");

  // Hash passwords
  const hashedAdminPassword = await hash("admin123", 10);
  const hashedTestPassword = await hash("test123", 10);

  // Create Users
  console.log("👤 Creating users...");

  const adminUser = await prisma.user.create({
    data: {
      email: "admin@nocage.com",
      name: "Admin User",
      username: "admin",
      password: hashedAdminPassword,
      isAdmin: true,
      role: "BRAND",
      isOnboarded: true,
      emailVerified: new Date(),
    },
  });

  const brandUser = await prisma.user.create({
    data: {
      email: "brand@example.com",
      name: "Brand Manager",
      username: "branduser",
      password: hashedTestPassword,
      role: "BRAND",
      isOnboarded: true,
      emailVerified: new Date(),
    },
  });

  const creator1 = await prisma.user.create({
    data: {
      email: "creator@example.com",
      name: "Creator One",
      username: "creator1",
      password: hashedTestPassword,
      role: "CREATOR",
      isOnboarded: true,
      emailVerified: new Date(),
    },
  });

  const creator2 = await prisma.user.create({
    data: {
      email: "creator2@example.com",
      name: "Creator Two",
      username: "creator2",
      password: hashedTestPassword,
      role: "CREATOR",
      isOnboarded: true,
      emailVerified: new Date(),
    },
  });

  console.log("✅ Created users");

  // Create Brand Profile
  console.log("🏢 Creating brand profile...");

  await prisma.brandProfile.create({
    data: {
      userId: brandUser.id,
      companyName: "Acme Corp",
      website: "https://acme.example.com",
      industry: "TECHNOLOGY",
      description: "Leading technology solutions provider",
      contactPerson: "Brand Manager",
      isVerified: true,
      totalCampaigns: 0,
      totalSpent: 0,
    },
  });

  console.log("✅ Created brand profile");

  // Create Creator Profiles
  console.log("🎨 Creating creator profiles...");

  await prisma.creatorProfile.create({
    data: {
      userId: creator1.id,
      displayName: "Creative Pro",
      bio: "Tech enthusiast and content creator with 50K+ followers",
      niche: "Technology",
      language: "English",
      location: "Mumbai, India",
      tier: "SILVER",
      totalCampaigns: 0,
      totalEarnings: 0,
      totalViews: 0,
      instagramHandle: "@creativepro",
      instagramFollowers: 52000,
      instagramVerified: true,
      youtubeHandle: "@creativepro",
      youtubeSubscribers: 35000,
      youtubeVerified: true,
      contentCategories: ["TECH", "LIFESTYLE"],
      preferredPlatforms: ["INSTAGRAM", "YOUTUBE"],
      avgRating: 4.5,
      reviewCount: 12,
      isVerified: true,
      upiId: "creator1@upi",
    },
  });

  await prisma.creatorProfile.create({
    data: {
      userId: creator2.id,
      displayName: "Content King",
      bio: "Fashion and lifestyle content creator",
      niche: "Fashion",
      language: "English",
      location: "Delhi, India",
      tier: "BRONZE",
      totalCampaigns: 0,
      totalEarnings: 0,
      totalViews: 0,
      instagramHandle: "@contentking",
      instagramFollowers: 15000,
      instagramVerified: true,
      twitterHandle: "@contentking",
      twitterFollowers: 8000,
      contentCategories: ["FASHION", "LIFESTYLE"],
      preferredPlatforms: ["INSTAGRAM", "TWITTER"],
      avgRating: 4.0,
      reviewCount: 5,
      isVerified: true,
      upiId: "creator2@upi",
    },
  });

  console.log("✅ Created creator profiles");

  // Create Wallets
  console.log("💰 Creating wallets...");

  const brandWallet = await prisma.wallet.create({
    data: {
      userId: brandUser.id,
      type: "BRAND",
      availableBalance: 50000,
      pendingBalance: 0,
      escrowBalance: 0,
      lifetimeEarnings: 0,
      totalWithdrawn: 0,
    },
  });

  const creator1Wallet = await prisma.wallet.create({
    data: {
      userId: creator1.id,
      type: "CREATOR",
      availableBalance: 1500,
      pendingBalance: 500,
      escrowBalance: 0,
      lifetimeEarnings: 2000,
      totalWithdrawn: 0,
    },
  });

  const creator2Wallet = await prisma.wallet.create({
    data: {
      userId: creator2.id,
      type: "CREATOR",
      availableBalance: 800,
      pendingBalance: 200,
      escrowBalance: 0,
      lifetimeEarnings: 1000,
      totalWithdrawn: 0,
    },
  });

  console.log("✅ Created wallets");

  // Create Campaigns
  console.log("📢 Creating campaigns...");

  const viewCampaign = await prisma.campaign.create({
    data: {
      brandId: brandUser.id,
      slug: "tech-product-launch-views",
      name: "Tech Product Launch - Video Views",
      description: "Promote our new tech product launch through engaging video content",
      type: "VIEW",
      productName: "Smart Widget Pro",
      campaignBrief: "Create engaging video content showcasing our new Smart Widget Pro",
      contentGuidelines: "Videos should be 30-60 seconds, highlight key features",
      targetPlatforms: ["INSTAGRAM", "YOUTUBE"],
      targetAudience: ["TECH", "GAMERS"],
      targetCategories: ["Technology", "Gadgets"],
      totalBudget: 15000,
      spentBudget: 0,
      platformCommissionRate: 0.15,
      payoutPer1KViews: 500,
      oauthRequired: true,
      startDate: new Date("2026-02-01"),
      endDate: new Date("2026-03-15"),
      duration: 42,
      status: "LIVE",
      totalViews: 0,
      totalClicks: 0,
      totalConversions: 0,
      totalParticipants: 0,
      publishedAt: new Date(),
    },
  });

  const clickCampaign = await prisma.campaign.create({
    data: {
      brandId: brandUser.id,
      slug: "app-download-clicks",
      name: "Mobile App Download Campaign",
      description: "Drive traffic to our mobile app download page",
      type: "CLICK",
      productName: "SuperApp",
      campaignBrief: "Share our app download link and drive clicks",
      contentGuidelines: "Share benefits of the app and include download link",
      targetPlatforms: ["TWITTER", "LINKEDIN"],
      targetAudience: ["BUSINESS", "TECH"],
      targetCategories: ["Mobile Apps", "Productivity"],
      totalBudget: 10000,
      spentBudget: 0,
      platformCommissionRate: 0.15,
      payoutPerClick: 25,
      landingPageUrl: "https://app.example.com/download",
      startDate: new Date("2026-02-05"),
      endDate: new Date("2026-03-05"),
      duration: 28,
      status: "LIVE",
      totalViews: 0,
      totalClicks: 0,
      totalConversions: 0,
      totalParticipants: 0,
      publishedAt: new Date(),
    },
  });

  const conversionCampaign = await prisma.campaign.create({
    data: {
      brandId: brandUser.id,
      slug: "ecommerce-sales-conversion",
      name: "E-commerce Sales Campaign",
      description: "Drive sales with exclusive promo codes",
      type: "CONVERSION",
      productName: "Fashion Collection 2026",
      campaignBrief: "Promote our new fashion collection with exclusive discount codes",
      contentGuidelines: "Create posts featuring the collection with your promo code",
      targetPlatforms: ["INSTAGRAM"],
      targetAudience: ["FASHION", "LIFESTYLE"],
      targetCategories: ["Fashion", "E-commerce"],
      totalBudget: 20000,
      spentBudget: 0,
      platformCommissionRate: 0.15,
      payoutPerSale: 200,
      promoCodeFormat: "CREATOR_{username}",
      maxPayoutPerCreator: 5000,
      startDate: new Date("2026-02-10"),
      endDate: new Date("2026-04-10"),
      duration: 59,
      status: "LIVE",
      totalViews: 0,
      totalClicks: 0,
      totalConversions: 0,
      totalParticipants: 0,
      publishedAt: new Date(),
    },
  });

  console.log("✅ Created campaigns");

  // Create Escrow records
  console.log("🔒 Creating escrow records...");

  await prisma.escrow.create({
    data: {
      campaignId: viewCampaign.id,
      brandWalletId: brandWallet.id,
      totalAmount: 15000,
      releasedAmount: 0,
      commissionAmount: 2250, // 15% of 15000
      status: "LOCKED",
    },
  });

  await prisma.escrow.create({
    data: {
      campaignId: clickCampaign.id,
      brandWalletId: brandWallet.id,
      totalAmount: 10000,
      releasedAmount: 0,
      commissionAmount: 1500,
      status: "LOCKED",
    },
  });

  await prisma.escrow.create({
    data: {
      campaignId: conversionCampaign.id,
      brandWalletId: brandWallet.id,
      totalAmount: 20000,
      releasedAmount: 500,
      commissionAmount: 3000,
      status: "PARTIALLY_RELEASED",
    },
  });

  console.log("✅ Created escrow records");

  // Create Campaign Participations
  console.log("🤝 Creating campaign participations...");

  const viewParticipation1 = await prisma.campaignParticipation.create({
    data: {
      campaignId: viewCampaign.id,
      creatorId: creator1.id,
      status: "ACTIVE",
      contentUrl: "https://instagram.com/p/example1",
      platform: "INSTAGRAM",
      selectedPlatforms: ["INSTAGRAM"],
      caption: "Check out this amazing new tech product!",
      approvedAt: new Date(),
      submittedAt: new Date(),
    },
  });

  const clickParticipation1 = await prisma.campaignParticipation.create({
    data: {
      campaignId: clickCampaign.id,
      creatorId: creator1.id,
      status: "ACTIVE",
      selectedPlatforms: ["TWITTER", "LINKEDIN"],
      approvedAt: new Date(),
    },
  });

  const clickParticipation2 = await prisma.campaignParticipation.create({
    data: {
      campaignId: clickCampaign.id,
      creatorId: creator2.id,
      status: "ACTIVE",
      selectedPlatforms: ["TWITTER"],
      approvedAt: new Date(),
    },
  });

  const conversionParticipation1 = await prisma.campaignParticipation.create({
    data: {
      campaignId: conversionCampaign.id,
      creatorId: creator1.id,
      status: "ACTIVE",
      contentUrl: "https://instagram.com/p/fashion1",
      platform: "INSTAGRAM",
      selectedPlatforms: ["INSTAGRAM"],
      caption: "Loving this new collection! Use my code for 20% off",
      approvedAt: new Date(),
      submittedAt: new Date(),
    },
  });

  const conversionParticipation2 = await prisma.campaignParticipation.create({
    data: {
      campaignId: conversionCampaign.id,
      creatorId: creator2.id,
      status: "APPROVED",
      selectedPlatforms: ["INSTAGRAM"],
      approvedAt: new Date(),
    },
  });

  console.log("✅ Created campaign participations");

  // Create Tracking Links for CLICK campaign
  console.log("🔗 Creating tracking links...");

  const trackingLink1 = await prisma.trackingLink.create({
    data: {
      campaignId: clickCampaign.id,
      creatorId: creator1.id,
      slug: `click-${creator1.id}-${clickCampaign.id}`,
      destinationUrl: "https://app.example.com/download",
      totalClicks: 45,
      isActive: true,
    },
  });

  const trackingLink2 = await prisma.trackingLink.create({
    data: {
      campaignId: clickCampaign.id,
      creatorId: creator2.id,
      slug: `click-${creator2.id}-${clickCampaign.id}`,
      destinationUrl: "https://app.example.com/download",
      totalClicks: 28,
      isActive: true,
    },
  });

  // Update participations with tracking links
  await prisma.campaignParticipation.update({
    where: { id: clickParticipation1.id },
    data: { trackingLinkId: trackingLink1.id },
  });

  await prisma.campaignParticipation.update({
    where: { id: clickParticipation2.id },
    data: { trackingLinkId: trackingLink2.id },
  });

  console.log("✅ Created tracking links");

  // Create Promo Codes for CONVERSION campaign
  console.log("🎟️  Creating promo codes...");

  const promoCode1 = await prisma.promoCode.create({
    data: {
      campaignId: conversionCampaign.id,
      creatorId: creator1.id,
      code: "CREATOR_CREATIVE20",
      totalUses: 12,
      maxUses: 100,
      isActive: true,
    },
  });

  const promoCode2 = await prisma.promoCode.create({
    data: {
      campaignId: conversionCampaign.id,
      creatorId: creator2.id,
      code: "CREATOR_CONTENT20",
      totalUses: 5,
      maxUses: 100,
      isActive: true,
    },
  });

  // Update participations with promo codes
  await prisma.campaignParticipation.update({
    where: { id: conversionParticipation1.id },
    data: { promoCodeId: promoCode1.id },
  });

  await prisma.campaignParticipation.update({
    where: { id: conversionParticipation2.id },
    data: { promoCodeId: promoCode2.id },
  });

  console.log("✅ Created promo codes");

  // Create Campaign Metrics
  console.log("📊 Creating campaign metrics...");

  await prisma.campaignMetrics.create({
    data: {
      campaignId: viewCampaign.id,
      creatorId: creator1.id,
      verifiedViews: 8500,
      verifiedClicks: 0,
      verifiedConversions: 0,
      earnedAmount: 4250,
      paidAmount: 0,
      lastCalculatedAt: new Date(),
    },
  });

  await prisma.campaignMetrics.create({
    data: {
      campaignId: clickCampaign.id,
      creatorId: creator1.id,
      verifiedViews: 0,
      verifiedClicks: 45,
      verifiedConversions: 0,
      earnedAmount: 1125,
      paidAmount: 1125,
      lastCalculatedAt: new Date(),
    },
  });

  await prisma.campaignMetrics.create({
    data: {
      campaignId: clickCampaign.id,
      creatorId: creator2.id,
      verifiedViews: 0,
      verifiedClicks: 28,
      verifiedConversions: 0,
      earnedAmount: 700,
      paidAmount: 700,
      lastCalculatedAt: new Date(),
    },
  });

  await prisma.campaignMetrics.create({
    data: {
      campaignId: conversionCampaign.id,
      creatorId: creator1.id,
      verifiedViews: 0,
      verifiedClicks: 0,
      verifiedConversions: 12,
      earnedAmount: 2400,
      paidAmount: 0,
      lastCalculatedAt: new Date(),
    },
  });

  await prisma.campaignMetrics.create({
    data: {
      campaignId: conversionCampaign.id,
      creatorId: creator2.id,
      verifiedViews: 0,
      verifiedClicks: 0,
      verifiedConversions: 5,
      earnedAmount: 1000,
      paidAmount: 0,
      lastCalculatedAt: new Date(),
    },
  });

  console.log("✅ Created campaign metrics");

  // Create some Click Events
  console.log("🖱️  Creating click events...");

  await prisma.clickEvent.create({
    data: {
      trackingLinkId: trackingLink1.id,
      campaignId: clickCampaign.id,
      creatorId: creator1.id,
      ip: "192.168.1.100",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      referer: "https://twitter.com",
      country: "IN",
      isFraud: false,
    },
  });

  await prisma.clickEvent.create({
    data: {
      trackingLinkId: trackingLink2.id,
      campaignId: clickCampaign.id,
      creatorId: creator2.id,
      ip: "203.45.67.89",
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)",
      referer: "https://twitter.com",
      country: "IN",
      isFraud: false,
    },
  });

  console.log("✅ Created click events");

  // Create some Conversion Events
  console.log("🛒 Creating conversion events...");

  await prisma.conversionEvent.create({
    data: {
      campaignId: conversionCampaign.id,
      creatorId: creator1.id,
      promoCodeId: promoCode1.id,
      orderId: "ORD-2026-001",
      orderAmount: 2500,
      isVerified: true,
      isFraud: false,
    },
  });

  await prisma.conversionEvent.create({
    data: {
      campaignId: conversionCampaign.id,
      creatorId: creator1.id,
      promoCodeId: promoCode1.id,
      orderId: "ORD-2026-002",
      orderAmount: 3200,
      isVerified: true,
      isFraud: false,
    },
  });

  await prisma.conversionEvent.create({
    data: {
      campaignId: conversionCampaign.id,
      creatorId: creator2.id,
      promoCodeId: promoCode2.id,
      orderId: "ORD-2026-003",
      orderAmount: 1800,
      isVerified: true,
      isFraud: false,
    },
  });

  console.log("✅ Created conversion events");

  // Create View Snapshots
  console.log("👁️  Creating view snapshots...");

  await prisma.viewSnapshot.create({
    data: {
      campaignId: viewCampaign.id,
      creatorId: creator1.id,
      platform: "INSTAGRAM",
      postUrl: "https://instagram.com/p/example1",
      viewCount: 8500,
      likeCount: 450,
      commentCount: 32,
      shareCount: 18,
      deltaViews: 1200,
      isFlagged: false,
    },
  });

  console.log("✅ Created view snapshots");

  // Create Fraud Flags
  console.log("🚨 Creating fraud flags...");

  await prisma.fraudFlag.create({
    data: {
      campaignId: viewCampaign.id,
      creatorId: creator1.id,
      type: "VIEW_SPIKE",
      status: "DISMISSED",
      severity: 2,
      description: "Unusual spike in views detected - 5000 views in 2 hours",
      evidence: {
        timeframe: "2026-02-12 10:00 - 12:00",
        viewCount: 5000,
        averageRate: 2500,
      },
      resolvedBy: adminUser.id,
      resolvedAt: new Date(),
      resolvedNote: "Verified as legitimate - viral post on trending topic",
    },
  });

  await prisma.fraudFlag.create({
    data: {
      campaignId: clickCampaign.id,
      creatorId: creator2.id,
      type: "IP_ABUSE",
      status: "INVESTIGATING",
      severity: 3,
      description: "Multiple clicks from same IP address detected",
      evidence: {
        ip: "192.168.1.100",
        clickCount: 15,
        timeframe: "2026-02-12",
      },
    },
  });

  await prisma.fraudFlag.create({
    data: {
      type: "BOT_DETECTED",
      status: "DETECTED",
      severity: 4,
      description: "Bot-like behavior pattern detected across platform",
      evidence: {
        userAgent: "suspicious-bot/1.0",
        requestCount: 500,
      },
    },
  });

  console.log("✅ Created fraud flags");

  // Create Payment Methods
  console.log("💳 Creating payment methods...");

  const paymentMethod1 = await prisma.paymentMethod.create({
    data: {
      walletId: creator1Wallet.id,
      type: "UPI",
      details: {
        upiId: "creator1@upi",
      },
      isPrimary: true,
      isVerified: true,
    },
  });

  const paymentMethod2 = await prisma.paymentMethod.create({
    data: {
      walletId: creator2Wallet.id,
      type: "BANK_ACCOUNT",
      details: {
        accountNumber: "1234567890",
        ifsc: "SBIN0001234",
        accountName: "Creator Two",
      },
      isPrimary: true,
      isVerified: true,
    },
  });

  console.log("✅ Created payment methods");

  // Create Payouts
  console.log("💸 Creating payouts...");

  await prisma.payout.create({
    data: {
      walletId: creator1Wallet.id,
      paymentMethodId: paymentMethod1.id,
      userId: creator1.id,
      amount: 1000,
      status: "PENDING",
      approvalStatus: "PENDING_APPROVAL",
      tdsAmount: 10,
      netAmount: 990,
    },
  });

  await prisma.payout.create({
    data: {
      walletId: creator2Wallet.id,
      paymentMethodId: paymentMethod2.id,
      userId: creator2.id,
      amount: 500,
      status: "COMPLETED",
      approvalStatus: "APPROVED",
      approvedBy: adminUser.id,
      approvedAt: new Date(),
      tdsAmount: 5,
      netAmount: 495,
      processedAt: new Date(),
      razorpayPayoutId: "pout_test123456",
      transactionId: "txn_test123456",
    },
  });

  console.log("✅ Created payouts");

  // Create Transactions
  console.log("💰 Creating transactions...");

  await prisma.transaction.create({
    data: {
      walletId: creator1Wallet.id,
      fromUserId: brandUser.id,
      toUserId: creator1.id,
      participationId: clickParticipation1.id,
      amount: 1125,
      type: "EARNING",
      status: "COMPLETED",
      description: "Earnings from Mobile App Download Campaign",
      referenceId: clickCampaign.id,
      referenceType: "campaign",
    },
  });

  await prisma.transaction.create({
    data: {
      walletId: creator2Wallet.id,
      fromUserId: brandUser.id,
      toUserId: creator2.id,
      participationId: clickParticipation2.id,
      amount: 700,
      type: "EARNING",
      status: "COMPLETED",
      description: "Earnings from Mobile App Download Campaign",
      referenceId: clickCampaign.id,
      referenceType: "campaign",
    },
  });

  await prisma.transaction.create({
    data: {
      walletId: brandWallet.id,
      fromUserId: brandUser.id,
      amount: 15000,
      type: "ESCROW_LOCK",
      status: "COMPLETED",
      description: "Escrow lock for Tech Product Launch campaign",
      referenceId: viewCampaign.id,
      referenceType: "escrow",
    },
  });

  console.log("✅ Created transactions");

  // Create Notifications
  console.log("🔔 Creating notifications...");

  await prisma.notification.create({
    data: {
      userId: creator1.id,
      type: "PARTICIPATION_APPROVED",
      title: "Participation Approved",
      message: "Your participation in Tech Product Launch campaign has been approved",
      isRead: false,
      actionUrl: `/dashboard/campaigns/${viewCampaign.slug}`,
      metadata: {
        campaignId: viewCampaign.id,
        campaignName: viewCampaign.name,
      },
    },
  });

  await prisma.notification.create({
    data: {
      userId: creator1.id,
      type: "EARNING_CREDITED",
      title: "Earnings Credited",
      message: "₹1,125 has been credited to your wallet",
      isRead: true,
      metadata: {
        amount: 1125,
        campaignId: clickCampaign.id,
      },
    },
  });

  await prisma.notification.create({
    data: {
      userId: brandUser.id,
      type: "CAMPAIGN_LIVE",
      title: "Campaign is now Live",
      message: "Your campaign 'E-commerce Sales Campaign' is now live",
      isRead: false,
      actionUrl: `/dashboard/campaigns/${conversionCampaign.slug}`,
      metadata: {
        campaignId: conversionCampaign.id,
      },
    },
  });

  await prisma.notification.create({
    data: {
      userId: creator2.id,
      type: "PAYOUT_PROCESSED",
      title: "Payout Processed",
      message: "Your payout of ₹495 has been processed successfully",
      isRead: false,
      metadata: {
        amount: 495,
      },
    },
  });

  console.log("✅ Created notifications");

  // Create Saved Campaigns
  console.log("⭐ Creating saved campaigns...");

  await prisma.savedCampaign.create({
    data: {
      userId: creator1.id,
      campaignId: conversionCampaign.id,
    },
  });

  await prisma.savedCampaign.create({
    data: {
      userId: creator2.id,
      campaignId: viewCampaign.id,
    },
  });

  console.log("✅ Created saved campaigns");

  // Create Campaign Daily Analytics
  console.log("📈 Creating campaign daily analytics...");

  await prisma.campaignDailyAnalytics.create({
    data: {
      campaignId: viewCampaign.id,
      date: new Date("2026-02-11"),
      views: 3500,
      clicks: 0,
      conversions: 0,
      spend: 1750,
      earnings: 0,
      newCreators: 1,
    },
  });

  await prisma.campaignDailyAnalytics.create({
    data: {
      campaignId: clickCampaign.id,
      date: new Date("2026-02-11"),
      views: 0,
      clicks: 35,
      conversions: 0,
      spend: 875,
      earnings: 0,
      newCreators: 2,
    },
  });

  console.log("✅ Created campaign daily analytics");

  console.log("\n🎉 Database seeding completed successfully!");
  console.log("\n📋 Summary:");
  console.log("   - 4 users created (1 admin, 1 brand, 2 creators)");
  console.log("   - 1 brand profile");
  console.log("   - 2 creator profiles");
  console.log("   - 3 wallets");
  console.log("   - 3 campaigns (VIEW, CLICK, CONVERSION)");
  console.log("   - 3 escrow records");
  console.log("   - 5 campaign participations");
  console.log("   - 2 tracking links");
  console.log("   - 2 promo codes");
  console.log("   - 5 campaign metrics");
  console.log("   - 3 fraud flags");
  console.log("   - 2 payouts");
  console.log("   - Multiple events, transactions, and notifications");
  console.log("\n🔑 Test Login Credentials:");
  console.log("   Admin:    admin@nocage.com / admin123");
  console.log("   Brand:    brand@example.com / test123");
  console.log("   Creator1: creator@example.com / test123");
  console.log("   Creator2: creator2@example.com / test123");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
