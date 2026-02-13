"use strict";
// ─── AST-005: Meta Asset Upload ─────────────────────────────────────────────
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetaAssetUploader = void 0;
/** Threshold for chunked upload (1 GB) */
const CHUNKED_UPLOAD_THRESHOLD = 1024 * 1024 * 1024;
/** Chunk size for chunked uploads (4 MB) */
const CHUNK_SIZE = 4 * 1024 * 1024;
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
class MetaAssetUploader {
    /**
     * @param accessToken - Meta Marketing API access token
     * @param adAccountId - Ad account ID (format: act_XXXXXXXXX)
     * @param graphApiVersion - Graph API version (default: v19.0)
     */
    constructor(accessToken, adAccountId, graphApiVersion = "v19.0") {
        this.accessToken = accessToken;
        this.adAccountId = adAccountId;
        this.graphApiVersion = graphApiVersion;
    }
    get baseUrl() {
        return `https://graph.facebook.com/${this.graphApiVersion}`;
    }
    /**
     * Upload an image to Meta Ad Images API.
     *
     * @param data - Image file data as Buffer
     * @param filename - Original filename
     * @returns Upload result with hash, URL, dimensions
     */
    async uploadImage(data, filename) {
        const url = `${this.baseUrl}/${this.adAccountId}/adimages`;
        const formData = new FormData();
        formData.append("access_token", this.accessToken);
        formData.append("filename", new Blob([data]), filename);
        const response = await fetch(url, {
            method: "POST",
            body: formData,
        });
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Meta image upload failed (${response.status}): ${errorBody}`);
        }
        const result = (await response.json());
        const imageData = Object.values(result.images)[0];
        if (!imageData) {
            throw new Error("Meta image upload returned no image data");
        }
        return {
            hash: imageData.hash,
            url: imageData.url,
            name: imageData.name,
            width: imageData.width,
            height: imageData.height,
        };
    }
    /**
     * Upload a video to Meta Ad Videos API.
     * Automatically uses chunked upload for files larger than 1 GB.
     *
     * @param data - Video file data as Buffer
     * @param filename - Original filename
     * @returns Upload result with video ID
     */
    async uploadVideo(data, filename) {
        if (data.length > CHUNKED_UPLOAD_THRESHOLD) {
            return this.uploadVideoChunked(data, filename);
        }
        return this.uploadVideoSingle(data, filename);
    }
    /**
     * Check the processing status of an uploaded video.
     *
     * @param videoId - The video ID returned from upload
     * @returns Current processing status
     */
    async getUploadStatus(videoId) {
        const url = `${this.baseUrl}/${videoId}?fields=status,thumbnails&access_token=${this.accessToken}`;
        const response = await fetch(url, { method: "GET" });
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Meta video status check failed (${response.status}): ${errorBody}`);
        }
        const result = (await response.json());
        const videoStatus = result.status.video_status;
        if (videoStatus === "ready") {
            return {
                videoId,
                status: "ready",
                thumbnailUrl: result.thumbnails?.data?.[0]?.uri,
            };
        }
        else if (videoStatus === "error") {
            return {
                videoId,
                status: "error",
                errorMessage: `Video processing failed`,
            };
        }
        return {
            videoId,
            status: "processing",
        };
    }
    // ─── Private Methods ────────────────────────────────────────────────────
    /**
     * Single-request video upload for files under the chunked threshold.
     */
    async uploadVideoSingle(data, filename) {
        const url = `${this.baseUrl}/${this.adAccountId}/advideos`;
        const formData = new FormData();
        formData.append("access_token", this.accessToken);
        formData.append("title", filename);
        formData.append("source", new Blob([data]), filename);
        const response = await fetch(url, {
            method: "POST",
            body: formData,
        });
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Meta video upload failed (${response.status}): ${errorBody}`);
        }
        const result = (await response.json());
        return {
            videoId: result.id,
            title: filename,
        };
    }
    /**
     * Chunked video upload for files larger than 1 GB.
     *
     * Three-phase process:
     * 1. Start: Initialize an upload session
     * 2. Transfer: Send chunks sequentially
     * 3. Finish: Finalize the upload
     */
    async uploadVideoChunked(data, filename) {
        // Phase 1: Start upload session
        const session = await this.startChunkedUpload(data.length);
        // Phase 2: Send chunks
        let offset = 0;
        while (offset < data.length) {
            const end = Math.min(offset + CHUNK_SIZE, data.length);
            const chunk = data.subarray(offset, end);
            const result = await this.sendChunk(session.uploadSessionId, chunk, offset);
            offset = result.endOffset;
        }
        // Phase 3: Finish upload
        const videoResult = await this.finishChunkedUpload(session.uploadSessionId, filename);
        return videoResult;
    }
    /**
     * Start a chunked upload session.
     */
    async startChunkedUpload(fileSize) {
        const url = `${this.baseUrl}/${this.adAccountId}/advideos`;
        const formData = new FormData();
        formData.append("access_token", this.accessToken);
        formData.append("upload_phase", "start");
        formData.append("file_size", fileSize.toString());
        const response = await fetch(url, {
            method: "POST",
            body: formData,
        });
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Meta chunked upload start failed (${response.status}): ${errorBody}`);
        }
        const result = (await response.json());
        return {
            uploadSessionId: result.upload_session_id,
            videoId: result.video_id,
            startOffset: parseInt(result.start_offset, 10),
            endOffset: parseInt(result.end_offset, 10),
        };
    }
    /**
     * Send a single chunk of data.
     */
    async sendChunk(uploadSessionId, chunk, startOffset) {
        const url = `${this.baseUrl}/${this.adAccountId}/advideos`;
        const formData = new FormData();
        formData.append("access_token", this.accessToken);
        formData.append("upload_phase", "transfer");
        formData.append("upload_session_id", uploadSessionId);
        formData.append("start_offset", startOffset.toString());
        formData.append("video_file_chunk", new Blob([chunk]), "chunk");
        const response = await fetch(url, {
            method: "POST",
            body: formData,
        });
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Meta chunked upload transfer failed (${response.status}): ${errorBody}`);
        }
        const result = (await response.json());
        return {
            startOffset: parseInt(result.start_offset, 10),
            endOffset: parseInt(result.end_offset, 10),
        };
    }
    /**
     * Finalize a chunked upload.
     */
    async finishChunkedUpload(uploadSessionId, filename) {
        const url = `${this.baseUrl}/${this.adAccountId}/advideos`;
        const formData = new FormData();
        formData.append("access_token", this.accessToken);
        formData.append("upload_phase", "finish");
        formData.append("upload_session_id", uploadSessionId);
        formData.append("title", filename);
        const response = await fetch(url, {
            method: "POST",
            body: formData,
        });
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Meta chunked upload finish failed (${response.status}): ${errorBody}`);
        }
        const result = (await response.json());
        if (!result.success) {
            throw new Error("Meta chunked upload finish reported failure");
        }
        return {
            videoId: result.video_id || uploadSessionId,
            title: filename,
        };
    }
}
exports.MetaAssetUploader = MetaAssetUploader;
//# sourceMappingURL=meta-upload.js.map