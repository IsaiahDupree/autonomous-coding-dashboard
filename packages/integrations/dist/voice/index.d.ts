/**
 * Voice integration modules barrel export.
 *
 * Re-exports all public types, schemas, and services for:
 *   - VOICE-001: Shared voice reference storage
 *   - VOICE-002: PCT voice reference for video ads
 *   - VOICE-003: Content Factory voice cloning for scripts
 */
export { voiceProviderSchema, voiceSettingsSchema, voiceReferenceSchema, voiceCloneRequestSchema, voiceCloneResultSchema, outputFormatSchema, speechSynthesisRequestSchema, speechSynthesisResultSchema, voiceListFiltersSchema, pctVoicePreferencesSchema, } from "./types";
export type { VoiceProvider, VoiceSettings, VoiceReference, VoiceCloneRequest, VoiceCloneResult, OutputFormat, SpeechSynthesisRequest, SpeechSynthesisResult, VoicePersistence, VoiceListFilters, PCTVoicePreferences, } from "./types";
export { VoiceStorageService } from "./storage";
export type { VoiceStorageOptions } from "./storage";
export { PCTVoiceService } from "./pct-voice";
export type { PCTAdRenderInput, PCTAdRenderResult } from "./pct-voice";
export { ContentFactoryVoiceService } from "./cf-voice";
//# sourceMappingURL=index.d.ts.map