import "dotenv/config";
import express from "express";
import cron from "node-cron";
import { db } from "./db";
import { trackingRouter } from "./routes/tracking";
import { syncViews } from "./crons/view-sync";
import { aggregateDailyAnalytics } from "./crons/daily-analytics";
import { executePayouts } from "./crons/payout-executor";
import { detectFraud } from "./crons/fraud-detection";

const app = express();
const PORT = process.env.WORKER_PORT || 4002;

app.use(express.json());

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Tracking link redirect
app.use("/go", trackingRouter);

// ==========================================
// CRON JOBS
// ==========================================

// Hourly: Sync view counts from IG/YT
cron.schedule("0 * * * *", async () => {
  console.log("[CRON] Running view sync...");
  try {
    await syncViews();
    console.log("[CRON] View sync completed.");
  } catch (err) {
    console.error("[CRON] View sync failed:", err);
  }
});

// Daily at 2 AM: Aggregate analytics
cron.schedule("0 2 * * *", async () => {
  console.log("[CRON] Running daily analytics aggregation...");
  try {
    await aggregateDailyAnalytics();
    console.log("[CRON] Daily analytics completed.");
  } catch (err) {
    console.error("[CRON] Daily analytics failed:", err);
  }
});

// Every 15 minutes: Execute approved payouts
cron.schedule("*/15 * * * *", async () => {
  console.log("[CRON] Running payout executor...");
  try {
    await executePayouts();
    console.log("[CRON] Payout executor completed.");
  } catch (err) {
    console.error("[CRON] Payout executor failed:", err);
  }
});

// Hourly: Fraud detection
cron.schedule("30 * * * *", async () => {
  console.log("[CRON] Running fraud detection...");
  try {
    await detectFraud();
    console.log("[CRON] Fraud detection completed.");
  } catch (err) {
    console.error("[CRON] Fraud detection failed:", err);
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`[Worker] Running on port ${PORT}`);
  console.log(`[Worker] Tracking links: http://localhost:${PORT}/go/:slug`);
  console.log(`[Worker] Cron jobs scheduled.`);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("[Worker] Shutting down...");
  await db.$disconnect();
  process.exit(0);
});
