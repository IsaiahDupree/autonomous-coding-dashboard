// EXP-001: Bulk Data Export
// EXP-004: API Data Export

import type { ExportJob, ExportFormat, ExportJobStatus } from './types';

const jobStore = new Map<string, ExportJob>();

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export interface CreateExportInput {
  name: string;
  format: ExportFormat;
  entity: string;
  filters?: Record<string, unknown>;
  fields?: string[];
  sort?: { field: string; order: 'asc' | 'desc' };
  streaming?: boolean;
  chunkSize?: number;
  createdBy: string;
}

export interface DataFetcher {
  countRecords(entity: string, filters?: Record<string, unknown>): Promise<number>;
  fetchRecords(
    entity: string,
    filters?: Record<string, unknown>,
    fields?: string[],
    sort?: { field: string; order: 'asc' | 'desc' },
    offset?: number,
    limit?: number,
  ): Promise<Record<string, unknown>[]>;
}

export function createExportJob(input: CreateExportInput): ExportJob {
  const job: ExportJob = {
    id: generateId(),
    name: input.name,
    format: input.format,
    source: {
      entity: input.entity,
      filters: input.filters,
      fields: input.fields,
      sort: input.sort,
    },
    status: 'pending',
    streaming: input.streaming ?? false,
    chunkSize: input.chunkSize ?? 1000,
    processedRecords: 0,
    createdBy: input.createdBy,
    createdAt: new Date(),
  };
  jobStore.set(job.id, job);
  return job;
}

export async function processExportJob(
  jobId: string,
  fetcher: DataFetcher,
  formatter: (records: Record<string, unknown>[], format: ExportFormat) => string,
  uploader: (content: string, filename: string) => Promise<string>,
): Promise<ExportJob> {
  const job = jobStore.get(jobId);
  if (!job) throw new Error(`Export job ${jobId} not found`);

  job.status = 'processing';

  try {
    const totalRecords = await fetcher.countRecords(job.source.entity, job.source.filters);
    job.totalRecords = totalRecords;

    const allRecords: Record<string, unknown>[] = [];
    let offset = 0;

    while (offset < totalRecords) {
      const records = await fetcher.fetchRecords(
        job.source.entity,
        job.source.filters,
        job.source.fields,
        job.source.sort,
        offset,
        job.chunkSize,
      );
      allRecords.push(...records);
      offset += job.chunkSize;
      job.processedRecords = Math.min(offset, totalRecords);
    }

    const content = formatter(allRecords, job.format);
    const ext = job.format === 'json' ? 'json' : job.format === 'csv' ? 'csv' : 'xlsx';
    const filename = `${job.name.replace(/\s+/g, '_')}_${Date.now()}.${ext}`;

    const url = await uploader(content, filename);
    job.outputUrl = url;
    job.outputSize = content.length;
    job.status = 'completed';
    job.completedAt = new Date();
  } catch (err) {
    job.status = 'failed';
    job.errorMessage = err instanceof Error ? err.message : String(err);
  }

  return job;
}

export function getExportJobById(id: string): ExportJob | undefined {
  return jobStore.get(id);
}

export function listExportJobs(filters?: {
  status?: ExportJobStatus;
  createdBy?: string;
  limit?: number;
}): ExportJob[] {
  let jobs = Array.from(jobStore.values());
  if (filters?.status) jobs = jobs.filter((j) => j.status === filters.status);
  if (filters?.createdBy) jobs = jobs.filter((j) => j.createdBy === filters.createdBy);
  jobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return jobs.slice(0, filters?.limit ?? 100);
}

export function cancelExportJob(id: string): ExportJob {
  const job = jobStore.get(id);
  if (!job) throw new Error(`Export job ${id} not found`);
  if (job.status === 'completed' || job.status === 'failed') {
    throw new Error(`Cannot cancel ${job.status} job`);
  }
  job.status = 'cancelled';
  return job;
}

export function clearExportJobStore(): void {
  jobStore.clear();
}
