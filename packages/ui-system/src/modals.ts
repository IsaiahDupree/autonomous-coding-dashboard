/**
 * UI-004: Modal / Dialog Specs
 *
 * Type definitions and Zod schemas for modals and dialogs, including
 * sizes, sections, close behavior, and overlay configuration.
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// Modal Size
// ---------------------------------------------------------------------------

export const ModalSizes = ["sm", "md", "lg", "fullscreen"] as const;
export type ModalSize = (typeof ModalSizes)[number];

export const ModalSizeSchema = z.enum(ModalSizes);

export const ModalSizeTokens = {
  sm: { width: 400, maxHeight: "70vh" },
  md: { width: 560, maxHeight: "80vh" },
  lg: { width: 800, maxHeight: "90vh" },
  fullscreen: { width: "100vw", maxHeight: "100vh" },
} as const;

export type ModalSizeTokens = typeof ModalSizeTokens;

// ---------------------------------------------------------------------------
// Close Behavior
// ---------------------------------------------------------------------------

export const CloseBehaviorSchema = z.object({
  /** Show close (X) button in the header */
  showCloseButton: z.boolean().default(true),
  /** Close when overlay/backdrop is clicked */
  closeOnOverlayClick: z.boolean().default(true),
  /** Close when Escape key is pressed */
  closeOnEscape: z.boolean().default(true),
  /** Require explicit confirmation before closing (e.g. unsaved changes) */
  confirmBeforeClose: z.boolean().default(false),
  /** Confirmation message if confirmBeforeClose is true */
  confirmMessage: z.string().optional(),
}).strict();

export type CloseBehavior = z.infer<typeof CloseBehaviorSchema>;

// ---------------------------------------------------------------------------
// Overlay Config
// ---------------------------------------------------------------------------

export const OverlayConfigSchema = z.object({
  /** Overlay background color */
  backgroundColor: z.string().default("rgba(0, 0, 0, 0.5)"),
  /** Blur the content behind the overlay */
  backdropBlur: z.boolean().default(false),
  /** Blur amount (CSS value) */
  blurAmount: z.string().optional().default("4px"),
  /** Overlay z-index */
  zIndex: z.number().default(1300),
}).strict();

export type OverlayConfig = z.infer<typeof OverlayConfigSchema>;

// ---------------------------------------------------------------------------
// Modal Header
// ---------------------------------------------------------------------------

export const ModalHeaderSchema = z.object({
  /** Title text */
  title: z.string(),
  /** Optional subtitle / description */
  subtitle: z.string().optional(),
  /** Optional icon identifier */
  icon: z.string().optional(),
  /** Show a divider below the header */
  showDivider: z.boolean().default(true),
}).strict();

export type ModalHeader = z.infer<typeof ModalHeaderSchema>;

// ---------------------------------------------------------------------------
// Modal Footer
// ---------------------------------------------------------------------------

export const ModalFooterActionSchema = z.object({
  label: z.string(),
  variant: z.enum(["primary", "secondary", "ghost", "danger"]).default("primary"),
  disabled: z.boolean().optional().default(false),
  loading: z.boolean().optional().default(false),
  /** Action identifier for event handling */
  actionId: z.string(),
}).strict();

export type ModalFooterAction = z.infer<typeof ModalFooterActionSchema>;

export const ModalFooterSchema = z.object({
  /** Alignment of footer actions */
  alignment: z.enum(["left", "center", "right", "space-between"]).default("right"),
  /** Footer actions (buttons) */
  actions: z.array(ModalFooterActionSchema).default([]),
  /** Show a divider above the footer */
  showDivider: z.boolean().default(true),
}).strict();

export type ModalFooter = z.infer<typeof ModalFooterSchema>;

// ---------------------------------------------------------------------------
// Modal Body
// ---------------------------------------------------------------------------

export const ModalBodySchema = z.object({
  /** Enable body scrolling when content overflows */
  scrollable: z.boolean().default(true),
  /** Padding inside the body */
  padding: z.number().default(24),
  /** Minimum height of the body */
  minHeight: z.number().optional(),
}).strict();

export type ModalBody = z.infer<typeof ModalBodySchema>;

// ---------------------------------------------------------------------------
// Complete Modal Props
// ---------------------------------------------------------------------------

export const ModalPropsSchema = z.object({
  /** Modal size preset */
  size: ModalSizeSchema.default("md"),
  /** Whether the modal is currently open */
  open: z.boolean().default(false),
  /** Header configuration */
  header: ModalHeaderSchema.optional(),
  /** Body configuration */
  body: ModalBodySchema.optional(),
  /** Footer configuration */
  footer: ModalFooterSchema.optional(),
  /** Close behavior configuration */
  closeBehavior: CloseBehaviorSchema.optional(),
  /** Overlay configuration */
  overlay: OverlayConfigSchema.optional(),
  /** Trap focus within the modal */
  trapFocus: z.boolean().default(true),
  /** Prevent body scroll when modal is open */
  preventBodyScroll: z.boolean().default(true),
  /** Animation type */
  animation: z.enum(["fade", "slide-up", "scale", "none"]).default("fade"),
  /** Animation duration in ms */
  animationDuration: z.number().default(200),
  /** Role for accessibility */
  role: z.enum(["dialog", "alertdialog"]).default("dialog"),
  /** Accessible label */
  ariaLabel: z.string().optional(),
  /** Nested modals: stack level */
  stackLevel: z.number().int().nonnegative().default(0),
}).strict();

export type ModalProps = z.infer<typeof ModalPropsSchema>;

// ---------------------------------------------------------------------------
// Confirmation Dialog (convenience preset)
// ---------------------------------------------------------------------------

export const ConfirmDialogPropsSchema = z.object({
  title: z.string(),
  message: z.string(),
  confirmLabel: z.string().default("Confirm"),
  cancelLabel: z.string().default("Cancel"),
  variant: z.enum(["info", "warning", "danger"]).default("info"),
  size: ModalSizeSchema.default("sm"),
}).strict();

export type ConfirmDialogProps = z.infer<typeof ConfirmDialogPropsSchema>;
