// MOD-002: AI Content Safety Checks / Automated Content Filtering

import type {
  ContentFilterRule,
  FilterResult,
  FilterSeverity,
  FilterAction,
  ModerationItemType,
} from './types';

const ruleStore = new Map<string, ContentFilterRule>();

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export interface CreateFilterRuleInput {
  name: string;
  description?: string;
  type: ContentFilterRule['type'];
  pattern?: string;
  keywords?: string[];
  severity: FilterSeverity;
  action: FilterAction;
  appliesTo?: ModerationItemType[];
}

export function createFilterRule(input: CreateFilterRuleInput): ContentFilterRule {
  const now = new Date();
  const rule: ContentFilterRule = {
    id: generateId(),
    name: input.name,
    description: input.description,
    type: input.type,
    pattern: input.pattern,
    keywords: input.keywords,
    severity: input.severity,
    action: input.action,
    enabled: true,
    appliesTo: input.appliesTo,
    createdAt: now,
    updatedAt: now,
  };
  ruleStore.set(rule.id, rule);
  return rule;
}

export function getFilterRuleById(id: string): ContentFilterRule | undefined {
  return ruleStore.get(id);
}

export function listFilterRules(enabledOnly: boolean = false): ContentFilterRule[] {
  const rules = Array.from(ruleStore.values());
  return enabledOnly ? rules.filter((r) => r.enabled) : rules;
}

export function updateFilterRule(
  id: string,
  updates: Partial<CreateFilterRuleInput>,
): ContentFilterRule {
  const rule = ruleStore.get(id);
  if (!rule) throw new Error(`Filter rule ${id} not found`);
  Object.assign(rule, updates, { updatedAt: new Date() });
  return rule;
}

export function toggleFilterRule(id: string, enabled: boolean): ContentFilterRule {
  const rule = ruleStore.get(id);
  if (!rule) throw new Error(`Filter rule ${id} not found`);
  rule.enabled = enabled;
  rule.updatedAt = new Date();
  return rule;
}

export function deleteFilterRule(id: string): boolean {
  return ruleStore.delete(id);
}

const SEVERITY_ORDER: Record<FilterSeverity, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

export function filterContent(
  contentId: string,
  content: string,
  contentType?: ModerationItemType,
): FilterResult {
  const rules = Array.from(ruleStore.values()).filter((r) => {
    if (!r.enabled) return false;
    if (r.appliesTo && contentType && !r.appliesTo.includes(contentType)) return false;
    return true;
  });

  const matchedRules: FilterResult['matchedRules'] = [];

  for (const rule of rules) {
    let matched = false;
    let matchDetails: string | undefined;

    if (rule.type === 'keyword' && rule.keywords) {
      const lower = content.toLowerCase();
      for (const kw of rule.keywords) {
        if (lower.includes(kw.toLowerCase())) {
          matched = true;
          matchDetails = `Matched keyword: "${kw}"`;
          break;
        }
      }
    } else if (rule.type === 'regex' && rule.pattern) {
      try {
        const re = new RegExp(rule.pattern, 'i');
        const m = content.match(re);
        if (m) {
          matched = true;
          matchDetails = `Matched pattern: "${m[0]}"`;
        }
      } catch {
        // Invalid regex, skip
      }
    }

    if (matched) {
      matchedRules.push({
        ruleId: rule.id,
        ruleName: rule.name,
        severity: rule.severity,
        action: rule.action,
        matchDetails,
      });
    }
  }

  let overallSeverity: FilterSeverity | undefined;
  let overallAction: FilterAction | undefined;

  if (matchedRules.length > 0) {
    matchedRules.sort((a, b) => SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity]);
    overallSeverity = matchedRules[0].severity;
    overallAction = matchedRules[0].action;
  }

  return {
    contentId,
    matched: matchedRules.length > 0,
    matchedRules,
    overallSeverity,
    overallAction,
    processedAt: new Date(),
  };
}

export function clearFilterRuleStore(): void {
  ruleStore.clear();
}
