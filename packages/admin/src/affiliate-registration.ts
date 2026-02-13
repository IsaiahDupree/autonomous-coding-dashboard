/**
 * affiliate-registration.ts - AFF-001: Affiliate Registration
 *
 * Application form schema, approval workflow.
 * Uses an in-memory store for state.
 */

import {
  AffiliateApplication,
  AffiliateApplicationSchema,
  SubmitAffiliateApplication,
  SubmitAffiliateApplicationSchema,
  ReviewApplication,
  ReviewApplicationSchema,
  AffiliateStatusEnum,
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

/** In-memory store */
const applications: Map<string, AffiliateApplication> = new Map();
/** userId -> applicationId for quick lookup */
const userApplications: Map<string, string> = new Map();

/**
 * Submit a new affiliate application.
 */
export function submitApplication(userId: string, input: SubmitAffiliateApplication): AffiliateApplication {
  // Check for existing application
  const existingId = userApplications.get(userId);
  if (existingId) {
    const existing = applications.get(existingId);
    if (existing && (existing.status === 'pending' || existing.status === 'approved')) {
      throw new Error('User already has an active affiliate application');
    }
  }

  const data = SubmitAffiliateApplicationSchema.parse(input);
  const now = nowISO();

  const application: AffiliateApplication = AffiliateApplicationSchema.parse({
    id: generateUUID(),
    userId,
    companyName: data.companyName,
    website: data.website,
    promotionMethod: data.promotionMethod,
    expectedMonthlyReferrals: data.expectedMonthlyReferrals,
    taxId: data.taxId,
    country: data.country,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  });

  applications.set(application.id, application);
  userApplications.set(userId, application.id);

  return application;
}

/**
 * Review an affiliate application (approve or reject).
 */
export function reviewApplication(input: ReviewApplication, reviewerId: string): AffiliateApplication {
  const data = ReviewApplicationSchema.parse(input);
  const application = applications.get(data.applicationId);

  if (!application) {
    throw new Error(`Application not found: ${data.applicationId}`);
  }

  if (application.status !== 'pending') {
    throw new Error(`Application is not in pending status: ${application.status}`);
  }

  const now = nowISO();
  const updated: AffiliateApplication = AffiliateApplicationSchema.parse({
    ...application,
    status: data.decision,
    reviewedBy: reviewerId,
    reviewNotes: data.reviewNotes,
    approvedAt: data.decision === 'approved' ? now : undefined,
    updatedAt: now,
  });

  applications.set(updated.id, updated);
  return updated;
}

/**
 * Get an application by ID.
 */
export function getApplicationById(id: string): AffiliateApplication | undefined {
  return applications.get(id);
}

/**
 * Get an application by user ID.
 */
export function getApplicationByUserId(userId: string): AffiliateApplication | undefined {
  const appId = userApplications.get(userId);
  if (!appId) return undefined;
  return applications.get(appId);
}

/**
 * List all applications with optional filtering.
 */
export function listApplications(filters?: {
  status?: AffiliateApplication['status'];
  country?: string;
  limit?: number;
}): AffiliateApplication[] {
  let result = Array.from(applications.values());

  if (filters?.status) {
    AffiliateStatusEnum.parse(filters.status);
    result = result.filter((a) => a.status === filters.status);
  }
  if (filters?.country) {
    result = result.filter((a) => a.country === filters.country);
  }

  result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (filters?.limit) {
    result = result.slice(0, filters.limit);
  }

  return result;
}

/**
 * Get pending applications count.
 */
export function getPendingApplicationsCount(): number {
  let count = 0;
  for (const app of applications.values()) {
    if (app.status === 'pending') count++;
  }
  return count;
}

/**
 * Suspend an affiliate.
 */
export function suspendAffiliate(applicationId: string, reason?: string): AffiliateApplication {
  const application = applications.get(applicationId);
  if (!application) {
    throw new Error(`Application not found: ${applicationId}`);
  }

  if (application.status !== 'approved') {
    throw new Error('Can only suspend approved affiliates');
  }

  const updated: AffiliateApplication = AffiliateApplicationSchema.parse({
    ...application,
    status: 'suspended',
    reviewNotes: reason || application.reviewNotes,
    updatedAt: nowISO(),
  });

  applications.set(updated.id, updated);
  return updated;
}

/**
 * Terminate an affiliate.
 */
export function terminateAffiliate(applicationId: string, reason?: string): AffiliateApplication {
  const application = applications.get(applicationId);
  if (!application) {
    throw new Error(`Application not found: ${applicationId}`);
  }

  const updated: AffiliateApplication = AffiliateApplicationSchema.parse({
    ...application,
    status: 'terminated',
    reviewNotes: reason || application.reviewNotes,
    updatedAt: nowISO(),
  });

  applications.set(updated.id, updated);
  return updated;
}

/**
 * Check if a user is an approved affiliate.
 */
export function isApprovedAffiliate(userId: string): boolean {
  const appId = userApplications.get(userId);
  if (!appId) return false;
  const app = applications.get(appId);
  return app?.status === 'approved';
}

/**
 * Clear the in-memory stores (for testing).
 */
export function clearAffiliateRegistrationStores(): void {
  applications.clear();
  userApplications.clear();
}
