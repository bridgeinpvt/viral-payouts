import { createTRPCRouter } from "./trpc";
import { authRouter } from "./routers/auth";
import { campaignRouter } from "./routers/campaign";
import { walletRouter } from "./routers/wallet";
import { adminRouter } from "./routers/admin";
import { analyticsRouter } from "./routers/analytics";
import { escrowRouter } from "./routers/escrow";
import { trackingRouter } from "./routers/tracking";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  campaign: campaignRouter,
  wallet: walletRouter,
  admin: adminRouter,
  analytics: analyticsRouter,
  escrow: escrowRouter,
  tracking: trackingRouter,
});

export type AppRouter = typeof appRouter;
