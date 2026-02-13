"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpClient = void 0;
const circuit_breaker_1 = require("./circuit-breaker");
const errors_1 = require("./errors");
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
/** Build a URL with optional query parameters. */
function buildUrl(base, path, query) {
    const url = new URL(path, base);
    if (query) {
        for (const [key, value] of Object.entries(query)) {
            if (value !== undefined) {
                url.searchParams.set(key, String(value));
            }
        }
    }
    return url.toString();
}
/** Sleep for `ms` milliseconds. */
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
/**
 * Compute the back-off delay for a given attempt.
 * Uses exponential back-off with full jitter capped at `maxDelayMs`.
 */
function backoffDelay(attempt, baseMs, maxMs) {
    const exponential = baseMs * Math.pow(2, attempt);
    const capped = Math.min(exponential, maxMs);
    // Full jitter: uniform random in [0, capped].
    return Math.floor(Math.random() * capped);
}
/** Determine whether a status code is retryable. */
function isRetryableStatus(status) {
    return status === 429 || status === 502 || status === 503 || status === 504;
}
/** Parse the Retry-After header into milliseconds. */
function parseRetryAfter(header) {
    if (!header)
        return 0;
    const seconds = Number(header);
    if (!Number.isNaN(seconds))
        return seconds * 1000;
    // Try parsing as HTTP-date.
    const date = Date.parse(header);
    if (!Number.isNaN(date))
        return Math.max(0, date - Date.now());
    return 0;
}
// ---------------------------------------------------------------------------
// Default console logger adapter
// ---------------------------------------------------------------------------
const defaultLogger = {
    debug(message, meta) {
        console.debug(`[remotion-client] ${message}`, meta ?? "");
    },
    info(message, meta) {
        console.info(`[remotion-client] ${message}`, meta ?? "");
    },
    warn(message, meta) {
        console.warn(`[remotion-client] ${message}`, meta ?? "");
    },
    error(message, meta) {
        console.error(`[remotion-client] ${message}`, meta ?? "");
    },
};
// ---------------------------------------------------------------------------
// HttpClient
// ---------------------------------------------------------------------------
class HttpClient {
    apiUrl;
    apiKey;
    timeoutMs;
    maxRetries;
    retryBaseDelayMs;
    retryMaxDelayMs;
    breaker;
    logger;
    constructor(config) {
        this.apiUrl = config.apiUrl.replace(/\/+$/, ""); // strip trailing slashes
        this.apiKey = config.apiKey;
        this.timeoutMs = config.timeoutMs ?? 30_000;
        this.maxRetries = config.maxRetries ?? 3;
        this.retryBaseDelayMs = config.retryBaseDelayMs ?? 500;
        this.retryMaxDelayMs = config.retryMaxDelayMs ?? 10_000;
        this.breaker = new circuit_breaker_1.CircuitBreaker(config.circuitBreaker);
        this.logger = config.logger === null ? null : (config.logger ?? defaultLogger);
    }
    // -----------------------------------------------------------------------
    // Public convenience methods
    // -----------------------------------------------------------------------
    async get(path, query) {
        return this.request({ method: "GET", path, query });
    }
    async post(path, body) {
        return this.request({ method: "POST", path, body });
    }
    async put(path, body) {
        return this.request({ method: "PUT", path, body });
    }
    async patch(path, body) {
        return this.request({ method: "PATCH", path, body });
    }
    async delete(path) {
        return this.request({ method: "DELETE", path });
    }
    // -----------------------------------------------------------------------
    // Core request method
    // -----------------------------------------------------------------------
    async request(opts) {
        const maxRetries = opts.maxRetries ?? this.maxRetries;
        const timeoutMs = opts.timeoutMs ?? this.timeoutMs;
        let lastError;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const result = await this.breaker.execute(() => this.doFetch(opts, timeoutMs));
                return result;
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                const shouldRetry = attempt < maxRetries && this.isRetryable(lastError);
                if (!shouldRetry) {
                    throw lastError;
                }
                // Determine delay.
                let delay;
                if (lastError instanceof errors_1.RemotionRateLimitError &&
                    lastError.retryAfterMs > 0) {
                    delay = lastError.retryAfterMs;
                }
                else {
                    delay = backoffDelay(attempt, this.retryBaseDelayMs, this.retryMaxDelayMs);
                }
                this.logger?.warn(`Request failed, retrying in ${delay}ms`, {
                    attempt: attempt + 1,
                    maxRetries,
                    path: opts.path,
                    error: lastError.message,
                });
                await sleep(delay);
            }
        }
        // Should be unreachable, but just in case.
        throw lastError ?? new Error("Unexpected retry loop exit");
    }
    /** Expose the circuit breaker for external inspection / reset. */
    getCircuitBreaker() {
        return this.breaker;
    }
    // -----------------------------------------------------------------------
    // Internal
    // -----------------------------------------------------------------------
    async doFetch(opts, timeoutMs) {
        const url = buildUrl(this.apiUrl, opts.path, opts.query);
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        const headers = {
            Authorization: `Bearer ${this.apiKey}`,
            Accept: "application/json",
            ...opts.headers,
        };
        if (opts.body !== undefined) {
            headers["Content-Type"] = "application/json";
        }
        const startMs = Date.now();
        this.logger?.debug(`--> ${opts.method} ${url}`);
        let response;
        try {
            response = await fetch(url, {
                method: opts.method,
                headers,
                body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
                signal: controller.signal,
            });
        }
        catch (err) {
            clearTimeout(timer);
            if (err instanceof Error &&
                (err.name === "AbortError" || err.message.includes("abort"))) {
                throw new errors_1.RemotionTimeoutError(`Request to ${opts.method} ${opts.path} timed out after ${timeoutMs}ms`, timeoutMs);
            }
            throw err;
        }
        finally {
            clearTimeout(timer);
        }
        const durationMs = Date.now() - startMs;
        this.logger?.debug(`<-- ${response.status} ${opts.method} ${url}`, {
            durationMs,
        });
        // ------ Handle error responses ------ //
        if (!response.ok) {
            const body = await this.safeParseBody(response);
            const requestId = response.headers.get("x-request-id") ?? undefined;
            if (response.status === 429) {
                const retryAfterMs = parseRetryAfter(response.headers.get("retry-after"));
                throw new errors_1.RemotionRateLimitError(body?.message ?? `Rate limited on ${opts.method} ${opts.path}`, {
                    status: 429,
                    code: body?.code ?? "RATE_LIMITED",
                    details: body?.details,
                    requestId,
                    retryAfterMs: retryAfterMs || 1_000,
                });
            }
            throw new errors_1.RemotionApiError(body?.message ?? `API error ${response.status} on ${opts.method} ${opts.path}`, {
                status: response.status,
                code: body?.code ?? "UNKNOWN_ERROR",
                details: body?.details,
                requestId,
            });
        }
        // ------ Parse successful response ------ //
        // Handle 204 No Content.
        if (response.status === 204) {
            return undefined;
        }
        const json = (await response.json());
        return json;
    }
    /**
     * Attempt to parse a JSON error body; return a generic shape or null.
     */
    async safeParseBody(response) {
        try {
            return (await response.json());
        }
        catch {
            return null;
        }
    }
    /** Decide whether an error is worth retrying. */
    isRetryable(error) {
        if (error instanceof errors_1.RemotionTimeoutError)
            return true;
        if (error instanceof errors_1.RemotionRateLimitError)
            return true;
        if (error instanceof errors_1.RemotionApiError) {
            return isRetryableStatus(error.status);
        }
        // Network-level errors (e.g. ECONNRESET) are retryable.
        if (error.message.includes("ECONNRESET") ||
            error.message.includes("ECONNREFUSED") ||
            error.message.includes("ETIMEDOUT") ||
            error.message.includes("fetch failed") ||
            error.message.includes("network")) {
            return true;
        }
        return false;
    }
}
exports.HttpClient = HttpClient;
//# sourceMappingURL=http.js.map