/**
 * CAPIIngestService (GAP-001, GAP-006)
 *
 * Centralized CAPI (Conversions API) event ingestion for all ACD products.
 * Validates, enriches, and forwards events to the Meta Conversions API.
 *
 * - GAP-001: Shared CAPI event ingest across products
 * - GAP-006: Edge function handler for non-WaitlistLab conversion events
 */

import { z } from "zod";
import { createHash } from "crypto";
import type { CAPIUserData, CAPICustomData } from "../meta/types";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface CAPIIngestConfig {
  /** Meta Pixel ID / dataset ID. */
  pixelId: string;

  /** Meta access token for CAPI. */
  accessToken: string;

  /** Options. */
  options?: {
    /** Whether to validate events with Zod before sending. */
    validateEvents?: boolean;

    /** Whether to enrich user data from shared person store. */
    enrichWithPerson?: boolean;
  };
}

// ---------------------------------------------------------------------------
// Event schema (Zod validation)
// ---------------------------------------------------------------------------

const CAPIIngestEventSchema = z.object({
  eventName: z.string().min(1).max(256),
  userData: z.object({
    em: z.array(z.string()).optional(),
    ph: z.array(z.string()).optional(),
    fn: z.array(z.string()).optional(),
    ln: z.array(z.string()).optional(),
    db: z.array(z.string()).optional(),
    ge: z.array(z.string()).optional(),
    ct: z.array(z.string()).optional(),
    st: z.array(z.string()).optional(),
    zp: z.array(z.string()).optional(),
    country: z.array(z.string()).optional(),
    externalId: z.array(z.string()).optional(),
    clientIpAddress: z.string().optional(),
    clientUserAgent: z.string().optional(),
    fbc: z.string().optional(),
    fbp: z.string().optional(),
    subscriptionId: z.string().optional(),
    leadId: z.string().optional(),
  }),
  customData: z
    .object({
      value: z.number().optional(),
      currency: z.string().length(3).optional(),
      contentName: z.string().optional(),
      contentCategory: z.string().optional(),
      contentIds: z.array(z.string()).optional(),
      contentType: z.string().optional(),
      numItems: z.number().int().optional(),
      orderId: z.string().optional(),
      searchString: z.string().optional(),
      status: z.string().optional(),
    })
    .passthrough()
    .optional(),
  sourceProduct: z.string().min(1).optional(),
  eventSourceUrl: z.string().url().optional(),
});

type CAPIIngestEvent = z.infer<typeof CAPIIngestEventSchema>;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const META_GRAPH_URL = "https://graph.facebook.com/v21.0";

/** PII fields that should be SHA-256 hashed. */
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
// Person store interface (for enrichment)
// ---------------------------------------------------------------------------

/**
 * Interface for looking up person data to enrich CAPI events.
 */
export interface PersonStore {
  findByExternalId(externalId: string): Promise<PersonRecord | null>;
}

export interface PersonRecord {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

// ---------------------------------------------------------------------------
// Edge function request/response types
// ---------------------------------------------------------------------------

interface EdgeFunctionRequest {
  method: string;
  body: string | null;
  headers: Record<string, string>;
}

interface EdgeFunctionResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * CAPIIngestService provides centralized CAPI event ingestion.
 * All ACD products send conversion events through this service.
 */
export class CAPIIngestService {
  private readonly pixelId: string;
  private readonly accessToken: string;
  private readonly shouldValidate: boolean;
  private readonly shouldEnrich: boolean;
  private personStore: PersonStore | null = null;

  constructor(config: CAPIIngestConfig) {
    this.pixelId = config.pixelId;
    this.accessToken = config.accessToken;
    this.shouldValidate = config.options?.validateEvents ?? true;
    this.shouldEnrich = config.options?.enrichWithPerson ?? false;
  }

  /**
   * Set the person store for user data enrichment.
   */
  setPersonStore(store: PersonStore): void {
    this.personStore = store;
  }

  // -------------------------------------------------------------------------
  // Single event ingest
  // -------------------------------------------------------------------------

  /**
   * Ingest a single conversion event. Validates, enriches, hashes PII,
   * and forwards to Meta CAPI.
   */
  async ingestEvent(event: {
    eventName: string;
    userData: CAPIUserData;
    customData?: CAPICustomData;
    sourceProduct?: string;
    eventSourceUrl?: string;
  }): Promise<{ eventsReceived: number; messages: string[] }> {
    // Validate
    if (this.shouldValidate) {
      this.validateEvent(event);
    }

    // Enrich from person store if enabled
    let userData = event.userData;
    if (this.shouldEnrich && userData.externalId && userData.externalId.length > 0) {
      userData = await this.enrichFromPersonStore(userData);
    }

    // Hash PII
    const hashedUserData = this.hashPII(userData);

    // Build CAPI payload
    const payload = {
      data: [
        {
          event_name: event.eventName,
          event_time: Math.floor(Date.now() / 1000),
          action_source: "website" as const,
          event_source_url: event.eventSourceUrl,
          user_data: hashedUserData,
          custom_data: event.customData,
        },
      ],
      access_token: this.accessToken,
    };

    return this.sendToMeta(payload);
  }

  // -------------------------------------------------------------------------
  // Batch ingest
  // -------------------------------------------------------------------------

