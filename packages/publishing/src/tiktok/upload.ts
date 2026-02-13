/**
 * CF-TIKTOK-002: TikTok Video Uploader
 *
 * Implements the TikTok Content Posting API v2 two-step upload flow:
 *   1. Initialize the upload (get upload URL)
 *   2. Transfer video data to the upload URL
 *   3. Check processing status / publish
 */

import type {
  TikTokUploadInitInput,
  TikTokUploadInitResponse,
  TikTokUploadStatusResponse,
} from '../types';

const TIKTOK_API_BASE = 'https://open.tiktokapis.com/v2';

export class TikTokVideoUploader {
  private readonly accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  /**
   * Initializes a video upload via the TikTok Content Posting API.
   * Returns the upload URL and publish ID needed for the transfer step.
   */
  async initUpload(input: TikTokUploadInitInput): Promise<TikTokUploadInitResponse> {
    const body = {
      post_info: {
        title: input.title,
        description: input.description,
        privacy_level: input.privacyLevel,
        disable_comment: input.disableComment ?? false,
        video_cover_timestamp_ms: input.videoCoverTimestamp ?? 0,
      },
      source_info: {
        source: 'FILE_UPLOAD',
      },
    };

    const response = await fetch(`${TIKTOK_API_BASE}/post/publish/video/init/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`TikTok initUpload failed (${response.status}): ${errorBody}`);
    }

    const data = (await response.json()) as { data: TikTokUploadInitResponse };
    return data.data;
  }

  /**
   * Uploads the raw video data to the TikTok-provided upload URL.
   * This is the transfer step in the two-step flow.
   */
  async uploadVideo(uploadUrl: string, videoData: Buffer): Promise<void> {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Range': `bytes 0-${videoData.byteLength - 1}/${videoData.byteLength}`,
        'Content-Length': String(videoData.byteLength),
      },
      body: videoData,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`TikTok video upload failed (${response.status}): ${errorBody}`);
    }
  }

  /**
   * Checks the processing status of an uploaded video.
   */
  async checkUploadStatus(publishId: string): Promise<TikTokUploadStatusResponse> {
    const response = await fetch(`${TIKTOK_API_BASE}/post/publish/status/fetch/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify({ publish_id: publishId }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`TikTok checkUploadStatus failed (${response.status}): ${errorBody}`);
    }

    const data = (await response.json()) as { data: TikTokUploadStatusResponse };
    return data.data;
  }

  /**
   * Finalizes and publishes a video that has finished processing.
   * In TikTok's API v2, publishing happens automatically after successful
   * upload, but this method can be used to poll until PUBLISH_COMPLETE.
   */
  async publishVideo(publishId: string): Promise<TikTokUploadStatusResponse> {
    const maxAttempts = 30;
    const pollIntervalMs = 5_000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const status = await this.checkUploadStatus(publishId);

      if (status.status === 'PUBLISH_COMPLETE') {
        return status;
      }

      if (status.status === 'FAILED') {
        throw new Error(
          `TikTok video publish failed: ${status.error_code} - ${status.error_message}`,
        );
      }

      // Still processing; wait and retry
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error(`TikTok video publish timed out after ${maxAttempts} attempts`);
  }
}
