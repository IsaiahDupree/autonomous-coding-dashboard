/**
 * user-mgmt.ts - ADMIN-001: Admin User Management
 *
 * List users, search, filter by role/status/product, pagination.
 * Uses an in-memory store for state.
 */

import { randomUUID } from 'crypto';
const uuidV4 = randomUUID;
import {
  AdminUser,
  AdminUserSchema,
  UserFilter,
  UserFilterSchema,
  CreateUser,
  CreateUserSchema,
  UpdateUser,
  UpdateUserSchema,
  PaginationParams,
} from './types';

function generateUUID(): string {
  // Simple UUID v4 without external deps
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function nowISO(): string {
  return new Date().toISOString();
}

/** In-memory user store */
const users: Map<string, AdminUser> = new Map();

/**
 * List users with optional filtering, searching, and pagination.
 */
export function listUsers(filter: UserFilter): { items: AdminUser[]; total: number; page: number; pageSize: number; totalPages: number } {
  const parsed = UserFilterSchema.parse(filter);
  let result = Array.from(users.values());

  // Filter by role
  if (parsed.role) {
    result = result.filter((u) => u.role === parsed.role);
  }

  // Filter by status
  if (parsed.status) {
    result = result.filter((u) => u.status === parsed.status);
  }

  // Filter by product
  if (parsed.product) {
    result = result.filter((u) => u.products.includes(parsed.product!));
  }

  // Search by email or display name
  if (parsed.search) {
    const term = parsed.search.toLowerCase();
    result = result.filter(
      (u) =>
        u.email.toLowerCase().includes(term) ||
        u.displayName.toLowerCase().includes(term)
    );
  }

  // Sort by createdAt descending
  result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const total = result.length;
  const page = parsed.page;
  const pageSize = parsed.pageSize;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const items = result.slice(start, start + pageSize);

  return { items, total, page, pageSize, totalPages };
}

/**
 * Get a single user by ID.
 */
export function getUserById(id: string): AdminUser | undefined {
  return users.get(id);
}

/**
 * Create a new admin user.
 */
export function createUser(input: CreateUser, createdById?: string): AdminUser {
  const data = CreateUserSchema.parse(input);
  const now = nowISO();
  const user: AdminUser = AdminUserSchema.parse({
    id: generateUUID(),
    email: data.email,
    displayName: data.displayName,
    role: data.role,
    status: 'pending',
    products: data.products,
    organizationId: data.organizationId,
    createdAt: now,
    updatedAt: now,
  });
  users.set(user.id, user);
  return user;
}

/**
 * Update an existing user.
 */
export function updateUser(id: string, input: UpdateUser): AdminUser {
  const existing = users.get(id);
  if (!existing) {
    throw new Error(`User not found: ${id}`);
  }
  const data = UpdateUserSchema.parse(input);
  const updated: AdminUser = AdminUserSchema.parse({
    ...existing,
    ...Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)),
    updatedAt: nowISO(),
  });
  users.set(id, updated);
  return updated;
}

/**
 * Delete a user by ID.
 */
export function deleteUser(id: string): boolean {
  return users.delete(id);
}

/**
 * Search users by query string across email and displayName.
 */
export function searchUsers(query: string, pagination?: PaginationParams): { items: AdminUser[]; total: number; page: number; pageSize: number; totalPages: number } {
  return listUsers({ search: query, page: pagination?.page ?? 1, pageSize: pagination?.pageSize ?? 25 });
}

/**
 * Bulk update user status.
 */
export function bulkUpdateStatus(userIds: string[], status: AdminUser['status']): AdminUser[] {
  const updated: AdminUser[] = [];
  for (const id of userIds) {
    const existing = users.get(id);
    if (existing) {
      const u = updateUser(id, { status });
      updated.push(u);
    }
  }
  return updated;
}

/**
 * Get all users in the store (for testing/debugging).
 */
export function getAllUsers(): AdminUser[] {
  return Array.from(users.values());
}

/**
 * Clear the in-memory store (for testing).
 */
export function clearUserStore(): void {
  users.clear();
}
