/**
 * commissions.ts - AFF-003: Commission Calculation
 *
 * Commission rates by product, tier-based rates, recurring commissions.
 * Uses an in-memory store for state.
 */

import {
  CommissionRule,
  CommissionRuleSchema,
  CommissionRecord,
  CommissionRecordSchema,
  CommissionTier,
  CreateCommissionRule,
  CreateCommissionRuleSchema,
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
const commissionRules: Map<string, CommissionRule> = new Map();
const commissionRecords: Map<string, CommissionRecord[]> = new Map(); // affiliateId -> records
const affiliateReferralCounts: Map<string, number> = new Map(); // affiliateId -> total referrals

/**
 * Create a new commission rule.
 */
export function createCommissionRule(input: CreateCommissionRule): CommissionRule {
  const data = CreateCommissionRuleSchema.parse(input);
  const now = nowISO();

  const rule: CommissionRule = CommissionRuleSchema.parse({
    id: generateUUID(),
    productId: data.productId,
    type: data.type,
    baseRatePercent: data.baseRatePercent,
    tiers: data.tiers || [],
    recurringDurationMonths: data.recurringDurationMonths,
    minPayoutCents: data.minPayoutCents || 5000,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });

  commissionRules.set(rule.id, rule);
  return rule;
}

/**
 * Get a commission rule by ID.
 */
export function getCommissionRuleById(id: string): CommissionRule | undefined {
  return commissionRules.get(id);
}

/**
 * List all commission rules, optionally filtered by product.
 */
export function listCommissionRules(productId?: string): CommissionRule[] {
  let result = Array.from(commissionRules.values());
  if (productId) {
    result = result.filter((r) => r.productId === productId || !r.productId);
  }
  return result.filter((r) => r.isActive);
}

/**
 * Get the applicable commission rule for a product.
 */
export function getApplicableRule(productId?: string): CommissionRule | undefined {
  const rules = Array.from(commissionRules.values()).filter((r) => r.isActive);

  // Product-specific rule takes priority
  if (productId) {
    const productRule = rules.find((r) => r.productId === productId);
    if (productRule) return productRule;
  }

  // Fall back to default (no product) rule
  return rules.find((r) => !r.productId);
}

/**
 * Determine the commission rate for an affiliate based on tiers.
 */
export function getEffectiveRate(affiliateId: string, rule: CommissionRule): number {
  const totalReferrals = affiliateReferralCounts.get(affiliateId) || 0;

  if (rule.tiers.length === 0) {
    return rule.baseRatePercent;
  }

  // Find the applicable tier
  let applicableTier: CommissionTier | undefined;
  for (const tier of rule.tiers) {
    if (totalReferrals >= tier.minReferrals && (tier.maxReferrals === undefined || totalReferrals <= tier.maxReferrals)) {
      applicableTier = tier;
    }
  }

  return applicableTier ? applicableTier.ratePercent : rule.baseRatePercent;
}

/**
 * Calculate and record commission for a conversion.
 */
export function calculateCommission(
  affiliateId: string,
  conversionId: string,
  revenueCents: number,
  productId?: string
): CommissionRecord {
  const rule = getApplicableRule(productId);
  if (!rule) {
    throw new Error('No applicable commission rule found');
  }

  const ratePercent = getEffectiveRate(affiliateId, rule);
  const amountCents = Math.round((revenueCents * ratePercent) / 100);

  const now = nowISO();
  const record: CommissionRecord = CommissionRecordSchema.parse({
    id: generateUUID(),
    affiliateId,
    conversionId,
    ruleId: rule.id,
    amountCents,
    ratePercent,
    status: 'pending',
    isRecurring: rule.type === 'recurring',
    createdAt: now,
    updatedAt: now,
  });

  const records = commissionRecords.get(affiliateId) || [];
  records.push(record);
  commissionRecords.set(affiliateId, records);

  // Update referral count
  const currentCount = affiliateReferralCounts.get(affiliateId) || 0;
  affiliateReferralCounts.set(affiliateId, currentCount + 1);

  return record;
}

/**
 * Calculate recurring commission for a specific month.
 */
export function calculateRecurringCommission(
  affiliateId: string,
  conversionId: string,
  revenueCents: number,
  month: number,
  productId?: string
): CommissionRecord | null {
  const rule = getApplicableRule(productId);
  if (!rule || rule.type !== 'recurring') return null;

  // Check if still within recurring duration
  if (rule.recurringDurationMonths && month > rule.recurringDurationMonths) {
    return null;
  }

  const ratePercent = getEffectiveRate(affiliateId, rule);
  const amountCents = Math.round((revenueCents * ratePercent) / 100);

  const now = nowISO();
  const record: CommissionRecord = CommissionRecordSchema.parse({
    id: generateUUID(),
    affiliateId,
    conversionId,
    ruleId: rule.id,
    amountCents,
    ratePercent,
    status: 'pending',
    isRecurring: true,
    recurringMonth: month,
    createdAt: now,
    updatedAt: now,
  });

  const records = commissionRecords.get(affiliateId) || [];
  records.push(record);
  commissionRecords.set(affiliateId, records);

  return record;
}

/**
 * Get commission records for an affiliate.
 */
export function getAffiliateCommissions(
  affiliateId: string,
  filters?: { status?: CommissionRecord['status']; since?: string }
): CommissionRecord[] {
  let records = commissionRecords.get(affiliateId) || [];

  if (filters?.status) {
    records = records.filter((r) => r.status === filters.status);
  }
  if (filters?.since) {
    records = records.filter((r) => r.createdAt >= filters.since!);
  }

  return records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Approve pending commissions for an affiliate.
 */
export function approveCommissions(affiliateId: string, commissionIds?: string[]): CommissionRecord[] {
  const records = commissionRecords.get(affiliateId) || [];
  const approved: CommissionRecord[] = [];

  for (let i = 0; i < records.length; i++) {
    if (records[i].status !== 'pending') continue;
    if (commissionIds && !commissionIds.includes(records[i].id)) continue;

    records[i] = CommissionRecordSchema.parse({
      ...records[i],
      status: 'approved',
      updatedAt: nowISO(),
    });
    approved.push(records[i]);
  }

  commissionRecords.set(affiliateId, records);
  return approved;
}

/**
 * Reverse a commission.
 */
export function reverseCommission(affiliateId: string, commissionId: string): CommissionRecord {
  const records = commissionRecords.get(affiliateId) || [];
  const index = records.findIndex((r) => r.id === commissionId);

  if (index === -1) {
    throw new Error(`Commission not found: ${commissionId}`);
  }

  records[index] = CommissionRecordSchema.parse({
    ...records[index],
    status: 'reversed',
    updatedAt: nowISO(),
  });

  commissionRecords.set(affiliateId, records);
  return records[index];
}

/**
 * Get total pending commission amount for an affiliate.
 */
export function getPendingCommissionTotal(affiliateId: string): number {
  const records = commissionRecords.get(affiliateId) || [];
  return records
    .filter((r) => r.status === 'pending' || r.status === 'approved')
    .reduce((sum, r) => sum + r.amountCents, 0);
}

/**
 * Update an affiliate's referral count (for tier calculation).
 */
export function setAffiliateReferralCount(affiliateId: string, count: number): void {
  affiliateReferralCounts.set(affiliateId, count);
}

/**
 * Update a commission rule.
 */
export function updateCommissionRule(
  id: string,
  input: Partial<Omit<CommissionRule, 'id' | 'createdAt' | 'updatedAt'>>
): CommissionRule {
  const existing = commissionRules.get(id);
  if (!existing) {
    throw new Error(`Commission rule not found: ${id}`);
  }

  const updated: CommissionRule = CommissionRuleSchema.parse({
    ...existing,
    ...Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined)),
    updatedAt: nowISO(),
  });

  commissionRules.set(id, updated);
  return updated;
}

/**
 * Deactivate a commission rule.
 */
export function deactivateCommissionRule(id: string): CommissionRule {
  return updateCommissionRule(id, { isActive: false });
}

/**
 * Clear the in-memory stores (for testing).
 */
export function clearCommissionStores(): void {
  commissionRules.clear();
  commissionRecords.clear();
  affiliateReferralCounts.clear();
}
