/**
 * system-config.ts - ADMIN-005: Admin System Config
 *
 * Runtime configuration, environment variables, feature toggles.
 * Uses an in-memory store for state.
 */

import {
  SystemConfigEntry,
  SystemConfigEntrySchema,
  FeatureToggle,
  FeatureToggleSchema,
  EnvVarDefinition,
  EnvVarDefinitionSchema,
  SetConfig,
  SetConfigSchema,
  SetFeatureToggle,
  SetFeatureToggleSchema,
} from './types';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function nowISO(): string {
  return new Date().toISOString();
}

/** In-memory stores */
const configEntries: Map<string, SystemConfigEntry> = new Map(); // key -> entry
const featureToggles: Map<string, FeatureToggle> = new Map(); // key -> toggle
const envVars: Map<string, EnvVarDefinition> = new Map(); // `${service}:${name}` -> var

/**
 * Set a runtime configuration value.
 */
export function setConfig(input: SetConfig, modifiedBy: string): SystemConfigEntry {
  const data = SetConfigSchema.parse(input);
  const now = nowISO();

  const existing = configEntries.get(data.key);
  const entry: SystemConfigEntry = SystemConfigEntrySchema.parse({
    key: data.key,
    value: data.value,
    valueType: data.valueType,
    description: data.description || existing?.description || '',
    isSecret: data.isSecret ?? existing?.isSecret ?? false,
    environment: data.environment,
    category: data.category || existing?.category || 'general',
    lastModifiedBy: modifiedBy,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  });

  configEntries.set(data.key, entry);
  return entry;
}

/**
 * Get a configuration value by key.
 */
export function getConfig(key: string): SystemConfigEntry | undefined {
  return configEntries.get(key);
}

/**
 * Get a typed configuration value.
 */
export function getConfigValue<T = string>(key: string): T | undefined {
  const entry = configEntries.get(key);
  if (!entry) return undefined;

  switch (entry.valueType) {
    case 'number':
      return Number(entry.value) as unknown as T;
    case 'boolean':
      return (entry.value === 'true') as unknown as T;
    case 'json':
      return JSON.parse(entry.value) as T;
    default:
      return entry.value as unknown as T;
  }
}

/**
 * List all configuration entries, optionally filtered.
 */
export function listConfig(filters?: {
  category?: string;
  environment?: string;
  search?: string;
}): SystemConfigEntry[] {
  let result = Array.from(configEntries.values());

  if (filters?.category) {
    result = result.filter((e) => e.category === filters.category);
  }
  if (filters?.environment) {
    result = result.filter(
      (e) => e.environment === filters.environment || e.environment === 'all'
    );
  }
  if (filters?.search) {
    const term = filters.search.toLowerCase();
    result = result.filter(
      (e) =>
        e.key.toLowerCase().includes(term) ||
        e.description.toLowerCase().includes(term)
    );
  }

  return result.sort((a, b) => a.key.localeCompare(b.key));
}

/**
 * Delete a configuration entry.
 */
export function deleteConfig(key: string): boolean {
  return configEntries.delete(key);
}

/**
 * Set a feature toggle.
 */
export function setFeatureToggle(input: SetFeatureToggle, modifiedBy?: string): FeatureToggle {
  const data = SetFeatureToggleSchema.parse(input);
  const now = nowISO();

  const existing = featureToggles.get(data.key);
  const toggle: FeatureToggle = FeatureToggleSchema.parse({
    key: data.key,
    enabled: data.enabled,
    description: data.description || existing?.description || '',
    rolloutPercentage: data.rolloutPercentage ?? existing?.rolloutPercentage ?? 100,
    targetUsers: data.targetUsers || existing?.targetUsers || [],
    targetOrganizations: data.targetOrganizations || existing?.targetOrganizations || [],
    environment: data.environment,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  });

  featureToggles.set(data.key, toggle);
  return toggle;
}

/**
 * Get a feature toggle by key.
 */
export function getFeatureToggle(key: string): FeatureToggle | undefined {
  return featureToggles.get(key);
}

/**
 * Check if a feature is enabled for a given context.
 */
export function isFeatureEnabled(
  key: string,
  context?: { userId?: string; organizationId?: string; environment?: string }
): boolean {
  const toggle = featureToggles.get(key);
  if (!toggle) return false;
  if (!toggle.enabled) return false;

  // Check environment
  if (context?.environment && toggle.environment !== 'all' && toggle.environment !== context.environment) {
    return false;
  }

  // Check targeted users
  if (toggle.targetUsers.length > 0 && context?.userId) {
    if (toggle.targetUsers.includes(context.userId)) return true;
  }

  // Check targeted organizations
  if (toggle.targetOrganizations.length > 0 && context?.organizationId) {
    if (toggle.targetOrganizations.includes(context.organizationId)) return true;
  }

  // If targets specified but no match, only return true if no targets are specified
  if (toggle.targetUsers.length > 0 || toggle.targetOrganizations.length > 0) {
    if (!context?.userId && !context?.organizationId) {
      // No context to match against targets
      return toggle.rolloutPercentage >= 100;
    }
    // Targets specified but user/org not in targets
    if (toggle.targetUsers.length > 0 && context?.userId && !toggle.targetUsers.includes(context.userId)) {
      return false;
    }
    if (toggle.targetOrganizations.length > 0 && context?.organizationId && !toggle.targetOrganizations.includes(context.organizationId)) {
      return false;
    }
  }

  // Rollout percentage check (simplified - uses random, real impl would hash userId)
  if (toggle.rolloutPercentage < 100) {
    if (context?.userId) {
      // Deterministic: hash the userId + key
      let hash = 0;
      const str = `${context.userId}:${key}`;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      return (Math.abs(hash) % 100) < toggle.rolloutPercentage;
    }
    return false;
  }

  return true;
}

/**
 * List all feature toggles.
 */
export function listFeatureToggles(environment?: string): FeatureToggle[] {
  let result = Array.from(featureToggles.values());
  if (environment) {
    result = result.filter((t) => t.environment === environment || t.environment === 'all');
  }
  return result.sort((a, b) => a.key.localeCompare(b.key));
}

/**
 * Delete a feature toggle.
 */
export function deleteFeatureToggle(key: string): boolean {
  return featureToggles.delete(key);
}

/**
 * Set an environment variable definition.
 */
export function setEnvVar(input: EnvVarDefinition): EnvVarDefinition {
  const data = EnvVarDefinitionSchema.parse(input);
  const key = `${data.service}:${data.name}`;
  envVars.set(key, data);
  return data;
}

/**
 * Get an environment variable definition.
 */
export function getEnvVar(service: string, name: string): EnvVarDefinition | undefined {
  return envVars.get(`${service}:${name}`);
}

/**
 * List environment variables for a service.
 */
export function listEnvVars(service?: string): EnvVarDefinition[] {
  let result = Array.from(envVars.values());
  if (service) {
    result = result.filter((v) => v.service === service);
  }
  return result.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Delete an environment variable definition.
 */
export function deleteEnvVar(service: string, name: string): boolean {
  return envVars.delete(`${service}:${name}`);
}

/**
 * Clear the in-memory stores (for testing).
 */
export function clearConfigStores(): void {
  configEntries.clear();
  featureToggles.clear();
  envVars.clear();
}
