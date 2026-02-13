"use strict";
/**
 * @acd/remotion-client
 *
 * TypeScript client SDK for consuming the Remotion API.
 *
 * @example
 * ```ts
 * import { RemotionClient } from "@acd/remotion-client";
 *
 * const client = new RemotionClient({
 *   apiUrl: "https://api.remotion.example.com",
 *   apiKey: process.env.REMOTION_API_KEY!,
 * });
 *
 * const job = await client.renderVideo({
 *   compositionId: "my-comp",
 *   inputProps: { title: "Hello World" },
 * });
 *
 * const completed = await client.waitForJob(job.id);
 * console.log("Output:", completed.outputUrl);
 * ```
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookEventType = exports.safeParseWebhookEvent = exports.parseWebhookEvent = exports.verifyWebhookSignature = exports.CircuitBreakerOpenError = exports.RemotionRateLimitError = exports.RemotionTimeoutError = exports.RemotionApiError = exports.CircuitBreakerState = exports.CircuitBreaker = exports.HttpClient = exports.RemotionClient = void 0;
// ---- Main client ----
var client_1 = require("./client");
Object.defineProperty(exports, "RemotionClient", { enumerable: true, get: function () { return client_1.RemotionClient; } });
// ---- HTTP transport ----
var http_1 = require("./http");
Object.defineProperty(exports, "HttpClient", { enumerable: true, get: function () { return http_1.HttpClient; } });
// ---- Circuit breaker ----
var circuit_breaker_1 = require("./circuit-breaker");
Object.defineProperty(exports, "CircuitBreaker", { enumerable: true, get: function () { return circuit_breaker_1.CircuitBreaker; } });
Object.defineProperty(exports, "CircuitBreakerState", { enumerable: true, get: function () { return circuit_breaker_1.CircuitBreakerState; } });
// ---- Errors ----
var errors_1 = require("./errors");
Object.defineProperty(exports, "RemotionApiError", { enumerable: true, get: function () { return errors_1.RemotionApiError; } });
Object.defineProperty(exports, "RemotionTimeoutError", { enumerable: true, get: function () { return errors_1.RemotionTimeoutError; } });
Object.defineProperty(exports, "RemotionRateLimitError", { enumerable: true, get: function () { return errors_1.RemotionRateLimitError; } });
Object.defineProperty(exports, "CircuitBreakerOpenError", { enumerable: true, get: function () { return errors_1.CircuitBreakerOpenError; } });
// ---- Webhooks ----
var webhook_1 = require("./webhook");
Object.defineProperty(exports, "verifyWebhookSignature", { enumerable: true, get: function () { return webhook_1.verifyWebhookSignature; } });
Object.defineProperty(exports, "parseWebhookEvent", { enumerable: true, get: function () { return webhook_1.parseWebhookEvent; } });
Object.defineProperty(exports, "safeParseWebhookEvent", { enumerable: true, get: function () { return webhook_1.safeParseWebhookEvent; } });
Object.defineProperty(exports, "WebhookEventType", { enumerable: true, get: function () { return webhook_1.WebhookEventType; } });
//# sourceMappingURL=index.js.map