/**
 * AI Provider Abstraction (AI-001)
 * Unified interface for OpenAI/Anthropic/local models.
 */

import {
  AIModelConfig,
  AIModelConfigSchema,
  AIProviderName,
  AIRequest,
  AIResponse,
} from './types';

/**
 * Abstract interface that all AI providers must implement.
 */
export interface IAIProvider {
  readonly name: AIProviderName;
  readonly model: string;

  /** Send a completion request to the provider */
  complete(request: AIRequest): Promise<AIResponse>;

  /** Check if the provider is available/healthy */
  isAvailable(): Promise<boolean>;

  /** Get the cost for a given token count */
  estimateCost(inputTokens: number, outputTokens: number): number;
}

/**
 * Base class implementing common functionality for AI providers.
 */
abstract class BaseAIProvider implements IAIProvider {
  abstract readonly name: AIProviderName;
  readonly model: string;
  protected readonly config: AIModelConfig;

  constructor(config: AIModelConfig) {
    this.config = AIModelConfigSchema.parse(config);
    this.model = config.model;
  }

  abstract complete(request: AIRequest): Promise<AIResponse>;

  async isAvailable(): Promise<boolean> {
    return true;
  }

  estimateCost(inputTokens: number, outputTokens: number): number {
    const inputCost = (inputTokens / 1000) * this.config.costPer1kInputTokens;
    const outputCost = (outputTokens / 1000) * this.config.costPer1kOutputTokens;
    return Math.round((inputCost + outputCost) * 100); // cents
  }

  protected buildResponse(
    content: string,
    inputTokens: number,
    outputTokens: number,
    latencyMs: number,
    cached = false,
  ): AIResponse {
    const costCents = this.estimateCost(inputTokens, outputTokens);
    return {
      content,
      provider: this.name,
      model: this.model,
      inputTokens,
      outputTokens,
      latencyMs,
      cached,
      costCents,
      metadata: {},
    };
  }
}

/**
 * OpenAI provider implementation.
 * In production, this would make HTTP requests to the OpenAI API.
 * For this in-memory implementation, it simulates responses.
 */
export class OpenAIProvider extends BaseAIProvider {
  readonly name: AIProviderName = 'openai';

  constructor(config: Omit<AIModelConfig, 'provider'>) {
    super({ ...config, provider: 'openai' });
  }

  async complete(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();

    // Simulate token counting (rough approximation: 1 token per 4 chars)
    const inputTokens = Math.ceil((request.prompt.length + (request.systemPrompt?.length ?? 0)) / 4);
    const outputTokens = Math.min(request.maxTokens ?? this.config.maxTokens ?? 4096, 100);

    // In production, this would call the OpenAI API
    const content = `[OpenAI ${this.model}] Response to: ${request.prompt.substring(0, 50)}...`;
    const latencyMs = Date.now() - startTime;

    return this.buildResponse(content, inputTokens, outputTokens, latencyMs);
  }
}

/**
 * Anthropic provider implementation.
 * In production, this would make HTTP requests to the Anthropic API.
 */
export class AnthropicProvider extends BaseAIProvider {
  readonly name: AIProviderName = 'anthropic';

  constructor(config: Omit<AIModelConfig, 'provider'>) {
    super({ ...config, provider: 'anthropic' });
  }

  async complete(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();

    const inputTokens = Math.ceil((request.prompt.length + (request.systemPrompt?.length ?? 0)) / 4);
    const outputTokens = Math.min(request.maxTokens ?? this.config.maxTokens ?? 4096, 100);

    // In production, this would call the Anthropic API
    const content = `[Anthropic ${this.model}] Response to: ${request.prompt.substring(0, 50)}...`;
    const latencyMs = Date.now() - startTime;

    return this.buildResponse(content, inputTokens, outputTokens, latencyMs);
  }
}

/**
 * Local model provider implementation.
 * For running models locally (e.g., via Ollama, llama.cpp).
 */
export class LocalModelProvider extends BaseAIProvider {
  readonly name: AIProviderName = 'local';

  constructor(config: Omit<AIModelConfig, 'provider'>) {
    super({ ...config, provider: 'local' });
  }

  async complete(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();

    const inputTokens = Math.ceil((request.prompt.length + (request.systemPrompt?.length ?? 0)) / 4);
    const outputTokens = Math.min(request.maxTokens ?? this.config.maxTokens ?? 2048, 100);

    // In production, this would call a local model endpoint
    const content = `[Local ${this.model}] Response to: ${request.prompt.substring(0, 50)}...`;
    const latencyMs = Date.now() - startTime;

    return this.buildResponse(content, inputTokens, outputTokens, latencyMs);
  }

  async isAvailable(): Promise<boolean> {
    // In production, check if the local model server is running
    if (this.config.baseUrl) {
      return true; // Assume available if baseUrl is configured
    }
    return false;
  }
}

/**
 * AI Provider registry for managing and looking up providers.
 */
export class AIProviderRegistry {
  private providers: Map<string, IAIProvider> = new Map();

  /** Register a provider with a unique key */
  register(key: string, provider: IAIProvider): void {
    this.providers.set(key, provider);
  }

  /** Get a provider by key */
  get(key: string): IAIProvider | undefined {
    return this.providers.get(key);
  }

  /** Get all registered providers */
  getAll(): Array<{ key: string; provider: IAIProvider }> {
    return Array.from(this.providers.entries()).map(([key, provider]) => ({
      key,
      provider,
    }));
  }

  /** Remove a provider */
  remove(key: string): boolean {
    return this.providers.delete(key);
  }

  /** Create a provider from a config object */
  static createProvider(config: AIModelConfig): IAIProvider {
    switch (config.provider) {
      case 'openai':
        return new OpenAIProvider(config);
      case 'anthropic':
        return new AnthropicProvider(config);
      case 'local':
        return new LocalModelProvider(config);
      default:
        throw new Error(`Unknown provider: ${config.provider}`);
    }
  }
}
