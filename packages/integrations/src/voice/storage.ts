/**
 * VOICE-001: Shared Voice Reference Storage
 *
 * Provides an in-memory voice reference store with a pluggable persistence
 * interface so the backing storage can be swapped (e.g. database, file-system,
 * cloud KV) without changing calling code.
 */

import {
  VoiceReference,
  VoicePersistence,
  VoiceListFilters,
  voiceReferenceSchema,
} from "./types";

// ---------------------------------------------------------------------------
// Default in-memory persistence implementation
// ---------------------------------------------------------------------------

class InMemoryVoicePersistence implements VoicePersistence {
  private store = new Map<string, VoiceReference>();

  async get(key: string): Promise<VoiceReference | null> {
    return this.store.get(key) ?? null;
  }

  async set(key: string, value: VoiceReference): Promise<void> {
    this.store.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async list(): Promise<VoiceReference[]> {
    return Array.from(this.store.values());
  }
}

// ---------------------------------------------------------------------------
// VoiceStorageService
// ---------------------------------------------------------------------------

export interface VoiceStorageOptions {
  /** Optional URL for a remote persistence backend. */
  storageUrl?: string;
  /** Optional API key for the remote persistence backend. */
  apiKey?: string;
  /** Optionally inject a custom persistence implementation. */
  persistence?: VoicePersistence;
}

export class VoiceStorageService {
  private readonly persistence: VoicePersistence;
  readonly storageUrl: string | undefined;
  readonly apiKey: string | undefined;

  constructor(options: VoiceStorageOptions = {}) {
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
  async storeVoice(voice: VoiceReference): Promise<VoiceReference> {
    const validated = voiceReferenceSchema.parse(voice);
    await this.persistence.set(validated.id, validated);
    return validated;
  }

  /**
   * Retrieve a single voice reference by its ID.
   * Returns `null` when no matching record exists.
   */
  async getVoice(voiceId: string): Promise<VoiceReference | null> {
    return this.persistence.get(voiceId);
  }

  /**
   * List all voice references belonging to an organisation, optionally
   * filtered by tags, provider, or creator.
   */
  async listVoices(
    orgId: string,
    filters?: VoiceListFilters,
  ): Promise<VoiceReference[]> {
    const all = await this.persistence.list();

    return all.filter((v) => {
      if (v.orgId !== orgId) return false;

      if (filters?.provider && v.provider !== filters.provider) return false;

      if (filters?.createdBy && v.createdBy !== filters.createdBy) return false;

      if (filters?.tags && filters.tags.length > 0) {
        const hasAllTags = filters.tags.every((t) => v.tags.includes(t));
        if (!hasAllTags) return false;
      }

      return true;
    });
  }

  /**
   * Delete a voice reference by its ID.
   * No-op when the voice does not exist.
   */
  async deleteVoice(voiceId: string): Promise<void> {
    await this.persistence.delete(voiceId);
  }

  /**
   * Partially update a voice reference.
   * Merges the updates into the existing record and re-validates.
   *
   * @throws Error if no voice with the given ID exists.
   */
  async updateVoice(
    voiceId: string,
    updates: Partial<VoiceReference>,
  ): Promise<VoiceReference> {
    const existing = await this.persistence.get(voiceId);
    if (!existing) {
      throw new Error(`Voice not found: ${voiceId}`);
    }

    const merged = { ...existing, ...updates, id: voiceId };
    const validated = voiceReferenceSchema.parse(merged);
    await this.persistence.set(voiceId, validated);
    return validated;
  }

  /**
   * Full-text search across voice name, description, and tags.
   * Case-insensitive substring matching.
   */
  async searchVoices(
    query: string,
    orgId: string,
  ): Promise<VoiceReference[]> {
    const all = await this.persistence.list();
    const q = query.toLowerCase();

    return all.filter((v) => {
      if (v.orgId !== orgId) return false;

      const nameMatch = v.name.toLowerCase().includes(q);
      const descMatch = v.description?.toLowerCase().includes(q) ?? false;
      const tagMatch = v.tags.some((t) => t.toLowerCase().includes(q));

      return nameMatch || descMatch || tagMatch;
    });
  }
}
