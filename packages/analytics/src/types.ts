import { z } from 'zod';

// ---------------------------------------------------------------------------
// Product IDs -- every product in the ACD ecosystem
// ---------------------------------------------------------------------------

export const ProductIdSchema = z.enum([
  'portal28',
  'content-factory',
  'pct',
  'waitlistlab',
  'mediaposter',
  'shorts-linker',
  'vellopad',
  'velvet-hold',
  'steady-letters',
  'ever-reach',
  'gap-radar',
  'blog-canvas',
  'canvas-cast',
  'software-hub',
  'acd',
]);

export type ProductId = z.infer<typeof ProductIdSchema>;

// ---------------------------------------------------------------------------
// Event categories
// ---------------------------------------------------------------------------

export const EventCategorySchema = z.enum([
  'page_view',
  'click',
  'form_submit',
  'api_call',
  'error',
  'purchase',
  'subscription',
  'content_created',
  'content_published',
  'render_started',
  'render_completed',
  'ad_created',
  'ad_published',
  'campaign_created',
  'user_signed_up',
  'user_logged_in',
  'feature_used',
  'custom',
]);

export type EventCategory = z.infer<typeof EventCategorySchema>;

// ---------------------------------------------------------------------------
// Event context -- optional metadata attached to each event
// ---------------------------------------------------------------------------

export const PageContextSchema = z.object({
  url: z.string().optional(),
  path: z.string().optional(),
  referrer: z.string().optional(),
  title: z.string().optional(),
});

export type PageContext = z.infer<typeof PageContextSchema>;

export const DeviceContextSchema = z.object({
  type: z.string().optional(),
  os: z.string().optional(),
  browser: z.string().optional(),
});

export type DeviceContext = z.infer<typeof DeviceContextSchema>;

export const CampaignContextSchema = z.object({
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  utm_term: z.string().optional(),
  utm_content: z.string().optional(),
});

export type CampaignContext = z.infer<typeof CampaignContextSchema>;

export const EventContextSchema = z.object({
  ip: z.string().optional(),
  userAgent: z.string().optional(),
  locale: z.string().optional(),
  timezone: z.string().optional(),
  page: PageContextSchema.optional(),
  device: DeviceContextSchema.optional(),
  campaign: CampaignContextSchema.optional(),
});

export type EventContext = z.infer<typeof EventContextSchema>;

// ---------------------------------------------------------------------------
// Core event schemas
// ---------------------------------------------------------------------------

export const TrackEventInputSchema = z.object({
  event: z.string(),
  properties: z.record(z.string(), z.unknown()).default({}),
  context: EventContextSchema.optional(),
  userId: z.string().optional(),
  anonymousId: z.string().optional(),
  product: ProductIdSchema,
  timestamp: z.string().datetime().optional(),
});

export type TrackEventInput = z.infer<typeof TrackEventInputSchema>;

export const BatchTrackInputSchema = z.object({
  events: z.array(TrackEventInputSchema),
});

export type BatchTrackInput = z.infer<typeof BatchTrackInputSchema>;

// ---------------------------------------------------------------------------
// Identify schema
// ---------------------------------------------------------------------------

export const IdentifyInputSchema = z.object({
  userId: z.string(),
  traits: z.record(z.string(), z.unknown()).default({}),
  product: ProductIdSchema,
});

export type IdentifyInput = z.infer<typeof IdentifyInputSchema>;

// ---------------------------------------------------------------------------
// Internal enriched event -- what the tracker passes to transports
// ---------------------------------------------------------------------------

export const AnalyticsEventSchema = z.object({
  event: z.string(),
  properties: z.record(z.string(), z.unknown()),
  context: EventContextSchema.optional(),
  userId: z.string().optional(),
  anonymousId: z.string().optional(),
  product: ProductIdSchema,
  timestamp: z.string().datetime(),
  messageId: z.string(),
});

export type AnalyticsEvent = z.infer<typeof AnalyticsEventSchema>;
