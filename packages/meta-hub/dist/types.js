"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InsightParamsSchema = exports.CreateAdInputSchema = exports.CreateAdSetInputSchema = exports.CreateCampaignInputSchema = exports.CAPIEventSchema = exports.DateRangeSchema = exports.AudienceSubtype = exports.InsightDatePreset = exports.InsightLevel = exports.ActionSource = exports.OptimizationGoal = exports.BillingEvent = exports.AdStatus = exports.AdSetStatus = exports.CampaignStatus = exports.CampaignObjective = exports.DEFAULT_API_VERSION = void 0;
const zod_1 = require("zod");
// ---------------------------------------------------------------------------
// Meta API Version
// ---------------------------------------------------------------------------
exports.DEFAULT_API_VERSION = 'v19.0';
// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
var CampaignObjective;
(function (CampaignObjective) {
    CampaignObjective["OUTCOME_AWARENESS"] = "OUTCOME_AWARENESS";
    CampaignObjective["OUTCOME_ENGAGEMENT"] = "OUTCOME_ENGAGEMENT";
    CampaignObjective["OUTCOME_LEADS"] = "OUTCOME_LEADS";
    CampaignObjective["OUTCOME_SALES"] = "OUTCOME_SALES";
    CampaignObjective["OUTCOME_TRAFFIC"] = "OUTCOME_TRAFFIC";
    CampaignObjective["OUTCOME_APP_PROMOTION"] = "OUTCOME_APP_PROMOTION";
})(CampaignObjective || (exports.CampaignObjective = CampaignObjective = {}));
var CampaignStatus;
(function (CampaignStatus) {
    CampaignStatus["ACTIVE"] = "ACTIVE";
    CampaignStatus["PAUSED"] = "PAUSED";
    CampaignStatus["DELETED"] = "DELETED";
    CampaignStatus["ARCHIVED"] = "ARCHIVED";
})(CampaignStatus || (exports.CampaignStatus = CampaignStatus = {}));
var AdSetStatus;
(function (AdSetStatus) {
    AdSetStatus["ACTIVE"] = "ACTIVE";
    AdSetStatus["PAUSED"] = "PAUSED";
    AdSetStatus["DELETED"] = "DELETED";
    AdSetStatus["ARCHIVED"] = "ARCHIVED";
})(AdSetStatus || (exports.AdSetStatus = AdSetStatus = {}));
var AdStatus;
(function (AdStatus) {
    AdStatus["ACTIVE"] = "ACTIVE";
    AdStatus["PAUSED"] = "PAUSED";
    AdStatus["DELETED"] = "DELETED";
    AdStatus["ARCHIVED"] = "ARCHIVED";
})(AdStatus || (exports.AdStatus = AdStatus = {}));
var BillingEvent;
(function (BillingEvent) {
    BillingEvent["IMPRESSIONS"] = "IMPRESSIONS";
    BillingEvent["LINK_CLICKS"] = "LINK_CLICKS";
    BillingEvent["APP_INSTALLS"] = "APP_INSTALLS";
    BillingEvent["PAGE_LIKES"] = "PAGE_LIKES";
    BillingEvent["POST_ENGAGEMENT"] = "POST_ENGAGEMENT";
})(BillingEvent || (exports.BillingEvent = BillingEvent = {}));
var OptimizationGoal;
(function (OptimizationGoal) {
    OptimizationGoal["IMPRESSIONS"] = "IMPRESSIONS";
    OptimizationGoal["REACH"] = "REACH";
    OptimizationGoal["LINK_CLICKS"] = "LINK_CLICKS";
    OptimizationGoal["LANDING_PAGE_VIEWS"] = "LANDING_PAGE_VIEWS";
    OptimizationGoal["OFFSITE_CONVERSIONS"] = "OFFSITE_CONVERSIONS";
    OptimizationGoal["LEAD_GENERATION"] = "LEAD_GENERATION";
    OptimizationGoal["APP_INSTALLS"] = "APP_INSTALLS";
    OptimizationGoal["VALUE"] = "VALUE";
})(OptimizationGoal || (exports.OptimizationGoal = OptimizationGoal = {}));
var ActionSource;
(function (ActionSource) {
    ActionSource["EMAIL"] = "email";
    ActionSource["WEBSITE"] = "website";
    ActionSource["APP"] = "app";
    ActionSource["PHONE_CALL"] = "phone_call";
    ActionSource["CHAT"] = "chat";
    ActionSource["PHYSICAL_STORE"] = "physical_store";
    ActionSource["SYSTEM_GENERATED"] = "system_generated";
    ActionSource["OTHER"] = "other";
})(ActionSource || (exports.ActionSource = ActionSource = {}));
var InsightLevel;
(function (InsightLevel) {
    InsightLevel["ACCOUNT"] = "account";
    InsightLevel["CAMPAIGN"] = "campaign";
    InsightLevel["ADSET"] = "adset";
    InsightLevel["AD"] = "ad";
})(InsightLevel || (exports.InsightLevel = InsightLevel = {}));
var InsightDatePreset;
(function (InsightDatePreset) {
    InsightDatePreset["TODAY"] = "today";
    InsightDatePreset["YESTERDAY"] = "yesterday";
    InsightDatePreset["THIS_MONTH"] = "this_month";
    InsightDatePreset["LAST_MONTH"] = "last_month";
    InsightDatePreset["THIS_QUARTER"] = "this_quarter";
    InsightDatePreset["LAST_3D"] = "last_3d";
    InsightDatePreset["LAST_7D"] = "last_7d";
    InsightDatePreset["LAST_14D"] = "last_14d";
    InsightDatePreset["LAST_28D"] = "last_28d";
    InsightDatePreset["LAST_30D"] = "last_30d";
    InsightDatePreset["LAST_90D"] = "last_90d";
    InsightDatePreset["LAST_WEEK_MON_SUN"] = "last_week_mon_sun";
    InsightDatePreset["LAST_WEEK_SUN_SAT"] = "last_week_sun_sat";
    InsightDatePreset["LAST_QUARTER"] = "last_quarter";
    InsightDatePreset["LAST_YEAR"] = "last_year";
    InsightDatePreset["THIS_WEEK_MON_TODAY"] = "this_week_mon_today";
    InsightDatePreset["THIS_WEEK_SUN_TODAY"] = "this_week_sun_today";
    InsightDatePreset["THIS_YEAR"] = "this_year";
})(InsightDatePreset || (exports.InsightDatePreset = InsightDatePreset = {}));
var AudienceSubtype;
(function (AudienceSubtype) {
    AudienceSubtype["CUSTOM"] = "CUSTOM";
    AudienceSubtype["WEBSITE"] = "WEBSITE";
    AudienceSubtype["APP"] = "APP";
    AudienceSubtype["OFFLINE"] = "OFFLINE";
    AudienceSubtype["ENGAGEMENT"] = "ENGAGEMENT";
    AudienceSubtype["LOOKALIKE"] = "LOOKALIKE";
})(AudienceSubtype || (exports.AudienceSubtype = AudienceSubtype = {}));
// ---------------------------------------------------------------------------
// Zod Schemas for Runtime Validation
// ---------------------------------------------------------------------------
exports.DateRangeSchema = zod_1.z.object({
    since: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    until: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
exports.CAPIEventSchema = zod_1.z.object({
    event_name: zod_1.z.string().min(1),
    event_time: zod_1.z.number().int().positive(),
    user_data: zod_1.z.object({
        em: zod_1.z.union([zod_1.z.string(), zod_1.z.array(zod_1.z.string())]).optional(),
        ph: zod_1.z.union([zod_1.z.string(), zod_1.z.array(zod_1.z.string())]).optional(),
        fn: zod_1.z.string().optional(),
        ln: zod_1.z.string().optional(),
        ge: zod_1.z.string().optional(),
        db: zod_1.z.string().optional(),
        ct: zod_1.z.string().optional(),
        st: zod_1.z.string().optional(),
        zp: zod_1.z.string().optional(),
        country: zod_1.z.string().optional(),
        external_id: zod_1.z.union([zod_1.z.string(), zod_1.z.array(zod_1.z.string())]).optional(),
        client_ip_address: zod_1.z.string().optional(),
        client_user_agent: zod_1.z.string().optional(),
        fbc: zod_1.z.string().optional(),
        fbp: zod_1.z.string().optional(),
        subscription_id: zod_1.z.string().optional(),
        lead_id: zod_1.z.string().optional(),
    }),
    custom_data: zod_1.z.record(zod_1.z.unknown()).optional(),
    event_source_url: zod_1.z.string().url().optional(),
    action_source: zod_1.z.nativeEnum(ActionSource),
    event_id: zod_1.z.string().optional(),
    opt_out: zod_1.z.boolean().optional(),
    data_processing_options: zod_1.z.array(zod_1.z.string()).optional(),
    data_processing_options_country: zod_1.z.number().optional(),
    data_processing_options_state: zod_1.z.number().optional(),
});
exports.CreateCampaignInputSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    objective: zod_1.z.nativeEnum(CampaignObjective),
    status: zod_1.z.nativeEnum(CampaignStatus).optional(),
    special_ad_categories: zod_1.z.array(zod_1.z.string()).optional(),
    buying_type: zod_1.z.string().optional(),
    bid_strategy: zod_1.z.string().optional(),
    daily_budget: zod_1.z.string().optional(),
    lifetime_budget: zod_1.z.string().optional(),
    start_time: zod_1.z.string().optional(),
    stop_time: zod_1.z.string().optional(),
});
exports.CreateAdSetInputSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    billing_event: zod_1.z.nativeEnum(BillingEvent),
    optimization_goal: zod_1.z.nativeEnum(OptimizationGoal),
    targeting: zod_1.z.record(zod_1.z.unknown()),
    status: zod_1.z.nativeEnum(AdSetStatus).optional(),
    bid_amount: zod_1.z.number().optional(),
    daily_budget: zod_1.z.string().optional(),
    lifetime_budget: zod_1.z.string().optional(),
    start_time: zod_1.z.string(),
    end_time: zod_1.z.string().optional(),
    promoted_object: zod_1.z.object({
        pixel_id: zod_1.z.string().optional(),
        custom_event_type: zod_1.z.string().optional(),
        application_id: zod_1.z.string().optional(),
        object_store_url: zod_1.z.string().optional(),
        page_id: zod_1.z.string().optional(),
    }).optional(),
});
exports.CreateAdInputSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    creative: zod_1.z.union([
        zod_1.z.object({ creative_id: zod_1.z.string() }),
        zod_1.z.record(zod_1.z.unknown()),
    ]),
    status: zod_1.z.nativeEnum(AdStatus).optional(),
    tracking_specs: zod_1.z.array(zod_1.z.record(zod_1.z.unknown())).optional(),
});
exports.InsightParamsSchema = zod_1.z.object({
    level: zod_1.z.nativeEnum(InsightLevel).optional(),
    date_preset: zod_1.z.nativeEnum(InsightDatePreset).optional(),
    time_range: exports.DateRangeSchema.optional(),
    time_increment: zod_1.z.union([zod_1.z.number(), zod_1.z.literal('monthly'), zod_1.z.literal('all_days')]).optional(),
    fields: zod_1.z.array(zod_1.z.string()).optional(),
    breakdowns: zod_1.z.array(zod_1.z.string()).optional(),
    filtering: zod_1.z.array(zod_1.z.object({
        field: zod_1.z.string(),
        operator: zod_1.z.string(),
        value: zod_1.z.union([zod_1.z.string(), zod_1.z.array(zod_1.z.string())]),
    })).optional(),
    limit: zod_1.z.number().optional(),
    sort: zod_1.z.array(zod_1.z.string()).optional(),
});
//# sourceMappingURL=types.js.map