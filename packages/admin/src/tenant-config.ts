/**
 * tenant-config.ts - MT-003: Tenant Configuration
 *
 * Per-tenant settings, custom branding, limits.
 * Uses an in-memory store for state.
 */

import {
  TenantConfig,
  TenantConfigSchema,
  TenantBranding,
  TenantBrandingSchema,
  TenantLimits,
  TenantLimitsSchema,
  UpdateTenantConfig,
  UpdateTenantConfigSchema,
} from './types';

function nowISO(): string {
  return new Date().toISOString();
}

/** In-memory store: tenantId -> config */
const tenantConfigs: Map<string, TenantConfig> = new Map();

/**
 * Default branding for new tenants.
 */
const DEFAULT_BRANDING: TenantBranding = {
  primaryColor: '#3B82F6',
  secondaryColor: '#1E40AF',
};

/**
 * Default limits for new tenants.
 */
const DEFAULT_LIMITS: TenantLimits = {
  maxUsers: 10,
  maxStorageBytes: 1073741824, // 1 GB
  maxApiCallsPerDay: 10000,
  maxProjectsPerUser: 5,
  maxFileUploadBytes: 52428800, // 50 MB
  customLimits: {},
};

/**
 * Initialize configuration for a new tenant.
 */
export function initializeTenantConfig(
  tenantId: string,
  overrides?: Partial<Pick<TenantConfig, 'branding' | 'limits' | 'locale' | 'timezone'>>
): TenantConfig {
  const now = nowISO();

  const config: TenantConfig = TenantConfigSchema.parse({
    tenantId,
    branding: overrides?.branding
      ? { ...DEFAULT_BRANDING, ...overrides.branding }
      : DEFAULT_BRANDING,
    limits: overrides?.limits
      ? { ...DEFAULT_LIMITS, ...overrides.limits }
      : DEFAULT_LIMITS,
    features: {},
    settings: {},
    locale: overrides?.locale || 'en',
    timezone: overrides?.timezone || 'UTC',
    createdAt: now,
    updatedAt: now,
  });

  tenantConfigs.set(tenantId, config);
  return config;
}

/**
 * Get the configuration for a tenant.
 */
export function getTenantConfig(tenantId: string): TenantConfig | undefined {
  return tenantConfigs.get(tenantId);
}

/**
 * Update tenant configuration.
 */
export function updateTenantConfig(tenantId: string, input: UpdateTenantConfig): TenantConfig {
  const existing = tenantConfigs.get(tenantId);
  if (!existing) {
    throw new Error(`Tenant config not found: ${tenantId}`);
  }

  const data = UpdateTenantConfigSchema.parse(input);
  const now = nowISO();

  const updated: TenantConfig = TenantConfigSchema.parse({
    ...existing,
    branding: data.branding ? { ...existing.branding, ...data.branding } : existing.branding,
    limits: data.limits ? { ...existing.limits, ...data.limits } : existing.limits,
    features: data.features !== undefined ? { ...existing.features, ...data.features } : existing.features,
    settings: data.settings !== undefined ? { ...existing.settings, ...data.settings } : existing.settings,
    locale: data.locale || existing.locale,
    timezone: data.timezone || existing.timezone,
    updatedAt: now,
  });

  tenantConfigs.set(tenantId, updated);
  return updated;
}

/**
 * Update tenant branding.
 */
export function updateTenantBranding(tenantId: string, branding: Partial<TenantBranding>): TenantConfig {
  return updateTenantConfig(tenantId, { branding });
}

/**
 * Update tenant limits.
 */
export function updateTenantLimits(tenantId: string, limits: Partial<TenantLimits>): TenantConfig {
  return updateTenantConfig(tenantId, { limits });
}

/**
 * Set a tenant feature flag.
 */
export function setTenantFeature(tenantId: string, feature: string, enabled: boolean): TenantConfig {
  const existing = tenantConfigs.get(tenantId);
  if (!existing) {
    throw new Error(`Tenant config not found: ${tenantId}`);
  }

  return updateTenantConfig(tenantId, {
    features: { ...existing.features, [feature]: enabled },
  });
}

/**
 * Check if a feature is enabled for a tenant.
 */
export function isTenantFeatureEnabled(tenantId: string, feature: string): boolean {
  const config = tenantConfigs.get(tenantId);
  if (!config) return false;
  return config.features[feature] === true;
}

/**
 * Set a tenant setting.
 */
export function setTenantSetting(tenantId: string, key: string, value: unknown): TenantConfig {
  const existing = tenantConfigs.get(tenantId);
  if (!existing) {
    throw new Error(`Tenant config not found: ${tenantId}`);
  }

  return updateTenantConfig(tenantId, {
    settings: { ...existing.settings, [key]: value },
  });
}

/**
 * Get a tenant setting.
 */
export function getTenantSetting<T = unknown>(tenantId: string, key: string): T | undefined {
  const config = tenantConfigs.get(tenantId);
  if (!config) return undefined;
  return config.settings[key] as T | undefined;
}

/**
 * Check if a tenant is within its limits.
 */
export function checkTenantLimit(
  tenantId: string,
  limitKey: keyof TenantLimits | string,
  currentValue: number
): { withinLimit: boolean; limit: number; current: number; percentUsed: number } {
  const config = tenantConfigs.get(tenantId);
  if (!config) {
    throw new Error(`Tenant config not found: ${tenantId}`);
  }

  let limit: number;
  if (limitKey in config.limits && limitKey !== 'customLimits') {
    limit = config.limits[limitKey as keyof Omit<TenantLimits, 'customLimits'>] as number;
  } else if (config.limits.customLimits[limitKey]) {
    limit = config.limits.customLimits[limitKey];
  } else {
    throw new Error(`Unknown limit key: ${limitKey}`);
  }

  const percentUsed = limit > 0 ? (currentValue / limit) * 100 : 0;

  return {
    withinLimit: currentValue <= limit,
    limit,
    current: currentValue,
    percentUsed,
  };
}

/**
 * Get all tenant configs.
 */
export function listTenantConfigs(): TenantConfig[] {
  return Array.from(tenantConfigs.values());
}

/**
 * Delete tenant configuration.
 */
export function deleteTenantConfig(tenantId: string): boolean {
  return tenantConfigs.delete(tenantId);
}

/**
 * Clear the in-memory store (for testing).
 */
export function clearTenantConfigStore(): void {
  tenantConfigs.clear();
}
