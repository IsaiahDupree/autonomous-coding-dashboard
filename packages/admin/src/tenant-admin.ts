/**
 * tenant-admin.ts - MT-005: Tenant Admin
 *
 * Tenant-scoped admin roles, member management.
 * Uses an in-memory store for state.
 */

import {
  TenantMember,
  TenantMemberSchema,
  TenantAdminRole,
  TenantAdminRoleEnum,
  InviteTenantMember,
  InviteTenantMemberSchema,
  UpdateTenantMember,
  UpdateTenantMemberSchema,
  PaginationParams,
  PaginationParamsSchema,
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

/** In-memory store: tenantId -> members */
const tenantMembers: Map<string, TenantMember[]> = new Map();

/** Pending invitations: email -> invitation details */
const pendingInvitations: Map<string, { tenantId: string; role: TenantAdminRole; invitedBy: string; expiresAt: string }> = new Map();

/**
 * Add the initial owner/admin member to a tenant.
 */
export function addTenantOwner(tenantId: string, userId: string): TenantMember {
  const now = nowISO();
  const member: TenantMember = TenantMemberSchema.parse({
    userId,
    tenantId,
    role: 'tenant_admin',
    status: 'active',
    joinedAt: now,
    createdAt: now,
    updatedAt: now,
  });

  const members = tenantMembers.get(tenantId) || [];
  members.push(member);
  tenantMembers.set(tenantId, members);

  return member;
}

/**
 * Invite a new member to a tenant.
 */
export function inviteMember(input: InviteTenantMember, invitedBy: string): {
  invitation: { email: string; tenantId: string; role: TenantAdminRole; expiresAt: string };
} {
  const data = InviteTenantMemberSchema.parse(input);

  // Check if already a member
  const members = tenantMembers.get(data.tenantId) || [];
  // Note: in a real system we'd look up user by email

  // Create invitation
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const invitation = {
    tenantId: data.tenantId,
    role: data.role,
    invitedBy,
    expiresAt,
  };

  pendingInvitations.set(`${data.email}:${data.tenantId}`, invitation);

  return {
    invitation: {
      email: data.email,
      tenantId: data.tenantId,
      role: data.role,
      expiresAt,
    },
  };
}

/**
 * Accept an invitation and join a tenant.
 */
export function acceptInvitation(email: string, tenantId: string, userId: string): TenantMember {
  const key = `${email}:${tenantId}`;
  const invitation = pendingInvitations.get(key);

  if (!invitation) {
    throw new Error('Invitation not found');
  }

  if (new Date(invitation.expiresAt) < new Date()) {
    pendingInvitations.delete(key);
    throw new Error('Invitation has expired');
  }

  const now = nowISO();
  const member: TenantMember = TenantMemberSchema.parse({
    userId,
    tenantId,
    role: invitation.role,
    status: 'active',
    invitedBy: invitation.invitedBy,
    joinedAt: now,
    createdAt: now,
    updatedAt: now,
  });

  const members = tenantMembers.get(tenantId) || [];
  members.push(member);
  tenantMembers.set(tenantId, members);

  pendingInvitations.delete(key);

  return member;
}

/**
 * List members of a tenant with pagination.
 */
export function listTenantMembers(
  tenantId: string,
  filters?: { role?: TenantAdminRole; status?: string; pagination?: PaginationParams }
): { items: TenantMember[]; total: number; page: number; pageSize: number; totalPages: number } {
  let members = tenantMembers.get(tenantId) || [];

  if (filters?.role) {
    TenantAdminRoleEnum.parse(filters.role);
    members = members.filter((m) => m.role === filters.role);
  }
  if (filters?.status) {
    members = members.filter((m) => m.status === filters.status);
  }

  const pagination = PaginationParamsSchema.parse(filters?.pagination || {});
  const total = members.length;
  const page = pagination.page;
  const pageSize = pagination.pageSize;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const items = members.slice(start, start + pageSize);

  return { items, total, page, pageSize, totalPages };
}

/**
 * Get a specific tenant member.
 */
export function getTenantMember(tenantId: string, userId: string): TenantMember | undefined {
  const members = tenantMembers.get(tenantId) || [];
  return members.find((m) => m.userId === userId);
}

/**
 * Update a tenant member's role or status.
 */
export function updateTenantMember(
  tenantId: string,
  userId: string,
  input: UpdateTenantMember
): TenantMember {
  const data = UpdateTenantMemberSchema.parse(input);
  const members = tenantMembers.get(tenantId) || [];
  const index = members.findIndex((m) => m.userId === userId);

  if (index === -1) {
    throw new Error(`Member not found: ${userId} in tenant ${tenantId}`);
  }

  const updated: TenantMember = TenantMemberSchema.parse({
    ...members[index],
    ...Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)),
    updatedAt: nowISO(),
  });

  members[index] = updated;
  tenantMembers.set(tenantId, members);

  return updated;
}

/**
 * Remove a member from a tenant.
 */
export function removeTenantMember(tenantId: string, userId: string): boolean {
  const members = tenantMembers.get(tenantId) || [];
  const index = members.findIndex((m) => m.userId === userId);

  if (index === -1) return false;

  // Prevent removing the last admin
  const admins = members.filter((m) => m.role === 'tenant_admin' && m.status === 'active');
  if (admins.length === 1 && admins[0].userId === userId) {
    throw new Error('Cannot remove the last tenant admin');
  }

  members.splice(index, 1);
  tenantMembers.set(tenantId, members);
  return true;
}

/**
 * Suspend a tenant member.
 */
export function suspendTenantMember(tenantId: string, userId: string): TenantMember {
  return updateTenantMember(tenantId, userId, { status: 'suspended' });
}

/**
 * Reactivate a suspended tenant member.
 */
export function reactivateTenantMember(tenantId: string, userId: string): TenantMember {
  return updateTenantMember(tenantId, userId, { status: 'active' });
}

/**
 * Change a member's role.
 */
export function changeMemberRole(tenantId: string, userId: string, newRole: TenantAdminRole): TenantMember {
  TenantAdminRoleEnum.parse(newRole);
  return updateTenantMember(tenantId, userId, { role: newRole });
}

/**
 * Count members in a tenant by role.
 */
export function countMembersByRole(tenantId: string): Record<string, number> {
  const members = tenantMembers.get(tenantId) || [];
  const counts: Record<string, number> = {};
  for (const member of members) {
    counts[member.role] = (counts[member.role] || 0) + 1;
  }
  return counts;
}

/**
 * Get all tenants a user belongs to.
 */
export function getUserTenants(userId: string): Array<{ tenantId: string; role: TenantAdminRole; status: string }> {
  const result: Array<{ tenantId: string; role: TenantAdminRole; status: string }> = [];
  for (const [tenantId, members] of tenantMembers.entries()) {
    const membership = members.find((m) => m.userId === userId);
    if (membership) {
      result.push({
        tenantId,
        role: membership.role,
        status: membership.status,
      });
    }
  }
  return result;
}

/**
 * Check if a user has a specific role in a tenant.
 */
export function hasTenantRole(tenantId: string, userId: string, role: TenantAdminRole): boolean {
  const member = getTenantMember(tenantId, userId);
  if (!member || member.status !== 'active') return false;

  const roleHierarchy: Record<TenantAdminRole, number> = {
    tenant_admin: 0,
    tenant_manager: 1,
    tenant_member: 2,
    tenant_viewer: 3,
  };

  return roleHierarchy[member.role] <= roleHierarchy[role];
}

/**
 * Clear the in-memory stores (for testing).
 */
export function clearTenantAdminStores(): void {
  tenantMembers.clear();
  pendingInvitations.clear();
}
