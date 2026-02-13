/**
 * @module slack
 * NOTIFY-001: Slack Notifications.
 * Webhook-based notifications with channel routing and Block Kit message formatting.
 */
import { SlackMessage, SlackConfig, SlackBlock } from './types';
/** Result of sending a Slack message. */
export interface SlackSendResult {
    success: boolean;
    channel: string;
    timestamp: string;
    error?: string;
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
export declare class SlackNotifier {
    private readonly config;
    private readonly sentMessages;
    private readonly rateLimiter;
    private sendFn;
    constructor(config?: Partial<SlackConfig>);
    /** Override the HTTP send function (useful for testing or custom transports). */
    setSendFunction(fn: (url: string, body: unknown) => Promise<boolean>): void;
    /** Send a Slack message. */
    send(message: Partial<SlackMessage> & {
        text: string;
    }): Promise<SlackSendResult>;
    /** Send a message using channel routing by category. */
    sendToCategory(category: string, text: string, blocks?: SlackBlock[]): Promise<SlackSendResult>;
    /** Get all sent messages (for testing/debugging). */
    getSentMessages(): Array<SlackMessage & {
        sentAt: string;
    }>;
    /** Clear sent message history. */
    clearHistory(): void;
    /** Create a header block. */
    static headerBlock(text: string): SlackBlock;
    /** Create a section block with markdown text. */
    static sectionBlock(text: string): SlackBlock;
    /** Create a section block with fields. */
    static fieldsBlock(fields: Array<{
        label: string;
        value: string;
    }>): SlackBlock;
    /** Create a divider block. */
    static dividerBlock(): SlackBlock;
    /** Create a context block with text elements. */
    static contextBlock(texts: string[]): SlackBlock;
    private consumeToken;
}
//# sourceMappingURL=slack.d.ts.map