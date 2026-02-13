"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfirmDialogPropsSchema = exports.ModalPropsSchema = exports.ModalBodySchema = exports.ModalFooterSchema = exports.ModalFooterActionSchema = exports.ModalHeaderSchema = exports.OverlayConfigSchema = exports.CloseBehaviorSchema = exports.ModalSizeTokens = exports.ModalSizeSchema = exports.ModalSizes = void 0;
/**
 * UI-004: Modal / Dialog Specs
 *
 * Type definitions and Zod schemas for modals and dialogs, including
 * sizes, sections, close behavior, and overlay configuration.
 */
const zod_1 = require("zod");
// ---------------------------------------------------------------------------
// Modal Size
// ---------------------------------------------------------------------------
exports.ModalSizes = ["sm", "md", "lg", "fullscreen"];
exports.ModalSizeSchema = zod_1.z.enum(exports.ModalSizes);
exports.ModalSizeTokens = {
    sm: { width: 400, maxHeight: "70vh" },
    md: { width: 560, maxHeight: "80vh" },
    lg: { width: 800, maxHeight: "90vh" },
    fullscreen: { width: "100vw", maxHeight: "100vh" },
};
// ---------------------------------------------------------------------------
// Close Behavior
// ---------------------------------------------------------------------------
exports.CloseBehaviorSchema = zod_1.z.object({
    /** Show close (X) button in the header */
    showCloseButton: zod_1.z.boolean().default(true),
    /** Close when overlay/backdrop is clicked */
    closeOnOverlayClick: zod_1.z.boolean().default(true),
    /** Close when Escape key is pressed */
    closeOnEscape: zod_1.z.boolean().default(true),
    /** Require explicit confirmation before closing (e.g. unsaved changes) */
    confirmBeforeClose: zod_1.z.boolean().default(false),
    /** Confirmation message if confirmBeforeClose is true */
    confirmMessage: zod_1.z.string().optional(),
}).strict();
// ---------------------------------------------------------------------------
// Overlay Config
// ---------------------------------------------------------------------------
exports.OverlayConfigSchema = zod_1.z.object({
    /** Overlay background color */
    backgroundColor: zod_1.z.string().default("rgba(0, 0, 0, 0.5)"),
    /** Blur the content behind the overlay */
    backdropBlur: zod_1.z.boolean().default(false),
    /** Blur amount (CSS value) */
    blurAmount: zod_1.z.string().optional().default("4px"),
    /** Overlay z-index */
    zIndex: zod_1.z.number().default(1300),
}).strict();
// ---------------------------------------------------------------------------
// Modal Header
// ---------------------------------------------------------------------------
exports.ModalHeaderSchema = zod_1.z.object({
    /** Title text */
    title: zod_1.z.string(),
    /** Optional subtitle / description */
    subtitle: zod_1.z.string().optional(),
    /** Optional icon identifier */
    icon: zod_1.z.string().optional(),
    /** Show a divider below the header */
    showDivider: zod_1.z.boolean().default(true),
}).strict();
// ---------------------------------------------------------------------------
// Modal Footer
// ---------------------------------------------------------------------------
exports.ModalFooterActionSchema = zod_1.z.object({
    label: zod_1.z.string(),
    variant: zod_1.z.enum(["primary", "secondary", "ghost", "danger"]).default("primary"),
    disabled: zod_1.z.boolean().optional().default(false),
    loading: zod_1.z.boolean().optional().default(false),
    /** Action identifier for event handling */
    actionId: zod_1.z.string(),
}).strict();
exports.ModalFooterSchema = zod_1.z.object({
    /** Alignment of footer actions */
    alignment: zod_1.z.enum(["left", "center", "right", "space-between"]).default("right"),
    /** Footer actions (buttons) */
    actions: zod_1.z.array(exports.ModalFooterActionSchema).default([]),
    /** Show a divider above the footer */
    showDivider: zod_1.z.boolean().default(true),
}).strict();
// ---------------------------------------------------------------------------
// Modal Body
// ---------------------------------------------------------------------------
exports.ModalBodySchema = zod_1.z.object({
    /** Enable body scrolling when content overflows */
    scrollable: zod_1.z.boolean().default(true),
    /** Padding inside the body */
    padding: zod_1.z.number().default(24),
    /** Minimum height of the body */
    minHeight: zod_1.z.number().optional(),
}).strict();
// ---------------------------------------------------------------------------
// Complete Modal Props
// ---------------------------------------------------------------------------
exports.ModalPropsSchema = zod_1.z.object({
    /** Modal size preset */
    size: exports.ModalSizeSchema.default("md"),
    /** Whether the modal is currently open */
    open: zod_1.z.boolean().default(false),
    /** Header configuration */
    header: exports.ModalHeaderSchema.optional(),
    /** Body configuration */
    body: exports.ModalBodySchema.optional(),
    /** Footer configuration */
    footer: exports.ModalFooterSchema.optional(),
    /** Close behavior configuration */
    closeBehavior: exports.CloseBehaviorSchema.optional(),
    /** Overlay configuration */
    overlay: exports.OverlayConfigSchema.optional(),
    /** Trap focus within the modal */
    trapFocus: zod_1.z.boolean().default(true),
    /** Prevent body scroll when modal is open */
    preventBodyScroll: zod_1.z.boolean().default(true),
    /** Animation type */
    animation: zod_1.z.enum(["fade", "slide-up", "scale", "none"]).default("fade"),
    /** Animation duration in ms */
    animationDuration: zod_1.z.number().default(200),
    /** Role for accessibility */
    role: zod_1.z.enum(["dialog", "alertdialog"]).default("dialog"),
    /** Accessible label */
    ariaLabel: zod_1.z.string().optional(),
    /** Nested modals: stack level */
    stackLevel: zod_1.z.number().int().nonnegative().default(0),
}).strict();
// ---------------------------------------------------------------------------
// Confirmation Dialog (convenience preset)
// ---------------------------------------------------------------------------
exports.ConfirmDialogPropsSchema = zod_1.z.object({
    title: zod_1.z.string(),
    message: zod_1.z.string(),
    confirmLabel: zod_1.z.string().default("Confirm"),
    cancelLabel: zod_1.z.string().default("Cancel"),
    variant: zod_1.z.enum(["info", "warning", "danger"]).default("info"),
    size: exports.ModalSizeSchema.default("sm"),
}).strict();
//# sourceMappingURL=modals.js.map