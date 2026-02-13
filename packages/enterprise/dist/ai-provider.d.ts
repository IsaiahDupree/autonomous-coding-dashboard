/**
 * AI Provider Abstraction (AI-001)
 * Unified interface for OpenAI/Anthropic/local models.
 */
import { AIModelConfig, AIProviderName, AIRequest, AIResponse } from './types';
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
declare abstract class BaseAIProvider implements IAIProvider {
    abstract readonly name: AIProviderName;
    readonly model: string;
    protected readonly config: AIModelConfig;
    constructor(config: AIModelConfig);
    abstract complete(request: AIRequest): Promise<AIResponse>;
    isAvailable(): Promise<boolean>;
    estimateCost(inputTokens: number, outputTokens: number): number;
    protected buildResponse(content: string, inputTokens: number, outputTokens: number, latencyMs: number, cached?: boolean): AIResponse;
}
/**
 * OpenAI provider implementation.
 * In production, this would make HTTP requests to the OpenAI API.
 * For this in-memory implementation, it simulates responses.
 */
export declare class OpenAIProvider extends BaseAIProvider {
    readonly name: AIProviderName;
    constructor(config: Omit<AIModelConfig, 'provider'>);
    complete(request: AIRequest): Promise<AIResponse>;
}
/**
 * Anthropic provider implementation.
 * In production, this would make HTTP requests to the Anthropic API.
 */
export declare class AnthropicProvider extends BaseAIProvider {
    readonly name: AIProviderName;
    constructor(config: Omit<AIModelConfig, 'provider'>);
    complete(request: AIRequest): Promise<AIResponse>;
}
/**
 * Local model provider implementation.
 * For running models locally (e.g., via Ollama, llama.cpp).
 */
export declare class LocalModelProvider extends BaseAIProvider {
    readonly name: AIProviderName;
    constructor(config: Omit<AIModelConfig, 'provider'>);
    complete(request: AIRequest): Promise<AIResponse>;
    isAvailable(): Promise<boolean>;
}
/**
 * AI Provider registry for managing and looking up providers.
 */
export declare class AIProviderRegistry {
    private providers;
    /** Register a provider with a unique key */
    register(key: string, provider: IAIProvider): void;
    /** Get a provider by key */
    get(key: string): IAIProvider | undefined;
    /** Get all registered providers */
    getAll(): Array<{
        key: string;
        provider: IAIProvider;
    }>;
    /** Remove a provider */
    remove(key: string): boolean;
    /** Create a provider from a config object */
    static createProvider(config: AIModelConfig): IAIProvider;
}
export {};
//# sourceMappingURL=ai-provider.d.ts.map