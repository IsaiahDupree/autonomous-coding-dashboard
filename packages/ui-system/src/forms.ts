/**
 * UI-003: Form Component Specs
 *
 * Type definitions and Zod schemas for form inputs, validation states,
 * labels, helper text, and error text.
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// Input Types
// ---------------------------------------------------------------------------

export const InputTypes = [
  "text",
  "email",
  "password",
  "number",
  "textarea",
  "select",
] as const;
export type InputType = (typeof InputTypes)[number];

export const InputTypeSchema = z.enum(InputTypes);

// ---------------------------------------------------------------------------
// Validation State
// ---------------------------------------------------------------------------

export const ValidationStates = ["idle", "valid", "invalid", "warning"] as const;
export type ValidationState = (typeof ValidationStates)[number];

export const ValidationStateSchema = z.enum(ValidationStates);

// ---------------------------------------------------------------------------
// Input Sizes
// ---------------------------------------------------------------------------

export const InputSizes = ["sm", "md", "lg"] as const;
export type InputSize = (typeof InputSizes)[number];

export const InputSizeSchema = z.enum(InputSizes);

export const InputSizeTokens = {
  sm: {
    height: 32,
    paddingX: 10,
    paddingY: 6,
    fontSize: "0.875rem",
    borderRadius: "4px",
    labelFontSize: "0.75rem",
  },
  md: {
    height: 40,
    paddingX: 12,
    paddingY: 8,
    fontSize: "0.875rem",
    borderRadius: "6px",
    labelFontSize: "0.875rem",
  },
  lg: {
    height: 48,
    paddingX: 16,
    paddingY: 12,
    fontSize: "1rem",
    borderRadius: "8px",
    labelFontSize: "1rem",
  },
} as const;

export type InputSizeTokens = typeof InputSizeTokens;

// ---------------------------------------------------------------------------
// Validation state style tokens
// ---------------------------------------------------------------------------

export interface ValidationStateStyle {
  borderColor: string;
  focusRingColor: string;
  iconColor: string;
  textColor: string;
}

export const ValidationStateStyles: Record<ValidationState, ValidationStateStyle> = {
  idle: {
    borderColor: "#D1D5DB",
    focusRingColor: "#6366F1",
    iconColor: "transparent",
    textColor: "#6B7280",
  },
  valid: {
    borderColor: "#22C55E",
    focusRingColor: "#22C55E",
    iconColor: "#22C55E",
    textColor: "#16A34A",
  },
  invalid: {
    borderColor: "#EF4444",
    focusRingColor: "#EF4444",
    iconColor: "#EF4444",
    textColor: "#DC2626",
  },
  warning: {
    borderColor: "#F59E0B",
    focusRingColor: "#F59E0B",
    iconColor: "#F59E0B",
    textColor: "#D97706",
  },
};

// ---------------------------------------------------------------------------
// Select Option
// ---------------------------------------------------------------------------

export const SelectOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
  disabled: z.boolean().optional(),
  group: z.string().optional(),
});

export type SelectOption = z.infer<typeof SelectOptionSchema>;

// ---------------------------------------------------------------------------
// Base Input Props (shared across all input types)
// ---------------------------------------------------------------------------

export const BaseInputPropsSchema = z.object({
  /** Unique field name */
  name: z.string(),
  /** User-facing label */
  label: z.string().optional(),
  /** Placeholder text */
  placeholder: z.string().optional(),
  /** Helper text shown below the input */
  helperText: z.string().optional(),
  /** Error text (displayed when validation state is invalid) */
  errorText: z.string().optional(),
  /** Warning text (displayed when validation state is warning) */
  warningText: z.string().optional(),
  /** Validation state */
  validationState: ValidationStateSchema.optional().default("idle"),
  /** Size */
  size: InputSizeSchema.optional().default("md"),
  /** Disabled */
  disabled: z.boolean().optional().default(false),
  /** Read-only */
  readOnly: z.boolean().optional().default(false),
  /** Required */
  required: z.boolean().optional().default(false),
  /** Accessible description */
  ariaDescribedBy: z.string().optional(),
}).strict();

export type BaseInputProps = z.infer<typeof BaseInputPropsSchema>;

// ---------------------------------------------------------------------------
// Text Input Props
// ---------------------------------------------------------------------------

export const TextInputPropsSchema = BaseInputPropsSchema.extend({
  type: z.literal("text").default("text"),
  maxLength: z.number().int().positive().optional(),
  minLength: z.number().int().nonnegative().optional(),
  pattern: z.string().optional(),
  iconLeft: z.string().optional(),
  iconRight: z.string().optional(),
  clearable: z.boolean().optional().default(false),
});

