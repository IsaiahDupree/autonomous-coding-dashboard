/**
 * UI-003: Form Component Specs
 *
 * Type definitions and Zod schemas for form inputs, validation states,
 * labels, helper text, and error text.
 */
import { z } from "zod";
export declare const InputTypes: readonly ["text", "email", "password", "number", "textarea", "select"];
export type InputType = (typeof InputTypes)[number];
export declare const InputTypeSchema: z.ZodEnum<["text", "email", "password", "number", "textarea", "select"]>;
export declare const ValidationStates: readonly ["idle", "valid", "invalid", "warning"];
export type ValidationState = (typeof ValidationStates)[number];
export declare const ValidationStateSchema: z.ZodEnum<["idle", "valid", "invalid", "warning"]>;
export declare const InputSizes: readonly ["sm", "md", "lg"];
export type InputSize = (typeof InputSizes)[number];
export declare const InputSizeSchema: z.ZodEnum<["sm", "md", "lg"]>;
export declare const InputSizeTokens: {
    readonly sm: {
        readonly height: 32;
        readonly paddingX: 10;
        readonly paddingY: 6;
        readonly fontSize: "0.875rem";
        readonly borderRadius: "4px";
        readonly labelFontSize: "0.75rem";
    };
    readonly md: {
        readonly height: 40;
        readonly paddingX: 12;
        readonly paddingY: 8;
        readonly fontSize: "0.875rem";
        readonly borderRadius: "6px";
        readonly labelFontSize: "0.875rem";
    };
    readonly lg: {
        readonly height: 48;
        readonly paddingX: 16;
        readonly paddingY: 12;
        readonly fontSize: "1rem";
        readonly borderRadius: "8px";
        readonly labelFontSize: "1rem";
    };
};
export type InputSizeTokens = typeof InputSizeTokens;
export interface ValidationStateStyle {
    borderColor: string;
    focusRingColor: string;
    iconColor: string;
    textColor: string;
}
export declare const ValidationStateStyles: Record<ValidationState, ValidationStateStyle>;
export declare const SelectOptionSchema: z.ZodObject<{
    value: z.ZodString;
    label: z.ZodString;
    disabled: z.ZodOptional<z.ZodBoolean>;
    group: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    value: string;
    label: string;
    disabled?: boolean | undefined;
    group?: string | undefined;
}, {
    value: string;
    label: string;
    disabled?: boolean | undefined;
    group?: string | undefined;
}>;
export type SelectOption = z.infer<typeof SelectOptionSchema>;
export declare const BaseInputPropsSchema: z.ZodObject<{
    /** Unique field name */
    name: z.ZodString;
    /** User-facing label */
    label: z.ZodOptional<z.ZodString>;
    /** Placeholder text */
    placeholder: z.ZodOptional<z.ZodString>;
    /** Helper text shown below the input */
    helperText: z.ZodOptional<z.ZodString>;
    /** Error text (displayed when validation state is invalid) */
    errorText: z.ZodOptional<z.ZodString>;
    /** Warning text (displayed when validation state is warning) */
    warningText: z.ZodOptional<z.ZodString>;
    /** Validation state */
    validationState: z.ZodDefault<z.ZodOptional<z.ZodEnum<["idle", "valid", "invalid", "warning"]>>>;
    /** Size */
    size: z.ZodDefault<z.ZodOptional<z.ZodEnum<["sm", "md", "lg"]>>>;
    /** Disabled */
    disabled: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    /** Read-only */
    readOnly: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    /** Required */
    required: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    /** Accessible description */
    ariaDescribedBy: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    disabled: boolean;
    size: "sm" | "md" | "lg";
    required: boolean;
    name: string;
    validationState: "valid" | "idle" | "invalid" | "warning";
    readOnly: boolean;
    label?: string | undefined;
    placeholder?: string | undefined;
    helperText?: string | undefined;
    errorText?: string | undefined;
    warningText?: string | undefined;
    ariaDescribedBy?: string | undefined;
}, {
    name: string;
    disabled?: boolean | undefined;
    size?: "sm" | "md" | "lg" | undefined;
    label?: string | undefined;
    required?: boolean | undefined;
    placeholder?: string | undefined;
    helperText?: string | undefined;
    errorText?: string | undefined;
    warningText?: string | undefined;
    validationState?: "valid" | "idle" | "invalid" | "warning" | undefined;
    readOnly?: boolean | undefined;
    ariaDescribedBy?: string | undefined;
}>;
export type BaseInputProps = z.infer<typeof BaseInputPropsSchema>;
export declare const TextInputPropsSchema: z.ZodObject<{
    /** Unique field name */
    name: z.ZodString;
    /** User-facing label */
    label: z.ZodOptional<z.ZodString>;
    /** Placeholder text */
    placeholder: z.ZodOptional<z.ZodString>;
    /** Helper text shown below the input */
    helperText: z.ZodOptional<z.ZodString>;
    /** Error text (displayed when validation state is invalid) */
    errorText: z.ZodOptional<z.ZodString>;
    /** Warning text (displayed when validation state is warning) */
    warningText: z.ZodOptional<z.ZodString>;
    /** Validation state */
    validationState: z.ZodDefault<z.ZodOptional<z.ZodEnum<["idle", "valid", "invalid", "warning"]>>>;
    /** Size */
    size: z.ZodDefault<z.ZodOptional<z.ZodEnum<["sm", "md", "lg"]>>>;
    /** Disabled */
    disabled: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    /** Read-only */
    readOnly: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    /** Required */
    required: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    /** Accessible description */
    ariaDescribedBy: z.ZodOptional<z.ZodString>;
} & {
    type: z.ZodDefault<z.ZodLiteral<"text">>;
    maxLength: z.ZodOptional<z.ZodNumber>;
    minLength: z.ZodOptional<z.ZodNumber>;
    pattern: z.ZodOptional<z.ZodString>;
    iconLeft: z.ZodOptional<z.ZodString>;
    iconRight: z.ZodOptional<z.ZodString>;
    clearable: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strict", z.ZodTypeAny, {
    disabled: boolean;
    size: "sm" | "md" | "lg";
    type: "text";
    required: boolean;
    name: string;
    validationState: "valid" | "idle" | "invalid" | "warning";
    readOnly: boolean;
    clearable: boolean;
    iconLeft?: string | undefined;
    iconRight?: string | undefined;
    label?: string | undefined;
    placeholder?: string | undefined;
    helperText?: string | undefined;
    errorText?: string | undefined;
    warningText?: string | undefined;
    ariaDescribedBy?: string | undefined;
    maxLength?: number | undefined;
    minLength?: number | undefined;
    pattern?: string | undefined;
}, {
    name: string;
    disabled?: boolean | undefined;
    size?: "sm" | "md" | "lg" | undefined;
    iconLeft?: string | undefined;
    iconRight?: string | undefined;
    type?: "text" | undefined;
    label?: string | undefined;
    required?: boolean | undefined;
    placeholder?: string | undefined;
    helperText?: string | undefined;
    errorText?: string | undefined;
    warningText?: string | undefined;
    validationState?: "valid" | "idle" | "invalid" | "warning" | undefined;
    readOnly?: boolean | undefined;
    ariaDescribedBy?: string | undefined;
    maxLength?: number | undefined;
    minLength?: number | undefined;
    pattern?: string | undefined;
    clearable?: boolean | undefined;
}>;
export type TextInputProps = z.infer<typeof TextInputPropsSchema>;
export declare const EmailInputPropsSchema: z.ZodObject<{
    /** Unique field name */
    name: z.ZodString;
    /** User-facing label */
    label: z.ZodOptional<z.ZodString>;
    /** Placeholder text */
    placeholder: z.ZodOptional<z.ZodString>;
    /** Helper text shown below the input */
    helperText: z.ZodOptional<z.ZodString>;
    /** Error text (displayed when validation state is invalid) */
    errorText: z.ZodOptional<z.ZodString>;
    /** Warning text (displayed when validation state is warning) */
    warningText: z.ZodOptional<z.ZodString>;
    /** Validation state */
    validationState: z.ZodDefault<z.ZodOptional<z.ZodEnum<["idle", "valid", "invalid", "warning"]>>>;
    /** Size */
    size: z.ZodDefault<z.ZodOptional<z.ZodEnum<["sm", "md", "lg"]>>>;
    /** Disabled */
    disabled: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    /** Read-only */
    readOnly: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    /** Required */
    required: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    /** Accessible description */
    ariaDescribedBy: z.ZodOptional<z.ZodString>;
} & {
    type: z.ZodDefault<z.ZodLiteral<"email">>;
    multiple: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strict", z.ZodTypeAny, {
    disabled: boolean;
    size: "sm" | "md" | "lg";
    type: "email";
    required: boolean;
    name: string;
    validationState: "valid" | "idle" | "invalid" | "warning";
    readOnly: boolean;
    multiple: boolean;
    label?: string | undefined;
    placeholder?: string | undefined;
    helperText?: string | undefined;
    errorText?: string | undefined;
    warningText?: string | undefined;
    ariaDescribedBy?: string | undefined;
}, {
    name: string;
    disabled?: boolean | undefined;
    size?: "sm" | "md" | "lg" | undefined;
    type?: "email" | undefined;
    label?: string | undefined;
    required?: boolean | undefined;
    placeholder?: string | undefined;
    helperText?: string | undefined;
    errorText?: string | undefined;
    warningText?: string | undefined;
    validationState?: "valid" | "idle" | "invalid" | "warning" | undefined;
    readOnly?: boolean | undefined;
    ariaDescribedBy?: string | undefined;
    multiple?: boolean | undefined;
}>;
export type EmailInputProps = z.infer<typeof EmailInputPropsSchema>;
export declare const PasswordInputPropsSchema: z.ZodObject<{
    /** Unique field name */
    name: z.ZodString;
    /** User-facing label */
    label: z.ZodOptional<z.ZodString>;
    /** Placeholder text */
    placeholder: z.ZodOptional<z.ZodString>;
    /** Helper text shown below the input */
    helperText: z.ZodOptional<z.ZodString>;
    /** Error text (displayed when validation state is invalid) */
    errorText: z.ZodOptional<z.ZodString>;
    /** Warning text (displayed when validation state is warning) */
    warningText: z.ZodOptional<z.ZodString>;
    /** Validation state */
    validationState: z.ZodDefault<z.ZodOptional<z.ZodEnum<["idle", "valid", "invalid", "warning"]>>>;
    /** Size */
    size: z.ZodDefault<z.ZodOptional<z.ZodEnum<["sm", "md", "lg"]>>>;
    /** Disabled */
    disabled: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    /** Read-only */
    readOnly: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    /** Required */
    required: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    /** Accessible description */
    ariaDescribedBy: z.ZodOptional<z.ZodString>;
} & {
    type: z.ZodDefault<z.ZodLiteral<"password">>;
    showToggle: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    strengthIndicator: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    minLength: z.ZodOptional<z.ZodNumber>;
}, "strict", z.ZodTypeAny, {
    disabled: boolean;
    size: "sm" | "md" | "lg";
    type: "password";
    required: boolean;
    name: string;
    validationState: "valid" | "idle" | "invalid" | "warning";
    readOnly: boolean;
    showToggle: boolean;
    strengthIndicator: boolean;
    label?: string | undefined;
    placeholder?: string | undefined;
    helperText?: string | undefined;
    errorText?: string | undefined;
    warningText?: string | undefined;
    ariaDescribedBy?: string | undefined;
    minLength?: number | undefined;
}, {
    name: string;
    disabled?: boolean | undefined;
    size?: "sm" | "md" | "lg" | undefined;
    type?: "password" | undefined;
    label?: string | undefined;
    required?: boolean | undefined;
    placeholder?: string | undefined;
    helperText?: string | undefined;
    errorText?: string | undefined;
    warningText?: string | undefined;
    validationState?: "valid" | "idle" | "invalid" | "warning" | undefined;
    readOnly?: boolean | undefined;
    ariaDescribedBy?: string | undefined;
    minLength?: number | undefined;
    showToggle?: boolean | undefined;
    strengthIndicator?: boolean | undefined;
}>;
export type PasswordInputProps = z.infer<typeof PasswordInputPropsSchema>;
export declare const NumberInputPropsSchema: z.ZodObject<{
    /** Unique field name */
    name: z.ZodString;
    /** User-facing label */
    label: z.ZodOptional<z.ZodString>;
    /** Placeholder text */
    placeholder: z.ZodOptional<z.ZodString>;
    /** Helper text shown below the input */
    helperText: z.ZodOptional<z.ZodString>;
    /** Error text (displayed when validation state is invalid) */
    errorText: z.ZodOptional<z.ZodString>;
    /** Warning text (displayed when validation state is warning) */
    warningText: z.ZodOptional<z.ZodString>;
    /** Validation state */
    validationState: z.ZodDefault<z.ZodOptional<z.ZodEnum<["idle", "valid", "invalid", "warning"]>>>;
    /** Size */
    size: z.ZodDefault<z.ZodOptional<z.ZodEnum<["sm", "md", "lg"]>>>;
    /** Disabled */
    disabled: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    /** Read-only */
    readOnly: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    /** Required */
    required: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    /** Accessible description */
    ariaDescribedBy: z.ZodOptional<z.ZodString>;
} & {
    type: z.ZodDefault<z.ZodLiteral<"number">>;
    min: z.ZodOptional<z.ZodNumber>;
    max: z.ZodOptional<z.ZodNumber>;
    step: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    showStepper: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    prefix: z.ZodOptional<z.ZodString>;
    suffix: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    disabled: boolean;
    size: "sm" | "md" | "lg";
    type: "number";
    step: number;
    required: boolean;
    name: string;
    validationState: "valid" | "idle" | "invalid" | "warning";
    readOnly: boolean;
    showStepper: boolean;
    label?: string | undefined;
    min?: number | undefined;
    max?: number | undefined;
    placeholder?: string | undefined;
    helperText?: string | undefined;
    errorText?: string | undefined;
    warningText?: string | undefined;
    ariaDescribedBy?: string | undefined;
    prefix?: string | undefined;
    suffix?: string | undefined;
}, {
    name: string;
    disabled?: boolean | undefined;
    size?: "sm" | "md" | "lg" | undefined;
    type?: "number" | undefined;
    label?: string | undefined;
    min?: number | undefined;
    max?: number | undefined;
    step?: number | undefined;
    required?: boolean | undefined;
    placeholder?: string | undefined;
    helperText?: string | undefined;
    errorText?: string | undefined;
    warningText?: string | undefined;
    validationState?: "valid" | "idle" | "invalid" | "warning" | undefined;
    readOnly?: boolean | undefined;
    ariaDescribedBy?: string | undefined;
    showStepper?: boolean | undefined;
    prefix?: string | undefined;
    suffix?: string | undefined;
}>;
export type NumberInputProps = z.infer<typeof NumberInputPropsSchema>;
export declare const TextareaPropsSchema: z.ZodObject<{
    /** Unique field name */
    name: z.ZodString;
    /** User-facing label */
    label: z.ZodOptional<z.ZodString>;
    /** Placeholder text */
    placeholder: z.ZodOptional<z.ZodString>;
    /** Helper text shown below the input */
    helperText: z.ZodOptional<z.ZodString>;
    /** Error text (displayed when validation state is invalid) */
    errorText: z.ZodOptional<z.ZodString>;
    /** Warning text (displayed when validation state is warning) */
    warningText: z.ZodOptional<z.ZodString>;
    /** Validation state */
    validationState: z.ZodDefault<z.ZodOptional<z.ZodEnum<["idle", "valid", "invalid", "warning"]>>>;
    /** Size */
    size: z.ZodDefault<z.ZodOptional<z.ZodEnum<["sm", "md", "lg"]>>>;
    /** Disabled */
    disabled: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    /** Read-only */
    readOnly: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    /** Required */
    required: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    /** Accessible description */
    ariaDescribedBy: z.ZodOptional<z.ZodString>;
} & {
    type: z.ZodDefault<z.ZodLiteral<"textarea">>;
    rows: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    maxLength: z.ZodOptional<z.ZodNumber>;
    resize: z.ZodDefault<z.ZodOptional<z.ZodEnum<["none", "vertical", "horizontal", "both"]>>>;
    showCharCount: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    autoGrow: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strict", z.ZodTypeAny, {
    disabled: boolean;
    size: "sm" | "md" | "lg";
    type: "textarea";
    required: boolean;
    name: string;
    validationState: "valid" | "idle" | "invalid" | "warning";
    readOnly: boolean;
    rows: number;
    resize: "none" | "horizontal" | "vertical" | "both";
    showCharCount: boolean;
    autoGrow: boolean;
    label?: string | undefined;
    placeholder?: string | undefined;
    helperText?: string | undefined;
    errorText?: string | undefined;
    warningText?: string | undefined;
    ariaDescribedBy?: string | undefined;
    maxLength?: number | undefined;
}, {
    name: string;
    disabled?: boolean | undefined;
    size?: "sm" | "md" | "lg" | undefined;
    type?: "textarea" | undefined;
    label?: string | undefined;
    required?: boolean | undefined;
    placeholder?: string | undefined;
    helperText?: string | undefined;
    errorText?: string | undefined;
    warningText?: string | undefined;
    validationState?: "valid" | "idle" | "invalid" | "warning" | undefined;
    readOnly?: boolean | undefined;
    ariaDescribedBy?: string | undefined;
    maxLength?: number | undefined;
    rows?: number | undefined;
    resize?: "none" | "horizontal" | "vertical" | "both" | undefined;
    showCharCount?: boolean | undefined;
    autoGrow?: boolean | undefined;
}>;
export type TextareaProps = z.infer<typeof TextareaPropsSchema>;
export declare const SelectPropsSchema: z.ZodObject<{
    /** Unique field name */
    name: z.ZodString;
    /** User-facing label */
    label: z.ZodOptional<z.ZodString>;
    /** Placeholder text */
    placeholder: z.ZodOptional<z.ZodString>;
    /** Helper text shown below the input */
    helperText: z.ZodOptional<z.ZodString>;
    /** Error text (displayed when validation state is invalid) */
    errorText: z.ZodOptional<z.ZodString>;
    /** Warning text (displayed when validation state is warning) */
    warningText: z.ZodOptional<z.ZodString>;
    /** Validation state */
    validationState: z.ZodDefault<z.ZodOptional<z.ZodEnum<["idle", "valid", "invalid", "warning"]>>>;
    /** Size */
    size: z.ZodDefault<z.ZodOptional<z.ZodEnum<["sm", "md", "lg"]>>>;
    /** Disabled */
    disabled: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    /** Read-only */
    readOnly: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    /** Required */
    required: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    /** Accessible description */
    ariaDescribedBy: z.ZodOptional<z.ZodString>;
} & {
    type: z.ZodDefault<z.ZodLiteral<"select">>;
    options: z.ZodArray<z.ZodObject<{
        value: z.ZodString;
        label: z.ZodString;
        disabled: z.ZodOptional<z.ZodBoolean>;
        group: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        value: string;
        label: string;
        disabled?: boolean | undefined;
        group?: string | undefined;
    }, {
        value: string;
        label: string;
        disabled?: boolean | undefined;
        group?: string | undefined;
    }>, "many">;
    multiple: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    searchable: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    clearable: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    maxSelections: z.ZodOptional<z.ZodNumber>;
    emptyMessage: z.ZodDefault<z.ZodOptional<z.ZodString>>;
}, "strict", z.ZodTypeAny, {
    disabled: boolean;
    size: "sm" | "md" | "lg";
    type: "select";
    options: {
        value: string;
        label: string;
        disabled?: boolean | undefined;
        group?: string | undefined;
    }[];
    required: boolean;
    name: string;
    emptyMessage: string;
    validationState: "valid" | "idle" | "invalid" | "warning";
    readOnly: boolean;
    clearable: boolean;
    multiple: boolean;
    searchable: boolean;
    label?: string | undefined;
    placeholder?: string | undefined;
    helperText?: string | undefined;
    errorText?: string | undefined;
    warningText?: string | undefined;
    ariaDescribedBy?: string | undefined;
    maxSelections?: number | undefined;
}, {
    options: {
        value: string;
        label: string;
        disabled?: boolean | undefined;
        group?: string | undefined;
    }[];
    name: string;
    disabled?: boolean | undefined;
    size?: "sm" | "md" | "lg" | undefined;
    type?: "select" | undefined;
    label?: string | undefined;
    required?: boolean | undefined;
    emptyMessage?: string | undefined;
    placeholder?: string | undefined;
    helperText?: string | undefined;
    errorText?: string | undefined;
    warningText?: string | undefined;
    validationState?: "valid" | "idle" | "invalid" | "warning" | undefined;
    readOnly?: boolean | undefined;
    ariaDescribedBy?: string | undefined;
    clearable?: boolean | undefined;
    multiple?: boolean | undefined;
    searchable?: boolean | undefined;
    maxSelections?: number | undefined;
}>;
export type SelectProps = z.infer<typeof SelectPropsSchema>;
export declare const FormFieldPropsSchema: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
    /** Unique field name */
    name: z.ZodString;
    /** User-facing label */
    label: z.ZodOptional<z.ZodString>;
    /** Placeholder text */
    placeholder: z.ZodOptional<z.ZodString>;
    /** Helper text shown below the input */
    helperText: z.ZodOptional<z.ZodString>;
    /** Error text (displayed when validation state is invalid) */
    errorText: z.ZodOptional<z.ZodString>;
    /** Warning text (displayed when validation state is warning) */
    warningText: z.ZodOptional<z.ZodString>;
    /** Validation state */
    validationState: z.ZodDefault<z.ZodOptional<z.ZodEnum<["idle", "valid", "invalid", "warning"]>>>;
    /** Size */
    size: z.ZodDefault<z.ZodOptional<z.ZodEnum<["sm", "md", "lg"]>>>;
    /** Disabled */
    disabled: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    /** Read-only */
    readOnly: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    /** Required */
    required: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    /** Accessible description */
    ariaDescribedBy: z.ZodOptional<z.ZodString>;
} & {
    type: z.ZodDefault<z.ZodLiteral<"text">>;
    maxLength: z.ZodOptional<z.ZodNumber>;
    minLength: z.ZodOptional<z.ZodNumber>;
    pattern: z.ZodOptional<z.ZodString>;
    iconLeft: z.ZodOptional<z.ZodString>;
    iconRight: z.ZodOptional<z.ZodString>;
    clearable: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strict", z.ZodTypeAny, {
    disabled: boolean;
    size: "sm" | "md" | "lg";
    type: "text";
    required: boolean;
    name: string;
    validationState: "valid" | "idle" | "invalid" | "warning";
    readOnly: boolean;
    clearable: boolean;
    iconLeft?: string | undefined;
    iconRight?: string | undefined;
    label?: string | undefined;
    placeholder?: string | undefined;
    helperText?: string | undefined;
    errorText?: string | undefined;
    warningText?: string | undefined;
    ariaDescribedBy?: string | undefined;
    maxLength?: number | undefined;
    minLength?: number | undefined;
    pattern?: string | undefined;
}, {
    name: string;
    disabled?: boolean | undefined;
    size?: "sm" | "md" | "lg" | undefined;
    iconLeft?: string | undefined;
    iconRight?: string | undefined;
    type?: "text" | undefined;
    label?: string | undefined;
    required?: boolean | undefined;
    placeholder?: string | undefined;
    helperText?: string | undefined;
    errorText?: string | undefined;
    warningText?: string | undefined;
    validationState?: "valid" | "idle" | "invalid" | "warning" | undefined;
    readOnly?: boolean | undefined;
    ariaDescribedBy?: string | undefined;
    maxLength?: number | undefined;
    minLength?: number | undefined;
    pattern?: string | undefined;
    clearable?: boolean | undefined;
}>, z.ZodObject<{
    /** Unique field name */
    name: z.ZodString;
    /** User-facing label */
    label: z.ZodOptional<z.ZodString>;
    /** Placeholder text */
    placeholder: z.ZodOptional<z.ZodString>;
    /** Helper text shown below the input */
    helperText: z.ZodOptional<z.ZodString>;
    /** Error text (displayed when validation state is invalid) */
    errorText: z.ZodOptional<z.ZodString>;
    /** Warning text (displayed when validation state is warning) */
    warningText: z.ZodOptional<z.ZodString>;
    /** Validation state */
    validationState: z.ZodDefault<z.ZodOptional<z.ZodEnum<["idle", "valid", "invalid", "warning"]>>>;
    /** Size */
    size: z.ZodDefault<z.ZodOptional<z.ZodEnum<["sm", "md", "lg"]>>>;
    /** Disabled */
    disabled: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    /** Read-only */
    readOnly: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    /** Required */
    required: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    /** Accessible description */
    ariaDescribedBy: z.ZodOptional<z.ZodString>;
} & {
    type: z.ZodDefault<z.ZodLiteral<"email">>;
    multiple: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strict", z.ZodTypeAny, {
    disabled: boolean;
    size: "sm" | "md" | "lg";
    type: "email";
    required: boolean;
    name: string;
    validationState: "valid" | "idle" | "invalid" | "warning";
    readOnly: boolean;
    multiple: boolean;
    label?: string | undefined;
    placeholder?: string | undefined;
    helperText?: string | undefined;
    errorText?: string | undefined;
    warningText?: string | undefined;
    ariaDescribedBy?: string | undefined;
}, {
    name: string;
    disabled?: boolean | undefined;
    size?: "sm" | "md" | "lg" | undefined;
    type?: "email" | undefined;
    label?: string | undefined;
    required?: boolean | undefined;
    placeholder?: string | undefined;
    helperText?: string | undefined;
    errorText?: string | undefined;
    warningText?: string | undefined;
    validationState?: "valid" | "idle" | "invalid" | "warning" | undefined;
    readOnly?: boolean | undefined;
    ariaDescribedBy?: string | undefined;
    multiple?: boolean | undefined;
}>, z.ZodObject<{
    /** Unique field name */
    name: z.ZodString;
    /** User-facing label */
    label: z.ZodOptional<z.ZodString>;
    /** Placeholder text */
    placeholder: z.ZodOptional<z.ZodString>;
    /** Helper text shown below the input */
    helperText: z.ZodOptional<z.ZodString>;
    /** Error text (displayed when validation state is invalid) */
    errorText: z.ZodOptional<z.ZodString>;
    /** Warning text (displayed when validation state is warning) */
    warningText: z.ZodOptional<z.ZodString>;
    /** Validation state */
    validationState: z.ZodDefault<z.ZodOptional<z.ZodEnum<["idle", "valid", "invalid", "warning"]>>>;
    /** Size */
    size: z.ZodDefault<z.ZodOptional<z.ZodEnum<["sm", "md", "lg"]>>>;
    /** Disabled */
    disabled: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    /** Read-only */
    readOnly: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    /** Required */
    required: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    /** Accessible description */
    ariaDescribedBy: z.ZodOptional<z.ZodString>;
} & {
    type: z.ZodDefault<z.ZodLiteral<"password">>;
    showToggle: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    strengthIndicator: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    minLength: z.ZodOptional<z.ZodNumber>;
}, "strict", z.ZodTypeAny, {
    disabled: boolean;
    size: "sm" | "md" | "lg";
    type: "password";
    required: boolean;
    name: string;
    validationState: "valid" | "idle" | "invalid" | "warning";
    readOnly: boolean;
    showToggle: boolean;
    strengthIndicator: boolean;
    label?: string | undefined;
    placeholder?: string | undefined;
    helperText?: string | undefined;
    errorText?: string | undefined;
    warningText?: string | undefined;
    ariaDescribedBy?: string | undefined;
    minLength?: number | undefined;
}, {
    name: string;
    disabled?: boolean | undefined;
    size?: "sm" | "md" | "lg" | undefined;
    type?: "password" | undefined;
    label?: string | undefined;
    required?: boolean | undefined;
    placeholder?: string | undefined;
    helperText?: string | undefined;
    errorText?: string | undefined;
    warningText?: string | undefined;
    validationState?: "valid" | "idle" | "invalid" | "warning" | undefined;
    readOnly?: boolean | undefined;
    ariaDescribedBy?: string | undefined;
    minLength?: number | undefined;
    showToggle?: boolean | undefined;
    strengthIndicator?: boolean | undefined;
}>, z.ZodObject<{
    /** Unique field name */
    name: z.ZodString;
    /** User-facing label */
    label: z.ZodOptional<z.ZodString>;
    /** Placeholder text */
    placeholder: z.ZodOptional<z.ZodString>;
    /** Helper text shown below the input */
    helperText: z.ZodOptional<z.ZodString>;
    /** Error text (displayed when validation state is invalid) */
    errorText: z.ZodOptional<z.ZodString>;
    /** Warning text (displayed when validation state is warning) */
    warningText: z.ZodOptional<z.ZodString>;
    /** Validation state */
    validationState: z.ZodDefault<z.ZodOptional<z.ZodEnum<["idle", "valid", "invalid", "warning"]>>>;
    /** Size */
    size: z.ZodDefault<z.ZodOptional<z.ZodEnum<["sm", "md", "lg"]>>>;
    /** Disabled */
    disabled: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    /** Read-only */
    readOnly: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    /** Required */
    required: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    /** Accessible description */
    ariaDescribedBy: z.ZodOptional<z.ZodString>;
} & {
    type: z.ZodDefault<z.ZodLiteral<"number">>;
    min: z.ZodOptional<z.ZodNumber>;
    max: z.ZodOptional<z.ZodNumber>;
    step: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    showStepper: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    prefix: z.ZodOptional<z.ZodString>;
    suffix: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    disabled: boolean;
    size: "sm" | "md" | "lg";
    type: "number";
    step: number;
    required: boolean;
    name: string;
    validationState: "valid" | "idle" | "invalid" | "warning";
    readOnly: boolean;
    showStepper: boolean;
    label?: string | undefined;
    min?: number | undefined;
    max?: number | undefined;
    placeholder?: string | undefined;
    helperText?: string | undefined;
    errorText?: string | undefined;
    warningText?: string | undefined;
    ariaDescribedBy?: string | undefined;
    prefix?: string | undefined;
    suffix?: string | undefined;
}, {
    name: string;
    disabled?: boolean | undefined;
    size?: "sm" | "md" | "lg" | undefined;
    type?: "number" | undefined;
    label?: string | undefined;
    min?: number | undefined;
    max?: number | undefined;
    step?: number | undefined;
    required?: boolean | undefined;
    placeholder?: string | undefined;
    helperText?: string | undefined;
    errorText?: string | undefined;
    warningText?: string | undefined;
    validationState?: "valid" | "idle" | "invalid" | "warning" | undefined;
    readOnly?: boolean | undefined;
    ariaDescribedBy?: string | undefined;
    showStepper?: boolean | undefined;
    prefix?: string | undefined;
    suffix?: string | undefined;
}>, z.ZodObject<{
    /** Unique field name */
    name: z.ZodString;
    /** User-facing label */
    label: z.ZodOptional<z.ZodString>;
    /** Placeholder text */
    placeholder: z.ZodOptional<z.ZodString>;
    /** Helper text shown below the input */
    helperText: z.ZodOptional<z.ZodString>;
    /** Error text (displayed when validation state is invalid) */
    errorText: z.ZodOptional<z.ZodString>;
    /** Warning text (displayed when validation state is warning) */
    warningText: z.ZodOptional<z.ZodString>;
    /** Validation state */
    validationState: z.ZodDefault<z.ZodOptional<z.ZodEnum<["idle", "valid", "invalid", "warning"]>>>;
    /** Size */
    size: z.ZodDefault<z.ZodOptional<z.ZodEnum<["sm", "md", "lg"]>>>;
    /** Disabled */
    disabled: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    /** Read-only */
    readOnly: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    /** Required */
    required: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    /** Accessible description */
    ariaDescribedBy: z.ZodOptional<z.ZodString>;
} & {
    type: z.ZodDefault<z.ZodLiteral<"textarea">>;
    rows: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    maxLength: z.ZodOptional<z.ZodNumber>;
    resize: z.ZodDefault<z.ZodOptional<z.ZodEnum<["none", "vertical", "horizontal", "both"]>>>;
    showCharCount: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    autoGrow: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strict", z.ZodTypeAny, {
    disabled: boolean;
    size: "sm" | "md" | "lg";
    type: "textarea";
    required: boolean;
    name: string;
    validationState: "valid" | "idle" | "invalid" | "warning";
    readOnly: boolean;
    rows: number;
    resize: "none" | "horizontal" | "vertical" | "both";
    showCharCount: boolean;
    autoGrow: boolean;
    label?: string | undefined;
    placeholder?: string | undefined;
    helperText?: string | undefined;
    errorText?: string | undefined;
    warningText?: string | undefined;
    ariaDescribedBy?: string | undefined;
    maxLength?: number | undefined;
}, {
    name: string;
    disabled?: boolean | undefined;
    size?: "sm" | "md" | "lg" | undefined;
    type?: "textarea" | undefined;
    label?: string | undefined;
    required?: boolean | undefined;
    placeholder?: string | undefined;
    helperText?: string | undefined;
    errorText?: string | undefined;
    warningText?: string | undefined;
    validationState?: "valid" | "idle" | "invalid" | "warning" | undefined;
    readOnly?: boolean | undefined;
    ariaDescribedBy?: string | undefined;
    maxLength?: number | undefined;
    rows?: number | undefined;
    resize?: "none" | "horizontal" | "vertical" | "both" | undefined;
    showCharCount?: boolean | undefined;
    autoGrow?: boolean | undefined;
}>, z.ZodObject<{
    /** Unique field name */
    name: z.ZodString;
    /** User-facing label */
    label: z.ZodOptional<z.ZodString>;
    /** Placeholder text */
    placeholder: z.ZodOptional<z.ZodString>;
    /** Helper text shown below the input */
    helperText: z.ZodOptional<z.ZodString>;
    /** Error text (displayed when validation state is invalid) */
    errorText: z.ZodOptional<z.ZodString>;
    /** Warning text (displayed when validation state is warning) */
    warningText: z.ZodOptional<z.ZodString>;
    /** Validation state */
    validationState: z.ZodDefault<z.ZodOptional<z.ZodEnum<["idle", "valid", "invalid", "warning"]>>>;
    /** Size */
    size: z.ZodDefault<z.ZodOptional<z.ZodEnum<["sm", "md", "lg"]>>>;
    /** Disabled */
    disabled: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    /** Read-only */
    readOnly: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    /** Required */
    required: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    /** Accessible description */
    ariaDescribedBy: z.ZodOptional<z.ZodString>;
} & {
    type: z.ZodDefault<z.ZodLiteral<"select">>;
    options: z.ZodArray<z.ZodObject<{
        value: z.ZodString;
        label: z.ZodString;
        disabled: z.ZodOptional<z.ZodBoolean>;
        group: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        value: string;
        label: string;
        disabled?: boolean | undefined;
        group?: string | undefined;
    }, {
        value: string;
        label: string;
        disabled?: boolean | undefined;
        group?: string | undefined;
    }>, "many">;
    multiple: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    searchable: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    clearable: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    maxSelections: z.ZodOptional<z.ZodNumber>;
    emptyMessage: z.ZodDefault<z.ZodOptional<z.ZodString>>;
}, "strict", z.ZodTypeAny, {
    disabled: boolean;
    size: "sm" | "md" | "lg";
    type: "select";
    options: {
        value: string;
        label: string;
        disabled?: boolean | undefined;
        group?: string | undefined;
    }[];
    required: boolean;
    name: string;
    emptyMessage: string;
    validationState: "valid" | "idle" | "invalid" | "warning";
    readOnly: boolean;
    clearable: boolean;
    multiple: boolean;
    searchable: boolean;
    label?: string | undefined;
    placeholder?: string | undefined;
    helperText?: string | undefined;
    errorText?: string | undefined;
    warningText?: string | undefined;
    ariaDescribedBy?: string | undefined;
    maxSelections?: number | undefined;
}, {
    options: {
        value: string;
        label: string;
        disabled?: boolean | undefined;
        group?: string | undefined;
    }[];
    name: string;
    disabled?: boolean | undefined;
    size?: "sm" | "md" | "lg" | undefined;
    type?: "select" | undefined;
    label?: string | undefined;
    required?: boolean | undefined;
    emptyMessage?: string | undefined;
    placeholder?: string | undefined;
    helperText?: string | undefined;
    errorText?: string | undefined;
    warningText?: string | undefined;
    validationState?: "valid" | "idle" | "invalid" | "warning" | undefined;
    readOnly?: boolean | undefined;
    ariaDescribedBy?: string | undefined;
    clearable?: boolean | undefined;
    multiple?: boolean | undefined;
    searchable?: boolean | undefined;
    maxSelections?: number | undefined;
}>]>;
export type FormFieldProps = z.infer<typeof FormFieldPropsSchema>;
export declare const FormLayoutSchema: z.ZodObject<{
    /** Direction of form fields */
    direction: z.ZodDefault<z.ZodEnum<["vertical", "horizontal"]>>;
    /** Gap between fields (px) */
    gap: z.ZodDefault<z.ZodNumber>;
    /** Label placement */
    labelPlacement: z.ZodDefault<z.ZodEnum<["top", "left", "floating"]>>;
    /** Left-label column width (only when labelPlacement is "left") */
    labelWidth: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    /** Required indicator style */
    requiredIndicator: z.ZodDefault<z.ZodEnum<["asterisk", "text", "none"]>>;
}, "strict", z.ZodTypeAny, {
    direction: "horizontal" | "vertical";
    gap: number;
    labelPlacement: "left" | "top" | "floating";
    labelWidth: number;
    requiredIndicator: "none" | "text" | "asterisk";
}, {
    direction?: "horizontal" | "vertical" | undefined;
    gap?: number | undefined;
    labelPlacement?: "left" | "top" | "floating" | undefined;
    labelWidth?: number | undefined;
    requiredIndicator?: "none" | "text" | "asterisk" | undefined;
}>;
export type FormLayout = z.infer<typeof FormLayoutSchema>;
export declare const ValidationRuleSchema: z.ZodObject<{
    type: z.ZodEnum<["required", "minLength", "maxLength", "min", "max", "pattern", "email", "custom"]>;
    value: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean]>>;
    message: z.ZodString;
}, "strict", z.ZodTypeAny, {
    type: "custom" | "email" | "min" | "max" | "required" | "maxLength" | "minLength" | "pattern";
    message: string;
    value?: string | number | boolean | undefined;
}, {
    type: "custom" | "email" | "min" | "max" | "required" | "maxLength" | "minLength" | "pattern";
    message: string;
    value?: string | number | boolean | undefined;
}>;
export type ValidationRule = z.infer<typeof ValidationRuleSchema>;
export declare const FieldValidationConfigSchema: z.ZodObject<{
    fieldName: z.ZodString;
    rules: z.ZodArray<z.ZodObject<{
        type: z.ZodEnum<["required", "minLength", "maxLength", "min", "max", "pattern", "email", "custom"]>;
        value: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean]>>;
        message: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        type: "custom" | "email" | "min" | "max" | "required" | "maxLength" | "minLength" | "pattern";
        message: string;
        value?: string | number | boolean | undefined;
    }, {
        type: "custom" | "email" | "min" | "max" | "required" | "maxLength" | "minLength" | "pattern";
        message: string;
        value?: string | number | boolean | undefined;
    }>, "many">;
    validateOn: z.ZodDefault<z.ZodEnum<["change", "blur", "submit"]>>;
}, "strict", z.ZodTypeAny, {
    fieldName: string;
    rules: {
        type: "custom" | "email" | "min" | "max" | "required" | "maxLength" | "minLength" | "pattern";
        message: string;
        value?: string | number | boolean | undefined;
    }[];
    validateOn: "submit" | "change" | "blur";
}, {
    fieldName: string;
    rules: {
        type: "custom" | "email" | "min" | "max" | "required" | "maxLength" | "minLength" | "pattern";
        message: string;
        value?: string | number | boolean | undefined;
    }[];
    validateOn?: "submit" | "change" | "blur" | undefined;
}>;
export type FieldValidationConfig = z.infer<typeof FieldValidationConfigSchema>;
//# sourceMappingURL=forms.d.ts.map