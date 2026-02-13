"use strict";
/**
 * Voice integration types and Zod schemas.
 *
 * Shared type definitions for voice reference storage (VOICE-001),
 * PCT voice selection (VOICE-002), and Content Factory voice cloning (VOICE-003).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.pctVoicePreferencesSchema = exports.voiceListFiltersSchema = exports.speechSynthesisResultSchema = exports.speechSynthesisRequestSchema = exports.outputFormatSchema = exports.voiceCloneResultSchema = exports.voiceCloneRequestSchema = exports.voiceReferenceSchema = exports.voiceSettingsSchema = exports.voiceProviderSchema = void 0;
const zod_1 = require("zod");
// ---------------------------------------------------------------------------
// Voice Provider
// ---------------------------------------------------------------------------
exports.voiceProviderSchema = zod_1.z.enum(["elevenlabs", "playht", "custom"]);
// ---------------------------------------------------------------------------
// Voice Settings
// ---------------------------------------------------------------------------
exports.voiceSettingsSchema = zod_1.z.object({
    /** Stability of the voice output (0-1). Higher = more consistent. */
    stability: zod_1.z.number().min(0).max(1).optional(),
    /** Similarity boost (0-1). Higher = closer to original voice. */
    similarity: zod_1.z.number().min(0).max(1).optional(),
    /** Style exaggeration (0-1). Higher = more expressive. */
    style: zod_1.z.number().min(0).max(1).optional(),
    /** Playback speed multiplier. 1.0 = normal speed. */
    speed: zod_1.z.number().min(0.25).max(4.0).optional(),
});
// ---------------------------------------------------------------------------
// Voice Reference (VOICE-001)
// ---------------------------------------------------------------------------
exports.voiceReferenceSchema = zod_1.z.object({
    /** Unique identifier for the voice reference. */
    id: zod_1.z.string().min(1),
    /** Human-readable name. */
    name: zod_1.z.string().min(1),
    /** Optional description of the voice characteristics. */
    description: zod_1.z.string().optional(),
    /** URL to a sample audio clip of this voice. */
    sampleUrl: zod_1.z.string().url(),
    /** Voice synthesis provider. */
    provider: exports.voiceProviderSchema,
    /** Provider-specific voice identifier. */
    providerId: zod_1.z.string().optional(),
    /** Voice generation settings. */
    settings: exports.voiceSettingsSchema,
    /** Searchable tags (e.g. ["male", "deep", "narration"]). */
    tags: zod_1.z.array(zod_1.z.string()),
    /** User or system that created this voice reference. */
    createdBy: zod_1.z.string().min(1),
    /** Organisation that owns this voice reference. */
    orgId: zod_1.z.string().min(1),
    /** ISO-8601 creation timestamp. */
    createdAt: zod_1.z.string().datetime(),
});
// ---------------------------------------------------------------------------
// Voice Clone Request (VOICE-003)
// ---------------------------------------------------------------------------
exports.voiceCloneRequestSchema = zod_1.z.object({
    /** Name for the cloned voice. */
    name: zod_1.z.string().min(1),
    /** URLs to audio samples used for cloning (at least one required). */
    sampleUrls: zod_1.z.array(zod_1.z.string().url()).min(1),
    /** Optional description. */
    description: zod_1.z.string().optional(),
    /** Optional settings overrides. */
    settings: exports.voiceSettingsSchema.optional(),
});
// ---------------------------------------------------------------------------
// Voice Clone Result (VOICE-003)
// ---------------------------------------------------------------------------
exports.voiceCloneResultSchema = zod_1.z.object({
    /** The ID of the newly cloned voice. */
    voiceId: zod_1.z.string().min(1),
    /** Name given to the cloned voice. */
    name: zod_1.z.string().min(1),
    /** Provider used for cloning. */
    provider: exports.voiceProviderSchema,
    /** Provider-specific identifier for the cloned voice. */
    providerId: zod_1.z.string(),
    /** URL to a short preview of the cloned voice. */
    previewUrl: zod_1.z.string().url().optional(),
});
// ---------------------------------------------------------------------------
// Speech Synthesis Request (VOICE-003)
// ---------------------------------------------------------------------------
exports.outputFormatSchema = zod_1.z.enum(["mp3", "wav", "ogg"]);
exports.speechSynthesisRequestSchema = zod_1.z.object({
    /** The text to synthesize into speech. */
    text: zod_1.z.string().min(1),
    /** ID of the voice to use. */
    voiceId: zod_1.z.string().min(1),
    /** Desired audio output format. */
    outputFormat: exports.outputFormatSchema,
    /** Playback speed override. */
    speed: zod_1.z.number().min(0.25).max(4.0).optional(),
    /** Stability override. */
    stability: zod_1.z.number().min(0).max(1).optional(),
    /** Similarity override. */
    similarity: zod_1.z.number().min(0).max(1).optional(),
});
// ---------------------------------------------------------------------------
// Speech Synthesis Result (VOICE-003)
// ---------------------------------------------------------------------------
exports.speechSynthesisResultSchema = zod_1.z.object({
    /** URL to the generated audio file. */
    audioUrl: zod_1.z.string().url(),
    /** Duration of the generated audio in milliseconds. */
    durationMs: zod_1.z.number().int().nonnegative(),
    /** Format of the generated audio. */
    format: exports.outputFormatSchema,
    /** Size of the generated audio in bytes. */
    sizeBytes: zod_1.z.number().int().nonnegative(),
});
// ---------------------------------------------------------------------------
// Voice List Filters
// ---------------------------------------------------------------------------
exports.voiceListFiltersSchema = zod_1.z.object({
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    provider: exports.voiceProviderSchema.optional(),
    createdBy: zod_1.z.string().optional(),
});
// ---------------------------------------------------------------------------
// PCT Voice Preferences
// ---------------------------------------------------------------------------
exports.pctVoicePreferencesSchema = zod_1.z.object({
    gender: zod_1.z.enum(["male", "female", "neutral"]).optional(),
    tone: zod_1.z.string().optional(),
    language: zod_1.z.string().optional(),
});
//# sourceMappingURL=types.js.map