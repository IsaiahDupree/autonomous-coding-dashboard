/**
 * SharedPixelCAPIService (MH-004, GAP-001, GAP-005)
 *
 * Shared service for Meta Pixel (client-side) and Conversions API (server-side)
 * event tracking. Used across all ACD products for unified conversion tracking.
 *
 * - MH-004: Core CAPI event sending
 * - GAP-001: Shared CAPI ingest for all products
 * - GAP-005: Client-side pixel snippet generation
 */

import { createHash } from "crypto";
import type { CAPIUserData, CAPICustomData, CAPIEventPayload } from "./types";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface PixelCAPIConfig {
  /** Meta Pixel ID / dataset ID. */
  pixelId: string;

  /** Long-lived access token for Conversions API. */
  accessToken: string;

  /** Options for the service. */
  options?: {
    /** Test event code for sandbox testing (sent as test_event_code). */
    testEventCode?: string;

    /** Whether to auto-hash PII fields before sending. */
    hashPII?: boolean;
  };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const META_GRAPH_URL = "https://graph.facebook.com/v21.0";
const MAX_BATCH_SIZE = 1000;

/** PII fields that should be SHA-256 hashed for CAPI. */
const PII_HASH_FIELDS: Array<keyof CAPIUserData> = [
  "em",
  "ph",
  "fn",
  "ln",
  "db",
  "ge",
  "ct",
  "st",
  "zp",
  "country",
];

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * SharedPixelCAPIService provides a unified interface for sending server-side
 * events to the Meta Conversions API and generating client-side pixel snippets.
 */
export class SharedPixelCAPIService {
  private readonly pixelId: string;
  private readonly accessToken: string;
  private readonly testEventCode: string | undefined;
  private readonly hashPII: boolean;

  constructor(config: PixelCAPIConfig) {
    this.pixelId = config.pixelId;
    this.accessToken = config.accessToken;
    this.testEventCode = config.options?.testEventCode;
    this.hashPII = config.options?.hashPII ?? true;
  }

  // -------------------------------------------------------------------------
  // Core event sending
  // -------------------------------------------------------------------------

  /**
   * Send a single server-side CAPI event to Meta.
   */
  async sendEvent(
    eventName: string,
    userData: CAPIUserData,
    customData?: CAPICustomData,
    eventSourceUrl?: string,
  ): Promise<{ eventsReceived: number; messages: string[] }> {
    const event = this.buildEvent(eventName, userData, customData, eventSourceUrl);
    return this.sendToMeta([event]);
  }

  /**
   * Send a PageView event.
   */
  async sendPageView(
    url: string,
    userData: CAPIUserData,
  ): Promise<{ eventsReceived: number; messages: string[] }> {
    return this.sendEvent("PageView", userData, undefined, url);
  }

  /**
   * Send a Purchase event.
   */
  async sendPurchase(
    value: number,
    currency: string,
    userData: CAPIUserData,
    orderId?: string,
  ): Promise<{ eventsReceived: number; messages: string[] }> {
    const customData: CAPICustomData = {
      value,
      currency,
      orderId,
    };
    return this.sendEvent("Purchase", userData, customData);
  }

  /**
   * Send a Lead event.
   */
  async sendLead(
    userData: CAPIUserData,
    formData?: Record<string, string>,
  ): Promise<{ eventsReceived: number; messages: string[] }> {
    const customData: CAPICustomData | undefined = formData
      ? { contentName: formData["formName"], contentCategory: "lead_form" }
      : undefined;
    return this.sendEvent("Lead", userData, customData);
  }

  /**
   * Send a CompleteRegistration event.
   */
  async sendRegistration(
    userData: CAPIUserData,
  ): Promise<{ eventsReceived: number; messages: string[] }> {
    return this.sendEvent("CompleteRegistration", userData, {
      status: "registered",
    });
  }

  // -------------------------------------------------------------------------
  // Batch sending
  // -------------------------------------------------------------------------

  /**
   * Send a batch of events (up to 1000 per batch, as per Meta limit).
   */
  async batchEvents(
    events: Array<{
      eventName: string;
      userData: CAPIUserData;
      customData?: CAPICustomData;
      eventSourceUrl?: string;
    }>,
  ): Promise<{ eventsReceived: number; messages: string[] }> {
    const payloads = events.map((e) =>
      this.buildEvent(e.eventName, e.userData, e.customData, e.eventSourceUrl),
    );

    // Split into chunks of MAX_BATCH_SIZE
    const results: { eventsReceived: number; messages: string[] } = {
      eventsReceived: 0,
      messages: [],
    };

    for (let i = 0; i < payloads.length; i += MAX_BATCH_SIZE) {
      const chunk = payloads.slice(i, i + MAX_BATCH_SIZE);
      const chunkResult = await this.sendToMeta(chunk);
      results.eventsReceived += chunkResult.eventsReceived;
      results.messages.push(...chunkResult.messages);
    }

    return results;
  }

  // -------------------------------------------------------------------------
  // Client-side pixel snippet (GAP-005)
  // -------------------------------------------------------------------------

  /**
   * Generate the HTML/JS snippet for embedding Meta Pixel on a web page.
   * This enables client-side event tracking alongside server-side CAPI.
   */
  generatePixelSnippet(pixelId?: string): string {
    const pid = pixelId ?? this.pixelId;
    return [
      "<!-- Meta Pixel Code -->",
      "<script>",
      "!function(f,b,e,v,n,t,s)",
      "{if(f.fbq)return;n=f.fbq=function(){n.callMethod?",
      "n.callMethod.apply(n,arguments):n.queue.push(arguments)};",
      "if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';",
      "n.queue=[];t=b.createElement(e);t.async=!0;",
      "t.src=v;s=b.getElementsByTagName(e)[0];",
      "s.parentNode.insertBefore(t,s)}(window, document,'script',",
      "'https://connect.facebook.net/en_US/fbevents.js');",
      `fbq('init', '${pid}');`,
      "fbq('track', 'PageView');",
      "</script>",
      `<noscript><img height="1" width="1" style="display:none"`,
      `src="https://www.facebook.com/tr?id=${pid}&ev=PageView&noscript=1"`,
      "/></noscript>",
      "<!-- End Meta Pixel Code -->",
    ].join("\n");
  }

  // -------------------------------------------------------------------------
  // PII hashing
  // -------------------------------------------------------------------------

  /**
   * SHA-256 hash PII fields for CAPI compliance.
   * Meta requires that PII fields are hashed before sending.
   */
  hashUserData(data: CAPIUserData): CAPIUserData {
    const hashed: CAPIUserData = { ...data };

    for (const field of PII_HASH_FIELDS) {
      const value = hashed[field];
      if (Array.isArray(value)) {
        (hashed[field] as string[]) = value.map((v) => this.sha256(v.toLowerCase().trim()));
      }
    }

    return hashed;
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  private buildEvent(
    eventName: string,
    userData: CAPIUserData,
    customData?: CAPICustomData,
    eventSourceUrl?: string,
  ): CAPIEventPayload {
    const processedUserData = this.hashPII
      ? this.hashUserData(userData)
      : userData;

    return {
      eventName,
      eventTime: Math.floor(Date.now() / 1000),
      actionSource: "website",
      eventSourceUrl,
      userData: processedUserData,
      customData,
    };
  }

  private async sendToMeta(
    events: CAPIEventPayload[],
  ): Promise<{ eventsReceived: number; messages: string[] }> {
    const url = `${META_GRAPH_URL}/${this.pixelId}/events`;

    const payload: Record<string, unknown> = {
      data: events,
      access_token: this.accessToken,
    };

    if (this.testEventCode) {
      payload["test_event_code"] = this.testEventCode;
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Meta CAPI error ${res.status}: ${text}`);
    }

    const json = (await res.json()) as {
      events_received?: number;
      messages?: string[];
    };

    return {
      eventsReceived: json.events_received ?? 0,
      messages: json.messages ?? [],
    };
  }

  private sha256(input: string): string {
    return createHash("sha256").update(input).digest("hex");
  }
}
