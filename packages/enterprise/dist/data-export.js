"use strict";
/**
 * Data Export (COMP-002)
 * Generate user data export in JSON/CSV format.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataExportService = void 0;
const types_1 = require("./types");
let exportIdCounter = 0;
/**
 * Generates user data exports for GDPR data portability requirements.
 * Supports JSON and CSV formats.
 */
class DataExportService {
    constructor(registry) {
        this.registry = registry;
        this.exports = new Map();
        this.dataSources = new Map();
    }
    /** Register a data source that can provide user data for export */
    registerDataSource(source) {
        this.dataSources.set(source.tableName, source);
    }
    /**
     * Request a data export for a user.
     * Gathers data from all registered sources and the data registry.
     */
    requestExport(userId, format) {
        exportIdCounter++;
        const now = Date.now();
        const dataExport = types_1.DataExportSchema.parse({
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
    processExport(exportId) {
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
            const exportData = {};
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
                }
                catch {
                    exportData[`${tableName}_error`] = 'Failed to export data from this source';
                }
            }
            dataExport.data = exportData;
            dataExport.status = 'completed';
            dataExport.completedAt = Date.now();
        }
        catch {
            dataExport.status = 'failed';
        }
        return dataExport;
    }
    /** Get an export by ID */
    getExport(exportId) {
        return this.exports.get(exportId);
    }
    /** Get all exports for a user */
    getUserExports(userId) {
        return Array.from(this.exports.values()).filter(e => e.userId === userId);
    }
    /**
     * Format export data as JSON string.
     */
    formatAsJSON(exportId) {
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
    formatAsCSV(exportId) {
        const dataExport = this.exports.get(exportId);
        if (!dataExport || dataExport.status !== 'completed') {
            throw new Error(`Export "${exportId}" is not completed`);
        }
        const sections = [];
        for (const [tableName, data] of Object.entries(dataExport.data)) {
            if (Array.isArray(data) && data.length > 0) {
                sections.push(this.arrayToCSV(tableName, data));
            }
            else if (typeof data === 'object' && data !== null) {
                sections.push(this.objectToCSV(tableName, data));
            }
        }
        return sections.join('\n\n');
    }
    arrayToCSV(tableName, records) {
        if (records.length === 0)
            return '';
        const headers = new Set();
        for (const record of records) {
            for (const key of Object.keys(record)) {
                headers.add(key);
            }
        }
        const headerList = Array.from(headers);
        const lines = [
            `# ${tableName}`,
            headerList.map(h => this.escapeCSV(h)).join(','),
        ];
        for (const record of records) {
            const values = headerList.map(h => this.escapeCSV(String(record[h] ?? '')));
            lines.push(values.join(','));
        }
        return lines.join('\n');
    }
    objectToCSV(tableName, obj) {
        const lines = [`# ${tableName}`, 'key,value'];
        for (const [key, value] of Object.entries(obj)) {
            const strValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
            lines.push(`${this.escapeCSV(key)},${this.escapeCSV(strValue)}`);
        }
        return lines.join('\n');
    }
    escapeCSV(value) {
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
    }
}
exports.DataExportService = DataExportService;
//# sourceMappingURL=data-export.js.map