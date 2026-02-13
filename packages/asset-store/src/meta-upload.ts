// ─── AST-005: Meta Asset Upload ─────────────────────────────────────────────

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
 * MetaChunkedUploadSession - Tracks state of a chunked video upload.
 */
interface MetaChunkedUploadSession {
  uploadSessionId: string;
  videoId: string;
  startOffset: number;
  endOffset: number;
}

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
export class MetaAssetUploader {
  private readonly accessToken: string;
  private readonly adAccountId: string;
  private readonly graphApiVersion: string;

  /**
   * @param accessToken - Meta Marketing API access token
   * @param adAccountId - Ad account ID (format: act_XXXXXXXXX)
   * @param graphApiVersion - Graph API version (default: v19.0)
   */
  constructor(accessToken: string, adAccountId: string, graphApiVersion: string = "v19.0") {
    this.accessToken = accessToken;
    this.adAccountId = adAccountId;
    this.graphApiVersion = graphApiVersion;
  }

  private get baseUrl(): string {
    return `https://graph.facebook.com/${this.graphApiVersion}`;
  }

  /**
   * Upload an image to Meta Ad Images API.
   *
   * @param data - Image file data as Buffer
   * @param filename - Original filename
   * @returns Upload result with hash, URL, dimensions
   */
  async uploadImage(data: Buffer, filename: string): Promise<MetaImageUploadResult> {
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

    const result = (await response.json()) as {
      images: Record<string, {
        hash: string;
        url: string;
        name: string;
        width: number;
        height: number;
      }>;
    };

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
  async uploadVideo(data: Buffer, filename: string): Promise<MetaVideoUploadResult> {
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
  async getUploadStatus(videoId: string): Promise<MetaVideoStatus> {
    const url = `${this.baseUrl}/${videoId}?fields=status,thumbnails&access_token=${this.accessToken}`;

    const response = await fetch(url, { method: "GET" });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Meta video status check failed (${response.status}): ${errorBody}`);
    }

    const result = (await response.json()) as {
      status: { video_status: string; processing_progress?: number };
      thumbnails?: { data: Array<{ uri: string }> };
    };

    const videoStatus = result.status.video_status;

    if (videoStatus === "ready") {
      return {
        videoId,
        status: "ready",
        thumbnailUrl: result.thumbnails?.data?.[0]?.uri,
      };
    } else if (videoStatus === "error") {
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
  private async uploadVideoSingle(data: Buffer, filename: string): Promise<MetaVideoUploadResult> {
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

    const result = (await response.json()) as { id: string };

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
  private async uploadVideoChunked(data: Buffer, filename: string): Promise<MetaVideoUploadResult> {
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
  private async startChunkedUpload(fileSize: number): Promise<MetaChunkedUploadSession> {
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

    const result = (await response.json()) as {
      upload_session_id: string;
      video_id: string;
      start_offset: string;
      end_offset: string;
    };

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
  private async sendChunk(
    uploadSessionId: string,
    chunk: Buffer,
    startOffset: number
  ): Promise<{ startOffset: number; endOffset: number }> {
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

    const result = (await response.json()) as {
      start_offset: string;
      end_offset: string;
    };

    return {
      startOffset: parseInt(result.start_offset, 10),
      endOffset: parseInt(result.end_offset, 10),
    };
  }

  /**
   * Finalize a chunked upload.
   */
  private async finishChunkedUpload(
    uploadSessionId: string,
    filename: string
  ): Promise<MetaVideoUploadResult> {
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

    const result = (await response.json()) as { success: boolean; video_id?: string };

    if (!result.success) {
      throw new Error("Meta chunked upload finish reported failure");
    }

    return {
      videoId: result.video_id || uploadSessionId,
      title: filename,
    };
  }
}
