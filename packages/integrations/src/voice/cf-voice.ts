/**
 * VOICE-003: Content Factory Voice Cloning for Scripts
 *
 * Provides voice cloning from audio samples and text-to-speech synthesis
 * for the Content Factory product. Uses native fetch for communication
 * with the voice cloning provider API.
 */

import { VoiceStorageService } from "./storage";
import {
  VoiceReference,
  VoiceCloneRequest,
  VoiceCloneResult,
  SpeechSynthesisRequest,
  SpeechSynthesisResult,
  voiceCloneRequestSchema,
  voiceCloneResultSchema,
  speechSynthesisRequestSchema,
  speechSynthesisResultSchema,
} from "./types";

// ---------------------------------------------------------------------------
// ContentFactoryVoiceService
// ---------------------------------------------------------------------------

export class ContentFactoryVoiceService {
  private readonly voiceStorage: VoiceStorageService;
  private readonly cloneApiUrl: string;
  private readonly apiKey: string;

  constructor(
    voiceStorage: VoiceStorageService,
    cloneApiUrl: string,
    apiKey: string,
  ) {
    this.voiceStorage = voiceStorage;
    this.cloneApiUrl = cloneApiUrl;
    this.apiKey = apiKey;
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Clone a voice from one or more audio sample URLs.
   * Sends the samples to the voice cloning provider and stores the
   * resulting voice reference in the shared storage.
   */
  async cloneVoice(input: VoiceCloneRequest): Promise<VoiceCloneResult> {
    const validated = voiceCloneRequestSchema.parse(input);

    const response = await fetch(`${this.cloneApiUrl}/voices/clone`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        name: validated.name,
        sample_urls: validated.sampleUrls,
        description: validated.description,
        settings: validated.settings,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Voice cloning failed (${response.status}): ${body}`,
      );
    }

    const data: unknown = await response.json();
    const result = voiceCloneResultSchema.parse(data);
    return result;
  }

  /**
   * Synthesize speech from text using a previously stored or cloned voice.
   */
  async synthesizeSpeech(
    input: SpeechSynthesisRequest,
  ): Promise<SpeechSynthesisResult> {
    const validated = speechSynthesisRequestSchema.parse(input);

    const response = await fetch(`${this.cloneApiUrl}/speech/synthesize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        text: validated.text,
        voice_id: validated.voiceId,
        output_format: validated.outputFormat,
        speed: validated.speed,
        stability: validated.stability,
        similarity: validated.similarity,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Speech synthesis failed (${response.status}): ${body}`,
      );
    }

    const data: unknown = await response.json();
    return speechSynthesisResultSchema.parse(data);
  }

  /**
   * Clone a voice and associate it with a specific content item.
   * Stores the result in the voice storage with the content ID as a tag.
   *
   * @param contentId - The Content Factory content identifier.
   * @param sampleUrls - Audio sample URLs to clone from.
   */
  async cloneFromContent(
    contentId: string,
    sampleUrls: string[],
  ): Promise<VoiceCloneResult> {
    const cloneResult = await this.cloneVoice({
      name: `content-${contentId}-voice`,
      sampleUrls,
    });

    // Store the cloned voice reference in shared storage
    const voiceRef: VoiceReference = {
      id: cloneResult.voiceId,
      name: cloneResult.name,
      sampleUrl: sampleUrls[0],
      provider: cloneResult.provider,
      providerId: cloneResult.providerId,
      settings: {},
      tags: ["cloned", "content-factory", `content:${contentId}`],
      createdBy: "content-factory",
      orgId: this.extractOrgFromContent(contentId),
      createdAt: new Date().toISOString(),
    };

    await this.voiceStorage.storeVoice(voiceRef);

    return cloneResult;
  }

  /**
   * List all voices that were cloned by users in the given organisation.
   * Filters to voices tagged with "cloned".
   */
  async listClonedVoices(orgId: string): Promise<VoiceReference[]> {
    return this.voiceStorage.listVoices(orgId, { tags: ["cloned"] });
  }

  /**
   * Delete a cloned voice from both the provider and shared storage.
   */
  async deleteClonedVoice(voiceId: string): Promise<void> {
    const voice = await this.voiceStorage.getVoice(voiceId);

    // If the voice exists and has a provider ID, delete from the provider first
    if (voice?.providerId) {
      const response = await fetch(
        `${this.cloneApiUrl}/voices/${encodeURIComponent(voice.providerId)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      );

      if (!response.ok && response.status !== 404) {
        const body = await response.text();
        throw new Error(
          `Failed to delete voice from provider (${response.status}): ${body}`,
        );
      }
    }

    // Remove from local storage regardless
    await this.voiceStorage.deleteVoice(voiceId);
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  /**
   * Derive the org ID from a content identifier.
   * Convention: contentId is formatted as "org_<orgId>_content_<slug>"
   * or we fall back to a default org.
   */
  private extractOrgFromContent(contentId: string): string {
    const match = contentId.match(/^org_([^_]+)_/);
    return match ? match[1] : "default";
  }
}
