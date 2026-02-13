/**
 * Voice integration types and Zod schemas.
 *
 * Shared type definitions for voice reference storage (VOICE-001),
 * PCT voice selection (VOICE-002), and Content Factory voice cloning (VOICE-003).
 */
import { z } from "zod";
export declare const voiceProviderSchema: z.ZodEnum<["elevenlabs", "playht", "custom"]>;
export type VoiceProvider = z.infer<typeof voiceProviderSchema>;
export declare const voiceSettingsSchema: z.ZodObject<{
    /** Stability of the voice output (0-1). Higher = more consistent. */
    stability: z.ZodOptional<z.ZodNumber>;
    /** Similarity boost (0-1). Higher = closer to original voice. */
    similarity: z.ZodOptional<z.ZodNumber>;
    /** Style exaggeration (0-1). Higher = more expressive. */
    style: z.ZodOptional<z.ZodNumber>;
    /** Playback speed multiplier. 1.0 = normal speed. */
    speed: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    style?: number | undefined;
    stability?: number | undefined;
    similarity?: number | undefined;
    speed?: number | undefined;
}, {
    style?: number | undefined;
    stability?: number | undefined;
    similarity?: number | undefined;
    speed?: number | undefined;
}>;
export type VoiceSettings = z.infer<typeof voiceSettingsSchema>;
export declare const voiceReferenceSchema: z.ZodObject<{
    /** Unique identifier for the voice reference. */
    id: z.ZodString;
    /** Human-readable name. */
    name: z.ZodString;
    /** Optional description of the voice characteristics. */
    description: z.ZodOptional<z.ZodString>;
    /** URL to a sample audio clip of this voice. */
    sampleUrl: z.ZodString;
    /** Voice synthesis provider. */
    provider: z.ZodEnum<["elevenlabs", "playht", "custom"]>;
    /** Provider-specific voice identifier. */
    providerId: z.ZodOptional<z.ZodString>;
    /** Voice generation settings. */
    settings: z.ZodObject<{
        /** Stability of the voice output (0-1). Higher = more consistent. */
        stability: z.ZodOptional<z.ZodNumber>;
        /** Similarity boost (0-1). Higher = closer to original voice. */
        similarity: z.ZodOptional<z.ZodNumber>;
        /** Style exaggeration (0-1). Higher = more expressive. */
        style: z.ZodOptional<z.ZodNumber>;
        /** Playback speed multiplier. 1.0 = normal speed. */
        speed: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        style?: number | undefined;
        stability?: number | undefined;
        similarity?: number | undefined;
        speed?: number | undefined;
    }, {
        style?: number | undefined;
        stability?: number | undefined;
        similarity?: number | undefined;
        speed?: number | undefined;
    }>;
    /** Searchable tags (e.g. ["male", "deep", "narration"]). */
    tags: z.ZodArray<z.ZodString, "many">;
    /** User or system that created this voice reference. */
    createdBy: z.ZodString;
    /** Organisation that owns this voice reference. */
    orgId: z.ZodString;
    /** ISO-8601 creation timestamp. */
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    sampleUrl: string;
    provider: "custom" | "elevenlabs" | "playht";
    settings: {
        style?: number | undefined;
        stability?: number | undefined;
        similarity?: number | undefined;
        speed?: number | undefined;
    };
    tags: string[];
    createdBy: string;
    orgId: string;
    createdAt: string;
    description?: string | undefined;
    providerId?: string | undefined;
}, {
    id: string;
    name: string;
    sampleUrl: string;
    provider: "custom" | "elevenlabs" | "playht";
    settings: {
        style?: number | undefined;
        stability?: number | undefined;
        similarity?: number | undefined;
        speed?: number | undefined;
    };
    tags: string[];
    createdBy: string;
    orgId: string;
    createdAt: string;
    description?: string | undefined;
    providerId?: string | undefined;
}>;
export type VoiceReference = z.infer<typeof voiceReferenceSchema>;
export declare const voiceCloneRequestSchema: z.ZodObject<{
    /** Name for the cloned voice. */
    name: z.ZodString;
    /** URLs to audio samples used for cloning (at least one required). */
    sampleUrls: z.ZodArray<z.ZodString, "many">;
    /** Optional description. */
    description: z.ZodOptional<z.ZodString>;
    /** Optional settings overrides. */
    settings: z.ZodOptional<z.ZodObject<{
        /** Stability of the voice output (0-1). Higher = more consistent. */
        stability: z.ZodOptional<z.ZodNumber>;
        /** Similarity boost (0-1). Higher = closer to original voice. */
        similarity: z.ZodOptional<z.ZodNumber>;
        /** Style exaggeration (0-1). Higher = more expressive. */
        style: z.ZodOptional<z.ZodNumber>;
        /** Playback speed multiplier. 1.0 = normal speed. */
        speed: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        style?: number | undefined;
        stability?: number | undefined;
        similarity?: number | undefined;
        speed?: number | undefined;
    }, {
        style?: number | undefined;
        stability?: number | undefined;
        similarity?: number | undefined;
        speed?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    sampleUrls: string[];
    description?: string | undefined;
    settings?: {
        style?: number | undefined;
        stability?: number | undefined;
        similarity?: number | undefined;
        speed?: number | undefined;
    } | undefined;
}, {
    name: string;
    sampleUrls: string[];
    description?: string | undefined;
    settings?: {
        style?: number | undefined;
        stability?: number | undefined;
        similarity?: number | undefined;
        speed?: number | undefined;
    } | undefined;
}>;
export type VoiceCloneRequest = z.infer<typeof voiceCloneRequestSchema>;
export declare const voiceCloneResultSchema: z.ZodObject<{
    /** The ID of the newly cloned voice. */
    voiceId: z.ZodString;
    /** Name given to the cloned voice. */
    name: z.ZodString;
    /** Provider used for cloning. */
    provider: z.ZodEnum<["elevenlabs", "playht", "custom"]>;
    /** Provider-specific identifier for the cloned voice. */
    providerId: z.ZodString;
    /** URL to a short preview of the cloned voice. */
    previewUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    voiceId: string;
    name: string;
    provider: "custom" | "elevenlabs" | "playht";
    providerId: string;
    previewUrl?: string | undefined;
}, {
    voiceId: string;
    name: string;
    provider: "custom" | "elevenlabs" | "playht";
    providerId: string;
    previewUrl?: string | undefined;
}>;
export type VoiceCloneResult = z.infer<typeof voiceCloneResultSchema>;
export declare const outputFormatSchema: z.ZodEnum<["mp3", "wav", "ogg"]>;
export type OutputFormat = z.infer<typeof outputFormatSchema>;
export declare const speechSynthesisRequestSchema: z.ZodObject<{
    /** The text to synthesize into speech. */
    text: z.ZodString;
    /** ID of the voice to use. */
    voiceId: z.ZodString;
    /** Desired audio output format. */
    outputFormat: z.ZodEnum<["mp3", "wav", "ogg"]>;
    /** Playback speed override. */
    speed: z.ZodOptional<z.ZodNumber>;
    /** Stability override. */
    stability: z.ZodOptional<z.ZodNumber>;
    /** Similarity override. */
    similarity: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    voiceId: string;
    text: string;
    outputFormat: "mp3" | "wav" | "ogg";
    stability?: number | undefined;
    similarity?: number | undefined;
    speed?: number | undefined;
}, {
    voiceId: string;
    text: string;
    outputFormat: "mp3" | "wav" | "ogg";
    stability?: number | undefined;
    similarity?: number | undefined;
    speed?: number | undefined;
}>;
export type SpeechSynthesisRequest = z.infer<typeof speechSynthesisRequestSchema>;
export declare const speechSynthesisResultSchema: z.ZodObject<{
    /** URL to the generated audio file. */
    audioUrl: z.ZodString;
    /** Duration of the generated audio in milliseconds. */
    durationMs: z.ZodNumber;
    /** Format of the generated audio. */
    format: z.ZodEnum<["mp3", "wav", "ogg"]>;
    /** Size of the generated audio in bytes. */
    sizeBytes: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    format: "mp3" | "wav" | "ogg";
    audioUrl: string;
    durationMs: number;
    sizeBytes: number;
}, {
    format: "mp3" | "wav" | "ogg";
    audioUrl: string;
    durationMs: number;
    sizeBytes: number;
}>;
export type SpeechSynthesisResult = z.infer<typeof speechSynthesisResultSchema>;
export interface VoicePersistence {
    get(key: string): Promise<VoiceReference | null>;
    set(key: string, value: VoiceReference): Promise<void>;
    delete(key: string): Promise<void>;
    list(): Promise<VoiceReference[]>;
}
export declare const voiceListFiltersSchema: z.ZodObject<{
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    provider: z.ZodOptional<z.ZodEnum<["elevenlabs", "playht", "custom"]>>;
    createdBy: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    provider?: "custom" | "elevenlabs" | "playht" | undefined;
    tags?: string[] | undefined;
    createdBy?: string | undefined;
}, {
    provider?: "custom" | "elevenlabs" | "playht" | undefined;
    tags?: string[] | undefined;
    createdBy?: string | undefined;
}>;
export type VoiceListFilters = z.infer<typeof voiceListFiltersSchema>;
export declare const pctVoicePreferencesSchema: z.ZodObject<{
    gender: z.ZodOptional<z.ZodEnum<["male", "female", "neutral"]>>;
    tone: z.ZodOptional<z.ZodString>;
    language: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    gender?: "male" | "female" | "neutral" | undefined;
    tone?: string | undefined;
    language?: string | undefined;
}, {
    gender?: "male" | "female" | "neutral" | undefined;
    tone?: string | undefined;
    language?: string | undefined;
}>;
export type PCTVoicePreferences = z.infer<typeof pctVoicePreferencesSchema>;
//# sourceMappingURL=types.d.ts.map