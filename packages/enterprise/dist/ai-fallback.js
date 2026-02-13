"use strict";
/**
 * AI Fallback Chains (AI-005)
 * Primary -> fallback provider, with timeout and error handling.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FallbackChainExhaustedError = exports.AIFallbackChainManager = void 0;
const types_1 = require("./types");
const ai_provider_1 = require("./ai-provider");
let chainIdCounter = 0;
/**
 * Manages AI fallback chains that try multiple providers in sequence
 * when the primary provider fails.
 */
class AIFallbackChainManager {
    constructor() {
        this.chains = new Map();
    }
    /**
     * Create a new fallback chain.
     */
    createChain(input) {
        chainIdCounter++;
        const chain = types_1.FallbackChainSchema.parse({
            id: `chain_${chainIdCounter}`,
            name: input.name,
            providers: input.providers
                .map((p, i) => ({
                config: p.config,
                timeoutMs: p.timeoutMs ?? 30000,
                priority: p.priority ?? i,
            }))
                .sort((a, b) => a.priority - b.priority),
            maxRetries: input.maxRetries ?? 2,
        });
        this.chains.set(chain.id, chain);
        return chain;
    }
    /** Get a fallback chain by ID */
    getChain(chainId) {
        return this.chains.get(chainId);
    }
    /** Get all chains */
    getAllChains() {
        return Array.from(this.chains.values());
    }
    /** Delete a chain */
    deleteChain(chainId) {
        return this.chains.delete(chainId);
    }
    /**
     * Execute a request through a fallback chain.
     * Tries each provider in order. If one fails (error or timeout),
     * falls back to the next provider.
     */
    async execute(chainId, request) {
        const chain = this.chains.get(chainId);
        if (!chain) {
            throw new Error(`Fallback chain "${chainId}" not found`);
        }
        const errors = [];
        let attemptsMade = 0;
        for (const providerEntry of chain.providers) {
            const provider = ai_provider_1.AIProviderRegistry.createProvider(providerEntry.config);
            for (let retry = 0; retry <= chain.maxRetries; retry++) {
                attemptsMade++;
                const startTime = Date.now();
                try {
                    const response = await this.executeWithTimeout(provider, request, providerEntry.timeoutMs);
                    return {
                        response,
                        providerUsed: `${providerEntry.config.provider}:${providerEntry.config.model}`,
                        attemptsMade,
                        errors,
                    };
                }
                catch (err) {
                    const latencyMs = Date.now() - startTime;
                    const errorMessage = err instanceof Error ? err.message : String(err);
                    errors.push({
                        provider: `${providerEntry.config.provider}:${providerEntry.config.model}`,
                        error: errorMessage,
                        latencyMs,
                    });
                    // If it was a timeout, don't retry on this provider, move to next
                    if (errorMessage.includes('timeout')) {
                        break;
                    }
                }
            }
        }
        throw new FallbackChainExhaustedError(`All providers in chain "${chain.name}" failed after ${attemptsMade} attempts`, errors);
    }
    /**
     * Execute a provider request with a timeout.
     */
    async executeWithTimeout(provider, request, timeoutMs) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error(`Provider ${provider.name}:${provider.model} timeout after ${timeoutMs}ms`));
            }, timeoutMs);
            provider
                .complete(request)
                .then(response => {
                clearTimeout(timer);
                resolve(response);
            })
                .catch(err => {
                clearTimeout(timer);
                reject(err);
            });
        });
    }
}
exports.AIFallbackChainManager = AIFallbackChainManager;
/**
 * Error thrown when all providers in a fallback chain have been exhausted.
 */
class FallbackChainExhaustedError extends Error {
    constructor(message, errors) {
        super(message);
        this.errors = errors;
        this.name = 'FallbackChainExhaustedError';
    }
}
exports.FallbackChainExhaustedError = FallbackChainExhaustedError;
//# sourceMappingURL=ai-fallback.js.map