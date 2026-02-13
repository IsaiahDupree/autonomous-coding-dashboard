/**
 * TEMPLATE-002: Template Upload Service
 *
 * Manages uploading, validating, and publishing custom templates
 * to the template library.
 */
import { type TemplateConfig } from '../types';
import type { TemplateLibrary } from './library';
export interface TemplateUploadInput {
    name: string;
    category: string;
    description: string;
    thumbnailUrl?: string;
    inputSchema: Record<string, unknown>;
    defaultProps: Record<string, unknown>;
    tags?: string[];
    isPublic?: boolean;
}
export interface TemplateValidationResult {
    valid: boolean;
    errors: string[];
}
export declare class TemplateUploadService {
    private readonly library;
    private nextId;
    constructor(library: TemplateLibrary);
    /**
     * Validates a template upload input against the schema.
     * Returns validation errors if any fields are invalid.
     */
    validate(input: TemplateUploadInput): Promise<TemplateValidationResult>;
    /**
     * Uploads a new template. Validates the input first, then
     * adds it to the library in 'draft' (non-public) state.
     */
    upload(input: TemplateUploadInput): Promise<TemplateConfig>;
    /**
     * Publishes a previously uploaded template, making it visible
     * to all users in the public library.
     */
    publish(templateId: string): Promise<TemplateConfig>;
    /**
     * Unpublishes a template, removing it from public visibility.
     */
    unpublish(templateId: string): Promise<TemplateConfig>;
}
//# sourceMappingURL=upload.d.ts.map