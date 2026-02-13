"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3StorageProvider = exports.LocalStorageProvider = exports.SupabaseStorageProvider = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// ─── Supabase Storage Provider ──────────────────────────────────────────────
/**
 * SupabaseStorageProvider - Uses Supabase Storage REST API with native fetch.
 */
class SupabaseStorageProvider {
    constructor(supabaseUrl, supabaseKey, bucket) {
        this.baseUrl = `${supabaseUrl}/storage/v1`;
        this.apiKey = supabaseKey;
        this.bucket = bucket;
    }
    headers() {
        return {
            Authorization: `Bearer ${this.apiKey}`,
            apikey: this.apiKey,
        };
    }
    async upload(key, data, contentType) {
        const body = Buffer.isBuffer(data) ? data : await this.streamToBuffer(data);
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
    async download(key) {
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
    async delete(key) {
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
    async getSignedUrl(key, expiresIn) {
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
        const result = (await response.json());
        return `${this.baseUrl}${result.signedURL}`;
    }
    async exists(key) {
        const url = `${this.baseUrl}/object/${this.bucket}/${key}`;
        const response = await fetch(url, {
            method: "HEAD",
            headers: this.headers(),
        });
        return response.ok;
    }
    async getMetadata(key) {
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
                ? new Date(response.headers.get("last-modified"))
                : undefined,
            etag: response.headers.get("etag") || undefined,
        };
    }
    async streamToBuffer(stream) {
        const chunks = [];
        for await (const chunk of stream) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        return Buffer.concat(chunks);
    }
}
exports.SupabaseStorageProvider = SupabaseStorageProvider;
// ─── Local Storage Provider (dev/testing) ───────────────────────────────────
/**
 * LocalStorageProvider - Stores files to the local filesystem.
 * Intended for development and testing only.
 */
class LocalStorageProvider {
    constructor(basePath) {
        this.basePath = basePath;
        if (!fs.existsSync(basePath)) {
            fs.mkdirSync(basePath, { recursive: true });
        }
    }
    resolvePath(key) {
        return path.join(this.basePath, key);
    }
    async upload(key, data, _contentType) {
        const filePath = this.resolvePath(key);
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        if (Buffer.isBuffer(data)) {
            fs.writeFileSync(filePath, data);
        }
        else {
            const buffer = await this.streamToBuffer(data);
            fs.writeFileSync(filePath, buffer);
        }
    }
    async download(key) {
        const filePath = this.resolvePath(key);
        if (!fs.existsSync(filePath)) {
            throw new Error(`Local file not found: ${filePath}`);
        }
        return fs.readFileSync(filePath);
    }
    async delete(key) {
        const filePath = this.resolvePath(key);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
    async getSignedUrl(key, _expiresIn) {
        // Local provider returns a file:// URL
        const filePath = this.resolvePath(key);
        return `file://${path.resolve(filePath)}`;
    }
    async exists(key) {
        return fs.existsSync(this.resolvePath(key));
    }
    async getMetadata(key) {
        const filePath = this.resolvePath(key);
        if (!fs.existsSync(filePath)) {
            throw new Error(`Local file not found: ${filePath}`);
        }
        const stats = fs.statSync(filePath);
        const ext = path.extname(key).toLowerCase();
        const mimeMap = {
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
    async streamToBuffer(stream) {
        const chunks = [];
        for await (const chunk of stream) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        return Buffer.concat(chunks);
    }
}
exports.LocalStorageProvider = LocalStorageProvider;
// ─── S3 Storage Provider (stub) ─────────────────────────────────────────────
/**
 * S3StorageProvider - Stub implementation using native fetch with AWS Signature V4 placeholder.
 * In production, you would integrate a proper AWS SDK or signing implementation.
 */
class S3StorageProvider {
    constructor(config) {
        this.region = config.region;
        this.bucket = config.bucket;
        this.accessKeyId = config.accessKeyId;
        this.secretAccessKey = config.secretAccessKey;
    }
    getEndpoint(key) {
        return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
    }
    /**
     * Placeholder for AWS Signature V4 signing.
     * In production, implement proper request signing using the accessKeyId and secretAccessKey.
     */
    getAuthHeaders(_method, _key, _contentType) {
        // AWS Signature V4 placeholder - in production, compute proper signature
        // using this.accessKeyId and this.secretAccessKey
        const now = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
        return {
            "x-amz-date": now,
            "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
            Authorization: `AWS4-HMAC-SHA256 Credential=${this.accessKeyId}/${now.slice(0, 8)}/${this.region}/s3/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=PLACEHOLDER`,
        };
    }
    async upload(key, data, contentType) {
        const body = Buffer.isBuffer(data) ? data : await this.streamToBuffer(data);
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
    async download(key) {
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
    async delete(key) {
        const url = this.getEndpoint(key);
        const response = await fetch(url, {
            method: "DELETE",
            headers: this.getAuthHeaders("DELETE", key),
        });
        if (!response.ok) {
            throw new Error(`S3 delete failed (${response.status}): ${await response.text()}`);
        }
    }
    async getSignedUrl(key, expiresIn) {
        // Placeholder: In production, generate a proper pre-signed URL
        // using AWS Signature V4 query string authentication
        const expiry = Math.floor(Date.now() / 1000) + expiresIn;
        return `${this.getEndpoint(key)}?X-Amz-Expires=${expiresIn}&X-Amz-Credential=${this.accessKeyId}&X-Amz-Expiry=${expiry}&X-Amz-Signature=PLACEHOLDER`;
    }
    async exists(key) {
        const url = this.getEndpoint(key);
        const response = await fetch(url, {
            method: "HEAD",
            headers: this.getAuthHeaders("HEAD", key),
        });
        return response.ok;
    }
    async getMetadata(key) {
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
                ? new Date(response.headers.get("last-modified"))
                : undefined,
            etag: response.headers.get("etag") || undefined,
        };
    }
    async streamToBuffer(stream) {
        const chunks = [];
        for await (const chunk of stream) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        return Buffer.concat(chunks);
    }
}
exports.S3StorageProvider = S3StorageProvider;
//# sourceMappingURL=storage.js.map