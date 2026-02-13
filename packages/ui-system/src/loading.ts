/**
 * UI-008: Loading State Specs
 *
 * Type definitions and Zod schemas for skeleton screens, spinners,
 * progress bars, and shimmer effects.
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// Skeleton Shapes
// ---------------------------------------------------------------------------

export const SkeletonShapes = [
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
] as const;
export type SkeletonShape = (typeof SkeletonShapes)[number];

export const SkeletonShapeSchema = z.enum(SkeletonShapes);

export const SkeletonPropsSchema = z.object({
  /** Shape preset */
  shape: SkeletonShapeSchema,
  /** Width (CSS value) */
  width: z.union([z.number(), z.string()]).optional(),
  /** Height (CSS value) */
  height: z.union([z.number(), z.string()]).optional(),
  /** Border radius override */
  borderRadius: z.string().optional(),
  /** Enable animation */
  animate: z.boolean().default(true),
  /** Number of lines (for text-block) */
  lines: z.number().int().positive().optional().default(3),
  /** Line spacing (for text-block, px) */
  lineSpacing: z.number().optional().default(8),
  /** Last line width percentage (for text-block) */
  lastLineWidth: z.string().optional().default("60%"),
}).strict();

export type SkeletonProps = z.infer<typeof SkeletonPropsSchema>;

/** Preset dimensions for skeleton shapes */
export const SkeletonPresets = {
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
} as const;

export type SkeletonPresets = typeof SkeletonPresets;

// ---------------------------------------------------------------------------
// Spinner Sizes
// ---------------------------------------------------------------------------

export const SpinnerSizes = ["xs", "sm", "md", "lg", "xl"] as const;
export type SpinnerSize = (typeof SpinnerSizes)[number];

export const SpinnerSizeSchema = z.enum(SpinnerSizes);

export const SpinnerSizeTokens = {
  xs: { diameter: 16, strokeWidth: 2 },
  sm: { diameter: 24, strokeWidth: 2 },
  md: { diameter: 32, strokeWidth: 3 },
  lg: { diameter: 48, strokeWidth: 3 },
  xl: { diameter: 64, strokeWidth: 4 },
} as const;

export type SpinnerSizeTokens = typeof SpinnerSizeTokens;

export const SpinnerPropsSchema = z.object({
  /** Size preset */
  size: SpinnerSizeSchema.default("md"),
  /** Color (CSS value) */
  color: z.string().default("#4F46E5"),
  /** Track color */
  trackColor: z.string().default("#E5E7EB"),
  /** Animation speed (ms for full rotation) */
  speed: z.number().default(700),
  /** Accessible label */
  label: z.string().default("Loading"),
  /** Spinner style */
  variant: z.enum(["circular", "dots", "bars"]).default("circular"),
}).strict();

export type SpinnerProps = z.infer<typeof SpinnerPropsSchema>;

// ---------------------------------------------------------------------------
// Progress Bar Config
// ---------------------------------------------------------------------------

export const ProgressBarPropsSchema = z.object({
  /** Current value (0-100) */
  value: z.number().min(0).max(100),
  /** Maximum value */
  max: z.number().default(100),
  /** Show percentage label */
  showLabel: z.boolean().default(false),
  /** Label format: "percentage" shows "75%", "fraction" shows "75/100" */
  labelFormat: z.enum(["percentage", "fraction", "custom"]).default("percentage"),
  /** Custom label */
  customLabel: z.string().optional(),
  /** Size (height) */
  size: z.enum(["xs", "sm", "md", "lg"]).default("md"),
  /** Color / variant */
  variant: z.enum(["default", "success", "warning", "error", "info", "gradient"]).default("default"),
  /** Bar color (overrides variant) */
  color: z.string().optional(),
  /** Track color */
  trackColor: z.string().default("#E5E7EB"),
  /** Stripe animation for indeterminate state */
  indeterminate: z.boolean().default(false),
  /** Enable animated transition on value change */
  animated: z.boolean().default(true),
  /** Border radius */
  borderRadius: z.string().default("9999px"),
  /** Accessible label */
  ariaLabel: z.string().optional(),
}).strict();

export type ProgressBarProps = z.infer<typeof ProgressBarPropsSchema>;

export const ProgressBarSizeTokens = {
  xs: { height: 2 },
  sm: { height: 4 },
  md: { height: 8 },
  lg: { height: 12 },
} as const;

export type ProgressBarSizeTokens = typeof ProgressBarSizeTokens;

// ---------------------------------------------------------------------------
// Shimmer Effect Config
// ---------------------------------------------------------------------------

export const ShimmerConfigSchema = z.object({
  /** Enable shimmer effect */
  enabled: z.boolean().default(true),
  /** Base color */
  baseColor: z.string().default("#E5E7EB"),
  /** Highlight color */
  highlightColor: z.string().default("#F3F4F6"),
  /** Animation duration (ms) */
  duration: z.number().default(1500),
  /** Animation direction */
  direction: z.enum(["left-to-right", "right-to-left", "top-to-bottom"]).default("left-to-right"),
  /** Delay between animation cycles (ms) */
  delay: z.number().default(0),
  /** Gradient angle (degrees) */
  angle: z.number().default(90),
}).strict();

export type ShimmerConfig = z.infer<typeof ShimmerConfigSchema>;

// ---------------------------------------------------------------------------
// Page / Section Loading State
// ---------------------------------------------------------------------------

export const LoadingStateSchema = z.object({
  /** Current loading status */
  status: z.enum(["idle", "loading", "success", "error"]),
  /** Type of loading indicator to show */
  indicator: z.enum(["spinner", "skeleton", "progress", "shimmer", "none"]).default("spinner"),
  /** Optional message */
  message: z.string().optional(),
  /** Show overlay on existing content */
  overlay: z.boolean().default(false),
  /** Overlay opacity */
  overlayOpacity: z.number().min(0).max(1).default(0.6),
  /** Minimum display time to avoid flash (ms) */
  minDisplayTime: z.number().default(300),
  /** Delay before showing loader to avoid flash for fast loads (ms) */
  showDelay: z.number().default(200),
}).strict();

export type LoadingState = z.infer<typeof LoadingStateSchema>;

// ---------------------------------------------------------------------------
// Loading Screen Layouts (for page-level loading)
// ---------------------------------------------------------------------------

export const LoadingLayoutSchema = z.object({
  /** Layout type */
  layout: z.enum(["centered", "top-bar", "inline", "overlay"]).default("centered"),
  /** Content to show alongside the loader */
  content: z.enum(["spinner-only", "spinner-message", "skeleton", "progress"]).default("spinner-message"),
  /** Full page or contained */
  fullPage: z.boolean().default(false),
}).strict();

export type LoadingLayout = z.infer<typeof LoadingLayoutSchema>;
