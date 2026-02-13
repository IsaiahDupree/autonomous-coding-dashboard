import { Readable } from "stream";
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
/**
 * SupabaseStorageProvider - Uses Supabase Storage REST API with native fetch.
 */
export declare class SupabaseStorageProvider implements StorageProvider {
    private readonly baseUrl;
    private readonly apiKey;
    private readonly bucket;
    constructor(supabaseUrl: string, supabaseKey: string, bucket: string);
    private headers;
    upload(key: string, data: Buffer | Readable, contentType: string): Promise<void>;
    download(key: string): Promise<Buffer>;
    delete(key: string): Promise<void>;
    getSignedUrl(key: string, expiresIn: number): Promise<string>;
    exists(key: string): Promise<boolean>;
    getMetadata(key: string): Promise<StorageObjectMetadata>;
    private streamToBuffer;
}
/**
 * LocalStorageProvider - Stores files to the local filesystem.
 * Intended for development and testing only.
 */
export declare class LocalStorageProvider implements StorageProvider {
    private readonly basePath;
    constructor(basePath: string);
    private resolvePath;
    upload(key: string, data: Buffer | Readable, _contentType: string): Promise<void>;
    download(key: string): Promise<Buffer>;
    delete(key: string): Promise<void>;
    getSignedUrl(key: string, _expiresIn: number): Promise<string>;
    exists(key: string): Promise<boolean>;
    getMetadata(key: string): Promise<StorageObjectMetadata>;
    private streamToBuffer;
}
/**
 * S3StorageProvider - Stub implementation using native fetch with AWS Signature V4 placeholder.
 * In production, you would integrate a proper AWS SDK or signing implementation.
 */
export declare class S3StorageProvider implements StorageProvider {
    private readonly region;
    private readonly bucket;
    private readonly accessKeyId;
    private readonly secretAccessKey;
    constructor(config: {
        region: string;
        bucket: string;
        accessKeyId: string;
        secretAccessKey: string;
    });
    private getEndpoint;
    /**
     * Placeholder for AWS Signature V4 signing.
     * In production, implement proper request signing using the accessKeyId and secretAccessKey.
     */
    private getAuthHeaders;
    upload(key: string, data: Buffer | Readable, contentType: string): Promise<void>;
    download(key: string): Promise<Buffer>;
    delete(key: string): Promise<void>;
    getSignedUrl(key: string, expiresIn: number): Promise<string>;
    exists(key: string): Promise<boolean>;
    getMetadata(key: string): Promise<StorageObjectMetadata>;
    private streamToBuffer;
}
//# sourceMappingURL=storage.d.ts.map