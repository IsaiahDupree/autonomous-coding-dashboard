/**
 * UI-006: Toast / Notification Specs
 *
 * Type definitions and Zod schemas for toast notifications, including
 * variants, positioning, auto-dismiss, and action buttons.
 */
import { z } from "zod";
export declare const ToastVariants: readonly ["success", "error", "warning", "info"];
export type ToastVariant = (typeof ToastVariants)[number];
export declare const ToastVariantSchema: z.ZodEnum<["success", "error", "warning", "info"]>;
export declare const ToastPositions: readonly ["top-left", "top-center", "top-right", "bottom-left", "bottom-center", "bottom-right"];
export type ToastPosition = (typeof ToastPositions)[number];
export declare const ToastPositionSchema: z.ZodEnum<["top-left", "top-center", "top-right", "bottom-left", "bottom-center", "bottom-right"]>;
export interface ToastVariantStyle {
    backgroundColor: string;
    borderColor: string;
    iconColor: string;
    textColor: string;
    icon: string;
}
export declare const ToastVariantStyles: Record<ToastVariant, ToastVariantStyle>;
export declare const ToastActionSchema: z.ZodObject<{
    /** Button label */
    label: z.ZodString;
    /** Action identifier (for event handling) */
    actionId: z.ZodString;
    /** Whether clicking the action dismisses the toast */
    dismissOnClick: z.ZodDefault<z.ZodBoolean>;
}, "strict", z.ZodTypeAny, {
    label: string;
    actionId: string;
    dismissOnClick: boolean;
}, {
    label: string;
    actionId: string;
    dismissOnClick?: boolean | undefined;
}>;
export type ToastAction = z.infer<typeof ToastActionSchema>;
export declare const AutoDismissConfigSchema: z.ZodObject<{
    /** Enable auto-dismiss */
    enabled: z.ZodDefault<z.ZodBoolean>;
    /** Dismiss after this many milliseconds */
    durationMs: z.ZodDefault<z.ZodNumber>;
    /** Pause auto-dismiss on hover */
    pauseOnHover: z.ZodDefault<z.ZodBoolean>;
    /** Pause auto-dismiss when window loses focus */
    pauseOnFocusLoss: z.ZodDefault<z.ZodBoolean>;
    /** Show countdown progress bar */
    showProgress: z.ZodDefault<z.ZodBoolean>;
}, "strict", z.ZodTypeAny, {
    enabled: boolean;
    durationMs: number;
    pauseOnHover: boolean;
    pauseOnFocusLoss: boolean;
    showProgress: boolean;
}, {
    enabled?: boolean | undefined;
    durationMs?: number | undefined;
    pauseOnHover?: boolean | undefined;
    pauseOnFocusLoss?: boolean | undefined;
    showProgress?: boolean | undefined;
}>;
export type AutoDismissConfig = z.infer<typeof AutoDismissConfigSchema>;
/** Sensible defaults per variant */
export declare const DefaultAutoDismissDurations: Record<ToastVariant, number>;
export declare const ToastPropsSchema: z.ZodObject<{
    /** Unique toast identifier */
    id: z.ZodString;
    /** Variant */
    variant: z.ZodEnum<["success", "error", "warning", "info"]>;
    /** Title (bold first line) */
    title: z.ZodString;
    /** Body message */
    message: z.ZodOptional<z.ZodString>;
    /** Action button */
    action: z.ZodOptional<z.ZodObject<{
        /** Button label */
        label: z.ZodString;
        /** Action identifier (for event handling) */
        actionId: z.ZodString;
        /** Whether clicking the action dismisses the toast */
        dismissOnClick: z.ZodDefault<z.ZodBoolean>;
    }, "strict", z.ZodTypeAny, {
        label: string;
        actionId: string;
        dismissOnClick: boolean;
    }, {
        label: string;
        actionId: string;
        dismissOnClick?: boolean | undefined;
    }>>;
    /** Auto-dismiss configuration */
    autoDismiss: z.ZodOptional<z.ZodObject<{
        /** Enable auto-dismiss */
        enabled: z.ZodDefault<z.ZodBoolean>;
        /** Dismiss after this many milliseconds */
        durationMs: z.ZodDefault<z.ZodNumber>;
        /** Pause auto-dismiss on hover */
        pauseOnHover: z.ZodDefault<z.ZodBoolean>;
        /** Pause auto-dismiss when window loses focus */
        pauseOnFocusLoss: z.ZodDefault<z.ZodBoolean>;
        /** Show countdown progress bar */
        showProgress: z.ZodDefault<z.ZodBoolean>;
    }, "strict", z.ZodTypeAny, {
        enabled: boolean;
        durationMs: number;
        pauseOnHover: boolean;
        pauseOnFocusLoss: boolean;
        showProgress: boolean;
    }, {
        enabled?: boolean | undefined;
        durationMs?: number | undefined;
        pauseOnHover?: boolean | undefined;
        pauseOnFocusLoss?: boolean | undefined;
        showProgress?: boolean | undefined;
    }>>;
    /** Allow manual dismiss via close button */
    dismissible: z.ZodDefault<z.ZodBoolean>;
    /** Custom icon (overrides variant default) */
    icon: z.ZodOptional<z.ZodString>;
    /** Timestamp */
    createdAt: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    variant: "warning" | "info" | "success" | "error";
    title: string;
    id: string;
    dismissible: boolean;
    message?: string | undefined;
    icon?: string | undefined;
    action?: {
        label: string;
        actionId: string;
        dismissOnClick: boolean;
    } | undefined;
    autoDismiss?: {
        enabled: boolean;
        durationMs: number;
        pauseOnHover: boolean;
        pauseOnFocusLoss: boolean;
        showProgress: boolean;
    } | undefined;
    createdAt?: string | undefined;
}, {
    variant: "warning" | "info" | "success" | "error";
    title: string;
    id: string;
    message?: string | undefined;
    icon?: string | undefined;
    action?: {
        label: string;
        actionId: string;
        dismissOnClick?: boolean | undefined;
    } | undefined;
    autoDismiss?: {
        enabled?: boolean | undefined;
        durationMs?: number | undefined;
        pauseOnHover?: boolean | undefined;
        pauseOnFocusLoss?: boolean | undefined;
        showProgress?: boolean | undefined;
    } | undefined;
    dismissible?: boolean | undefined;
    createdAt?: string | undefined;
}>;
export type ToastProps = z.infer<typeof ToastPropsSchema>;
export declare const ToastContainerConfigSchema: z.ZodObject<{
    /** Default position for new toasts */
    position: z.ZodDefault<z.ZodEnum<["top-left", "top-center", "top-right", "bottom-left", "bottom-center", "bottom-right"]>>;
    /** Maximum visible toasts at a time */
    maxVisible: z.ZodDefault<z.ZodNumber>;
    /** Gap between toasts (px) */
    gap: z.ZodDefault<z.ZodNumber>;
    /** Offset from viewport edge (px) */
    offset: z.ZodDefault<z.ZodObject<{
        x: z.ZodDefault<z.ZodNumber>;
        y: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        x: number;
        y: number;
    }, {
        x?: number | undefined;
        y?: number | undefined;
    }>>;
    /** Stack direction */
    stackDirection: z.ZodDefault<z.ZodEnum<["up", "down"]>>;
    /** Animation type */
    animation: z.ZodDefault<z.ZodEnum<["slide", "fade", "pop", "none"]>>;
    /** Animation duration in ms */
    animationDuration: z.ZodDefault<z.ZodNumber>;
    /** Enable swipe-to-dismiss on touch */
    swipeToDismiss: z.ZodDefault<z.ZodBoolean>;
    /** Enable grouping of duplicate toasts */
    groupDuplicates: z.ZodDefault<z.ZodBoolean>;
    /** Z-index */
    zIndex: z.ZodDefault<z.ZodNumber>;
}, "strict", z.ZodTypeAny, {
    gap: number;
    position: "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right";
    animationDuration: number;
    zIndex: number;
    animation: "none" | "pop" | "fade" | "slide";
    maxVisible: number;
    offset: {
        x: number;
        y: number;
    };
    stackDirection: "up" | "down";
    swipeToDismiss: boolean;
    groupDuplicates: boolean;
}, {
    gap?: number | undefined;
    position?: "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right" | undefined;
    animationDuration?: number | undefined;
    zIndex?: number | undefined;
    animation?: "none" | "pop" | "fade" | "slide" | undefined;
    maxVisible?: number | undefined;
    offset?: {
        x?: number | undefined;
        y?: number | undefined;
    } | undefined;
    stackDirection?: "up" | "down" | undefined;
    swipeToDismiss?: boolean | undefined;
    groupDuplicates?: boolean | undefined;
}>;
export type ToastContainerConfig = z.infer<typeof ToastContainerConfigSchema>;
//# sourceMappingURL=toasts.d.ts.map