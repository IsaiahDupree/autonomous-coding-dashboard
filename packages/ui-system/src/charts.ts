/**
 * UI-010: Chart Component Specs
 *
 * Type definitions and Zod schemas for chart types (line, bar, pie, area,
 * scatter), axis config, legend, tooltip, and responsive configuration.
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// Chart Types
// ---------------------------------------------------------------------------

export const ChartTypes = ["line", "bar", "pie", "area", "scatter"] as const;
export type ChartType = (typeof ChartTypes)[number];

export const ChartTypeSchema = z.enum(ChartTypes);

// ---------------------------------------------------------------------------
// Color Themes (palettes for chart series)
// ---------------------------------------------------------------------------

export const ChartColorPalettes = {
  default: ["#6366F1", "#EC4899", "#F59E0B", "#10B981", "#3B82F6", "#8B5CF6", "#EF4444", "#14B8A6"],
  pastel: ["#A5B4FC", "#F9A8D4", "#FDE68A", "#6EE7B7", "#93C5FD", "#C4B5FD", "#FCA5A5", "#5EEAD4"],
  vibrant: ["#4F46E5", "#DB2777", "#D97706", "#059669", "#2563EB", "#7C3AED", "#DC2626", "#0D9488"],
  monochrome: ["#111827", "#374151", "#6B7280", "#9CA3AF", "#D1D5DB", "#E5E7EB", "#F3F4F6", "#F9FAFB"],
} as const;

export type ChartColorPalettes = typeof ChartColorPalettes;

// ---------------------------------------------------------------------------
// Axis Config
// ---------------------------------------------------------------------------

export const AxisConfigSchema = z.object({
  /** Axis label */
  label: z.string().optional(),
  /** Show axis line */
  showLine: z.boolean().default(true),
  /** Show grid lines */
  showGrid: z.boolean().default(true),
  /** Show tick marks */
  showTicks: z.boolean().default(true),
  /** Tick count (approximate) */
  tickCount: z.number().int().positive().optional(),
  /** Tick format (e.g. date format, number format) */
  tickFormat: z.string().optional(),
  /** Minimum value (auto if omitted) */
  min: z.number().optional(),
  /** Maximum value (auto if omitted) */
  max: z.number().optional(),
  /** Axis type */
  type: z.enum(["linear", "logarithmic", "time", "category"]).default("linear"),
  /** Grid line style */
  gridStyle: z.enum(["solid", "dashed", "dotted"]).default("dashed"),
  /** Grid line color */
  gridColor: z.string().default("#E5E7EB"),
  /** Axis color */
  axisColor: z.string().default("#9CA3AF"),
  /** Label font size */
  labelFontSize: z.string().default("0.75rem"),
  /** Axis position */
  position: z.enum(["top", "bottom", "left", "right"]).optional(),
}).strict();

export type AxisConfig = z.infer<typeof AxisConfigSchema>;

// ---------------------------------------------------------------------------
// Legend Config
// ---------------------------------------------------------------------------

export const LegendConfigSchema = z.object({
  /** Show legend */
  show: z.boolean().default(true),
  /** Legend position */
  position: z.enum(["top", "bottom", "left", "right"]).default("bottom"),
  /** Legend alignment */
  alignment: z.enum(["start", "center", "end"]).default("center"),
  /** Legend layout */
  layout: z.enum(["horizontal", "vertical"]).default("horizontal"),
  /** Max visible items (scroll or paginate beyond this) */
  maxItems: z.number().int().positive().optional(),
  /** Item gap (px) */
  gap: z.number().default(16),
  /** Marker shape */
  markerShape: z.enum(["circle", "square", "line", "diamond"]).default("circle"),
  /** Marker size */
  markerSize: z.number().default(10),
  /** Enable click-to-toggle series visibility */
  interactive: z.boolean().default(true),
  /** Font size */
  fontSize: z.string().default("0.75rem"),
}).strict();

export type LegendConfig = z.infer<typeof LegendConfigSchema>;

// ---------------------------------------------------------------------------
// Tooltip Config
// ---------------------------------------------------------------------------

export const TooltipConfigSchema = z.object({
  /** Enable tooltip */
  enabled: z.boolean().default(true),
  /** Trigger mode */
  trigger: z.enum(["hover", "click", "none"]).default("hover"),
  /** Show shared tooltip across all series at the same x-value */
  shared: z.boolean().default(true),
  /** Tooltip position strategy */
  position: z.enum(["auto", "top", "bottom", "left", "right"]).default("auto"),
  /** Snap to nearest data point */
  snap: z.boolean().default(true),
  /** Show crosshair lines */
  crosshair: z.boolean().default(true),
  /** Crosshair style */
  crosshairStyle: z.enum(["line", "dashed", "dotted"]).default("dashed"),
  /** Background color */
  backgroundColor: z.string().default("#FFFFFF"),
  /** Border color */
  borderColor: z.string().default("#E5E7EB"),
  /** Border radius */
  borderRadius: z.string().default("6px"),
  /** Shadow */
  shadow: z.boolean().default(true),
  /** Font size */
  fontSize: z.string().default("0.75rem"),
  /** Value format */
  valueFormat: z.string().optional(),
  /** Date format (for time axes) */
  dateFormat: z.string().optional(),
}).strict();

export type TooltipConfig = z.infer<typeof TooltipConfigSchema>;

// ---------------------------------------------------------------------------
// Responsive Config
// ---------------------------------------------------------------------------

