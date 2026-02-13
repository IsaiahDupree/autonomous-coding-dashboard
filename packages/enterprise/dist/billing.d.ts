/**
 * Billing (BILL-002, BILL-003)
 * - BILL-002: Usage-based billing calculation (pricing tiers, overage charges, proration)
 * - BILL-003: Invoice generation (line items from usage, tax, discounts, PDF-ready data)
 */
import { Discount, Invoice, PricingPlan, PricingTier, UsageMetric } from './types';
import { MeteringService } from './metering';
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
export declare function calculateTieredUsage(used: number, included: number, tiers: PricingTier[], overageEnabled: boolean): BillingCalculationResult['tierBreakdown'];
/**
 * Calculate the total billing for a customer's usage of a specific metric.
 */
export declare function calculateMetricBilling(metric: UsageMetric, used: number, planMetricConfig: {
    included: number;
    tiers: PricingTier[];
    overageEnabled: boolean;
}): BillingCalculationResult;
/**
 * Prorate a charge based on how many days remain in the billing period.
 */
export declare function prorateCharge(fullAmountCents: number, periodStartMs: number, periodEndMs: number, effectiveDateMs: number): number;
export interface InvoiceGenerationInput {
    customerId: string;
    planId: string;
    periodStart: number;
    periodEnd: number;
    taxRate?: number;
    discounts?: Discount[];
    dueDate?: number;
}
/**
 * Billing service that integrates metering data with pricing plans
 * to generate invoices.
 */
export declare class BillingService {
    private meteringService;
    private plans;
    private invoices;
    constructor(meteringService: MeteringService);
    /** Register a pricing plan */
    registerPlan(input: Omit<PricingPlan, never>): PricingPlan;
    /** Get a pricing plan by ID */
    getPlan(planId: string): PricingPlan | undefined;
    /** Get all pricing plans */
    getAllPlans(): PricingPlan[];
    /**
     * Generate an invoice for a customer based on their usage and pricing plan.
     * Creates line items from usage data, applies discounts and tax.
     */
    generateInvoice(input: InvoiceGenerationInput): Invoice;
    /** Get an invoice by ID */
    getInvoice(invoiceId: string): Invoice | undefined;
    /** Get all invoices for a customer */
    getCustomerInvoices(customerId: string): Invoice[];
    /** Update invoice status */
    updateInvoiceStatus(invoiceId: string, status: Invoice['status']): Invoice;
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
    } | undefined;
}
//# sourceMappingURL=billing.d.ts.map