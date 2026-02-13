/**
 * UI-004: Modal / Dialog Specs
 *
 * Type definitions and Zod schemas for modals and dialogs, including
 * sizes, sections, close behavior, and overlay configuration.
 */
import { z } from "zod";
export declare const ModalSizes: readonly ["sm", "md", "lg", "fullscreen"];
export type ModalSize = (typeof ModalSizes)[number];
export declare const ModalSizeSchema: z.ZodEnum<["sm", "md", "lg", "fullscreen"]>;
export declare const ModalSizeTokens: {
    readonly sm: {
        readonly width: 400;
        readonly maxHeight: "70vh";
    };
    readonly md: {
        readonly width: 560;
        readonly maxHeight: "80vh";
    };
    readonly lg: {
        readonly width: 800;
        readonly maxHeight: "90vh";
    };
    readonly fullscreen: {
        readonly width: "100vw";
        readonly maxHeight: "100vh";
    };
};
export type ModalSizeTokens = typeof ModalSizeTokens;
export declare const CloseBehaviorSchema: z.ZodObject<{
    /** Show close (X) button in the header */
    showCloseButton: z.ZodDefault<z.ZodBoolean>;
    /** Close when overlay/backdrop is clicked */
    closeOnOverlayClick: z.ZodDefault<z.ZodBoolean>;
    /** Close when Escape key is pressed */
    closeOnEscape: z.ZodDefault<z.ZodBoolean>;
    /** Require explicit confirmation before closing (e.g. unsaved changes) */
    confirmBeforeClose: z.ZodDefault<z.ZodBoolean>;
    /** Confirmation message if confirmBeforeClose is true */
    confirmMessage: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    showCloseButton: boolean;
    closeOnOverlayClick: boolean;
    closeOnEscape: boolean;
    confirmBeforeClose: boolean;
    confirmMessage?: string | undefined;
}, {
    showCloseButton?: boolean | undefined;
    closeOnOverlayClick?: boolean | undefined;
    closeOnEscape?: boolean | undefined;
    confirmBeforeClose?: boolean | undefined;
    confirmMessage?: string | undefined;
}>;
export type CloseBehavior = z.infer<typeof CloseBehaviorSchema>;
export declare const OverlayConfigSchema: z.ZodObject<{
    /** Overlay background color */
    backgroundColor: z.ZodDefault<z.ZodString>;
    /** Blur the content behind the overlay */
    backdropBlur: z.ZodDefault<z.ZodBoolean>;
    /** Blur amount (CSS value) */
    blurAmount: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    /** Overlay z-index */
    zIndex: z.ZodDefault<z.ZodNumber>;
}, "strict", z.ZodTypeAny, {
    backgroundColor: string;
    backdropBlur: boolean;
    blurAmount: string;
    zIndex: number;
}, {
    backgroundColor?: string | undefined;
    backdropBlur?: boolean | undefined;
    blurAmount?: string | undefined;
    zIndex?: number | undefined;
}>;
export type OverlayConfig = z.infer<typeof OverlayConfigSchema>;
export declare const ModalHeaderSchema: z.ZodObject<{
    /** Title text */
    title: z.ZodString;
    /** Optional subtitle / description */
    subtitle: z.ZodOptional<z.ZodString>;
    /** Optional icon identifier */
    icon: z.ZodOptional<z.ZodString>;
    /** Show a divider below the header */
    showDivider: z.ZodDefault<z.ZodBoolean>;
}, "strict", z.ZodTypeAny, {
    title: string;
    showDivider: boolean;
    icon?: string | undefined;
    subtitle?: string | undefined;
}, {
    title: string;
    icon?: string | undefined;
    subtitle?: string | undefined;
    showDivider?: boolean | undefined;
}>;
export type ModalHeader = z.infer<typeof ModalHeaderSchema>;
export declare const ModalFooterActionSchema: z.ZodObject<{
    label: z.ZodString;
    variant: z.ZodDefault<z.ZodEnum<["primary", "secondary", "ghost", "danger"]>>;
    disabled: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    loading: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    /** Action identifier for event handling */
    actionId: z.ZodString;
}, "strict", z.ZodTypeAny, {
    disabled: boolean;
    loading: boolean;
    variant: "primary" | "secondary" | "ghost" | "danger";
    label: string;
    actionId: string;
}, {
    label: string;
    actionId: string;
    disabled?: boolean | undefined;
    loading?: boolean | undefined;
    variant?: "primary" | "secondary" | "ghost" | "danger" | undefined;
}>;
export type ModalFooterAction = z.infer<typeof ModalFooterActionSchema>;
export declare const ModalFooterSchema: z.ZodObject<{
    /** Alignment of footer actions */
    alignment: z.ZodDefault<z.ZodEnum<["left", "center", "right", "space-between"]>>;
    /** Footer actions (buttons) */
    actions: z.ZodDefault<z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        variant: z.ZodDefault<z.ZodEnum<["primary", "secondary", "ghost", "danger"]>>;
        disabled: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        loading: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        /** Action identifier for event handling */
        actionId: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        disabled: boolean;
        loading: boolean;
        variant: "primary" | "secondary" | "ghost" | "danger";
        label: string;
        actionId: string;
    }, {
        label: string;
        actionId: string;
        disabled?: boolean | undefined;
        loading?: boolean | undefined;
        variant?: "primary" | "secondary" | "ghost" | "danger" | undefined;
    }>, "many">>;
    /** Show a divider above the footer */
    showDivider: z.ZodDefault<z.ZodBoolean>;
}, "strict", z.ZodTypeAny, {
    showDivider: boolean;
    alignment: "center" | "left" | "right" | "space-between";
    actions: {
        disabled: boolean;
        loading: boolean;
        variant: "primary" | "secondary" | "ghost" | "danger";
        label: string;
        actionId: string;
    }[];
}, {
    showDivider?: boolean | undefined;
    alignment?: "center" | "left" | "right" | "space-between" | undefined;
    actions?: {
        label: string;
        actionId: string;
        disabled?: boolean | undefined;
        loading?: boolean | undefined;
        variant?: "primary" | "secondary" | "ghost" | "danger" | undefined;
    }[] | undefined;
}>;
export type ModalFooter = z.infer<typeof ModalFooterSchema>;
export declare const ModalBodySchema: z.ZodObject<{
    /** Enable body scrolling when content overflows */
    scrollable: z.ZodDefault<z.ZodBoolean>;
    /** Padding inside the body */
    padding: z.ZodDefault<z.ZodNumber>;
    /** Minimum height of the body */
    minHeight: z.ZodOptional<z.ZodNumber>;
}, "strict", z.ZodTypeAny, {
    padding: number;
    scrollable: boolean;
    minHeight?: number | undefined;
}, {
    padding?: number | undefined;
    scrollable?: boolean | undefined;
    minHeight?: number | undefined;
}>;
export type ModalBody = z.infer<typeof ModalBodySchema>;
export declare const ModalPropsSchema: z.ZodObject<{
    /** Modal size preset */
    size: z.ZodDefault<z.ZodEnum<["sm", "md", "lg", "fullscreen"]>>;
    /** Whether the modal is currently open */
    open: z.ZodDefault<z.ZodBoolean>;
    /** Header configuration */
    header: z.ZodOptional<z.ZodObject<{
        /** Title text */
        title: z.ZodString;
        /** Optional subtitle / description */
        subtitle: z.ZodOptional<z.ZodString>;
        /** Optional icon identifier */
        icon: z.ZodOptional<z.ZodString>;
        /** Show a divider below the header */
        showDivider: z.ZodDefault<z.ZodBoolean>;
    }, "strict", z.ZodTypeAny, {
        title: string;
        showDivider: boolean;
        icon?: string | undefined;
        subtitle?: string | undefined;
    }, {
        title: string;
        icon?: string | undefined;
        subtitle?: string | undefined;
        showDivider?: boolean | undefined;
    }>>;
    /** Body configuration */
    body: z.ZodOptional<z.ZodObject<{
        /** Enable body scrolling when content overflows */
        scrollable: z.ZodDefault<z.ZodBoolean>;
        /** Padding inside the body */
        padding: z.ZodDefault<z.ZodNumber>;
        /** Minimum height of the body */
        minHeight: z.ZodOptional<z.ZodNumber>;
    }, "strict", z.ZodTypeAny, {
        padding: number;
        scrollable: boolean;
        minHeight?: number | undefined;
    }, {
        padding?: number | undefined;
        scrollable?: boolean | undefined;
        minHeight?: number | undefined;
    }>>;
    /** Footer configuration */
    footer: z.ZodOptional<z.ZodObject<{
        /** Alignment of footer actions */
        alignment: z.ZodDefault<z.ZodEnum<["left", "center", "right", "space-between"]>>;
        /** Footer actions (buttons) */
        actions: z.ZodDefault<z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            variant: z.ZodDefault<z.ZodEnum<["primary", "secondary", "ghost", "danger"]>>;
            disabled: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
            loading: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
            /** Action identifier for event handling */
            actionId: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            disabled: boolean;
            loading: boolean;
            variant: "primary" | "secondary" | "ghost" | "danger";
            label: string;
            actionId: string;
        }, {
            label: string;
            actionId: string;
            disabled?: boolean | undefined;
            loading?: boolean | undefined;
            variant?: "primary" | "secondary" | "ghost" | "danger" | undefined;
        }>, "many">>;
        /** Show a divider above the footer */
        showDivider: z.ZodDefault<z.ZodBoolean>;
    }, "strict", z.ZodTypeAny, {
        showDivider: boolean;
        alignment: "center" | "left" | "right" | "space-between";
        actions: {
            disabled: boolean;
            loading: boolean;
            variant: "primary" | "secondary" | "ghost" | "danger";
            label: string;
            actionId: string;
        }[];
    }, {
        showDivider?: boolean | undefined;
        alignment?: "center" | "left" | "right" | "space-between" | undefined;
        actions?: {
            label: string;
            actionId: string;
            disabled?: boolean | undefined;
            loading?: boolean | undefined;
            variant?: "primary" | "secondary" | "ghost" | "danger" | undefined;
        }[] | undefined;
    }>>;
    /** Close behavior configuration */
    closeBehavior: z.ZodOptional<z.ZodObject<{
        /** Show close (X) button in the header */
        showCloseButton: z.ZodDefault<z.ZodBoolean>;
        /** Close when overlay/backdrop is clicked */
        closeOnOverlayClick: z.ZodDefault<z.ZodBoolean>;
        /** Close when Escape key is pressed */
        closeOnEscape: z.ZodDefault<z.ZodBoolean>;
        /** Require explicit confirmation before closing (e.g. unsaved changes) */
        confirmBeforeClose: z.ZodDefault<z.ZodBoolean>;
        /** Confirmation message if confirmBeforeClose is true */
        confirmMessage: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        showCloseButton: boolean;
        closeOnOverlayClick: boolean;
        closeOnEscape: boolean;
        confirmBeforeClose: boolean;
        confirmMessage?: string | undefined;
    }, {
        showCloseButton?: boolean | undefined;
        closeOnOverlayClick?: boolean | undefined;
        closeOnEscape?: boolean | undefined;
        confirmBeforeClose?: boolean | undefined;
        confirmMessage?: string | undefined;
    }>>;
    /** Overlay configuration */
    overlay: z.ZodOptional<z.ZodObject<{
        /** Overlay background color */
        backgroundColor: z.ZodDefault<z.ZodString>;
        /** Blur the content behind the overlay */
        backdropBlur: z.ZodDefault<z.ZodBoolean>;
        /** Blur amount (CSS value) */
        blurAmount: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        /** Overlay z-index */
        zIndex: z.ZodDefault<z.ZodNumber>;
    }, "strict", z.ZodTypeAny, {
        backgroundColor: string;
        backdropBlur: boolean;
        blurAmount: string;
        zIndex: number;
    }, {
        backgroundColor?: string | undefined;
        backdropBlur?: boolean | undefined;
        blurAmount?: string | undefined;
        zIndex?: number | undefined;
    }>>;
    /** Trap focus within the modal */
    trapFocus: z.ZodDefault<z.ZodBoolean>;
    /** Prevent body scroll when modal is open */
    preventBodyScroll: z.ZodDefault<z.ZodBoolean>;
    /** Animation type */
    animation: z.ZodDefault<z.ZodEnum<["fade", "slide-up", "scale", "none"]>>;
    /** Animation duration in ms */
    animationDuration: z.ZodDefault<z.ZodNumber>;
    /** Role for accessibility */
    role: z.ZodDefault<z.ZodEnum<["dialog", "alertdialog"]>>;
    /** Accessible label */
    ariaLabel: z.ZodOptional<z.ZodString>;
    /** Nested modals: stack level */
    stackLevel: z.ZodDefault<z.ZodNumber>;
}, "strict", z.ZodTypeAny, {
    size: "sm" | "md" | "lg" | "fullscreen";
    animationDuration: number;
    open: boolean;
    trapFocus: boolean;
    preventBodyScroll: boolean;
    animation: "none" | "fade" | "slide-up" | "scale";
    role: "dialog" | "alertdialog";
    stackLevel: number;
    ariaLabel?: string | undefined;
    overlay?: {
        backgroundColor: string;
        backdropBlur: boolean;
        blurAmount: string;
        zIndex: number;
    } | undefined;
    header?: {
        title: string;
        showDivider: boolean;
        icon?: string | undefined;
        subtitle?: string | undefined;
    } | undefined;
    body?: {
        padding: number;
        scrollable: boolean;
        minHeight?: number | undefined;
    } | undefined;
    footer?: {
        showDivider: boolean;
        alignment: "center" | "left" | "right" | "space-between";
        actions: {
            disabled: boolean;
            loading: boolean;
            variant: "primary" | "secondary" | "ghost" | "danger";
            label: string;
            actionId: string;
        }[];
    } | undefined;
    closeBehavior?: {
        showCloseButton: boolean;
        closeOnOverlayClick: boolean;
        closeOnEscape: boolean;
        confirmBeforeClose: boolean;
        confirmMessage?: string | undefined;
    } | undefined;
}, {
    size?: "sm" | "md" | "lg" | "fullscreen" | undefined;
    ariaLabel?: string | undefined;
    overlay?: {
        backgroundColor?: string | undefined;
        backdropBlur?: boolean | undefined;
        blurAmount?: string | undefined;
        zIndex?: number | undefined;
    } | undefined;
    header?: {
        title: string;
        icon?: string | undefined;
        subtitle?: string | undefined;
        showDivider?: boolean | undefined;
    } | undefined;
    body?: {
        padding?: number | undefined;
        scrollable?: boolean | undefined;
        minHeight?: number | undefined;
    } | undefined;
    footer?: {
        showDivider?: boolean | undefined;
        alignment?: "center" | "left" | "right" | "space-between" | undefined;
        actions?: {
            label: string;
            actionId: string;
            disabled?: boolean | undefined;
            loading?: boolean | undefined;
            variant?: "primary" | "secondary" | "ghost" | "danger" | undefined;
        }[] | undefined;
    } | undefined;
    animationDuration?: number | undefined;
    open?: boolean | undefined;
    closeBehavior?: {
        showCloseButton?: boolean | undefined;
        closeOnOverlayClick?: boolean | undefined;
        closeOnEscape?: boolean | undefined;
        confirmBeforeClose?: boolean | undefined;
        confirmMessage?: string | undefined;
    } | undefined;
    trapFocus?: boolean | undefined;
    preventBodyScroll?: boolean | undefined;
    animation?: "none" | "fade" | "slide-up" | "scale" | undefined;
    role?: "dialog" | "alertdialog" | undefined;
    stackLevel?: number | undefined;
}>;
export type ModalProps = z.infer<typeof ModalPropsSchema>;
export declare const ConfirmDialogPropsSchema: z.ZodObject<{
    title: z.ZodString;
    message: z.ZodString;
    confirmLabel: z.ZodDefault<z.ZodString>;
    cancelLabel: z.ZodDefault<z.ZodString>;
    variant: z.ZodDefault<z.ZodEnum<["info", "warning", "danger"]>>;
    size: z.ZodDefault<z.ZodEnum<["sm", "md", "lg", "fullscreen"]>>;
}, "strict", z.ZodTypeAny, {
    variant: "danger" | "warning" | "info";
    size: "sm" | "md" | "lg" | "fullscreen";
    message: string;
    title: string;
    confirmLabel: string;
    cancelLabel: string;
}, {
    message: string;
    title: string;
    variant?: "danger" | "warning" | "info" | undefined;
    size?: "sm" | "md" | "lg" | "fullscreen" | undefined;
    confirmLabel?: string | undefined;
    cancelLabel?: string | undefined;
}>;
export type ConfirmDialogProps = z.infer<typeof ConfirmDialogPropsSchema>;
//# sourceMappingURL=modals.d.ts.map