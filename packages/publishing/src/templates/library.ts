/**
 * TEMPLATE-001: Template Library
 *
 * Provides read-only access to the template catalog, including
 * listing, searching, and filtering by category.
 */

import type { TemplateConfig } from '../types';

export class TemplateLibrary {
  private readonly templates = new Map<string, TemplateConfig>();

  /**
   * Seed the library with a set of templates (e.g., from a database or file).
   */
  loadTemplates(templates: TemplateConfig[]): void {
    for (const template of templates) {
      this.templates.set(template.id, template);
    }
  }

  /**
   * Lists all templates, optionally filtering by visibility.
   */
  async list(options?: { publicOnly?: boolean }): Promise<TemplateConfig[]> {
    let results = Array.from(this.templates.values());

    if (options?.publicOnly) {
      results = results.filter((t) => t.isPublic);
    }

    return results;
  }

  /**
   * Retrieves a single template by its ID.
   */
  async get(templateId: string): Promise<TemplateConfig> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }
    return template;
  }

  /**
   * Searches templates by name, description, or tags.
   */
  async search(query: string): Promise<TemplateConfig[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.templates.values()).filter((t) => {
      return (
        t.name.toLowerCase().includes(lowerQuery) ||
        t.description.toLowerCase().includes(lowerQuery) ||
        t.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
      );
    });
  }

  /**
   * Returns all templates in a given category.
   */
  async getByCategory(category: string): Promise<TemplateConfig[]> {
    return Array.from(this.templates.values()).filter(
      (t) => t.category.toLowerCase() === category.toLowerCase(),
    );
  }

  /**
   * Returns the count of templates in the library.
   */
  get size(): number {
    return this.templates.size;
  }

  /**
   * Returns all unique categories present in the library.
   */
  async getCategories(): Promise<string[]> {
    const categories = new Set<string>();
    for (const template of this.templates.values()) {
      categories.add(template.category);
    }
    return Array.from(categories).sort();
  }
}
