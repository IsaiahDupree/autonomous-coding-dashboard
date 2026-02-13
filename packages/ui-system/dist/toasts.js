"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToastContainerConfigSchema = exports.ToastPropsSchema = exports.DefaultAutoDismissDurations = exports.AutoDismissConfigSchema = exports.ToastActionSchema = exports.ToastVariantStyles = exports.ToastPositionSchema = exports.ToastPositions = exports.ToastVariantSchema = exports.ToastVariants = void 0;
/**
 * UI-006: Toast / Notification Specs
 *
 * Type definitions and Zod schemas for toast notifications, including
 * variants, positioning, auto-dismiss, and action buttons.
 */
const zod_1 = require("zod");
// ---------------------------------------------------------------------------
// Toast Variant
// ---------------------------------------------------------------------------
exports.ToastVariants = ["success", "error", "warning", "info"];
exports.ToastVariantSchema = zod_1.z.enum(exports.ToastVariants);
// ---------------------------------------------------------------------------
// Toast Position
// ---------------------------------------------------------------------------
exports.ToastPositions = [
    "top-left",
    "top-center",
    "top-right",
    "bottom-left",
    "bottom-center",
    "bottom-right",
];
exports.ToastPositionSchema = zod_1.z.enum(exports.ToastPositions);
exports.ToastVariantStyles = {
    success: {
        backgroundColor: "#F0FDF4",
        borderColor: "#BBF7D0",
        iconColor: "#22C55E",
        textColor: "#166534",
        icon: "check-circle",
    },
    error: {
        backgroundColor: "#FEF2F2",
        borderColor: "#FECACA",
        iconColor: "#EF4444",
        textColor: "#991B1B",
        icon: "x-circle",
    },
    warning: {
        backgroundColor: "#FFFBEB",
        borderColor: "#FDE68A",
        iconColor: "#F59E0B",
        textColor: "#92400E",
        icon: "alert-triangle",
    },
    info: {
        backgroundColor: "#EFF6FF",
        borderColor: "#BFDBFE",
        iconColor: "#3B82F6",
        textColor: "#1E40AF",
        icon: "info",
    },
};
// ---------------------------------------------------------------------------
// Toast Action
// ---------------------------------------------------------------------------
exports.ToastActionSchema = zod_1.z.object({
    /** Button label */
    label: zod_1.z.string(),
    /** Action identifier (for event handling) */
    actionId: zod_1.z.string(),
    /** Whether clicking the action dismisses the toast */
    dismissOnClick: zod_1.z.boolean().default(true),
}).strict();
// ---------------------------------------------------------------------------
// Auto-dismiss Config
// ---------------------------------------------------------------------------
exports.AutoDismissConfigSchema = zod_1.z.object({
    /** Enable auto-dismiss */
    enabled: zod_1.z.boolean().default(true),
    /** Dismiss after this many milliseconds */
    durationMs: zod_1.z.number().int().positive().default(5000),
    /** Pause auto-dismiss on hover */
    pauseOnHover: zod_1.z.boolean().default(true),
    /** Pause auto-dismiss when window loses focus */
    pauseOnFocusLoss: zod_1.z.boolean().default(true),
    /** Show countdown progress bar */
    showProgress: zod_1.z.boolean().default(true),
}).strict();
/** Sensible defaults per variant */
exports.DefaultAutoDismissDurations = {
    success: 4000,
    error: 8000,
    warning: 6000,
    info: 5000,
};
// ---------------------------------------------------------------------------
// Single Toast Props
// ---------------------------------------------------------------------------
exports.ToastPropsSchema = zod_1.z.object({
    /** Unique toast identifier */
    id: zod_1.z.string(),
    /** Variant */
    variant: exports.ToastVariantSchema,
    /** Title (bold first line) */
    title: zod_1.z.string(),
    /** Body message */
    message: zod_1.z.string().optional(),
    /** Action button */
    action: exports.ToastActionSchema.optional(),
    /** Auto-dismiss configuration */
    autoDismiss: exports.AutoDismissConfigSchema.optional(),
    /** Allow manual dismiss via close button */
    dismissible: zod_1.z.boolean().default(true),
    /** Custom icon (overrides variant default) */
    icon: zod_1.z.string().optional(),
    /** Timestamp */
    createdAt: zod_1.z.string().datetime().optional(),
}).strict();
// ---------------------------------------------------------------------------
// Toast Container Config (global)
// ---------------------------------------------------------------------------
exports.ToastContainerConfigSchema = zod_1.z.object({
    /** Default position for new toasts */
    position: exports.ToastPositionSchema.default("top-right"),
    /** Maximum visible toasts at a time */
    maxVisible: zod_1.z.number().int().positive().default(5),
    /** Gap between toasts (px) */
    gap: zod_1.z.number().default(8),
    /** Offset from viewport edge (px) */
    offset: zod_1.z.object({
        x: zod_1.z.number().default(16),
        y: zod_1.z.number().default(16),
    }).default({ x: 16, y: 16 }),
    /** Stack direction */
    stackDirection: zod_1.z.enum(["up", "down"]).default("down"),
    /** Animation type */
    animation: zod_1.z.enum(["slide", "fade", "pop", "none"]).default("slide"),
    /** Animation duration in ms */
    animationDuration: zod_1.z.number().default(200),
    /** Enable swipe-to-dismiss on touch */
    swipeToDismiss: zod_1.z.boolean().default(true),
    /** Enable grouping of duplicate toasts */
    groupDuplicates: zod_1.z.boolean().default(false),
    /** Z-index */
    zIndex: zod_1.z.number().default(1700),
}).strict();
//# sourceMappingURL=toasts.js.map