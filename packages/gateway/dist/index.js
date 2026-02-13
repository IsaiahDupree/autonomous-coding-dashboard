"use strict";
// ─── @acd/gateway ────────────────────────────────────────────────────────────
// API Gateway package for the Autonomous Coding Dashboard
// Features: GW-001 through GW-005
Object.defineProperty(exports, "__esModule", { value: true });
exports.versionMiddleware = exports.loggingMiddleware = exports.rateLimitMiddleware = exports.apiKeyMiddleware = exports.createGatewayMiddleware = exports.GraphQLGateway = exports.ApiVersionManager = exports.AuditTrail = exports.RequestLogger = exports.InMemoryRateLimitStore = exports.GatewayRateLimiter = exports.InMemoryKeyStore = exports.ApiKeyManager = exports.ServiceDefinitionSchema = exports.AuditActionSchema = exports.GatewayConfigSchema = exports.ApiVersionSchema = exports.RequestLogSchema = exports.RateLimitInfoSchema = exports.RateLimitConfigSchema = exports.ApiKeyRecordSchema = void 0;
// Types and Zod schemas
var types_1 = require("./types");
Object.defineProperty(exports, "ApiKeyRecordSchema", { enumerable: true, get: function () { return types_1.ApiKeyRecordSchema; } });
Object.defineProperty(exports, "RateLimitConfigSchema", { enumerable: true, get: function () { return types_1.RateLimitConfigSchema; } });
Object.defineProperty(exports, "RateLimitInfoSchema", { enumerable: true, get: function () { return types_1.RateLimitInfoSchema; } });
Object.defineProperty(exports, "RequestLogSchema", { enumerable: true, get: function () { return types_1.RequestLogSchema; } });
Object.defineProperty(exports, "ApiVersionSchema", { enumerable: true, get: function () { return types_1.ApiVersionSchema; } });
Object.defineProperty(exports, "GatewayConfigSchema", { enumerable: true, get: function () { return types_1.GatewayConfigSchema; } });
Object.defineProperty(exports, "AuditActionSchema", { enumerable: true, get: function () { return types_1.AuditActionSchema; } });
Object.defineProperty(exports, "ServiceDefinitionSchema", { enumerable: true, get: function () { return types_1.ServiceDefinitionSchema; } });
// GW-001: API Key Management
var api_keys_1 = require("./api-keys");
Object.defineProperty(exports, "ApiKeyManager", { enumerable: true, get: function () { return api_keys_1.ApiKeyManager; } });
Object.defineProperty(exports, "InMemoryKeyStore", { enumerable: true, get: function () { return api_keys_1.InMemoryKeyStore; } });
// GW-002: Per-Consumer Rate Limiting
var rate_limiter_1 = require("./rate-limiter");
Object.defineProperty(exports, "GatewayRateLimiter", { enumerable: true, get: function () { return rate_limiter_1.GatewayRateLimiter; } });
Object.defineProperty(exports, "InMemoryRateLimitStore", { enumerable: true, get: function () { return rate_limiter_1.InMemoryRateLimitStore; } });
// GW-003: Request Logging / Audit
var logger_1 = require("./logger");
Object.defineProperty(exports, "RequestLogger", { enumerable: true, get: function () { return logger_1.RequestLogger; } });
Object.defineProperty(exports, "AuditTrail", { enumerable: true, get: function () { return logger_1.AuditTrail; } });
// GW-004: API Versioning
var versioning_1 = require("./versioning");
Object.defineProperty(exports, "ApiVersionManager", { enumerable: true, get: function () { return versioning_1.ApiVersionManager; } });
// GW-005: GraphQL Gateway
var graphql_1 = require("./graphql");
Object.defineProperty(exports, "GraphQLGateway", { enumerable: true, get: function () { return graphql_1.GraphQLGateway; } });
// Express Middleware
var middleware_1 = require("./middleware");
Object.defineProperty(exports, "createGatewayMiddleware", { enumerable: true, get: function () { return middleware_1.createGatewayMiddleware; } });
Object.defineProperty(exports, "apiKeyMiddleware", { enumerable: true, get: function () { return middleware_1.apiKeyMiddleware; } });
Object.defineProperty(exports, "rateLimitMiddleware", { enumerable: true, get: function () { return middleware_1.rateLimitMiddleware; } });
Object.defineProperty(exports, "loggingMiddleware", { enumerable: true, get: function () { return middleware_1.loggingMiddleware; } });
Object.defineProperty(exports, "versionMiddleware", { enumerable: true, get: function () { return middleware_1.versionMiddleware; } });
//# sourceMappingURL=index.js.map