"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FieldValidationConfigSchema = exports.ValidationRuleSchema = exports.FormLayoutSchema = exports.FormFieldPropsSchema = exports.SelectPropsSchema = exports.TextareaPropsSchema = exports.NumberInputPropsSchema = exports.PasswordInputPropsSchema = exports.EmailInputPropsSchema = exports.TextInputPropsSchema = exports.BaseInputPropsSchema = exports.SelectOptionSchema = exports.ValidationStateStyles = exports.InputSizeTokens = exports.InputSizeSchema = exports.InputSizes = exports.ValidationStateSchema = exports.ValidationStates = exports.InputTypeSchema = exports.InputTypes = void 0;
/**
 * UI-003: Form Component Specs
 *
 * Type definitions and Zod schemas for form inputs, validation states,
 * labels, helper text, and error text.
 */
const zod_1 = require("zod");
// ---------------------------------------------------------------------------
// Input Types
// ---------------------------------------------------------------------------
exports.InputTypes = [
    "text",
    "email",
    "password",
    "number",
    "textarea",
    "select",
];
exports.InputTypeSchema = zod_1.z.enum(exports.InputTypes);
// ---------------------------------------------------------------------------
// Validation State
// ---------------------------------------------------------------------------
exports.ValidationStates = ["idle", "valid", "invalid", "warning"];
exports.ValidationStateSchema = zod_1.z.enum(exports.ValidationStates);
// ---------------------------------------------------------------------------
// Input Sizes
// ---------------------------------------------------------------------------
exports.InputSizes = ["sm", "md", "lg"];
exports.InputSizeSchema = zod_1.z.enum(exports.InputSizes);
exports.InputSizeTokens = {
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
};
exports.ValidationStateStyles = {
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
exports.SelectOptionSchema = zod_1.z.object({
    value: zod_1.z.string(),
    label: zod_1.z.string(),
    disabled: zod_1.z.boolean().optional(),
    group: zod_1.z.string().optional(),
});
// ---------------------------------------------------------------------------
// Base Input Props (shared across all input types)
// ---------------------------------------------------------------------------
exports.BaseInputPropsSchema = zod_1.z.object({
    /** Unique field name */
    name: zod_1.z.string(),
    /** User-facing label */
    label: zod_1.z.string().optional(),
    /** Placeholder text */
    placeholder: zod_1.z.string().optional(),
    /** Helper text shown below the input */
    helperText: zod_1.z.string().optional(),
    /** Error text (displayed when validation state is invalid) */
    errorText: zod_1.z.string().optional(),
    /** Warning text (displayed when validation state is warning) */
    warningText: zod_1.z.string().optional(),
    /** Validation state */
    validationState: exports.ValidationStateSchema.optional().default("idle"),
    /** Size */
    size: exports.InputSizeSchema.optional().default("md"),
    /** Disabled */
    disabled: zod_1.z.boolean().optional().default(false),
    /** Read-only */
    readOnly: zod_1.z.boolean().optional().default(false),
    /** Required */
    required: zod_1.z.boolean().optional().default(false),
    /** Accessible description */
    ariaDescribedBy: zod_1.z.string().optional(),
}).strict();
// ---------------------------------------------------------------------------
// Text Input Props
// ---------------------------------------------------------------------------
exports.TextInputPropsSchema = exports.BaseInputPropsSchema.extend({
    type: zod_1.z.literal("text").default("text"),
    maxLength: zod_1.z.number().int().positive().optional(),
    minLength: zod_1.z.number().int().nonnegative().optional(),
    pattern: zod_1.z.string().optional(),
    iconLeft: zod_1.z.string().optional(),
    iconRight: zod_1.z.string().optional(),
    clearable: zod_1.z.boolean().optional().default(false),
});
// ---------------------------------------------------------------------------
// Email Input Props
// ---------------------------------------------------------------------------
exports.EmailInputPropsSchema = exports.BaseInputPropsSchema.extend({
    type: zod_1.z.literal("email").default("email"),
    multiple: zod_1.z.boolean().optional().default(false),
});
// ---------------------------------------------------------------------------
// Password Input Props
// ---------------------------------------------------------------------------
exports.PasswordInputPropsSchema = exports.BaseInputPropsSchema.extend({
    type: zod_1.z.literal("password").default("password"),
    showToggle: zod_1.z.boolean().optional().default(true),
    strengthIndicator: zod_1.z.boolean().optional().default(false),
    minLength: zod_1.z.number().int().nonnegative().optional(),
});
// ---------------------------------------------------------------------------
// Number Input Props
// ---------------------------------------------------------------------------
exports.NumberInputPropsSchema = exports.BaseInputPropsSchema.extend({
    type: zod_1.z.literal("number").default("number"),
    min: zod_1.z.number().optional(),
    max: zod_1.z.number().optional(),
    step: zod_1.z.number().optional().default(1),
    showStepper: zod_1.z.boolean().optional().default(false),
    prefix: zod_1.z.string().optional(),
    suffix: zod_1.z.string().optional(),
});
// ---------------------------------------------------------------------------
// Textarea Props
// ---------------------------------------------------------------------------
exports.TextareaPropsSchema = exports.BaseInputPropsSchema.extend({
    type: zod_1.z.literal("textarea").default("textarea"),
    rows: zod_1.z.number().int().positive().optional().default(4),
    maxLength: zod_1.z.number().int().positive().optional(),
    resize: zod_1.z.enum(["none", "vertical", "horizontal", "both"]).optional().default("vertical"),
    showCharCount: zod_1.z.boolean().optional().default(false),
    autoGrow: zod_1.z.boolean().optional().default(false),
});
// ---------------------------------------------------------------------------
// Select Props
// ---------------------------------------------------------------------------
exports.SelectPropsSchema = exports.BaseInputPropsSchema.extend({
    type: zod_1.z.literal("select").default("select"),
    options: zod_1.z.array(exports.SelectOptionSchema),
    multiple: zod_1.z.boolean().optional().default(false),
    searchable: zod_1.z.boolean().optional().default(false),
    clearable: zod_1.z.boolean().optional().default(false),
    maxSelections: zod_1.z.number().int().positive().optional(),
    emptyMessage: zod_1.z.string().optional().default("No options available"),
});
// ---------------------------------------------------------------------------
// Discriminated union of all input types
// ---------------------------------------------------------------------------
exports.FormFieldPropsSchema = zod_1.z.discriminatedUnion("type", [
    exports.TextInputPropsSchema,
    exports.EmailInputPropsSchema,
    exports.PasswordInputPropsSchema,
    exports.NumberInputPropsSchema,
    exports.TextareaPropsSchema,
    exports.SelectPropsSchema,
]);
// ---------------------------------------------------------------------------
// Form Layout Config
// ---------------------------------------------------------------------------
exports.FormLayoutSchema = zod_1.z.object({
    /** Direction of form fields */
    direction: zod_1.z.enum(["vertical", "horizontal"]).default("vertical"),
    /** Gap between fields (px) */
    gap: zod_1.z.number().default(16),
    /** Label placement */
    labelPlacement: zod_1.z.enum(["top", "left", "floating"]).default("top"),
    /** Left-label column width (only when labelPlacement is "left") */
    labelWidth: zod_1.z.number().optional().default(120),
    /** Required indicator style */
    requiredIndicator: zod_1.z.enum(["asterisk", "text", "none"]).default("asterisk"),
}).strict();
// ---------------------------------------------------------------------------
// Validation Rule (for declarative validation configuration)
// ---------------------------------------------------------------------------
exports.ValidationRuleSchema = zod_1.z.object({
    type: zod_1.z.enum([
        "required",
        "minLength",
        "maxLength",
        "min",
        "max",
        "pattern",
        "email",
        "custom",
    ]),
    value: zod_1.z.union([zod_1.z.string(), zod_1.z.number(), zod_1.z.boolean()]).optional(),
    message: zod_1.z.string(),
}).strict();
exports.FieldValidationConfigSchema = zod_1.z.object({
    fieldName: zod_1.z.string(),
    rules: zod_1.z.array(exports.ValidationRuleSchema),
    validateOn: zod_1.z.enum(["change", "blur", "submit"]).default("blur"),
}).strict();
//# sourceMappingURL=forms.js.map