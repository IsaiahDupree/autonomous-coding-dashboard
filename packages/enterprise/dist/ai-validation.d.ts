/**
 * AI Output Validation (AI-006)
 * Zod schema validation of AI responses, retry on invalid output.
 */
import { z } from 'zod';
import { AIRequest, AIResponse } from './types';
import { IAIProvider } from './ai-provider';
export interface ValidationResult<T> {
    success: boolean;
    data?: T;
    errors?: z.ZodError;
    rawContent: string;
}
export interface ValidatedAIResponse<T> {
    data: T;
    response: AIResponse;
    validationAttempts: number;
    validationErrors: z.ZodError[];
}
export interface AIValidationOptions {
    /** Maximum number of retry attempts on validation failure. Default: 3 */
    maxRetries?: number;
    /** Whether to include validation error details in retry prompts. Default: true */
    includeErrorsInRetry?: boolean;
    /** Custom retry prompt template. Use {{errors}} for error details and {{schema}} for schema. */
    retryPromptTemplate?: string;
}
/**
 * Validates AI responses against Zod schemas.
 * Supports automatic retries when validation fails, with error feedback to the AI.
 */
export declare class AIOutputValidator {
    private maxRetries;
    private includeErrorsInRetry;
    private retryPromptTemplate;
    constructor(options?: AIValidationOptions);
    /**
     * Validate a raw AI response string against a Zod schema.
     * Attempts to parse as JSON first, then validates against the schema.
     */
    validate<T>(content: string, schema: z.ZodSchema<T>): ValidationResult<T>;
    /**
     * Send a request to an AI provider and validate the response.
     * Automatically retries with error feedback if validation fails.
     */
    validateWithRetry<T>(provider: IAIProvider, request: AIRequest, schema: z.ZodSchema<T>, options?: {
        maxRetries?: number;
    }): Promise<ValidatedAIResponse<T>>;
    /**
     * Extract JSON from a string that might contain markdown code blocks or other text.
     */
    private extractJSON;
    private isJSON;
}
/**
 * Error thrown when AI output validation fails after all retries.
 */
export declare class AIValidationError extends Error {
    readonly validationErrors: z.ZodError[];
    readonly lastResponse?: AIResponse | undefined;
    constructor(message: string, validationErrors: z.ZodError[], lastResponse?: AIResponse | undefined);
}
//# sourceMappingURL=ai-validation.d.ts.map