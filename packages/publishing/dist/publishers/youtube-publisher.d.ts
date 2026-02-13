/**
 * PUB-004: YouTube Publisher
 *
 * Upload videos via the YouTube Data API v3 resumable upload protocol.
 */
import type { Publisher, PublishRequest, PublishResult, PublishStatus } from '../types';
interface YouTubePublisherConfig {
    accessToken: string;
    channelId: string;
}
export declare class YouTubePublisher implements Publisher {
    private readonly accessToken;
    private readonly channelId;
    private readonly statusCache;
    constructor(config: YouTubePublisherConfig);
    publish(request: PublishRequest): Promise<PublishResult>;
    getStatus(publishId: string): Promise<PublishStatus>;
    delete(externalId: string): Promise<void>;
}
export {};
//# sourceMappingURL=youtube-publisher.d.ts.map