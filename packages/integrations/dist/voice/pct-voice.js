"use strict";
/**
 * VOICE-002: PCT Voice Reference for Video Ads
 *
 * Provides voice selection, ad rendering with voice, and voice preview
 * capabilities specifically for the PCT (Performance Creative Tool) product.
 * Uses native fetch to communicate with the Remotion rendering API.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PCTVoiceService = void 0;
const types_1 = require("./types");
// ---------------------------------------------------------------------------
// PCTVoiceService
// ---------------------------------------------------------------------------
class PCTVoiceService {
    constructor(voiceStorage, remotionApiUrl) {
        this.voiceStorage = voiceStorage;
        this.remotionApiUrl = remotionApiUrl;
    }
    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------
    /**
     * Select the best-matching voice for a given ad.
     *
     * Applies optional preference filters (gender, tone, language) and returns
     * the first match. Falls back to the first available voice for the org when
     * no preferences match.
     */
    async getVoiceForAd(adId, preferences) {
        // Use adId to derive an orgId lookup -- in a real implementation this
        // would resolve the ad's owning org. For now we search across all stored
        // voices by extracting orgId from the ad context.
        const allVoices = await this.voiceStorage.listVoices(this.extractOrgFromAd(adId));
        if (allVoices.length === 0)
            return null;
        if (!preferences)
            return allVoices[0];
        const scored = allVoices
            .map((voice) => ({ voice, score: this.scoreVoice(voice, preferences) }))
            .sort((a, b) => b.score - a.score);
        return scored[0].voice;
    }
    /**
     * Submit a render request to the Remotion API including voice configuration.
     */
    async renderAdWithVoice(adInput) {
        const voice = await this.voiceStorage.getVoice(adInput.voiceId);
        if (!voice) {
            throw new Error(`Voice not found: ${adInput.voiceId}`);
        }
        const response = await fetch(`${this.remotionApiUrl}/render`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                template: adInput.template,
                props: {
                    script: adInput.script,
                    voice: {
                        id: voice.id,
                        provider: voice.provider,
                        providerId: voice.providerId,
                        settings: voice.settings,
                    },
                    dimensions: adInput.dimensions,
                },
            }),
        });
        if (!response.ok) {
            const body = await response.text();
            throw new Error(`Remotion render failed (${response.status}): ${body}`);
        }
        const result = (await response.json());
        return result;
    }
    /**
     * Generate a short audio preview for a given voice using sample text.
     */
    async previewVoice(voiceId, sampleText) {
        const voice = await this.voiceStorage.getVoice(voiceId);
        if (!voice) {
            throw new Error(`Voice not found: ${voiceId}`);
        }
        const response = await fetch(`${this.remotionApiUrl}/synthesize`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                text: sampleText,
                voiceId: voice.providerId ?? voice.id,
                provider: voice.provider,
                outputFormat: "mp3",
                speed: voice.settings.speed,
                stability: voice.settings.stability,
                similarity: voice.settings.similarity,
            }),
        });
        if (!response.ok) {
            const body = await response.text();
            throw new Error(`Voice preview failed (${response.status}): ${body}`);
        }
        const data = await response.json();
        return types_1.speechSynthesisResultSchema.parse(data);
    }
    /**
     * List all voices suitable for PCT ads in the given organisation.
     * Filters to voices tagged with "pct" or "ad" when such voices exist,
     * otherwise returns all org voices.
     */
    async listAvailableVoices(orgId) {
        const all = await this.voiceStorage.listVoices(orgId);
        const pctVoices = all.filter((v) => v.tags.includes("pct") || v.tags.includes("ad"));
        return pctVoices.length > 0 ? pctVoices : all;
    }
    // -----------------------------------------------------------------------
    // Private helpers
    // -----------------------------------------------------------------------
    /**
     * Derive the org ID from an ad identifier.
     * Convention: adId is formatted as "org_<orgId>_ad_<adSlug>" or we fall
     * back to the raw adId as the orgId.
     */
    extractOrgFromAd(adId) {
        const match = adId.match(/^org_([^_]+)_/);
        return match ? match[1] : adId;
    }
    /**
     * Score a voice against user preferences.
     * Higher score = better match.
     */
    scoreVoice(voice, prefs) {
        let score = 0;
        if (prefs.gender) {
            const genderTag = prefs.gender.toLowerCase();
            if (voice.tags.some((t) => t.toLowerCase() === genderTag)) {
                score += 3;
            }
        }
        if (prefs.tone) {
            const tone = prefs.tone.toLowerCase();
            if (voice.tags.some((t) => t.toLowerCase() === tone)) {
                score += 2;
            }
            if (voice.description?.toLowerCase().includes(tone)) {
                score += 1;
            }
        }
        if (prefs.language) {
            const lang = prefs.language.toLowerCase();
            if (voice.tags.some((t) => t.toLowerCase() === lang)) {
                score += 2;
            }
        }
        return score;
    }
}
exports.PCTVoiceService = PCTVoiceService;
//# sourceMappingURL=pct-voice.js.map