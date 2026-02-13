import type { AnalyticsEvent } from './types';

// ---------------------------------------------------------------------------
// EventTransport interface
// ---------------------------------------------------------------------------

export interface EventTransport {
  send(event: AnalyticsEvent): Promise<void>;
  sendBatch(events: AnalyticsEvent[]): Promise<void>;
  flush(): Promise<void>;
}

// ---------------------------------------------------------------------------
// HttpTransport -- queues events and flushes in batches over HTTP
// ---------------------------------------------------------------------------

export interface HttpTransportOptions {
  /** Number of events that triggers an automatic flush. Default 20. */
  batchSize?: number;
  /** Interval in ms between automatic flushes. Default 5000. */
  flushIntervalMs?: number;
  /** Maximum retry attempts on failure. Default 3. */
  maxRetries?: number;
  /** HTTP request timeout in ms. Default 10000. */
  timeout?: number;
}

export class HttpTransport implements EventTransport {
  private readonly endpoint: string;
  private readonly apiKey: string;
  private readonly batchSize: number;
  private readonly flushIntervalMs: number;
  private readonly maxRetries: number;
  private readonly timeout: number;

  private queue: AnalyticsEvent[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private flushing = false;

  constructor(endpoint: string, apiKey: string, options: HttpTransportOptions = {}) {
    this.endpoint = endpoint;
    this.apiKey = apiKey;
    this.batchSize = options.batchSize ?? 20;
    this.flushIntervalMs = options.flushIntervalMs ?? 5000;
    this.maxRetries = options.maxRetries ?? 3;
    this.timeout = options.timeout ?? 10000;

    this.startTimer();
  }

  // ---- public API ----------------------------------------------------------

  async send(event: AnalyticsEvent): Promise<void> {
    this.queue.push(event);
    if (this.queue.length >= this.batchSize) {
      await this.flush();
    }
  }

  async sendBatch(events: AnalyticsEvent[]): Promise<void> {
    this.queue.push(...events);
    if (this.queue.length >= this.batchSize) {
      await this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.flushing || this.queue.length === 0) return;

    this.flushing = true;
    try {
      // Drain the queue in chunks of batchSize
      while (this.queue.length > 0) {
        const batch = this.queue.splice(0, this.batchSize);
        await this.sendWithRetry(batch);
      }
    } finally {
      this.flushing = false;
    }
  }

  async shutdown(): Promise<void> {
    this.stopTimer();
    await this.flush();
  }

  // ---- internals -----------------------------------------------------------

  private startTimer(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.flush();
    }, this.flushIntervalMs);
    // Allow the Node process to exit even if the timer is still running
    if (typeof this.timer === 'object' && 'unref' in this.timer) {
      this.timer.unref();
    }
  }

  private stopTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async sendWithRetry(batch: AnalyticsEvent[]): Promise<void> {
    let attempt = 0;
    while (attempt < this.maxRetries) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(this.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({ events: batch }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) return;

        // Non-retryable client errors (4xx except 429)
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          const body = await response.text().catch(() => '');
          throw new Error(
            `Analytics HTTP error ${response.status}: ${body}`,
          );
        }

        // Retryable -- fall through to retry logic
      } catch (err: unknown) {
        // Abort errors are retryable; other thrown errors bubble on last attempt
        if (attempt === this.maxRetries - 1) throw err;
      }

      attempt++;
      // Exponential back-off: 200ms, 400ms, 800ms ...
      const delay = Math.min(200 * Math.pow(2, attempt), 5000);
      await this.sleep(delay);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ---------------------------------------------------------------------------
// SupabaseTransport -- direct REST insert into a Supabase table
// ---------------------------------------------------------------------------

export class SupabaseTransport implements EventTransport {
  private readonly supabaseUrl: string;
  private readonly supabaseKey: string;
  private readonly tableName: string;

  constructor(supabaseUrl: string, supabaseKey: string, tableName = 'shared_events') {
    this.supabaseUrl = supabaseUrl.replace(/\/$/, '');
    this.supabaseKey = supabaseKey;
    this.tableName = tableName;
  }

  async send(event: AnalyticsEvent): Promise<void> {
    await this.insertRows([event]);
  }

  async sendBatch(events: AnalyticsEvent[]): Promise<void> {
    await this.insertRows(events);
  }

  async flush(): Promise<void> {
    // SupabaseTransport sends synchronously -- nothing to flush
  }

  // ---- internals -----------------------------------------------------------

  private async insertRows(rows: AnalyticsEvent[]): Promise<void> {
    const url = `${this.supabaseUrl}/rest/v1/${this.tableName}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: this.supabaseKey,
        Authorization: `Bearer ${this.supabaseKey}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(rows),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Supabase insert failed (${response.status}): ${body}`);
    }
  }
}

// ---------------------------------------------------------------------------
// NoopTransport -- discards all events (useful for tests)
// ---------------------------------------------------------------------------

export class NoopTransport implements EventTransport {
  public readonly events: AnalyticsEvent[] = [];

  async send(event: AnalyticsEvent): Promise<void> {
    this.events.push(event);
  }

  async sendBatch(events: AnalyticsEvent[]): Promise<void> {
    this.events.push(...events);
  }

  async flush(): Promise<void> {
    // noop
  }
}
