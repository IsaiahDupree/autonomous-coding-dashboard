import { z } from "zod";
import { ProductIdSchema } from "./product";

// ---------------------------------------------------------------------------
// Event Types
// ---------------------------------------------------------------------------

/**
 * Event category for classification.
 */
export const EventCategorySchema = z.enum([
  "page_view",
  "user_action",
  "system",
  "api_call",
  "error",
  "conversion",
  "engagement",
  "auth",
  "billing",
  "render",
  "notification",
  "integration",
  "custom",
]);
export type EventCategory = z.infer<typeof EventCategorySchema>;

/**
 * Event severity / importance level.
 */
export const EventSeveritySchema = z.enum(["debug", "info", "warning", "error", "critical"]);
export type EventSeverity = z.infer<typeof EventSeveritySchema>;

/**
 * Device / client context captured with the event.
 */
export const EventContextSchema = z.object({
  /** IP address of the client. */
  ip: z.string().ip().optional(),

  /** User agent string. */
  userAgent: z.string().max(2048).optional(),

  /** ISO 639-1 locale (e.g., "en-US"). */
  locale: z.string().max(10).optional(),

  /** Timezone (IANA, e.g., "America/New_York"). */
  timezone: z.string().max(64).optional(),

  /** Referring URL. */
  referrer: z.string().url().optional(),

  /** Current page URL. */
  pageUrl: z.string().url().optional(),

  /** Current page path (without domain). */
  pagePath: z.string().optional(),

  /** Screen width. */
  screenWidth: z.number().int().positive().optional(),

  /** Screen height. */
  screenHeight: z.number().int().positive().optional(),

  /** Device type. */
  deviceType: z.enum(["desktop", "mobile", "tablet", "unknown"]).optional(),

  /** Operating system. */
  os: z.string().max(64).optional(),

  /** Browser name. */
  browser: z.string().max(64).optional(),

  /** Country code (ISO 3166-1 alpha-2). */
  country: z.string().length(2).optional(),

  /** Region / state. */
  region: z.string().max(128).optional(),

  /** City. */
  city: z.string().max(128).optional(),
});
export type EventContext = z.infer<typeof EventContextSchema>;

/**
 * SharedEvent - A telemetry/analytics event recorded across ACD products.
 */
export const SharedEventSchema = z.object({
  /** Unique event identifier (UUID v4). */
  id: z.string().uuid(),

  /** The event name (e.g., "video.rendered", "user.signed_up"). */
  name: z.string().min(1).max(256),

  /** Event category. */
  category: EventCategorySchema,

  /** Event severity. */
  severity: EventSeveritySchema.default("info"),

  /** The product that emitted this event. */
  productId: ProductIdSchema.optional(),

  /** The user associated with this event (may be null for anonymous). */
  userId: z.string().uuid().optional(),

  /** Anonymous/session identifier. */
  anonymousId: z.string().max(256).optional(),

  /** Session identifier. */
  sessionId: z.string().uuid().optional(),

  /** Client/device context. */
  context: EventContextSchema.optional(),

  /** Event-specific payload data. */
  properties: z.record(z.string(), z.unknown()).default({}),

  /** Numeric value associated with the event (e.g., revenue). */
  value: z.number().optional(),

  /** Currency code for monetary values (ISO 4217). */
  currency: z.string().length(3).optional(),

  /** ISO 8601 timestamp of when the event occurred. */
  timestamp: z.string().datetime(),

  /** ISO 8601 timestamp of when the event was received by the server. */
  receivedAt: z.string().datetime().optional(),

  /** ISO 8601 timestamp of when the event was processed. */
  processedAt: z.string().datetime().optional(),
});

export type SharedEvent = z.infer<typeof SharedEventSchema>;

// ---------------------------------------------------------------------------
// Track Event Input (client-side)
// ---------------------------------------------------------------------------

/**
 * TrackEventInput - The shape of data sent from clients to track an event.
 * This is a subset of SharedEvent; the server enriches it with IDs and timestamps.
 */
export const TrackEventInputSchema = z.object({
  /** The event name (e.g., "button.clicked", "page.viewed"). */
  name: z.string().min(1).max(256),

  /** Event category. */
  category: EventCategorySchema.optional(),

  /** Event severity. */
  severity: EventSeveritySchema.optional(),

  /** The product emitting the event. */
  productId: ProductIdSchema.optional(),

  /** User ID (if authenticated). */
  userId: z.string().uuid().optional(),

  /** Anonymous/session identifier (if not authenticated). */
  anonymousId: z.string().max(256).optional(),

  /** Session identifier. */
  sessionId: z.string().uuid().optional(),

  /** Client/device context. */
  context: EventContextSchema.optional(),

  /** Event-specific payload data. */
  properties: z.record(z.string(), z.unknown()).optional(),

  /** Numeric value associated with the event. */
  value: z.number().optional(),

  /** Currency code (ISO 4217). */
  currency: z.string().length(3).optional(),

  /** Client-side timestamp (ISO 8601). */
  timestamp: z.string().datetime().optional(),
});

export type TrackEventInput = z.infer<typeof TrackEventInputSchema>;

/**
 * Batch tracking input for sending multiple events at once.
 */
export const BatchTrackInputSchema = z.object({
  events: z.array(TrackEventInputSchema).min(1).max(500),
});

export type BatchTrackInput = z.infer<typeof BatchTrackInputSchema>;
