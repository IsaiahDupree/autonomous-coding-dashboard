/**
 * tenant-billing.ts - MT-004: Tenant Billing
 *
 * Per-tenant usage aggregation, separate invoicing.
 * Uses an in-memory store for state.
 */

import {
  UsageRecord,
  UsageRecordSchema,
  TenantInvoice,
  TenantInvoiceSchema,
  UsageAggregation,
  UsageAggregationSchema,
} from './types';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function nowISO(): string {
  return new Date().toISOString();
}

/** In-memory stores */
const usageRecords: Map<string, UsageRecord[]> = new Map(); // tenantId -> records
const invoices: Map<string, TenantInvoice[]> = new Map(); // tenantId -> invoices
let invoiceCounter = 1000;

/**
 * Record a usage event for a tenant.
 */
export function recordUsage(
  tenantId: string,
  metric: string,
  quantity: number,
  unitCostCents: number,
  periodStart: string,
  periodEnd: string
): UsageRecord {
  const now = nowISO();
  const record: UsageRecord = UsageRecordSchema.parse({
    id: generateUUID(),
    tenantId,
    metric,
    quantity,
    unitCostCents,
    totalCents: Math.round(quantity * unitCostCents),
    periodStart,
    periodEnd,
    createdAt: now,
    updatedAt: now,
  });

  const records = usageRecords.get(tenantId) || [];
  records.push(record);
  usageRecords.set(tenantId, records);

  return record;
}

/**
 * Get usage records for a tenant.
 */
export function getUsageRecords(
  tenantId: string,
  filters?: { metric?: string; since?: string; until?: string }
): UsageRecord[] {
  let records = usageRecords.get(tenantId) || [];

  if (filters?.metric) {
    records = records.filter((r) => r.metric === filters.metric);
  }
  if (filters?.since) {
    records = records.filter((r) => r.periodStart >= filters.since!);
  }
  if (filters?.until) {
    records = records.filter((r) => r.periodEnd <= filters.until!);
  }

  return records.sort((a, b) => new Date(b.periodStart).getTime() - new Date(a.periodStart).getTime());
}

/**
 * Aggregate usage for a tenant over a period.
 */
export function aggregateUsage(tenantId: string, period: string): UsageAggregation {
  const records = usageRecords.get(tenantId) || [];
  const periodRecords = records.filter(
    (r) => r.periodStart.startsWith(period) || r.periodEnd.startsWith(period)
  );

  const metrics: Record<string, { totalQuantity: number; totalCents: number }> = {};
  let totalCents = 0;

  for (const record of periodRecords) {
    if (!metrics[record.metric]) {
      metrics[record.metric] = { totalQuantity: 0, totalCents: 0 };
    }
    metrics[record.metric].totalQuantity += record.quantity;
    metrics[record.metric].totalCents += record.totalCents;
    totalCents += record.totalCents;
  }

  return UsageAggregationSchema.parse({
    tenantId,
    period,
    metrics,
    totalCents,
  });
}

/**
 * Generate an invoice for a tenant.
 */
