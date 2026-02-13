// Types & schemas
export {
  ProductIdSchema,
  EventCategorySchema,
  PageContextSchema,
  DeviceContextSchema,
  CampaignContextSchema,
  EventContextSchema,
  TrackEventInputSchema,
  BatchTrackInputSchema,
  IdentifyInputSchema,
  AnalyticsEventSchema,
} from './types';

export type {
  ProductId,
  EventCategory,
  PageContext,
  DeviceContext,
  CampaignContext,
  EventContext,
  TrackEventInput,
  BatchTrackInput,
  IdentifyInput,
  AnalyticsEvent,
} from './types';

// Transport layer
export {
  HttpTransport,
  SupabaseTransport,
  NoopTransport,
} from './transport';

export type {
  EventTransport,
  HttpTransportOptions,
} from './transport';

// Tracker
export { AnalyticsTracker } from './tracker';

export type {
  EventMiddleware,
  AnalyticsTrackerOptions,
} from './tracker';

// Built-in middleware
export {
  enrichWithTimestamp,
  enrichWithSessionId,
  filterSensitiveData,
  samplingMiddleware,
  deduplicationMiddleware,
} from './middleware';
