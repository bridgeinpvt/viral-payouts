"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackingRouter = void 0;
const express_1 = require("express");
const db_1 = require("../db");
const ua_parser_js_1 = __importDefault(require("ua-parser-js"));
const metrics_1 = require("../services/metrics");
exports.trackingRouter = (0, express_1.Router)();
// GET /go/:slug — Tracking link redirect
// The slug format is the TrackingLink.slug field
exports.trackingRouter.get("/:slug", async (req, res) => {
    try {
        const { slug } = req.params;
        const trackingLink = await db_1.db.trackingLink.findUnique({
            where: { slug },
            include: {
                campaign: { select: { status: true } },
            },
        });
        if (!trackingLink || !trackingLink.isActive) {
            return res.status(404).send("Link not found or inactive");
        }
        if (trackingLink.campaign.status !== "LIVE") {
            return res.redirect(trackingLink.destinationUrl);
        }
        // Parse user agent for bot detection
        const ua = new ua_parser_js_1.default(req.headers["user-agent"]);
        const browser = ua.getBrowser();
        const os = ua.getOS();
        const isBotUA = !browser.name || browser.name === "undefined";
        const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ?? req.ip ?? "unknown";
        const userAgent = req.headers["user-agent"] ?? "";
        const referer = req.headers["referer"] ?? null;
        // Rate limit: max 5 clicks per IP per tracking link per hour
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentClicks = await db_1.db.clickEvent.count({
            where: {
                trackingLinkId: trackingLink.id,
                ip,
                createdAt: { gte: oneHourAgo },
            },
        });
        const isFraud = isBotUA || recentClicks >= 5;
        // Log click event
        await db_1.db.clickEvent.create({
            data: {
                trackingLinkId: trackingLink.id,
                campaignId: trackingLink.campaignId,
                creatorId: trackingLink.creatorId,
                ip,
                userAgent,
                referer,
                isFraud,
            },
        });
        // Update total clicks (only count non-fraud)
        if (!isFraud) {
            await db_1.db.$transaction([
                db_1.db.trackingLink.update({
                    where: { id: trackingLink.id },
                    data: { totalClicks: { increment: 1 } },
                }),
            ]);
            // Update campaign metrics so creator earns money
            await (0, metrics_1.updateMetrics)(trackingLink.campaignId, trackingLink.creatorId, {
                verifiedClicks: 1,
            });
        }
        // Redirect to destination
        return res.redirect(302, trackingLink.destinationUrl);
    }
    catch (error) {
        console.error("Tracking redirect error:", error);
        return res.status(500).send("Internal server error");
    }
});
//# sourceMappingURL=tracking.js.map