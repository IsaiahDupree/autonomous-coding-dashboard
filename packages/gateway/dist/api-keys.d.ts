import { ApiKeyRecord } from './types';
export interface KeyStore {
    get(hash: string): ApiKeyRecord | undefined;
    set(record: ApiKeyRecord): void;
    delete(id: string): void;
    list(ownerId: string): ApiKeyRecord[];
}
export declare class InMemoryKeyStore implements KeyStore {
    private byHash;
    private byId;
    get(hash: string): ApiKeyRecord | undefined;
    set(record: ApiKeyRecord): void;
    delete(id: string): void;
    list(ownerId: string): ApiKeyRecord[];
    /** Get a record by its ID (internal helper) */
    getById(id: string): ApiKeyRecord | undefined;
}
export interface ApiKeyManagerOptions {
    hashAlgorithm?: string;
    prefix?: string;
    keyLength?: number;
}
export declare class ApiKeyManager {
    private readonly hashAlgorithm;
    private readonly prefix;
    private readonly keyLength;
    private readonly store;
    constructor(options?: ApiKeyManagerOptions, store?: KeyStore);
    /**
     * Generate a new API key.
     * Returns both the raw key (to give to the consumer) and the hashed version (stored).
     */
    generateKey(): {
        raw: string;
        hash: string;
    };
    /**
     * Create and store a new API key record.
     */
    createKey(params: {
        name: string;
        ownerId: string;
        orgId: string;
        scopes?: string[];
        rateLimit?: {
            windowMs: number;
            maxRequests: number;
        };
        product?: string | null;
        expiresAt?: Date | null;
    }): {
        raw: string;
        record: ApiKeyRecord;
    };
    /**
     * Validate a raw API key by hashing it and looking it up in the store.
     * Returns the ApiKeyRecord if valid, or null if not found/inactive/expired.
     */
    validateKey(raw: string): Promise<ApiKeyRecord | null>;
    /**
     * Revoke an API key by ID, making it permanently inactive.
     */
    revokeKey(id: string): void;
    /**
     * Rotate an API key: generate a new raw key, update the hash, invalidate the old one.
     * Returns the new raw key.
     */
    rotateKey(id: string): string;
    /**
     * List all API keys for a given owner. Raw keys are never returned.
     */
    listKeys(ownerId: string): ApiKeyRecord[];
    /**
     * Update the scopes for an API key.
     */
    setScopes(id: string, scopes: string[]): void;
    /**
     * Check if an API key record has expired.
     */
    isExpired(record: ApiKeyRecord): boolean;
    /**
     * Hash a raw API key using the configured algorithm.
     */
    private hashRawKey;
    /**
     * Find a key record by its ID (searches through the store).
     */
    private findById;
}
//# sourceMappingURL=api-keys.d.ts.map