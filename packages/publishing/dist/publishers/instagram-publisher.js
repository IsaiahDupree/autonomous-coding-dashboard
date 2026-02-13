"use strict";
/**
 * PUB-003: Instagram Publisher
 *
 * Container-based media publishing via the Instagram Graph API.
 * Uses the two-step container creation flow:
 *   1. Create a media container with the asset URL
 *   2. Publish the container
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.InstagramPublisher = void 0;
const GRAPH_API_BASE = 'https://graph.facebook.com/v19.0';
class InstagramPublisher {
    constructor(config) {
        this.statusCache = new Map();
        this.accessToken = config.accessToken;
        this.igUserId = config.igUserId;
    }
    async publish(request) {
        // Step 1: Create the media container
        const containerParams = new URLSearchParams({
            access_token: this.accessToken,
            caption: `${request.metadata.title}\n\n${request.metadata.description}`,
            media_type: 'REELS',
            video_url: request.contentId,
            share_to_feed: 'true',
        });
        if (request.metadata.tags.length > 0) {
            containerParams.set('caption', `${request.metadata.title}\n\n${request.metadata.description}\n\n${request.metadata.tags.map((t) => `#${t}`).join(' ')}`);
        }
        const containerResponse = await fetch(`${GRAPH_API_BASE}/${this.igUserId}/media`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: containerParams,
        });
        if (!containerResponse.ok) {
            const errorBody = await containerResponse.text();
            throw new Error(`Instagram container creation failed (${containerResponse.status}): ${errorBody}`);
        }
        const containerData = (await containerResponse.json());
        const containerId = containerData.id;
        // Step 2: Wait for container to be ready, then publish
        await this.waitForContainer(containerId);
        const publishResponse = await fetch(`${GRAPH_API_BASE}/${this.igUserId}/media_publish`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                access_token: this.accessToken,
                creation_id: containerId,
            }),
        });
        if (!publishResponse.ok) {
            const errorBody = await publishResponse.text();
            throw new Error(`Instagram publish failed (${publishResponse.status}): ${errorBody}`);
        }
        const publishData = (await publishResponse.json());
        const mediaId = publishData.id;
        this.statusCache.set(mediaId, 'published');
        return {
            publishId: mediaId,
            platform: 'instagram',
            externalId: mediaId,
            url: `https://www.instagram.com/p/${mediaId}/`,
            status: 'published',
            publishedAt: new Date().toISOString(),
        };
    }
    async getStatus(publishId) {
        const cached = this.statusCache.get(publishId);
        if (cached) {
            return cached;
        }
        const response = await fetch(`${GRAPH_API_BASE}/${publishId}?fields=id,timestamp&access_token=${this.accessToken}`);
        if (!response.ok) {
            return 'failed';
        }
        this.statusCache.set(publishId, 'published');
        return 'published';
    }
    async delete(externalId) {
        const response = await fetch(`${GRAPH_API_BASE}/${externalId}?access_token=${this.accessToken}`, { method: 'DELETE' });
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Instagram delete failed (${response.status}): ${errorBody}`);
        }
        this.statusCache.delete(externalId);
    }
    /**
     * Polls the container status until it is ready for publishing.
     */
    async waitForContainer(containerId) {
        const maxAttempts = 60;
        const pollIntervalMs = 3000;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const response = await fetch(`${GRAPH_API_BASE}/${containerId}?fields=status_code&access_token=${this.accessToken}`);
            if (response.ok) {
                const data = (await response.json());
                if (data.status_code === 'FINISHED') {
                    return;
                }
                if (data.status_code === 'ERROR') {
                    throw new Error('Instagram container processing failed');
                }
            }
            await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
        }
        throw new Error(`Instagram container processing timed out after ${maxAttempts} attempts`);
    }
}
exports.InstagramPublisher = InstagramPublisher;
//# sourceMappingURL=instagram-publisher.js.map