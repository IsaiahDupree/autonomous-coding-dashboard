/**
 * PUB-005: Syndication Service
 *
 * Publishes content to multiple platforms in parallel, tracking
 * per-platform success / failure independently.
 */

import type {
  Platform,
  Publisher,
  PublishRequest,
  PublishResult,
  SyndicationResult,
} from '../types';

export class SyndicationService {
  private readonly publishers = new Map<Platform, Publisher>();

  /**
   * Registers a publisher implementation for a given platform.
   */
  registerPublisher(platform: Platform, publisher: Publisher): void {
    this.publishers.set(platform, publisher);
  }

  /**
   * Publishes content to multiple platforms simultaneously.
   * Returns a SyndicationResult containing per-platform outcomes.
   * A failure on one platform does not block others.
   */
  async publishToMultiple(
    contentId: string,
    platforms: Platform[],
    baseRequest: Omit<PublishRequest, 'platform'>,
  ): Promise<SyndicationResult> {
    const results = new Map<Platform, PublishResult | { error: string }>();

    const promises = platforms.map(async (platform) => {
      const publisher = this.publishers.get(platform);

      if (!publisher) {
        results.set(platform, { error: `No publisher registered for platform: ${platform}` });
        return;
      }

      try {
        const request: PublishRequest = { ...baseRequest, platform };
        const result = await publisher.publish(request);
        results.set(platform, result);
      } catch (err) {
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
  async getStatus(platform: Platform, publishId: string): Promise<string> {
    const publisher = this.publishers.get(platform);
    if (!publisher) {
      throw new Error(`No publisher registered for platform: ${platform}`);
    }
    return publisher.getStatus(publishId);
  }

  /**
   * Returns the list of platforms that have registered publishers.
   */
  getRegisteredPlatforms(): Platform[] {
    return Array.from(this.publishers.keys());
  }
}
