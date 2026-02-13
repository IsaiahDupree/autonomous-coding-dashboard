// EXP-003: Product Data Migration Tools / Bulk Operations

import type {
  BulkOperationJob,
  BulkOperationType,
  BulkOperationStatus,
  BulkOperationItem,
  MigrationPlan,
  MigrationStep,
  TransformationRule,
} from './types';

const bulkJobStore = new Map<string, BulkOperationJob>();
const migrationStore = new Map<string, MigrationPlan>();

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// ── Bulk Operations ─────────────────────────────────────────────────────────

export interface CreateBulkOperationInput {
  entity: string;
  operation: BulkOperationType;
  items: Array<{ id: string; data?: Record<string, unknown> }>;
  rollbackSupported?: boolean;
  createdBy: string;
}

export function createBulkOperation(input: CreateBulkOperationInput): BulkOperationJob {
  const items: BulkOperationItem[] = input.items.map((item) => ({
    id: item.id,
    operation: input.operation,
    data: item.data,
    status: 'pending',
  }));

  const job: BulkOperationJob = {
    id: generateId(),
    entity: input.entity,
    operation: input.operation,
    items,
    status: 'pending',
    totalItems: items.length,
    processedItems: 0,
    successCount: 0,
    failureCount: 0,
    rollbackSupported: input.rollbackSupported ?? true,
    createdBy: input.createdBy,
    createdAt: new Date(),
  };
  bulkJobStore.set(job.id, job);
  return job;
}

export interface BulkOperationHandler {
  execute(entity: string, operation: BulkOperationType, item: BulkOperationItem): Promise<void>;
  rollback?(entity: string, item: BulkOperationItem, originalData: Record<string, unknown>): Promise<void>;
}

export async function executeBulkOperation(
  jobId: string,
  handler: BulkOperationHandler,
): Promise<BulkOperationJob> {
  const job = bulkJobStore.get(jobId);
  if (!job) throw new Error(`Bulk operation ${jobId} not found`);

  job.status = 'processing';
  job.rollbackData = [];

  for (let i = 0; i < job.items.length; i++) {
    const item = job.items[i];
    try {
      await handler.execute(job.entity, job.operation, item);
      item.status = 'success';
      job.successCount++;
      if (item.data && job.rollbackSupported) {
        job.rollbackData!.push(item.data);
      }
    } catch (err) {
      item.status = 'failed';
      item.errorMessage = err instanceof Error ? err.message : String(err);
      job.failureCount++;
    }
    job.processedItems = i + 1;
  }

  job.status = job.failureCount === job.totalItems
    ? 'failed'
    : job.failureCount > 0
      ? 'partial'
      : 'completed';
  job.completedAt = new Date();
  return job;
}

export function getBulkOperationById(id: string): BulkOperationJob | undefined {
  return bulkJobStore.get(id);
}

export function listBulkOperations(limit: number = 50): BulkOperationJob[] {
  return Array.from(bulkJobStore.values())
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit);
}

// ── Migration Plans (EXP-003, EXP-004) ─────────────────────────────────────

export interface CreateMigrationInput {
  name: string;
  description?: string;
  steps: Array<{
    name: string;
    sourceEntity: string;
    targetEntity: string;
    transformations: TransformationRule[];
    batchSize?: number;
  }>;
  dryRun?: boolean;
  createdBy: string;
}

export function createMigrationPlan(input: CreateMigrationInput): MigrationPlan {
  const steps: MigrationStep[] = input.steps.map((s, i) => ({
    id: generateId(),
    name: s.name,
    order: i,
    sourceEntity: s.sourceEntity,
    targetEntity: s.targetEntity,
    transformations: s.transformations,
    batchSize: s.batchSize ?? 1000,
    status: 'pending',
    processedRecords: 0,
    errorCount: 0,
  }));

  const plan: MigrationPlan = {
    id: generateId(),
    name: input.name,
    description: input.description,
    steps,
    status: 'draft',
    dryRun: input.dryRun ?? true,
    createdBy: input.createdBy,
    createdAt: new Date(),
  };
  migrationStore.set(plan.id, plan);
  return plan;
}

export function getMigrationPlanById(id: string): MigrationPlan | undefined {
  return migrationStore.get(id);
}

export function listMigrationPlans(): MigrationPlan[] {
  return Array.from(migrationStore.values())
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function updateMigrationStatus(
  planId: string,
  status: MigrationPlan['status'],
): MigrationPlan {
  const plan = migrationStore.get(planId);
  if (!plan) throw new Error(`Migration plan ${planId} not found`);
  plan.status = status;
  if (status === 'running') plan.startedAt = new Date();
  if (status === 'completed' || status === 'failed') plan.completedAt = new Date();
  return plan;
}

export function clearBulkOperationStores(): void {
  bulkJobStore.clear();
  migrationStore.clear();
}
