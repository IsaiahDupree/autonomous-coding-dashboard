/**
 * product-mgmt.ts - ADMIN-003: Admin Product Management
 *
 * Product registry, enable/disable products per user/org.
 * Uses an in-memory store for state.
 */

import {
  ProductRegistryEntry,
  ProductRegistryEntrySchema,
  ProductAccess,
  ProductAccessSchema,
  CreateProduct,
  CreateProductSchema,
  ProductStatusEnum,
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

/** In-memory product registry */
const products: Map<string, ProductRegistryEntry> = new Map();
/** In-memory product access: key = `${entityType}:${entityId}:${productId}` */
const accessRecords: Map<string, ProductAccess> = new Map();

/**
 * Register a new product.
 */
export function registerProduct(input: CreateProduct): ProductRegistryEntry {
  const data = CreateProductSchema.parse(input);
  const now = nowISO();

  // Check slug uniqueness
  for (const p of products.values()) {
    if (p.slug === data.slug) {
      throw new Error(`Product slug already exists: ${data.slug}`);
    }
  }

  const product: ProductRegistryEntry = ProductRegistryEntrySchema.parse({
    id: generateUUID(),
    slug: data.slug,
    name: data.name,
    description: data.description,
    status: 'active',
    version: '1.0.0',
    tier: data.tier,
    features: data.features,
    maxUsersPerOrg: data.maxUsersPerOrg,
    createdAt: now,
    updatedAt: now,
  });

  products.set(product.id, product);
  return product;
}

/**
 * Get a product by ID.
 */
export function getProductById(id: string): ProductRegistryEntry | undefined {
  return products.get(id);
}

/**
 * Get a product by slug.
 */
export function getProductBySlug(slug: string): ProductRegistryEntry | undefined {
  for (const p of products.values()) {
    if (p.slug === slug) return p;
  }
  return undefined;
}

/**
 * List all products, optionally filtered by status.
 */
export function listProducts(status?: ProductRegistryEntry['status']): ProductRegistryEntry[] {
  let result = Array.from(products.values());
  if (status) {
    result = result.filter((p) => p.status === status);
  }
  return result.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Update a product's details.
 */
export function updateProduct(
  id: string,
  input: Partial<Omit<ProductRegistryEntry, 'id' | 'createdAt' | 'updatedAt'>>
): ProductRegistryEntry {
  const existing = products.get(id);
  if (!existing) {
    throw new Error(`Product not found: ${id}`);
  }

  const updated: ProductRegistryEntry = ProductRegistryEntrySchema.parse({
    ...existing,
    ...Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined)),
    updatedAt: nowISO(),
  });
  products.set(id, updated);
  return updated;
}

/**
 * Update product status (enable/disable/deprecate).
 */
export function setProductStatus(id: string, status: ProductRegistryEntry['status']): ProductRegistryEntry {
  ProductStatusEnum.parse(status);
  return updateProduct(id, { status });
}

/**
 * Grant product access to a user or organization.
 */
export function grantProductAccess(
  productId: string,
  entityType: 'user' | 'organization',
  entityId: string,
  tier: ProductAccess['tier'],
  expiresAt?: string
): ProductAccess {
  const product = products.get(productId);
  if (!product) {
    throw new Error(`Product not found: ${productId}`);
  }

  const now = nowISO();
  const key = `${entityType}:${entityId}:${productId}`;
  const access: ProductAccess = ProductAccessSchema.parse({
    productId,
    entityType,
    entityId,
    enabled: true,
    tier,
    expiresAt,
    createdAt: now,
    updatedAt: now,
  });

  accessRecords.set(key, access);
  return access;
}

/**
 * Revoke product access.
 */
export function revokeProductAccess(
  productId: string,
  entityType: 'user' | 'organization',
  entityId: string
): boolean {
  const key = `${entityType}:${entityId}:${productId}`;
  const existing = accessRecords.get(key);
  if (!existing) return false;

  const updated: ProductAccess = ProductAccessSchema.parse({
    ...existing,
    enabled: false,
    updatedAt: nowISO(),
  });
  accessRecords.set(key, updated);
  return true;
}

/**
 * Check if an entity has access to a product.
 */
export function hasProductAccess(
  productId: string,
  entityType: 'user' | 'organization',
  entityId: string
): boolean {
  const key = `${entityType}:${entityId}:${productId}`;
  const access = accessRecords.get(key);
  if (!access || !access.enabled) return false;

  // Check expiration
  if (access.expiresAt && new Date(access.expiresAt) < new Date()) {
    return false;
  }

  return true;
}

/**
 * Get all product access records for an entity.
 */
export function getEntityProducts(
  entityType: 'user' | 'organization',
  entityId: string
): ProductAccess[] {
  const result: ProductAccess[] = [];
  for (const [key, access] of accessRecords.entries()) {
    if (key.startsWith(`${entityType}:${entityId}:`)) {
      result.push(access);
    }
  }
  return result;
}

/**
 * Get all entities with access to a product.
 */
export function getProductEntities(productId: string): ProductAccess[] {
  const result: ProductAccess[] = [];
  for (const [key, access] of accessRecords.entries()) {
    if (key.endsWith(`:${productId}`) && access.enabled) {
      result.push(access);
    }
  }
  return result;
}

/**
 * Clear the in-memory stores (for testing).
 */
export function clearProductStores(): void {
  products.clear();
  accessRecords.clear();
}
