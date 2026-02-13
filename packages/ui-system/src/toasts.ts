/**
 * UI-006: Toast / Notification Specs
 *
 * Type definitions and Zod schemas for toast notifications, including
 * variants, positioning, auto-dismiss, and action buttons.
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// Toast Variant
// ---------------------------------------------------------------------------

export const ToastVariants = ["success", "error", "warning", "info"] as const;
export type ToastVariant = (typeof ToastVariants)[number];

export const ToastVariantSchema = z.enum(ToastVariants);

// ---------------------------------------------------------------------------
// Toast Position
// ---------------------------------------------------------------------------

export const ToastPositions = [
  "top-left",
  "top-center",
  "top-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
] as const;
export type ToastPosition = (typeof ToastPositions)[number];

export const ToastPositionSchema = z.enum(ToastPositions);

// ---------------------------------------------------------------------------
// Variant style tokens
// ---------------------------------------------------------------------------

export interface ToastVariantStyle {
  backgroundColor: string;
  borderColor: string;
  iconColor: string;
  textColor: string;
  icon: string; // icon identifier
}

export const ToastVariantStyles: Record<ToastVariant, ToastVariantStyle> = {
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

export const ToastActionSchema = z.object({
  /** Button label */
  label: z.string(),
  /** Action identifier (for event handling) */
  actionId: z.string(),
  /** Whether clicking the action dismisses the toast */
  dismissOnClick: z.boolean().default(true),
}).strict();

export type ToastAction = z.infer<typeof ToastActionSchema>;

// ---------------------------------------------------------------------------
// Auto-dismiss Config
// ---------------------------------------------------------------------------

export const AutoDismissConfigSchema = z.object({
  /** Enable auto-dismiss */
  enabled: z.boolean().default(true),
  /** Dismiss after this many milliseconds */
  durationMs: z.number().int().positive().default(5000),
  /** Pause auto-dismiss on hover */
  pauseOnHover: z.boolean().default(true),
  /** Pause auto-dismiss when window loses focus */
  pauseOnFocusLoss: z.boolean().default(true),
  /** Show countdown progress bar */
  showProgress: z.boolean().default(true),
}).strict();

export type AutoDismissConfig = z.infer<typeof AutoDismissConfigSchema>;

/** Sensible defaults per variant */
export const DefaultAutoDismissDurations: Record<ToastVariant, number> = {
  success: 4000,
  error: 8000,
  warning: 6000,
  info: 5000,
};

// ---------------------------------------------------------------------------
// Single Toast Props
// ---------------------------------------------------------------------------

export const ToastPropsSchema = z.object({
  /** Unique toast identifier */
  id: z.string(),
  /** Variant */
  variant: ToastVariantSchema,
  /** Title (bold first line) */
  title: z.string(),
  /** Body message */
  message: z.string().optional(),
  /** Action button */
  action: ToastActionSchema.optional(),
  /** Auto-dismiss configuration */
  autoDismiss: AutoDismissConfigSchema.optional(),
  /** Allow manual dismiss via close button */
  dismissible: z.boolean().default(true),
  /** Custom icon (overrides variant default) */
  icon: z.string().optional(),
  /** Timestamp */
  createdAt: z.string().datetime().optional(),
}).strict();

export type ToastProps = z.infer<typeof ToastPropsSchema>;

// ---------------------------------------------------------------------------
// Toast Container Config (global)
// ---------------------------------------------------------------------------

export const ToastContainerConfigSchema = z.object({
  /** Default position for new toasts */
  position: ToastPositionSchema.default("top-right"),
  /** Maximum visible toasts at a time */
  maxVisible: z.number().int().positive().default(5),
  /** Gap between toasts (px) */
  gap: z.number().default(8),
  /** Offset from viewport edge (px) */
  offset: z.object({
    x: z.number().default(16),
    y: z.number().default(16),
  }).default({ x: 16, y: 16 }),
  /** Stack direction */
  stackDirection: z.enum(["up", "down"]).default("down"),
  /** Animation type */
  animation: z.enum(["slide", "fade", "pop", "none"]).default("slide"),
  /** Animation duration in ms */
  animationDuration: z.number().default(200),
  /** Enable swipe-to-dismiss on touch */
  swipeToDismiss: z.boolean().default(true),
  /** Enable grouping of duplicate toasts */
  groupDuplicates: z.boolean().default(false),
  /** Z-index */
  zIndex: z.number().default(1700),
}).strict();

export type ToastContainerConfig = z.infer<typeof ToastContainerConfigSchema>;
