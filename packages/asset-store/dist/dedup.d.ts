import { Readable } from "stream";
import { EventEmitter } from "events";
import type { Asset, AssetMetadata } from "./types";
/**
 * Calculate the SHA-256 content hash of a Buffer or ReadableStream.
 * Used as the content-addressed key for deduplication.
 */
export declare function calculateContentHash(data: Buffer | Readable): Promise<string>;
/**
 * DeduplicationResult - Result of a deduplication check.
 */
export interface DeduplicationResult {
    /** Whether a duplicate was found */
    isDuplicate: boolean;
    /** The existing asset if a duplicate was found */
    existingAsset: Asset | null;
    /** The calculated content hash */
    contentHash: string;
}
/**
 * AssetDeduplicator - Content-addressed deduplication for assets.
 *
 * Uses SHA-256 hashes to identify duplicate content. When a duplicate
 * is detected, returns the existing asset instead of creating a new one.
 *
 * Events:
 * - 'duplicate_found': Emitted when a duplicate is detected. Payload: { contentHash, existingAsset }
 * - 'new_asset': Emitted when content is new (no duplicate). Payload: { contentHash }
 */
export declare class AssetDeduplicator extends EventEmitter {
    private readonly lookupByHash;
    /**
     * @param lookupByHash - Function to look up an existing asset by its content hash.
     *                        Typically queries the database for an asset with matching contentHash.
     */
    constructor(lookupByHash: (hash: string) => Promise<Asset | null>);
    /**
     * Check if the given data is a duplicate of an existing asset.
     *
     * @param data - The file data to check
     * @param metadata - Optional partial metadata (contentHash will be computed if not provided)
     * @returns DeduplicationResult indicating whether the content is a duplicate
     */
    deduplicate(data: Buffer, metadata?: Partial<AssetMetadata>): Promise<DeduplicationResult>;
    /**
     * Calculate hash without performing deduplication lookup.
     * Useful for pre-computing hashes before upload.
     */
    getHash(data: Buffer | Readable): Promise<string>;
}
//# sourceMappingURL=dedup.d.ts.map