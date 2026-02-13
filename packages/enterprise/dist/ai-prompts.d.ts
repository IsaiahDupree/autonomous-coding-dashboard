/**
 * Prompt Template Management (AI-002)
 * Versioned templates, variable interpolation, A/B testing.
 */
import { PromptTemplate } from './types';
export interface CreateTemplateInput {
    id?: string;
    name: string;
    template: string;
    variables?: string[];
    abTestGroup?: string;
}
/**
 * Manages versioned prompt templates with variable interpolation and A/B testing support.
 */
export declare class PromptTemplateManager {
    /** templateId -> version -> template */
    private templates;
    /** name -> templateId (latest active) */
    private nameIndex;
    /** A/B test group -> templateId[] */
    private abTestGroups;
    /** Create a new prompt template */
    createTemplate(input: CreateTemplateInput): PromptTemplate;
    /** Create a new version of an existing template */
    updateTemplate(templateId: string, updates: {
        template?: string;
        variables?: string[];
        isActive?: boolean;
    }): PromptTemplate;
    /** Get a template by ID, optionally at a specific version */
    getTemplate(templateId: string, version?: number): PromptTemplate | undefined;
    /** Get a template by name (latest active version) */
    getTemplateByName(name: string): PromptTemplate | undefined;
    /** Get all versions of a template */
    getTemplateVersions(templateId: string): PromptTemplate[];
    /** List all templates (latest versions only) */
    listTemplates(): PromptTemplate[];
    /** Delete a template and all its versions */
    deleteTemplate(templateId: string): boolean;
    /**
     * Interpolate variables into a template.
     * Variables are marked as {{variableName}} in the template.
     */
    interpolate(templateId: string, variables: Record<string, string>, version?: number): string;
    /** Interpolate variables into a raw template string */
    interpolateString(templateStr: string, variables: Record<string, string>): string;
    /**
     * Select a template for A/B testing.
     * Uses consistent hashing based on a user/session identifier to ensure
     * the same user always gets the same variant.
     */
    selectABTestVariant(groupName: string, userId: string): PromptTemplate | undefined;
    /** Get all templates in an A/B test group */
    getABTestGroup(groupName: string): PromptTemplate[];
    /** Extract variable names from a template string (matches {{varName}} patterns) */
    private extractVariables;
}
//# sourceMappingURL=ai-prompts.d.ts.map