export type TextInputProps = z.infer<typeof TextInputPropsSchema>;

// ---------------------------------------------------------------------------
// Email Input Props
// ---------------------------------------------------------------------------

export const EmailInputPropsSchema = BaseInputPropsSchema.extend({
  type: z.literal("email").default("email"),
  multiple: z.boolean().optional().default(false),
});

export type EmailInputProps = z.infer<typeof EmailInputPropsSchema>;

// ---------------------------------------------------------------------------
// Password Input Props
// ---------------------------------------------------------------------------

export const PasswordInputPropsSchema = BaseInputPropsSchema.extend({
  type: z.literal("password").default("password"),
  showToggle: z.boolean().optional().default(true),
  strengthIndicator: z.boolean().optional().default(false),
  minLength: z.number().int().nonnegative().optional(),
});

export type PasswordInputProps = z.infer<typeof PasswordInputPropsSchema>;

// ---------------------------------------------------------------------------
// Number Input Props
// ---------------------------------------------------------------------------

export const NumberInputPropsSchema = BaseInputPropsSchema.extend({
  type: z.literal("number").default("number"),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional().default(1),
  showStepper: z.boolean().optional().default(false),
  prefix: z.string().optional(),
  suffix: z.string().optional(),
});

export type NumberInputProps = z.infer<typeof NumberInputPropsSchema>;

// ---------------------------------------------------------------------------
// Textarea Props
// ---------------------------------------------------------------------------

export const TextareaPropsSchema = BaseInputPropsSchema.extend({
  type: z.literal("textarea").default("textarea"),
  rows: z.number().int().positive().optional().default(4),
  maxLength: z.number().int().positive().optional(),
  resize: z.enum(["none", "vertical", "horizontal", "both"]).optional().default("vertical"),
  showCharCount: z.boolean().optional().default(false),
  autoGrow: z.boolean().optional().default(false),
});

export type TextareaProps = z.infer<typeof TextareaPropsSchema>;

// ---------------------------------------------------------------------------
// Select Props
// ---------------------------------------------------------------------------

export const SelectPropsSchema = BaseInputPropsSchema.extend({
  type: z.literal("select").default("select"),
  options: z.array(SelectOptionSchema),
  multiple: z.boolean().optional().default(false),
  searchable: z.boolean().optional().default(false),
  clearable: z.boolean().optional().default(false),
  maxSelections: z.number().int().positive().optional(),
  emptyMessage: z.string().optional().default("No options available"),
});

export type SelectProps = z.infer<typeof SelectPropsSchema>;

// ---------------------------------------------------------------------------
// Discriminated union of all input types
// ---------------------------------------------------------------------------

export const FormFieldPropsSchema = z.discriminatedUnion("type", [
  TextInputPropsSchema,
  EmailInputPropsSchema,
  PasswordInputPropsSchema,
  NumberInputPropsSchema,
  TextareaPropsSchema,
  SelectPropsSchema,
]);

export type FormFieldProps = z.infer<typeof FormFieldPropsSchema>;

// ---------------------------------------------------------------------------
// Form Layout Config
// ---------------------------------------------------------------------------

export const FormLayoutSchema = z.object({
  /** Direction of form fields */
  direction: z.enum(["vertical", "horizontal"]).default("vertical"),
  /** Gap between fields (px) */
  gap: z.number().default(16),
  /** Label placement */
  labelPlacement: z.enum(["top", "left", "floating"]).default("top"),
  /** Left-label column width (only when labelPlacement is "left") */
  labelWidth: z.number().optional().default(120),
  /** Required indicator style */
  requiredIndicator: z.enum(["asterisk", "text", "none"]).default("asterisk"),
}).strict();

export type FormLayout = z.infer<typeof FormLayoutSchema>;

// ---------------------------------------------------------------------------
// Validation Rule (for declarative validation configuration)
// ---------------------------------------------------------------------------

export const ValidationRuleSchema = z.object({
  type: z.enum([
    "required",
    "minLength",
    "maxLength",
    "min",
    "max",
    "pattern",
    "email",
    "custom",
  ]),
  value: z.union([z.string(), z.number(), z.boolean()]).optional(),
  message: z.string(),
}).strict();

export type ValidationRule = z.infer<typeof ValidationRuleSchema>;

export const FieldValidationConfigSchema = z.object({
  fieldName: z.string(),
  rules: z.array(ValidationRuleSchema),
  validateOn: z.enum(["change", "blur", "submit"]).default("blur"),
}).strict();

export type FieldValidationConfig = z.infer<typeof FieldValidationConfigSchema>;
