"use strict";
/**
 * PUB-004: YouTube Publisher
 *
 * Upload videos via the YouTube Data API v3 resumable upload protocol.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.YouTubePublisher = void 0;
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const YOUTUBE_UPLOAD_BASE = 'https://www.googleapis.com/upload/youtube/v3';
class YouTubePublisher {
    constructor(config) {
        this.statusCache = new Map();
        this.accessToken = config.accessToken;
        this.channelId = config.channelId;
    }
    async publish(request) {
        const visibilityMap = {
            public: 'public',
            private: 'private',
            unlisted: 'unlisted',
            friends: 'unlisted',
        };
        const privacyStatus = visibilityMap[request.metadata.visibility] ?? 'private';
        // Step 1: Start a resumable upload session
        const initResponse = await fetch(`${YOUTUBE_UPLOAD_BASE}/videos?uploadType=resumable&part=snippet,status`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json; charset=UTF-8',
                'X-Upload-Content-Type': 'video/mp4',
            },
            body: JSON.stringify({
                snippet: {
                    title: request.metadata.title,
                    description: request.metadata.description,
                    tags: request.metadata.tags,
                    channelId: this.channelId,
                    categoryId: '22', // People & Blogs default
                },
                status: {
                    privacyStatus,
                    selfDeclaredMadeForKids: false,
                },
            }),
        });
        if (!initResponse.ok) {
            const errorBody = await initResponse.text();
            throw new Error(`YouTube upload init failed (${initResponse.status}): ${errorBody}`);
        }
        const uploadUrl = initResponse.headers.get('Location');
        if (!uploadUrl) {
            throw new Error('YouTube upload init did not return a Location header');
        }
        // Step 2: Fetch content and upload it
        const contentResponse = await fetch(request.contentId);
        if (!contentResponse.ok) {
            throw new Error(`Failed to fetch content from ${request.contentId}`);
        }
        const videoBuffer = Buffer.from(await contentResponse.arrayBuffer());
        const uploadResponse = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
                'Content-Type': 'video/mp4',
                'Content-Length': String(videoBuffer.byteLength),
            },
            body: videoBuffer,
        });
        if (!uploadResponse.ok) {
            const errorBody = await uploadResponse.text();
            throw new Error(`YouTube video upload failed (${uploadResponse.status}): ${errorBody}`);
        }
        const uploadData = (await uploadResponse.json());
        const videoId = uploadData.id;
        this.statusCache.set(videoId, 'published');
        return {
            publishId: videoId,
            platform: 'youtube',
            externalId: videoId,
            url: `https://www.youtube.com/watch?v=${videoId}`,
            status: 'published',
            publishedAt: new Date().toISOString(),
        };
    }
    async getStatus(publishId) {
        const cached = this.statusCache.get(publishId);
        if (cached) {
            return cached;
        }
        const response = await fetch(`${YOUTUBE_API_BASE}/videos?part=status&id=${publishId}`, {
            headers: { Authorization: `Bearer ${this.accessToken}` },
        });
        if (!response.ok) {
            return 'failed';
        }
        const data = (await response.json());
        if (!data.items || data.items.length === 0) {
            return 'failed';
        }
        const uploadStatus = data.items[0].status.uploadStatus;
        const statusMap = {
            uploaded: 'publishing',
            processed: 'published',
            failed: 'failed',
            rejected: 'failed',
            deleted: 'archived',
        };
        const status = statusMap[uploadStatus] ?? 'publishing';
        this.statusCache.set(publishId, status);
        return status;
    }
    async delete(externalId) {
        const response = await fetch(`${YOUTUBE_API_BASE}/videos?id=${externalId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${this.accessToken}` },
        });
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`YouTube delete failed (${response.status}): ${errorBody}`);
        }
        this.statusCache.delete(externalId);
    }
}
exports.YouTubePublisher = YouTubePublisher;
//# sourceMappingURL=youtube-publisher.js.map