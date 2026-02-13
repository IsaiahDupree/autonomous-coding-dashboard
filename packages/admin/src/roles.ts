/**
 * roles.ts - ADMIN-002: Admin Role Management
 *
 * Define roles, assign permissions, role hierarchy.
 * Uses an in-memory store for state.
 */

import {
  RoleDefinition,
  RoleDefinitionSchema,
  CreateRole,
  CreateRoleSchema,
  Permission,
  RoleAssignment,
  RoleAssignmentSchema,
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

/** In-memory role store */
const roles: Map<string, RoleDefinition> = new Map();
/** In-memory role assignment store */
const assignments: Map<string, RoleAssignment[]> = new Map(); // userId -> assignments

/**
 * Initialize default system roles.
 */
export function initializeDefaultRoles(): RoleDefinition[] {
  const defaults: Array<Omit<CreateRole, 'level'> & { level: number; isSystem: boolean }> = [
    {
      name: 'Super Admin',
      description: 'Full access to all resources and settings',
      permissions: [{ resource: '*', actions: ['manage'] }],
      parentRoleId: null,
      level: 0,
      isSystem: true,
    },
    {
      name: 'Admin',
      description: 'Administrative access with some restrictions',
      permissions: [
        { resource: 'users', actions: ['create', 'read', 'update', 'delete'] },
        { resource: 'products', actions: ['create', 'read', 'update'] },
        { resource: 'billing', actions: ['read', 'update'] },
        { resource: 'config', actions: ['read', 'update'] },
      ],
      parentRoleId: null,
      level: 1,
      isSystem: true,
    },
    {
      name: 'Manager',
      description: 'Manage team members and view reports',
      permissions: [
        { resource: 'users', actions: ['read', 'update'] },
        { resource: 'products', actions: ['read'] },
        { resource: 'analytics', actions: ['read'] },
      ],
      parentRoleId: null,
      level: 2,
      isSystem: true,
    },
    {
      name: 'Member',
      description: 'Standard user access',
      permissions: [
        { resource: 'products', actions: ['read'] },
        { resource: 'profile', actions: ['read', 'update'] },
      ],
      parentRoleId: null,
      level: 3,
      isSystem: true,
    },
    {
      name: 'Viewer',
      description: 'Read-only access',
      permissions: [
        { resource: 'products', actions: ['read'] },
        { resource: 'profile', actions: ['read'] },
      ],
      parentRoleId: null,
      level: 4,
      isSystem: true,
    },
  ];

  const created: RoleDefinition[] = [];
  for (const def of defaults) {
    const role = createRole(
      { name: def.name, description: def.description, permissions: def.permissions, parentRoleId: def.parentRoleId, level: def.level },
      def.isSystem
    );
    created.push(role);
  }

  // Set parent hierarchy
  const adminRole = created.find((r) => r.name === 'Admin');
  const superAdminRole = created.find((r) => r.name === 'Super Admin');
  if (adminRole && superAdminRole) {
    const updated = { ...adminRole, parentRoleId: superAdminRole.id, updatedAt: nowISO() };
    roles.set(adminRole.id, RoleDefinitionSchema.parse(updated));
  }

  return created;
}

/**
 * Create a new role.
 */
export function createRole(input: CreateRole, isSystem: boolean = false): RoleDefinition {
  const data = CreateRoleSchema.parse(input);
  const now = nowISO();

  // Validate parent role exists if specified
  if (data.parentRoleId) {
    const parent = roles.get(data.parentRoleId);
    if (!parent) {
      throw new Error(`Parent role not found: ${data.parentRoleId}`);
    }
    // Child must have higher level number (lower privilege)
    if (data.level <= parent.level) {
      throw new Error(`Child role level (${data.level}) must be greater than parent level (${parent.level})`);
    }
  }

  const role: RoleDefinition = RoleDefinitionSchema.parse({
    id: generateUUID(),
    name: data.name,
    description: data.description,
    permissions: data.permissions,
    parentRoleId: data.parentRoleId,
    level: data.level,
    isSystem,
    createdAt: now,
    updatedAt: now,
  });

  roles.set(role.id, role);
  return role;
}

/**
 * Get a role by ID.
 */
export function getRoleById(id: string): RoleDefinition | undefined {
  return roles.get(id);
}

/**
 * List all roles sorted by level.
 */
export function listRoles(): RoleDefinition[] {
  return Array.from(roles.values()).sort((a, b) => a.level - b.level);
}

/**
 * Update a role (cannot update system roles' core properties).
 */
export function updateRole(id: string, input: Partial<CreateRole>): RoleDefinition {
  const existing = roles.get(id);
  if (!existing) {
    throw new Error(`Role not found: ${id}`);
  }
  if (existing.isSystem && (input.name || input.level !== undefined)) {
    throw new Error('Cannot modify name or level of system roles');
  }

  const updated: RoleDefinition = RoleDefinitionSchema.parse({
    ...existing,
    ...Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined)),
    updatedAt: nowISO(),
  });
  roles.set(id, updated);
  return updated;
}

