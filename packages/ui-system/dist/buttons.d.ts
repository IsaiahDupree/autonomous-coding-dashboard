/**
 * UI-002: Button Component Specs
 *
 * Type definitions and Zod schemas for button variants, sizes, and states.
 * No actual React components -- just the specification layer.
 */
import { z } from "zod";
export declare const ButtonVariants: readonly ["primary", "secondary", "ghost", "danger"];
export type ButtonVariant = (typeof ButtonVariants)[number];
export declare const ButtonVariantSchema: z.ZodEnum<["primary", "secondary", "ghost", "danger"]>;
export declare const ButtonSizes: readonly ["sm", "md", "lg"];
export type ButtonSize = (typeof ButtonSizes)[number];
export declare const ButtonSizeSchema: z.ZodEnum<["sm", "md", "lg"]>;
export declare const ButtonStates: readonly ["default", "hover", "active", "disabled", "loading"];
export type ButtonState = (typeof ButtonStates)[number];
export declare const ButtonStateSchema: z.ZodEnum<["default", "hover", "active", "disabled", "loading"]>;
export declare const ButtonSizeTokens: {
    readonly sm: {
        readonly height: 32;
        readonly paddingX: 12;
        readonly paddingY: 6;
        readonly fontSize: "0.875rem";
        readonly iconSize: 16;
        readonly gap: 6;
        readonly borderRadius: "4px";
    };
    readonly md: {
        readonly height: 40;
        readonly paddingX: 16;
        readonly paddingY: 8;
        readonly fontSize: "0.875rem";
        readonly iconSize: 18;
        readonly gap: 8;
        readonly borderRadius: "6px";
    };
    readonly lg: {
        readonly height: 48;
        readonly paddingX: 24;
        readonly paddingY: 12;
        readonly fontSize: "1rem";
        readonly iconSize: 20;
        readonly gap: 8;
        readonly borderRadius: "8px";
    };
};
export type ButtonSizeTokens = typeof ButtonSizeTokens;
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
export declare const ButtonVariantStyles: Record<ButtonVariant, ButtonVariantTokens>;
export declare const ButtonPropsSchema: z.ZodObject<{
    /** Visual variant */
    variant: z.ZodDefault<z.ZodEnum<["primary", "secondary", "ghost", "danger"]>>;
    /** Size preset */
    size: z.ZodDefault<z.ZodEnum<["sm", "md", "lg"]>>;
    /** Explicit state override (normally derived from interaction) */
    state: z.ZodOptional<z.ZodEnum<["default", "hover", "active", "disabled", "loading"]>>;
    /** Disable the button */
    disabled: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    /** Show loading spinner */
    loading: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    /** Render as full-width block */
    fullWidth: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    /** Leading icon identifier */
    iconLeft: z.ZodOptional<z.ZodString>;
    /** Trailing icon identifier */
    iconRight: z.ZodOptional<z.ZodString>;
    /** Accessible label when icon-only */
    ariaLabel: z.ZodOptional<z.ZodString>;
    /** Button type attribute */
    type: z.ZodDefault<z.ZodEnum<["button", "submit", "reset"]>>;
}, "strict", z.ZodTypeAny, {
    disabled: boolean;
    loading: boolean;
    variant: "primary" | "secondary" | "ghost" | "danger";
    size: "sm" | "md" | "lg";
    fullWidth: boolean;
    type: "button" | "submit" | "reset";
    state?: "default" | "hover" | "active" | "disabled" | "loading" | undefined;
    iconLeft?: string | undefined;
    iconRight?: string | undefined;
    ariaLabel?: string | undefined;
}, {
    disabled?: boolean | undefined;
    loading?: boolean | undefined;
    variant?: "primary" | "secondary" | "ghost" | "danger" | undefined;
    size?: "sm" | "md" | "lg" | undefined;
    state?: "default" | "hover" | "active" | "disabled" | "loading" | undefined;
    fullWidth?: boolean | undefined;
    iconLeft?: string | undefined;
    iconRight?: string | undefined;
    ariaLabel?: string | undefined;
    type?: "button" | "submit" | "reset" | undefined;
}>;
export type ButtonProps = z.infer<typeof ButtonPropsSchema>;
export declare const IconButtonPropsSchema: z.ZodObject<Omit<{
    variant: z.ZodDefault<z.ZodEnum<["primary", "secondary", "ghost", "danger"]>>;
    size: z.ZodDefault<z.ZodEnum<["sm", "md", "lg"]>>;
    state: z.ZodOptional<z.ZodEnum<["default", "hover", "active", "disabled", "loading"]>>;
    disabled: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    loading: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    fullWidth: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    iconLeft: z.ZodOptional<z.ZodString>;
    iconRight: z.ZodOptional<z.ZodString>;
    type: z.ZodDefault<z.ZodEnum<["button", "submit", "reset"]>>;
} & {
    icon: z.ZodString;
    ariaLabel: z.ZodString;
}, "iconLeft" | "iconRight">, "strict", z.ZodTypeAny, {
    disabled: boolean;
    loading: boolean;
    variant: "primary" | "secondary" | "ghost" | "danger";
    size: "sm" | "md" | "lg";
    fullWidth: boolean;
    ariaLabel: string;
    type: "button" | "submit" | "reset";
    icon: string;
    state?: "default" | "hover" | "active" | "disabled" | "loading" | undefined;
}, {
    ariaLabel: string;
    icon: string;
    disabled?: boolean | undefined;
    loading?: boolean | undefined;
    variant?: "primary" | "secondary" | "ghost" | "danger" | undefined;
    size?: "sm" | "md" | "lg" | undefined;
    state?: "default" | "hover" | "active" | "disabled" | "loading" | undefined;
    fullWidth?: boolean | undefined;
    type?: "button" | "submit" | "reset" | undefined;
}>;
export type IconButtonProps = z.infer<typeof IconButtonPropsSchema>;
export declare const ButtonGroupPropsSchema: z.ZodObject<{
    /** Orientation of the group */
    direction: z.ZodDefault<z.ZodEnum<["horizontal", "vertical"]>>;
    /** Gap between buttons (spacing token key) */
    gap: z.ZodDefault<z.ZodNumber>;
    /** Align buttons */
    align: z.ZodDefault<z.ZodEnum<["start", "center", "end", "stretch"]>>;
}, "strict", z.ZodTypeAny, {
    direction: "horizontal" | "vertical";
    gap: number;
    align: "start" | "center" | "end" | "stretch";
}, {
    direction?: "horizontal" | "vertical" | undefined;
    gap?: number | undefined;
    align?: "start" | "center" | "end" | "stretch" | undefined;
}>;
export type ButtonGroupProps = z.infer<typeof ButtonGroupPropsSchema>;
//# sourceMappingURL=buttons.d.ts.map