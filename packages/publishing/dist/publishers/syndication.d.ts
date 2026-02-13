/**
 * PUB-005: Syndication Service
 *
 * Publishes content to multiple platforms in parallel, tracking
 * per-platform success / failure independently.
 */
import type { Platform, Publisher, PublishRequest, SyndicationResult } from '../types';
export declare class SyndicationService {
    private readonly publishers;
    /**
     * Registers a publisher implementation for a given platform.
     */
    registerPublisher(platform: Platform, publisher: Publisher): void;
    /**
     * Publishes content to multiple platforms simultaneously.
     * Returns a SyndicationResult containing per-platform outcomes.
     * A failure on one platform does not block others.
     */
    publishToMultiple(contentId: string, platforms: Platform[], baseRequest: Omit<PublishRequest, 'platform'>): Promise<SyndicationResult>;
    /**
     * Gets the status of a publish across a specific platform.
     */
    getStatus(platform: Platform, publishId: string): Promise<string>;
    /**
     * Returns the list of platforms that have registered publishers.
     */
    getRegisteredPlatforms(): Platform[];
}
//# sourceMappingURL=syndication.d.ts.map