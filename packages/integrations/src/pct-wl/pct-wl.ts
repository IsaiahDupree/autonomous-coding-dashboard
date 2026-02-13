/**
 * PCTWaitlistLabBridge (PCT-WL-001, PCT-WL-002, PCT-WL-003)
 *
 * Bridge between PCT (Product Campaign Tool) and WaitlistLab for Meta
 * campaign management. Translates PCT data formats to WaitlistLab/Meta
 * formats and vice versa.
 *
 * - PCT-WL-001: Campaign creation bridge
 * - PCT-WL-002: Ad creation bridge
 * - PCT-WL-003: Insights retrieval bridge
 */

// ---------------------------------------------------------------------------
// PCT-specific types
// ---------------------------------------------------------------------------

/**
 * PCT campaign data format (as PCT stores/sends it).
 */
export interface PCTCampaignData {
  /** PCT internal campaign ID. */
  pctCampaignId: string;

  /** Campaign name. */
  name: string;

  /** Campaign goal (PCT-specific names mapped to Meta objectives). */
  goal: "awareness" | "traffic" | "engagement" | "leads" | "sales";

  /** Daily budget in dollars. */
  dailyBudgetDollars: number;

  /** Target audience (PCT format). */
  audience: PCTAudienceSpec;

  /** Start date (YYYY-MM-DD). */
  startDate: string;

  /** End date (YYYY-MM-DD), optional. */
  endDate?: string;

  /** Ad account ID. */
  adAccountId?: string;
}

/**
 * PCT audience specification format.
 */
export interface PCTAudienceSpec {
  /** Country codes. */
  countries: string[];

  /** Age range. */
  ageRange?: { min: number; max: number };

  /** Gender targeting (all, male, female). */
  gender?: "all" | "male" | "female";

  /** Interest keywords. */
  interests?: string[];

  /** Custom audience IDs. */
  customAudienceIds?: string[];

  /** Lookalike audience IDs. */
  lookalikeAudienceIds?: string[];

  /** Platform placement. */
  platforms?: Array<"facebook" | "instagram">;
}

/**
 * PCT ad data format.
 */
export interface PCTAdData {
  /** PCT internal ad ID. */
  pctAdId: string;

  /** Ad name. */
  name: string;

  /** Associated PCT campaign ID. */
  pctCampaignId: string;

  /** Primary text (body copy). */
  primaryText: string;

  /** Headline. */
  headline: string;

  /** Call to action type. */
  callToAction: string;

  /** Destination URL. */
  destinationUrl: string;

  /** Optional link description. */
  description?: string;
}

/**
 * PCT insights format (returned to PCT).
 */
export interface PCTInsightsData {
  campaignId: string;
  pctCampaignId: string;
  dateRange: { since: string; until: string };
  metrics: {
    impressions: number;
    reach: number;
    clicks: number;
    ctr: number;
    spend: number;
    conversions: number;
    costPerConversion: number;
    roas: number;
  };
}

/**
 * WaitlistLab campaign status sync result.
 */
export interface StatusSyncResult {
  pctCampaignId: string;
  wlCampaignId: string;
  metaCampaignId: string;
  status: string;
  effectiveStatus: string;
  lastSynced: string;
}

// ---------------------------------------------------------------------------
// Meta targeting format (WaitlistLab expects this)
// ---------------------------------------------------------------------------

interface MetaTargeting {
  age_min?: number;
  age_max?: number;
  genders?: number[];
  geo_locations?: {
    countries?: string[];
  };
  interests?: Array<{ id: string; name: string }>;
  custom_audiences?: Array<{ id: string }>;
  lookalike_audiences?: Array<{ id: string }>;
  publisher_platforms?: string[];
}

// ---------------------------------------------------------------------------
// WaitlistLab API response
// ---------------------------------------------------------------------------

interface WLResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

interface WLCampaignResult {
  wlCampaignId: string;
  metaCampaignId: string;
  status: string;
}

