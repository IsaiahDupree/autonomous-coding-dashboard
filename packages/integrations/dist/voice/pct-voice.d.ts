/**
 * VOICE-002: PCT Voice Reference for Video Ads
 *
 * Provides voice selection, ad rendering with voice, and voice preview
 * capabilities specifically for the PCT (Performance Creative Tool) product.
 * Uses native fetch to communicate with the Remotion rendering API.
 */
import { VoiceStorageService } from "./storage";
import { VoiceReference, PCTVoicePreferences, SpeechSynthesisResult } from "./types";
export interface PCTAdRenderInput {
    /** The ad script / copy to render. */
    script: string;
    /** ID of the voice to use for narration. */
    voiceId: string;
    /** Remotion template name. */
    template: string;
    /** Output dimensions (e.g. { width: 1080, height: 1920 }). */
    dimensions: {
        width: number;
        height: number;
    };
}
export interface PCTAdRenderResult {
    jobId: string;
    status: string;
    outputUrl?: string;
}
export declare class PCTVoiceService {
    private readonly voiceStorage;
    private readonly remotionApiUrl;
    constructor(voiceStorage: VoiceStorageService, remotionApiUrl: string);
    /**
     * Select the best-matching voice for a given ad.
     *
     * Applies optional preference filters (gender, tone, language) and returns
     * the first match. Falls back to the first available voice for the org when
     * no preferences match.
     */
    getVoiceForAd(adId: string, preferences?: PCTVoicePreferences): Promise<VoiceReference | null>;
    /**
     * Submit a render request to the Remotion API including voice configuration.
     */
    renderAdWithVoice(adInput: PCTAdRenderInput): Promise<PCTAdRenderResult>;
    /**
     * Generate a short audio preview for a given voice using sample text.
     */
    previewVoice(voiceId: string, sampleText: string): Promise<SpeechSynthesisResult>;
    /**
     * List all voices suitable for PCT ads in the given organisation.
     * Filters to voices tagged with "pct" or "ad" when such voices exist,
     * otherwise returns all org voices.
     */
    listAvailableVoices(orgId: string): Promise<VoiceReference[]>;
    /**
     * Derive the org ID from an ad identifier.
     * Convention: adId is formatted as "org_<orgId>_ad_<adSlug>" or we fall
     * back to the raw adId as the orgId.
     */
    private extractOrgFromAd;
    /**
     * Score a voice against user preferences.
     * Higher score = better match.
     */
    private scoreVoice;
}
//# sourceMappingURL=pct-voice.d.ts.map