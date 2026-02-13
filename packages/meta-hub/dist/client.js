"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetaHubClient = void 0;
const https_1 = __importDefault(require("https"));
const url_1 = require("url");
const errors_1 = require("./errors");
const rate_limiter_1 = require("./rate-limiter");
const types_1 = require("./types");
const crypto_1 = __importDefault(require("crypto"));
/**
 * Minimal HTTPS request wrapper that uses only the Node.js built-in `https`
 * module.  Returns a parsed JSON body along with status code and headers.
 */
function httpRequest(method, url, body, headers) {
    return new Promise((resolve, reject) => {
        const parsed = new url_1.URL(url);
        const reqHeaders = {
            Accept: 'application/json',
            ...headers,
        };
        let payload;
        if (body && (method === 'POST' || method === 'DELETE')) {
            payload = JSON.stringify(body);
            reqHeaders['Content-Type'] = 'application/json';
            reqHeaders['Content-Length'] = Buffer.byteLength(payload).toString();
        }
        const req = https_1.default.request({
            hostname: parsed.hostname,
            port: parsed.port || 443,
            path: parsed.pathname + parsed.search,
            method,
            headers: reqHeaders,
        }, (res) => {
            const chunks = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => {
                const raw = Buffer.concat(chunks).toString('utf-8');
                let parsed;
                try {
                    parsed = JSON.parse(raw);
                }
                catch {
                    parsed = raw;
                }
                // Normalise header keys to lower-case
                const responseHeaders = {};
                for (const [key, val] of Object.entries(res.headers)) {
                    if (val !== undefined) {
                        responseHeaders[key.toLowerCase()] = Array.isArray(val) ? val.join(', ') : val;
                    }
                }
                resolve({
                    status: res.statusCode ?? 0,
                    headers: responseHeaders,
                    body: parsed,
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
// Default Insight Fields
// ---------------------------------------------------------------------------
const DEFAULT_INSIGHT_FIELDS = [
    'campaign_id',
    'campaign_name',
    'adset_id',
    'adset_name',
    'ad_id',
    'ad_name',
    'impressions',
    'clicks',
    'spend',
    'reach',
    'frequency',
    'cpc',
    'cpm',
    'ctr',
    'actions',
    'conversions',
    'cost_per_action_type',
    'cost_per_conversion',
    'purchase_roas',
];
// ---------------------------------------------------------------------------
// MetaHubClient
// ---------------------------------------------------------------------------
/**
 * Full-featured client for the Meta Marketing API (Graph API).
 *
 * Covers campaigns, ad sets, ads, creatives, insights, and custom audiences.
 * Includes built-in rate-limit management via {@link MetaRateLimiter}.
 */
class MetaHubClient {
    constructor(config, rateLimiterConfig, consumer = 'default') {
        if (!config.accessToken) {
            throw new errors_1.MetaValidationError('accessToken is required');
        }
        this.accessToken = config.accessToken;
        this.apiVersion = config.apiVersion ?? types_1.DEFAULT_API_VERSION;
        this.appSecret = config.appSecret;
        this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;
        this.rateLimiter = new rate_limiter_1.MetaRateLimiter(rateLimiterConfig);
        this.consumer = consumer;
    }
    // =======================================================================
    // Campaigns
    // =======================================================================
    async createCampaign(accountId, input) {
        const validated = types_1.CreateCampaignInputSchema.parse(input);
        const body = {
            ...validated,
            special_ad_categories: validated.special_ad_categories ?? [],
        };
        const res = await this.post(`/act_${this.stripActPrefix(accountId)}/campaigns`, body);
        return this.getCampaign(res.id);
    }
    async getCampaign(campaignId) {
        return this.get(`/${campaignId}`, {
            fields: [
                'id', 'name', 'account_id', 'objective', 'status', 'effective_status',
                'buying_type', 'bid_strategy', 'daily_budget', 'lifetime_budget',
                'budget_remaining', 'special_ad_categories', 'created_time',
                'updated_time', 'start_time', 'stop_time',
            ].join(','),
        });
    }
    async updateCampaign(campaignId, updates) {
        await this.post(`/${campaignId}`, updates);
        return this.getCampaign(campaignId);
    }
    async deleteCampaign(campaignId) {
        await this.delete(`/${campaignId}`);
    }
    // =======================================================================
    // Ad Sets
    // =======================================================================
    async createAdSet(campaignId, input) {
        const validated = types_1.CreateAdSetInputSchema.parse(input);
        // Look up campaign to get account_id
        const campaign = await this.getCampaign(campaignId);
        const body = {
            ...validated,
            campaign_id: campaignId,
            targeting: JSON.stringify(validated.targeting),
        };
        const res = await this.post(`/act_${this.stripActPrefix(campaign.account_id)}/adsets`, body);
        return this.getAdSet(res.id);
    }
    async getAdSet(adSetId) {
        return this.get(`/${adSetId}`, {
            fields: [
                'id', 'name', 'campaign_id', 'account_id', 'status', 'effective_status',
                'billing_event', 'optimization_goal', 'bid_amount', 'daily_budget',
                'lifetime_budget', 'budget_remaining', 'targeting', 'start_time',
                'end_time', 'created_time', 'updated_time',
            ].join(','),
        });
    }
    async updateAdSet(adSetId, updates) {
        const body = { ...updates };
        if (updates.targeting) {
            body.targeting = JSON.stringify(updates.targeting);
        }
        await this.post(`/${adSetId}`, body);
        return this.getAdSet(adSetId);
    }
    // =======================================================================
    // Ads
    // =======================================================================
    async createAd(adSetId, input) {
        const validated = types_1.CreateAdInputSchema.parse(input);
        // Look up adset to get account_id
        const adSet = await this.getAdSet(adSetId);
        const body = {
            ...validated,
            adset_id: adSetId,
        };
        if (validated.creative && 'creative_id' in validated.creative) {
            body.creative = JSON.stringify({ creative_id: validated.creative.creative_id });
        }
        else {
            body.creative = JSON.stringify(validated.creative);
        }
        const res = await this.post(`/act_${this.stripActPrefix(adSet.account_id)}/ads`, body);
        return this.getAd(res.id);
    }
    async getAd(adId) {
        return this.get(`/${adId}`, {
            fields: [
                'id', 'name', 'adset_id', 'campaign_id', 'account_id', 'status',
                'effective_status', 'creative', 'tracking_specs', 'created_time',
                'updated_time',
            ].join(','),
        });
    }
    async updateAd(adId, updates) {
        const body = { ...updates };
        if (updates.creative) {
            body.creative = JSON.stringify(updates.creative);
        }
        await this.post(`/${adId}`, body);
        return this.getAd(adId);
    }
    // =======================================================================
    // Creatives
    // =======================================================================
    async createAdCreative(accountId, input) {
        const body = { ...input };
        if (input.object_story_spec) {
            body.object_story_spec = JSON.stringify(input.object_story_spec);
        }
        const res = await this.post(`/act_${this.stripActPrefix(accountId)}/adcreatives`, body);
        return this.get(`/${res.id}`, {
            fields: [
                'id', 'name', 'account_id', 'title', 'body', 'image_hash', 'image_url',
                'video_id', 'thumbnail_url', 'link_url', 'call_to_action_type',
                'object_story_spec',
            ].join(','),
        });
    }
    async uploadImage(accountId, imageUrl) {
        const res = await this.post(`/act_${this.stripActPrefix(accountId)}/adimages`, { url: imageUrl });
        // The response is keyed by a generated filename
        const keys = Object.keys(res.images ?? {});
        if (keys.length === 0) {
            throw new errors_1.MetaApiError({
                error: {
                    message: 'Image upload returned no image data',
                    type: 'GraphMethodException',
                    code: 100,
                },
            }, 400);
        }
        const img = res.images[keys[0]];
        return { hash: img.hash, url: img.url };
    }
    async uploadVideo(accountId, videoUrl) {
        const res = await this.post(`/act_${this.stripActPrefix(accountId)}/advideos`, { file_url: videoUrl });
        return { videoId: res.id };
    }
    // =======================================================================
    // Insights
    // =======================================================================
    async getInsights(objectId, params) {
        const validated = types_1.InsightParamsSchema.parse(params);
        const query = {};
        if (validated.fields && validated.fields.length > 0) {
            query.fields = validated.fields.join(',');
        }
        else {
            query.fields = DEFAULT_INSIGHT_FIELDS.join(',');
        }
        if (validated.level)
            query.level = validated.level;
        if (validated.date_preset)
            query.date_preset = validated.date_preset;
        if (validated.time_range)
            query.time_range = JSON.stringify(validated.time_range);
        if (validated.time_increment !== undefined)
            query.time_increment = String(validated.time_increment);
        if (validated.breakdowns && validated.breakdowns.length > 0)
            query.breakdowns = validated.breakdowns.join(',');
        if (validated.filtering)
            query.filtering = JSON.stringify(validated.filtering);
        if (validated.limit !== undefined)
            query.limit = String(validated.limit);
        if (validated.sort && validated.sort.length > 0)
            query.sort = JSON.stringify(validated.sort);
        const res = await this.get(`/${objectId}/insights`, query);
        return res.data ?? [];
    }
    async getCampaignInsights(campaignId, dateRange) {
        return this.getInsights(campaignId, {
            time_range: dateRange,
            level: undefined, // defaults to campaign since we are querying a campaign object
        });
    }
    async getAdSetInsights(adSetId, dateRange) {
        return this.getInsights(adSetId, {
            time_range: dateRange,
        });
    }
    async getAdInsights(adId, dateRange) {
        return this.getInsights(adId, {
            time_range: dateRange,
        });
    }
    // =======================================================================
    // Custom Audiences
    // =======================================================================
    async createCustomAudience(accountId, input) {
        const body = { ...input };
        if (input.rule) {
            body.rule = input.rule;
        }
        if (input.lookalike_spec) {
            body.lookalike_spec = JSON.stringify(input.lookalike_spec);
        }
        const res = await this.post(`/act_${this.stripActPrefix(accountId)}/customaudiences`, body);
        return this.get(`/${res.id}`, {
            fields: [
                'id', 'name', 'account_id', 'description', 'subtype', 'approximate_count',
                'customer_file_source', 'data_source', 'delivery_status', 'lookalike_spec',
                'retention_days', 'rule', 'created_time',
            ].join(','),
        });
    }
    async addUsersToAudience(audienceId, users) {
        const schema = this.buildAudienceSchema(users);
        const data = users.map((u) => this.hashAudienceUser(u));
        await this.post(`/${audienceId}/users`, {
            payload: JSON.stringify({
                schema,
                data,
            }),
        });
    }
    async removeUsersFromAudience(audienceId, users) {
        const schema = this.buildAudienceSchema(users);
        const data = users.map((u) => this.hashAudienceUser(u));
        await this.delete(`/${audienceId}/users`, {
            payload: JSON.stringify({
                schema,
                data,
            }),
        });
    }
    async createLookalikeAudience(sourceAudienceId, country, ratio) {
        // Get source audience to find account_id
        const source = await this.get(`/${sourceAudienceId}`, {
            fields: 'id,name,account_id',
        });
        return this.createCustomAudience(source.account_id, {
            name: `Lookalike (${country}, ${Math.round(ratio * 100)}%) - ${source.name}`,
            subtype: types_1.AudienceSubtype.LOOKALIKE,
            lookalike_spec: {
                origin_audience_id: sourceAudienceId,
                country,
                ratio,
            },
        });
    }
    // =======================================================================
    // Rate Limiter Access
    // =======================================================================
    /**
     * Expose the underlying rate limiter for advanced use cases.
     */
    getRateLimiter() {
        return this.rateLimiter;
    }
    /**
     * Gracefully shut down the client, draining rate-limiter queues.
     */
    shutdown() {
        this.rateLimiter.shutdown();
    }
    // =======================================================================
    // Internal HTTP Methods
    // =======================================================================
    async get(path, params) {
        const url = this.buildUrl(path, params);
        return this.request('GET', url);
    }
    async post(path, body) {
        const url = this.buildUrl(path);
        return this.request('POST', url, body);
    }
    async delete(path, body) {
        const url = this.buildUrl(path);
        await this.request('DELETE', url, body);
    }
    buildUrl(path, params) {
        const searchParams = new url_1.URLSearchParams(params);
        searchParams.set('access_token', this.accessToken);
        // If appsecret_proof is required
        if (this.appSecret) {
            const proof = crypto_1.default
                .createHmac('sha256', this.appSecret)
                .update(this.accessToken)
                .digest('hex');
            searchParams.set('appsecret_proof', proof);
        }
        return `${this.baseUrl}${path}?${searchParams.toString()}`;
    }
    async request(method, url, body) {
        const bucketKey = 'app';
        return this.rateLimiter.executeWithRetry(bucketKey, async () => {
            return this.rateLimiter.submit(this.consumer, bucketKey, async () => {
                const response = await httpRequest(method, url, body);
                // Update rate-limit tracking from headers
                this.rateLimiter.updateFromHeaders(bucketKey, response.headers);
                // Handle errors
                if (response.status >= 400) {
                    const errorBody = response.body;
                    if (errorBody && typeof errorBody === 'object' && 'error' in errorBody) {
                        throw (0, errors_1.classifyMetaError)(errorBody, response.status, response.headers['retry-after']);
                    }
                    throw new errors_1.MetaApiError({
                        error: {
                            message: `HTTP ${response.status}: ${typeof response.body === 'string' ? response.body : JSON.stringify(response.body)}`,
                            type: 'HttpError',
                            code: response.status,
                        },
                    }, response.status);
                }
                return response.body;
            });
        }, errors_1.isMetaRateLimitError);
    }
    // =======================================================================
    // Audience Helpers
    // =======================================================================
    /**
     * Build the schema array for custom audience user uploads.
     * Returns the field names in the order the data arrays will be constructed.
     */
    buildAudienceSchema(users) {
        if (users.length === 0)
            return [];
        const sample = users[0];
        const schema = [];
        if (sample.email !== undefined)
            schema.push('EMAIL');
        if (sample.phone !== undefined)
            schema.push('PHONE');
        if (sample.first_name !== undefined)
            schema.push('FN');
        if (sample.last_name !== undefined)
            schema.push('LN');
        if (sample.city !== undefined)
            schema.push('CT');
        if (sample.state !== undefined)
            schema.push('ST');
        if (sample.zip !== undefined)
            schema.push('ZIP');
        if (sample.country !== undefined)
            schema.push('COUNTRY');
        if (sample.date_of_birth !== undefined)
            schema.push('DOBY');
        if (sample.gender !== undefined)
            schema.push('GEN');
        if (sample.external_id !== undefined)
            schema.push('EXTERN_ID');
        return schema;
    }
    /**
     * Hash a single audience user's PII fields using SHA-256 (as required by Meta).
     * Returns an array of values in the same order as the schema.
     */
    hashAudienceUser(user) {
        const values = [];
        if (user.email !== undefined)
            values.push(this.sha256(user.email.toLowerCase().trim()));
        if (user.phone !== undefined)
            values.push(this.sha256(user.phone.replace(/\D/g, '')));
        if (user.first_name !== undefined)
            values.push(this.sha256(user.first_name.toLowerCase().trim()));
        if (user.last_name !== undefined)
            values.push(this.sha256(user.last_name.toLowerCase().trim()));
        if (user.city !== undefined)
            values.push(this.sha256(user.city.toLowerCase().trim().replace(/\s/g, '')));
        if (user.state !== undefined)
            values.push(this.sha256(user.state.toLowerCase().trim()));
        if (user.zip !== undefined)
            values.push(this.sha256(user.zip.toLowerCase().trim()));
        if (user.country !== undefined)
            values.push(this.sha256(user.country.toLowerCase().trim()));
        if (user.date_of_birth !== undefined)
            values.push(this.sha256(user.date_of_birth));
        if (user.gender !== undefined)
            values.push(this.sha256(user.gender.toLowerCase().trim()));
        if (user.external_id !== undefined)
            values.push(this.sha256(user.external_id));
        return values;
    }
    sha256(value) {
        return crypto_1.default.createHash('sha256').update(value).digest('hex');
    }
    stripActPrefix(accountId) {
        return accountId.replace(/^act_/i, '');
    }
}
exports.MetaHubClient = MetaHubClient;
//# sourceMappingURL=client.js.map