interface WLAdResult {
  wlAdId: string;
  metaAdId: string;
  metaCreativeId: string;
  status: string;
}

interface WLInsightsResult {
  campaignId: string;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  spend: number;
  conversions: number;
  costPerConversion: number;
  roas: number;
}

interface WLStatusResult {
  wlCampaignId: string;
  metaCampaignId: string;
  status: string;
  effectiveStatus: string;
}

// ---------------------------------------------------------------------------
// Goal to Meta objective mapping
// ---------------------------------------------------------------------------

const GOAL_TO_OBJECTIVE: Record<PCTCampaignData["goal"], string> = {
  awareness: "OUTCOME_AWARENESS",
  traffic: "OUTCOME_TRAFFIC",
  engagement: "OUTCOME_ENGAGEMENT",
  leads: "OUTCOME_LEADS",
  sales: "OUTCOME_SALES",
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * PCTWaitlistLabBridge translates between PCT data formats and
 * WaitlistLab/Meta formats, providing a clean interface for PCT
 * to manage Meta campaigns through WaitlistLab.
 */
export class PCTWaitlistLabBridge {
  private readonly wlApiUrl: string;
  private readonly wlApiKey: string;

  constructor(wlApiUrl: string, wlApiKey: string) {
    this.wlApiUrl = wlApiUrl.replace(/\/+$/, "");
    this.wlApiKey = wlApiKey;
  }

  // -------------------------------------------------------------------------
  // PCT-WL-001: Campaign creation
  // -------------------------------------------------------------------------

  /**
   * Create a Meta campaign from PCT campaign data.
   * Translates PCT goal/audience format to Meta objective/targeting.
   */
  async createCampaign(
    pctCampaignData: PCTCampaignData,
  ): Promise<WLCampaignResult & { pctCampaignId: string }> {
    const targeting = this.translateTargeting(pctCampaignData.audience);

    const body = {
      adAccountId: pctCampaignData.adAccountId,
      name: pctCampaignData.name,
      objective: GOAL_TO_OBJECTIVE[pctCampaignData.goal],
      status: "PAUSED",
      dailyBudgetCents: Math.round(pctCampaignData.dailyBudgetDollars * 100),
      targeting,
      startTime: `${pctCampaignData.startDate}T00:00:00Z`,
      endTime: pctCampaignData.endDate
        ? `${pctCampaignData.endDate}T23:59:59Z`
        : undefined,
      metadata: {
        pctCampaignId: pctCampaignData.pctCampaignId,
      },
    };

    const result = await this.request<WLCampaignResult>(
      "/campaigns",
      "POST",
      body,
    );

    return {
      ...result,
      pctCampaignId: pctCampaignData.pctCampaignId,
    };
  }

  // -------------------------------------------------------------------------
  // PCT-WL-002: Ad creation
  // -------------------------------------------------------------------------

  /**
   * Create a Meta ad from PCT ad data with a creative asset URL.
   * Translates PCT ad format to WaitlistLab ad creation format.
   */
  async createAd(
    pctAdData: PCTAdData,
    creativeAssetUrl: string,
  ): Promise<WLAdResult & { pctAdId: string }> {
    const body = {
      campaignId: pctAdData.pctCampaignId,
      name: pctAdData.name,
      creative: {
        assetUrl: creativeAssetUrl,
        primaryText: pctAdData.primaryText,
        headline: pctAdData.headline,
        callToAction: pctAdData.callToAction,
        linkUrl: pctAdData.destinationUrl,
        description: pctAdData.description ?? null,
      },
      status: "PAUSED",
      metadata: {
        pctAdId: pctAdData.pctAdId,
        pctCampaignId: pctAdData.pctCampaignId,
      },
    };

    const result = await this.request<WLAdResult>("/ads", "POST", body);

    return {
      ...result,
      pctAdId: pctAdData.pctAdId,
    };
  }

  // -------------------------------------------------------------------------
  // PCT-WL-003: Insights retrieval
  // -------------------------------------------------------------------------

  /**
   * Fetch campaign insights from WaitlistLab and translate back to PCT format.
   */
  async getInsights(
    campaignId: string,
    dateRange: { since: string; until: string },
  ): Promise<PCTInsightsData> {
    const params = new URLSearchParams({
      campaignId,
      since: dateRange.since,
      until: dateRange.until,
      fields: "impressions,reach,clicks,ctr,spend,conversions,costPerConversion,roas",
    });

    const result = await this.request<WLInsightsResult>(
      `/insights?${params.toString()}`,
      "GET",
    );

    // Translate WaitlistLab response back to PCT format
    return {
      campaignId: result.campaignId,
      pctCampaignId: campaignId,
      dateRange,
      metrics: {
        impressions: result.impressions,
        reach: result.reach,
        clicks: result.clicks,
        ctr: result.ctr,
        spend: result.spend,
        conversions: result.conversions,
        costPerConversion: result.costPerConversion,
        roas: result.roas,
      },
    };
  }

  // -------------------------------------------------------------------------
  // Status sync
  // -------------------------------------------------------------------------

  /**
   * Sync campaign/ad status between PCT and WaitlistLab/Meta.
   */
  async syncStatus(pctCampaignId: string): Promise<StatusSyncResult> {
    const result = await this.request<WLStatusResult>(
      `/campaigns/${encodeURIComponent(pctCampaignId)}/status`,
      "GET",
    );

    return {
      pctCampaignId,
      wlCampaignId: result.wlCampaignId,
      metaCampaignId: result.metaCampaignId,
      status: result.status,
      effectiveStatus: result.effectiveStatus,
      lastSynced: new Date().toISOString(),
    };
  }

  // -------------------------------------------------------------------------
  // Targeting translation
  // -------------------------------------------------------------------------

  /**
   * Convert PCT audience targeting format to Meta targeting format.
   */
  translateTargeting(pctTargeting: PCTAudienceSpec): MetaTargeting {
    const targeting: MetaTargeting = {};

    // Age range
    if (pctTargeting.ageRange) {
      targeting.age_min = pctTargeting.ageRange.min;
      targeting.age_max = pctTargeting.ageRange.max;
    }

    // Gender (Meta: 1=male, 2=female; omit for all)
    if (pctTargeting.gender && pctTargeting.gender !== "all") {
      targeting.genders = pctTargeting.gender === "male" ? [1] : [2];
    }

    // Geo locations
    if (pctTargeting.countries.length > 0) {
      targeting.geo_locations = {
        countries: pctTargeting.countries,
      };
    }

    // Interests (PCT sends keywords, map to id/name format)
    if (pctTargeting.interests && pctTargeting.interests.length > 0) {
      targeting.interests = pctTargeting.interests.map((interest) => ({
        id: interest,
        name: interest,
      }));
    }

    // Custom audiences
    if (pctTargeting.customAudienceIds && pctTargeting.customAudienceIds.length > 0) {
      targeting.custom_audiences = pctTargeting.customAudienceIds.map((id) => ({
        id,
      }));
    }

    // Lookalike audiences
    if (pctTargeting.lookalikeAudienceIds && pctTargeting.lookalikeAudienceIds.length > 0) {
      targeting.lookalike_audiences = pctTargeting.lookalikeAudienceIds.map(
        (id) => ({ id }),
      );
    }

    // Platforms
    if (pctTargeting.platforms && pctTargeting.platforms.length > 0) {
      targeting.publisher_platforms = pctTargeting.platforms;
    }

    return targeting;
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
    };

    const init: RequestInit = { method, headers };
    if (body !== undefined && method !== "GET") {
      init.body = JSON.stringify(body);
    }

    const res = await fetch(url, init);

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`WaitlistLab API error ${res.status}: ${text}`);
    }

    const json = (await res.json()) as WLResponse<T>;

    if (!json.success || json.data === undefined) {
      throw new Error(
        `WaitlistLab API failure: ${json.error?.message ?? "Unknown error"}`,
      );
    }

    return json.data;
  }
}
