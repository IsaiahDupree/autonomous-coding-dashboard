/**
 * Consent Management (COMP-004)
 * Consent categories, opt-in/opt-out tracking, consent history.
 */
import { ConsentCategory, ConsentRecord } from './types';
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
/**
 * Manages user consent for various data processing categories.
 * Tracks consent history for compliance auditing.
 */
export declare class ConsentManager {
    /** userId -> category -> ConsentRecord[] (history) */
    private consentHistory;
    /** userId -> category -> current ConsentRecord */
    private currentConsents;
    /** Grant consent for a category */
    grantConsent(input: GrantConsentInput): ConsentRecord;
    /** Revoke consent for a category */
    revokeConsent(input: GrantConsentInput): ConsentRecord;
    /** Get the current consent status for a user and category */
    getCurrentConsent(userId: string, category: ConsentCategory): ConsentRecord | undefined;
    /** Check if a user has granted consent for a category */
    hasConsent(userId: string, category: ConsentCategory): boolean;
    /** Get the full consent status for a user */
    getConsentStatus(userId: string): ConsentStatus;
    /** Get consent history for a user and category */
    getConsentHistory(userId: string, category?: ConsentCategory): ConsentRecord[];
    /**
     * Bulk update consents (e.g., from a consent banner).
     * Returns all updated consent records.
     */
    updateConsents(userId: string, consents: Partial<Record<ConsentCategory, boolean>>, options?: {
        ipAddress?: string;
        userAgent?: string;
    }): ConsentRecord[];
    /** Get all users who have granted consent for a specific category */
    getUsersWithConsent(category: ConsentCategory): string[];
    /** Remove all consent records for a user (for data deletion) */
    clearUserConsents(userId: string): void;
    private storeConsent;
}
//# sourceMappingURL=consent.d.ts.map