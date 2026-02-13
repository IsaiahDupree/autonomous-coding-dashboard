"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetaPixelClient = void 0;
const crypto_1 = __importDefault(require("crypto"));
const https_1 = __importDefault(require("https"));
const url_1 = require("url");
const errors_1 = require("./errors");
const rate_limiter_1 = require("./rate-limiter");
const types_1 = require("./types");
function httpRequest(method, url, body) {
    return new Promise((resolve, reject) => {
        const parsed = new url_1.URL(url);
        const headers = {
            Accept: 'application/json',
        };
        let payload;
        if (body) {
            payload = JSON.stringify(body);
            headers['Content-Type'] = 'application/json';
            headers['Content-Length'] = Buffer.byteLength(payload).toString();
        }
        const req = https_1.default.request({
            hostname: parsed.hostname,
            port: parsed.port || 443,
            path: parsed.pathname + parsed.search,
            method,
            headers,
        }, (res) => {
            const chunks = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => {
                const raw = Buffer.concat(chunks).toString('utf-8');
                let jsonBody;
                try {
                    jsonBody = JSON.parse(raw);
                }
                catch {
                    jsonBody = raw;
                }
                const responseHeaders = {};
                for (const [key, val] of Object.entries(res.headers)) {
                    if (val !== undefined) {
                        responseHeaders[key.toLowerCase()] = Array.isArray(val) ? val.join(', ') : val;
                    }
                }
                resolve({
                    status: res.statusCode ?? 0,
                    headers: responseHeaders,
                    body: jsonBody,
                });
            });
        });
        req.on('error', reject);
        if (payload) {
            req.write(payload);
        }
        req.end();
    });
}
// ---------------------------------------------------------------------------
// SHA-256 Helper
// ---------------------------------------------------------------------------
function sha256(value) {
    return crypto_1.default.createHash('sha256').update(value).digest('hex');
}
/**
 * Check if a value is already a valid SHA-256 hex digest (64 hex characters).
 */
function isAlreadyHashed(value) {
    return /^[a-f0-9]{64}$/i.test(value);
}
/**
 * Hash a single PII value for CAPI. If it is already a 64-char hex string
 * (i.e. pre-hashed) it is returned as-is.
 */
function hashIfNeeded(value) {
    if (isAlreadyHashed(value))
        return value.toLowerCase();
    return sha256(value.toLowerCase().trim());
}
// ---------------------------------------------------------------------------
// MetaPixelClient
// ---------------------------------------------------------------------------
/**
 * Client for the Meta Conversions API (CAPI) and Pixel server-side events.
 *
 * Handles:
 * - PII hashing (SHA-256) per Meta requirements
 * - Event validation via Zod
 * - Batched event submission
 * - Rate-limit management
 * - appsecret_proof generation when appSecret is provided
 */
