/**
 * VOICE-001: Shared Voice Reference Storage
 *
 * Provides an in-memory voice reference store with a pluggable persistence
 * interface so the backing storage can be swapped (e.g. database, file-system,
 * cloud KV) without changing calling code.
 */
import { VoiceReference, VoicePersistence, VoiceListFilters } from "./types";
export interface VoiceStorageOptions {
    /** Optional URL for a remote persistence backend. */
    storageUrl?: string;
    /** Optional API key for the remote persistence backend. */
    apiKey?: string;
    /** Optionally inject a custom persistence implementation. */
    persistence?: VoicePersistence;
}
export declare class VoiceStorageService {
    private readonly persistence;
    readonly storageUrl: string | undefined;
    readonly apiKey: string | undefined;
    constructor(options?: VoiceStorageOptions);
    /**
     * Store a new voice reference record.
     * Validates the input against the Zod schema before persisting.
     */
    storeVoice(voice: VoiceReference): Promise<VoiceReference>;
    /**
     * Retrieve a single voice reference by its ID.
     * Returns `null` when no matching record exists.
     */
    getVoice(voiceId: string): Promise<VoiceReference | null>;
    /**
     * List all voice references belonging to an organisation, optionally
     * filtered by tags, provider, or creator.
     */
    listVoices(orgId: string, filters?: VoiceListFilters): Promise<VoiceReference[]>;
    /**
     * Delete a voice reference by its ID.
     * No-op when the voice does not exist.
     */
    deleteVoice(voiceId: string): Promise<void>;
    /**
     * Partially update a voice reference.
     * Merges the updates into the existing record and re-validates.
     *
     * @throws Error if no voice with the given ID exists.
     */
    updateVoice(voiceId: string, updates: Partial<VoiceReference>): Promise<VoiceReference>;
    /**
     * Full-text search across voice name, description, and tags.
     * Case-insensitive substring matching.
     */
    searchVoices(query: string, orgId: string): Promise<VoiceReference[]>;
}
//# sourceMappingURL=storage.d.ts.map