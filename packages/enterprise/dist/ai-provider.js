"use strict";
/**
 * AI Provider Abstraction (AI-001)
 * Unified interface for OpenAI/Anthropic/local models.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIProviderRegistry = exports.LocalModelProvider = exports.AnthropicProvider = exports.OpenAIProvider = void 0;
const types_1 = require("./types");
/**
 * Base class implementing common functionality for AI providers.
 */
class BaseAIProvider {
    constructor(config) {
        this.config = types_1.AIModelConfigSchema.parse(config);
        this.model = config.model;
    }
    async isAvailable() {
        return true;
    }
    estimateCost(inputTokens, outputTokens) {
        const inputCost = (inputTokens / 1000) * this.config.costPer1kInputTokens;
        const outputCost = (outputTokens / 1000) * this.config.costPer1kOutputTokens;
        return Math.round((inputCost + outputCost) * 100); // cents
    }
    buildResponse(content, inputTokens, outputTokens, latencyMs, cached = false) {
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
class OpenAIProvider extends BaseAIProvider {
    constructor(config) {
        super({ ...config, provider: 'openai' });
        this.name = 'openai';
    }
    async complete(request) {
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
exports.OpenAIProvider = OpenAIProvider;
/**
 * Anthropic provider implementation.
 * In production, this would make HTTP requests to the Anthropic API.
 */
class AnthropicProvider extends BaseAIProvider {
    constructor(config) {
        super({ ...config, provider: 'anthropic' });
        this.name = 'anthropic';
    }
    async complete(request) {
        const startTime = Date.now();
        const inputTokens = Math.ceil((request.prompt.length + (request.systemPrompt?.length ?? 0)) / 4);
        const outputTokens = Math.min(request.maxTokens ?? this.config.maxTokens ?? 4096, 100);
        // In production, this would call the Anthropic API
        const content = `[Anthropic ${this.model}] Response to: ${request.prompt.substring(0, 50)}...`;
        const latencyMs = Date.now() - startTime;
        return this.buildResponse(content, inputTokens, outputTokens, latencyMs);
    }
}
exports.AnthropicProvider = AnthropicProvider;
/**
 * Local model provider implementation.
 * For running models locally (e.g., via Ollama, llama.cpp).
 */
class LocalModelProvider extends BaseAIProvider {
    constructor(config) {
        super({ ...config, provider: 'local' });
        this.name = 'local';
    }
    async complete(request) {
        const startTime = Date.now();
        const inputTokens = Math.ceil((request.prompt.length + (request.systemPrompt?.length ?? 0)) / 4);
        const outputTokens = Math.min(request.maxTokens ?? this.config.maxTokens ?? 2048, 100);
        // In production, this would call a local model endpoint
        const content = `[Local ${this.model}] Response to: ${request.prompt.substring(0, 50)}...`;
        const latencyMs = Date.now() - startTime;
        return this.buildResponse(content, inputTokens, outputTokens, latencyMs);
    }
    async isAvailable() {
        // In production, check if the local model server is running
        if (this.config.baseUrl) {
            return true; // Assume available if baseUrl is configured
        }
        return false;
    }
}
exports.LocalModelProvider = LocalModelProvider;
/**
 * AI Provider registry for managing and looking up providers.
 */
class AIProviderRegistry {
    constructor() {
        this.providers = new Map();
    }
    /** Register a provider with a unique key */
    register(key, provider) {
        this.providers.set(key, provider);
    }
    /** Get a provider by key */
    get(key) {
        return this.providers.get(key);
    }
    /** Get all registered providers */
    getAll() {
        return Array.from(this.providers.entries()).map(([key, provider]) => ({
            key,
            provider,
        }));
    }
    /** Remove a provider */
    remove(key) {
        return this.providers.delete(key);
    }
    /** Create a provider from a config object */
    static createProvider(config) {
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
exports.AIProviderRegistry = AIProviderRegistry;
//# sourceMappingURL=ai-provider.js.map