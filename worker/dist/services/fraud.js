"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkClickFraud = checkClickFraud;
exports.checkViewSpike = checkViewSpike;
exports.checkConversionMismatch = checkConversionMismatch;
const db_1 = require("../db");
/**
 * Check for click fraud on a tracking link (burst detection, IP abuse)
 */
async function checkClickFraud(trackingLinkId) {
    const link = await db_1.db.trackingLink.findUnique({
        where: { id: trackingLinkId },
        select: { campaignId: true, creatorId: true },
    });
    if (!link)
        return;
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    // Check for click burst (>50 clicks in last hour)
    const recentClicks = await db_1.db.clickEvent.count({
        where: {
            trackingLinkId,
            createdAt: { gte: oneHourAgo },
        },
    });
    if (recentClicks > 50) {
        await createFraudFlag({
            type: "CLICK_ANOMALY",
            campaignId: link.campaignId,
            creatorId: link.creatorId,
            severity: recentClicks > 200 ? 5 : recentClicks > 100 ? 4 : 3,
            description: `Click burst detected: ${recentClicks} clicks in last hour on tracking link ${trackingLinkId}`,
            evidence: { trackingLinkId, clickCount: recentClicks, window: "1h" },
        });
    }
    // Check for IP abuse (single IP >20 clicks in last hour)
    const ipCounts = await db_1.db.clickEvent.groupBy({
        by: ["ip"],
        where: {
            trackingLinkId,
            createdAt: { gte: oneHourAgo },
        },
        _count: true,
        having: {
            ip: {
                _count: { gt: 20 },
            },
        },
    });
    for (const ipGroup of ipCounts) {
        await createFraudFlag({
            type: "IP_ABUSE",
            campaignId: link.campaignId,
            creatorId: link.creatorId,
            severity: ipGroup._count > 50 ? 5 : 4,
            description: `IP abuse: ${ipGroup.ip} made ${ipGroup._count} clicks in last hour`,
            evidence: { ip: ipGroup.ip, clickCount: ipGroup._count, trackingLinkId },
        });
    }
}
/**
 * Check for view spike on a participation
 */
async function checkViewSpike(campaignId, creatorId, currentViews, previousViews) {
    if (previousViews === 0)
        return;
    const growthRate = (currentViews - previousViews) / previousViews;
    // Flag if views grew by more than 500% in one snapshot interval
    if (growthRate > 5) {
        await createFraudFlag({
            type: "VIEW_SPIKE",
            campaignId,
            creatorId,
            severity: growthRate > 20 ? 5 : growthRate > 10 ? 4 : 3,
            description: `View spike: ${Math.round(growthRate * 100)}% growth (${previousViews} → ${currentViews})`,
            evidence: { previousViews, currentViews, growthRate },
        });
    }
}
/**
 * Check for conversion mismatch (conversions without corresponding clicks)
 */
async function checkConversionMismatch(campaignId, creatorId) {
    const metrics = await db_1.db.campaignMetrics.findUnique({
        where: { campaignId_creatorId: { campaignId, creatorId } },
    });
    if (!metrics || metrics.verifiedClicks === 0)
        return;
    const conversionRate = metrics.verifiedConversions / metrics.verifiedClicks;
    // Flag if conversion rate is unusually high (>30%)
    if (conversionRate > 0.3 && metrics.verifiedConversions > 10) {
        await createFraudFlag({
            type: "CONVERSION_MISMATCH",
            campaignId,
            creatorId,
            severity: conversionRate > 0.7 ? 5 : conversionRate > 0.5 ? 4 : 3,
            description: `Unusually high conversion rate: ${Math.round(conversionRate * 100)}% (${metrics.verifiedConversions}/${metrics.verifiedClicks})`,
            evidence: {
                clicks: metrics.verifiedClicks,
                conversions: metrics.verifiedConversions,
                rate: conversionRate,
            },
        });
    }
}
async function createFraudFlag(params) {
    // Check for existing unresolved flag of same type for same campaign+creator
    const existing = await db_1.db.fraudFlag.findFirst({
        where: {
            type: params.type,
            campaignId: params.campaignId,
            status: { in: ["DETECTED", "INVESTIGATING"] },
        },
    });
    if (existing) {
        // Update existing flag with higher severity if applicable
        if (params.severity > existing.severity) {
            await db_1.db.fraudFlag.update({
                where: { id: existing.id },
                data: {
                    severity: params.severity,
                    description: params.description,
                    evidence: params.evidence,
                },
            });
        }
        return;
    }
    await db_1.db.fraudFlag.create({
        data: {
            type: params.type,
            status: "DETECTED",
            severity: params.severity,
            description: params.description,
            evidence: params.evidence,
            campaignId: params.campaignId,
        },
    });
}
//# sourceMappingURL=fraud.js.map