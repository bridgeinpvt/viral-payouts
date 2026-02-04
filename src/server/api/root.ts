import { createTRPCRouter } from "./trpc";
import { authRouter } from "./routers/auth";
import { campaignRouter } from "./routers/campaign";
import { walletRouter } from "./routers/wallet";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  campaign: campaignRouter,
  wallet: walletRouter,
});

export type AppRouter = typeof appRouter;
