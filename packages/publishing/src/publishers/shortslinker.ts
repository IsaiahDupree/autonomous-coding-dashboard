/**
 * PUB-007: ShortsLinker YouTube Service
 *
 * YouTube Shorts-specific publishing that ensures videos are
 * formatted and tagged correctly for the Shorts shelf.
 */

import type { Publisher, PublishRequest, PublishResult, PublishStatus } from '../types';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const YOUTUBE_UPLOAD_BASE = 'https://www.googleapis.com/upload/youtube/v3';

interface ShortsLinkerConfig {
  accessToken: string;
  channelId: string;
}

export class ShortsLinkerYouTubeService implements Publisher {
  private readonly accessToken: string;
  private readonly channelId: string;
  private readonly statusCache = new Map<string, PublishStatus>();

  constructor(config: ShortsLinkerConfig) {
    this.accessToken = config.accessToken;
    this.channelId = config.channelId;
  }

  /**
   * Publishes a video as a YouTube Short.
   * Ensures the title contains #Shorts for Shorts shelf eligibility.
   */
  async publish(request: PublishRequest): Promise<PublishResult> {
    const visibilityMap: Record<string, string> = {
      public: 'public',
      private: 'private',
      unlisted: 'unlisted',
      friends: 'unlisted',
    };

    const privacyStatus = visibilityMap[request.metadata.visibility] ?? 'public';

    // Ensure title includes #Shorts for Shorts shelf discovery
    let title = request.metadata.title;
    if (!title.toLowerCase().includes('#shorts')) {
      title = `${title} #Shorts`;
    }

    // Ensure tags include 'Shorts'
    const tags = [...request.metadata.tags];
    if (!tags.some((t) => t.toLowerCase() === 'shorts')) {
      tags.push('Shorts');
    }

    // Step 1: Start resumable upload
    const initResponse = await fetch(
      `${YOUTUBE_UPLOAD_BASE}/videos?uploadType=resumable&part=snippet,status`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Type': 'video/mp4',
        },
        body: JSON.stringify({
          snippet: {
            title,
            description: request.metadata.description,
            tags,
            channelId: this.channelId,
            categoryId: '22',
          },
          status: {
            privacyStatus,
            selfDeclaredMadeForKids: false,
            shorts: {
              shortsVideoType: 'SHORTS_VIDEO_TYPE_SHORT',
            },
          },
        }),
      },
    );

    if (!initResponse.ok) {
      const errorBody = await initResponse.text();
      throw new Error(`YouTube Shorts upload init failed (${initResponse.status}): ${errorBody}`);
    }

    const uploadUrl = initResponse.headers.get('Location');
    if (!uploadUrl) {
      throw new Error('YouTube Shorts upload init did not return a Location header');
    }

    // Step 2: Fetch and upload content
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
      throw new Error(`YouTube Shorts upload failed (${uploadResponse.status}): ${errorBody}`);
    }

    const uploadData = (await uploadResponse.json()) as { id: string };
    const videoId = uploadData.id;

    this.statusCache.set(videoId, 'published');

    return {
      publishId: videoId,
      platform: 'youtube',
      externalId: videoId,
      url: `https://www.youtube.com/shorts/${videoId}`,
      status: 'published',
      publishedAt: new Date().toISOString(),
    };
  }

  async getStatus(publishId: string): Promise<PublishStatus> {
    const cached = this.statusCache.get(publishId);
    if (cached) {
      return cached;
    }

    const response = await fetch(
      `${YOUTUBE_API_BASE}/videos?part=status&id=${publishId}`,
      {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      },
    );

    if (!response.ok) {
      return 'failed';
    }

    const data = (await response.json()) as {
      items: Array<{ status: { uploadStatus: string } }>;
    };

    if (!data.items || data.items.length === 0) {
      return 'failed';
    }

    const uploadStatus = data.items[0].status.uploadStatus;
    const statusMap: Record<string, PublishStatus> = {
      uploaded: 'publishing',
      processed: 'published',
      failed: 'failed',
      rejected: 'failed',
      deleted: 'archived',
    };

    const status: PublishStatus = statusMap[uploadStatus] ?? 'publishing';
    this.statusCache.set(publishId, status);
    return status;
  }

  async delete(externalId: string): Promise<void> {
    const response = await fetch(
      `${YOUTUBE_API_BASE}/videos?id=${externalId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${this.accessToken}` },
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`YouTube Shorts delete failed (${response.status}): ${errorBody}`);
    }

    this.statusCache.delete(externalId);
  }
}