export function generateInvoice(
  tenantId: string,
  periodStart: string,
  periodEnd: string,
  additionalLineItems?: Array<{ description: string; quantity: number; unitPriceCents: number }>
): TenantInvoice {
  const aggregation = aggregateUsage(tenantId, periodStart.slice(0, 7));
  const now = nowISO();

  // Build line items from usage
  const lineItems: Array<{ description: string; quantity: number; unitPriceCents: number; totalCents: number }> = [];

  for (const [metric, data] of Object.entries(aggregation.metrics)) {
    const unitPrice = data.totalQuantity > 0 ? Math.round(data.totalCents / data.totalQuantity) : 0;
    lineItems.push({
      description: `Usage: ${metric}`,
      quantity: data.totalQuantity,
      unitPriceCents: unitPrice,
      totalCents: data.totalCents,
    });
  }

  // Add any additional line items
  if (additionalLineItems) {
    for (const item of additionalLineItems) {
      lineItems.push({
        ...item,
        totalCents: Math.round(item.quantity * item.unitPriceCents),
      });
    }
  }

  const subtotalCents = lineItems.reduce((sum, item) => sum + item.totalCents, 0);
  const taxRate = 0; // Tax calculation would be handled by external service
  const taxCents = Math.round(subtotalCents * taxRate);
  const totalCents = subtotalCents + taxCents;

  // Calculate due date (30 days from now)
  const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  invoiceCounter++;
  const invoice: TenantInvoice = TenantInvoiceSchema.parse({
    id: generateUUID(),
    tenantId,
    invoiceNumber: `INV-${invoiceCounter}`,
    status: 'draft',
    subtotalCents,
    taxCents,
    totalCents,
    lineItems,
    periodStart,
    periodEnd,
    dueDate,
    createdAt: now,
    updatedAt: now,
  });

  const tenantInvoices = invoices.get(tenantId) || [];
  tenantInvoices.push(invoice);
  invoices.set(tenantId, tenantInvoices);

  return invoice;
}

/**
 * Get invoices for a tenant.
 */
export function getInvoices(
  tenantId: string,
  filters?: { status?: TenantInvoice['status']; limit?: number }
): TenantInvoice[] {
  let result = invoices.get(tenantId) || [];

  if (filters?.status) {
    result = result.filter((i) => i.status === filters.status);
  }

  result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (filters?.limit) {
    result = result.slice(0, filters.limit);
  }

  return result;
}

/**
 * Get a specific invoice by ID.
 */
export function getInvoiceById(tenantId: string, invoiceId: string): TenantInvoice | undefined {
  const tenantInvoices = invoices.get(tenantId) || [];
  return tenantInvoices.find((i) => i.id === invoiceId);
}

/**
 * Update invoice status.
 */
export function updateInvoiceStatus(
  tenantId: string,
  invoiceId: string,
  status: TenantInvoice['status']
): TenantInvoice {
  const tenantInvoices = invoices.get(tenantId) || [];
  const index = tenantInvoices.findIndex((i) => i.id === invoiceId);
  if (index === -1) {
    throw new Error(`Invoice not found: ${invoiceId}`);
  }

  const now = nowISO();
  const updated: TenantInvoice = TenantInvoiceSchema.parse({
    ...tenantInvoices[index],
    status,
    paidAt: status === 'paid' ? now : tenantInvoices[index].paidAt,
    updatedAt: now,
  });

  tenantInvoices[index] = updated;
  invoices.set(tenantId, tenantInvoices);
  return updated;
}

/**
 * Send an invoice (marks it as sent).
 */
export function sendInvoice(tenantId: string, invoiceId: string): TenantInvoice {
  return updateInvoiceStatus(tenantId, invoiceId, 'sent');
}

/**
 * Mark an invoice as paid.
 */
export function markInvoicePaid(tenantId: string, invoiceId: string): TenantInvoice {
  return updateInvoiceStatus(tenantId, invoiceId, 'paid');
}

/**
 * Void an invoice.
 */
export function voidInvoice(tenantId: string, invoiceId: string): TenantInvoice {
  return updateInvoiceStatus(tenantId, invoiceId, 'void');
}

/**
 * Get all outstanding (unpaid) invoices across all tenants.
 */
export function getAllOutstandingInvoices(): TenantInvoice[] {
  const result: TenantInvoice[] = [];
  for (const tenantInvoices of invoices.values()) {
    for (const invoice of tenantInvoices) {
      if (invoice.status === 'sent' || invoice.status === 'overdue') {
        result.push(invoice);
      }
    }
  }
  return result.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
}

/**
 * Clear the in-memory stores (for testing).
 */
export function clearTenantBillingStores(): void {
  usageRecords.clear();
  invoices.clear();
  invoiceCounter = 1000;
}
