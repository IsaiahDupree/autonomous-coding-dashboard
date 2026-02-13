import * as crypto from 'crypto';
import { ApiKeyRecord } from './types';

// ─── Key Store Interface ─────────────────────────────────────────────────────

export interface KeyStore {
  get(hash: string): ApiKeyRecord | undefined;
  set(record: ApiKeyRecord): void;
  delete(id: string): void;
  list(ownerId: string): ApiKeyRecord[];
}

// ─── In-Memory Key Store ─────────────────────────────────────────────────────

export class InMemoryKeyStore implements KeyStore {
  private byHash: Map<string, ApiKeyRecord> = new Map();
  private byId: Map<string, ApiKeyRecord> = new Map();

  get(hash: string): ApiKeyRecord | undefined {
    return this.byHash.get(hash);
  }

  set(record: ApiKeyRecord): void {
    this.byHash.set(record.key, record);
    this.byId.set(record.id, record);
  }

  delete(id: string): void {
    const record = this.byId.get(id);
    if (record) {
      this.byHash.delete(record.key);
      this.byId.delete(id);
    }
  }

  list(ownerId: string): ApiKeyRecord[] {
    const results: ApiKeyRecord[] = [];
    for (const record of this.byId.values()) {
      if (record.ownerId === ownerId) {
        results.push(record);
      }
    }
    return results;
  }

  /** Get a record by its ID (internal helper) */
  getById(id: string): ApiKeyRecord | undefined {
    return this.byId.get(id);
  }
}

// ─── API Key Manager Options ─────────────────────────────────────────────────

export interface ApiKeyManagerOptions {
  hashAlgorithm?: string;
  prefix?: string;
  keyLength?: number;
}

// ─── API Key Manager ─────────────────────────────────────────────────────────

export class ApiKeyManager {
  private readonly hashAlgorithm: string;
  private readonly prefix: string;
  private readonly keyLength: number;
  private readonly store: KeyStore;

  constructor(options: ApiKeyManagerOptions = {}, store?: KeyStore) {
    this.hashAlgorithm = options.hashAlgorithm ?? 'sha256';
    this.prefix = options.prefix ?? 'acd_';
    this.keyLength = options.keyLength ?? 32;
    this.store = store ?? new InMemoryKeyStore();
  }

  /**
   * Generate a new API key.
   * Returns both the raw key (to give to the consumer) and the hashed version (stored).
   */
  generateKey(): { raw: string; hash: string } {
    const randomBytes = crypto.randomBytes(this.keyLength);
    const raw = this.prefix + randomBytes.toString('base64url');
    const hash = this.hashRawKey(raw);
    return { raw, hash };
  }

  /**
   * Create and store a new API key record.
   */
  createKey(params: {
    name: string;
    ownerId: string;
    orgId: string;
    scopes?: string[];
    rateLimit?: { windowMs: number; maxRequests: number };
    product?: string | null;
    expiresAt?: Date | null;
  }): { raw: string; record: ApiKeyRecord } {
    const { raw, hash } = this.generateKey();

    const record: ApiKeyRecord = {
      id: crypto.randomUUID(),
      key: hash,
      name: params.name,
      ownerId: params.ownerId,
      orgId: params.orgId,
      scopes: params.scopes ?? [],
      rateLimit: params.rateLimit ?? { windowMs: 60_000, maxRequests: 100 },
      product: params.product ?? null,
      createdAt: new Date(),
      expiresAt: params.expiresAt ?? null,
      lastUsedAt: null,
      isActive: true,
    };

    this.store.set(record);
    return { raw, record };
  }

  /**
   * Validate a raw API key by hashing it and looking it up in the store.
   * Returns the ApiKeyRecord if valid, or null if not found/inactive/expired.
   */
  async validateKey(raw: string): Promise<ApiKeyRecord | null> {
    const hash = this.hashRawKey(raw);
    const record = this.store.get(hash);

    if (!record) {
      return null;
    }

    if (!record.isActive) {
      return null;
    }

    if (this.isExpired(record)) {
      return null;
    }

    // Update last used timestamp
    const updated: ApiKeyRecord = {
      ...record,
      lastUsedAt: new Date(),
    };
    this.store.set(updated);

    return updated;
  }

  /**
   * Revoke an API key by ID, making it permanently inactive.
   */
  revokeKey(id: string): void {
    const record = this.findById(id);
    if (record) {
      const updated: ApiKeyRecord = {
        ...record,
        isActive: false,
      };
      this.store.set(updated);
    }
  }

  /**
   * Rotate an API key: generate a new raw key, update the hash, invalidate the old one.
   * Returns the new raw key.
   */
  rotateKey(id: string): string {
    const record = this.findById(id);
    if (!record) {
      throw new Error(`API key with id "${id}" not found`);
    }

    // Remove old hash mapping
    this.store.delete(id);

    // Generate new key
    const { raw, hash } = this.generateKey();

    const updated: ApiKeyRecord = {
      ...record,
      key: hash,
    };
    this.store.set(updated);

    return raw;
  }

  /**
   * List all API keys for a given owner. Raw keys are never returned.
   */
  listKeys(ownerId: string): ApiKeyRecord[] {
    return this.store.list(ownerId);
  }

  /**
   * Update the scopes for an API key.
   */
  setScopes(id: string, scopes: string[]): void {
    const record = this.findById(id);
    if (!record) {
      throw new Error(`API key with id "${id}" not found`);
    }

    const updated: ApiKeyRecord = {
      ...record,
      scopes,
    };
    this.store.set(updated);
  }

  /**
   * Check if an API key record has expired.
   */
  isExpired(record: ApiKeyRecord): boolean {
    if (!record.expiresAt) {
      return false;
    }
    return new Date() > record.expiresAt;
  }

  /**
   * Hash a raw API key using the configured algorithm.
   */
  private hashRawKey(raw: string): string {
    return crypto.createHash(this.hashAlgorithm).update(raw).digest('hex');
  }

  /**
   * Find a key record by its ID (searches through the store).
   */
  private findById(id: string): ApiKeyRecord | undefined {
    if (this.store instanceof InMemoryKeyStore) {
      return this.store.getById(id);
    }
    // For custom stores, we don't have a direct ID lookup;
    // this is a limitation of the interface that could be extended.
    return undefined;
  }
}
