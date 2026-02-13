/**
 * MetaImageUploadResult - Response from Meta ad image upload.
 */
export interface MetaImageUploadResult {
    hash: string;
    url: string;
    name: string;
    width: number;
    height: number;
}
/**
 * MetaVideoUploadResult - Response from Meta ad video upload.
 */
export interface MetaVideoUploadResult {
    videoId: string;
    title: string;
}
/**
 * MetaVideoStatus - Video processing status from Meta.
 */
export interface MetaVideoStatus {
    videoId: string;
    status: "processing" | "ready" | "error";
    /** Available when status is "ready" */
    thumbnailUrl?: string;
    /** Available when status is "error" */
    errorMessage?: string;
}
/**
 * MetaAssetUploader - Uploads assets to Meta (Facebook) Ads API.
 *
 * Supports:
 * - Image uploads to the Ad Images API
 * - Video uploads to the Ad Videos API (single-request and chunked for large files)
 * - Video processing status checks
 *
 * Uses native fetch with FormData (Node 18+).
 */
export declare class MetaAssetUploader {
    private readonly accessToken;
    private readonly adAccountId;
    private readonly graphApiVersion;
    /**
     * @param accessToken - Meta Marketing API access token
     * @param adAccountId - Ad account ID (format: act_XXXXXXXXX)
     * @param graphApiVersion - Graph API version (default: v19.0)
     */
    constructor(accessToken: string, adAccountId: string, graphApiVersion?: string);
    private get baseUrl();
    /**
     * Upload an image to Meta Ad Images API.
     *
     * @param data - Image file data as Buffer
     * @param filename - Original filename
     * @returns Upload result with hash, URL, dimensions
     */
    uploadImage(data: Buffer, filename: string): Promise<MetaImageUploadResult>;
    /**
     * Upload a video to Meta Ad Videos API.
     * Automatically uses chunked upload for files larger than 1 GB.
     *
     * @param data - Video file data as Buffer
     * @param filename - Original filename
     * @returns Upload result with video ID
     */
    uploadVideo(data: Buffer, filename: string): Promise<MetaVideoUploadResult>;
    /**
     * Check the processing status of an uploaded video.
     *
     * @param videoId - The video ID returned from upload
     * @returns Current processing status
     */
    getUploadStatus(videoId: string): Promise<MetaVideoStatus>;
    /**
     * Single-request video upload for files under the chunked threshold.
     */
    private uploadVideoSingle;
    /**
     * Chunked video upload for files larger than 1 GB.
     *
     * Three-phase process:
     * 1. Start: Initialize an upload session
     * 2. Transfer: Send chunks sequentially
     * 3. Finish: Finalize the upload
     */
    private uploadVideoChunked;
    /**
     * Start a chunked upload session.
     */
    private startChunkedUpload;
    /**
     * Send a single chunk of data.
     */
    private sendChunk;
    /**
     * Finalize a chunked upload.
     */
    private finishChunkedUpload;
}
//# sourceMappingURL=meta-upload.d.ts.map