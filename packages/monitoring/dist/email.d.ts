/**
 * @module email
 * NOTIFY-002: Email Notifications.
 * Template-based email sending via SMTP/Resend with unsubscribe support.
 */
import { EmailMessage, EmailConfig, EmailResult, EmailRecipient } from './types';
/** Email template definition. */
export interface EmailTemplate {
    id: string;
    subject: string;
    html: string;
    text?: string;
}
/** Interface for pluggable email send transports. */
export interface EmailTransport {
    send(message: EmailMessage): Promise<EmailResult>;
}
/**
 * Mock email transport that stores messages in memory.
 */
export declare class MockEmailTransport implements EmailTransport {
    readonly sentMessages: Array<{
        message: EmailMessage;
        result: EmailResult;
    }>;
    send(message: EmailMessage): Promise<EmailResult>;
    clear(): void;
}
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
export declare class EmailService {
    private readonly config;
    private readonly templates;
    private readonly unsubscribed;
    private transport;
    private readonly sentLog;
    constructor(config?: Partial<EmailConfig>, transport?: EmailTransport);
    /** Set a custom transport. */
    setTransport(transport: EmailTransport): void;
    /** Register an email template. */
    registerTemplate(template: EmailTemplate): void;
    /** Get a registered template. */
    getTemplate(id: string): EmailTemplate | undefined;
    /** Unsubscribe an email address. */
    unsubscribe(email: string): void;
    /** Re-subscribe an email address. */
    resubscribe(email: string): void;
    /** Check if an email is unsubscribed. */
    isUnsubscribed(email: string): boolean;
    /** Send an email directly. */
    send(message: Partial<EmailMessage> & {
        to: EmailRecipient[];
        subject: string;
    }): Promise<EmailResult>;
    /** Send an email using a registered template. */
    sendTemplate(templateId: string, options: {
        to: EmailRecipient[];
        cc?: EmailRecipient[];
        bcc?: EmailRecipient[];
        templateData?: Record<string, unknown>;
        from?: EmailRecipient;
    }): Promise<EmailResult>;
    /** Get the sent message log. */
    getSentLog(): Array<{
        message: EmailMessage;
        result: EmailResult;
    }>;
    /** Clear the sent message log. */
    clearLog(): void;
    private buildUnsubscribeUrl;
}
//# sourceMappingURL=email.d.ts.map