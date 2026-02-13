"use strict";
/**
 * Payment Method Management (BILL-004)
 * Card/bank types, default selection, validation.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentService = void 0;
const types_1 = require("./types");
let paymentMethodIdCounter = 0;
/**
 * In-memory payment method management service.
 * Manages card and bank account payment methods per customer.
 */
class PaymentService {
    constructor() {
        /** customerId -> PaymentMethod[] */
        this.methods = new Map();
    }
    /** Add a new payment method for a customer */
    addPaymentMethod(input) {
        // Validate before adding
        const validation = this.validatePaymentMethod(input);
        if (!validation.valid) {
            throw new Error(`Invalid payment method: ${validation.errors.join(', ')}`);
        }
        paymentMethodIdCounter++;
        const now = Date.now();
        const method = types_1.PaymentMethodSchema.parse({
            id: `pm_${paymentMethodIdCounter}`,
            customerId: input.customerId,
            type: input.type,
            isDefault: input.isDefault ?? false,
            cardBrand: input.cardBrand,
            cardLast4: input.cardLast4,
            cardExpMonth: input.cardExpMonth,
            cardExpYear: input.cardExpYear,
            bankName: input.bankName,
            bankLast4: input.bankLast4,
            bankAccountType: input.bankAccountType,
            billingName: input.billingName,
            billingEmail: input.billingEmail,
            createdAt: now,
            updatedAt: now,
        });
        if (!this.methods.has(input.customerId)) {
            this.methods.set(input.customerId, []);
        }
        const customerMethods = this.methods.get(input.customerId);
        // If this is the first method or is marked as default, set it as default
        if (customerMethods.length === 0 || method.isDefault) {
            this.clearDefault(input.customerId);
            method.isDefault = true;
        }
        customerMethods.push(method);
        return method;
    }
    /** Get all payment methods for a customer */
    getPaymentMethods(customerId) {
        return this.methods.get(customerId) ?? [];
    }
    /** Get a specific payment method by ID */
    getPaymentMethod(customerId, methodId) {
        const methods = this.methods.get(customerId) ?? [];
        return methods.find(m => m.id === methodId);
    }
    /** Get the default payment method for a customer */
    getDefaultPaymentMethod(customerId) {
        const methods = this.methods.get(customerId) ?? [];
        return methods.find(m => m.isDefault);
    }
    /** Set a payment method as the default */
    setDefaultPaymentMethod(customerId, methodId) {
        const methods = this.methods.get(customerId) ?? [];
        const method = methods.find(m => m.id === methodId);
        if (!method) {
            throw new Error(`Payment method "${methodId}" not found for customer "${customerId}"`);
        }
        this.clearDefault(customerId);
        method.isDefault = true;
        method.updatedAt = Date.now();
        return method;
    }
    /** Remove a payment method */
    removePaymentMethod(customerId, methodId) {
        const methods = this.methods.get(customerId);
        if (!methods)
            return false;
        const index = methods.findIndex(m => m.id === methodId);
        if (index === -1)
            return false;
        const removed = methods[index];
        methods.splice(index, 1);
        // If we removed the default, set the first remaining method as default
        if (removed.isDefault && methods.length > 0) {
            methods[0].isDefault = true;
            methods[0].updatedAt = Date.now();
        }
        return true;
    }
    /** Validate a payment method input */
    validatePaymentMethod(input) {
        const errors = [];
        if (!input.customerId) {
            errors.push('Customer ID is required');
        }
        if (input.type === 'card') {
            if (!input.cardLast4 || input.cardLast4.length !== 4) {
                errors.push('Card last 4 digits are required and must be exactly 4 digits');
            }
            if (!input.cardBrand) {
                errors.push('Card brand is required');
            }
            if (!input.cardExpMonth || input.cardExpMonth < 1 || input.cardExpMonth > 12) {
                errors.push('Valid card expiration month (1-12) is required');
            }
            if (!input.cardExpYear || input.cardExpYear < 2020) {
                errors.push('Valid card expiration year is required');
            }
            // Check if card is expired
            if (input.cardExpYear && input.cardExpMonth) {
                const now = new Date();
                const expDate = new Date(input.cardExpYear, input.cardExpMonth - 1);
                if (expDate < now) {
                    errors.push('Card is expired');
                }
            }
        }
        else if (input.type === 'bank_account') {
            if (!input.bankLast4 || input.bankLast4.length !== 4) {
                errors.push('Bank account last 4 digits are required and must be exactly 4 digits');
            }
            if (!input.bankName) {
                errors.push('Bank name is required');
            }
            if (!input.bankAccountType) {
                errors.push('Bank account type (checking/savings) is required');
            }
        }
        if (input.billingEmail) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(input.billingEmail)) {
                errors.push('Invalid billing email format');
            }
        }
        return {
            valid: errors.length === 0,
            errors,
        };
    }
    /** Check if a card is expired */
    isCardExpired(method) {
        if (method.type !== 'card')
            return false;
        if (!method.cardExpYear || !method.cardExpMonth)
            return true;
        const now = new Date();
        const expDate = new Date(method.cardExpYear, method.cardExpMonth - 1);
        return expDate < now;
    }
    /** Clear all payment methods for a customer */
    clearCustomerData(customerId) {
        this.methods.delete(customerId);
    }
    clearDefault(customerId) {
        const methods = this.methods.get(customerId) ?? [];
        for (const method of methods) {
            if (method.isDefault) {
                method.isDefault = false;
                method.updatedAt = Date.now();
            }
        }
    }
}
exports.PaymentService = PaymentService;
//# sourceMappingURL=payments.js.map