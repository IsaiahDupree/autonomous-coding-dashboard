import * as fs from "fs";
import * as path from "path";
import { Readable } from "stream";

// ─── AST-001: Storage Provider Interface & Implementations ──────────────────

/**
 * StorageObjectMetadata - Metadata returned by the storage provider for a stored object.
 */
export interface StorageObjectMetadata {
  contentType: string;
  contentLength: number;
  lastModified?: Date;
  etag?: string;
}

/**
 * StorageProvider - Abstract interface for asset storage backends.
 * All implementations must provide these core operations.
 */
export interface StorageProvider {
  /** Upload data to the storage provider under the given key */
  upload(key: string, data: Buffer | Readable, contentType: string): Promise<void>;
  /** Download data from the storage provider */
  download(key: string): Promise<Buffer>;
  /** Delete an object from the storage provider */
  delete(key: string): Promise<void>;
  /** Generate a signed/temporary URL for direct access */
  getSignedUrl(key: string, expiresIn: number): Promise<string>;
  /** Check if an object exists */
  exists(key: string): Promise<boolean>;
  /** Get metadata for a stored object */
  getMetadata(key: string): Promise<StorageObjectMetadata>;
}

// ─── Supabase Storage Provider ──────────────────────────────────────────────

/**
 * SupabaseStorageProvider - Uses Supabase Storage REST API with native fetch.
 */
export class SupabaseStorageProvider implements StorageProvider {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly bucket: string;

  constructor(supabaseUrl: string, supabaseKey: string, bucket: string) {
    this.baseUrl = `${supabaseUrl}/storage/v1`;
    this.apiKey = supabaseKey;
    this.bucket = bucket;
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      apikey: this.apiKey,
    };
  }

  async upload(key: string, data: Buffer | Readable, contentType: string): Promise<void> {
    const body = Buffer.isBuffer(data) ? data : await this.streamToBuffer(data as Readable);
    const url = `${this.baseUrl}/object/${this.bucket}/${key}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        ...this.headers(),
        "Content-Type": contentType,
        "x-upsert": "true",
      },
      body: body,
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Supabase upload failed (${response.status}): ${text}`);
    }
  }

  async download(key: string): Promise<Buffer> {
    const url = `${this.baseUrl}/object/${this.bucket}/${key}`;
    const response = await fetch(url, {
      method: "GET",
      headers: this.headers(),
    });
    if (!response.ok) {
      throw new Error(`Supabase download failed (${response.status}): ${await response.text()}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async delete(key: string): Promise<void> {
    const url = `${this.baseUrl}/object/${this.bucket}`;
    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        ...this.headers(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prefixes: [key] }),
    });
    if (!response.ok) {
      throw new Error(`Supabase delete failed (${response.status}): ${await response.text()}`);
    }
  }

  async getSignedUrl(key: string, expiresIn: number): Promise<string> {
    const url = `${this.baseUrl}/object/sign/${this.bucket}/${key}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        ...this.headers(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expiresIn }),
    });
    if (!response.ok) {
      throw new Error(`Supabase getSignedUrl failed (${response.status}): ${await response.text()}`);
    }
    const result = (await response.json()) as { signedURL: string };
    return `${this.baseUrl}${result.signedURL}`;
  }

  async exists(key: string): Promise<boolean> {
    const url = `${this.baseUrl}/object/${this.bucket}/${key}`;
    const response = await fetch(url, {
      method: "HEAD",
      headers: this.headers(),
    });
    return response.ok;
  }

  async getMetadata(key: string): Promise<StorageObjectMetadata> {
    const url = `${this.baseUrl}/object/${this.bucket}/${key}`;
    const response = await fetch(url, {
      method: "HEAD",
      headers: this.headers(),
    });
    if (!response.ok) {
      throw new Error(`Supabase getMetadata failed (${response.status})`);
    }
    return {
      contentType: response.headers.get("content-type") || "application/octet-stream",
      contentLength: parseInt(response.headers.get("content-length") || "0", 10),
      lastModified: response.headers.get("last-modified")
        ? new Date(response.headers.get("last-modified")!)
        : undefined,
      etag: response.headers.get("etag") || undefined,
    };
  }

  private async streamToBuffer(stream: Readable): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }
}

// ─── Local Storage Provider (dev/testing) ───────────────────────────────────

/**
 * LocalStorageProvider - Stores files to the local filesystem.
 * Intended for development and testing only.
 */
