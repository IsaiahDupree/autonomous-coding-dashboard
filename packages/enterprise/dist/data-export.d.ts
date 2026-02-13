/**
 * Data Export (COMP-002)
 * Generate user data export in JSON/CSV format.
 */
import { DataExport, DataExportFormat } from './types';
import { DataSubjectRegistry } from './data-registry';
export interface ExportableDataSource {
    tableName: string;
    getData: (userId: string) => Record<string, unknown>[];
}
/**
 * Generates user data exports for GDPR data portability requirements.
 * Supports JSON and CSV formats.
 */
export declare class DataExportService {
    private registry;
    private exports;
    private dataSources;
    constructor(registry: DataSubjectRegistry);
    /** Register a data source that can provide user data for export */
    registerDataSource(source: ExportableDataSource): void;
    /**
     * Request a data export for a user.
     * Gathers data from all registered sources and the data registry.
     */
    requestExport(userId: string, format: DataExportFormat): DataExport;
    /**
     * Process a pending data export.
     * Collects data from all sources and formats it.
     */
    processExport(exportId: string): DataExport;
    /** Get an export by ID */
    getExport(exportId: string): DataExport | undefined;
    /** Get all exports for a user */
    getUserExports(userId: string): DataExport[];
    /**
     * Format export data as JSON string.
     */
    formatAsJSON(exportId: string): string;
    /**
     * Format export data as CSV string.
     * Flattens nested structures into rows with headers.
     */
    formatAsCSV(exportId: string): string;
    private arrayToCSV;
    private objectToCSV;
    private escapeCSV;
}
//# sourceMappingURL=data-export.d.ts.map