/**
 * Billing (BILL-002, BILL-003)
 * - BILL-002: Usage-based billing calculation (pricing tiers, overage charges, proration)
 * - BILL-003: Invoice generation (line items from usage, tax, discounts, PDF-ready data)
 */

import {
  Discount,
  Invoice,
  InvoiceLineItem,
  PricingPlan,
  PricingPlanSchema,
  PricingTier,
  UsageMetric,
} from './types';
import { MeteringService } from './metering';

// ─── BILL-002: Usage-Based Billing Calculation ───────────────────────────────

export interface BillingCalculationResult {
  metric: UsageMetric;
  included: number;
  used: number;
  overage: number;
  tierBreakdown: Array<{
    tierIndex: number;
    unitsInTier: number;
    unitPriceCents: number;
    flatFeeCents: number;
    totalCents: number;
  }>;
  totalCents: number;
}

/**
 * Calculate billing for a usage metric given a set of pricing tiers.
 * Tiers are applied in order; each tier defines:
 *   - upTo: max units covered by this tier (null = unlimited)
 *   - unitPrice: price per unit in cents
 *   - flatFee: flat fee added once for any usage in this tier
 */
export function calculateTieredUsage(
  used: number,
  included: number,
  tiers: PricingTier[],
  overageEnabled: boolean,
): BillingCalculationResult['tierBreakdown'] {
  const overage = Math.max(0, used - included);
  if (overage <= 0 || !overageEnabled) return [];

  const breakdown: BillingCalculationResult['tierBreakdown'] = [];
  let remaining = overage;
  let previousTierMax = 0;

  for (let i = 0; i < tiers.length && remaining > 0; i++) {
    const tier = tiers[i];
    const tierCapacity = tier.upTo !== null
      ? tier.upTo - previousTierMax
      : Infinity;

    const unitsInTier = Math.min(remaining, tierCapacity);
    const totalCents = Math.round(unitsInTier * tier.unitPrice + (unitsInTier > 0 ? tier.flatFee : 0));

    breakdown.push({
      tierIndex: i,
      unitsInTier,
      unitPriceCents: tier.unitPrice,
      flatFeeCents: tier.flatFee,
      totalCents,
    });

    remaining -= unitsInTier;
    previousTierMax = tier.upTo ?? Infinity;
  }

  return breakdown;
}

/**
 * Calculate the total billing for a customer's usage of a specific metric.
 */
export function calculateMetricBilling(
  metric: UsageMetric,
  used: number,
  planMetricConfig: { included: number; tiers: PricingTier[]; overageEnabled: boolean },
): BillingCalculationResult {
  const overage = Math.max(0, used - planMetricConfig.included);
  const tierBreakdown = calculateTieredUsage(
    used,
    planMetricConfig.included,
    planMetricConfig.tiers,
    planMetricConfig.overageEnabled,
  );
  const totalCents = tierBreakdown.reduce((sum, t) => sum + t.totalCents, 0);

  return {
    metric,
    included: planMetricConfig.included,
    used,
    overage,
    tierBreakdown,
    totalCents,
  };
}

/**
 * Prorate a charge based on how many days remain in the billing period.
 */
export function prorateCharge(
  fullAmountCents: number,
  periodStartMs: number,
  periodEndMs: number,
  effectiveDateMs: number,
): number {
  const totalDays = (periodEndMs - periodStartMs) / (1000 * 60 * 60 * 24);
  const remainingDays = (periodEndMs - effectiveDateMs) / (1000 * 60 * 60 * 24);

  if (totalDays <= 0) return 0;
  const ratio = Math.max(0, Math.min(1, remainingDays / totalDays));
  return Math.round(fullAmountCents * ratio);
}

// ─── BILL-003: Invoice Generation ────────────────────────────────────────────

export interface InvoiceGenerationInput {
  customerId: string;
  planId: string;
  periodStart: number;
  periodEnd: number;
  taxRate?: number;
  discounts?: Discount[];
  dueDate?: number;
}

let invoiceIdCounter = 0;

/**
 * Billing service that integrates metering data with pricing plans
 * to generate invoices.
 */
export class BillingService {
  private plans: Map<string, PricingPlan> = new Map();
  private invoices: Map<string, Invoice> = new Map();

  constructor(private meteringService: MeteringService) {}

  /** Register a pricing plan */
  registerPlan(input: Omit<PricingPlan, never>): PricingPlan {
    const plan = PricingPlanSchema.parse(input);
    this.plans.set(plan.id, plan);
    return plan;
  }

  /** Get a pricing plan by ID */
  getPlan(planId: string): PricingPlan | undefined {
    return this.plans.get(planId);
  }

  /** Get all pricing plans */
  getAllPlans(): PricingPlan[] {
    return Array.from(this.plans.values());
  }

