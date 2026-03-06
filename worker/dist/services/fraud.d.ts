/**
 * Check for click fraud on a tracking link (burst detection, IP abuse)
 */
export declare function checkClickFraud(trackingLinkId: string): Promise<void>;
/**
 * Check for view spike on a participation
 */
export declare function checkViewSpike(campaignId: string, creatorId: string, currentViews: number, previousViews: number): Promise<void>;
/**
 * Check for conversion mismatch (conversions without corresponding clicks)
 */
export declare function checkConversionMismatch(campaignId: string, creatorId: string): Promise<void>;
//# sourceMappingURL=fraud.d.ts.map