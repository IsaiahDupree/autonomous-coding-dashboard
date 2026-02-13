/**
 * AI Fallback Chains (AI-005)
 * Primary -> fallback provider, with timeout and error handling.
 */
import { AIModelConfig, AIRequest, AIResponse, FallbackChain } from './types';
export interface FallbackExecutionResult {
    response: AIResponse;
    providerUsed: string;
    attemptsMade: number;
    errors: Array<{
        provider: string;
        error: string;
        latencyMs: number;
    }>;
}
/**
 * Manages AI fallback chains that try multiple providers in sequence
 * when the primary provider fails.
 */
export declare class AIFallbackChainManager {
    private chains;
    /**
     * Create a new fallback chain.
     */
    createChain(input: {
        name: string;
        providers: Array<{
            config: AIModelConfig;
            timeoutMs?: number;
            priority?: number;
        }>;
        maxRetries?: number;
    }): FallbackChain;
    /** Get a fallback chain by ID */
    getChain(chainId: string): FallbackChain | undefined;
    /** Get all chains */
    getAllChains(): FallbackChain[];
    /** Delete a chain */
    deleteChain(chainId: string): boolean;
    /**
     * Execute a request through a fallback chain.
     * Tries each provider in order. If one fails (error or timeout),
     * falls back to the next provider.
     */
    execute(chainId: string, request: AIRequest): Promise<FallbackExecutionResult>;
    /**
     * Execute a provider request with a timeout.
     */
    private executeWithTimeout;
}
/**
 * Error thrown when all providers in a fallback chain have been exhausted.
 */
export declare class FallbackChainExhaustedError extends Error {
    readonly errors: Array<{
        provider: string;
        error: string;
        latencyMs: number;
    }>;
    constructor(message: string, errors: Array<{
        provider: string;
        error: string;
        latencyMs: number;
    }>);
}
//# sourceMappingURL=ai-fallback.d.ts.map