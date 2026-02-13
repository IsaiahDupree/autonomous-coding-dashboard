"use strict";
/**
 * PUB-005: Syndication Service
 *
 * Publishes content to multiple platforms in parallel, tracking
 * per-platform success / failure independently.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyndicationService = void 0;
class SyndicationService {
    constructor() {
        this.publishers = new Map();
    }
    /**
     * Registers a publisher implementation for a given platform.
     */
    registerPublisher(platform, publisher) {
        this.publishers.set(platform, publisher);
    }
    /**
     * Publishes content to multiple platforms simultaneously.
     * Returns a SyndicationResult containing per-platform outcomes.
     * A failure on one platform does not block others.
     */
    async publishToMultiple(contentId, platforms, baseRequest) {
        const results = new Map();
        const promises = platforms.map(async (platform) => {
            const publisher = this.publishers.get(platform);
            if (!publisher) {
                results.set(platform, { error: `No publisher registered for platform: ${platform}` });
                return;
            }
            try {
                const request = { ...baseRequest, platform };
                const result = await publisher.publish(request);
                results.set(platform, result);
            }
            catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                results.set(platform, { error: message });
            }
        });
        await Promise.allSettled(promises);
        return {
            contentId,
            results,
            completedAt: new Date().toISOString(),
        };
    }
    /**
     * Gets the status of a publish across a specific platform.
     */
    async getStatus(platform, publishId) {
        const publisher = this.publishers.get(platform);
        if (!publisher) {
            throw new Error(`No publisher registered for platform: ${platform}`);
        }
        return publisher.getStatus(publishId);
    }
    /**
     * Returns the list of platforms that have registered publishers.
     */
    getRegisteredPlatforms() {
        return Array.from(this.publishers.keys());
    }
}
exports.SyndicationService = SyndicationService;
//# sourceMappingURL=syndication.js.map