export class LocalStorageProvider implements StorageProvider {
  private readonly basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
    if (!fs.existsSync(basePath)) {
      fs.mkdirSync(basePath, { recursive: true });
    }
  }

  private resolvePath(key: string): string {
    return path.join(this.basePath, key);
  }

  async upload(key: string, data: Buffer | Readable, _contentType: string): Promise<void> {
    const filePath = this.resolvePath(key);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (Buffer.isBuffer(data)) {
      fs.writeFileSync(filePath, data);
    } else {
      const buffer = await this.streamToBuffer(data as Readable);
      fs.writeFileSync(filePath, buffer);
    }
  }

  async download(key: string): Promise<Buffer> {
    const filePath = this.resolvePath(key);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Local file not found: ${filePath}`);
    }
    return fs.readFileSync(filePath);
  }

  async delete(key: string): Promise<void> {
    const filePath = this.resolvePath(key);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  async getSignedUrl(key: string, _expiresIn: number): Promise<string> {
    // Local provider returns a file:// URL
    const filePath = this.resolvePath(key);
    return `file://${path.resolve(filePath)}`;
  }

  async exists(key: string): Promise<boolean> {
    return fs.existsSync(this.resolvePath(key));
  }

  async getMetadata(key: string): Promise<StorageObjectMetadata> {
    const filePath = this.resolvePath(key);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Local file not found: ${filePath}`);
    }
    const stats = fs.statSync(filePath);
    const ext = path.extname(key).toLowerCase();
    const mimeMap: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".mp4": "video/mp4",
      ".webm": "video/webm",
      ".mp3": "audio/mpeg",
      ".wav": "audio/wav",
      ".svg": "image/svg+xml",
      ".json": "application/json",
      ".pdf": "application/pdf",
      ".ttf": "font/ttf",
      ".woff": "font/woff",
      ".woff2": "font/woff2",
    };
    return {
      contentType: mimeMap[ext] || "application/octet-stream",
      contentLength: stats.size,
      lastModified: stats.mtime,
    };
  }

  private async streamToBuffer(stream: Readable): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }
}

// ─── S3 Storage Provider (stub) ─────────────────────────────────────────────

/**
 * S3StorageProvider - Stub implementation using native fetch with AWS Signature V4 placeholder.
 * In production, you would integrate a proper AWS SDK or signing implementation.
 */
export class S3StorageProvider implements StorageProvider {
  private readonly region: string;
  private readonly bucket: string;
  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;

  constructor(config: {
    region: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
  }) {
    this.region = config.region;
    this.bucket = config.bucket;
    this.accessKeyId = config.accessKeyId;
    this.secretAccessKey = config.secretAccessKey;
  }

  private getEndpoint(key: string): string {
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  /**
   * Placeholder for AWS Signature V4 signing.
   * In production, implement proper request signing using the accessKeyId and secretAccessKey.
   */
  private getAuthHeaders(_method: string, _key: string, _contentType?: string): Record<string, string> {
    // AWS Signature V4 placeholder - in production, compute proper signature
    // using this.accessKeyId and this.secretAccessKey
    const now = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
    return {
      "x-amz-date": now,
      "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
      Authorization: `AWS4-HMAC-SHA256 Credential=${this.accessKeyId}/${now.slice(0, 8)}/${this.region}/s3/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=PLACEHOLDER`,
    };
  }

  async upload(key: string, data: Buffer | Readable, contentType: string): Promise<void> {
    const body = Buffer.isBuffer(data) ? data : await this.streamToBuffer(data as Readable);
    const url = this.getEndpoint(key);
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        ...this.getAuthHeaders("PUT", key, contentType),
        "Content-Type": contentType,
        "Content-Length": body.length.toString(),
      },
      body: body,
    });
    if (!response.ok) {
      throw new Error(`S3 upload failed (${response.status}): ${await response.text()}`);
    }
  }

  async download(key: string): Promise<Buffer> {
    const url = this.getEndpoint(key);
    const response = await fetch(url, {
      method: "GET",
      headers: this.getAuthHeaders("GET", key),
    });
    if (!response.ok) {
      throw new Error(`S3 download failed (${response.status}): ${await response.text()}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async delete(key: string): Promise<void> {
    const url = this.getEndpoint(key);
    const response = await fetch(url, {
      method: "DELETE",
      headers: this.getAuthHeaders("DELETE", key),
    });
    if (!response.ok) {
      throw new Error(`S3 delete failed (${response.status}): ${await response.text()}`);
    }
  }

  async getSignedUrl(key: string, expiresIn: number): Promise<string> {
    // Placeholder: In production, generate a proper pre-signed URL
    // using AWS Signature V4 query string authentication
    const expiry = Math.floor(Date.now() / 1000) + expiresIn;
    return `${this.getEndpoint(key)}?X-Amz-Expires=${expiresIn}&X-Amz-Credential=${this.accessKeyId}&X-Amz-Expiry=${expiry}&X-Amz-Signature=PLACEHOLDER`;
  }

  async exists(key: string): Promise<boolean> {
    const url = this.getEndpoint(key);
    const response = await fetch(url, {
      method: "HEAD",
      headers: this.getAuthHeaders("HEAD", key),
    });
    return response.ok;
  }

  async getMetadata(key: string): Promise<StorageObjectMetadata> {
    const url = this.getEndpoint(key);
    const response = await fetch(url, {
      method: "HEAD",
      headers: this.getAuthHeaders("HEAD", key),
    });
    if (!response.ok) {
      throw new Error(`S3 getMetadata failed (${response.status})`);
    }
    return {
      contentType: response.headers.get("content-type") || "application/octet-stream",
      contentLength: parseInt(response.headers.get("content-length") || "0", 10),
      lastModified: response.headers.get("last-modified")
        ? new Date(response.headers.get("last-modified")!)
        : undefined,
      etag: response.headers.get("etag") || undefined,
    };
  }

  private async streamToBuffer(stream: Readable): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }
}
