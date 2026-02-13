/**
 * Data Subject Registry (COMP-001)
 * Track what data is stored for each user, with data categories.
 */
import { DataCategory, DataSubjectRecord } from './types';
export interface RegisterDataEntryInput {
    userId: string;
    email?: string;
    tableName: string;
    recordId: string;
    category: DataCategory;
    description: string;
}
/**
 * Maintains a registry of what personal data is stored for each user.
 * Required for GDPR compliance - enables data subject access requests.
 */
export declare class DataSubjectRegistry {
    private subjects;
    /** Register a new data entry for a user */
    registerDataEntry(input: RegisterDataEntryInput): DataSubjectRecord;
    /** Get the data subject record for a user */
    getSubjectRecord(userId: string): DataSubjectRecord | undefined;
    /** Get all registered subjects */
    getAllSubjects(): DataSubjectRecord[];
    /** Find a subject by email */
    findByEmail(email: string): DataSubjectRecord | undefined;
    /** Get all data entries for a specific category */
    getEntriesByCategory(userId: string, category: DataCategory): DataSubjectRecord['dataEntries'];
    /** Get all data entries in a specific table */
    getEntriesByTable(userId: string, tableName: string): DataSubjectRecord['dataEntries'];
    /** Remove a data entry from a user's record (e.g., after data deletion) */
    removeDataEntry(userId: string, tableName: string, recordId: string): boolean;
    /** Remove all data entries for a user (e.g., after full data deletion) */
    removeAllEntries(userId: string): boolean;
    /** Get a summary of data categories stored for a user */
    getDataCategorySummary(userId: string): Array<{
        category: DataCategory;
        count: number;
        tables: string[];
    }>;
}
//# sourceMappingURL=data-registry.d.ts.map