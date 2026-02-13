"use strict";
/**
 * AI Output Validation (AI-006)
 * Zod schema validation of AI responses, retry on invalid output.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIValidationError = exports.AIOutputValidator = void 0;
const zod_1 = require("zod");
const DEFAULT_RETRY_TEMPLATE = `The previous response was invalid JSON or did not match the expected schema. Please fix the output.

Validation errors:
{{errors}}

Please provide a valid JSON response matching the expected structure.`;
/**
 * Validates AI responses against Zod schemas.
 * Supports automatic retries when validation fails, with error feedback to the AI.
 */
class AIOutputValidator {
    constructor(options = {}) {
        this.maxRetries = options.maxRetries ?? 3;
        this.includeErrorsInRetry = options.includeErrorsInRetry ?? true;
        this.retryPromptTemplate = options.retryPromptTemplate ?? DEFAULT_RETRY_TEMPLATE;
    }
    /**
     * Validate a raw AI response string against a Zod schema.
     * Attempts to parse as JSON first, then validates against the schema.
     */
    validate(content, schema) {
        // Try to extract JSON from the content
        const jsonStr = this.extractJSON(content);
        if (!jsonStr) {
            return {
                success: false,
                errors: new zod_1.z.ZodError([
                    {
                        code: zod_1.z.ZodIssueCode.custom,
                        message: 'Response does not contain valid JSON',
                        path: [],
                    },
                ]),
                rawContent: content,
            };
        }
        try {
            const parsed = JSON.parse(jsonStr);
            const result = schema.safeParse(parsed);
            if (result.success) {
                return {
                    success: true,
                    data: result.data,
                    rawContent: content,
                };
            }
            else {
                return {
                    success: false,
                    errors: result.error,
                    rawContent: content,
                };
            }
        }
        catch {
            return {
                success: false,
                errors: new zod_1.z.ZodError([
                    {
                        code: zod_1.z.ZodIssueCode.custom,
                        message: 'Failed to parse JSON from response',
                        path: [],
                    },
                ]),
                rawContent: content,
            };
        }
    }
    /**
     * Send a request to an AI provider and validate the response.
     * Automatically retries with error feedback if validation fails.
     */
    async validateWithRetry(provider, request, schema, options) {
        const maxRetries = options?.maxRetries ?? this.maxRetries;
        const validationErrors = [];
        let lastResponse;
        let currentRequest = { ...request };
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            const response = await provider.complete(currentRequest);
            lastResponse = response;
            const result = this.validate(response.content, schema);
            if (result.success && result.data !== undefined) {
                return {
                    data: result.data,
                    response,
                    validationAttempts: attempt + 1,
                    validationErrors,
                };
            }
            if (result.errors) {
                validationErrors.push(result.errors);
            }
            // Build retry prompt with error feedback
            if (attempt < maxRetries && this.includeErrorsInRetry && result.errors) {
                const errorDetails = result.errors.issues
                    .map(issue => `- ${issue.path.join('.')}: ${issue.message}`)
                    .join('\n');
                const retryAddendum = this.retryPromptTemplate
                    .replace('{{errors}}', errorDetails)
                    .replace('{{schema}}', '');
                currentRequest = {
                    ...request,
                    prompt: `${request.prompt}\n\n${retryAddendum}`,
                };
            }
        }
        throw new AIValidationError(`Failed to get valid AI response after ${maxRetries + 1} attempts`, validationErrors, lastResponse);
    }
    /**
     * Extract JSON from a string that might contain markdown code blocks or other text.
     */
    extractJSON(content) {
        // Try the whole string first
        const trimmed = content.trim();
        if (this.isJSON(trimmed))
            return trimmed;
        // Try extracting from markdown code blocks
        const codeBlockMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
        if (codeBlockMatch && this.isJSON(codeBlockMatch[1].trim())) {
            return codeBlockMatch[1].trim();
        }
        // Try finding JSON object or array in the text
        const jsonMatch = content.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
        if (jsonMatch && this.isJSON(jsonMatch[1].trim())) {
            return jsonMatch[1].trim();
        }
        return null;
    }
    isJSON(str) {
        try {
            JSON.parse(str);
            return true;
        }
        catch {
            return false;
        }
    }
}
exports.AIOutputValidator = AIOutputValidator;
/**
 * Error thrown when AI output validation fails after all retries.
 */
class AIValidationError extends Error {
    constructor(message, validationErrors, lastResponse) {
        super(message);
        this.validationErrors = validationErrors;
        this.lastResponse = lastResponse;
        this.name = 'AIValidationError';
    }
}
exports.AIValidationError = AIValidationError;
//# sourceMappingURL=ai-validation.js.map