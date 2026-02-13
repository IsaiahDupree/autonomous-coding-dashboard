// User preferences management (cross-cutting)

import type {
  PreferenceCategory,
  PreferenceDefinition,
  UserPreferences,
  PreferenceFieldType,
} from './types';

const categoryStore = new Map<string, PreferenceCategory>();
const definitionStore = new Map<string, PreferenceDefinition>();
const userPrefsStore = new Map<string, UserPreferences>();

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function registerPreferenceCategory(input: {
  name: string;
  label: string;
  description?: string;
  order?: number;
}): PreferenceCategory {
  const cat: PreferenceCategory = {
    id: generateId(),
    name: input.name,
    label: input.label,
    description: input.description,
    order: input.order ?? 0,
  };
  categoryStore.set(cat.id, cat);
  return cat;
}

export function registerPreferenceDefinition(input: {
  key: string;
  label: string;
  description?: string;
  type: PreferenceFieldType;
  categoryId: string;
  defaultValue: unknown;
  options?: unknown[];
  product?: string;
}): PreferenceDefinition {
  const def: PreferenceDefinition = {
    id: generateId(),
    key: input.key,
    label: input.label,
    description: input.description,
    type: input.type,
    categoryId: input.categoryId,
    defaultValue: input.defaultValue,
    options: input.options,
    product: input.product,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  definitionStore.set(def.key, def);
  return def;
}

export function getPreferenceDefinitions(product?: string): PreferenceDefinition[] {
  let defs = Array.from(definitionStore.values());
  if (product) defs = defs.filter((d) => !d.product || d.product === product);
  return defs;
}

export function getUserPreferences(userId: string): UserPreferences {
  const existing = userPrefsStore.get(userId);
  if (existing) return existing;

  const defaults: Record<string, unknown> = {};
  for (const def of definitionStore.values()) {
    defaults[def.key] = def.defaultValue;
  }

  const prefs: UserPreferences = {
    userId,
    preferences: defaults,
    updatedAt: new Date(),
  };
  userPrefsStore.set(userId, prefs);
  return prefs;
}

export function setUserPreference(
  userId: string,
  key: string,
  value: unknown,
): UserPreferences {
  const prefs = getUserPreferences(userId);
  prefs.preferences[key] = value;
  prefs.updatedAt = new Date();
  return prefs;
}

export function resetUserPreferences(userId: string): UserPreferences {
  userPrefsStore.delete(userId);
  return getUserPreferences(userId);
}

export function clearPreferenceStores(): void {
  categoryStore.clear();
  definitionStore.clear();
  userPrefsStore.clear();
}