  /**
   * Generate an invoice for a customer based on their usage and pricing plan.
   * Creates line items from usage data, applies discounts and tax.
   */
  generateInvoice(input: InvoiceGenerationInput): Invoice {
    const plan = this.plans.get(input.planId);
    if (!plan) {
      throw new Error(`Plan "${input.planId}" not found`);
    }

    const lineItems: InvoiceLineItem[] = [];

    // Base subscription charge
    lineItems.push({
      description: `${plan.name} - Base subscription`,
      quantity: 1,
      unitPriceCents: plan.basePriceCents,
      totalCents: plan.basePriceCents,
    });

    // Usage-based charges for each metric
    if (plan.metrics) {
      const metricKeys = Object.keys(plan.metrics) as UsageMetric[];
      for (const metric of metricKeys) {
        const metricConfig = plan.metrics[metric];
        if (!metricConfig) continue;

        const summary = this.meteringService.getSummary(
          input.customerId,
          metric,
          input.periodStart,
          input.periodEnd,
        );

        const billing = calculateMetricBilling(metric, summary.totalQuantity, metricConfig);

        if (billing.overage > 0 && billing.totalCents > 0) {
          lineItems.push({
            description: `${metric} overage (${billing.used} used, ${billing.included} included)`,
            metric,
            quantity: billing.overage,
            unitPriceCents: billing.totalCents > 0 ? Math.round(billing.totalCents / billing.overage) : 0,
            totalCents: billing.totalCents,
          });
        }
      }
    }

    // Calculate subtotal
    const subtotalCents = lineItems.reduce((sum, item) => sum + item.totalCents, 0);

    // Apply discounts
    const discounts = input.discounts ?? [];
    let discountAmountCents = 0;
    for (const discount of discounts) {
      if (discount.type === 'percentage') {
        discountAmountCents += Math.round(subtotalCents * (discount.value / 100));
      } else {
        discountAmountCents += discount.value;
      }
    }
    discountAmountCents = Math.min(discountAmountCents, subtotalCents);

    // Calculate tax
    const taxRate = input.taxRate ?? 0;
    const taxableAmount = subtotalCents - discountAmountCents;
    const taxAmountCents = Math.round(taxableAmount * taxRate);

    // Total
    const totalCents = taxableAmount + taxAmountCents;

    invoiceIdCounter++;
    const invoice: Invoice = {
      id: `inv_${invoiceIdCounter}`,
      customerId: input.customerId,
      planId: input.planId,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      lineItems,
      subtotalCents,
      discounts,
      discountAmountCents,
      taxRate,
      taxAmountCents,
      totalCents,
      status: 'draft',
      dueDate: input.dueDate,
      createdAt: Date.now(),
    };

    this.invoices.set(invoice.id, invoice);
    return invoice;
  }

  /** Get an invoice by ID */
  getInvoice(invoiceId: string): Invoice | undefined {
    return this.invoices.get(invoiceId);
  }

  /** Get all invoices for a customer */
  getCustomerInvoices(customerId: string): Invoice[] {
    return Array.from(this.invoices.values()).filter(i => i.customerId === customerId);
  }

  /** Update invoice status */
  updateInvoiceStatus(invoiceId: string, status: Invoice['status']): Invoice {
    const invoice = this.invoices.get(invoiceId);
    if (!invoice) {
      throw new Error(`Invoice "${invoiceId}" not found`);
    }

    invoice.status = status;
    if (status === 'issued') {
      invoice.issuedAt = Date.now();
    } else if (status === 'paid') {
      invoice.paidAt = Date.now();
    }

    this.invoices.set(invoiceId, invoice);
    return invoice;
  }

  /** Get PDF-ready invoice data (structured for rendering) */
  getInvoicePDFData(invoiceId: string): {
    invoice: Invoice;
    formattedLineItems: Array<{
      description: string;
      quantity: string;
      unitPrice: string;
      total: string;
    }>;
    formattedSubtotal: string;
    formattedDiscount: string;
    formattedTax: string;
    formattedTotal: string;
  } | undefined {
    const invoice = this.invoices.get(invoiceId);
    if (!invoice) return undefined;

    const formatCents = (cents: number): string => {
      const dollars = (cents / 100).toFixed(2);
      return `$${dollars}`;
    };

    return {
      invoice,
      formattedLineItems: invoice.lineItems.map(item => ({
        description: item.description,
        quantity: item.quantity.toString(),
        unitPrice: formatCents(item.unitPriceCents),
        total: formatCents(item.totalCents),
      })),
      formattedSubtotal: formatCents(invoice.subtotalCents),
      formattedDiscount: invoice.discountAmountCents > 0
        ? `-${formatCents(invoice.discountAmountCents)}`
        : '$0.00',
      formattedTax: formatCents(invoice.taxAmountCents),
      formattedTotal: formatCents(invoice.totalCents),
    };
  }
}
