/**
 * Consent Management (COMP-004)
 * Consent categories, opt-in/opt-out tracking, consent history.
 */

import { ConsentCategory, ConsentRecord, ConsentRecordSchema } from './types';

export interface GrantConsentInput {
  userId: string;
  category: ConsentCategory;
  ipAddress?: string;
  userAgent?: string;
}

export interface ConsentStatus {
  userId: string;
  consents: Record<ConsentCategory, boolean>;
  lastUpdated: number;
}

let consentIdCounter = 0;

/**
 * Manages user consent for various data processing categories.
 * Tracks consent history for compliance auditing.
 */
export class ConsentManager {
  /** userId -> category -> ConsentRecord[] (history) */
  private consentHistory: Map<string, Map<ConsentCategory, ConsentRecord[]>> = new Map();
  /** userId -> category -> current ConsentRecord */
  private currentConsents: Map<string, Map<ConsentCategory, ConsentRecord>> = new Map();

  /** Grant consent for a category */
  grantConsent(input: GrantConsentInput): ConsentRecord {
    consentIdCounter++;
    const now = Date.now();

    // Check if there's an existing active consent
    const existing = this.getCurrentConsent(input.userId, input.category);
    const version = existing ? existing.version + 1 : 1;

    const record = ConsentRecordSchema.parse({
      id: `consent_${consentIdCounter}`,
      userId: input.userId,
      category: input.category,
      granted: true,
      grantedAt: now,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      version,
    });

    this.storeConsent(record);
    return record;
  }

  /** Revoke consent for a category */
  revokeConsent(input: GrantConsentInput): ConsentRecord {
    consentIdCounter++;
    const now = Date.now();

    const existing = this.getCurrentConsent(input.userId, input.category);
    const version = existing ? existing.version + 1 : 1;

    const record = ConsentRecordSchema.parse({
      id: `consent_${consentIdCounter}`,
      userId: input.userId,
      category: input.category,
      granted: false,
      grantedAt: now,
      revokedAt: now,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      version,
    });

    this.storeConsent(record);
    return record;
  }

  /** Get the current consent status for a user and category */
  getCurrentConsent(userId: string, category: ConsentCategory): ConsentRecord | undefined {
    return this.currentConsents.get(userId)?.get(category);
  }

  /** Check if a user has granted consent for a category */
  hasConsent(userId: string, category: ConsentCategory): boolean {
    const record = this.getCurrentConsent(userId, category);
    return record?.granted ?? false;
  }

  /** Get the full consent status for a user */
  getConsentStatus(userId: string): ConsentStatus {
    const allCategories: ConsentCategory[] = [
      'essential', 'analytics', 'marketing', 'personalization', 'third_party',
    ];

    const consents: Record<ConsentCategory, boolean> = {} as Record<ConsentCategory, boolean>;
    let lastUpdated = 0;

    for (const category of allCategories) {
      const record = this.getCurrentConsent(userId, category);
      consents[category] = record?.granted ?? false;
      if (record) {
        lastUpdated = Math.max(lastUpdated, record.grantedAt);
      }
    }

    return {
      userId,
      consents,
      lastUpdated,
    };
  }

  /** Get consent history for a user and category */
  getConsentHistory(userId: string, category?: ConsentCategory): ConsentRecord[] {
    const userHistory = this.consentHistory.get(userId);
    if (!userHistory) return [];

    if (category) {
      return userHistory.get(category) ?? [];
    }

    // Return all history for the user
    const allRecords: ConsentRecord[] = [];
    for (const records of userHistory.values()) {
      allRecords.push(...records);
    }
    return allRecords.sort((a, b) => a.grantedAt - b.grantedAt);
  }

  /**
   * Bulk update consents (e.g., from a consent banner).
   * Returns all updated consent records.
   */
  updateConsents(
    userId: string,
    consents: Partial<Record<ConsentCategory, boolean>>,
    options?: { ipAddress?: string; userAgent?: string },
  ): ConsentRecord[] {
    const results: ConsentRecord[] = [];

    for (const [category, granted] of Object.entries(consents) as Array<[ConsentCategory, boolean]>) {
      const input: GrantConsentInput = {
        userId,
        category,
        ipAddress: options?.ipAddress,
        userAgent: options?.userAgent,
      };

      if (granted) {
        results.push(this.grantConsent(input));
      } else {
        results.push(this.revokeConsent(input));
      }
    }

    return results;
  }

  /** Get all users who have granted consent for a specific category */
  getUsersWithConsent(category: ConsentCategory): string[] {
    const users: string[] = [];
    for (const [userId, categoryMap] of this.currentConsents) {
      const record = categoryMap.get(category);
      if (record?.granted) {
        users.push(userId);
      }
    }
    return users;
  }

  /** Remove all consent records for a user (for data deletion) */
  clearUserConsents(userId: string): void {
    this.consentHistory.delete(userId);
    this.currentConsents.delete(userId);
  }

  private storeConsent(record: ConsentRecord): void {
    // Store in history
    if (!this.consentHistory.has(record.userId)) {
      this.consentHistory.set(record.userId, new Map());
    }
    const userHistory = this.consentHistory.get(record.userId)!;
    if (!userHistory.has(record.category)) {
      userHistory.set(record.category, []);
    }
    userHistory.get(record.category)!.push(record);

    // Update current consent
    if (!this.currentConsents.has(record.userId)) {
      this.currentConsents.set(record.userId, new Map());
    }
    this.currentConsents.get(record.userId)!.set(record.category, record);
  }
}