class MetaPixelClient {
    constructor(config, rateLimiterConfig) {
        if (!config.pixelId) {
            throw new errors_1.MetaValidationError('pixelId is required');
        }
        if (!config.accessToken) {
            throw new errors_1.MetaValidationError('accessToken is required');
        }
        this.pixelId = config.pixelId;
        this.accessToken = config.accessToken;
        this.appSecret = config.appSecret;
        this.baseUrl = `https://graph.facebook.com/${types_1.DEFAULT_API_VERSION}`;
        this.rateLimiter = new rate_limiter_1.MetaRateLimiter(rateLimiterConfig);
    }
    // =======================================================================
    // Public API
    // =======================================================================
    /**
     * Send a single Conversions API event.
     *
     * The event is validated, user data fields are hashed, and the event is
     * submitted to the Meta Graph API.
     */
    async sendEvent(event) {
        await this.sendEvents([event]);
    }
    /**
     * Send a batch of Conversions API events.
     *
     * Events are validated, user data is hashed, and they are submitted as a
     * single batch request.  Returns the number of events accepted by Meta.
     */
    async sendEvents(events) {
        if (events.length === 0) {
            return { eventsReceived: 0 };
        }
        if (events.length > 1000) {
            throw new errors_1.MetaValidationError(`Maximum 1000 events per batch, received ${events.length}`);
        }
        // Validate all events
        const validatedEvents = events.map((evt, i) => {
            try {
                return types_1.CAPIEventSchema.parse(evt);
            }
            catch (err) {
                throw new errors_1.MetaValidationError(`Invalid event at index ${i}: ${err.message}`, `events[${i}]`, { originalError: String(err) });
            }
        });
        // Hash user data in each event
        const processedEvents = validatedEvents.map((evt) => ({
            ...evt,
            user_data: this.hashUserDataForCapi(evt.user_data),
        }));
        const body = {
            data: processedEvents,
        };
        // If test_event_code is desired it can be added here in the future
        const bucketKey = `pixel:${this.pixelId}`;
        const url = this.buildUrl(`/${this.pixelId}/events`);
        const response = await this.rateLimiter.executeWithRetry(bucketKey, async () => {
            return this.rateLimiter.submit('pixel', bucketKey, async () => {
                const res = await httpRequest('POST', url, body);
                this.rateLimiter.updateFromHeaders(bucketKey, res.headers);
                if (res.status >= 400) {
                    const errorBody = res.body;
                    if (errorBody && typeof errorBody === 'object' && 'error' in errorBody) {
                        throw (0, errors_1.classifyMetaError)(errorBody, res.status, res.headers['retry-after']);
                    }
                    throw new errors_1.MetaApiError({
                        error: {
                            message: `HTTP ${res.status}: ${typeof res.body === 'string' ? res.body : JSON.stringify(res.body)}`,
                            type: 'HttpError',
                            code: res.status,
                        },
                    }, res.status);
                }
                return res.body;
            });
        }, errors_1.isMetaRateLimitError);
        return { eventsReceived: response.events_received };
    }
    /**
     * Hash user data fields according to Meta's requirements.
     *
     * Meta requires that PII fields (email, phone, name, etc.) be hashed
     * with SHA-256 before being sent to the Conversions API.  Fields that
     * are already hashed (64-character hex strings) are left as-is.
     *
     * Non-PII fields (client_ip_address, client_user_agent, fbc, fbp) are
     * passed through without hashing.
     */
    hashUserData(data) {
        const hashed = {};
        // Email - can be string or string[]
        if (data.em !== undefined) {
            if (Array.isArray(data.em)) {
                hashed.em = data.em.map((e) => hashIfNeeded(e));
            }
            else {
                hashed.em = [hashIfNeeded(data.em)];
            }
        }
        // Phone - can be string or string[]
        if (data.ph !== undefined) {
            if (Array.isArray(data.ph)) {
                hashed.ph = data.ph.map((p) => hashIfNeeded(p.replace(/\D/g, '')));
            }
            else {
                hashed.ph = [hashIfNeeded(data.ph.replace(/\D/g, ''))];
            }
        }
        // Name fields
        if (data.fn !== undefined)
            hashed.fn = hashIfNeeded(data.fn);
        if (data.ln !== undefined)
            hashed.ln = hashIfNeeded(data.ln);
        // Demographics
        if (data.ge !== undefined)
            hashed.ge = hashIfNeeded(data.ge);
        if (data.db !== undefined)
            hashed.db = hashIfNeeded(data.db);
        // Location fields
        if (data.ct !== undefined)
            hashed.ct = hashIfNeeded(data.ct.replace(/\s/g, ''));
        if (data.st !== undefined)
            hashed.st = hashIfNeeded(data.st);
        if (data.zp !== undefined)
            hashed.zp = hashIfNeeded(data.zp);
        if (data.country !== undefined)
            hashed.country = hashIfNeeded(data.country);
        // External ID - can be string or string[]
        if (data.external_id !== undefined) {
            if (Array.isArray(data.external_id)) {
                hashed.external_id = data.external_id.map((id) => hashIfNeeded(id));
            }
            else {
                hashed.external_id = [hashIfNeeded(data.external_id)];
            }
        }
        // Non-PII passthrough fields
        if (data.client_ip_address !== undefined)
            hashed.client_ip_address = data.client_ip_address;
        if (data.client_user_agent !== undefined)
            hashed.client_user_agent = data.client_user_agent;
        if (data.fbc !== undefined)
            hashed.fbc = data.fbc;
        if (data.fbp !== undefined)
            hashed.fbp = data.fbp;
        if (data.subscription_id !== undefined)
            hashed.subscription_id = data.subscription_id;
        if (data.lead_id !== undefined)
            hashed.lead_id = data.lead_id;
        return hashed;
    }
    // =======================================================================
    // Convenience Helpers
    // =======================================================================
    /**
     * Create a standard PageView event for CAPI.
     */
    createPageViewEvent(userData, eventSourceUrl, eventId) {
        return {
            event_name: 'PageView',
            event_time: Math.floor(Date.now() / 1000),
            user_data: userData,
            event_source_url: eventSourceUrl,
            action_source: types_1.ActionSource.WEBSITE,
            event_id: eventId,
        };
    }
    /**
     * Create a standard Purchase event for CAPI.
     */
    createPurchaseEvent(userData, value, currency, eventSourceUrl, contentIds, eventId) {
        return {
            event_name: 'Purchase',
            event_time: Math.floor(Date.now() / 1000),
            user_data: userData,
            custom_data: {
                value,
                currency,
                content_ids: contentIds,
                content_type: 'product',
            },
            event_source_url: eventSourceUrl,
            action_source: types_1.ActionSource.WEBSITE,
            event_id: eventId,
        };
    }
    /**
     * Create a standard Lead event for CAPI.
     */
    createLeadEvent(userData, eventSourceUrl, value, currency, eventId) {
        return {
            event_name: 'Lead',
            event_time: Math.floor(Date.now() / 1000),
            user_data: userData,
            custom_data: value !== undefined
                ? { value, currency: currency ?? 'USD' }
                : undefined,
            event_source_url: eventSourceUrl,
            action_source: types_1.ActionSource.WEBSITE,
            event_id: eventId,
        };
    }
    /**
     * Create a standard CompleteRegistration event for CAPI.
     */
    createRegistrationEvent(userData, eventSourceUrl, value, currency, eventId) {
        return {
            event_name: 'CompleteRegistration',
            event_time: Math.floor(Date.now() / 1000),
            user_data: userData,
            custom_data: value !== undefined
                ? { value, currency: currency ?? 'USD' }
                : undefined,
            event_source_url: eventSourceUrl,
            action_source: types_1.ActionSource.WEBSITE,
            event_id: eventId,
        };
    }
    /**
     * Expose the underlying rate limiter for advanced use cases.
     */
    getRateLimiter() {
        return this.rateLimiter;
    }
    /**
     * Gracefully shut down the pixel client.
     */
    shutdown() {
        this.rateLimiter.shutdown();
    }
    // =======================================================================
    // Private Helpers
    // =======================================================================
    /**
     * Hash user data for CAPI submission.  Unlike the public `hashUserData`
     * this returns a plain object suitable for the CAPI event payload.
     */
    hashUserDataForCapi(data) {
        const hashed = this.hashUserData(data);
        // Convert to a plain object, removing undefined fields
        const result = {};
        for (const [key, value] of Object.entries(hashed)) {
            if (value !== undefined) {
                result[key] = value;
            }
        }
        return result;
    }
    buildUrl(path) {
        const params = new url_1.URLSearchParams();
        params.set('access_token', this.accessToken);
        if (this.appSecret) {
            const proof = crypto_1.default
                .createHmac('sha256', this.appSecret)
                .update(this.accessToken)
                .digest('hex');
            params.set('appsecret_proof', proof);
        }
        return `${this.baseUrl}${path}?${params.toString()}`;
    }
}
exports.MetaPixelClient = MetaPixelClient;
//# sourceMappingURL=pixel.js.map