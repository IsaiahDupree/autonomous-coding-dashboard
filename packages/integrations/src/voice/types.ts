/**
 * Voice integration types and Zod schemas.
 *
 * Shared type definitions for voice reference storage (VOICE-001),
 * PCT voice selection (VOICE-002), and Content Factory voice cloning (VOICE-003).
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Voice Provider
// ---------------------------------------------------------------------------

export const voiceProviderSchema = z.enum(["elevenlabs", "playht", "custom"]);

export type VoiceProvider = z.infer<typeof voiceProviderSchema>;

// ---------------------------------------------------------------------------
// Voice Settings
// ---------------------------------------------------------------------------

export const voiceSettingsSchema = z.object({
  /** Stability of the voice output (0-1). Higher = more consistent. */
  stability: z.number().min(0).max(1).optional(),
  /** Similarity boost (0-1). Higher = closer to original voice. */
  similarity: z.number().min(0).max(1).optional(),
  /** Style exaggeration (0-1). Higher = more expressive. */
  style: z.number().min(0).max(1).optional(),
  /** Playback speed multiplier. 1.0 = normal speed. */
  speed: z.number().min(0.25).max(4.0).optional(),
});

export type VoiceSettings = z.infer<typeof voiceSettingsSchema>;

// ---------------------------------------------------------------------------
// Voice Reference (VOICE-001)
// ---------------------------------------------------------------------------

export const voiceReferenceSchema = z.object({
  /** Unique identifier for the voice reference. */
  id: z.string().min(1),
  /** Human-readable name. */
  name: z.string().min(1),
  /** Optional description of the voice characteristics. */
  description: z.string().optional(),
  /** URL to a sample audio clip of this voice. */
  sampleUrl: z.string().url(),
  /** Voice synthesis provider. */
  provider: voiceProviderSchema,
  /** Provider-specific voice identifier. */
  providerId: z.string().optional(),
  /** Voice generation settings. */
  settings: voiceSettingsSchema,
  /** Searchable tags (e.g. ["male", "deep", "narration"]). */
  tags: z.array(z.string()),
  /** User or system that created this voice reference. */
  createdBy: z.string().min(1),
  /** Organisation that owns this voice reference. */
  orgId: z.string().min(1),
  /** ISO-8601 creation timestamp. */
  createdAt: z.string().datetime(),
});

export type VoiceReference = z.infer<typeof voiceReferenceSchema>;

// ---------------------------------------------------------------------------
// Voice Clone Request (VOICE-003)
// ---------------------------------------------------------------------------

export const voiceCloneRequestSchema = z.object({
  /** Name for the cloned voice. */
  name: z.string().min(1),
  /** URLs to audio samples used for cloning (at least one required). */
  sampleUrls: z.array(z.string().url()).min(1),
  /** Optional description. */
  description: z.string().optional(),
  /** Optional settings overrides. */
  settings: voiceSettingsSchema.optional(),
});

export type VoiceCloneRequest = z.infer<typeof voiceCloneRequestSchema>;

// ---------------------------------------------------------------------------
// Voice Clone Result (VOICE-003)
// ---------------------------------------------------------------------------

export const voiceCloneResultSchema = z.object({
  /** The ID of the newly cloned voice. */
  voiceId: z.string().min(1),
  /** Name given to the cloned voice. */
  name: z.string().min(1),
  /** Provider used for cloning. */
  provider: voiceProviderSchema,
  /** Provider-specific identifier for the cloned voice. */
  providerId: z.string(),
  /** URL to a short preview of the cloned voice. */
  previewUrl: z.string().url().optional(),
});

export type VoiceCloneResult = z.infer<typeof voiceCloneResultSchema>;

// ---------------------------------------------------------------------------
// Speech Synthesis Request (VOICE-003)
// ---------------------------------------------------------------------------

export const outputFormatSchema = z.enum(["mp3", "wav", "ogg"]);

export type OutputFormat = z.infer<typeof outputFormatSchema>;

export const speechSynthesisRequestSchema = z.object({
  /** The text to synthesize into speech. */
  text: z.string().min(1),
  /** ID of the voice to use. */
  voiceId: z.string().min(1),
  /** Desired audio output format. */
  outputFormat: outputFormatSchema,
  /** Playback speed override. */
  speed: z.number().min(0.25).max(4.0).optional(),
  /** Stability override. */
  stability: z.number().min(0).max(1).optional(),
  /** Similarity override. */
  similarity: z.number().min(0).max(1).optional(),
});

export type SpeechSynthesisRequest = z.infer<typeof speechSynthesisRequestSchema>;

// ---------------------------------------------------------------------------
// Speech Synthesis Result (VOICE-003)
// ---------------------------------------------------------------------------

export const speechSynthesisResultSchema = z.object({
  /** URL to the generated audio file. */
  audioUrl: z.string().url(),
  /** Duration of the generated audio in milliseconds. */
  durationMs: z.number().int().nonnegative(),
  /** Format of the generated audio. */
  format: outputFormatSchema,
  /** Size of the generated audio in bytes. */
  sizeBytes: z.number().int().nonnegative(),
});

export type SpeechSynthesisResult = z.infer<typeof speechSynthesisResultSchema>;

// ---------------------------------------------------------------------------
// Voice Persistence Interface (pluggable backend for VoiceStorageService)
// ---------------------------------------------------------------------------

export interface VoicePersistence {
  get(key: string): Promise<VoiceReference | null>;
  set(key: string, value: VoiceReference): Promise<void>;
  delete(key: string): Promise<void>;
  list(): Promise<VoiceReference[]>;
}

// ---------------------------------------------------------------------------
// Voice List Filters
// ---------------------------------------------------------------------------

export const voiceListFiltersSchema = z.object({
  tags: z.array(z.string()).optional(),
  provider: voiceProviderSchema.optional(),
  createdBy: z.string().optional(),
});

export type VoiceListFilters = z.infer<typeof voiceListFiltersSchema>;

// ---------------------------------------------------------------------------
// PCT Voice Preferences
// ---------------------------------------------------------------------------

export const pctVoicePreferencesSchema = z.object({
  gender: z.enum(["male", "female", "neutral"]).optional(),
  tone: z.string().optional(),
  language: z.string().optional(),
});

export type PCTVoicePreferences = z.infer<typeof pctVoicePreferencesSchema>;
