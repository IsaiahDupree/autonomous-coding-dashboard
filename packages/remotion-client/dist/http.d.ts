/**
 * Low-level HTTP transport for the Remotion API client.
 *
 * Responsibilities:
 *  - Attach API key auth header to every request.
 *  - Retry transient failures with exponential back-off + jitter.
 *  - Route every request through a circuit breaker.
 *  - Enforce a per-request timeout via AbortController.
 *  - Structured request / response logging.
 */
import { CircuitBreaker, CircuitBreakerOptions } from "./circuit-breaker";
export interface HttpClientConfig {
    /** Base URL of the Remotion API (no trailing slash). */
    apiUrl: string;
    /** API key used in the Authorization header. */
    apiKey: string;
    /** Request timeout in milliseconds. Default: 30 000 */
    timeoutMs?: number;
    /** Maximum number of retries for transient failures. Default: 3 */
    maxRetries?: number;
    /** Base delay in ms for exponential back-off. Default: 500 */
    retryBaseDelayMs?: number;
    /** Maximum delay in ms between retries. Default: 10 000 */
    retryMaxDelayMs?: number;
    /** Circuit breaker options. */
    circuitBreaker?: CircuitBreakerOptions;
    /** Optional logger; defaults to `console`. Set to `null` to disable. */
    logger?: Logger | null;
}
export interface RequestOptions {
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    path: string;
    body?: unknown;
    query?: Record<string, string | number | boolean | undefined>;
    headers?: Record<string, string>;
    /** Override the default timeout for this single request. */
    timeoutMs?: number;
    /** Override the default retry count for this single request. */
    maxRetries?: number;
}
export interface Logger {
    debug(message: string, meta?: Record<string, unknown>): void;
    info(message: string, meta?: Record<string, unknown>): void;
    warn(message: string, meta?: Record<string, unknown>): void;
    error(message: string, meta?: Record<string, unknown>): void;
}
export declare class HttpClient {
    private readonly apiUrl;
    private readonly apiKey;
    private readonly timeoutMs;
    private readonly maxRetries;
    private readonly retryBaseDelayMs;
    private readonly retryMaxDelayMs;
    private readonly breaker;
    private readonly logger;
    constructor(config: HttpClientConfig);
    get<T>(path: string, query?: RequestOptions["query"]): Promise<T>;
    post<T>(path: string, body?: unknown): Promise<T>;
    put<T>(path: string, body?: unknown): Promise<T>;
    patch<T>(path: string, body?: unknown): Promise<T>;
    delete<T>(path: string): Promise<T>;
    request<T>(opts: RequestOptions): Promise<T>;
    /** Expose the circuit breaker for external inspection / reset. */
    getCircuitBreaker(): CircuitBreaker;
    private doFetch;
    /**
     * Attempt to parse a JSON error body; return a generic shape or null.
     */
    private safeParseBody;
    /** Decide whether an error is worth retrying. */
    private isRetryable;
}
//# sourceMappingURL=http.d.ts.map