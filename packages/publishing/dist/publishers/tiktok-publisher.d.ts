/**
 * PUB-001: TikTok Publisher
 *
 * Implements the Publisher interface for TikTok video content.
 * Delegates to TikTokVideoUploader for the actual upload flow.
 */
import type { Publisher, PublishRequest, PublishResult, PublishStatus } from '../types';
interface TikTokPublisherConfig {
    accessToken: string;
}
export declare class TikTokPublisher implements Publisher {
    private readonly accessToken;
    private readonly uploader;
    private readonly statusCache;
    constructor(config: TikTokPublisherConfig);
    publish(request: PublishRequest): Promise<PublishResult>;
    getStatus(publishId: string): Promise<PublishStatus>;
    delete(externalId: string): Promise<void>;
}
export {};
//# sourceMappingURL=tiktok-publisher.d.ts.map