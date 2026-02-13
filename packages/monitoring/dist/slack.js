"use strict";
/**
 * @module slack
 * NOTIFY-001: Slack Notifications.
 * Webhook-based notifications with channel routing and Block Kit message formatting.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlackNotifier = void 0;
const types_1 = require("./types");
/**
 * Slack Notification Client.
 * Sends messages via webhook with channel routing, rate limiting, and Block Kit support.
 *
 * @example
 * ```ts
 * const slack = new SlackNotifier({
 *   webhookUrl: 'https://hooks.slack.com/services/...',
 *   defaultChannel: '#alerts',
 *   channelRouting: {
 *     'error': '#errors',
 *     'deploy': '#deployments',
 *   },
 * });
 *
 * await slack.send({
 *   channel: '#alerts',
 *   text: 'Deployment complete',
 *   blocks: [
 *     SlackNotifier.headerBlock('Deployment Complete'),
 *     SlackNotifier.sectionBlock('Service *api-v2* deployed to production'),
 *   ],
 * });
 * ```
 */
class SlackNotifier {
    constructor(config) {
        this.sentMessages = [];
        this.sendFn = null;
        this.config = types_1.SlackConfigSchema.parse(config ?? {});
        this.rateLimiter = {
            tokens: this.config.rateLimitPerMinute,
            lastRefill: Date.now(),
            maxTokens: this.config.rateLimitPerMinute,
            refillRate: this.config.rateLimitPerMinute / 60000,
        };
    }
    /** Override the HTTP send function (useful for testing or custom transports). */
    setSendFunction(fn) {
        this.sendFn = fn;
    }
    /** Send a Slack message. */
    async send(message) {
        if (!this.config.enabled) {
            return {
                success: false,
                channel: message.channel ?? this.config.defaultChannel,
                timestamp: new Date().toISOString(),
                error: 'Slack notifications are disabled',
            };
        }
        const validated = types_1.SlackMessageSchema.parse({
            channel: message.channel ?? this.config.defaultChannel,
            ...message,
        });
        // Check rate limit
        if (!this.consumeToken()) {
            return {
                success: false,
                channel: validated.channel,
                timestamp: new Date().toISOString(),
                error: 'Rate limit exceeded',
            };
        }
        const now = new Date().toISOString();
        this.sentMessages.push({ ...validated, sentAt: now });
        // If we have a webhook URL and a send function, actually send
        if (this.config.webhookUrl && this.sendFn) {
            try {
                const success = await this.sendFn(this.config.webhookUrl, {
                    channel: validated.channel,
                    text: validated.text,
                    blocks: validated.blocks,
                    thread_ts: validated.threadTs,
                    unfurl_links: validated.unfurlLinks,
                });
                return {
                    success,
                    channel: validated.channel,
                    timestamp: now,
                };
            }
            catch (error) {
                const errMessage = error instanceof Error ? error.message : String(error);
                return {
                    success: false,
                    channel: validated.channel,
                    timestamp: now,
                    error: errMessage,
                };
            }
        }
        // Mock send (no webhook configured)
        return {
            success: true,
            channel: validated.channel,
            timestamp: now,
        };
    }
    /** Send a message using channel routing by category. */
    async sendToCategory(category, text, blocks) {
        const channel = this.config.channelRouting[category] ?? this.config.defaultChannel;
        return this.send({ channel, text, blocks });
    }
    /** Get all sent messages (for testing/debugging). */
    getSentMessages() {
        return [...this.sentMessages];
    }
    /** Clear sent message history. */
    clearHistory() {
        this.sentMessages.length = 0;
    }
    // ------------------------------------------------------------------
    // Block Kit helpers (static methods for convenience)
    // ------------------------------------------------------------------
    /** Create a header block. */
    static headerBlock(text) {
        return {
            type: 'header',
            text: { type: 'plain_text', text },
        };
    }
    /** Create a section block with markdown text. */
    static sectionBlock(text) {
        return {
            type: 'section',
            text: { type: 'mrkdwn', text },
        };
    }
    /** Create a section block with fields. */
    static fieldsBlock(fields) {
        return {
            type: 'section',
            fields: fields.map((f) => ({
                type: 'mrkdwn',
                text: `*${f.label}*\n${f.value}`,
            })),
        };
    }
    /** Create a divider block. */
    static dividerBlock() {
        return { type: 'divider' };
    }
    /** Create a context block with text elements. */
    static contextBlock(texts) {
        return {
            type: 'context',
            elements: texts.map((t) => ({ type: 'mrkdwn', text: t })),
        };
    }
    consumeToken() {
        const now = Date.now();
        const elapsed = now - this.rateLimiter.lastRefill;
        const refilled = elapsed * this.rateLimiter.refillRate;
        this.rateLimiter.tokens = Math.min(this.rateLimiter.maxTokens, this.rateLimiter.tokens + refilled);
        this.rateLimiter.lastRefill = now;
        if (this.rateLimiter.tokens >= 1) {
            this.rateLimiter.tokens -= 1;
            return true;
        }
        return false;
    }
}
exports.SlackNotifier = SlackNotifier;
//# sourceMappingURL=slack.js.map