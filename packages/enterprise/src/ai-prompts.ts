/**
 * Prompt Template Management (AI-002)
 * Versioned templates, variable interpolation, A/B testing.
 */

import { createHash } from 'crypto';
import { PromptTemplate, PromptTemplateSchema } from './types';

export interface CreateTemplateInput {
  id?: string;
  name: string;
  template: string;
  variables?: string[];
  abTestGroup?: string;
}

let templateIdCounter = 0;

/**
 * Manages versioned prompt templates with variable interpolation and A/B testing support.
 */
export class PromptTemplateManager {
  /** templateId -> version -> template */
  private templates: Map<string, Map<number, PromptTemplate>> = new Map();
  /** name -> templateId (latest active) */
  private nameIndex: Map<string, string> = new Map();
  /** A/B test group -> templateId[] */
  private abTestGroups: Map<string, string[]> = new Map();

  /** Create a new prompt template */
  createTemplate(input: CreateTemplateInput): PromptTemplate {
    templateIdCounter++;
    const id = input.id ?? `tpl_${templateIdCounter}`;

    // Auto-detect variables if not provided
    const variables = input.variables ?? this.extractVariables(input.template);

    const now = Date.now();
    const template = PromptTemplateSchema.parse({
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

    const versionMap = new Map<number, PromptTemplate>();
    versionMap.set(1, template);
    this.templates.set(id, versionMap);
    this.nameIndex.set(input.name, id);

    // Register in A/B test group
    if (input.abTestGroup) {
      if (!this.abTestGroups.has(input.abTestGroup)) {
        this.abTestGroups.set(input.abTestGroup, []);
      }
      this.abTestGroups.get(input.abTestGroup)!.push(id);
    }

    return template;
  }

  /** Create a new version of an existing template */
  updateTemplate(
    templateId: string,
    updates: { template?: string; variables?: string[]; isActive?: boolean },
  ): PromptTemplate {
    const versionMap = this.templates.get(templateId);
    if (!versionMap) {
      throw new Error(`Template "${templateId}" not found`);
    }

    const latestVersion = Math.max(...Array.from(versionMap.keys()));
    const latest = versionMap.get(latestVersion)!;
    const newVersion = latestVersion + 1;

    const newTemplate: PromptTemplate = {
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
  getTemplate(templateId: string, version?: number): PromptTemplate | undefined {
    const versionMap = this.templates.get(templateId);
    if (!versionMap) return undefined;

    if (version !== undefined) {
      return versionMap.get(version);
    }

    // Return latest version
    const latestVersion = Math.max(...Array.from(versionMap.keys()));
    return versionMap.get(latestVersion);
  }

  /** Get a template by name (latest active version) */
  getTemplateByName(name: string): PromptTemplate | undefined {
    const id = this.nameIndex.get(name);
    if (!id) return undefined;
    return this.getTemplate(id);
  }

  /** Get all versions of a template */
  getTemplateVersions(templateId: string): PromptTemplate[] {
    const versionMap = this.templates.get(templateId);
    if (!versionMap) return [];
    return Array.from(versionMap.values()).sort((a, b) => a.version - b.version);
  }

  /** List all templates (latest versions only) */
  listTemplates(): PromptTemplate[] {
    const results: PromptTemplate[] = [];
    for (const [id] of this.templates) {
      const template = this.getTemplate(id);
      if (template) results.push(template);
    }
    return results;
  }

  /** Delete a template and all its versions */
  deleteTemplate(templateId: string): boolean {
    const versionMap = this.templates.get(templateId);
    if (!versionMap) return false;

    // Clean up name index
    const template = this.getTemplate(templateId);
    if (template) {
      this.nameIndex.delete(template.name);

      // Clean up A/B test groups
      if (template.abTestGroup) {
        const group = this.abTestGroups.get(template.abTestGroup);
        if (group) {
          const idx = group.indexOf(templateId);
          if (idx >= 0) group.splice(idx, 1);
          if (group.length === 0) this.abTestGroups.delete(template.abTestGroup);
        }
      }
    }

    return this.templates.delete(templateId);
  }

  /**
   * Interpolate variables into a template.
   * Variables are marked as {{variableName}} in the template.
   */
  interpolate(templateId: string, variables: Record<string, string>, version?: number): string {
    const template = this.getTemplate(templateId, version);
    if (!template) {
      throw new Error(`Template "${templateId}" not found`);
    }

    return this.interpolateString(template.template, variables);
  }

  /** Interpolate variables into a raw template string */
  interpolateString(templateStr: string, variables: Record<string, string>): string {
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
  selectABTestVariant(groupName: string, userId: string): PromptTemplate | undefined {
    const templateIds = this.abTestGroups.get(groupName);
    if (!templateIds || templateIds.length === 0) return undefined;

    // Filter to only active templates
    const activeTemplates = templateIds
      .map(id => this.getTemplate(id))
      .filter((t): t is PromptTemplate => t !== undefined && t.isActive);

    if (activeTemplates.length === 0) return undefined;
    if (activeTemplates.length === 1) return activeTemplates[0];

    // Consistent hash to select variant
    const hash = createHash('sha256')
      .update(`${groupName}:${userId}`)
      .digest('hex');
    const hashInt = parseInt(hash.substring(0, 8), 16);
    const index = hashInt % activeTemplates.length;

    return activeTemplates[index];
  }

  /** Get all templates in an A/B test group */
  getABTestGroup(groupName: string): PromptTemplate[] {
    const templateIds = this.abTestGroups.get(groupName) ?? [];
    return templateIds
      .map(id => this.getTemplate(id))
      .filter((t): t is PromptTemplate => t !== undefined);
  }

  /** Extract variable names from a template string (matches {{varName}} patterns) */
  private extractVariables(template: string): string[] {
    const regex = /\{\{(\w+)\}\}/g;
    const variables: Set<string> = new Set();
    let match: RegExpExecArray | null;
    while ((match = regex.exec(template)) !== null) {
      variables.add(match[1]);
    }
    return Array.from(variables);
  }
}
