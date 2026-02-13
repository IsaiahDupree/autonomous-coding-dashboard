/**
 * Payment Method Management (BILL-004)
 * Card/bank types, default selection, validation.
 */
import { PaymentMethod, PaymentMethodType } from './types';
export interface AddPaymentMethodInput {
    customerId: string;
    type: PaymentMethodType;
    isDefault?: boolean;
    cardBrand?: string;
    cardLast4?: string;
    cardExpMonth?: number;
    cardExpYear?: number;
    bankName?: string;
    bankLast4?: string;
    bankAccountType?: 'checking' | 'savings';
    billingName?: string;
    billingEmail?: string;
}
export interface PaymentMethodValidationResult {
    valid: boolean;
    errors: string[];
}
/**
 * In-memory payment method management service.
 * Manages card and bank account payment methods per customer.
 */
export declare class PaymentService {
    /** customerId -> PaymentMethod[] */
    private methods;
    /** Add a new payment method for a customer */
    addPaymentMethod(input: AddPaymentMethodInput): PaymentMethod;
    /** Get all payment methods for a customer */
    getPaymentMethods(customerId: string): PaymentMethod[];
    /** Get a specific payment method by ID */
    getPaymentMethod(customerId: string, methodId: string): PaymentMethod | undefined;
    /** Get the default payment method for a customer */
    getDefaultPaymentMethod(customerId: string): PaymentMethod | undefined;
    /** Set a payment method as the default */
    setDefaultPaymentMethod(customerId: string, methodId: string): PaymentMethod;
    /** Remove a payment method */
    removePaymentMethod(customerId: string, methodId: string): boolean;
    /** Validate a payment method input */
    validatePaymentMethod(input: AddPaymentMethodInput): PaymentMethodValidationResult;
    /** Check if a card is expired */
    isCardExpired(method: PaymentMethod): boolean;
    /** Clear all payment methods for a customer */
    clearCustomerData(customerId: string): void;
    private clearDefault;
}
//# sourceMappingURL=payments.d.ts.map