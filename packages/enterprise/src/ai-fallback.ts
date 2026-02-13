/**
 * AI Fallback Chains (AI-005)
 * Primary -> fallback provider, with timeout and error handling.
 */

import {
  AIModelConfig,
  AIRequest,
  AIResponse,
  FallbackChain,
  FallbackChainSchema,
} from './types';
import { AIProviderRegistry, IAIProvider } from './ai-provider';

export interface FallbackExecutionResult {
  response: AIResponse;
  providerUsed: string;
  attemptsMade: number;
  errors: Array<{ provider: string; error: string; latencyMs: number }>;
}

let chainIdCounter = 0;

/**
 * Manages AI fallback chains that try multiple providers in sequence
 * when the primary provider fails.
 */
export class AIFallbackChainManager {
  private chains: Map<string, FallbackChain> = new Map();

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
  }): FallbackChain {
    chainIdCounter++;
    const chain = FallbackChainSchema.parse({
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
  getChain(chainId: string): FallbackChain | undefined {
    return this.chains.get(chainId);
  }

  /** Get all chains */
  getAllChains(): FallbackChain[] {
    return Array.from(this.chains.values());
  }

  /** Delete a chain */
  deleteChain(chainId: string): boolean {
    return this.chains.delete(chainId);
  }

  /**
   * Execute a request through a fallback chain.
   * Tries each provider in order. If one fails (error or timeout),
   * falls back to the next provider.
   */
  async execute(
    chainId: string,
    request: AIRequest,
  ): Promise<FallbackExecutionResult> {
    const chain = this.chains.get(chainId);
    if (!chain) {
      throw new Error(`Fallback chain "${chainId}" not found`);
    }

    const errors: FallbackExecutionResult['errors'] = [];
    let attemptsMade = 0;

    for (const providerEntry of chain.providers) {
      const provider = AIProviderRegistry.createProvider(providerEntry.config);

      for (let retry = 0; retry <= chain.maxRetries; retry++) {
        attemptsMade++;
        const startTime = Date.now();

        try {
          const response = await this.executeWithTimeout(
            provider,
            request,
            providerEntry.timeoutMs,
          );

          return {
            response,
            providerUsed: `${providerEntry.config.provider}:${providerEntry.config.model}`,
            attemptsMade,
            errors,
          };
        } catch (err) {
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

    throw new FallbackChainExhaustedError(
      `All providers in chain "${chain.name}" failed after ${attemptsMade} attempts`,
      errors,
    );
  }

  /**
   * Execute a provider request with a timeout.
   */
  private async executeWithTimeout(
    provider: IAIProvider,
    request: AIRequest,
    timeoutMs: number,
  ): Promise<AIResponse> {
    return new Promise<AIResponse>((resolve, reject) => {
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

/**
 * Error thrown when all providers in a fallback chain have been exhausted.
 */
export class FallbackChainExhaustedError extends Error {
  constructor(
    message: string,
    public readonly errors: Array<{ provider: string; error: string; latencyMs: number }>,
  ) {
    super(message);
    this.name = 'FallbackChainExhaustedError';
  }
}
