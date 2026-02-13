"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoopTransport = exports.SupabaseTransport = exports.HttpTransport = void 0;
class HttpTransport {
    constructor(endpoint, apiKey, options = {}) {
        this.queue = [];
        this.timer = null;
        this.flushing = false;
        this.endpoint = endpoint;
        this.apiKey = apiKey;
        this.batchSize = options.batchSize ?? 20;
        this.flushIntervalMs = options.flushIntervalMs ?? 5000;
        this.maxRetries = options.maxRetries ?? 3;
        this.timeout = options.timeout ?? 10000;
        this.startTimer();
    }
    // ---- public API ----------------------------------------------------------
    async send(event) {
        this.queue.push(event);
        if (this.queue.length >= this.batchSize) {
            await this.flush();
        }
    }
    async sendBatch(events) {
        this.queue.push(...events);
        if (this.queue.length >= this.batchSize) {
            await this.flush();
        }
    }
    async flush() {
        if (this.flushing || this.queue.length === 0)
            return;
        this.flushing = true;
        try {
            // Drain the queue in chunks of batchSize
            while (this.queue.length > 0) {
                const batch = this.queue.splice(0, this.batchSize);
                await this.sendWithRetry(batch);
            }
        }
        finally {
            this.flushing = false;
        }
    }
    async shutdown() {
        this.stopTimer();
        await this.flush();
    }
    // ---- internals -----------------------------------------------------------
    startTimer() {
        if (this.timer)
            return;
        this.timer = setInterval(() => {
            void this.flush();
        }, this.flushIntervalMs);
        // Allow the Node process to exit even if the timer is still running
        if (typeof this.timer === 'object' && 'unref' in this.timer) {
            this.timer.unref();
        }
    }
    stopTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
    async sendWithRetry(batch) {
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
                if (response.ok)
                    return;
                // Non-retryable client errors (4xx except 429)
                if (response.status >= 400 && response.status < 500 && response.status !== 429) {
                    const body = await response.text().catch(() => '');
                    throw new Error(`Analytics HTTP error ${response.status}: ${body}`);
                }
                // Retryable -- fall through to retry logic
            }
            catch (err) {
                // Abort errors are retryable; other thrown errors bubble on last attempt
                if (attempt === this.maxRetries - 1)
                    throw err;
            }
            attempt++;
            // Exponential back-off: 200ms, 400ms, 800ms ...
            const delay = Math.min(200 * Math.pow(2, attempt), 5000);
            await this.sleep(delay);
        }
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
exports.HttpTransport = HttpTransport;
// ---------------------------------------------------------------------------
// SupabaseTransport -- direct REST insert into a Supabase table
// ---------------------------------------------------------------------------
class SupabaseTransport {
    constructor(supabaseUrl, supabaseKey, tableName = 'shared_events') {
        this.supabaseUrl = supabaseUrl.replace(/\/$/, '');
        this.supabaseKey = supabaseKey;
        this.tableName = tableName;
    }
    async send(event) {
        await this.insertRows([event]);
    }
    async sendBatch(events) {
        await this.insertRows(events);
    }
    async flush() {
        // SupabaseTransport sends synchronously -- nothing to flush
    }
    // ---- internals -----------------------------------------------------------
    async insertRows(rows) {
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
exports.SupabaseTransport = SupabaseTransport;
// ---------------------------------------------------------------------------
// NoopTransport -- discards all events (useful for tests)
// ---------------------------------------------------------------------------
class NoopTransport {
    constructor() {
        this.events = [];
    }
    async send(event) {
        this.events.push(event);
    }
    async sendBatch(events) {
        this.events.push(...events);
    }
    async flush() {
        // noop
    }
}
exports.NoopTransport = NoopTransport;
//# sourceMappingURL=transport.js.map