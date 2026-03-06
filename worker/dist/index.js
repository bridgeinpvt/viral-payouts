"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: "../.env" });
const express_1 = __importDefault(require("express"));
const node_cron_1 = __importDefault(require("node-cron"));
const db_1 = require("./db");
const tracking_1 = require("./routes/tracking");
const view_sync_1 = require("./crons/view-sync");
const daily_analytics_1 = require("./crons/daily-analytics");
const payout_executor_1 = require("./crons/payout-executor");
const fraud_detection_1 = require("./crons/fraud-detection");
const token_refresh_1 = require("./crons/token-refresh");
const app = (0, express_1.default)();
const PORT = process.env.WORKER_PORT || 4002;
app.use(express_1.default.json());
// Health check
app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});
// Tracking link redirect
app.use("/go", tracking_1.trackingRouter);
// ==========================================
// CRON JOBS
// ==========================================
(0, token_refresh_1.startTokenRefreshCron)();
// Hourly: Sync view counts from IG/YT
node_cron_1.default.schedule("0 * * * *", async () => {
    console.log("[CRON] Running view sync...");
    try {
        await (0, view_sync_1.syncViews)();
        console.log("[CRON] View sync completed.");
    }
    catch (err) {
        console.error("[CRON] View sync failed:", err);
    }
});
// Daily at 2 AM: Aggregate analytics
node_cron_1.default.schedule("0 2 * * *", async () => {
    console.log("[CRON] Running daily analytics aggregation...");
    try {
        await (0, daily_analytics_1.aggregateDailyAnalytics)();
        console.log("[CRON] Daily analytics completed.");
    }
    catch (err) {
        console.error("[CRON] Daily analytics failed:", err);
    }
});
// Every 15 minutes: Execute approved payouts
node_cron_1.default.schedule("*/15 * * * *", async () => {
    console.log("[CRON] Running payout executor...");
    try {
        await (0, payout_executor_1.executePayouts)();
        console.log("[CRON] Payout executor completed.");
    }
    catch (err) {
        console.error("[CRON] Payout executor failed:", err);
    }
});
// Hourly: Fraud detection
node_cron_1.default.schedule("30 * * * *", async () => {
    console.log("[CRON] Running fraud detection...");
    try {
        await (0, fraud_detection_1.detectFraud)();
        console.log("[CRON] Fraud detection completed.");
    }
    catch (err) {
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
    await db_1.db.$disconnect();
    process.exit(0);
});
//# sourceMappingURL=index.js.map