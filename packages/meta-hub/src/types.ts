import { z } from 'zod';

// ---------------------------------------------------------------------------
// Meta API Version
// ---------------------------------------------------------------------------
export const DEFAULT_API_VERSION = 'v19.0';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
export enum CampaignObjective {
  OUTCOME_AWARENESS = 'OUTCOME_AWARENESS',
  OUTCOME_ENGAGEMENT = 'OUTCOME_ENGAGEMENT',
  OUTCOME_LEADS = 'OUTCOME_LEADS',
  OUTCOME_SALES = 'OUTCOME_SALES',
  OUTCOME_TRAFFIC = 'OUTCOME_TRAFFIC',
  OUTCOME_APP_PROMOTION = 'OUTCOME_APP_PROMOTION',
}

export enum CampaignStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  DELETED = 'DELETED',
  ARCHIVED = 'ARCHIVED',
}

export enum AdSetStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  DELETED = 'DELETED',
  ARCHIVED = 'ARCHIVED',
}

export enum AdStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  DELETED = 'DELETED',
  ARCHIVED = 'ARCHIVED',
}

export enum BillingEvent {
  IMPRESSIONS = 'IMPRESSIONS',
  LINK_CLICKS = 'LINK_CLICKS',
  APP_INSTALLS = 'APP_INSTALLS',
  PAGE_LIKES = 'PAGE_LIKES',
  POST_ENGAGEMENT = 'POST_ENGAGEMENT',
}

export enum OptimizationGoal {
  IMPRESSIONS = 'IMPRESSIONS',
  REACH = 'REACH',
  LINK_CLICKS = 'LINK_CLICKS',
  LANDING_PAGE_VIEWS = 'LANDING_PAGE_VIEWS',
  OFFSITE_CONVERSIONS = 'OFFSITE_CONVERSIONS',
  LEAD_GENERATION = 'LEAD_GENERATION',
  APP_INSTALLS = 'APP_INSTALLS',
  VALUE = 'VALUE',
}

export enum ActionSource {
  EMAIL = 'email',
  WEBSITE = 'website',
  APP = 'app',
  PHONE_CALL = 'phone_call',
  CHAT = 'chat',
  PHYSICAL_STORE = 'physical_store',
  SYSTEM_GENERATED = 'system_generated',
  OTHER = 'other',
}

export enum InsightLevel {
  ACCOUNT = 'account',
  CAMPAIGN = 'campaign',
  ADSET = 'adset',
  AD = 'ad',
}

export enum InsightDatePreset {
  TODAY = 'today',
  YESTERDAY = 'yesterday',
  THIS_MONTH = 'this_month',
  LAST_MONTH = 'last_month',
  THIS_QUARTER = 'this_quarter',
  LAST_3D = 'last_3d',
  LAST_7D = 'last_7d',
  LAST_14D = 'last_14d',
  LAST_28D = 'last_28d',
  LAST_30D = 'last_30d',
  LAST_90D = 'last_90d',
  LAST_WEEK_MON_SUN = 'last_week_mon_sun',
  LAST_WEEK_SUN_SAT = 'last_week_sun_sat',
  LAST_QUARTER = 'last_quarter',
  LAST_YEAR = 'last_year',
  THIS_WEEK_MON_TODAY = 'this_week_mon_today',
  THIS_WEEK_SUN_TODAY = 'this_week_sun_today',
  THIS_YEAR = 'this_year',
}

export enum AudienceSubtype {
  CUSTOM = 'CUSTOM',
  WEBSITE = 'WEBSITE',
  APP = 'APP',
  OFFLINE = 'OFFLINE',
  ENGAGEMENT = 'ENGAGEMENT',
  LOOKALIKE = 'LOOKALIKE',
}

// ---------------------------------------------------------------------------
// Core Resource Types
// ---------------------------------------------------------------------------

export interface Campaign {
  id: string;
  name: string;
  account_id: string;
  objective: CampaignObjective;
  status: CampaignStatus;
  effective_status: string;
  buying_type: string;
  bid_strategy?: string;
  daily_budget?: string;
  lifetime_budget?: string;
  budget_remaining?: string;
  special_ad_categories: string[];
  created_time: string;
  updated_time: string;
  start_time?: string;
  stop_time?: string;
}

export interface AdSet {
  id: string;
  name: string;
  campaign_id: string;
  account_id: string;
  status: AdSetStatus;
  effective_status: string;
  billing_event: BillingEvent;
  optimization_goal: OptimizationGoal;
  bid_amount?: number;
  daily_budget?: string;
  lifetime_budget?: string;
  budget_remaining?: string;
  targeting: Targeting;
  start_time: string;
  end_time?: string;
  created_time: string;
  updated_time: string;
}

