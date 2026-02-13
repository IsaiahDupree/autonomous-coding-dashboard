/**
 * UI-009: Card Component Specs
 *
 * Type definitions and Zod schemas for card components, including
 * variants, sections (header/body/footer), media slots, and action areas.
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// Card Variant
// ---------------------------------------------------------------------------

export const CardVariants = ["default", "elevated", "outlined"] as const;
export type CardVariant = (typeof CardVariants)[number];

export const CardVariantSchema = z.enum(CardVariants);

// ---------------------------------------------------------------------------
// Card variant style tokens
// ---------------------------------------------------------------------------

export interface CardVariantStyle {
  background: string;
  border: string;
  boxShadow: string;
  hoverBoxShadow: string;
}

export const CardVariantStyles: Record<CardVariant, CardVariantStyle> = {
  default: {
    background: "#FFFFFF",
    border: "1px solid #E5E7EB",
    boxShadow: "none",
    hoverBoxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1)",
  },
  elevated: {
    background: "#FFFFFF",
    border: "none",
    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    hoverBoxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  },
  outlined: {
    background: "transparent",
    border: "1px solid #D1D5DB",
    boxShadow: "none",
    hoverBoxShadow: "none",
  },
};

// ---------------------------------------------------------------------------
// Card Header
// ---------------------------------------------------------------------------

export const CardHeaderSchema = z.object({
  /** Title text */
  title: z.string(),
  /** Subtitle text */
  subtitle: z.string().optional(),
  /** Avatar / icon identifier */
  avatar: z.string().optional(),
  /** Action area (e.g. dropdown menu trigger) */
  action: z.string().optional(),
  /** Show divider below header */
  showDivider: z.boolean().default(false),
  /** Padding */
  padding: z.number().default(16),
}).strict();

export type CardHeader = z.infer<typeof CardHeaderSchema>;

// ---------------------------------------------------------------------------
// Card Body
// ---------------------------------------------------------------------------

export const CardBodySchema = z.object({
  /** Padding */
  padding: z.number().default(16),
  /** Allow body to scroll */
  scrollable: z.boolean().default(false),
  /** Max height when scrollable */
  maxHeight: z.union([z.number(), z.string()]).optional(),
}).strict();

export type CardBody = z.infer<typeof CardBodySchema>;

// ---------------------------------------------------------------------------
// Card Footer
// ---------------------------------------------------------------------------

export const CardFooterSchema = z.object({
  /** Alignment of footer content */
  alignment: z.enum(["left", "center", "right", "space-between"]).default("right"),
  /** Show divider above footer */
  showDivider: z.boolean().default(false),
  /** Padding */
  padding: z.number().default(16),
}).strict();

export type CardFooter = z.infer<typeof CardFooterSchema>;

// ---------------------------------------------------------------------------
// Card Media Slot
// ---------------------------------------------------------------------------

export const CardMediaPositions = ["top", "bottom", "left", "right", "background"] as const;
export type CardMediaPosition = (typeof CardMediaPositions)[number];

export const CardMediaSchema = z.object({
  /** Media source URL */
  src: z.string(),
  /** Alt text */
  alt: z.string().default(""),
  /** Media position relative to card body */
  position: z.enum(CardMediaPositions).default("top"),
  /** Media height (px) */
  height: z.union([z.number(), z.string()]).optional().default(200),
  /** Object fit */
  objectFit: z.enum(["cover", "contain", "fill", "none"]).default("cover"),
  /** Show overlay on media */
  overlay: z.boolean().default(false),
  /** Overlay color */
  overlayColor: z.string().default("rgba(0, 0, 0, 0.4)"),
  /** Aspect ratio (e.g. "16/9") */
  aspectRatio: z.string().optional(),
}).strict();

export type CardMedia = z.infer<typeof CardMediaSchema>;

// ---------------------------------------------------------------------------
// Card Action Area
// ---------------------------------------------------------------------------

export const CardActionSchema = z.object({
  /** Action identifier */
  id: z.string(),
  /** Display label */
  label: z.string(),
  /** Icon identifier */
  icon: z.string().optional(),
  /** Variant */
  variant: z.enum(["primary", "secondary", "ghost", "danger"]).default("ghost"),
  /** Size */
  size: z.enum(["sm", "md"]).default("sm"),
  /** Disabled */
  disabled: z.boolean().default(false),
}).strict();

export type CardAction = z.infer<typeof CardActionSchema>;

export const CardActionAreaSchema = z.object({
  /** Actions */
  actions: z.array(CardActionSchema).default([]),
  /** Layout */
  layout: z.enum(["horizontal", "vertical"]).default("horizontal"),
  /** Alignment */
  alignment: z.enum(["left", "center", "right", "space-between"]).default("right"),
  /** Padding */
  padding: z.number().default(8),
}).strict();

export type CardActionArea = z.infer<typeof CardActionAreaSchema>;

// ---------------------------------------------------------------------------
// Complete Card Props
// ---------------------------------------------------------------------------

export const CardPropsSchema = z.object({
  /** Visual variant */
  variant: CardVariantSchema.default("default"),
  /** Header section */
  header: CardHeaderSchema.optional(),
  /** Body section */
  body: CardBodySchema.optional(),
  /** Footer section */
  footer: CardFooterSchema.optional(),
  /** Media slot */
  media: CardMediaSchema.optional(),
  /** Action area */
  actionArea: CardActionAreaSchema.optional(),
  /** Border radius */
  borderRadius: z.string().default("8px"),
  /** Make entire card clickable */
  clickable: z.boolean().default(false),
  /** Link URL (if clickable) */
  href: z.string().optional(),
  /** Enable hover effect */
  hoverable: z.boolean().default(false),
  /** Card width */
  width: z.union([z.number(), z.string()]).optional(),
  /** Card min-height */
  minHeight: z.union([z.number(), z.string()]).optional(),
  /** Full-width card */
  fullWidth: z.boolean().default(false),
  /** Loading state */
  loading: z.boolean().default(false),
  /** Accessible label */
  ariaLabel: z.string().optional(),
}).strict();

export type CardProps = z.infer<typeof CardPropsSchema>;

// ---------------------------------------------------------------------------
// Card Grid Layout
// ---------------------------------------------------------------------------

export const CardGridSchema = z.object({
  /** Number of columns */
  columns: z.union([z.number(), z.object({
    xs: z.number().default(1),
    sm: z.number().default(2),
    md: z.number().default(3),
    lg: z.number().default(4),
    xl: z.number().default(4),
  })]),
  /** Gap between cards (px) */
  gap: z.number().default(16),
  /** Equal height cards */
  equalHeight: z.boolean().default(true),
}).strict();

export type CardGrid = z.infer<typeof CardGridSchema>;
