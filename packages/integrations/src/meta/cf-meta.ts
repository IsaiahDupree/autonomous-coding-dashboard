/**
 * ContentFactoryMetaService (MH-003)
 *
 * Integrates Content Factory rendered assets with Meta Ads. Allows publishing
 * CF-rendered content (images/videos) as Meta ad creatives and tracking
 * creative-level performance.
 */

import type {
  WaitlistLabMetaConfig,
  WLApiResponse,
  CreativeUploadResult,
  CreativePerformance,
  TargetingSpec,
} from "./types";

// ---------------------------------------------------------------------------
// Input / output types
// ---------------------------------------------------------------------------

interface AdFromContentResult {
  adId: string;
  creativeId: string;
  campaignId: string;
  status: string;
}

interface ContentStatusSync {
  contentId: string;
  adId: string;
  adStatus: string;
  deliveryStatus: string;
  lastUpdated: string;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * ContentFactoryMetaService connects CF (Content Factory) rendered outputs
 * to Meta advertising. It publishes creative assets, creates ads from content,
 * and tracks creative-level performance.
 *
 * All calls go through WaitlistLab as a Meta API proxy.
 */
export class ContentFactoryMetaService {
  private readonly wlApiUrl: string;
  private readonly wlApiKey: string;
  private readonly adAccountId: string;

  constructor(config: WaitlistLabMetaConfig) {
    this.wlApiUrl = config.wlApiUrl.replace(/\/+$/, "");
    this.wlApiKey = config.wlApiKey;
    this.adAccountId = config.adAccountId;
  }

  /**
   * Upload a rendered Content Factory asset as a Meta ad creative.
   *
   * @param renderedAssetUrl - URL of the rendered image or video from CF.
   * @param adCopy - Primary text for the ad.
   * @param headline - Headline text.
   * @param cta - Call to action (e.g., "LEARN_MORE", "SHOP_NOW").
   */
  async publishCreative(
    renderedAssetUrl: string,
    adCopy: string,
    headline: string,
    cta: string,
  ): Promise<CreativeUploadResult> {
    const body = {
      adAccountId: this.adAccountId,
      assetUrl: renderedAssetUrl,
      primaryText: adCopy,
      headline,
      callToAction: cta,
    };

    const result = await this.request<CreativeUploadResult>(
      "/meta/creatives",
      "POST",
      body,
    );

    return result;
  }

  /**
   * Create a Meta ad directly from Content Factory content.
   *
   * @param contentId - Content Factory content ID.
   * @param campaignId - Target campaign for the ad.
   * @param targeting - Targeting specification for the ad set.
   */
  async createAdFromContent(
    contentId: string,
    campaignId: string,
    targeting: TargetingSpec,
  ): Promise<AdFromContentResult> {
    const body = {
      adAccountId: this.adAccountId,
      contentId,
      campaignId,
      targeting,
    };

    const result = await this.request<AdFromContentResult>(
      "/meta/ads/from-content",
      "POST",
      body,
    );

    return result;
  }

  /**
   * Fetch creative-level performance insights.
   *
   * @param creativeId - Meta creative ID.
   * @param dateRange - Date range for the insights query.
   */
  async getCreativePerformance(
    creativeId: string,
    dateRange: { since: string; until: string },
  ): Promise<CreativePerformance> {
    const params = new URLSearchParams({
      adAccountId: this.adAccountId,
      creativeId,
      since: dateRange.since,
      until: dateRange.until,
    });

    const result = await this.request<CreativePerformance>(
      `/meta/creatives/performance?${params.toString()}`,
      "GET",
    );

    return result;
  }

  /**
   * Sync ad delivery status back to Content Factory.
   * Returns the current status of the ad associated with a CF content item.
   *
   * @param contentId - Content Factory content ID.
   */
  async syncContentStatus(contentId: string): Promise<ContentStatusSync> {
    const params = new URLSearchParams({
      adAccountId: this.adAccountId,
      contentId,
    });

    const result = await this.request<ContentStatusSync>(
      `/meta/content-sync?${params.toString()}`,
      "GET",
    );

    return result;
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  private async request<T>(
    path: string,
    method: "GET" | "POST",
    body?: unknown,
  ): Promise<T> {
    const url = `${this.wlApiUrl}${path}`;
    const headers: Record<string, string> = {
      "Authorization": `Bearer ${this.wlApiKey}`,
      "Content-Type": "application/json",
      "X-Ad-Account-Id": this.adAccountId,
    };

    const init: RequestInit = { method, headers };
    if (body !== undefined && method !== "GET") {
      init.body = JSON.stringify(body);
    }

    const res = await fetch(url, init);

    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `WaitlistLab API error ${res.status}: ${text}`,
      );
    }

    const json = (await res.json()) as WLApiResponse<T>;

    if (!json.success || json.data === undefined) {
      throw new Error(
        `WaitlistLab API failure: ${json.error?.message ?? "Unknown error"}`,
      );
    }

    return json.data;
  }
}
