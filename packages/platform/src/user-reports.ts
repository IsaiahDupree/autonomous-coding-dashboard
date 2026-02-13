// MOD-003: User Reporting System

import type {
  UserReport,
  ReportType,
  ReportStatus,
  ResolutionAction,
  ModerationItemType,
} from './types';

const reportStore = new Map<string, UserReport>();

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export interface SubmitReportInput {
  reporterUserId: string;
  reportedUserId?: string;
  reportedContentId?: string;
  reportedContentType?: ModerationItemType;
  type: ReportType;
  description?: string;
  evidence?: string[];
}

export function submitReport(input: SubmitReportInput): UserReport {
  const now = new Date();
  const report: UserReport = {
    id: generateId(),
    reporterUserId: input.reporterUserId,
    reportedUserId: input.reportedUserId,
    reportedContentId: input.reportedContentId,
    reportedContentType: input.reportedContentType,
    type: input.type,
    description: input.description,
    evidence: input.evidence,
    status: 'submitted',
    createdAt: now,
    updatedAt: now,
  };
  reportStore.set(report.id, report);
  return report;
}

export function getReportById(id: string): UserReport | undefined {
  return reportStore.get(id);
}

export function listReports(filters?: {
  status?: ReportStatus;
  type?: ReportType;
  reportedUserId?: string;
  limit?: number;
  offset?: number;
}): UserReport[] {
  let reports = Array.from(reportStore.values());

  if (filters?.status) reports = reports.filter((r) => r.status === filters.status);
  if (filters?.type) reports = reports.filter((r) => r.type === filters.type);
  if (filters?.reportedUserId) reports = reports.filter((r) => r.reportedUserId === filters.reportedUserId);

  reports.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const offset = filters?.offset ?? 0;
  const limit = filters?.limit ?? 50;
  return reports.slice(offset, offset + limit);
}

export function assignReportToModerator(reportId: string, moderatorId: string): UserReport {
  const report = reportStore.get(reportId);
  if (!report) throw new Error(`Report ${reportId} not found`);
  report.assignedModeratorId = moderatorId;
  report.status = 'under_review';
  report.updatedAt = new Date();
  return report;
}

export function resolveReport(
  reportId: string,
  resolvedBy: string,
  action: ResolutionAction,
  notes?: string,
): UserReport {
  const report = reportStore.get(reportId);
  if (!report) throw new Error(`Report ${reportId} not found`);
  report.status = 'resolved';
  report.resolution = {
    action,
    notes,
    resolvedBy,
    resolvedAt: new Date(),
  };
  report.updatedAt = new Date();
  return report;
}

export function dismissReport(reportId: string, dismissedBy: string, reason?: string): UserReport {
  const report = reportStore.get(reportId);
  if (!report) throw new Error(`Report ${reportId} not found`);
  report.status = 'dismissed';
  report.resolution = {
    action: 'no_violation',
    notes: reason,
    resolvedBy: dismissedBy,
    resolvedAt: new Date(),
  };
  report.updatedAt = new Date();
  return report;
}

export function escalateReport(reportId: string): UserReport {
  const report = reportStore.get(reportId);
  if (!report) throw new Error(`Report ${reportId} not found`);
  report.status = 'escalated';
  report.updatedAt = new Date();
  return report;
}

export function getReportsByUser(reporterUserId: string): UserReport[] {
  return Array.from(reportStore.values())
    .filter((r) => r.reporterUserId === reporterUserId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function getReportsAgainstUser(userId: string): UserReport[] {
  return Array.from(reportStore.values())
    .filter((r) => r.reportedUserId === userId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function clearReportStore(): void {
  reportStore.clear();
}
