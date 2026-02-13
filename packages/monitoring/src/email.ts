/**
 * @module email
 * NOTIFY-002: Email Notifications.
 * Template-based email sending via SMTP/Resend with unsubscribe support.
 */

import {
  EmailMessage,
  EmailMessageSchema,
  EmailConfig,
  EmailConfigSchema,
  EmailResult,
  EmailRecipient,
} from './types';

/** Simple template engine: replaces {{key}} placeholders. */
function renderTemplate(template: string, data: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_match, key: string) => {
    const parts = key.split('.');
    let value: unknown = data;
    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = (value as Record<string, unknown>)[part];
      } else {
        return '';
      }
    }
    return value !== undefined && value !== null ? String(value) : '';
  });
}

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
export class MockEmailTransport implements EmailTransport {
  public readonly sentMessages: Array<{ message: EmailMessage; result: EmailResult }> = [];

  async send(message: EmailMessage): Promise<EmailResult> {
    const result: EmailResult = {
      messageId: `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      accepted: message.to.map((r) => r.email),
      rejected: [],
      timestamp: new Date().toISOString(),
    };

    this.sentMessages.push({ message, result });
    return result;
  }

  clear(): void {
    this.sentMessages.length = 0;
  }
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
export class EmailService {
  private readonly config: EmailConfig;
  private readonly templates: Map<string, EmailTemplate> = new Map();
  private readonly unsubscribed: Set<string> = new Set();
  private transport: EmailTransport;
  private readonly sentLog: Array<{ message: EmailMessage; result: EmailResult }> = [];

  constructor(config?: Partial<EmailConfig>, transport?: EmailTransport) {
    this.config = EmailConfigSchema.parse(config ?? {});
    this.transport = transport ?? new MockEmailTransport();
  }

  /** Set a custom transport. */
  setTransport(transport: EmailTransport): void {
    this.transport = transport;
  }

  /** Register an email template. */
  registerTemplate(template: EmailTemplate): void {
    this.templates.set(template.id, template);
  }

  /** Get a registered template. */
  getTemplate(id: string): EmailTemplate | undefined {
    return this.templates.get(id);
  }

  /** Unsubscribe an email address. */
  unsubscribe(email: string): void {
    this.unsubscribed.add(email.toLowerCase());
  }

  /** Re-subscribe an email address. */
  resubscribe(email: string): void {
    this.unsubscribed.delete(email.toLowerCase());
  }

  /** Check if an email is unsubscribed. */
  isUnsubscribed(email: string): boolean {
    return this.unsubscribed.has(email.toLowerCase());
  }

  /** Send an email directly. */
  async send(message: Partial<EmailMessage> & { to: EmailRecipient[]; subject: string }): Promise<EmailResult> {
    if (!this.config.enabled) {
      return {
        messageId: 'disabled',
        accepted: [],
        rejected: message.to.map((r) => r.email),
        timestamp: new Date().toISOString(),
      };
    }

    // Filter out unsubscribed recipients
    const filteredTo = message.to.filter(
      (r) => !this.isUnsubscribed(r.email)
    );

    if (filteredTo.length === 0) {
      return {
        messageId: 'no_recipients',
        accepted: [],
        rejected: message.to.map((r) => r.email),
        timestamp: new Date().toISOString(),
      };
    }

    const validated = EmailMessageSchema.parse({
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
  async sendTemplate(
    templateId: string,
    options: {
      to: EmailRecipient[];
      cc?: EmailRecipient[];
      bcc?: EmailRecipient[];
      templateData?: Record<string, unknown>;
      from?: EmailRecipient;
    }
  ): Promise<EmailResult> {
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
  getSentLog(): Array<{ message: EmailMessage; result: EmailResult }> {
    return [...this.sentLog];
  }

  /** Clear the sent message log. */
  clearLog(): void {
    this.sentLog.length = 0;
  }

  private buildUnsubscribeUrl(email: string): string | undefined {
    if (!this.config.unsubscribeBaseUrl) return undefined;
    const token = Buffer.from(email).toString('base64url');
    return `${this.config.unsubscribeBaseUrl}?token=${token}`;
  }
}
