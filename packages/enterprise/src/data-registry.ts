/**
 * Data Subject Registry (COMP-001)
 * Track what data is stored for each user, with data categories.
 */

import { DataCategory, DataSubjectRecord, DataSubjectRecordSchema } from './types';

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
export class DataSubjectRegistry {
  private subjects: Map<string, DataSubjectRecord> = new Map();

  /** Register a new data entry for a user */
  registerDataEntry(input: RegisterDataEntryInput): DataSubjectRecord {
    const now = Date.now();
    let record = this.subjects.get(input.userId);

    if (!record) {
      record = DataSubjectRecordSchema.parse({
        userId: input.userId,
        email: input.email,
        dataEntries: [],
        registeredAt: now,
        updatedAt: now,
      });
      this.subjects.set(input.userId, record);
    }

    // Check for duplicate entry
    const exists = record.dataEntries.some(
      e => e.tableName === input.tableName && e.recordId === input.recordId,
    );

    if (!exists) {
      record.dataEntries.push({
        tableName: input.tableName,
        recordId: input.recordId,
        category: input.category,
        description: input.description,
        createdAt: now,
      });
      record.updatedAt = now;
    }

    if (input.email && !record.email) {
      record.email = input.email;
      record.updatedAt = now;
    }

    return record;
  }

  /** Get the data subject record for a user */
  getSubjectRecord(userId: string): DataSubjectRecord | undefined {
    return this.subjects.get(userId);
  }

  /** Get all registered subjects */
  getAllSubjects(): DataSubjectRecord[] {
    return Array.from(this.subjects.values());
  }

  /** Find a subject by email */
  findByEmail(email: string): DataSubjectRecord | undefined {
    for (const record of this.subjects.values()) {
      if (record.email === email) return record;
    }
    return undefined;
  }

  /** Get all data entries for a specific category */
  getEntriesByCategory(userId: string, category: DataCategory): DataSubjectRecord['dataEntries'] {
    const record = this.subjects.get(userId);
    if (!record) return [];
    return record.dataEntries.filter(e => e.category === category);
  }

  /** Get all data entries in a specific table */
  getEntriesByTable(userId: string, tableName: string): DataSubjectRecord['dataEntries'] {
    const record = this.subjects.get(userId);
    if (!record) return [];
    return record.dataEntries.filter(e => e.tableName === tableName);
  }

  /** Remove a data entry from a user's record (e.g., after data deletion) */
  removeDataEntry(userId: string, tableName: string, recordId: string): boolean {
    const record = this.subjects.get(userId);
    if (!record) return false;

    const index = record.dataEntries.findIndex(
      e => e.tableName === tableName && e.recordId === recordId,
    );

    if (index === -1) return false;

    record.dataEntries.splice(index, 1);
    record.updatedAt = Date.now();
    return true;
  }

  /** Remove all data entries for a user (e.g., after full data deletion) */
  removeAllEntries(userId: string): boolean {
    return this.subjects.delete(userId);
  }

  /** Get a summary of data categories stored for a user */
  getDataCategorySummary(userId: string): Array<{ category: DataCategory; count: number; tables: string[] }> {
    const record = this.subjects.get(userId);
    if (!record) return [];

    const byCategory = new Map<DataCategory, { count: number; tables: Set<string> }>();
    for (const entry of record.dataEntries) {
      if (!byCategory.has(entry.category)) {
        byCategory.set(entry.category, { count: 0, tables: new Set() });
      }
      const cat = byCategory.get(entry.category)!;
      cat.count++;
      cat.tables.add(entry.tableName);
    }

    return Array.from(byCategory.entries()).map(([category, data]) => ({
      category,
      count: data.count,
      tables: Array.from(data.tables),
    }));
  }
}
