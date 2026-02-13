/**
 * tenant-isolation.ts - MT-002: Tenant Isolation
 *
 * Data isolation enforcement, tenant context propagation.
 * Uses an in-memory store for state.
 */

import {
  TenantContext,
  TenantContextSchema,
  IsolationPolicy,
  IsolationPolicySchema,
  DataAccessLog,
  DataAccessLogSchema,
  IsolationLevelEnum,
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
const isolationPolicies: Map<string, IsolationPolicy> = new Map(); // tenantId -> policy
const accessLogs: DataAccessLog[] = [];
const activeTenantContexts: Map<string, TenantContext> = new Map(); // requestId/key -> context

/**
 * Set isolation policy for a tenant.
 */
export function setIsolationPolicy(
  tenantId: string,
  policy: Omit<IsolationPolicy, 'tenantId' | 'createdAt' | 'updatedAt'>
): IsolationPolicy {
  const now = nowISO();
  const existing = isolationPolicies.get(tenantId);

  const isoPolicy: IsolationPolicy = IsolationPolicySchema.parse({
    ...policy,
    tenantId,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  });

  isolationPolicies.set(tenantId, isoPolicy);
  return isoPolicy;
}

/**
 * Get isolation policy for a tenant.
 */
export function getIsolationPolicy(tenantId: string): IsolationPolicy | undefined {
  return isolationPolicies.get(tenantId);
}

/**
 * Create a tenant context for request propagation.
 */
export function createTenantContext(
  contextKey: string,
  tenantId: string,
  userId: string,
  role: TenantContext['role'],
  permissions: string[]
): TenantContext {
  const policy = isolationPolicies.get(tenantId);
  const isolationLevel = policy?.isolationLevel || 'shared';

  const context: TenantContext = TenantContextSchema.parse({
    tenantId,
    userId,
    role,
    isolationLevel,
    permissions,
  });

  activeTenantContexts.set(contextKey, context);
  return context;
}

/**
 * Get an active tenant context by key.
 */
export function getTenantContext(contextKey: string): TenantContext | undefined {
  return activeTenantContexts.get(contextKey);
}

/**
 * Remove a tenant context (cleanup after request).
 */
export function removeTenantContext(contextKey: string): boolean {
  return activeTenantContexts.delete(contextKey);
}

/**
 * Enforce data isolation: check if access should be allowed.
 */
export function enforceIsolation(
  tenantContext: TenantContext,
  targetTenantId: string,
  resource: string,
  action: string
): { allowed: boolean; reason?: string } {
  // Same-tenant access is always allowed (with permission check)
  if (tenantContext.tenantId === targetTenantId) {
    const hasPermission = tenantContext.permissions.includes(`${resource}:${action}`) ||
      tenantContext.permissions.includes(`${resource}:*`) ||
      tenantContext.permissions.includes('*:*');

    logAccess(tenantContext.tenantId, tenantContext.userId, resource, action, hasPermission,
      hasPermission ? undefined : 'Missing permission');

    return hasPermission
      ? { allowed: true }
      : { allowed: false, reason: `Missing permission: ${resource}:${action}` };
  }

  // Cross-tenant access
  const policy = isolationPolicies.get(tenantContext.tenantId);
  if (!policy || !policy.crossTenantAccess) {
    logAccess(tenantContext.tenantId, tenantContext.userId, resource, action, false,
      'Cross-tenant access denied');
    return { allowed: false, reason: 'Cross-tenant access is not permitted' };
  }

  // Only super_admin and admin can cross-tenant access
  if (tenantContext.role !== 'super_admin' && tenantContext.role !== 'admin') {
    logAccess(tenantContext.tenantId, tenantContext.userId, resource, action, false,
      'Insufficient role for cross-tenant access');
    return { allowed: false, reason: 'Insufficient role for cross-tenant access' };
  }

  logAccess(tenantContext.tenantId, tenantContext.userId, resource, action, true);
  return { allowed: true };
}

/**
 * Log a data access event.
 */
export function logAccess(
  tenantId: string,
  userId: string,
  resource: string,
  action: string,
  allowed: boolean,
  reason?: string
): DataAccessLog {
  const log: DataAccessLog = DataAccessLogSchema.parse({
    id: generateUUID(),
    tenantId,
    userId,
    resource,
    action,
    allowed,
    reason,
    timestamp: nowISO(),
  });

  accessLogs.push(log);
  return log;
}

/**
 * Get access logs for a tenant.
 */
export function getAccessLogs(
  tenantId: string,
  filters?: {
    userId?: string;
    resource?: string;
    allowed?: boolean;
    since?: string;
    limit?: number;
  }
): DataAccessLog[] {
  let result = accessLogs.filter((l) => l.tenantId === tenantId);

  if (filters?.userId) {
    result = result.filter((l) => l.userId === filters.userId);
  }
  if (filters?.resource) {
    result = result.filter((l) => l.resource === filters.resource);
  }
  if (filters?.allowed !== undefined) {
    result = result.filter((l) => l.allowed === filters.allowed);
  }
  if (filters?.since) {
    result = result.filter((l) => l.timestamp >= filters.since!);
  }

  result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (filters?.limit) {
    result = result.slice(0, filters.limit);
  }

  return result;
}

/**
 * Get denied access logs (security audit).
 */
export function getDeniedAccessLogs(tenantId?: string, limit: number = 100): DataAccessLog[] {
  let result = accessLogs.filter((l) => !l.allowed);
  if (tenantId) {
    result = result.filter((l) => l.tenantId === tenantId);
  }
  return result
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}

/**
 * Validate that a query/operation is scoped to the correct tenant.
 */
export function validateTenantScope(
  context: TenantContext,
  queryTenantId: string
): boolean {
  if (context.tenantId === queryTenantId) return true;

  const policy = isolationPolicies.get(context.tenantId);
  if (policy?.crossTenantAccess && (context.role === 'super_admin' || context.role === 'admin')) {
    return true;
  }

  return false;
}

/**
 * Get the database schema/namespace for a tenant based on isolation level.
 */
export function getTenantNamespace(tenantId: string): string {
  const policy = isolationPolicies.get(tenantId);
  if (!policy) return `tenant_${tenantId}`;

  switch (policy.isolationLevel) {
    case 'shared':
      return 'shared';
    case 'schema':
      return `schema_${tenantId}`;
    case 'database':
      return `db_${tenantId}`;
    case 'instance':
      return `instance_${tenantId}`;
    default:
      return `tenant_${tenantId}`;
  }
}

/**
 * Clear the in-memory stores (for testing).
 */
export function clearIsolationStores(): void {
  isolationPolicies.clear();
  accessLogs.length = 0;
  activeTenantContexts.clear();
}
