/**
 * VOICE-003: Content Factory Voice Cloning for Scripts
 *
 * Provides voice cloning from audio samples and text-to-speech synthesis
 * for the Content Factory product. Uses native fetch for communication
 * with the voice cloning provider API.
 */
import { VoiceStorageService } from "./storage";
import { VoiceReference, VoiceCloneRequest, VoiceCloneResult, SpeechSynthesisRequest, SpeechSynthesisResult } from "./types";
export declare class ContentFactoryVoiceService {
    private readonly voiceStorage;
    private readonly cloneApiUrl;
    private readonly apiKey;
    constructor(voiceStorage: VoiceStorageService, cloneApiUrl: string, apiKey: string);
    /**
     * Clone a voice from one or more audio sample URLs.
     * Sends the samples to the voice cloning provider and stores the
     * resulting voice reference in the shared storage.
     */
    cloneVoice(input: VoiceCloneRequest): Promise<VoiceCloneResult>;
    /**
     * Synthesize speech from text using a previously stored or cloned voice.
     */
    synthesizeSpeech(input: SpeechSynthesisRequest): Promise<SpeechSynthesisResult>;
    /**
     * Clone a voice and associate it with a specific content item.
     * Stores the result in the voice storage with the content ID as a tag.
     *
     * @param contentId - The Content Factory content identifier.
     * @param sampleUrls - Audio sample URLs to clone from.
     */
    cloneFromContent(contentId: string, sampleUrls: string[]): Promise<VoiceCloneResult>;
    /**
     * List all voices that were cloned by users in the given organisation.
     * Filters to voices tagged with "cloned".
     */
    listClonedVoices(orgId: string): Promise<VoiceReference[]>;
    /**
     * Delete a cloned voice from both the provider and shared storage.
     */
    deleteClonedVoice(voiceId: string): Promise<void>;
    /**
     * Derive the org ID from a content identifier.
     * Convention: contentId is formatted as "org_<orgId>_content_<slug>"
     * or we fall back to a default org.
     */
    private extractOrgFromContent;
}
//# sourceMappingURL=cf-voice.d.ts.map