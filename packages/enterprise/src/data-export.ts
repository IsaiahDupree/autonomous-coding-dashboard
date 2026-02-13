/**
 * Data Export (COMP-002)
 * Generate user data export in JSON/CSV format.
 */

import { DataExport, DataExportFormat, DataExportSchema } from './types';
import { DataSubjectRegistry } from './data-registry';

export interface ExportableDataSource {
  tableName: string;
  getData: (userId: string) => Record<string, unknown>[];
}

let exportIdCounter = 0;

/**
 * Generates user data exports for GDPR data portability requirements.
 * Supports JSON and CSV formats.
 */
export class DataExportService {
  private exports: Map<string, DataExport> = new Map();
  private dataSources: Map<string, ExportableDataSource> = new Map();

  constructor(private registry: DataSubjectRegistry) {}

  /** Register a data source that can provide user data for export */
  registerDataSource(source: ExportableDataSource): void {
    this.dataSources.set(source.tableName, source);
  }

  /**
   * Request a data export for a user.
   * Gathers data from all registered sources and the data registry.
   */
  requestExport(userId: string, format: DataExportFormat): DataExport {
    exportIdCounter++;
    const now = Date.now();

    const dataExport = DataExportSchema.parse({
      id: `export_${exportIdCounter}`,
      userId,
      format,
      data: {},
      requestedAt: now,
      status: 'pending',
    });

    this.exports.set(dataExport.id, dataExport);
    return dataExport;
  }

  /**
   * Process a pending data export.
   * Collects data from all sources and formats it.
   */
  processExport(exportId: string): DataExport {
    const dataExport = this.exports.get(exportId);
    if (!dataExport) {
      throw new Error(`Export "${exportId}" not found`);
    }

    if (dataExport.status !== 'pending') {
      throw new Error(`Export "${exportId}" is not in pending status (current: ${dataExport.status})`);
    }

    dataExport.status = 'processing';

    try {
      const userId = dataExport.userId;
      const exportData: Record<string, unknown> = {};

      // Get data from the subject registry
      const subjectRecord = this.registry.getSubjectRecord(userId);
      if (subjectRecord) {
        exportData['_registry'] = {
          userId: subjectRecord.userId,
          email: subjectRecord.email,
          dataCategories: subjectRecord.dataEntries.map(e => ({
            table: e.tableName,
            category: e.category,
            description: e.description,
          })),
          registeredAt: new Date(subjectRecord.registeredAt).toISOString(),
        };
      }

      // Collect data from all registered sources
      for (const [tableName, source] of this.dataSources) {
        try {
          const records = source.getData(userId);
          if (records.length > 0) {
            exportData[tableName] = records;
          }
        } catch {
          exportData[`${tableName}_error`] = 'Failed to export data from this source';
        }
      }

      dataExport.data = exportData;
      dataExport.status = 'completed';
      dataExport.completedAt = Date.now();
    } catch {
      dataExport.status = 'failed';
    }

    return dataExport;
  }

  /** Get an export by ID */
  getExport(exportId: string): DataExport | undefined {
    return this.exports.get(exportId);
  }

  /** Get all exports for a user */
  getUserExports(userId: string): DataExport[] {
    return Array.from(this.exports.values()).filter(e => e.userId === userId);
  }

  /**
   * Format export data as JSON string.
   */
  formatAsJSON(exportId: string): string {
    const dataExport = this.exports.get(exportId);
    if (!dataExport || dataExport.status !== 'completed') {
      throw new Error(`Export "${exportId}" is not completed`);
    }

    return JSON.stringify(dataExport.data, null, 2);
  }

  /**
   * Format export data as CSV string.
   * Flattens nested structures into rows with headers.
   */
  formatAsCSV(exportId: string): string {
    const dataExport = this.exports.get(exportId);
    if (!dataExport || dataExport.status !== 'completed') {
      throw new Error(`Export "${exportId}" is not completed`);
    }

    const sections: string[] = [];

    for (const [tableName, data] of Object.entries(dataExport.data)) {
      if (Array.isArray(data) && data.length > 0) {
        sections.push(this.arrayToCSV(tableName, data as Record<string, unknown>[]));
      } else if (typeof data === 'object' && data !== null) {
        sections.push(this.objectToCSV(tableName, data as Record<string, unknown>));
      }
    }

    return sections.join('\n\n');
  }

  private arrayToCSV(tableName: string, records: Record<string, unknown>[]): string {
    if (records.length === 0) return '';

    const headers = new Set<string>();
    for (const record of records) {
      for (const key of Object.keys(record)) {
        headers.add(key);
      }
    }

    const headerList = Array.from(headers);
    const lines: string[] = [
      `# ${tableName}`,
      headerList.map(h => this.escapeCSV(h)).join(','),
    ];

    for (const record of records) {
      const values = headerList.map(h => this.escapeCSV(String(record[h] ?? '')));
      lines.push(values.join(','));
    }

    return lines.join('\n');
  }

  private objectToCSV(tableName: string, obj: Record<string, unknown>): string {
    const lines: string[] = [`# ${tableName}`, 'key,value'];

    for (const [key, value] of Object.entries(obj)) {
      const strValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      lines.push(`${this.escapeCSV(key)},${this.escapeCSV(strValue)}`);
    }

    return lines.join('\n');
  }

  private escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
