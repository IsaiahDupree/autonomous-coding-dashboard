/**
 * PUB-003: Instagram Publisher
 *
 * Container-based media publishing via the Instagram Graph API.
 * Uses the two-step container creation flow:
 *   1. Create a media container with the asset URL
 *   2. Publish the container
 */
import type { Publisher, PublishRequest, PublishResult, PublishStatus } from '../types';
interface InstagramPublisherConfig {
    accessToken: string;
    igUserId: string;
}
export declare class InstagramPublisher implements Publisher {
    private readonly accessToken;
    private readonly igUserId;
    private readonly statusCache;
    constructor(config: InstagramPublisherConfig);
    publish(request: PublishRequest): Promise<PublishResult>;
    getStatus(publishId: string): Promise<PublishStatus>;
    delete(externalId: string): Promise<void>;
    /**
     * Polls the container status until it is ready for publishing.
     */
    private waitForContainer;
}
export {};
//# sourceMappingURL=instagram-publisher.d.ts.map