export interface Ad {
  id: string;
  name: string;
  adset_id: string;
  campaign_id: string;
  account_id: string;
  status: AdStatus;
  effective_status: string;
  creative: { id: string };
  tracking_specs?: Record<string, unknown>[];
  created_time: string;
  updated_time: string;
}

export interface AdCreative {
  id: string;
  name: string;
  account_id: string;
  title?: string;
  body?: string;
  image_hash?: string;
  image_url?: string;
  video_id?: string;
  thumbnail_url?: string;
  link_url?: string;
  call_to_action_type?: string;
  object_story_spec?: ObjectStorySpec;
}

export interface ObjectStorySpec {
  page_id: string;
  link_data?: {
    link: string;
    message?: string;
    name?: string;
    description?: string;
    image_hash?: string;
    call_to_action?: {
      type: string;
      value?: Record<string, unknown>;
    };
  };
  video_data?: {
    video_id: string;
    title?: string;
    message?: string;
    image_hash?: string;
    call_to_action?: {
      type: string;
      value?: Record<string, unknown>;
    };
  };
}

export interface Targeting {
  age_min?: number;
  age_max?: number;
  genders?: number[];
  geo_locations?: {
    countries?: string[];
    regions?: Array<{ key: string }>;
    cities?: Array<{ key: string; radius?: number; distance_unit?: string }>;
    zips?: Array<{ key: string }>;
    location_types?: string[];
  };
  interests?: Array<{ id: string; name: string }>;
  behaviors?: Array<{ id: string; name: string }>;
  custom_audiences?: Array<{ id: string; name?: string }>;
  excluded_custom_audiences?: Array<{ id: string; name?: string }>;
  publisher_platforms?: string[];
  facebook_positions?: string[];
  instagram_positions?: string[];
  device_platforms?: string[];
  flexible_spec?: Array<Record<string, unknown>>;
  exclusions?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Insight / Reporting Types
// ---------------------------------------------------------------------------

export interface DateRange {
  since: string; // YYYY-MM-DD
  until: string; // YYYY-MM-DD
}

export interface InsightParams {
  level?: InsightLevel;
  date_preset?: InsightDatePreset;
  time_range?: DateRange;
  time_increment?: number | 'monthly' | 'all_days';
  fields?: string[];
  breakdowns?: string[];
  filtering?: Array<{
    field: string;
    operator: string;
    value: string | string[];
  }>;
  limit?: number;
  sort?: string[];
}

export interface InsightAction {
  action_type: string;
  value: string;
  '1d_click'?: string;
  '7d_click'?: string;
  '28d_click'?: string;
  '1d_view'?: string;
  '7d_view'?: string;
  '28d_view'?: string;
}

export interface Insight {
  account_id?: string;
  campaign_id?: string;
  adset_id?: string;
  ad_id?: string;
  campaign_name?: string;
  adset_name?: string;
  ad_name?: string;
  date_start: string;
  date_stop: string;
  impressions: string;
  clicks?: string;
  spend: string;
  reach?: string;
  frequency?: string;
  cpc?: string;
  cpm?: string;
  ctr?: string;
  cpp?: string;
  cost_per_action_type?: InsightAction[];
  actions?: InsightAction[];
  conversions?: InsightAction[];
  cost_per_conversion?: InsightAction[];
  purchase_roas?: InsightAction[];
  website_purchase_roas?: InsightAction[];
  inline_link_clicks?: string;
  inline_link_click_ctr?: string;
  cost_per_inline_link_click?: string;
  video_p25_watched_actions?: InsightAction[];
  video_p50_watched_actions?: InsightAction[];
  video_p75_watched_actions?: InsightAction[];
  video_p100_watched_actions?: InsightAction[];
}

// ---------------------------------------------------------------------------
// Custom Audience Types
// ---------------------------------------------------------------------------

export interface CustomAudience {
  id: string;
  name: string;
  account_id: string;
  description?: string;
  subtype: AudienceSubtype;
  approximate_count?: number;
  customer_file_source?: string;
  data_source?: {
    type: string;
    sub_type?: string;
  };
  delivery_status?: {
    status: string;
  };
  lookalike_spec?: {
    country: string;
    ratio: number;
    origin: Array<{ id: string; name?: string; type: string }>;
  };
  retention_days?: number;
  rule?: string;
  created_time?: string;
}

export interface AudienceUser {
  email?: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  date_of_birth?: string;
  gender?: string;
  external_id?: string;
  client_ip_address?: string;
  client_user_agent?: string;
  fbc?: string;
  fbp?: string;
}

// ---------------------------------------------------------------------------
// Conversions API (CAPI) / Pixel Types
// ---------------------------------------------------------------------------

export interface UserData {
  em?: string | string[];            // email
  ph?: string | string[];            // phone
  fn?: string;                       // first name
  ln?: string;                       // last name
  ge?: string;                       // gender
  db?: string;                       // date of birth
  ct?: string;                       // city
  st?: string;                       // state
  zp?: string;                       // zip
  country?: string;
  external_id?: string | string[];
  client_ip_address?: string;
  client_user_agent?: string;
  fbc?: string;                      // click id
  fbp?: string;                      // browser id
  subscription_id?: string;
  lead_id?: string;
}

export interface HashedUserData {
  em?: string[];
  ph?: string[];
  fn?: string;
  ln?: string;
  ge?: string;
  db?: string;
  ct?: string;
  st?: string;
  zp?: string;
  country?: string;
  external_id?: string[];
  client_ip_address?: string;
  client_user_agent?: string;
  fbc?: string;
  fbp?: string;
  subscription_id?: string;
  lead_id?: string;
}

export interface CustomData {
  value?: number;
  currency?: string;
  content_name?: string;
  content_category?: string;
  content_ids?: string[];
  content_type?: string;
  contents?: Array<{
    id: string;
    quantity?: number;
    item_price?: number;
  }>;
  num_items?: number;
  order_id?: string;
  predicted_ltv?: number;
  search_string?: string;
  status?: string;
  delivery_category?: string;
  [key: string]: unknown;
}

export interface CAPIEvent {
  event_name: string;
  event_time: number;
  user_data: UserData;
  custom_data?: CustomData;
  event_source_url?: string;
  action_source: ActionSource;
  event_id?: string;
  opt_out?: boolean;
  data_processing_options?: string[];
  data_processing_options_country?: number;
  data_processing_options_state?: number;
}

// ---------------------------------------------------------------------------
// Input Types for Create Operations
// ---------------------------------------------------------------------------

export interface CreateCampaignInput {
  name: string;
  objective: CampaignObjective;
  status?: CampaignStatus;
  special_ad_categories?: string[];
  buying_type?: string;
  bid_strategy?: string;
  daily_budget?: string;
  lifetime_budget?: string;
  start_time?: string;
  stop_time?: string;
}

export interface CreateAdSetInput {
  name: string;
  billing_event: BillingEvent;
  optimization_goal: OptimizationGoal;
  targeting: Targeting;
  status?: AdSetStatus;
  bid_amount?: number;
  daily_budget?: string;
  lifetime_budget?: string;
  start_time: string;
  end_time?: string;
  promoted_object?: {
    pixel_id?: string;
    custom_event_type?: string;
    application_id?: string;
    object_store_url?: string;
    page_id?: string;
  };
}

export interface CreateAdInput {
  name: string;
  creative: { creative_id: string } | AdCreativeSpec;
  status?: AdStatus;
  tracking_specs?: Record<string, unknown>[];
}

export interface AdCreativeSpec {
  name?: string;
  title?: string;
  body?: string;
  image_hash?: string;
  image_url?: string;
  video_id?: string;
  link_url?: string;
  call_to_action_type?: string;
  object_story_spec?: ObjectStorySpec;
}

export interface CreateAdCreativeInput {
  name: string;
  object_story_spec?: ObjectStorySpec;
  title?: string;
  body?: string;
  image_hash?: string;
  image_url?: string;
  video_id?: string;
  link_url?: string;
  call_to_action_type?: string;
  url_tags?: string;
}

export interface CreateAudienceInput {
  name: string;
  description?: string;
  subtype: AudienceSubtype;
  customer_file_source?: string;
  retention_days?: number;
  rule?: string;
  lookalike_spec?: {
    origin_audience_id: string;
    country: string;
    ratio: number;
  };
  prefill?: boolean;
}

// ---------------------------------------------------------------------------
// Meta API Error Response Types
// ---------------------------------------------------------------------------

export interface MetaApiErrorResponse {
  error: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    error_user_title?: string;
    error_user_msg?: string;
    fbtrace_id?: string;
    is_transient?: boolean;
  };
}

