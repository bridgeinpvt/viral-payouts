/**
 * Calculate earnings for a campaign participation based on campaign type and verified metrics.
 */
export declare function calculateEarnings(campaignId: string, creatorId: string): Promise<number>;
/**
 * Update CampaignMetrics with new verified counts
 */
export declare function updateMetrics(campaignId: string, creatorId: string, updates: {
    verifiedViews?: number;
    verifiedClicks?: number;
    verifiedConversions?: number;
}): Promise<void>;
//# sourceMappingURL=metrics.d.ts.map