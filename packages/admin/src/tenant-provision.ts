/**
 * tenant-provision.ts - MT-001: Tenant Provisioning
 *
 * Create tenant with config, set up isolated resources.
 * Uses an in-memory store for state.
 */

import {
  Tenant,
  TenantSchema,
  CreateTenant,
  CreateTenantSchema,
  TenantResource,
  TenantResourceSchema,
  TenantStatusEnum,
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
const tenants: Map<string, Tenant> = new Map();
const resources: Map<string, TenantResource[]> = new Map(); // tenantId -> resources

/**
 * Provision a new tenant with its initial resources.
 */
export function provisionTenant(input: CreateTenant): { tenant: Tenant; resources: TenantResource[] } {
  const data = CreateTenantSchema.parse(input);

  // Check slug uniqueness
  for (const t of tenants.values()) {
    if (t.slug === data.slug) {
      throw new Error(`Tenant slug already exists: ${data.slug}`);
    }
  }

  const now = nowISO();
  const tenantId = generateUUID();

  const tenant: Tenant = TenantSchema.parse({
    id: tenantId,
    slug: data.slug,
    name: data.name,
    status: 'provisioning',
    plan: data.plan,
    ownerId: data.ownerId,
    region: data.region,
    storageNamespace: `tenant-${data.slug}`,
    maxUsers: data.maxUsers,
    maxStorageBytes: data.maxStorageBytes,
    metadata: data.metadata || {},
    createdAt: now,
    updatedAt: now,
  });

  tenants.set(tenantId, tenant);

  // Provision default resources
  const defaultResources = provisionDefaultResources(tenantId);

  // Mark tenant as active after resource provisioning
  const activeTenant: Tenant = TenantSchema.parse({
    ...tenant,
    status: 'active',
    updatedAt: nowISO(),
  });
  tenants.set(tenantId, activeTenant);

  return { tenant: activeTenant, resources: defaultResources };
}

/**
 * Provision default resources for a tenant.
 */
function provisionDefaultResources(tenantId: string): TenantResource[] {
  const now = nowISO();
  const resourceTypes: Array<TenantResource['resourceType']> = ['database', 'storage', 'cache'];
  const tenantResources: TenantResource[] = [];

  for (const resourceType of resourceTypes) {
    const resource: TenantResource = TenantResourceSchema.parse({
      tenantId,
      resourceType,
      resourceId: `${resourceType}-${generateUUID().slice(0, 8)}`,
      status: 'ready',
      config: getDefaultResourceConfig(resourceType),
      createdAt: now,
      updatedAt: now,
    });
    tenantResources.push(resource);
  }

  resources.set(tenantId, tenantResources);
  return tenantResources;
}

/**
 * Get default configuration for a resource type.
 */
function getDefaultResourceConfig(resourceType: TenantResource['resourceType']): Record<string, unknown> {
  switch (resourceType) {
    case 'database':
      return { poolSize: 10, maxConnections: 50, sslRequired: true };
    case 'storage':
      return { maxSizeBytes: 1073741824, encryptionEnabled: true };
    case 'cache':
      return { maxMemoryMB: 256, evictionPolicy: 'lru', ttlSeconds: 3600 };
    case 'queue':
      return { maxMessages: 10000, retentionHours: 72 };
    case 'search':
      return { maxDocuments: 100000, replicaCount: 1 };
    default:
      return {};
  }
}

/**
 * Get a tenant by ID.
 */
export function getTenantById(id: string): Tenant | undefined {
  return tenants.get(id);
}

/**
 * Get a tenant by slug.
 */
export function getTenantBySlug(slug: string): Tenant | undefined {
  for (const t of tenants.values()) {
    if (t.slug === slug) return t;
  }
  return undefined;
}

/**
 * List all tenants, optionally filtered by status.
 */
export function listTenants(status?: Tenant['status']): Tenant[] {
  let result = Array.from(tenants.values());
  if (status) {
    TenantStatusEnum.parse(status);
    result = result.filter((t) => t.status === status);
  }
  return result.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Update a tenant.
 */
export function updateTenant(
  id: string,
  input: Partial<Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'>>
): Tenant {
  const existing = tenants.get(id);
  if (!existing) {
    throw new Error(`Tenant not found: ${id}`);
  }

  const updated: Tenant = TenantSchema.parse({
    ...existing,
    ...Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined)),
    updatedAt: nowISO(),
  });
  tenants.set(id, updated);
  return updated;
}

/**
 * Suspend a tenant.
 */
export function suspendTenant(id: string, reason?: string): Tenant {
  const tenant = tenants.get(id);
  if (!tenant) {
    throw new Error(`Tenant not found: ${id}`);
  }

  return updateTenant(id, {
    status: 'suspended',
    metadata: { ...tenant.metadata, suspendedReason: reason || 'Manual suspension' },
  });
}

/**
 * Reactivate a suspended tenant.
 */
export function reactivateTenant(id: string): Tenant {
  const tenant = tenants.get(id);
  if (!tenant) {
    throw new Error(`Tenant not found: ${id}`);
  }
  if (tenant.status !== 'suspended') {
    throw new Error(`Tenant is not suspended: ${id}`);
  }

  const metadata = { ...tenant.metadata };
  delete metadata['suspendedReason'];

  return updateTenant(id, { status: 'active', metadata });
}

/**
 * Begin tenant deprovisioning.
 */
export function deprovisionTenant(id: string): Tenant {
  const tenant = tenants.get(id);
  if (!tenant) {
    throw new Error(`Tenant not found: ${id}`);
  }

  // Mark resources as deprovisioning
  const tenantResources = resources.get(id) || [];
  const now = nowISO();
  const updatedResources = tenantResources.map((r) =>
    TenantResourceSchema.parse({ ...r, status: 'deprovisioning', updatedAt: now })
  );
  resources.set(id, updatedResources);

  return updateTenant(id, { status: 'deprovisioning' });
}

/**
 * Get resources for a tenant.
 */
export function getTenantResources(tenantId: string): TenantResource[] {
  return resources.get(tenantId) || [];
}

/**
 * Add a resource to a tenant.
 */
export function addTenantResource(
  tenantId: string,
  resourceType: TenantResource['resourceType'],
  config?: Record<string, unknown>
): TenantResource {
  const tenant = tenants.get(tenantId);
  if (!tenant) {
    throw new Error(`Tenant not found: ${tenantId}`);
  }

  const now = nowISO();
  const resource: TenantResource = TenantResourceSchema.parse({
    tenantId,
    resourceType,
    resourceId: `${resourceType}-${generateUUID().slice(0, 8)}`,
    status: 'ready',
    config: config || getDefaultResourceConfig(resourceType),
    createdAt: now,
    updatedAt: now,
  });

  const tenantResources = resources.get(tenantId) || [];
  tenantResources.push(resource);
  resources.set(tenantId, tenantResources);

  return resource;
}

/**
 * Clear the in-memory stores (for testing).
 */
export function clearTenantProvisionStores(): void {
  tenants.clear();
  resources.clear();
}
