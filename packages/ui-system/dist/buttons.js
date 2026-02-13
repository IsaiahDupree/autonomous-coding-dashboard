"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ButtonGroupPropsSchema = exports.IconButtonPropsSchema = exports.ButtonPropsSchema = exports.ButtonVariantStyles = exports.ButtonSizeTokens = exports.ButtonStateSchema = exports.ButtonStates = exports.ButtonSizeSchema = exports.ButtonSizes = exports.ButtonVariantSchema = exports.ButtonVariants = void 0;
/**
 * UI-002: Button Component Specs
 *
 * Type definitions and Zod schemas for button variants, sizes, and states.
 * No actual React components -- just the specification layer.
 */
const zod_1 = require("zod");
// ---------------------------------------------------------------------------
// Button Variant
// ---------------------------------------------------------------------------
exports.ButtonVariants = ["primary", "secondary", "ghost", "danger"];
exports.ButtonVariantSchema = zod_1.z.enum(exports.ButtonVariants);
// ---------------------------------------------------------------------------
// Button Size
// ---------------------------------------------------------------------------
exports.ButtonSizes = ["sm", "md", "lg"];
exports.ButtonSizeSchema = zod_1.z.enum(exports.ButtonSizes);
// ---------------------------------------------------------------------------
// Button State
// ---------------------------------------------------------------------------
exports.ButtonStates = [
    "default",
    "hover",
    "active",
    "disabled",
    "loading",
];
exports.ButtonStateSchema = zod_1.z.enum(exports.ButtonStates);
// ---------------------------------------------------------------------------
// Size-specific dimension tokens
// ---------------------------------------------------------------------------
exports.ButtonSizeTokens = {
    sm: {
        height: 32,
        paddingX: 12,
        paddingY: 6,
        fontSize: "0.875rem",
        iconSize: 16,
        gap: 6,
        borderRadius: "4px",
    },
    md: {
        height: 40,
        paddingX: 16,
        paddingY: 8,
        fontSize: "0.875rem",
        iconSize: 18,
        gap: 8,
        borderRadius: "6px",
    },
    lg: {
        height: 48,
        paddingX: 24,
        paddingY: 12,
        fontSize: "1rem",
        iconSize: 20,
        gap: 8,
        borderRadius: "8px",
    },
};
exports.ButtonVariantStyles = {
    primary: {
        default: { background: "#4F46E5", color: "#FFFFFF", border: "none" },
        hover: { background: "#4338CA", color: "#FFFFFF", border: "none" },
        active: { background: "#3730A3", color: "#FFFFFF", border: "none" },
        disabled: { background: "#4F46E5", color: "#FFFFFF", border: "none", opacity: 0.5, cursor: "not-allowed" },
        loading: { background: "#4F46E5", color: "#FFFFFF", border: "none", opacity: 0.8, cursor: "wait" },
    },
    secondary: {
        default: { background: "#FFFFFF", color: "#374151", border: "1px solid #D1D5DB" },
        hover: { background: "#F9FAFB", color: "#1F2937", border: "1px solid #9CA3AF" },
        active: { background: "#F3F4F6", color: "#1F2937", border: "1px solid #9CA3AF" },
        disabled: { background: "#FFFFFF", color: "#374151", border: "1px solid #D1D5DB", opacity: 0.5, cursor: "not-allowed" },
        loading: { background: "#FFFFFF", color: "#374151", border: "1px solid #D1D5DB", opacity: 0.8, cursor: "wait" },
    },
    ghost: {
        default: { background: "transparent", color: "#374151", border: "none" },
        hover: { background: "#F3F4F6", color: "#1F2937", border: "none" },
        active: { background: "#E5E7EB", color: "#1F2937", border: "none" },
        disabled: { background: "transparent", color: "#374151", border: "none", opacity: 0.5, cursor: "not-allowed" },
        loading: { background: "transparent", color: "#374151", border: "none", opacity: 0.8, cursor: "wait" },
    },
    danger: {
        default: { background: "#DC2626", color: "#FFFFFF", border: "none" },
        hover: { background: "#B91C1C", color: "#FFFFFF", border: "none" },
        active: { background: "#991B1B", color: "#FFFFFF", border: "none" },
        disabled: { background: "#DC2626", color: "#FFFFFF", border: "none", opacity: 0.5, cursor: "not-allowed" },
        loading: { background: "#DC2626", color: "#FFFFFF", border: "none", opacity: 0.8, cursor: "wait" },
    },
};
// ---------------------------------------------------------------------------
// Button Props Schema
// ---------------------------------------------------------------------------
exports.ButtonPropsSchema = zod_1.z.object({
    /** Visual variant */
    variant: exports.ButtonVariantSchema.default("primary"),
    /** Size preset */
    size: exports.ButtonSizeSchema.default("md"),
    /** Explicit state override (normally derived from interaction) */
    state: exports.ButtonStateSchema.optional(),
    /** Disable the button */
    disabled: zod_1.z.boolean().optional().default(false),
    /** Show loading spinner */
    loading: zod_1.z.boolean().optional().default(false),
    /** Render as full-width block */
    fullWidth: zod_1.z.boolean().optional().default(false),
    /** Leading icon identifier */
    iconLeft: zod_1.z.string().optional(),
    /** Trailing icon identifier */
    iconRight: zod_1.z.string().optional(),
    /** Accessible label when icon-only */
    ariaLabel: zod_1.z.string().optional(),
    /** Button type attribute */
    type: zod_1.z.enum(["button", "submit", "reset"]).default("button"),
}).strict();
// ---------------------------------------------------------------------------
// Icon-Only Button Props
// ---------------------------------------------------------------------------
exports.IconButtonPropsSchema = exports.ButtonPropsSchema.extend({
    icon: zod_1.z.string(),
    ariaLabel: zod_1.z.string(), // required for accessibility
}).omit({ iconLeft: true, iconRight: true });
// ---------------------------------------------------------------------------
// Button Group Props
// ---------------------------------------------------------------------------
exports.ButtonGroupPropsSchema = zod_1.z.object({
    /** Orientation of the group */
    direction: zod_1.z.enum(["horizontal", "vertical"]).default("horizontal"),
    /** Gap between buttons (spacing token key) */
    gap: zod_1.z.number().default(8),
    /** Align buttons */
    align: zod_1.z.enum(["start", "center", "end", "stretch"]).default("start"),
}).strict();
//# sourceMappingURL=buttons.js.map