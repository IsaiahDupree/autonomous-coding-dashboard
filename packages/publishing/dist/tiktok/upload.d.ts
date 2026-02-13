/**
 * CF-TIKTOK-002: TikTok Video Uploader
 *
 * Implements the TikTok Content Posting API v2 two-step upload flow:
 *   1. Initialize the upload (get upload URL)
 *   2. Transfer video data to the upload URL
 *   3. Check processing status / publish
 */
import type { TikTokUploadInitInput, TikTokUploadInitResponse, TikTokUploadStatusResponse } from '../types';
export declare class TikTokVideoUploader {
    private readonly accessToken;
    constructor(accessToken: string);
    /**
     * Initializes a video upload via the TikTok Content Posting API.
     * Returns the upload URL and publish ID needed for the transfer step.
     */
    initUpload(input: TikTokUploadInitInput): Promise<TikTokUploadInitResponse>;
    /**
     * Uploads the raw video data to the TikTok-provided upload URL.
     * This is the transfer step in the two-step flow.
     */
    uploadVideo(uploadUrl: string, videoData: Buffer): Promise<void>;
    /**
     * Checks the processing status of an uploaded video.
     */
    checkUploadStatus(publishId: string): Promise<TikTokUploadStatusResponse>;
    /**
     * Finalizes and publishes a video that has finished processing.
     * In TikTok's API v2, publishing happens automatically after successful
     * upload, but this method can be used to poll until PUBLISH_COMPLETE.
     */
    publishVideo(publishId: string): Promise<TikTokUploadStatusResponse>;
}
//# sourceMappingURL=upload.d.ts.map