// ---------------------------------------------------------------------------
// Client Configuration
// ---------------------------------------------------------------------------

export interface MetaHubConfig {
  accessToken: string;
  apiVersion?: string;
  pixelId?: string;
  appSecret?: string;
}

export interface MetaPixelConfig {
  pixelId: string;
  accessToken: string;
  appSecret?: string;
}

// ---------------------------------------------------------------------------
// API Response Wrappers
// ---------------------------------------------------------------------------

export interface MetaPaginatedResponse<T> {
  data: T[];
  paging?: {
    cursors?: {
      before: string;
      after: string;
    };
    next?: string;
    previous?: string;
  };
}

export interface MetaCreateResponse {
  id: string;
}

export interface MetaSuccessResponse {
  success: boolean;
}

export interface ImageUploadResponse {
  hash: string;
  url: string;
}

export interface VideoUploadResponse {
  videoId: string;
}

export interface EventsResponse {
  events_received: number;
  messages?: string[];
  fbtrace_id?: string;
}

// ---------------------------------------------------------------------------
// Rate Limiter Types
// ---------------------------------------------------------------------------

export interface RateLimitInfo {
  callCount: number;
  totalCpuTime: number;
  totalTime: number;
  estimatedTimeToRegainAccess?: number;
}

export interface RateLimitBucket {
  appId: string;
  accountId?: string;
  usage: RateLimitInfo;
  lastUpdated: number;
  throttledUntil: number;
}

