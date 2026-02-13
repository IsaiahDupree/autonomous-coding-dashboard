/**
 * TEMPLATE-001: Template Library
 *
 * Provides read-only access to the template catalog, including
 * listing, searching, and filtering by category.
 */
import type { TemplateConfig } from '../types';
export declare class TemplateLibrary {
    private readonly templates;
    /**
     * Seed the library with a set of templates (e.g., from a database or file).
     */
    loadTemplates(templates: TemplateConfig[]): void;
    /**
     * Lists all templates, optionally filtering by visibility.
     */
    list(options?: {
        publicOnly?: boolean;
    }): Promise<TemplateConfig[]>;
    /**
     * Retrieves a single template by its ID.
     */
    get(templateId: string): Promise<TemplateConfig>;
    /**
     * Searches templates by name, description, or tags.
     */
    search(query: string): Promise<TemplateConfig[]>;
    /**
     * Returns all templates in a given category.
     */
    getByCategory(category: string): Promise<TemplateConfig[]>;
    /**
     * Returns the count of templates in the library.
     */
    get size(): number;
    /**
     * Returns all unique categories present in the library.
     */
    getCategories(): Promise<string[]>;
}
//# sourceMappingURL=library.d.ts.map