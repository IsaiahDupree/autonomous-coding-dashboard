"use strict";
/**
 * PUB-001: TikTok Publisher
 *
 * Implements the Publisher interface for TikTok video content.
 * Delegates to TikTokVideoUploader for the actual upload flow.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TikTokPublisher = void 0;
const upload_1 = require("../tiktok/upload");
const TIKTOK_API_BASE = 'https://open.tiktokapis.com/v2';
class TikTokPublisher {
    constructor(config) {
        this.statusCache = new Map();
        this.accessToken = config.accessToken;
        this.uploader = new upload_1.TikTokVideoUploader(config.accessToken);
    }
    async publish(request) {
        // Map visibility to TikTok privacy level
        const privacyMap = {
            public: 'PUBLIC_TO_EVERYONE',
            private: 'SELF_ONLY',
            unlisted: 'SELF_ONLY',
            friends: 'MUTUAL_FOLLOW_FRIENDS',
        };
        const privacyLevel = (privacyMap[request.metadata.visibility] ?? 'PUBLIC_TO_EVERYONE');
        // Step 1: Initialize upload
        const initResult = await this.uploader.initUpload({
            title: request.metadata.title,
            description: request.metadata.description,
            privacyLevel,
        });
        // Step 2: Fetch the content binary from the contentId URL and upload it
        const contentResponse = await fetch(request.contentId);
        if (!contentResponse.ok) {
            throw new Error(`Failed to fetch content from ${request.contentId}`);
        }
        const arrayBuffer = await contentResponse.arrayBuffer();
        const videoBuffer = Buffer.from(arrayBuffer);
        await this.uploader.uploadVideo(initResult.upload_url, videoBuffer);
        // Step 3: Poll until published
        const finalStatus = await this.uploader.publishVideo(initResult.publish_id);
        const publishId = finalStatus.publish_id;
        this.statusCache.set(publishId, 'published');
        return {
            publishId,
            platform: 'tiktok',
            externalId: publishId,
            url: `https://www.tiktok.com/@${request.account}/video/${publishId}`,
            status: 'published',
            publishedAt: new Date().toISOString(),
        };
    }
    async getStatus(publishId) {
        // Check local cache first
        const cached = this.statusCache.get(publishId);
        if (cached) {
            return cached;
        }
        // Poll TikTok for real status
        const statusResponse = await this.uploader.checkUploadStatus(publishId);
        const statusMap = {
            PROCESSING_UPLOAD: 'publishing',
            PROCESSING_DOWNLOAD: 'publishing',
            SEND_TO_USER_INBOX: 'publishing',
            PUBLISH_COMPLETE: 'published',
            FAILED: 'failed',
        };
        const status = statusMap[statusResponse.status] ?? 'publishing';
        this.statusCache.set(publishId, status);
        return status;
    }
    async delete(externalId) {
        const response = await fetch(`${TIKTOK_API_BASE}/post/publish/video/delete/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=UTF-8',
                Authorization: `Bearer ${this.accessToken}`,
            },
            body: JSON.stringify({ video_id: externalId }),
        });
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`TikTok delete failed (${response.status}): ${errorBody}`);
        }
        this.statusCache.delete(externalId);
    }
}
exports.TikTokPublisher = TikTokPublisher;
//# sourceMappingURL=tiktok-publisher.js.map