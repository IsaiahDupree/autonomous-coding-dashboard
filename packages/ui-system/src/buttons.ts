/**
 * UI-002: Button Component Specs
 *
 * Type definitions and Zod schemas for button variants, sizes, and states.
 * No actual React components -- just the specification layer.
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// Button Variant
// ---------------------------------------------------------------------------

export const ButtonVariants = ["primary", "secondary", "ghost", "danger"] as const;
export type ButtonVariant = (typeof ButtonVariants)[number];

export const ButtonVariantSchema = z.enum(ButtonVariants);

// ---------------------------------------------------------------------------
// Button Size
// ---------------------------------------------------------------------------

export const ButtonSizes = ["sm", "md", "lg"] as const;
export type ButtonSize = (typeof ButtonSizes)[number];

export const ButtonSizeSchema = z.enum(ButtonSizes);

// ---------------------------------------------------------------------------
// Button State
// ---------------------------------------------------------------------------

export const ButtonStates = [
  "default",
  "hover",
  "active",
  "disabled",
  "loading",
] as const;
export type ButtonState = (typeof ButtonStates)[number];

export const ButtonStateSchema = z.enum(ButtonStates);

// ---------------------------------------------------------------------------
// Size-specific dimension tokens
// ---------------------------------------------------------------------------

export const ButtonSizeTokens = {
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
} as const;

export type ButtonSizeTokens = typeof ButtonSizeTokens;

// ---------------------------------------------------------------------------
// Variant-specific style tokens (keyed by state)
// ---------------------------------------------------------------------------

export interface ButtonVariantStateStyle {
  background: string;
  color: string;
  border: string;
  opacity?: number;
  boxShadow?: string;
  cursor?: string;
}

export interface ButtonVariantTokens {
  default: ButtonVariantStateStyle;
  hover: ButtonVariantStateStyle;
  active: ButtonVariantStateStyle;
  disabled: ButtonVariantStateStyle;
  loading: ButtonVariantStateStyle;
}

export const ButtonVariantStyles: Record<ButtonVariant, ButtonVariantTokens> = {
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

export const ButtonPropsSchema = z.object({
  /** Visual variant */
  variant: ButtonVariantSchema.default("primary"),
  /** Size preset */
  size: ButtonSizeSchema.default("md"),
  /** Explicit state override (normally derived from interaction) */
  state: ButtonStateSchema.optional(),
  /** Disable the button */
  disabled: z.boolean().optional().default(false),
  /** Show loading spinner */
  loading: z.boolean().optional().default(false),
  /** Render as full-width block */
  fullWidth: z.boolean().optional().default(false),
  /** Leading icon identifier */
  iconLeft: z.string().optional(),
  /** Trailing icon identifier */
  iconRight: z.string().optional(),
  /** Accessible label when icon-only */
  ariaLabel: z.string().optional(),
  /** Button type attribute */
  type: z.enum(["button", "submit", "reset"]).default("button"),
}).strict();

export type ButtonProps = z.infer<typeof ButtonPropsSchema>;

// ---------------------------------------------------------------------------
// Icon-Only Button Props
// ---------------------------------------------------------------------------

export const IconButtonPropsSchema = ButtonPropsSchema.extend({
  icon: z.string(),
  ariaLabel: z.string(), // required for accessibility
}).omit({ iconLeft: true, iconRight: true });

export type IconButtonProps = z.infer<typeof IconButtonPropsSchema>;

// ---------------------------------------------------------------------------
// Button Group Props
// ---------------------------------------------------------------------------

export const ButtonGroupPropsSchema = z.object({
  /** Orientation of the group */
  direction: z.enum(["horizontal", "vertical"]).default("horizontal"),
  /** Gap between buttons (spacing token key) */
  gap: z.number().default(8),
  /** Align buttons */
  align: z.enum(["start", "center", "end", "stretch"]).default("start"),
}).strict();

export type ButtonGroupProps = z.infer<typeof ButtonGroupPropsSchema>;