// ---------------------------------------------------------------------------
// Zod Schemas for Runtime Validation
// ---------------------------------------------------------------------------

export const DateRangeSchema = z.object({
  since: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const CAPIEventSchema = z.object({
  event_name: z.string().min(1),
  event_time: z.number().int().positive(),
  user_data: z.object({
    em: z.union([z.string(), z.array(z.string())]).optional(),
    ph: z.union([z.string(), z.array(z.string())]).optional(),
    fn: z.string().optional(),
    ln: z.string().optional(),
    ge: z.string().optional(),
    db: z.string().optional(),
    ct: z.string().optional(),
    st: z.string().optional(),
    zp: z.string().optional(),
    country: z.string().optional(),
    external_id: z.union([z.string(), z.array(z.string())]).optional(),
    client_ip_address: z.string().optional(),
    client_user_agent: z.string().optional(),
    fbc: z.string().optional(),
    fbp: z.string().optional(),
    subscription_id: z.string().optional(),
    lead_id: z.string().optional(),
  }),
  custom_data: z.record(z.unknown()).optional(),
  event_source_url: z.string().url().optional(),
  action_source: z.nativeEnum(ActionSource),
  event_id: z.string().optional(),
  opt_out: z.boolean().optional(),
  data_processing_options: z.array(z.string()).optional(),
  data_processing_options_country: z.number().optional(),
  data_processing_options_state: z.number().optional(),
});

export const CreateCampaignInputSchema = z.object({
  name: z.string().min(1),
  objective: z.nativeEnum(CampaignObjective),
  status: z.nativeEnum(CampaignStatus).optional(),
  special_ad_categories: z.array(z.string()).optional(),
  buying_type: z.string().optional(),
  bid_strategy: z.string().optional(),
  daily_budget: z.string().optional(),
  lifetime_budget: z.string().optional(),
  start_time: z.string().optional(),
  stop_time: z.string().optional(),
});

export const CreateAdSetInputSchema = z.object({
  name: z.string().min(1),
  billing_event: z.nativeEnum(BillingEvent),
  optimization_goal: z.nativeEnum(OptimizationGoal),
  targeting: z.record(z.unknown()),
  status: z.nativeEnum(AdSetStatus).optional(),
  bid_amount: z.number().optional(),
  daily_budget: z.string().optional(),
  lifetime_budget: z.string().optional(),
  start_time: z.string(),
  end_time: z.string().optional(),
  promoted_object: z.object({
    pixel_id: z.string().optional(),
    custom_event_type: z.string().optional(),
    application_id: z.string().optional(),
    object_store_url: z.string().optional(),
    page_id: z.string().optional(),
  }).optional(),
});

export const CreateAdInputSchema = z.object({
  name: z.string().min(1),
  creative: z.union([
    z.object({ creative_id: z.string() }),
    z.record(z.unknown()),
  ]),
  status: z.nativeEnum(AdStatus).optional(),
  tracking_specs: z.array(z.record(z.unknown())).optional(),
});

export const InsightParamsSchema = z.object({
  level: z.nativeEnum(InsightLevel).optional(),
  date_preset: z.nativeEnum(InsightDatePreset).optional(),
  time_range: DateRangeSchema.optional(),
  time_increment: z.union([z.number(), z.literal('monthly'), z.literal('all_days')]).optional(),
  fields: z.array(z.string()).optional(),
  breakdowns: z.array(z.string()).optional(),
  filtering: z.array(z.object({
    field: z.string(),
    operator: z.string(),
    value: z.union([z.string(), z.array(z.string())]),
  })).optional(),
  limit: z.number().optional(),
  sort: z.array(z.string()).optional(),
});
