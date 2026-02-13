"use strict";
/**
 * VOICE-001: Shared Voice Reference Storage
 *
 * Provides an in-memory voice reference store with a pluggable persistence
 * interface so the backing storage can be swapped (e.g. database, file-system,
 * cloud KV) without changing calling code.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoiceStorageService = void 0;
const types_1 = require("./types");
// ---------------------------------------------------------------------------
// Default in-memory persistence implementation
// ---------------------------------------------------------------------------
class InMemoryVoicePersistence {
    constructor() {
        this.store = new Map();
    }
    async get(key) {
        return this.store.get(key) ?? null;
    }
    async set(key, value) {
        this.store.set(key, value);
    }
    async delete(key) {
        this.store.delete(key);
    }
    async list() {
        return Array.from(this.store.values());
    }
}
class VoiceStorageService {
    constructor(options = {}) {
        this.storageUrl = options.storageUrl;
        this.apiKey = options.apiKey;
        this.persistence = options.persistence ?? new InMemoryVoicePersistence();
    }
    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------
    /**
     * Store a new voice reference record.
     * Validates the input against the Zod schema before persisting.
     */
    async storeVoice(voice) {
        const validated = types_1.voiceReferenceSchema.parse(voice);
        await this.persistence.set(validated.id, validated);
        return validated;
    }
    /**
     * Retrieve a single voice reference by its ID.
     * Returns `null` when no matching record exists.
     */
    async getVoice(voiceId) {
        return this.persistence.get(voiceId);
    }
    /**
     * List all voice references belonging to an organisation, optionally
     * filtered by tags, provider, or creator.
     */
    async listVoices(orgId, filters) {
        const all = await this.persistence.list();
        return all.filter((v) => {
            if (v.orgId !== orgId)
                return false;
            if (filters?.provider && v.provider !== filters.provider)
                return false;
            if (filters?.createdBy && v.createdBy !== filters.createdBy)
                return false;
            if (filters?.tags && filters.tags.length > 0) {
                const hasAllTags = filters.tags.every((t) => v.tags.includes(t));
                if (!hasAllTags)
                    return false;
            }
            return true;
        });
    }
    /**
     * Delete a voice reference by its ID.
     * No-op when the voice does not exist.
     */
    async deleteVoice(voiceId) {
        await this.persistence.delete(voiceId);
    }
    /**
     * Partially update a voice reference.
     * Merges the updates into the existing record and re-validates.
     *
     * @throws Error if no voice with the given ID exists.
     */
    async updateVoice(voiceId, updates) {
        const existing = await this.persistence.get(voiceId);
        if (!existing) {
            throw new Error(`Voice not found: ${voiceId}`);
        }
        const merged = { ...existing, ...updates, id: voiceId };
        const validated = types_1.voiceReferenceSchema.parse(merged);
        await this.persistence.set(voiceId, validated);
        return validated;
    }
    /**
     * Full-text search across voice name, description, and tags.
     * Case-insensitive substring matching.
     */
    async searchVoices(query, orgId) {
        const all = await this.persistence.list();
        const q = query.toLowerCase();
        return all.filter((v) => {
            if (v.orgId !== orgId)
                return false;
            const nameMatch = v.name.toLowerCase().includes(q);
            const descMatch = v.description?.toLowerCase().includes(q) ?? false;
            const tagMatch = v.tags.some((t) => t.toLowerCase().includes(q));
            return nameMatch || descMatch || tagMatch;
        });
    }
}
exports.VoiceStorageService = VoiceStorageService;
//# sourceMappingURL=storage.js.map