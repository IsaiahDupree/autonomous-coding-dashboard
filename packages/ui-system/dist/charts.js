"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChartPropsSchema = exports.ChartAnnotationSchema = exports.DataSeriesSchema = exports.DataPointSchema = exports.ChartResponsiveConfigSchema = exports.TooltipConfigSchema = exports.LegendConfigSchema = exports.AxisConfigSchema = exports.ChartColorPalettes = exports.ChartTypeSchema = exports.ChartTypes = void 0;
/**
 * UI-010: Chart Component Specs
 *
 * Type definitions and Zod schemas for chart types (line, bar, pie, area,
 * scatter), axis config, legend, tooltip, and responsive configuration.
 */
const zod_1 = require("zod");
// ---------------------------------------------------------------------------
// Chart Types
// ---------------------------------------------------------------------------
exports.ChartTypes = ["line", "bar", "pie", "area", "scatter"];
exports.ChartTypeSchema = zod_1.z.enum(exports.ChartTypes);
// ---------------------------------------------------------------------------
// Color Themes (palettes for chart series)
// ---------------------------------------------------------------------------
exports.ChartColorPalettes = {
    default: ["#6366F1", "#EC4899", "#F59E0B", "#10B981", "#3B82F6", "#8B5CF6", "#EF4444", "#14B8A6"],
    pastel: ["#A5B4FC", "#F9A8D4", "#FDE68A", "#6EE7B7", "#93C5FD", "#C4B5FD", "#FCA5A5", "#5EEAD4"],
    vibrant: ["#4F46E5", "#DB2777", "#D97706", "#059669", "#2563EB", "#7C3AED", "#DC2626", "#0D9488"],
    monochrome: ["#111827", "#374151", "#6B7280", "#9CA3AF", "#D1D5DB", "#E5E7EB", "#F3F4F6", "#F9FAFB"],
};
// ---------------------------------------------------------------------------
// Axis Config
// ---------------------------------------------------------------------------
exports.AxisConfigSchema = zod_1.z.object({
    /** Axis label */
    label: zod_1.z.string().optional(),
    /** Show axis line */
    showLine: zod_1.z.boolean().default(true),
    /** Show grid lines */
    showGrid: zod_1.z.boolean().default(true),
    /** Show tick marks */
    showTicks: zod_1.z.boolean().default(true),
    /** Tick count (approximate) */
    tickCount: zod_1.z.number().int().positive().optional(),
    /** Tick format (e.g. date format, number format) */
    tickFormat: zod_1.z.string().optional(),
    /** Minimum value (auto if omitted) */
    min: zod_1.z.number().optional(),
    /** Maximum value (auto if omitted) */
    max: zod_1.z.number().optional(),
    /** Axis type */
    type: zod_1.z.enum(["linear", "logarithmic", "time", "category"]).default("linear"),
    /** Grid line style */
    gridStyle: zod_1.z.enum(["solid", "dashed", "dotted"]).default("dashed"),
    /** Grid line color */
    gridColor: zod_1.z.string().default("#E5E7EB"),
    /** Axis color */
    axisColor: zod_1.z.string().default("#9CA3AF"),
    /** Label font size */
    labelFontSize: zod_1.z.string().default("0.75rem"),
    /** Axis position */
    position: zod_1.z.enum(["top", "bottom", "left", "right"]).optional(),
}).strict();
// ---------------------------------------------------------------------------
// Legend Config
// ---------------------------------------------------------------------------
exports.LegendConfigSchema = zod_1.z.object({
    /** Show legend */
    show: zod_1.z.boolean().default(true),
    /** Legend position */
    position: zod_1.z.enum(["top", "bottom", "left", "right"]).default("bottom"),
    /** Legend alignment */
    alignment: zod_1.z.enum(["start", "center", "end"]).default("center"),
    /** Legend layout */
    layout: zod_1.z.enum(["horizontal", "vertical"]).default("horizontal"),
    /** Max visible items (scroll or paginate beyond this) */
    maxItems: zod_1.z.number().int().positive().optional(),
    /** Item gap (px) */
    gap: zod_1.z.number().default(16),
    /** Marker shape */
    markerShape: zod_1.z.enum(["circle", "square", "line", "diamond"]).default("circle"),
    /** Marker size */
    markerSize: zod_1.z.number().default(10),
    /** Enable click-to-toggle series visibility */
    interactive: zod_1.z.boolean().default(true),
    /** Font size */
    fontSize: zod_1.z.string().default("0.75rem"),
}).strict();
// ---------------------------------------------------------------------------
// Tooltip Config
// ---------------------------------------------------------------------------
exports.TooltipConfigSchema = zod_1.z.object({
    /** Enable tooltip */
    enabled: zod_1.z.boolean().default(true),
    /** Trigger mode */
    trigger: zod_1.z.enum(["hover", "click", "none"]).default("hover"),
    /** Show shared tooltip across all series at the same x-value */
    shared: zod_1.z.boolean().default(true),
    /** Tooltip position strategy */
    position: zod_1.z.enum(["auto", "top", "bottom", "left", "right"]).default("auto"),
    /** Snap to nearest data point */
    snap: zod_1.z.boolean().default(true),
    /** Show crosshair lines */
    crosshair: zod_1.z.boolean().default(true),
    /** Crosshair style */
    crosshairStyle: zod_1.z.enum(["line", "dashed", "dotted"]).default("dashed"),
    /** Background color */
    backgroundColor: zod_1.z.string().default("#FFFFFF"),
    /** Border color */
    borderColor: zod_1.z.string().default("#E5E7EB"),
    /** Border radius */
    borderRadius: zod_1.z.string().default("6px"),
    /** Shadow */
    shadow: zod_1.z.boolean().default(true),
    /** Font size */
    fontSize: zod_1.z.string().default("0.75rem"),
    /** Value format */
    valueFormat: zod_1.z.string().optional(),
    /** Date format (for time axes) */
    dateFormat: zod_1.z.string().optional(),
}).strict();
// ---------------------------------------------------------------------------
// Responsive Config
// ---------------------------------------------------------------------------
exports.ChartResponsiveConfigSchema = zod_1.z.object({
    /** Maintain aspect ratio on resize */
    maintainAspectRatio: zod_1.z.boolean().default(true),
    /** Aspect ratio (width / height) */
    aspectRatio: zod_1.z.number().default(2),
    /** Minimum height (px) */
    minHeight: zod_1.z.number().default(200),
    /** Maximum height (px) */
    maxHeight: zod_1.z.number().optional(),
    /** Debounce resize events (ms) */
    resizeDebounce: zod_1.z.number().default(100),
    /** Breakpoint-specific overrides */
    breakpoints: zod_1.z.array(zod_1.z.object({
        /** Max width at which this override applies */
        maxWidth: zod_1.z.number(),
        /** Override aspect ratio */
        aspectRatio: zod_1.z.number().optional(),
        /** Override legend position */
        legendPosition: zod_1.z.enum(["top", "bottom", "left", "right", "hidden"]).optional(),
        /** Override font size scale factor */
        fontScale: zod_1.z.number().optional(),
        /** Override tick count */
        tickCount: zod_1.z.number().optional(),
    })).default([]),
}).strict();
// ---------------------------------------------------------------------------
// Data Series
// ---------------------------------------------------------------------------
exports.DataPointSchema = zod_1.z.object({
    x: zod_1.z.union([zod_1.z.number(), zod_1.z.string(), zod_1.z.date()]),
    y: zod_1.z.number(),
    label: zod_1.z.string().optional(),
    meta: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
exports.DataSeriesSchema = zod_1.z.object({
    /** Series identifier */
    id: zod_1.z.string(),
    /** Series display name */
    name: zod_1.z.string(),
    /** Series color (overrides palette) */
    color: zod_1.z.string().optional(),
    /** Data points */
    data: zod_1.z.array(exports.DataPointSchema),
    /** Line / area series specific: show data points */
    showPoints: zod_1.z.boolean().optional(),
    /** Line / area series specific: line style */
    lineStyle: zod_1.z.enum(["solid", "dashed", "dotted"]).optional(),
    /** Line / area series specific: line width */
    lineWidth: zod_1.z.number().optional(),
    /** Area series specific: fill opacity */
    fillOpacity: zod_1.z.number().min(0).max(1).optional(),
    /** Bar series specific: stack group */
    stackGroup: zod_1.z.string().optional(),
    /** Scatter series specific: point size */
    pointSize: zod_1.z.number().optional(),
    /** Whether this series is visible */
    visible: zod_1.z.boolean().default(true),
    /** Y-axis to use (for dual-axis charts) */
    yAxisId: zod_1.z.string().optional(),
}).strict();
// ---------------------------------------------------------------------------
// Annotation
// ---------------------------------------------------------------------------
exports.ChartAnnotationSchema = zod_1.z.object({
    type: zod_1.z.enum(["line", "band", "point", "label"]),
    /** Axis to annotate */
    axis: zod_1.z.enum(["x", "y"]).default("y"),
    /** Value for line/point annotations */
    value: zod_1.z.union([zod_1.z.number(), zod_1.z.string()]).optional(),
    /** Start value for band annotations */
    from: zod_1.z.union([zod_1.z.number(), zod_1.z.string()]).optional(),
    /** End value for band annotations */
    to: zod_1.z.union([zod_1.z.number(), zod_1.z.string()]).optional(),
    /** Label text */
    label: zod_1.z.string().optional(),
    /** Color */
    color: zod_1.z.string().default("#EF4444"),
    /** Opacity */
    opacity: zod_1.z.number().min(0).max(1).default(0.3),
    /** Line style */
    lineStyle: zod_1.z.enum(["solid", "dashed", "dotted"]).default("dashed"),
}).strict();
// ---------------------------------------------------------------------------
// Complete Chart Props
// ---------------------------------------------------------------------------
exports.ChartPropsSchema = zod_1.z.object({
    /** Chart type */
    type: exports.ChartTypeSchema,
    /** Data series */
    series: zod_1.z.array(exports.DataSeriesSchema),
    /** X-axis configuration */
    xAxis: exports.AxisConfigSchema.optional(),
    /** Y-axis configuration */
    yAxis: exports.AxisConfigSchema.optional(),
    /** Secondary Y-axis configuration (for dual-axis charts) */
    yAxisSecondary: exports.AxisConfigSchema.optional(),
    /** Legend configuration */
    legend: exports.LegendConfigSchema.optional(),
    /** Tooltip configuration */
    tooltip: exports.TooltipConfigSchema.optional(),
    /** Responsive configuration */
    responsive: exports.ChartResponsiveConfigSchema.optional(),
    /** Color palette name */
    colorPalette: zod_1.z.enum(["default", "pastel", "vibrant", "monochrome"]).default("default"),
    /** Chart title */
    title: zod_1.z.string().optional(),
    /** Chart subtitle */
    subtitle: zod_1.z.string().optional(),
    /** Annotations */
    annotations: zod_1.z.array(exports.ChartAnnotationSchema).default([]),
    /** Chart height (px) */
    height: zod_1.z.union([zod_1.z.number(), zod_1.z.string()]).optional().default(400),
    /** Chart width (px or "100%") */
    width: zod_1.z.union([zod_1.z.number(), zod_1.z.string()]).optional().default("100%"),
    /** Padding */
    padding: zod_1.z.object({
        top: zod_1.z.number().default(20),
        right: zod_1.z.number().default(20),
        bottom: zod_1.z.number().default(40),
        left: zod_1.z.number().default(50),
    }).optional(),
    /** Enable animation */
    animated: zod_1.z.boolean().default(true),
    /** Animation duration (ms) */
    animationDuration: zod_1.z.number().default(500),
    /** Show loading state */
    loading: zod_1.z.boolean().default(false),
    /** Empty state message */
    emptyMessage: zod_1.z.string().default("No data available"),
    /** Enable zoom */
    zoomable: zod_1.z.boolean().default(false),
    /** Enable pan */
    pannable: zod_1.z.boolean().default(false),
    /** Enable data download/export */
    exportable: zod_1.z.boolean().default(false),
    /** Stacked mode (for bar/area charts) */
    stacked: zod_1.z.boolean().default(false),
    /** Pie chart specific: inner radius (0 = full pie, >0 = donut) */
    innerRadius: zod_1.z.number().min(0).optional(),
    /** Pie chart specific: label position */
    pieLabels: zod_1.z.enum(["inside", "outside", "none"]).optional(),
}).strict();
//# sourceMappingURL=charts.js.map