/**
 * PUB-007: ShortsLinker YouTube Service
 *
 * YouTube Shorts-specific publishing that ensures videos are
 * formatted and tagged correctly for the Shorts shelf.
 */
import type { Publisher, PublishRequest, PublishResult, PublishStatus } from '../types';
interface ShortsLinkerConfig {
    accessToken: string;
    channelId: string;
}
export declare class ShortsLinkerYouTubeService implements Publisher {
    private readonly accessToken;
    private readonly channelId;
    private readonly statusCache;
    constructor(config: ShortsLinkerConfig);
    /**
     * Publishes a video as a YouTube Short.
     * Ensures the title contains #Shorts for Shorts shelf eligibility.
     */
    publish(request: PublishRequest): Promise<PublishResult>;
    getStatus(publishId: string): Promise<PublishStatus>;
    delete(externalId: string): Promise<void>;
}
export {};
//# sourceMappingURL=shortslinker.d.ts.map