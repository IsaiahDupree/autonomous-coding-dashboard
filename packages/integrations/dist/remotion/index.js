"use strict";
/**
 * @acd/integrations - Remotion subpackage
 *
 * Barrel export for all product-specific Remotion integration modules.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BatchJobService = exports.JobWebhookManager = exports.WaitlistLabRemotionService = exports.MediaPosterRemotionService = exports.PCTRemotionService = exports.ContentFactoryRemotionService = exports.batchJobRequestSchema = exports.batchJobItemSchema = exports.jobCallbackSchema = exports.RenderTemplate = void 0;
// ---- Shared types ----
var types_1 = require("./types");
Object.defineProperty(exports, "RenderTemplate", { enumerable: true, get: function () { return types_1.RenderTemplate; } });
Object.defineProperty(exports, "jobCallbackSchema", { enumerable: true, get: function () { return types_1.jobCallbackSchema; } });
Object.defineProperty(exports, "batchJobItemSchema", { enumerable: true, get: function () { return types_1.batchJobItemSchema; } });
Object.defineProperty(exports, "batchJobRequestSchema", { enumerable: true, get: function () { return types_1.batchJobRequestSchema; } });
// ---- Content Factory (RC-002) ----
var content_factory_1 = require("./content-factory");
Object.defineProperty(exports, "ContentFactoryRemotionService", { enumerable: true, get: function () { return content_factory_1.ContentFactoryRemotionService; } });
// ---- PCT (RC-003, RC-004) ----
var pct_1 = require("./pct");
Object.defineProperty(exports, "PCTRemotionService", { enumerable: true, get: function () { return pct_1.PCTRemotionService; } });
// ---- MediaPoster (RC-005) ----
var mediaposter_1 = require("./mediaposter");
Object.defineProperty(exports, "MediaPosterRemotionService", { enumerable: true, get: function () { return mediaposter_1.MediaPosterRemotionService; } });
// ---- WaitlistLab (RC-006) ----
var waitlistlab_1 = require("./waitlistlab");
Object.defineProperty(exports, "WaitlistLabRemotionService", { enumerable: true, get: function () { return waitlistlab_1.WaitlistLabRemotionService; } });
// ---- Webhooks (RC-007) ----
var webhooks_1 = require("./webhooks");
Object.defineProperty(exports, "JobWebhookManager", { enumerable: true, get: function () { return webhooks_1.JobWebhookManager; } });
// ---- Batch (RC-008) ----
var batch_1 = require("./batch");
Object.defineProperty(exports, "BatchJobService", { enumerable: true, get: function () { return batch_1.BatchJobService; } });
//# sourceMappingURL=index.js.map