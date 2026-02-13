// MOD-001: Content Moderation Queue
// MOD-004: Moderation Dashboard Stats

import type {
  ModerationItem,
  ModerationDecision,
  ModerationStatus,
  ModerationItemType,
  ModerationQueueStats,
  ModeratorPerformance,
  ModerationResolutionRates,
  FilterSeverity,
} from './types';

const itemStore = new Map<string, ModerationItem>();
const decisionStore = new Map<string, ModerationDecision[]>();

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export interface SubmitContentInput {
  type: ModerationItemType;
  content: string;
  contentUrl?: string;
  authorId: string;
  priority?: number;
  metadata?: Record<string, unknown>;
}

export function submitForModeration(input: SubmitContentInput): ModerationItem {
  const item: ModerationItem = {
    id: generateId(),
    type: input.type,
    content: input.content,
    contentUrl: input.contentUrl,
    authorId: input.authorId,
    status: 'pending',
    priority: input.priority ?? 5,
    createdAt: new Date(),
    metadata: input.metadata,
  };
  itemStore.set(item.id, item);
  return item;
}

export function getItemById(id: string): ModerationItem | undefined {
  return itemStore.get(id);
}

export function listPendingItems(limit: number = 50, offset: number = 0): ModerationItem[] {
  return Array.from(itemStore.values())
    .filter((i) => i.status === 'pending')
    .sort((a, b) => b.priority - a.priority || a.createdAt.getTime() - b.createdAt.getTime())
    .slice(offset, offset + limit);
}

export function assignToModerator(itemId: string, moderatorId: string): ModerationItem {
  const item = itemStore.get(itemId);
  if (!item) throw new Error(`Item ${itemId} not found`);
  item.assignedModeratorId = moderatorId;
  item.status = 'in_review';
  return item;
}

export function recordDecision(input: {
  itemId: string;
  moderatorId: string;
  status: ModerationStatus;
  reason?: string;
  actionsTaken: ModerationDecision['actionsTaken'];
}): ModerationDecision {
  const item = itemStore.get(input.itemId);
  if (!item) throw new Error(`Item ${input.itemId} not found`);

  const decision: ModerationDecision = {
    itemId: input.itemId,
    moderatorId: input.moderatorId,
    status: input.status,
    reason: input.reason,
    actionsTaken: input.actionsTaken,
    decidedAt: new Date(),
  };

  item.status = input.status;
  item.reviewedAt = decision.decidedAt;
  item.reviewNotes = input.reason;

  const existing = decisionStore.get(input.itemId) ?? [];
  existing.push(decision);
  decisionStore.set(input.itemId, existing);

  return decision;
}

export function escalateItem(itemId: string, reason: string): ModerationItem {
  const item = itemStore.get(itemId);
  if (!item) throw new Error(`Item ${itemId} not found`);
  item.status = 'escalated';
  item.reviewNotes = reason;
  return item;
}

export function getQueueStats(): ModerationQueueStats {
  const items = Array.from(itemStore.values());
  const now = Date.now();
  const pending = items.filter((i) => i.status === 'pending');
  const inReview = items.filter((i) => i.status === 'in_review');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const resolvedToday = items.filter(
    (i) => i.reviewedAt && i.reviewedAt >= today && !['pending', 'in_review'].includes(i.status),
  );

  const byType: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};
  for (const i of pending) {
    byType[i.type] = (byType[i.type] ?? 0) + 1;
  }

  let oldestAge = 0;
  for (const p of pending) {
    const age = now - p.createdAt.getTime();
    if (age > oldestAge) oldestAge = age;
  }

  let totalResTime = 0;
  let resCount = 0;
  for (const i of items) {
    if (i.reviewedAt) {
      totalResTime += i.reviewedAt.getTime() - i.createdAt.getTime();
      resCount++;
    }
  }

  return {
    totalPending: pending.length,
    totalInReview: inReview.length,
    totalResolvedToday: resolvedToday.length,
    averageResolutionTimeMs: resCount > 0 ? totalResTime / resCount : 0,
    oldestPendingAge: oldestAge,
    byType: byType as Record<ModerationItemType, number>,
    bySeverity: bySeverity as Record<FilterSeverity, number>,
  };
}

export function getModeratorPerformance(
  moderatorId: string,
  start: Date,
  end: Date,
): ModeratorPerformance {
  const decisions = Array.from(decisionStore.values())
    .flat()
    .filter((d) => d.moderatorId === moderatorId && d.decidedAt >= start && d.decidedAt <= end);

  const total = decisions.length;
  const approved = decisions.filter((d) => d.status === 'approved' || d.status === 'auto_approved').length;
  const rejected = decisions.filter((d) => d.status === 'rejected' || d.status === 'auto_rejected').length;
  const escalated = decisions.filter((d) => d.status === 'escalated').length;

  return {
    moderatorId,
    period: { start, end },
    totalReviewed: total,
    averageReviewTimeMs: 0,
    approvalRate: total > 0 ? approved / total : 0,
    rejectionRate: total > 0 ? rejected / total : 0,
    escalationRate: total > 0 ? escalated / total : 0,
    overturnedDecisions: 0,
  };
}

export function getResolutionRates(start: Date, end: Date): ModerationResolutionRates {
  const items = Array.from(itemStore.values())
    .filter((i) => i.createdAt >= start && i.createdAt <= end);
  const resolved = items.filter((i) => i.reviewedAt);

  return {
    period: { start, end },
    totalItems: items.length,
    resolvedCount: resolved.length,
    resolutionRate: items.length > 0 ? resolved.length / items.length : 0,
    byAction: {},
    byType: {},
    averageTimeToResolutionMs: 0,
  };
}

export function clearModerationStores(): void {
  itemStore.clear();
  decisionStore.clear();
}