  /**
   * Ingest a batch of conversion events.
   */
  async ingestBatch(
    events: Array<{
      eventName: string;
      userData: CAPIUserData;
      customData?: CAPICustomData;
      sourceProduct?: string;
      eventSourceUrl?: string;
    }>,
  ): Promise<{ eventsReceived: number; messages: string[] }> {
    const processedEvents = [];

    for (const event of events) {
      if (this.shouldValidate) {
        this.validateEvent(event);
      }

      let userData = event.userData;
      if (this.shouldEnrich && userData.externalId && userData.externalId.length > 0) {
        userData = await this.enrichFromPersonStore(userData);
      }

      const hashedUserData = this.hashPII(userData);

      processedEvents.push({
        event_name: event.eventName,
        event_time: Math.floor(Date.now() / 1000),
        action_source: "website" as const,
        event_source_url: event.eventSourceUrl,
        user_data: hashedUserData,
        custom_data: event.customData,
      });
    }

    // Send in batches of 1000 (Meta limit)
    const results = { eventsReceived: 0, messages: [] as string[] };

    for (let i = 0; i < processedEvents.length; i += 1000) {
      const chunk = processedEvents.slice(i, i + 1000);
      const payload = {
        data: chunk,
        access_token: this.accessToken,
      };
      const chunkResult = await this.sendToMeta(payload);
      results.eventsReceived += chunkResult.eventsReceived;
      results.messages.push(...chunkResult.messages);
    }

    return results;
  }

  // -------------------------------------------------------------------------
  // Edge function handler (GAP-006)
  // -------------------------------------------------------------------------

  /**
   * Create an edge function handler for non-WaitlistLab conversion events.
   * Returns a handler function that accepts HTTP-like request objects and
   * processes them as CAPI events.
   */
  createEdgeFunction(): (
    req: EdgeFunctionRequest,
  ) => Promise<EdgeFunctionResponse> {
    return async (req: EdgeFunctionRequest): Promise<EdgeFunctionResponse> => {
      // Only accept POST
      if (req.method !== "POST") {
        return {
          status: 405,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Method not allowed" }),
        };
      }

      try {
        const body = JSON.parse(req.body ?? "{}") as {
          eventName?: string;
          userData?: CAPIUserData;
          customData?: CAPICustomData;
          eventSourceUrl?: string;
        };

        if (!body.eventName || !body.userData) {
          return {
            status: 400,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              error: "Missing required fields: eventName, userData",
            }),
          };
        }

        // Hash PII from the incoming request
        const hashedUserData = this.hashPII(body.userData);

        // Forward to CAPI
        const result = await this.ingestEvent({
          eventName: body.eventName,
          userData: hashedUserData,
          customData: body.customData,
          eventSourceUrl: body.eventSourceUrl,
        });

        return {
          status: 200,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(result),
        };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Internal server error";
        return {
          status: 500,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: message }),
        };
      }
    };
  }

  // -------------------------------------------------------------------------
  // Validation
  // -------------------------------------------------------------------------

  /**
   * Validate an event using Zod schema.
   * @throws Error if validation fails.
   */
  validateEvent(event: {
    eventName: string;
    userData: CAPIUserData;
    customData?: CAPICustomData;
    sourceProduct?: string;
    eventSourceUrl?: string;
  }): void {
    const result = CAPIIngestEventSchema.safeParse(event);
    if (!result.success) {
      const issues = result.error.issues
        .map((i: z.ZodIssue) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
      throw new Error(`Event validation failed: ${issues}`);
    }
  }

  // -------------------------------------------------------------------------
  // Person store enrichment
  // -------------------------------------------------------------------------

  /**
   * Enrich user data from the shared person store.
   * Looks up the person by externalId and fills in any missing PII fields.
   */
  async enrichFromPersonStore(userData: CAPIUserData): Promise<CAPIUserData> {
    if (!this.personStore) {
      return userData;
    }

    const externalId = userData.externalId?.[0];
    if (!externalId) {
      return userData;
    }

    const person = await this.personStore.findByExternalId(externalId);
    if (!person) {
      return userData;
    }

    const enriched: CAPIUserData = { ...userData };

    // Only fill in fields that are not already present
    if (!enriched.em && person.email) {
      enriched.em = [person.email];
    }
    if (!enriched.ph && person.phone) {
      enriched.ph = [person.phone];
    }
    if (!enriched.fn && person.firstName) {
      enriched.fn = [person.firstName];
    }
    if (!enriched.ln && person.lastName) {
      enriched.ln = [person.lastName];
    }
    if (!enriched.ct && person.city) {
      enriched.ct = [person.city];
    }
    if (!enriched.st && person.state) {
      enriched.st = [person.state];
    }
    if (!enriched.zp && person.zipCode) {
      enriched.zp = [person.zipCode];
    }
    if (!enriched.country && person.country) {
      enriched.country = [person.country];
    }

    return enriched;
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  private hashPII(userData: CAPIUserData): CAPIUserData {
    const hashed: CAPIUserData = { ...userData };

    for (const field of PII_HASH_FIELDS) {
      const value = hashed[field];
      if (Array.isArray(value)) {
        (hashed[field] as string[]) = value.map((v) =>
          this.sha256(v.toLowerCase().trim()),
        );
      }
    }

    return hashed;
  }

  private sha256(input: string): string {
    return createHash("sha256").update(input).digest("hex");
  }

  private async sendToMeta(payload: {
    data: unknown[];
    access_token: string;
  }): Promise<{ eventsReceived: number; messages: string[] }> {
    const url = `${META_GRAPH_URL}/${this.pixelId}/events`;

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
}
