/**
 * Fetch post/reel insights from Instagram Graph API.
 * Requires the creator's own OAuth access token.
 * Falls back to INSTAGRAM_ACCESS_TOKEN env var (dev/testing only).
 */
export declare function getPostMetrics(postUrl: string, accessToken?: string): Promise<{
    views: number;
    likes: number;
    comments: number;
    saves: number;
    shares: number;
} | null>;
//# sourceMappingURL=instagram.d.ts.map