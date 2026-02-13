/**
 * TEMPLATE-002: Template Upload Service
 *
 * Manages uploading, validating, and publishing custom templates
 * to the template library.
 */

import { TemplateConfigSchema, type TemplateConfig } from '../types';
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

export class TemplateUploadService {
  private readonly library: TemplateLibrary;
  private nextId = 1;

  constructor(library: TemplateLibrary) {
    this.library = library;
  }

  /**
   * Validates a template upload input against the schema.
   * Returns validation errors if any fields are invalid.
   */
  async validate(input: TemplateUploadInput): Promise<TemplateValidationResult> {
    const errors: string[] = [];

    if (!input.name || input.name.trim().length === 0) {
      errors.push('Template name is required');
    }

    if (!input.category || input.category.trim().length === 0) {
      errors.push('Template category is required');
    }

    if (!input.description || input.description.trim().length === 0) {
      errors.push('Template description is required');
    }

    if (!input.inputSchema || typeof input.inputSchema !== 'object') {
      errors.push('Template inputSchema must be a valid object');
    }

    if (!input.defaultProps || typeof input.defaultProps !== 'object') {
      errors.push('Template defaultProps must be a valid object');
    }

    // Validate that defaultProps keys are a subset of inputSchema keys
    if (input.inputSchema && input.defaultProps) {
      const schemaKeys = new Set(Object.keys(input.inputSchema));
      for (const key of Object.keys(input.defaultProps)) {
        if (!schemaKeys.has(key)) {
          errors.push(`Default prop "${key}" not found in inputSchema`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Uploads a new template. Validates the input first, then
   * adds it to the library in 'draft' (non-public) state.
   */
  async upload(input: TemplateUploadInput): Promise<TemplateConfig> {
    const validation = await this.validate(input);
    if (!validation.valid) {
      throw new Error(`Template validation failed: ${validation.errors.join(', ')}`);
    }

    const templateData = {
      id: `template-${this.nextId++}`,
      name: input.name,
      category: input.category,
      description: input.description,
      thumbnailUrl: input.thumbnailUrl,
      inputSchema: input.inputSchema,
      defaultProps: input.defaultProps,
      tags: input.tags ?? [],
      isPublic: false, // Always start as draft/private
    };

    const template = TemplateConfigSchema.parse(templateData);

    // Add to library
    this.library.loadTemplates([template]);

    return template;
  }

  /**
   * Publishes a previously uploaded template, making it visible
   * to all users in the public library.
   */
  async publish(templateId: string): Promise<TemplateConfig> {
    const template = await this.library.get(templateId);

    // Create an updated version that is public
    const published: TemplateConfig = {
      ...template,
      isPublic: true,
    };

    // Re-load into library (overwrites existing)
    this.library.loadTemplates([published]);

    return published;
  }

  /**
   * Unpublishes a template, removing it from public visibility.
   */
  async unpublish(templateId: string): Promise<TemplateConfig> {
    const template = await this.library.get(templateId);

    const unpublished: TemplateConfig = {
      ...template,
      isPublic: false,
    };

    this.library.loadTemplates([unpublished]);

    return unpublished;
  }
}
