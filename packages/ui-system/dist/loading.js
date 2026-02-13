"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoadingLayoutSchema = exports.LoadingStateSchema = exports.ShimmerConfigSchema = exports.ProgressBarSizeTokens = exports.ProgressBarPropsSchema = exports.SpinnerPropsSchema = exports.SpinnerSizeTokens = exports.SpinnerSizeSchema = exports.SpinnerSizes = exports.SkeletonPresets = exports.SkeletonPropsSchema = exports.SkeletonShapeSchema = exports.SkeletonShapes = void 0;
/**
 * UI-008: Loading State Specs
 *
 * Type definitions and Zod schemas for skeleton screens, spinners,
 * progress bars, and shimmer effects.
 */
const zod_1 = require("zod");
// ---------------------------------------------------------------------------
// Skeleton Shapes
// ---------------------------------------------------------------------------
exports.SkeletonShapes = [
    "rectangle",
    "circle",
    "text-line",
    "text-block",
    "avatar",
    "thumbnail",
    "button",
    "input",
    "card",
    "table-row",
];
exports.SkeletonShapeSchema = zod_1.z.enum(exports.SkeletonShapes);
exports.SkeletonPropsSchema = zod_1.z.object({
    /** Shape preset */
    shape: exports.SkeletonShapeSchema,
    /** Width (CSS value) */
    width: zod_1.z.union([zod_1.z.number(), zod_1.z.string()]).optional(),
    /** Height (CSS value) */
    height: zod_1.z.union([zod_1.z.number(), zod_1.z.string()]).optional(),
    /** Border radius override */
    borderRadius: zod_1.z.string().optional(),
    /** Enable animation */
    animate: zod_1.z.boolean().default(true),
    /** Number of lines (for text-block) */
    lines: zod_1.z.number().int().positive().optional().default(3),
    /** Line spacing (for text-block, px) */
    lineSpacing: zod_1.z.number().optional().default(8),
    /** Last line width percentage (for text-block) */
    lastLineWidth: zod_1.z.string().optional().default("60%"),
}).strict();
/** Preset dimensions for skeleton shapes */
exports.SkeletonPresets = {
    rectangle: { width: "100%", height: 120, borderRadius: "6px" },
    circle: { width: 48, height: 48, borderRadius: "50%" },
    "text-line": { width: "100%", height: 16, borderRadius: "4px" },
    "text-block": { width: "100%", height: 64, borderRadius: "4px" },
    avatar: { width: 40, height: 40, borderRadius: "50%" },
    thumbnail: { width: 80, height: 80, borderRadius: "8px" },
    button: { width: 120, height: 40, borderRadius: "6px" },
    input: { width: "100%", height: 40, borderRadius: "6px" },
    card: { width: "100%", height: 200, borderRadius: "8px" },
    "table-row": { width: "100%", height: 48, borderRadius: "0px" },
};
// ---------------------------------------------------------------------------
// Spinner Sizes
// ---------------------------------------------------------------------------
exports.SpinnerSizes = ["xs", "sm", "md", "lg", "xl"];
exports.SpinnerSizeSchema = zod_1.z.enum(exports.SpinnerSizes);
exports.SpinnerSizeTokens = {
    xs: { diameter: 16, strokeWidth: 2 },
    sm: { diameter: 24, strokeWidth: 2 },
    md: { diameter: 32, strokeWidth: 3 },
    lg: { diameter: 48, strokeWidth: 3 },
    xl: { diameter: 64, strokeWidth: 4 },
};
exports.SpinnerPropsSchema = zod_1.z.object({
    /** Size preset */
    size: exports.SpinnerSizeSchema.default("md"),
    /** Color (CSS value) */
    color: zod_1.z.string().default("#4F46E5"),
    /** Track color */
    trackColor: zod_1.z.string().default("#E5E7EB"),
    /** Animation speed (ms for full rotation) */
    speed: zod_1.z.number().default(700),
    /** Accessible label */
    label: zod_1.z.string().default("Loading"),
    /** Spinner style */
    variant: zod_1.z.enum(["circular", "dots", "bars"]).default("circular"),
}).strict();
// ---------------------------------------------------------------------------
// Progress Bar Config
// ---------------------------------------------------------------------------
exports.ProgressBarPropsSchema = zod_1.z.object({
    /** Current value (0-100) */
    value: zod_1.z.number().min(0).max(100),
    /** Maximum value */
    max: zod_1.z.number().default(100),
    /** Show percentage label */
    showLabel: zod_1.z.boolean().default(false),
    /** Label format: "percentage" shows "75%", "fraction" shows "75/100" */
    labelFormat: zod_1.z.enum(["percentage", "fraction", "custom"]).default("percentage"),
    /** Custom label */
    customLabel: zod_1.z.string().optional(),
    /** Size (height) */
    size: zod_1.z.enum(["xs", "sm", "md", "lg"]).default("md"),
    /** Color / variant */
    variant: zod_1.z.enum(["default", "success", "warning", "error", "info", "gradient"]).default("default"),
    /** Bar color (overrides variant) */
    color: zod_1.z.string().optional(),
    /** Track color */
    trackColor: zod_1.z.string().default("#E5E7EB"),
    /** Stripe animation for indeterminate state */
    indeterminate: zod_1.z.boolean().default(false),
    /** Enable animated transition on value change */
    animated: zod_1.z.boolean().default(true),
    /** Border radius */
    borderRadius: zod_1.z.string().default("9999px"),
    /** Accessible label */
    ariaLabel: zod_1.z.string().optional(),
}).strict();
exports.ProgressBarSizeTokens = {
    xs: { height: 2 },
    sm: { height: 4 },
    md: { height: 8 },
    lg: { height: 12 },
};
// ---------------------------------------------------------------------------
// Shimmer Effect Config
// ---------------------------------------------------------------------------
exports.ShimmerConfigSchema = zod_1.z.object({
    /** Enable shimmer effect */
    enabled: zod_1.z.boolean().default(true),
    /** Base color */
    baseColor: zod_1.z.string().default("#E5E7EB"),
    /** Highlight color */
    highlightColor: zod_1.z.string().default("#F3F4F6"),
    /** Animation duration (ms) */
    duration: zod_1.z.number().default(1500),
    /** Animation direction */
    direction: zod_1.z.enum(["left-to-right", "right-to-left", "top-to-bottom"]).default("left-to-right"),
    /** Delay between animation cycles (ms) */
    delay: zod_1.z.number().default(0),
    /** Gradient angle (degrees) */
    angle: zod_1.z.number().default(90),
}).strict();
// ---------------------------------------------------------------------------
// Page / Section Loading State
// ---------------------------------------------------------------------------
exports.LoadingStateSchema = zod_1.z.object({
    /** Current loading status */
    status: zod_1.z.enum(["idle", "loading", "success", "error"]),
    /** Type of loading indicator to show */
    indicator: zod_1.z.enum(["spinner", "skeleton", "progress", "shimmer", "none"]).default("spinner"),
    /** Optional message */
    message: zod_1.z.string().optional(),
    /** Show overlay on existing content */
    overlay: zod_1.z.boolean().default(false),
    /** Overlay opacity */
    overlayOpacity: zod_1.z.number().min(0).max(1).default(0.6),
    /** Minimum display time to avoid flash (ms) */
    minDisplayTime: zod_1.z.number().default(300),
    /** Delay before showing loader to avoid flash for fast loads (ms) */
    showDelay: zod_1.z.number().default(200),
}).strict();
// ---------------------------------------------------------------------------
// Loading Screen Layouts (for page-level loading)
// ---------------------------------------------------------------------------
exports.LoadingLayoutSchema = zod_1.z.object({
    /** Layout type */
    layout: zod_1.z.enum(["centered", "top-bar", "inline", "overlay"]).default("centered"),
    /** Content to show alongside the loader */
    content: zod_1.z.enum(["spinner-only", "spinner-message", "skeleton", "progress"]).default("spinner-message"),
    /** Full page or contained */
    fullPage: zod_1.z.boolean().default(false),
}).strict();
//# sourceMappingURL=loading.js.map