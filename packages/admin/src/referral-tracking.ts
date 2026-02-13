/**
 * referral-tracking.ts - AFF-002: Referral Tracking
 *
 * Referral links, click tracking, conversion attribution.
 * Uses an in-memory store for state.
 */

import {
  ReferralLink,
  ReferralLinkSchema,
  ClickEvent,
  ClickEventSchema,
  ConversionEvent,
  ConversionEventSchema,
  CreateReferralLink,
  CreateReferralLinkSchema,
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

function generateReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/** In-memory stores */
const referralLinks: Map<string, ReferralLink> = new Map();
const referralsByCode: Map<string, string> = new Map(); // code -> linkId
const clickEvents: ClickEvent[] = [];
const conversionEvents: ConversionEvent[] = [];
const seenIPs: Map<string, Set<string>> = new Map(); // linkId -> Set of IP hashes

/**
 * Create a new referral link for an affiliate.
 */
export function createReferralLink(affiliateId: string, input: CreateReferralLink): ReferralLink {
  const data = CreateReferralLinkSchema.parse(input);
  const now = nowISO();
  const code = generateReferralCode();

  const link: ReferralLink = ReferralLinkSchema.parse({
    id: generateUUID(),
    affiliateId,
    code,
    targetUrl: data.targetUrl,
    campaign: data.campaign,
    totalClicks: 0,
    uniqueClicks: 0,
    conversions: 0,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });

  referralLinks.set(link.id, link);
  referralsByCode.set(code, link.id);

  return link;
}

/**
 * Get a referral link by ID.
 */
export function getReferralLinkById(id: string): ReferralLink | undefined {
  return referralLinks.get(id);
}

/**
 * Get a referral link by code.
 */
export function getReferralLinkByCode(code: string): ReferralLink | undefined {
  const id = referralsByCode.get(code);
  if (!id) return undefined;
  return referralLinks.get(id);
}

/**
 * List referral links for an affiliate.
 */
export function listAffiliateLinks(affiliateId: string): ReferralLink[] {
  return Array.from(referralLinks.values())
    .filter((l) => l.affiliateId === affiliateId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Track a click on a referral link.
 */
export function trackClick(
  referralCode: string,
  ipHash: string,
  userAgent: string,
  referer?: string
): ClickEvent | null {
  const linkId = referralsByCode.get(referralCode);
  if (!linkId) return null;

  const link = referralLinks.get(linkId);
  if (!link || !link.isActive) return null;

  // Check if unique click
  const linkIPs = seenIPs.get(linkId) || new Set();
  const isUnique = !linkIPs.has(ipHash);
  linkIPs.add(ipHash);
  seenIPs.set(linkId, linkIPs);

  const event: ClickEvent = ClickEventSchema.parse({
    id: generateUUID(),
    referralLinkId: linkId,
    affiliateId: link.affiliateId,
    ipHash,
    userAgent,
    referer,
    isUnique,
    timestamp: nowISO(),
  });

  clickEvents.push(event);

  // Update link counters
  const updated: ReferralLink = ReferralLinkSchema.parse({
    ...link,
    totalClicks: link.totalClicks + 1,
    uniqueClicks: isUnique ? link.uniqueClicks + 1 : link.uniqueClicks,
    updatedAt: nowISO(),
  });
  referralLinks.set(linkId, updated);

  return event;
}

/**
 * Track a conversion event.
 */
export function trackConversion(
  referralCode: string,
  userId: string,
  type: ConversionEvent['type'],
  revenueCents: number,
  productId?: string
): ConversionEvent | null {
  const linkId = referralsByCode.get(referralCode);
  if (!linkId) return null;

  const link = referralLinks.get(linkId);
  if (!link) return null;

  const event: ConversionEvent = ConversionEventSchema.parse({
    id: generateUUID(),
    referralLinkId: linkId,
    affiliateId: link.affiliateId,
    userId,
    type,
    revenueCents,
    productId,
    timestamp: nowISO(),
  });

  conversionEvents.push(event);

  // Update link conversion counter
  const updated: ReferralLink = ReferralLinkSchema.parse({
    ...link,
    conversions: link.conversions + 1,
    updatedAt: nowISO(),
  });
  referralLinks.set(linkId, updated);

  return event;
}

/**
 * Get click events for a referral link.
 */
export function getClickEvents(
  referralLinkId: string,
  filters?: { since?: string; limit?: number }
): ClickEvent[] {
  let result = clickEvents.filter((e) => e.referralLinkId === referralLinkId);

  if (filters?.since) {
    result = result.filter((e) => e.timestamp >= filters.since!);
  }

  result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (filters?.limit) {
    result = result.slice(0, filters.limit);
  }

  return result;
}

/**
 * Get conversion events for an affiliate.
 */
export function getConversionEvents(
  affiliateId: string,
  filters?: { type?: ConversionEvent['type']; since?: string; limit?: number }
): ConversionEvent[] {
  let result = conversionEvents.filter((e) => e.affiliateId === affiliateId);

  if (filters?.type) {
    result = result.filter((e) => e.type === filters.type);
  }
  if (filters?.since) {
    result = result.filter((e) => e.timestamp >= filters.since!);
  }

  result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (filters?.limit) {
    result = result.slice(0, filters.limit);
  }

  return result;
}

/**
 * Attribute a user to an affiliate (lookup which affiliate referred a user).
 */
export function getAttributedAffiliate(userId: string): { affiliateId: string; referralLinkId: string } | null {
  const conversion = conversionEvents.find((e) => e.userId === userId);
  if (!conversion) return null;
  return {
    affiliateId: conversion.affiliateId,
    referralLinkId: conversion.referralLinkId,
  };
}

/**
 * Deactivate a referral link.
 */
export function deactivateLink(linkId: string): ReferralLink {
  const link = referralLinks.get(linkId);
  if (!link) {
    throw new Error(`Referral link not found: ${linkId}`);
  }

  const updated: ReferralLink = ReferralLinkSchema.parse({
    ...link,
    isActive: false,
    updatedAt: nowISO(),
  });
  referralLinks.set(linkId, updated);
  return updated;
}

/**
 * Get click/conversion stats for an affiliate.
 */
export function getAffiliateStats(affiliateId: string): {
  totalClicks: number;
  uniqueClicks: number;
  totalConversions: number;
  totalRevenueCents: number;
  conversionRate: number;
} {
  const links = listAffiliateLinks(affiliateId);
  const totalClicks = links.reduce((sum, l) => sum + l.totalClicks, 0);
  const uniqueClicks = links.reduce((sum, l) => sum + l.uniqueClicks, 0);
  const totalConversions = links.reduce((sum, l) => sum + l.conversions, 0);

  const affiliateConversions = conversionEvents.filter((e) => e.affiliateId === affiliateId);
  const totalRevenueCents = affiliateConversions.reduce((sum, e) => sum + e.revenueCents, 0);

  const conversionRate = uniqueClicks > 0 ? (totalConversions / uniqueClicks) * 100 : 0;

  return { totalClicks, uniqueClicks, totalConversions, totalRevenueCents, conversionRate };
}

/**
 * Clear the in-memory stores (for testing).
 */
export function clearReferralTrackingStores(): void {
  referralLinks.clear();
  referralsByCode.clear();
  clickEvents.length = 0;
  conversionEvents.length = 0;
  seenIPs.clear();
}
