/**
 * PCTMetaService (MH-002)
 *
 * PCT (Product Campaign Tool) integration with Meta Marketing API via WaitlistLab.
 * All Meta API calls are proxied through WaitlistLab's API rather than hitting
 * the Meta Graph API directly.
 */

import type {
  WaitlistLabMetaConfig,
  WLApiResponse,
  CampaignObjective,
  TargetingSpec,
  InsightLevel,
} from "./types";

// ---------------------------------------------------------------------------
// Input / output interfaces
// ---------------------------------------------------------------------------

export interface PCTCampaignInput {
  name: string;
  objective: CampaignObjective;
  dailyBudget: number;
  targetAudience?: TargetingSpec;
}

export interface PCTAdSetInput {
  name: string;
  targeting: TargetingSpec;
  optimizationGoal: string;
  billingEvent: string;
  dailyBudget: number;
  startTime: string;
  endTime?: string;
}

export interface PCTCreativeInput {
  name: string;
  imageUrl?: string;
  videoUrl?: string;
  primaryText: string;
  headline: string;
  callToAction: string;
  linkUrl: string;
}

export interface PCTInsightResult {
  entityId: string;
  level: InsightLevel;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  ctr: number;
  cpc: number;
  dateRange: { since: string; until: string };
}

interface MetaCampaignResponse {
  id: string;
  name: string;
  status: string;
  objective: string;
}

interface MetaAdSetResponse {
  id: string;
  name: string;
  campaignId: string;
  status: string;
}

interface MetaAdResponse {
  id: string;
  name: string;
  adSetId: string;
  creativeId: string;
  status: string;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * PCTMetaService provides PCT with Meta campaign management through WaitlistLab.
 *
 * All calls route through WaitlistLab as a Meta API proxy. The WaitlistLab API
 * handles token management, rate limiting, and credential storage.
 */
export class PCTMetaService {
  private readonly wlApiUrl: string;
  private readonly wlApiKey: string;
  private readonly adAccountId: string;

  constructor(config: WaitlistLabMetaConfig) {
    this.wlApiUrl = config.wlApiUrl.replace(/\/+$/, "");
    this.wlApiKey = config.wlApiKey;
    this.adAccountId = config.adAccountId;
  }

  // -------------------------------------------------------------------------
  // Campaign management
  // -------------------------------------------------------------------------

  /**
   * Create a new Meta campaign via WaitlistLab proxy.
   */
  async createCampaign(input: PCTCampaignInput): Promise<MetaCampaignResponse> {
    const body = {
      adAccountId: this.adAccountId,
      name: input.name,
      objective: input.objective,
      status: "PAUSED",
      dailyBudgetCents: Math.round(input.dailyBudget * 100),
      targeting: input.targetAudience ?? null,
    };

    const response = await this.request<MetaCampaignResponse>(
      "/meta/campaigns",
      "POST",
      body,
    );

    return response;
  }

  /**
   * Create an ad set within a campaign.
   */
  async createAdSet(
    campaignId: string,
    input: PCTAdSetInput,
  ): Promise<MetaAdSetResponse> {
    const body = {
      adAccountId: this.adAccountId,
      campaignId,
      name: input.name,
      targeting: input.targeting,
      optimizationGoal: input.optimizationGoal,
      billingEvent: input.billingEvent,
      dailyBudgetCents: Math.round(input.dailyBudget * 100),
      startTime: input.startTime,
      endTime: input.endTime ?? null,
    };

    const response = await this.request<MetaAdSetResponse>(
      "/meta/adsets",
      "POST",
      body,
    );

    return response;
  }

  /**
   * Create an ad with creative within an ad set.
   */
  async createAd(
    adSetId: string,
    creativeInput: PCTCreativeInput,
  ): Promise<MetaAdResponse> {
    const body = {
      adAccountId: this.adAccountId,
      adSetId,
      name: creativeInput.name,
      creative: {
        primaryText: creativeInput.primaryText,
        headline: creativeInput.headline,
        callToAction: creativeInput.callToAction,
        linkUrl: creativeInput.linkUrl,
        imageUrl: creativeInput.imageUrl ?? null,
        videoUrl: creativeInput.videoUrl ?? null,
      },
      status: "PAUSED",
    };

    const response = await this.request<MetaAdResponse>(
      "/meta/ads",
      "POST",
      body,
    );

    return response;
  }

  // -------------------------------------------------------------------------
  // Insights
  // -------------------------------------------------------------------------

  /**
   * Fetch performance insights for a campaign, ad set, or ad.
   */
  async getInsights(
    entityId: string,
    level: InsightLevel,
    dateRange: { since: string; until: string },
  ): Promise<PCTInsightResult> {
    const params = new URLSearchParams({
      adAccountId: this.adAccountId,
      entityId,
      level,
      since: dateRange.since,
      until: dateRange.until,
      fields: "impressions,clicks,spend,conversions,ctr,cpc",
    });

    const response = await this.request<PCTInsightResult>(
      `/meta/insights?${params.toString()}`,
      "GET",
    );

    return response;
  }

  // -------------------------------------------------------------------------
  // Status toggles
  // -------------------------------------------------------------------------

  /**
   * Pause a campaign.
   */
  async pauseCampaign(id: string): Promise<void> {
    await this.request(
      `/meta/campaigns/${encodeURIComponent(id)}/status`,
      "POST",
      { adAccountId: this.adAccountId, status: "PAUSED" },
    );
  }

  /**
   * Resume (activate) a campaign.
   */
  async resumeCampaign(id: string): Promise<void> {
    await this.request(
      `/meta/campaigns/${encodeURIComponent(id)}/status`,
      "POST",
      { adAccountId: this.adAccountId, status: "ACTIVE" },
    );
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  private async request<T>(
    path: string,
    method: "GET" | "POST" | "PUT" | "DELETE",
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
