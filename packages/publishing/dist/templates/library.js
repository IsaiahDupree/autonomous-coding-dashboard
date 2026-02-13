"use strict";
/**
 * TEMPLATE-001: Template Library
 *
 * Provides read-only access to the template catalog, including
 * listing, searching, and filtering by category.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateLibrary = void 0;
class TemplateLibrary {
    constructor() {
        this.templates = new Map();
    }
    /**
     * Seed the library with a set of templates (e.g., from a database or file).
     */
    loadTemplates(templates) {
        for (const template of templates) {
            this.templates.set(template.id, template);
        }
    }
    /**
     * Lists all templates, optionally filtering by visibility.
     */
    async list(options) {
        let results = Array.from(this.templates.values());
        if (options?.publicOnly) {
            results = results.filter((t) => t.isPublic);
        }
        return results;
    }
    /**
     * Retrieves a single template by its ID.
     */
    async get(templateId) {
        const template = this.templates.get(templateId);
        if (!template) {
            throw new Error(`Template not found: ${templateId}`);
        }
        return template;
    }
    /**
     * Searches templates by name, description, or tags.
     */
    async search(query) {
        const lowerQuery = query.toLowerCase();
        return Array.from(this.templates.values()).filter((t) => {
            return (t.name.toLowerCase().includes(lowerQuery) ||
                t.description.toLowerCase().includes(lowerQuery) ||
                t.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)));
        });
    }
    /**
     * Returns all templates in a given category.
     */
    async getByCategory(category) {
        return Array.from(this.templates.values()).filter((t) => t.category.toLowerCase() === category.toLowerCase());
    }
    /**
     * Returns the count of templates in the library.
     */
    get size() {
        return this.templates.size;
    }
    /**
     * Returns all unique categories present in the library.
     */
    async getCategories() {
        const categories = new Set();
        for (const template of this.templates.values()) {
            categories.add(template.category);
        }
        return Array.from(categories).sort();
    }
}
exports.TemplateLibrary = TemplateLibrary;
//# sourceMappingURL=library.js.map