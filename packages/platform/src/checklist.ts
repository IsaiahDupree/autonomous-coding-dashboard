// OB-003: Onboarding Checklist
// OB-004: Activation Metrics Tracking
// OB-005: Demo Data Seeding

import type {
  Checklist,
  ChecklistItem,
  ChecklistItemStatus,
  ChecklistProgress,
} from './types';

const checklistStore = new Map<string, Checklist>();
const progressStore = new Map<string, ChecklistProgress>();

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export interface CreateChecklistInput {
  name: string;
  product: string;
  description?: string;
  items: Array<{
    title: string;
    description?: string;
    helpUrl?: string;
    actionUrl?: string;
    validationEvent?: string;
    required?: boolean;
    order: number;
  }>;
  dismissible?: boolean;
  rewardOnComplete?: string;
}

export function createChecklist(input: CreateChecklistInput): Checklist {
  const now = new Date();
  const items: ChecklistItem[] = input.items.map((item) => ({
    id: generateId(),
    title: item.title,
    description: item.description,
    helpUrl: item.helpUrl,
    actionUrl: item.actionUrl,
    validationEvent: item.validationEvent,
    required: item.required ?? false,
    order: item.order,
    status: 'pending' as ChecklistItemStatus,
  }));

  const checklist: Checklist = {
    id: generateId(),
    name: input.name,
    product: input.product,
    description: input.description,
    items,
    dismissible: input.dismissible ?? true,
    rewardOnComplete: input.rewardOnComplete,
    createdAt: now,
    updatedAt: now,
  };
  checklistStore.set(checklist.id, checklist);
  return checklist;
}

export function getChecklistById(id: string): Checklist | undefined {
  return checklistStore.get(id);
}

export function listChecklists(product?: string): Checklist[] {
  let lists = Array.from(checklistStore.values());
  if (product) lists = lists.filter((c) => c.product === product);
  return lists;
}

export function startUserChecklist(
  checklistId: string,
  userId: string,
): ChecklistProgress {
  const checklist = checklistStore.get(checklistId);
  if (!checklist) throw new Error(`Checklist ${checklistId} not found`);

  const key = `${userId}:${checklistId}`;
  const progress: ChecklistProgress = {
    userId,
    checklistId,
    itemStatuses: Object.fromEntries(
      checklist.items.map((item) => [item.id, 'pending' as ChecklistItemStatus]),
    ),
    completedCount: 0,
    totalCount: checklist.items.length,
    percentComplete: 0,
    startedAt: new Date(),
    dismissed: false,
  };
  progressStore.set(key, progress);
  return progress;
}

export function getUserChecklistProgress(
  userId: string,
  checklistId: string,
): ChecklistProgress | undefined {
  return progressStore.get(`${userId}:${checklistId}`);
}

export function updateItemStatus(
  userId: string,
  checklistId: string,
  itemId: string,
  status: ChecklistItemStatus,
): ChecklistProgress {
  const key = `${userId}:${checklistId}`;
  const progress = progressStore.get(key);
  if (!progress) throw new Error(`No progress found for user ${userId} checklist ${checklistId}`);

  progress.itemStatuses[itemId] = status;

  const statuses = Object.values(progress.itemStatuses);
  progress.completedCount = statuses.filter(
    (s) => s === 'completed' || s === 'skipped',
  ).length;
  progress.totalCount = statuses.length;
  progress.percentComplete = progress.totalCount > 0
    ? Math.round((progress.completedCount / progress.totalCount) * 100)
    : 0;

  if (progress.percentComplete === 100) {
    progress.completedAt = new Date();
  }

  return progress;
}

export function dismissChecklist(userId: string, checklistId: string): ChecklistProgress {
  const key = `${userId}:${checklistId}`;
  const progress = progressStore.get(key);
  if (!progress) throw new Error(`No progress found for user ${userId} checklist ${checklistId}`);
  progress.dismissed = true;
  return progress;
}

export function getActivationMetrics(product?: string): {
  totalUsers: number;
  startedOnboarding: number;
  completedOnboarding: number;
  activationRate: number;
  averageCompletionPercent: number;
  dropoffByItem: Record<string, number>;
} {
  const progresses = Array.from(progressStore.values());
  const filtered = product
    ? progresses.filter((p) => {
        const cl = checklistStore.get(p.checklistId);
        return cl?.product === product;
      })
    : progresses;

  const total = filtered.length;
  const completed = filtered.filter((p) => p.completedAt).length;
  const avgPercent = total > 0
    ? filtered.reduce((sum, p) => sum + p.percentComplete, 0) / total
    : 0;

  return {
    totalUsers: total,
    startedOnboarding: total,
    completedOnboarding: completed,
    activationRate: total > 0 ? completed / total : 0,
    averageCompletionPercent: avgPercent,
    dropoffByItem: {},
  };
}

export interface DemoDataSeeder {
  seed(userId: string, product: string, dataType: string): Promise<number>;
}

export async function seedDemoData(
  userId: string,
  product: string,
  dataTypes: string[],
  seeder: DemoDataSeeder,
): Promise<{ type: string; count: number }[]> {
  const results: { type: string; count: number }[] = [];
  for (const dt of dataTypes) {
    const count = await seeder.seed(userId, product, dt);
    results.push({ type: dt, count });
  }
  return results;
}

export function clearChecklistStores(): void {
  checklistStore.clear();
  progressStore.clear();
}
