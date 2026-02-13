"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CardGridSchema = exports.CardPropsSchema = exports.CardActionAreaSchema = exports.CardActionSchema = exports.CardMediaSchema = exports.CardMediaPositions = exports.CardFooterSchema = exports.CardBodySchema = exports.CardHeaderSchema = exports.CardVariantStyles = exports.CardVariantSchema = exports.CardVariants = void 0;
/**
 * UI-009: Card Component Specs
 *
 * Type definitions and Zod schemas for card components, including
 * variants, sections (header/body/footer), media slots, and action areas.
 */
const zod_1 = require("zod");
// ---------------------------------------------------------------------------
// Card Variant
// ---------------------------------------------------------------------------
exports.CardVariants = ["default", "elevated", "outlined"];
exports.CardVariantSchema = zod_1.z.enum(exports.CardVariants);
exports.CardVariantStyles = {
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
exports.CardHeaderSchema = zod_1.z.object({
    /** Title text */
    title: zod_1.z.string(),
    /** Subtitle text */
    subtitle: zod_1.z.string().optional(),
    /** Avatar / icon identifier */
    avatar: zod_1.z.string().optional(),
    /** Action area (e.g. dropdown menu trigger) */
    action: zod_1.z.string().optional(),
    /** Show divider below header */
    showDivider: zod_1.z.boolean().default(false),
    /** Padding */
    padding: zod_1.z.number().default(16),
}).strict();
// ---------------------------------------------------------------------------
// Card Body
// ---------------------------------------------------------------------------
exports.CardBodySchema = zod_1.z.object({
    /** Padding */
    padding: zod_1.z.number().default(16),
    /** Allow body to scroll */
    scrollable: zod_1.z.boolean().default(false),
    /** Max height when scrollable */
    maxHeight: zod_1.z.union([zod_1.z.number(), zod_1.z.string()]).optional(),
}).strict();
// ---------------------------------------------------------------------------
// Card Footer
// ---------------------------------------------------------------------------
exports.CardFooterSchema = zod_1.z.object({
    /** Alignment of footer content */
    alignment: zod_1.z.enum(["left", "center", "right", "space-between"]).default("right"),
    /** Show divider above footer */
    showDivider: zod_1.z.boolean().default(false),
    /** Padding */
    padding: zod_1.z.number().default(16),
}).strict();
// ---------------------------------------------------------------------------
// Card Media Slot
// ---------------------------------------------------------------------------
exports.CardMediaPositions = ["top", "bottom", "left", "right", "background"];
exports.CardMediaSchema = zod_1.z.object({
    /** Media source URL */
    src: zod_1.z.string(),
    /** Alt text */
    alt: zod_1.z.string().default(""),
    /** Media position relative to card body */
    position: zod_1.z.enum(exports.CardMediaPositions).default("top"),
    /** Media height (px) */
    height: zod_1.z.union([zod_1.z.number(), zod_1.z.string()]).optional().default(200),
    /** Object fit */
    objectFit: zod_1.z.enum(["cover", "contain", "fill", "none"]).default("cover"),
    /** Show overlay on media */
    overlay: zod_1.z.boolean().default(false),
    /** Overlay color */
    overlayColor: zod_1.z.string().default("rgba(0, 0, 0, 0.4)"),
    /** Aspect ratio (e.g. "16/9") */
    aspectRatio: zod_1.z.string().optional(),
}).strict();
// ---------------------------------------------------------------------------
// Card Action Area
// ---------------------------------------------------------------------------
exports.CardActionSchema = zod_1.z.object({
    /** Action identifier */
    id: zod_1.z.string(),
    /** Display label */
    label: zod_1.z.string(),
    /** Icon identifier */
    icon: zod_1.z.string().optional(),
    /** Variant */
    variant: zod_1.z.enum(["primary", "secondary", "ghost", "danger"]).default("ghost"),
    /** Size */
    size: zod_1.z.enum(["sm", "md"]).default("sm"),
    /** Disabled */
    disabled: zod_1.z.boolean().default(false),
}).strict();
exports.CardActionAreaSchema = zod_1.z.object({
    /** Actions */
    actions: zod_1.z.array(exports.CardActionSchema).default([]),
    /** Layout */
    layout: zod_1.z.enum(["horizontal", "vertical"]).default("horizontal"),
    /** Alignment */
    alignment: zod_1.z.enum(["left", "center", "right", "space-between"]).default("right"),
    /** Padding */
    padding: zod_1.z.number().default(8),
}).strict();
// ---------------------------------------------------------------------------
// Complete Card Props
// ---------------------------------------------------------------------------
exports.CardPropsSchema = zod_1.z.object({
    /** Visual variant */
    variant: exports.CardVariantSchema.default("default"),
    /** Header section */
    header: exports.CardHeaderSchema.optional(),
    /** Body section */
    body: exports.CardBodySchema.optional(),
    /** Footer section */
    footer: exports.CardFooterSchema.optional(),
    /** Media slot */
    media: exports.CardMediaSchema.optional(),
    /** Action area */
    actionArea: exports.CardActionAreaSchema.optional(),
    /** Border radius */
    borderRadius: zod_1.z.string().default("8px"),
    /** Make entire card clickable */
    clickable: zod_1.z.boolean().default(false),
    /** Link URL (if clickable) */
    href: zod_1.z.string().optional(),
    /** Enable hover effect */
    hoverable: zod_1.z.boolean().default(false),
    /** Card width */
    width: zod_1.z.union([zod_1.z.number(), zod_1.z.string()]).optional(),
    /** Card min-height */
    minHeight: zod_1.z.union([zod_1.z.number(), zod_1.z.string()]).optional(),
    /** Full-width card */
    fullWidth: zod_1.z.boolean().default(false),
    /** Loading state */
    loading: zod_1.z.boolean().default(false),
    /** Accessible label */
    ariaLabel: zod_1.z.string().optional(),
}).strict();
// ---------------------------------------------------------------------------
// Card Grid Layout
// ---------------------------------------------------------------------------
exports.CardGridSchema = zod_1.z.object({
    /** Number of columns */
    columns: zod_1.z.union([zod_1.z.number(), zod_1.z.object({
            xs: zod_1.z.number().default(1),
            sm: zod_1.z.number().default(2),
            md: zod_1.z.number().default(3),
            lg: zod_1.z.number().default(4),
            xl: zod_1.z.number().default(4),
        })]),
    /** Gap between cards (px) */
    gap: zod_1.z.number().default(16),
    /** Equal height cards */
    equalHeight: zod_1.z.boolean().default(true),
}).strict();
//# sourceMappingURL=cards.js.map