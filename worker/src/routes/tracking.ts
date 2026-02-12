import { Router } from "express";
import { db } from "../db";
import UAParser from "ua-parser-js";

export const trackingRouter = Router();

// GET /go/:slug — Tracking link redirect
// The slug format is the TrackingLink.slug field
trackingRouter.get("/:slug", async (req, res) => {
  try {
    const { slug } = req.params;

    const trackingLink = await db.trackingLink.findUnique({
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
    const ua = new UAParser(req.headers["user-agent"]);
    const browser = ua.getBrowser();
    const os = ua.getOS();
    const isBotUA = !browser.name || browser.name === "undefined";

    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.ip ?? "unknown";
    const userAgent = req.headers["user-agent"] ?? "";
    const referer = req.headers["referer"] ?? null;

    // Rate limit: max 5 clicks per IP per tracking link per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentClicks = await db.clickEvent.count({
      where: {
        trackingLinkId: trackingLink.id,
        ip,
        createdAt: { gte: oneHourAgo },
      },
    });

    const isFraud = isBotUA || recentClicks >= 5;

    // Log click event
    await db.clickEvent.create({
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
      await db.trackingLink.update({
        where: { id: trackingLink.id },
        data: { totalClicks: { increment: 1 } },
      });
    }

    // Redirect to destination
    return res.redirect(302, trackingLink.destinationUrl);
  } catch (error) {
    console.error("Tracking redirect error:", error);
    return res.status(500).send("Internal server error");
  }
});