export const ChartResponsiveConfigSchema = z.object({
  /** Maintain aspect ratio on resize */
  maintainAspectRatio: z.boolean().default(true),
  /** Aspect ratio (width / height) */
  aspectRatio: z.number().default(2),
  /** Minimum height (px) */
  minHeight: z.number().default(200),
  /** Maximum height (px) */
  maxHeight: z.number().optional(),
  /** Debounce resize events (ms) */
  resizeDebounce: z.number().default(100),
  /** Breakpoint-specific overrides */
  breakpoints: z.array(z.object({
    /** Max width at which this override applies */
    maxWidth: z.number(),
    /** Override aspect ratio */
    aspectRatio: z.number().optional(),
    /** Override legend position */
    legendPosition: z.enum(["top", "bottom", "left", "right", "hidden"]).optional(),
    /** Override font size scale factor */
    fontScale: z.number().optional(),
    /** Override tick count */
    tickCount: z.number().optional(),
  })).default([]),
}).strict();

export type ChartResponsiveConfig = z.infer<typeof ChartResponsiveConfigSchema>;

// ---------------------------------------------------------------------------
// Data Series
// ---------------------------------------------------------------------------

export const DataPointSchema = z.object({
  x: z.union([z.number(), z.string(), z.date()]),
  y: z.number(),
  label: z.string().optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export type DataPoint = z.infer<typeof DataPointSchema>;

export const DataSeriesSchema = z.object({
  /** Series identifier */
  id: z.string(),
  /** Series display name */
  name: z.string(),
  /** Series color (overrides palette) */
  color: z.string().optional(),
  /** Data points */
  data: z.array(DataPointSchema),
  /** Line / area series specific: show data points */
  showPoints: z.boolean().optional(),
  /** Line / area series specific: line style */
  lineStyle: z.enum(["solid", "dashed", "dotted"]).optional(),
  /** Line / area series specific: line width */
  lineWidth: z.number().optional(),
  /** Area series specific: fill opacity */
  fillOpacity: z.number().min(0).max(1).optional(),
  /** Bar series specific: stack group */
  stackGroup: z.string().optional(),
  /** Scatter series specific: point size */
  pointSize: z.number().optional(),
  /** Whether this series is visible */
  visible: z.boolean().default(true),
  /** Y-axis to use (for dual-axis charts) */
  yAxisId: z.string().optional(),
}).strict();

export type DataSeries = z.infer<typeof DataSeriesSchema>;

// ---------------------------------------------------------------------------
// Annotation
// ---------------------------------------------------------------------------

export const ChartAnnotationSchema = z.object({
  type: z.enum(["line", "band", "point", "label"]),
  /** Axis to annotate */
  axis: z.enum(["x", "y"]).default("y"),
  /** Value for line/point annotations */
  value: z.union([z.number(), z.string()]).optional(),
  /** Start value for band annotations */
  from: z.union([z.number(), z.string()]).optional(),
  /** End value for band annotations */
  to: z.union([z.number(), z.string()]).optional(),
  /** Label text */
  label: z.string().optional(),
  /** Color */
  color: z.string().default("#EF4444"),
  /** Opacity */
  opacity: z.number().min(0).max(1).default(0.3),
  /** Line style */
  lineStyle: z.enum(["solid", "dashed", "dotted"]).default("dashed"),
}).strict();

export type ChartAnnotation = z.infer<typeof ChartAnnotationSchema>;

// ---------------------------------------------------------------------------
// Complete Chart Props
// ---------------------------------------------------------------------------

export const ChartPropsSchema = z.object({
  /** Chart type */
  type: ChartTypeSchema,
  /** Data series */
  series: z.array(DataSeriesSchema),
  /** X-axis configuration */
  xAxis: AxisConfigSchema.optional(),
  /** Y-axis configuration */
  yAxis: AxisConfigSchema.optional(),
  /** Secondary Y-axis configuration (for dual-axis charts) */
  yAxisSecondary: AxisConfigSchema.optional(),
  /** Legend configuration */
  legend: LegendConfigSchema.optional(),
  /** Tooltip configuration */
  tooltip: TooltipConfigSchema.optional(),
  /** Responsive configuration */
  responsive: ChartResponsiveConfigSchema.optional(),
  /** Color palette name */
  colorPalette: z.enum(["default", "pastel", "vibrant", "monochrome"]).default("default"),
  /** Chart title */
  title: z.string().optional(),
  /** Chart subtitle */
  subtitle: z.string().optional(),
  /** Annotations */
  annotations: z.array(ChartAnnotationSchema).default([]),
  /** Chart height (px) */
  height: z.union([z.number(), z.string()]).optional().default(400),
  /** Chart width (px or "100%") */
  width: z.union([z.number(), z.string()]).optional().default("100%"),
  /** Padding */
  padding: z.object({
    top: z.number().default(20),
    right: z.number().default(20),
    bottom: z.number().default(40),
    left: z.number().default(50),
  }).optional(),
  /** Enable animation */
  animated: z.boolean().default(true),
  /** Animation duration (ms) */
  animationDuration: z.number().default(500),
  /** Show loading state */
  loading: z.boolean().default(false),
  /** Empty state message */
  emptyMessage: z.string().default("No data available"),
  /** Enable zoom */
  zoomable: z.boolean().default(false),
  /** Enable pan */
  pannable: z.boolean().default(false),
  /** Enable data download/export */
  exportable: z.boolean().default(false),
  /** Stacked mode (for bar/area charts) */
  stacked: z.boolean().default(false),
  /** Pie chart specific: inner radius (0 = full pie, >0 = donut) */
  innerRadius: z.number().min(0).optional(),
  /** Pie chart specific: label position */
  pieLabels: z.enum(["inside", "outside", "none"]).optional(),
}).strict();

export type ChartProps = z.infer<typeof ChartPropsSchema>;
