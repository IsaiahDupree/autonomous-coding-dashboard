// EXP-002: Bulk Data Import

import type {
  ImportJob,
  ImportJobStatus,
  FieldMapping,
  ImportValidationRule,
  ImportError,
  ExportFormat,
} from './types';

const jobStore = new Map<string, ImportJob>();

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export interface CreateImportInput {
  name: string;
  sourceFormat: ExportFormat;
  targetEntity: string;
  fieldMappings: FieldMapping[];
  validationRules?: ImportValidationRule[];
  skipOnError?: boolean;
  dryRun?: boolean;
  createdBy: string;
}

export interface RecordPersister {
  validateRecord(entity: string, record: Record<string, unknown>): ImportError[];
  insertRecord(entity: string, record: Record<string, unknown>): Promise<void>;
}

function applyFieldMapping(
  sourceRecord: Record<string, unknown>,
  mappings: FieldMapping[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const mapping of mappings) {
    let value = sourceRecord[mapping.sourceField] ?? mapping.defaultValue;

    if (value !== undefined && value !== null) {
      switch (mapping.transform) {
        case 'lowercase':
          value = String(value).toLowerCase();
          break;
        case 'uppercase':
          value = String(value).toUpperCase();
          break;
        case 'trim':
          value = String(value).trim();
          break;
        case 'parse_number':
          value = Number(value);
          break;
        case 'parse_date':
          value = new Date(String(value));
          break;
      }
    }

    result[mapping.targetField] = value;
  }
  return result;
}

export function createImportJob(input: CreateImportInput): ImportJob {
  const job: ImportJob = {
    id: generateId(),
    name: input.name,
    sourceFormat: input.sourceFormat,
    targetEntity: input.targetEntity,
    fieldMappings: input.fieldMappings,
    validationRules: input.validationRules,
    status: 'pending',
    processedRecords: 0,
    successCount: 0,
    errorCount: 0,
    errors: [],
    skipOnError: input.skipOnError ?? false,
    dryRun: input.dryRun ?? false,
    createdBy: input.createdBy,
    createdAt: new Date(),
  };
  jobStore.set(job.id, job);
  return job;
}

export async function processImportJob(
  jobId: string,
  sourceRecords: Record<string, unknown>[],
  persister: RecordPersister,
): Promise<ImportJob> {
  const job = jobStore.get(jobId);
  if (!job) throw new Error(`Import job ${jobId} not found`);

  job.status = 'validating';
  job.totalRecords = sourceRecords.length;
  job.errors = [];

  // Validate and transform
  const transformedRecords: Record<string, unknown>[] = [];
  for (let i = 0; i < sourceRecords.length; i++) {
    const transformed = applyFieldMapping(sourceRecords[i], job.fieldMappings);
    const errors = persister.validateRecord(job.targetEntity, transformed);
    if (errors.length > 0) {
      job.errors.push(...errors.map((e) => ({ ...e, row: i })));
      job.errorCount += errors.length;
      if (!job.skipOnError) {
        job.status = 'failed';
        job.errorMessage = `Validation failed at row ${i}`;
        return job;
      }
    } else {
      transformedRecords.push(transformed);
    }
  }

  if (job.dryRun) {
    job.status = 'completed';
    job.processedRecords = sourceRecords.length;
    job.successCount = transformedRecords.length;
    job.completedAt = new Date();
    return job;
  }

  // Persist records
  job.status = 'processing';
  for (let i = 0; i < transformedRecords.length; i++) {
    try {
      await persister.insertRecord(job.targetEntity, transformedRecords[i]);
      job.successCount++;
    } catch (err) {
      job.errors!.push({
        row: i,
        message: err instanceof Error ? err.message : String(err),
        severity: 'error',
      });
      job.errorCount++;
      if (!job.skipOnError) {
        job.status = 'failed';
        return job;
      }
    }
    job.processedRecords = i + 1;
  }

  job.status = job.errorCount > 0 ? 'partial' : 'completed';
  job.completedAt = new Date();
  return job;
}

export function getImportJobById(id: string): ImportJob | undefined {
  return jobStore.get(id);
}

export function listImportJobs(filters?: {
  status?: ImportJobStatus;
  createdBy?: string;
  limit?: number;
}): ImportJob[] {
  let jobs = Array.from(jobStore.values());
  if (filters?.status) jobs = jobs.filter((j) => j.status === filters.status);
  if (filters?.createdBy) jobs = jobs.filter((j) => j.createdBy === filters.createdBy);
  jobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return jobs.slice(0, filters?.limit ?? 100);
}

export function cancelImportJob(id: string): ImportJob {
  const job = jobStore.get(id);
  if (!job) throw new Error(`Import job ${id} not found`);
  if (['completed', 'failed', 'partial'].includes(job.status)) {
    throw new Error(`Cannot cancel ${job.status} job`);
  }
  job.status = 'cancelled';
  return job;
}

export function clearImportJobStore(): void {
  jobStore.clear();
}