/**
 * Delete a role (cannot delete system roles).
 */
export function deleteRole(id: string): boolean {
  const role = roles.get(id);
  if (!role) return false;
  if (role.isSystem) {
    throw new Error('Cannot delete system roles');
  }
  return roles.delete(id);
}

/**
 * Assign a role to a user.
 */
export function assignRole(userId: string, roleId: string, scope: RoleAssignment['scope'], scopeId?: string): RoleAssignment {
  const role = roles.get(roleId);
  if (!role) {
    throw new Error(`Role not found: ${roleId}`);
  }

  const now = nowISO();
  const assignment: RoleAssignment = RoleAssignmentSchema.parse({
    userId,
    roleId,
    scope,
    scopeId,
    createdAt: now,
    updatedAt: now,
  });

  const userAssignments = assignments.get(userId) || [];
  // Remove existing assignment for same scope+scopeId
  const filtered = userAssignments.filter(
    (a) => !(a.scope === scope && a.scopeId === scopeId)
  );
  filtered.push(assignment);
  assignments.set(userId, filtered);

  return assignment;
}

/**
 * Get role assignments for a user.
 */
export function getUserRoleAssignments(userId: string): RoleAssignment[] {
  return assignments.get(userId) || [];
}

/**
 * Revoke a role assignment.
 */
export function revokeRole(userId: string, roleId: string, scope: RoleAssignment['scope'], scopeId?: string): boolean {
  const userAssignments = assignments.get(userId);
  if (!userAssignments) return false;

  const filtered = userAssignments.filter(
    (a) => !(a.roleId === roleId && a.scope === scope && a.scopeId === scopeId)
  );

  if (filtered.length === userAssignments.length) return false;
  assignments.set(userId, filtered);
  return true;
}

/**
 * Get the effective permissions for a user (merging all role assignments and hierarchy).
 */
export function getEffectivePermissions(userId: string): Permission[] {
  const userAssignments = assignments.get(userId) || [];
  const permissionMap = new Map<string, Set<string>>();

  for (const assignment of userAssignments) {
    const role = roles.get(assignment.roleId);
    if (!role) continue;

    // Collect permissions from this role and all ancestors
    let currentRole: RoleDefinition | undefined = role;
    while (currentRole) {
      for (const perm of currentRole.permissions) {
        const existing = permissionMap.get(perm.resource) || new Set();
        for (const action of perm.actions) {
          existing.add(action);
        }
        permissionMap.set(perm.resource, existing);
      }
      currentRole = currentRole.parentRoleId ? roles.get(currentRole.parentRoleId) : undefined;
    }
  }

  return Array.from(permissionMap.entries()).map(([resource, actions]) => ({
    resource,
    actions: Array.from(actions) as Permission['actions'],
  }));
}

/**
 * Check if a user has a specific permission.
 */
export function hasPermission(userId: string, resource: string, action: string): boolean {
  const permissions = getEffectivePermissions(userId);
  return permissions.some(
    (p) =>
      (p.resource === resource || p.resource === '*') &&
      (p.actions.includes(action as any) || p.actions.includes('manage'))
  );
}

/**
 * Get the role hierarchy tree.
 */
export function getRoleHierarchy(): Array<{ role: RoleDefinition; children: RoleDefinition[] }> {
  const allRoles = listRoles();
  return allRoles.map((role) => ({
    role,
    children: allRoles.filter((r) => r.parentRoleId === role.id),
  }));
}

/**
 * Clear the in-memory stores (for testing).
 */
export function clearRoleStores(): void {
  roles.clear();
  assignments.clear();
}
