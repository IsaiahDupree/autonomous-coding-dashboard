/**
 * UI-008: Loading State Specs
 *
 * Type definitions and Zod schemas for skeleton screens, spinners,
 * progress bars, and shimmer effects.
 */
import { z } from "zod";
export declare const SkeletonShapes: readonly ["rectangle", "circle", "text-line", "text-block", "avatar", "thumbnail", "button", "input", "card", "table-row"];
export type SkeletonShape = (typeof SkeletonShapes)[number];
export declare const SkeletonShapeSchema: z.ZodEnum<["rectangle", "circle", "text-line", "text-block", "avatar", "thumbnail", "button", "input", "card", "table-row"]>;
export declare const SkeletonPropsSchema: z.ZodObject<{
    /** Shape preset */
    shape: z.ZodEnum<["rectangle", "circle", "text-line", "text-block", "avatar", "thumbnail", "button", "input", "card", "table-row"]>;
    /** Width (CSS value) */
    width: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
    /** Height (CSS value) */
    height: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
    /** Border radius override */
    borderRadius: z.ZodOptional<z.ZodString>;
    /** Enable animation */
    animate: z.ZodDefault<z.ZodBoolean>;
    /** Number of lines (for text-block) */
    lines: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    /** Line spacing (for text-block, px) */
    lineSpacing: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    /** Last line width percentage (for text-block) */
    lastLineWidth: z.ZodDefault<z.ZodOptional<z.ZodString>>;
}, "strict", z.ZodTypeAny, {
    shape: "button" | "avatar" | "circle" | "rectangle" | "text-line" | "text-block" | "thumbnail" | "input" | "card" | "table-row";
    animate: boolean;
    lines: number;
    lineSpacing: number;
    lastLineWidth: string;
    height?: string | number | undefined;
    borderRadius?: string | undefined;
    width?: string | number | undefined;
}, {
    shape: "button" | "avatar" | "circle" | "rectangle" | "text-line" | "text-block" | "thumbnail" | "input" | "card" | "table-row";
    height?: string | number | undefined;
    borderRadius?: string | undefined;
    width?: string | number | undefined;
    animate?: boolean | undefined;
    lines?: number | undefined;
    lineSpacing?: number | undefined;
    lastLineWidth?: string | undefined;
}>;
export type SkeletonProps = z.infer<typeof SkeletonPropsSchema>;
/** Preset dimensions for skeleton shapes */
export declare const SkeletonPresets: {
    readonly rectangle: {
        readonly width: "100%";
        readonly height: 120;
        readonly borderRadius: "6px";
    };
    readonly circle: {
        readonly width: 48;
        readonly height: 48;
        readonly borderRadius: "50%";
    };
    readonly "text-line": {
        readonly width: "100%";
        readonly height: 16;
        readonly borderRadius: "4px";
    };
    readonly "text-block": {
        readonly width: "100%";
        readonly height: 64;
        readonly borderRadius: "4px";
    };
    readonly avatar: {
        readonly width: 40;
        readonly height: 40;
        readonly borderRadius: "50%";
    };
    readonly thumbnail: {
        readonly width: 80;
        readonly height: 80;
        readonly borderRadius: "8px";
    };
    readonly button: {
        readonly width: 120;
        readonly height: 40;
        readonly borderRadius: "6px";
    };
    readonly input: {
        readonly width: "100%";
        readonly height: 40;
        readonly borderRadius: "6px";
    };
    readonly card: {
        readonly width: "100%";
        readonly height: 200;
        readonly borderRadius: "8px";
    };
    readonly "table-row": {
        readonly width: "100%";
        readonly height: 48;
        readonly borderRadius: "0px";
    };
};
export type SkeletonPresets = typeof SkeletonPresets;
export declare const SpinnerSizes: readonly ["xs", "sm", "md", "lg", "xl"];
export type SpinnerSize = (typeof SpinnerSizes)[number];
export declare const SpinnerSizeSchema: z.ZodEnum<["xs", "sm", "md", "lg", "xl"]>;
export declare const SpinnerSizeTokens: {
    readonly xs: {
        readonly diameter: 16;
        readonly strokeWidth: 2;
    };
    readonly sm: {
        readonly diameter: 24;
        readonly strokeWidth: 2;
    };
    readonly md: {
        readonly diameter: 32;
        readonly strokeWidth: 3;
    };
    readonly lg: {
        readonly diameter: 48;
        readonly strokeWidth: 3;
    };
    readonly xl: {
        readonly diameter: 64;
        readonly strokeWidth: 4;
    };
};
export type SpinnerSizeTokens = typeof SpinnerSizeTokens;
export declare const SpinnerPropsSchema: z.ZodObject<{
    /** Size preset */
    size: z.ZodDefault<z.ZodEnum<["xs", "sm", "md", "lg", "xl"]>>;
    /** Color (CSS value) */
    color: z.ZodDefault<z.ZodString>;
    /** Track color */
    trackColor: z.ZodDefault<z.ZodString>;
    /** Animation speed (ms for full rotation) */
    speed: z.ZodDefault<z.ZodNumber>;
    /** Accessible label */
    label: z.ZodDefault<z.ZodString>;
    /** Spinner style */
    variant: z.ZodDefault<z.ZodEnum<["circular", "dots", "bars"]>>;
}, "strict", z.ZodTypeAny, {
    variant: "circular" | "dots" | "bars";
    size: "sm" | "md" | "lg" | "xs" | "xl";
    label: string;
    color: string;
    trackColor: string;
    speed: number;
}, {
    variant?: "circular" | "dots" | "bars" | undefined;
    size?: "sm" | "md" | "lg" | "xs" | "xl" | undefined;
    label?: string | undefined;
    color?: string | undefined;
    trackColor?: string | undefined;
    speed?: number | undefined;
}>;
export type SpinnerProps = z.infer<typeof SpinnerPropsSchema>;
export declare const ProgressBarPropsSchema: z.ZodObject<{
    /** Current value (0-100) */
    value: z.ZodNumber;
    /** Maximum value */
    max: z.ZodDefault<z.ZodNumber>;
    /** Show percentage label */
    showLabel: z.ZodDefault<z.ZodBoolean>;
    /** Label format: "percentage" shows "75%", "fraction" shows "75/100" */
    labelFormat: z.ZodDefault<z.ZodEnum<["percentage", "fraction", "custom"]>>;
    /** Custom label */
    customLabel: z.ZodOptional<z.ZodString>;
    /** Size (height) */
    size: z.ZodDefault<z.ZodEnum<["xs", "sm", "md", "lg"]>>;
    /** Color / variant */
    variant: z.ZodDefault<z.ZodEnum<["default", "success", "warning", "error", "info", "gradient"]>>;
    /** Bar color (overrides variant) */
    color: z.ZodOptional<z.ZodString>;
    /** Track color */
    trackColor: z.ZodDefault<z.ZodString>;
    /** Stripe animation for indeterminate state */
    indeterminate: z.ZodDefault<z.ZodBoolean>;
    /** Enable animated transition on value change */
    animated: z.ZodDefault<z.ZodBoolean>;
    /** Border radius */
    borderRadius: z.ZodDefault<z.ZodString>;
    /** Accessible label */
    ariaLabel: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    variant: "default" | "warning" | "info" | "success" | "error" | "gradient";
    size: "sm" | "md" | "lg" | "xs";
    value: number;
    borderRadius: string;
    max: number;
    animated: boolean;
    trackColor: string;
    showLabel: boolean;
    labelFormat: "custom" | "percentage" | "fraction";
    indeterminate: boolean;
    ariaLabel?: string | undefined;
    color?: string | undefined;
    customLabel?: string | undefined;
}, {
    value: number;
    variant?: "default" | "warning" | "info" | "success" | "error" | "gradient" | undefined;
    size?: "sm" | "md" | "lg" | "xs" | undefined;
    ariaLabel?: string | undefined;
    borderRadius?: string | undefined;
    max?: number | undefined;
    color?: string | undefined;
    animated?: boolean | undefined;
    trackColor?: string | undefined;
    showLabel?: boolean | undefined;
    labelFormat?: "custom" | "percentage" | "fraction" | undefined;
    customLabel?: string | undefined;
    indeterminate?: boolean | undefined;
}>;
export type ProgressBarProps = z.infer<typeof ProgressBarPropsSchema>;
export declare const ProgressBarSizeTokens: {
    readonly xs: {
        readonly height: 2;
    };
    readonly sm: {
        readonly height: 4;
    };
    readonly md: {
        readonly height: 8;
    };
    readonly lg: {
        readonly height: 12;
    };
};
export type ProgressBarSizeTokens = typeof ProgressBarSizeTokens;
export declare const ShimmerConfigSchema: z.ZodObject<{
    /** Enable shimmer effect */
    enabled: z.ZodDefault<z.ZodBoolean>;
    /** Base color */
    baseColor: z.ZodDefault<z.ZodString>;
    /** Highlight color */
    highlightColor: z.ZodDefault<z.ZodString>;
    /** Animation duration (ms) */
    duration: z.ZodDefault<z.ZodNumber>;
    /** Animation direction */
    direction: z.ZodDefault<z.ZodEnum<["left-to-right", "right-to-left", "top-to-bottom"]>>;
    /** Delay between animation cycles (ms) */
    delay: z.ZodDefault<z.ZodNumber>;
    /** Gradient angle (degrees) */
    angle: z.ZodDefault<z.ZodNumber>;
}, "strict", z.ZodTypeAny, {
    direction: "left-to-right" | "right-to-left" | "top-to-bottom";
    enabled: boolean;
    duration: number;
    baseColor: string;
    highlightColor: string;
    delay: number;
    angle: number;
}, {
    direction?: "left-to-right" | "right-to-left" | "top-to-bottom" | undefined;
    enabled?: boolean | undefined;
    duration?: number | undefined;
    baseColor?: string | undefined;
    highlightColor?: string | undefined;
    delay?: number | undefined;
    angle?: number | undefined;
}>;
export type ShimmerConfig = z.infer<typeof ShimmerConfigSchema>;
export declare const LoadingStateSchema: z.ZodObject<{
    /** Current loading status */
    status: z.ZodEnum<["idle", "loading", "success", "error"]>;
    /** Type of loading indicator to show */
    indicator: z.ZodDefault<z.ZodEnum<["spinner", "skeleton", "progress", "shimmer", "none"]>>;
    /** Optional message */
    message: z.ZodOptional<z.ZodString>;
    /** Show overlay on existing content */
    overlay: z.ZodDefault<z.ZodBoolean>;
    /** Overlay opacity */
    overlayOpacity: z.ZodDefault<z.ZodNumber>;
    /** Minimum display time to avoid flash (ms) */
    minDisplayTime: z.ZodDefault<z.ZodNumber>;
    /** Delay before showing loader to avoid flash for fast loads (ms) */
    showDelay: z.ZodDefault<z.ZodNumber>;
}, "strict", z.ZodTypeAny, {
    status: "loading" | "idle" | "success" | "error";
    overlay: boolean;
    indicator: "none" | "spinner" | "skeleton" | "progress" | "shimmer";
    overlayOpacity: number;
    minDisplayTime: number;
    showDelay: number;
    message?: string | undefined;
}, {
    status: "loading" | "idle" | "success" | "error";
    message?: string | undefined;
    overlay?: boolean | undefined;
    indicator?: "none" | "spinner" | "skeleton" | "progress" | "shimmer" | undefined;
    overlayOpacity?: number | undefined;
    minDisplayTime?: number | undefined;
    showDelay?: number | undefined;
}>;
export type LoadingState = z.infer<typeof LoadingStateSchema>;
export declare const LoadingLayoutSchema: z.ZodObject<{
    /** Layout type */
    layout: z.ZodDefault<z.ZodEnum<["centered", "top-bar", "inline", "overlay"]>>;
    /** Content to show alongside the loader */
    content: z.ZodDefault<z.ZodEnum<["spinner-only", "spinner-message", "skeleton", "progress"]>>;
    /** Full page or contained */
    fullPage: z.ZodDefault<z.ZodBoolean>;
}, "strict", z.ZodTypeAny, {
    layout: "overlay" | "centered" | "top-bar" | "inline";
    content: "skeleton" | "progress" | "spinner-only" | "spinner-message";
    fullPage: boolean;
}, {
    layout?: "overlay" | "centered" | "top-bar" | "inline" | undefined;
    content?: "skeleton" | "progress" | "spinner-only" | "spinner-message" | undefined;
    fullPage?: boolean | undefined;
}>;
export type LoadingLayout = z.infer<typeof LoadingLayoutSchema>;
//# sourceMappingURL=loading.d.ts.map