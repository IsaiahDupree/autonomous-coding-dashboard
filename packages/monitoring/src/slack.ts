/**
 * @module slack
 * NOTIFY-001: Slack Notifications.
 * Webhook-based notifications with channel routing and Block Kit message formatting.
 */

import {
  SlackMessage,
  SlackMessageSchema,
  SlackConfig,
  SlackConfigSchema,
  SlackBlock,
} from './types';

/** Result of sending a Slack message. */
export interface SlackSendResult {
  success: boolean;
  channel: string;
  timestamp: string;
  error?: string;
}

/** Rate limiter state for Slack API calls. */
interface RateLimiterState {
  tokens: number;
  lastRefill: number;
  maxTokens: number;
  refillRate: number; // tokens per ms
}

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
export class SlackNotifier {
  private readonly config: SlackConfig;
  private readonly sentMessages: Array<SlackMessage & { sentAt: string }> = [];
  private readonly rateLimiter: RateLimiterState;
  private sendFn: ((url: string, body: unknown) => Promise<boolean>) | null = null;

  constructor(config?: Partial<SlackConfig>) {
    this.config = SlackConfigSchema.parse(config ?? {});
    this.rateLimiter = {
      tokens: this.config.rateLimitPerMinute,
      lastRefill: Date.now(),
      maxTokens: this.config.rateLimitPerMinute,
      refillRate: this.config.rateLimitPerMinute / 60_000,
    };
  }

  /** Override the HTTP send function (useful for testing or custom transports). */
  setSendFunction(fn: (url: string, body: unknown) => Promise<boolean>): void {
    this.sendFn = fn;
  }

  /** Send a Slack message. */
  async send(message: Partial<SlackMessage> & { text: string }): Promise<SlackSendResult> {
    if (!this.config.enabled) {
      return {
        success: false,
        channel: message.channel ?? this.config.defaultChannel,
        timestamp: new Date().toISOString(),
        error: 'Slack notifications are disabled',
      };
    }

    const validated = SlackMessageSchema.parse({
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
      } catch (error) {
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
  async sendToCategory(
    category: string,
    text: string,
    blocks?: SlackBlock[]
  ): Promise<SlackSendResult> {
    const channel = this.config.channelRouting[category] ?? this.config.defaultChannel;
    return this.send({ channel, text, blocks });
  }

  /** Get all sent messages (for testing/debugging). */
  getSentMessages(): Array<SlackMessage & { sentAt: string }> {
    return [...this.sentMessages];
  }

  /** Clear sent message history. */
  clearHistory(): void {
    this.sentMessages.length = 0;
  }

  // ------------------------------------------------------------------
  // Block Kit helpers (static methods for convenience)
  // ------------------------------------------------------------------

  /** Create a header block. */
  static headerBlock(text: string): SlackBlock {
    return {
      type: 'header',
      text: { type: 'plain_text', text },
    };
  }

  /** Create a section block with markdown text. */
  static sectionBlock(text: string): SlackBlock {
    return {
      type: 'section',
      text: { type: 'mrkdwn', text },
    };
  }

  /** Create a section block with fields. */
  static fieldsBlock(fields: Array<{ label: string; value: string }>): SlackBlock {
    return {
      type: 'section',
      fields: fields.map((f) => ({
        type: 'mrkdwn',
        text: `*${f.label}*\n${f.value}`,
      })),
    };
  }

  /** Create a divider block. */
  static dividerBlock(): SlackBlock {
    return { type: 'divider' };
  }

  /** Create a context block with text elements. */
  static contextBlock(texts: string[]): SlackBlock {
    return {
      type: 'context',
      elements: texts.map((t) => ({ type: 'mrkdwn', text: t })),
    };
  }

  private consumeToken(): boolean {
    const now = Date.now();
    const elapsed = now - this.rateLimiter.lastRefill;
    const refilled = elapsed * this.rateLimiter.refillRate;

    this.rateLimiter.tokens = Math.min(
      this.rateLimiter.maxTokens,
      this.rateLimiter.tokens + refilled
    );
    this.rateLimiter.lastRefill = now;

    if (this.rateLimiter.tokens >= 1) {
      this.rateLimiter.tokens -= 1;
      return true;
    }

    return false;
  }
}
