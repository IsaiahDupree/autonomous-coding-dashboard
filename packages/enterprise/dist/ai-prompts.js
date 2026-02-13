"use strict";
/**
 * Prompt Template Management (AI-002)
 * Versioned templates, variable interpolation, A/B testing.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromptTemplateManager = void 0;
const crypto_1 = require("crypto");
const types_1 = require("./types");
let templateIdCounter = 0;
/**
 * Manages versioned prompt templates with variable interpolation and A/B testing support.
 */
class PromptTemplateManager {
    constructor() {
        /** templateId -> version -> template */
        this.templates = new Map();
        /** name -> templateId (latest active) */
        this.nameIndex = new Map();
        /** A/B test group -> templateId[] */
        this.abTestGroups = new Map();
    }
    /** Create a new prompt template */
    createTemplate(input) {
        templateIdCounter++;
        const id = input.id ?? `tpl_${templateIdCounter}`;
        // Auto-detect variables if not provided
        const variables = input.variables ?? this.extractVariables(input.template);
        const now = Date.now();
        const template = types_1.PromptTemplateSchema.parse({
            id,
            name: input.name,
            version: 1,
            template: input.template,
            variables,
            isActive: true,
            abTestGroup: input.abTestGroup,
            createdAt: now,
            updatedAt: now,
        });
        const versionMap = new Map();
        versionMap.set(1, template);
        this.templates.set(id, versionMap);
        this.nameIndex.set(input.name, id);
        // Register in A/B test group
        if (input.abTestGroup) {
            if (!this.abTestGroups.has(input.abTestGroup)) {
                this.abTestGroups.set(input.abTestGroup, []);
            }
            this.abTestGroups.get(input.abTestGroup).push(id);
        }
        return template;
    }
    /** Create a new version of an existing template */
    updateTemplate(templateId, updates) {
        const versionMap = this.templates.get(templateId);
        if (!versionMap) {
            throw new Error(`Template "${templateId}" not found`);
        }
        const latestVersion = Math.max(...Array.from(versionMap.keys()));
        const latest = versionMap.get(latestVersion);
        const newVersion = latestVersion + 1;
        const newTemplate = {
            ...latest,
            version: newVersion,
            template: updates.template ?? latest.template,
            variables: updates.variables ?? (updates.template ? this.extractVariables(updates.template) : latest.variables),
            isActive: updates.isActive ?? latest.isActive,
            updatedAt: Date.now(),
        };
        versionMap.set(newVersion, newTemplate);
        return newTemplate;
    }
    /** Get a template by ID, optionally at a specific version */
    getTemplate(templateId, version) {
        const versionMap = this.templates.get(templateId);
        if (!versionMap)
            return undefined;
        if (version !== undefined) {
            return versionMap.get(version);
        }
        // Return latest version
        const latestVersion = Math.max(...Array.from(versionMap.keys()));
        return versionMap.get(latestVersion);
    }
    /** Get a template by name (latest active version) */
    getTemplateByName(name) {
        const id = this.nameIndex.get(name);
        if (!id)
            return undefined;
        return this.getTemplate(id);
    }
    /** Get all versions of a template */
    getTemplateVersions(templateId) {
        const versionMap = this.templates.get(templateId);
        if (!versionMap)
            return [];
        return Array.from(versionMap.values()).sort((a, b) => a.version - b.version);
    }
    /** List all templates (latest versions only) */
    listTemplates() {
        const results = [];
        for (const [id] of this.templates) {
            const template = this.getTemplate(id);
            if (template)
                results.push(template);
        }
        return results;
    }
    /** Delete a template and all its versions */
    deleteTemplate(templateId) {
        const versionMap = this.templates.get(templateId);
        if (!versionMap)
            return false;
        // Clean up name index
        const template = this.getTemplate(templateId);
        if (template) {
            this.nameIndex.delete(template.name);
            // Clean up A/B test groups
            if (template.abTestGroup) {
                const group = this.abTestGroups.get(template.abTestGroup);
                if (group) {
                    const idx = group.indexOf(templateId);
                    if (idx >= 0)
                        group.splice(idx, 1);
                    if (group.length === 0)
                        this.abTestGroups.delete(template.abTestGroup);
                }
            }
        }
        return this.templates.delete(templateId);
    }
    /**
     * Interpolate variables into a template.
     * Variables are marked as {{variableName}} in the template.
     */
    interpolate(templateId, variables, version) {
        const template = this.getTemplate(templateId, version);
        if (!template) {
            throw new Error(`Template "${templateId}" not found`);
        }
        return this.interpolateString(template.template, variables);
    }
    /** Interpolate variables into a raw template string */
    interpolateString(templateStr, variables) {
        let result = templateStr;
        for (const [key, value] of Object.entries(variables)) {
            result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
        }
        return result;
    }
    /**
     * Select a template for A/B testing.
     * Uses consistent hashing based on a user/session identifier to ensure
     * the same user always gets the same variant.
     */
    selectABTestVariant(groupName, userId) {
        const templateIds = this.abTestGroups.get(groupName);
        if (!templateIds || templateIds.length === 0)
            return undefined;
        // Filter to only active templates
        const activeTemplates = templateIds
            .map(id => this.getTemplate(id))
            .filter((t) => t !== undefined && t.isActive);
        if (activeTemplates.length === 0)
            return undefined;
        if (activeTemplates.length === 1)
            return activeTemplates[0];
        // Consistent hash to select variant
        const hash = (0, crypto_1.createHash)('sha256')
            .update(`${groupName}:${userId}`)
            .digest('hex');
        const hashInt = parseInt(hash.substring(0, 8), 16);
        const index = hashInt % activeTemplates.length;
        return activeTemplates[index];
    }
    /** Get all templates in an A/B test group */
    getABTestGroup(groupName) {
        const templateIds = this.abTestGroups.get(groupName) ?? [];
        return templateIds
            .map(id => this.getTemplate(id))
            .filter((t) => t !== undefined);
    }
    /** Extract variable names from a template string (matches {{varName}} patterns) */
    extractVariables(template) {
        const regex = /\{\{(\w+)\}\}/g;
        const variables = new Set();
        let match;
        while ((match = regex.exec(template)) !== null) {
            variables.add(match[1]);
        }
        return Array.from(variables);
    }
}
exports.PromptTemplateManager = PromptTemplateManager;
//# sourceMappingURL=ai-prompts.js.map