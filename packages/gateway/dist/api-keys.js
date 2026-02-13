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
exports.ApiKeyManager = exports.InMemoryKeyStore = void 0;
const crypto = __importStar(require("crypto"));
// ─── In-Memory Key Store ─────────────────────────────────────────────────────
class InMemoryKeyStore {
    constructor() {
        this.byHash = new Map();
        this.byId = new Map();
    }
    get(hash) {
        return this.byHash.get(hash);
    }
    set(record) {
        this.byHash.set(record.key, record);
        this.byId.set(record.id, record);
    }
    delete(id) {
        const record = this.byId.get(id);
        if (record) {
            this.byHash.delete(record.key);
            this.byId.delete(id);
        }
    }
    list(ownerId) {
        const results = [];
        for (const record of this.byId.values()) {
            if (record.ownerId === ownerId) {
                results.push(record);
            }
        }
        return results;
    }
    /** Get a record by its ID (internal helper) */
    getById(id) {
        return this.byId.get(id);
    }
}
exports.InMemoryKeyStore = InMemoryKeyStore;
// ─── API Key Manager ─────────────────────────────────────────────────────────
class ApiKeyManager {
    constructor(options = {}, store) {
        this.hashAlgorithm = options.hashAlgorithm ?? 'sha256';
        this.prefix = options.prefix ?? 'acd_';
        this.keyLength = options.keyLength ?? 32;
        this.store = store ?? new InMemoryKeyStore();
    }
    /**
     * Generate a new API key.
     * Returns both the raw key (to give to the consumer) and the hashed version (stored).
     */
    generateKey() {
        const randomBytes = crypto.randomBytes(this.keyLength);
        const raw = this.prefix + randomBytes.toString('base64url');
        const hash = this.hashRawKey(raw);
        return { raw, hash };
    }
    /**
     * Create and store a new API key record.
     */
    createKey(params) {
        const { raw, hash } = this.generateKey();
        const record = {
            id: crypto.randomUUID(),
            key: hash,
            name: params.name,
            ownerId: params.ownerId,
            orgId: params.orgId,
            scopes: params.scopes ?? [],
            rateLimit: params.rateLimit ?? { windowMs: 60000, maxRequests: 100 },
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
    async validateKey(raw) {
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
        const updated = {
            ...record,
            lastUsedAt: new Date(),
        };
        this.store.set(updated);
        return updated;
    }
    /**
     * Revoke an API key by ID, making it permanently inactive.
     */
    revokeKey(id) {
        const record = this.findById(id);
        if (record) {
            const updated = {
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
    rotateKey(id) {
        const record = this.findById(id);
        if (!record) {
            throw new Error(`API key with id "${id}" not found`);
        }
        // Remove old hash mapping
        this.store.delete(id);
        // Generate new key
        const { raw, hash } = this.generateKey();
        const updated = {
            ...record,
            key: hash,
        };
        this.store.set(updated);
        return raw;
    }
    /**
     * List all API keys for a given owner. Raw keys are never returned.
     */
    listKeys(ownerId) {
        return this.store.list(ownerId);
    }
    /**
     * Update the scopes for an API key.
     */
    setScopes(id, scopes) {
        const record = this.findById(id);
        if (!record) {
            throw new Error(`API key with id "${id}" not found`);
        }
        const updated = {
            ...record,
            scopes,
        };
        this.store.set(updated);
    }
    /**
     * Check if an API key record has expired.
     */
    isExpired(record) {
        if (!record.expiresAt) {
            return false;
        }
        return new Date() > record.expiresAt;
    }
    /**
     * Hash a raw API key using the configured algorithm.
     */
    hashRawKey(raw) {
        return crypto.createHash(this.hashAlgorithm).update(raw).digest('hex');
    }
    /**
     * Find a key record by its ID (searches through the store).
     */
    findById(id) {
        if (this.store instanceof InMemoryKeyStore) {
            return this.store.getById(id);
        }
        // For custom stores, we don't have a direct ID lookup;
        // this is a limitation of the interface that could be extended.
        return undefined;
    }
}
exports.ApiKeyManager = ApiKeyManager;
//# sourceMappingURL=api-keys.js.map