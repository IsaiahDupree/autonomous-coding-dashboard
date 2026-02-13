"use strict";
/**
 * @module email
 * NOTIFY-002: Email Notifications.
 * Template-based email sending via SMTP/Resend with unsubscribe support.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = exports.MockEmailTransport = void 0;
const types_1 = require("./types");
/** Simple template engine: replaces {{key}} placeholders. */
function renderTemplate(template, data) {
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_match, key) => {
        const parts = key.split('.');
        let value = data;
        for (const part of parts) {
            if (value && typeof value === 'object') {
                value = value[part];
            }
            else {
                return '';
            }
        }
        return value !== undefined && value !== null ? String(value) : '';
    });
}
/**
 * Mock email transport that stores messages in memory.
 */
class MockEmailTransport {
    constructor() {
        this.sentMessages = [];
    }
    async send(message) {
        const result = {
            messageId: `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            accepted: message.to.map((r) => r.email),
            rejected: [],
            timestamp: new Date().toISOString(),
        };
        this.sentMessages.push({ message, result });
        return result;
    }
    clear() {
        this.sentMessages.length = 0;
    }
}
exports.MockEmailTransport = MockEmailTransport;
/**
 * Email Notification Service.
 * Template-based emails with unsubscribe support and pluggable transports.
 *
 * @example
 * ```ts
 * const emailService = new EmailService({
 *   provider: 'mock',
 *   from: { email: 'noreply@example.com', name: 'My App' },
 *   unsubscribeBaseUrl: 'https://example.com/unsubscribe',
 * });
 *
 * emailService.registerTemplate({
 *   id: 'welcome',
 *   subject: 'Welcome, {{name}}!',
 *   html: '<h1>Welcome, {{name}}!</h1><p>Thanks for joining.</p>',
 * });
 *
 * const result = await emailService.sendTemplate('welcome', {
 *   to: [{ email: 'user@example.com', name: 'Alice' }],
 *   templateData: { name: 'Alice' },
 * });
 * ```
 */
class EmailService {
    constructor(config, transport) {
        this.templates = new Map();
        this.unsubscribed = new Set();
        this.sentLog = [];
        this.config = types_1.EmailConfigSchema.parse(config ?? {});
        this.transport = transport ?? new MockEmailTransport();
    }
    /** Set a custom transport. */
    setTransport(transport) {
        this.transport = transport;
    }
    /** Register an email template. */
    registerTemplate(template) {
        this.templates.set(template.id, template);
    }
    /** Get a registered template. */
    getTemplate(id) {
        return this.templates.get(id);
    }
    /** Unsubscribe an email address. */
    unsubscribe(email) {
        this.unsubscribed.add(email.toLowerCase());
    }
    /** Re-subscribe an email address. */
    resubscribe(email) {
        this.unsubscribed.delete(email.toLowerCase());
    }
    /** Check if an email is unsubscribed. */
    isUnsubscribed(email) {
        return this.unsubscribed.has(email.toLowerCase());
    }
    /** Send an email directly. */
    async send(message) {
        if (!this.config.enabled) {
            return {
                messageId: 'disabled',
                accepted: [],
                rejected: message.to.map((r) => r.email),
                timestamp: new Date().toISOString(),
            };
        }
        // Filter out unsubscribed recipients
        const filteredTo = message.to.filter((r) => !this.isUnsubscribed(r.email));
        if (filteredTo.length === 0) {
            return {
                messageId: 'no_recipients',
                accepted: [],
                rejected: message.to.map((r) => r.email),
                timestamp: new Date().toISOString(),
            };
        }
        const validated = types_1.EmailMessageSchema.parse({
            from: message.from ?? this.config.from,
            unsubscribeUrl: message.unsubscribeUrl ?? this.buildUnsubscribeUrl(filteredTo[0].email),
            ...message,
            to: filteredTo,
        });
        // Add List-Unsubscribe header if unsubscribe URL is present
        if (validated.unsubscribeUrl) {
            validated.headers = {
                ...validated.headers,
                'List-Unsubscribe': `<${validated.unsubscribeUrl}>`,
                'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            };
        }
        const result = await this.transport.send(validated);
        this.sentLog.push({ message: validated, result });
        return result;
    }
    /** Send an email using a registered template. */
    async sendTemplate(templateId, options) {
        const template = this.templates.get(templateId);
        if (!template) {
            throw new Error(`Email template not found: ${templateId}`);
        }
        const data = options.templateData ?? {};
        const subject = renderTemplate(template.subject, data);
        const html = renderTemplate(template.html, data);
        const text = template.text ? renderTemplate(template.text, data) : undefined;
        return this.send({
            to: options.to,
            cc: options.cc,
            bcc: options.bcc,
            from: options.from,
            subject,
            template: templateId,
            templateData: data,
            html,
            text,
        });
    }
    /** Get the sent message log. */
    getSentLog() {
        return [...this.sentLog];
    }
    /** Clear the sent message log. */
    clearLog() {
        this.sentLog.length = 0;
    }
    buildUnsubscribeUrl(email) {
        if (!this.config.unsubscribeBaseUrl)
            return undefined;
        const token = Buffer.from(email).toString('base64url');
        return `${this.config.unsubscribeBaseUrl}?token=${token}`;
    }
}
exports.EmailService = EmailService;
//# sourceMappingURL=email.js.map