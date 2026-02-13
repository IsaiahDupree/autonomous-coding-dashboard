"use strict";
// @acd/meta-hub - Shared Meta Marketing API client library
// Used by WaitlistLab, PCT, and Content Factory
Object.defineProperty(exports, "__esModule", { value: true });
exports.InsightParamsSchema = exports.CreateAdInputSchema = exports.CreateAdSetInputSchema = exports.CreateCampaignInputSchema = exports.CAPIEventSchema = exports.DateRangeSchema = exports.DEFAULT_API_VERSION = exports.AudienceSubtype = exports.InsightDatePreset = exports.InsightLevel = exports.ActionSource = exports.OptimizationGoal = exports.BillingEvent = exports.AdStatus = exports.AdSetStatus = exports.CampaignStatus = exports.CampaignObjective = exports.isMetaValidationError = exports.isMetaAuthError = exports.isMetaRateLimitError = exports.isMetaApiError = exports.classifyMetaError = exports.MetaValidationError = exports.MetaAuthError = exports.MetaRateLimitError = exports.MetaApiError = exports.MetaRateLimiter = exports.MetaPixelClient = exports.MetaHubClient = void 0;
// ---------------------------------------------------------------------------
// Client Classes
// ---------------------------------------------------------------------------
var client_1 = require("./client");
Object.defineProperty(exports, "MetaHubClient", { enumerable: true, get: function () { return client_1.MetaHubClient; } });
var pixel_1 = require("./pixel");
Object.defineProperty(exports, "MetaPixelClient", { enumerable: true, get: function () { return pixel_1.MetaPixelClient; } });
var rate_limiter_1 = require("./rate-limiter");
Object.defineProperty(exports, "MetaRateLimiter", { enumerable: true, get: function () { return rate_limiter_1.MetaRateLimiter; } });
// ---------------------------------------------------------------------------
// Error Classes & Helpers
// ---------------------------------------------------------------------------
var errors_1 = require("./errors");
Object.defineProperty(exports, "MetaApiError", { enumerable: true, get: function () { return errors_1.MetaApiError; } });
Object.defineProperty(exports, "MetaRateLimitError", { enumerable: true, get: function () { return errors_1.MetaRateLimitError; } });
Object.defineProperty(exports, "MetaAuthError", { enumerable: true, get: function () { return errors_1.MetaAuthError; } });
Object.defineProperty(exports, "MetaValidationError", { enumerable: true, get: function () { return errors_1.MetaValidationError; } });
Object.defineProperty(exports, "classifyMetaError", { enumerable: true, get: function () { return errors_1.classifyMetaError; } });
Object.defineProperty(exports, "isMetaApiError", { enumerable: true, get: function () { return errors_1.isMetaApiError; } });
Object.defineProperty(exports, "isMetaRateLimitError", { enumerable: true, get: function () { return errors_1.isMetaRateLimitError; } });
Object.defineProperty(exports, "isMetaAuthError", { enumerable: true, get: function () { return errors_1.isMetaAuthError; } });
Object.defineProperty(exports, "isMetaValidationError", { enumerable: true, get: function () { return errors_1.isMetaValidationError; } });
// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
var types_1 = require("./types");
Object.defineProperty(exports, "CampaignObjective", { enumerable: true, get: function () { return types_1.CampaignObjective; } });
Object.defineProperty(exports, "CampaignStatus", { enumerable: true, get: function () { return types_1.CampaignStatus; } });
Object.defineProperty(exports, "AdSetStatus", { enumerable: true, get: function () { return types_1.AdSetStatus; } });
Object.defineProperty(exports, "AdStatus", { enumerable: true, get: function () { return types_1.AdStatus; } });
Object.defineProperty(exports, "BillingEvent", { enumerable: true, get: function () { return types_1.BillingEvent; } });
Object.defineProperty(exports, "OptimizationGoal", { enumerable: true, get: function () { return types_1.OptimizationGoal; } });
Object.defineProperty(exports, "ActionSource", { enumerable: true, get: function () { return types_1.ActionSource; } });
Object.defineProperty(exports, "InsightLevel", { enumerable: true, get: function () { return types_1.InsightLevel; } });
Object.defineProperty(exports, "InsightDatePreset", { enumerable: true, get: function () { return types_1.InsightDatePreset; } });
Object.defineProperty(exports, "AudienceSubtype", { enumerable: true, get: function () { return types_1.AudienceSubtype; } });
Object.defineProperty(exports, "DEFAULT_API_VERSION", { enumerable: true, get: function () { return types_1.DEFAULT_API_VERSION; } });
// ---------------------------------------------------------------------------
// Zod Schemas (for runtime validation)
// ---------------------------------------------------------------------------
var types_2 = require("./types");
Object.defineProperty(exports, "DateRangeSchema", { enumerable: true, get: function () { return types_2.DateRangeSchema; } });
Object.defineProperty(exports, "CAPIEventSchema", { enumerable: true, get: function () { return types_2.CAPIEventSchema; } });
Object.defineProperty(exports, "CreateCampaignInputSchema", { enumerable: true, get: function () { return types_2.CreateCampaignInputSchema; } });
Object.defineProperty(exports, "CreateAdSetInputSchema", { enumerable: true, get: function () { return types_2.CreateAdSetInputSchema; } });
Object.defineProperty(exports, "CreateAdInputSchema", { enumerable: true, get: function () { return types_2.CreateAdInputSchema; } });
Object.defineProperty(exports, "InsightParamsSchema", { enumerable: true, get: function () { return types_2.InsightParamsSchema; } });
//# sourceMappingURL=index.js.map