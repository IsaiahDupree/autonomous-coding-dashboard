import type { AnalyticsEvent } from './types';
export interface EventTransport {
    send(event: AnalyticsEvent): Promise<void>;
    sendBatch(events: AnalyticsEvent[]): Promise<void>;
    flush(): Promise<void>;
}
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
export declare class HttpTransport implements EventTransport {
    private readonly endpoint;
    private readonly apiKey;
    private readonly batchSize;
    private readonly flushIntervalMs;
    private readonly maxRetries;
    private readonly timeout;
    private queue;
    private timer;
    private flushing;
    constructor(endpoint: string, apiKey: string, options?: HttpTransportOptions);
    send(event: AnalyticsEvent): Promise<void>;
    sendBatch(events: AnalyticsEvent[]): Promise<void>;
    flush(): Promise<void>;
    shutdown(): Promise<void>;
    private startTimer;
    private stopTimer;
    private sendWithRetry;
    private sleep;
}
export declare class SupabaseTransport implements EventTransport {
    private readonly supabaseUrl;
    private readonly supabaseKey;
    private readonly tableName;
    constructor(supabaseUrl: string, supabaseKey: string, tableName?: string);
    send(event: AnalyticsEvent): Promise<void>;
    sendBatch(events: AnalyticsEvent[]): Promise<void>;
    flush(): Promise<void>;
    private insertRows;
}
export declare class NoopTransport implements EventTransport {
    readonly events: AnalyticsEvent[];
    send(event: AnalyticsEvent): Promise<void>;
    sendBatch(events: AnalyticsEvent[]): Promise<void>;
    flush(): Promise<void>;
}
//# sourceMappingURL=transport.d.ts.map