import { z } from 'zod';
export declare const DEFAULT_API_VERSION = "v19.0";
export declare enum CampaignObjective {
    OUTCOME_AWARENESS = "OUTCOME_AWARENESS",
    OUTCOME_ENGAGEMENT = "OUTCOME_ENGAGEMENT",
    OUTCOME_LEADS = "OUTCOME_LEADS",
    OUTCOME_SALES = "OUTCOME_SALES",
    OUTCOME_TRAFFIC = "OUTCOME_TRAFFIC",
    OUTCOME_APP_PROMOTION = "OUTCOME_APP_PROMOTION"
}
export declare enum CampaignStatus {
    ACTIVE = "ACTIVE",
    PAUSED = "PAUSED",
    DELETED = "DELETED",
    ARCHIVED = "ARCHIVED"
}
export declare enum AdSetStatus {
    ACTIVE = "ACTIVE",
    PAUSED = "PAUSED",
    DELETED = "DELETED",
    ARCHIVED = "ARCHIVED"
}
export declare enum AdStatus {
    ACTIVE = "ACTIVE",
    PAUSED = "PAUSED",
    DELETED = "DELETED",
    ARCHIVED = "ARCHIVED"
}
export declare enum BillingEvent {
    IMPRESSIONS = "IMPRESSIONS",
    LINK_CLICKS = "LINK_CLICKS",
    APP_INSTALLS = "APP_INSTALLS",
    PAGE_LIKES = "PAGE_LIKES",
    POST_ENGAGEMENT = "POST_ENGAGEMENT"
}
export declare enum OptimizationGoal {
    IMPRESSIONS = "IMPRESSIONS",
    REACH = "REACH",
    LINK_CLICKS = "LINK_CLICKS",
    LANDING_PAGE_VIEWS = "LANDING_PAGE_VIEWS",
    OFFSITE_CONVERSIONS = "OFFSITE_CONVERSIONS",
    LEAD_GENERATION = "LEAD_GENERATION",
    APP_INSTALLS = "APP_INSTALLS",
    VALUE = "VALUE"
}
export declare enum ActionSource {
    EMAIL = "email",
    WEBSITE = "website",
    APP = "app",
    PHONE_CALL = "phone_call",
    CHAT = "chat",
    PHYSICAL_STORE = "physical_store",
    SYSTEM_GENERATED = "system_generated",
    OTHER = "other"
}
export declare enum InsightLevel {
    ACCOUNT = "account",
    CAMPAIGN = "campaign",
    ADSET = "adset",
    AD = "ad"
}
export declare enum InsightDatePreset {
    TODAY = "today",
    YESTERDAY = "yesterday",
    THIS_MONTH = "this_month",
    LAST_MONTH = "last_month",
    THIS_QUARTER = "this_quarter",
    LAST_3D = "last_3d",
    LAST_7D = "last_7d",
    LAST_14D = "last_14d",
    LAST_28D = "last_28d",
    LAST_30D = "last_30d",
    LAST_90D = "last_90d",
    LAST_WEEK_MON_SUN = "last_week_mon_sun",
    LAST_WEEK_SUN_SAT = "last_week_sun_sat",
    LAST_QUARTER = "last_quarter",
    LAST_YEAR = "last_year",
    THIS_WEEK_MON_TODAY = "this_week_mon_today",
    THIS_WEEK_SUN_TODAY = "this_week_sun_today",
    THIS_YEAR = "this_year"
}
export declare enum AudienceSubtype {
    CUSTOM = "CUSTOM",
    WEBSITE = "WEBSITE",
    APP = "APP",
    OFFLINE = "OFFLINE",
    ENGAGEMENT = "ENGAGEMENT",
    LOOKALIKE = "LOOKALIKE"
}
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
    creative: {
        id: string;
    };
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
        regions?: Array<{
            key: string;
        }>;
        cities?: Array<{
            key: string;
            radius?: number;
            distance_unit?: string;
        }>;
        zips?: Array<{
            key: string;
        }>;
        location_types?: string[];
    };
    interests?: Array<{
        id: string;
        name: string;
    }>;
    behaviors?: Array<{
        id: string;
        name: string;
    }>;
    custom_audiences?: Array<{
        id: string;
        name?: string;
    }>;
    excluded_custom_audiences?: Array<{
        id: string;
        name?: string;
    }>;
    publisher_platforms?: string[];
    facebook_positions?: string[];
    instagram_positions?: string[];
    device_platforms?: string[];
    flexible_spec?: Array<Record<string, unknown>>;
    exclusions?: Record<string, unknown>;
}
export interface DateRange {
    since: string;
    until: string;
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
        origin: Array<{
            id: string;
            name?: string;
            type: string;
        }>;
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
export interface UserData {
    em?: string | string[];
    ph?: string | string[];
    fn?: string;
    ln?: string;
    ge?: string;
    db?: string;
    ct?: string;
    st?: string;
    zp?: string;
    country?: string;
    external_id?: string | string[];
    client_ip_address?: string;
    client_user_agent?: string;
    fbc?: string;
    fbp?: string;
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
    creative: {
        creative_id: string;
    } | AdCreativeSpec;
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
export declare const DateRangeSchema: z.ZodObject<{
    since: z.ZodString;
    until: z.ZodString;
}, "strip", z.ZodTypeAny, {
    since: string;
    until: string;
}, {
    since: string;
    until: string;
}>;
export declare const CAPIEventSchema: z.ZodObject<{
    event_name: z.ZodString;
    event_time: z.ZodNumber;
    user_data: z.ZodObject<{
        em: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>>;
        ph: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>>;
        fn: z.ZodOptional<z.ZodString>;
        ln: z.ZodOptional<z.ZodString>;
        ge: z.ZodOptional<z.ZodString>;
        db: z.ZodOptional<z.ZodString>;
        ct: z.ZodOptional<z.ZodString>;
        st: z.ZodOptional<z.ZodString>;
        zp: z.ZodOptional<z.ZodString>;
        country: z.ZodOptional<z.ZodString>;
        external_id: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>>;
        client_ip_address: z.ZodOptional<z.ZodString>;
        client_user_agent: z.ZodOptional<z.ZodString>;
        fbc: z.ZodOptional<z.ZodString>;
        fbp: z.ZodOptional<z.ZodString>;
        subscription_id: z.ZodOptional<z.ZodString>;
        lead_id: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        country?: string | undefined;
        em?: string | string[] | undefined;
        ph?: string | string[] | undefined;
        fn?: string | undefined;
        ln?: string | undefined;
        ge?: string | undefined;
        db?: string | undefined;
        ct?: string | undefined;
        st?: string | undefined;
        zp?: string | undefined;
        external_id?: string | string[] | undefined;
        client_ip_address?: string | undefined;
        client_user_agent?: string | undefined;
        fbc?: string | undefined;
        fbp?: string | undefined;
        subscription_id?: string | undefined;
        lead_id?: string | undefined;
    }, {
        country?: string | undefined;
        em?: string | string[] | undefined;
        ph?: string | string[] | undefined;
        fn?: string | undefined;
        ln?: string | undefined;
        ge?: string | undefined;
        db?: string | undefined;
        ct?: string | undefined;
        st?: string | undefined;
        zp?: string | undefined;
        external_id?: string | string[] | undefined;
        client_ip_address?: string | undefined;
        client_user_agent?: string | undefined;
        fbc?: string | undefined;
        fbp?: string | undefined;
        subscription_id?: string | undefined;
        lead_id?: string | undefined;
    }>;
    custom_data: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    event_source_url: z.ZodOptional<z.ZodString>;
    action_source: z.ZodNativeEnum<typeof ActionSource>;
    event_id: z.ZodOptional<z.ZodString>;
    opt_out: z.ZodOptional<z.ZodBoolean>;
    data_processing_options: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    data_processing_options_country: z.ZodOptional<z.ZodNumber>;
    data_processing_options_state: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    event_name: string;
    event_time: number;
    user_data: {
        country?: string | undefined;
        em?: string | string[] | undefined;
        ph?: string | string[] | undefined;
        fn?: string | undefined;
        ln?: string | undefined;
        ge?: string | undefined;
        db?: string | undefined;
        ct?: string | undefined;
        st?: string | undefined;
        zp?: string | undefined;
        external_id?: string | string[] | undefined;
        client_ip_address?: string | undefined;
        client_user_agent?: string | undefined;
        fbc?: string | undefined;
        fbp?: string | undefined;
        subscription_id?: string | undefined;
        lead_id?: string | undefined;
    };
    action_source: ActionSource;
    custom_data?: Record<string, unknown> | undefined;
    event_source_url?: string | undefined;
    event_id?: string | undefined;
    opt_out?: boolean | undefined;
    data_processing_options?: string[] | undefined;
    data_processing_options_country?: number | undefined;
    data_processing_options_state?: number | undefined;
}, {
    event_name: string;
    event_time: number;
    user_data: {
        country?: string | undefined;
        em?: string | string[] | undefined;
        ph?: string | string[] | undefined;
        fn?: string | undefined;
        ln?: string | undefined;
        ge?: string | undefined;
        db?: string | undefined;
        ct?: string | undefined;
        st?: string | undefined;
        zp?: string | undefined;
        external_id?: string | string[] | undefined;
        client_ip_address?: string | undefined;
        client_user_agent?: string | undefined;
        fbc?: string | undefined;
        fbp?: string | undefined;
        subscription_id?: string | undefined;
        lead_id?: string | undefined;
    };
    action_source: ActionSource;
    custom_data?: Record<string, unknown> | undefined;
    event_source_url?: string | undefined;
    event_id?: string | undefined;
    opt_out?: boolean | undefined;
    data_processing_options?: string[] | undefined;
    data_processing_options_country?: number | undefined;
    data_processing_options_state?: number | undefined;
}>;
export declare const CreateCampaignInputSchema: z.ZodObject<{
    name: z.ZodString;
    objective: z.ZodNativeEnum<typeof CampaignObjective>;
    status: z.ZodOptional<z.ZodNativeEnum<typeof CampaignStatus>>;
    special_ad_categories: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    buying_type: z.ZodOptional<z.ZodString>;
    bid_strategy: z.ZodOptional<z.ZodString>;
    daily_budget: z.ZodOptional<z.ZodString>;
    lifetime_budget: z.ZodOptional<z.ZodString>;
    start_time: z.ZodOptional<z.ZodString>;
    stop_time: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    objective: CampaignObjective;
    status?: CampaignStatus | undefined;
    special_ad_categories?: string[] | undefined;
    buying_type?: string | undefined;
    bid_strategy?: string | undefined;
    daily_budget?: string | undefined;
    lifetime_budget?: string | undefined;
    start_time?: string | undefined;
    stop_time?: string | undefined;
}, {
    name: string;
    objective: CampaignObjective;
    status?: CampaignStatus | undefined;
    special_ad_categories?: string[] | undefined;
    buying_type?: string | undefined;
    bid_strategy?: string | undefined;
    daily_budget?: string | undefined;
    lifetime_budget?: string | undefined;
    start_time?: string | undefined;
    stop_time?: string | undefined;
}>;
export declare const CreateAdSetInputSchema: z.ZodObject<{
    name: z.ZodString;
    billing_event: z.ZodNativeEnum<typeof BillingEvent>;
    optimization_goal: z.ZodNativeEnum<typeof OptimizationGoal>;
    targeting: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    status: z.ZodOptional<z.ZodNativeEnum<typeof AdSetStatus>>;
    bid_amount: z.ZodOptional<z.ZodNumber>;
    daily_budget: z.ZodOptional<z.ZodString>;
    lifetime_budget: z.ZodOptional<z.ZodString>;
    start_time: z.ZodString;
    end_time: z.ZodOptional<z.ZodString>;
    promoted_object: z.ZodOptional<z.ZodObject<{
        pixel_id: z.ZodOptional<z.ZodString>;
        custom_event_type: z.ZodOptional<z.ZodString>;
        application_id: z.ZodOptional<z.ZodString>;
        object_store_url: z.ZodOptional<z.ZodString>;
        page_id: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        pixel_id?: string | undefined;
        custom_event_type?: string | undefined;
        application_id?: string | undefined;
        object_store_url?: string | undefined;
        page_id?: string | undefined;
    }, {
        pixel_id?: string | undefined;
        custom_event_type?: string | undefined;
        application_id?: string | undefined;
        object_store_url?: string | undefined;
        page_id?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    start_time: string;
    billing_event: BillingEvent;
    optimization_goal: OptimizationGoal;
    targeting: Record<string, unknown>;
    status?: AdSetStatus | undefined;
    daily_budget?: string | undefined;
    lifetime_budget?: string | undefined;
    bid_amount?: number | undefined;
    end_time?: string | undefined;
    promoted_object?: {
        pixel_id?: string | undefined;
        custom_event_type?: string | undefined;
        application_id?: string | undefined;
        object_store_url?: string | undefined;
        page_id?: string | undefined;
    } | undefined;
}, {
    name: string;
    start_time: string;
    billing_event: BillingEvent;
    optimization_goal: OptimizationGoal;
    targeting: Record<string, unknown>;
    status?: AdSetStatus | undefined;
    daily_budget?: string | undefined;
    lifetime_budget?: string | undefined;
    bid_amount?: number | undefined;
    end_time?: string | undefined;
    promoted_object?: {
        pixel_id?: string | undefined;
        custom_event_type?: string | undefined;
        application_id?: string | undefined;
        object_store_url?: string | undefined;
        page_id?: string | undefined;
    } | undefined;
}>;
export declare const CreateAdInputSchema: z.ZodObject<{
    name: z.ZodString;
    creative: z.ZodUnion<[z.ZodObject<{
        creative_id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        creative_id: string;
    }, {
        creative_id: string;
    }>, z.ZodRecord<z.ZodString, z.ZodUnknown>]>;
    status: z.ZodOptional<z.ZodNativeEnum<typeof AdStatus>>;
    tracking_specs: z.ZodOptional<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">>;
}, "strip", z.ZodTypeAny, {
    name: string;
    creative: Record<string, unknown> | {
        creative_id: string;
    };
    status?: AdStatus | undefined;
    tracking_specs?: Record<string, unknown>[] | undefined;
}, {
    name: string;
    creative: Record<string, unknown> | {
        creative_id: string;
    };
    status?: AdStatus | undefined;
    tracking_specs?: Record<string, unknown>[] | undefined;
}>;
export declare const InsightParamsSchema: z.ZodObject<{
    level: z.ZodOptional<z.ZodNativeEnum<typeof InsightLevel>>;
    date_preset: z.ZodOptional<z.ZodNativeEnum<typeof InsightDatePreset>>;
    time_range: z.ZodOptional<z.ZodObject<{
        since: z.ZodString;
        until: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        since: string;
        until: string;
    }, {
        since: string;
        until: string;
    }>>;
    time_increment: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodLiteral<"monthly">, z.ZodLiteral<"all_days">]>>;
    fields: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    breakdowns: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    filtering: z.ZodOptional<z.ZodArray<z.ZodObject<{
        field: z.ZodString;
        operator: z.ZodString;
        value: z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>;
    }, "strip", z.ZodTypeAny, {
        value: string | string[];
        field: string;
        operator: string;
    }, {
        value: string | string[];
        field: string;
        operator: string;
    }>, "many">>;
    limit: z.ZodOptional<z.ZodNumber>;
    sort: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    sort?: string[] | undefined;
    fields?: string[] | undefined;
    level?: InsightLevel | undefined;
    date_preset?: InsightDatePreset | undefined;
    time_range?: {
        since: string;
        until: string;
    } | undefined;
    time_increment?: number | "monthly" | "all_days" | undefined;
    breakdowns?: string[] | undefined;
    filtering?: {
        value: string | string[];
        field: string;
        operator: string;
    }[] | undefined;
    limit?: number | undefined;
}, {
    sort?: string[] | undefined;
    fields?: string[] | undefined;
    level?: InsightLevel | undefined;
    date_preset?: InsightDatePreset | undefined;
    time_range?: {
        since: string;
        until: string;
    } | undefined;
    time_increment?: number | "monthly" | "all_days" | undefined;
    breakdowns?: string[] | undefined;
    filtering?: {
        value: string | string[];
        field: string;
        operator: string;
    }[] | undefined;
    limit?: number | undefined;
}>;
//# sourceMappingURL=types.d.ts.map