/**
 * billing-admin.ts - ADMIN-004: Admin Billing Management
 *
 * View subscriptions, apply credits, override plans.
 * Uses an in-memory store for state.
 */

import {
  Subscription,
  SubscriptionSchema,
  CreditApplication,
  CreditApplicationSchema,
  PlanOverride,
  PlanOverrideSchema,
  ApplyCredit,
  ApplyCreditSchema,
  OverridePlan,
  OverridePlanSchema,
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

/** In-memory stores */
const subscriptions: Map<string, Subscription> = new Map();
const credits: Map<string, CreditApplication[]> = new Map(); // userId -> credits
const overrides: Map<string, PlanOverride[]> = new Map(); // userId -> overrides

/**
 * List all subscriptions with pagination.
 */
export function listSubscriptions(pagination?: PaginationParams): {
  items: Subscription[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
} {
  const params = PaginationParamsSchema.parse(pagination || {});
  const all = Array.from(subscriptions.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const total = all.length;
  const page = params.page;
  const pageSize = params.pageSize;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const items = all.slice(start, start + pageSize);

  return { items, total, page, pageSize, totalPages };
}

/**
 * Get a subscription by ID.
 */
export function getSubscriptionById(id: string): Subscription | undefined {
  return subscriptions.get(id);
}

/**
 * Get subscriptions for a user.
 */
export function getUserSubscriptions(userId: string): Subscription[] {
  return Array.from(subscriptions.values()).filter((s) => s.userId === userId);
}

/**
 * Create a subscription (typically called by billing system).
 */
export function createSubscription(data: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>): Subscription {
  const now = nowISO();
  const sub: Subscription = SubscriptionSchema.parse({
    ...data,
    id: generateUUID(),
    createdAt: now,
    updatedAt: now,
  });
  subscriptions.set(sub.id, sub);
  return sub;
}

/**
 * Update a subscription.
 */
export function updateSubscription(
  id: string,
  input: Partial<Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>>
): Subscription {
  const existing = subscriptions.get(id);
  if (!existing) {
    throw new Error(`Subscription not found: ${id}`);
  }

  const updated: Subscription = SubscriptionSchema.parse({
    ...existing,
    ...Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined)),
    updatedAt: nowISO(),
  });
  subscriptions.set(id, updated);
  return updated;
}

/**
 * Cancel a subscription.
 */
export function cancelSubscription(id: string, immediately: boolean = false): Subscription {
  const existing = subscriptions.get(id);
  if (!existing) {
    throw new Error(`Subscription not found: ${id}`);
  }

  if (immediately) {
    return updateSubscription(id, { status: 'canceled' });
  }
  return updateSubscription(id, { cancelAtPeriodEnd: true });
}

/**
 * Apply credits to a user account.
 */
export function applyCredit(input: ApplyCredit, appliedBy: string): CreditApplication {
  const data = ApplyCreditSchema.parse(input);
  const now = nowISO();

  const credit: CreditApplication = CreditApplicationSchema.parse({
    id: generateUUID(),
    userId: data.userId,
    amountCents: data.amountCents,
    reason: data.reason,
    appliedBy,
    expiresAt: data.expiresAt,
    createdAt: now,
    updatedAt: now,
  });

  const userCredits = credits.get(data.userId) || [];
  userCredits.push(credit);
  credits.set(data.userId, userCredits);

  return credit;
}

/**
 * Get credits for a user.
 */
export function getUserCredits(userId: string): CreditApplication[] {
  return credits.get(userId) || [];
}

/**
 * Get total available credits for a user (not expired).
 */
export function getAvailableCredits(userId: string): number {
  const userCredits = credits.get(userId) || [];
  const now = new Date();
  return userCredits
    .filter((c) => !c.expiresAt || new Date(c.expiresAt) > now)
    .reduce((sum, c) => sum + c.amountCents, 0);
}

/**
 * Override a user's plan.
 */
export function overridePlan(input: OverridePlan, overriddenBy: string): PlanOverride {
  const data = OverridePlanSchema.parse(input);
  const userSubs = getUserSubscriptions(data.userId);
  const activeSub = userSubs.find((s) => s.status === 'active' || s.status === 'trialing');
  const originalPlan = activeSub?.plan || 'free';

  const now = nowISO();
  const override: PlanOverride = PlanOverrideSchema.parse({
    id: generateUUID(),
    userId: data.userId,
    originalPlan,
    overridePlan: data.overridePlan,
    reason: data.reason,
    overriddenBy,
    expiresAt: data.expiresAt,
    createdAt: now,
    updatedAt: now,
  });

  const userOverrides = overrides.get(data.userId) || [];
  userOverrides.push(override);
  overrides.set(data.userId, userOverrides);

  return override;
}

/**
 * Get active plan override for a user.
 */
export function getActivePlanOverride(userId: string): PlanOverride | undefined {
  const userOverrides = overrides.get(userId) || [];
  const now = new Date();
  // Return most recent active override
  return userOverrides
    .filter((o) => !o.expiresAt || new Date(o.expiresAt) > now)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
}

/**
 * Get a user's effective plan (considering overrides).
 */
export function getEffectivePlan(userId: string): string {
  const override = getActivePlanOverride(userId);
  if (override) return override.overridePlan;

  const subs = getUserSubscriptions(userId);
  const activeSub = subs.find((s) => s.status === 'active' || s.status === 'trialing');
  return activeSub?.plan || 'free';
}

/**
 * Get all plan overrides for a user.
 */
export function getUserPlanOverrides(userId: string): PlanOverride[] {
  return overrides.get(userId) || [];
}

/**
 * Clear the in-memory stores (for testing).
 */
export function clearBillingStores(): void {
  subscriptions.clear();
  credits.clear();
  overrides.clear();
}
