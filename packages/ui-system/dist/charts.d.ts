/**
 * UI-010: Chart Component Specs
 *
 * Type definitions and Zod schemas for chart types (line, bar, pie, area,
 * scatter), axis config, legend, tooltip, and responsive configuration.
 */
import { z } from "zod";
export declare const ChartTypes: readonly ["line", "bar", "pie", "area", "scatter"];
export type ChartType = (typeof ChartTypes)[number];
export declare const ChartTypeSchema: z.ZodEnum<["line", "bar", "pie", "area", "scatter"]>;
export declare const ChartColorPalettes: {
    readonly default: readonly ["#6366F1", "#EC4899", "#F59E0B", "#10B981", "#3B82F6", "#8B5CF6", "#EF4444", "#14B8A6"];
    readonly pastel: readonly ["#A5B4FC", "#F9A8D4", "#FDE68A", "#6EE7B7", "#93C5FD", "#C4B5FD", "#FCA5A5", "#5EEAD4"];
    readonly vibrant: readonly ["#4F46E5", "#DB2777", "#D97706", "#059669", "#2563EB", "#7C3AED", "#DC2626", "#0D9488"];
    readonly monochrome: readonly ["#111827", "#374151", "#6B7280", "#9CA3AF", "#D1D5DB", "#E5E7EB", "#F3F4F6", "#F9FAFB"];
};
export type ChartColorPalettes = typeof ChartColorPalettes;
export declare const AxisConfigSchema: z.ZodObject<{
    /** Axis label */
    label: z.ZodOptional<z.ZodString>;
    /** Show axis line */
    showLine: z.ZodDefault<z.ZodBoolean>;
    /** Show grid lines */
    showGrid: z.ZodDefault<z.ZodBoolean>;
    /** Show tick marks */
    showTicks: z.ZodDefault<z.ZodBoolean>;
    /** Tick count (approximate) */
    tickCount: z.ZodOptional<z.ZodNumber>;
    /** Tick format (e.g. date format, number format) */
    tickFormat: z.ZodOptional<z.ZodString>;
    /** Minimum value (auto if omitted) */
    min: z.ZodOptional<z.ZodNumber>;
    /** Maximum value (auto if omitted) */
    max: z.ZodOptional<z.ZodNumber>;
    /** Axis type */
    type: z.ZodDefault<z.ZodEnum<["linear", "logarithmic", "time", "category"]>>;
    /** Grid line style */
    gridStyle: z.ZodDefault<z.ZodEnum<["solid", "dashed", "dotted"]>>;
    /** Grid line color */
    gridColor: z.ZodDefault<z.ZodString>;
    /** Axis color */
    axisColor: z.ZodDefault<z.ZodString>;
    /** Label font size */
    labelFontSize: z.ZodDefault<z.ZodString>;
    /** Axis position */
    position: z.ZodOptional<z.ZodEnum<["top", "bottom", "left", "right"]>>;
}, "strict", z.ZodTypeAny, {
    type: "linear" | "logarithmic" | "time" | "category";
    showLine: boolean;
    showGrid: boolean;
    showTicks: boolean;
    gridStyle: "solid" | "dashed" | "dotted";
    gridColor: string;
    axisColor: string;
    labelFontSize: string;
    position?: "left" | "right" | "top" | "bottom" | undefined;
    label?: string | undefined;
    min?: number | undefined;
    max?: number | undefined;
    tickCount?: number | undefined;
    tickFormat?: string | undefined;
}, {
    type?: "linear" | "logarithmic" | "time" | "category" | undefined;
    position?: "left" | "right" | "top" | "bottom" | undefined;
    label?: string | undefined;
    min?: number | undefined;
    max?: number | undefined;
    showLine?: boolean | undefined;
    showGrid?: boolean | undefined;
    showTicks?: boolean | undefined;
    tickCount?: number | undefined;
    tickFormat?: string | undefined;
    gridStyle?: "solid" | "dashed" | "dotted" | undefined;
    gridColor?: string | undefined;
    axisColor?: string | undefined;
    labelFontSize?: string | undefined;
}>;
export type AxisConfig = z.infer<typeof AxisConfigSchema>;
export declare const LegendConfigSchema: z.ZodObject<{
    /** Show legend */
    show: z.ZodDefault<z.ZodBoolean>;
    /** Legend position */
    position: z.ZodDefault<z.ZodEnum<["top", "bottom", "left", "right"]>>;
    /** Legend alignment */
    alignment: z.ZodDefault<z.ZodEnum<["start", "center", "end"]>>;
    /** Legend layout */
    layout: z.ZodDefault<z.ZodEnum<["horizontal", "vertical"]>>;
    /** Max visible items (scroll or paginate beyond this) */
    maxItems: z.ZodOptional<z.ZodNumber>;
    /** Item gap (px) */
    gap: z.ZodDefault<z.ZodNumber>;
    /** Marker shape */
    markerShape: z.ZodDefault<z.ZodEnum<["circle", "square", "line", "diamond"]>>;
    /** Marker size */
    markerSize: z.ZodDefault<z.ZodNumber>;
    /** Enable click-to-toggle series visibility */
    interactive: z.ZodDefault<z.ZodBoolean>;
    /** Font size */
    fontSize: z.ZodDefault<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    gap: number;
    alignment: "start" | "center" | "end";
    position: "left" | "right" | "top" | "bottom";
    layout: "horizontal" | "vertical";
    show: boolean;
    markerShape: "line" | "circle" | "square" | "diamond";
    markerSize: number;
    interactive: boolean;
    fontSize: string;
    maxItems?: number | undefined;
}, {
    gap?: number | undefined;
    alignment?: "start" | "center" | "end" | undefined;
    position?: "left" | "right" | "top" | "bottom" | undefined;
    layout?: "horizontal" | "vertical" | undefined;
    show?: boolean | undefined;
    maxItems?: number | undefined;
    markerShape?: "line" | "circle" | "square" | "diamond" | undefined;
    markerSize?: number | undefined;
    interactive?: boolean | undefined;
    fontSize?: string | undefined;
}>;
export type LegendConfig = z.infer<typeof LegendConfigSchema>;
export declare const TooltipConfigSchema: z.ZodObject<{
    /** Enable tooltip */
    enabled: z.ZodDefault<z.ZodBoolean>;
    /** Trigger mode */
    trigger: z.ZodDefault<z.ZodEnum<["hover", "click", "none"]>>;
    /** Show shared tooltip across all series at the same x-value */
    shared: z.ZodDefault<z.ZodBoolean>;
    /** Tooltip position strategy */
    position: z.ZodDefault<z.ZodEnum<["auto", "top", "bottom", "left", "right"]>>;
    /** Snap to nearest data point */
    snap: z.ZodDefault<z.ZodBoolean>;
    /** Show crosshair lines */
    crosshair: z.ZodDefault<z.ZodBoolean>;
    /** Crosshair style */
    crosshairStyle: z.ZodDefault<z.ZodEnum<["line", "dashed", "dotted"]>>;
    /** Background color */
    backgroundColor: z.ZodDefault<z.ZodString>;
    /** Border color */
    borderColor: z.ZodDefault<z.ZodString>;
    /** Border radius */
    borderRadius: z.ZodDefault<z.ZodString>;
    /** Shadow */
    shadow: z.ZodDefault<z.ZodBoolean>;
    /** Font size */
    fontSize: z.ZodDefault<z.ZodString>;
    /** Value format */
    valueFormat: z.ZodOptional<z.ZodString>;
    /** Date format (for time axes) */
    dateFormat: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    position: "left" | "right" | "top" | "bottom" | "auto";
    borderRadius: string;
    enabled: boolean;
    fontSize: string;
    trigger: "hover" | "none" | "click";
    shared: boolean;
    snap: boolean;
    crosshair: boolean;
    crosshairStyle: "line" | "dashed" | "dotted";
    backgroundColor: string;
    borderColor: string;
    shadow: boolean;
    valueFormat?: string | undefined;
    dateFormat?: string | undefined;
}, {
    position?: "left" | "right" | "top" | "bottom" | "auto" | undefined;
    borderRadius?: string | undefined;
    enabled?: boolean | undefined;
    fontSize?: string | undefined;
    trigger?: "hover" | "none" | "click" | undefined;
    shared?: boolean | undefined;
    snap?: boolean | undefined;
    crosshair?: boolean | undefined;
    crosshairStyle?: "line" | "dashed" | "dotted" | undefined;
    backgroundColor?: string | undefined;
    borderColor?: string | undefined;
    shadow?: boolean | undefined;
    valueFormat?: string | undefined;
    dateFormat?: string | undefined;
}>;
export type TooltipConfig = z.infer<typeof TooltipConfigSchema>;
export declare const ChartResponsiveConfigSchema: z.ZodObject<{
    /** Maintain aspect ratio on resize */
    maintainAspectRatio: z.ZodDefault<z.ZodBoolean>;
    /** Aspect ratio (width / height) */
    aspectRatio: z.ZodDefault<z.ZodNumber>;
    /** Minimum height (px) */
    minHeight: z.ZodDefault<z.ZodNumber>;
    /** Maximum height (px) */
    maxHeight: z.ZodOptional<z.ZodNumber>;
    /** Debounce resize events (ms) */
    resizeDebounce: z.ZodDefault<z.ZodNumber>;
    /** Breakpoint-specific overrides */
    breakpoints: z.ZodDefault<z.ZodArray<z.ZodObject<{
        /** Max width at which this override applies */
        maxWidth: z.ZodNumber;
        /** Override aspect ratio */
        aspectRatio: z.ZodOptional<z.ZodNumber>;
        /** Override legend position */
        legendPosition: z.ZodOptional<z.ZodEnum<["top", "bottom", "left", "right", "hidden"]>>;
        /** Override font size scale factor */
        fontScale: z.ZodOptional<z.ZodNumber>;
        /** Override tick count */
        tickCount: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        maxWidth: number;
        aspectRatio?: number | undefined;
        tickCount?: number | undefined;
        legendPosition?: "left" | "right" | "top" | "bottom" | "hidden" | undefined;
        fontScale?: number | undefined;
    }, {
        maxWidth: number;
        aspectRatio?: number | undefined;
        tickCount?: number | undefined;
        legendPosition?: "left" | "right" | "top" | "bottom" | "hidden" | undefined;
        fontScale?: number | undefined;
    }>, "many">>;
}, "strict", z.ZodTypeAny, {
    aspectRatio: number;
    minHeight: number;
    maintainAspectRatio: boolean;
    resizeDebounce: number;
    breakpoints: {
        maxWidth: number;
        aspectRatio?: number | undefined;
        tickCount?: number | undefined;
        legendPosition?: "left" | "right" | "top" | "bottom" | "hidden" | undefined;
        fontScale?: number | undefined;
    }[];
    maxHeight?: number | undefined;
}, {
    maxHeight?: number | undefined;
    aspectRatio?: number | undefined;
    minHeight?: number | undefined;
    maintainAspectRatio?: boolean | undefined;
    resizeDebounce?: number | undefined;
    breakpoints?: {
        maxWidth: number;
        aspectRatio?: number | undefined;
        tickCount?: number | undefined;
        legendPosition?: "left" | "right" | "top" | "bottom" | "hidden" | undefined;
        fontScale?: number | undefined;
    }[] | undefined;
}>;
export type ChartResponsiveConfig = z.infer<typeof ChartResponsiveConfigSchema>;
export declare const DataPointSchema: z.ZodObject<{
    x: z.ZodUnion<[z.ZodNumber, z.ZodString, z.ZodDate]>;
    y: z.ZodNumber;
    label: z.ZodOptional<z.ZodString>;
    meta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    x: string | number | Date;
    y: number;
    label?: string | undefined;
    meta?: Record<string, unknown> | undefined;
}, {
    x: string | number | Date;
    y: number;
    label?: string | undefined;
    meta?: Record<string, unknown> | undefined;
}>;
export type DataPoint = z.infer<typeof DataPointSchema>;
export declare const DataSeriesSchema: z.ZodObject<{
    /** Series identifier */
    id: z.ZodString;
    /** Series display name */
    name: z.ZodString;
    /** Series color (overrides palette) */
    color: z.ZodOptional<z.ZodString>;
    /** Data points */
    data: z.ZodArray<z.ZodObject<{
        x: z.ZodUnion<[z.ZodNumber, z.ZodString, z.ZodDate]>;
        y: z.ZodNumber;
        label: z.ZodOptional<z.ZodString>;
        meta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        x: string | number | Date;
        y: number;
        label?: string | undefined;
        meta?: Record<string, unknown> | undefined;
    }, {
        x: string | number | Date;
        y: number;
        label?: string | undefined;
        meta?: Record<string, unknown> | undefined;
    }>, "many">;
    /** Line / area series specific: show data points */
    showPoints: z.ZodOptional<z.ZodBoolean>;
    /** Line / area series specific: line style */
    lineStyle: z.ZodOptional<z.ZodEnum<["solid", "dashed", "dotted"]>>;
    /** Line / area series specific: line width */
    lineWidth: z.ZodOptional<z.ZodNumber>;
    /** Area series specific: fill opacity */
    fillOpacity: z.ZodOptional<z.ZodNumber>;
    /** Bar series specific: stack group */
    stackGroup: z.ZodOptional<z.ZodString>;
    /** Scatter series specific: point size */
    pointSize: z.ZodOptional<z.ZodNumber>;
    /** Whether this series is visible */
    visible: z.ZodDefault<z.ZodBoolean>;
    /** Y-axis to use (for dual-axis charts) */
    yAxisId: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    id: string;
    name: string;
    data: {
        x: string | number | Date;
        y: number;
        label?: string | undefined;
        meta?: Record<string, unknown> | undefined;
    }[];
    visible: boolean;
    color?: string | undefined;
    showPoints?: boolean | undefined;
    lineStyle?: "solid" | "dashed" | "dotted" | undefined;
    lineWidth?: number | undefined;
    fillOpacity?: number | undefined;
    stackGroup?: string | undefined;
    pointSize?: number | undefined;
    yAxisId?: string | undefined;
}, {
    id: string;
    name: string;
    data: {
        x: string | number | Date;
        y: number;
        label?: string | undefined;
        meta?: Record<string, unknown> | undefined;
    }[];
    color?: string | undefined;
    showPoints?: boolean | undefined;
    lineStyle?: "solid" | "dashed" | "dotted" | undefined;
    lineWidth?: number | undefined;
    fillOpacity?: number | undefined;
    stackGroup?: string | undefined;
    pointSize?: number | undefined;
    visible?: boolean | undefined;
    yAxisId?: string | undefined;
}>;
export type DataSeries = z.infer<typeof DataSeriesSchema>;
export declare const ChartAnnotationSchema: z.ZodObject<{
    type: z.ZodEnum<["line", "band", "point", "label"]>;
    /** Axis to annotate */
    axis: z.ZodDefault<z.ZodEnum<["x", "y"]>>;
    /** Value for line/point annotations */
    value: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
    /** Start value for band annotations */
    from: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
    /** End value for band annotations */
    to: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
    /** Label text */
    label: z.ZodOptional<z.ZodString>;
    /** Color */
    color: z.ZodDefault<z.ZodString>;
    /** Opacity */
    opacity: z.ZodDefault<z.ZodNumber>;
    /** Line style */
    lineStyle: z.ZodDefault<z.ZodEnum<["solid", "dashed", "dotted"]>>;
}, "strict", z.ZodTypeAny, {
    type: "label" | "line" | "band" | "point";
    color: string;
    lineStyle: "solid" | "dashed" | "dotted";
    axis: "x" | "y";
    opacity: number;
    value?: string | number | undefined;
    label?: string | undefined;
    from?: string | number | undefined;
    to?: string | number | undefined;
}, {
    type: "label" | "line" | "band" | "point";
    value?: string | number | undefined;
    label?: string | undefined;
    color?: string | undefined;
    lineStyle?: "solid" | "dashed" | "dotted" | undefined;
    axis?: "x" | "y" | undefined;
    from?: string | number | undefined;
    to?: string | number | undefined;
    opacity?: number | undefined;
}>;
export type ChartAnnotation = z.infer<typeof ChartAnnotationSchema>;
export declare const ChartPropsSchema: z.ZodObject<{
    /** Chart type */
    type: z.ZodEnum<["line", "bar", "pie", "area", "scatter"]>;
    /** Data series */
    series: z.ZodArray<z.ZodObject<{
        /** Series identifier */
        id: z.ZodString;
        /** Series display name */
        name: z.ZodString;
        /** Series color (overrides palette) */
        color: z.ZodOptional<z.ZodString>;
        /** Data points */
        data: z.ZodArray<z.ZodObject<{
            x: z.ZodUnion<[z.ZodNumber, z.ZodString, z.ZodDate]>;
            y: z.ZodNumber;
            label: z.ZodOptional<z.ZodString>;
            meta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, "strip", z.ZodTypeAny, {
            x: string | number | Date;
            y: number;
            label?: string | undefined;
            meta?: Record<string, unknown> | undefined;
        }, {
            x: string | number | Date;
            y: number;
            label?: string | undefined;
            meta?: Record<string, unknown> | undefined;
        }>, "many">;
        /** Line / area series specific: show data points */
        showPoints: z.ZodOptional<z.ZodBoolean>;
        /** Line / area series specific: line style */
        lineStyle: z.ZodOptional<z.ZodEnum<["solid", "dashed", "dotted"]>>;
        /** Line / area series specific: line width */
        lineWidth: z.ZodOptional<z.ZodNumber>;
        /** Area series specific: fill opacity */
        fillOpacity: z.ZodOptional<z.ZodNumber>;
        /** Bar series specific: stack group */
        stackGroup: z.ZodOptional<z.ZodString>;
        /** Scatter series specific: point size */
        pointSize: z.ZodOptional<z.ZodNumber>;
        /** Whether this series is visible */
        visible: z.ZodDefault<z.ZodBoolean>;
        /** Y-axis to use (for dual-axis charts) */
        yAxisId: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        id: string;
        name: string;
        data: {
            x: string | number | Date;
            y: number;
            label?: string | undefined;
            meta?: Record<string, unknown> | undefined;
        }[];
        visible: boolean;
        color?: string | undefined;
        showPoints?: boolean | undefined;
        lineStyle?: "solid" | "dashed" | "dotted" | undefined;
        lineWidth?: number | undefined;
        fillOpacity?: number | undefined;
        stackGroup?: string | undefined;
        pointSize?: number | undefined;
        yAxisId?: string | undefined;
    }, {
        id: string;
        name: string;
        data: {
            x: string | number | Date;
            y: number;
            label?: string | undefined;
            meta?: Record<string, unknown> | undefined;
        }[];
        color?: string | undefined;
        showPoints?: boolean | undefined;
        lineStyle?: "solid" | "dashed" | "dotted" | undefined;
        lineWidth?: number | undefined;
        fillOpacity?: number | undefined;
        stackGroup?: string | undefined;
        pointSize?: number | undefined;
        visible?: boolean | undefined;
        yAxisId?: string | undefined;
    }>, "many">;
    /** X-axis configuration */
    xAxis: z.ZodOptional<z.ZodObject<{
        /** Axis label */
        label: z.ZodOptional<z.ZodString>;
        /** Show axis line */
        showLine: z.ZodDefault<z.ZodBoolean>;
        /** Show grid lines */
        showGrid: z.ZodDefault<z.ZodBoolean>;
        /** Show tick marks */
        showTicks: z.ZodDefault<z.ZodBoolean>;
        /** Tick count (approximate) */
        tickCount: z.ZodOptional<z.ZodNumber>;
        /** Tick format (e.g. date format, number format) */
        tickFormat: z.ZodOptional<z.ZodString>;
        /** Minimum value (auto if omitted) */
        min: z.ZodOptional<z.ZodNumber>;
        /** Maximum value (auto if omitted) */
        max: z.ZodOptional<z.ZodNumber>;
        /** Axis type */
        type: z.ZodDefault<z.ZodEnum<["linear", "logarithmic", "time", "category"]>>;
        /** Grid line style */
        gridStyle: z.ZodDefault<z.ZodEnum<["solid", "dashed", "dotted"]>>;
        /** Grid line color */
        gridColor: z.ZodDefault<z.ZodString>;
        /** Axis color */
        axisColor: z.ZodDefault<z.ZodString>;
        /** Label font size */
        labelFontSize: z.ZodDefault<z.ZodString>;
        /** Axis position */
        position: z.ZodOptional<z.ZodEnum<["top", "bottom", "left", "right"]>>;
    }, "strict", z.ZodTypeAny, {
        type: "linear" | "logarithmic" | "time" | "category";
        showLine: boolean;
        showGrid: boolean;
        showTicks: boolean;
        gridStyle: "solid" | "dashed" | "dotted";
        gridColor: string;
        axisColor: string;
        labelFontSize: string;
        position?: "left" | "right" | "top" | "bottom" | undefined;
        label?: string | undefined;
        min?: number | undefined;
        max?: number | undefined;
        tickCount?: number | undefined;
        tickFormat?: string | undefined;
    }, {
        type?: "linear" | "logarithmic" | "time" | "category" | undefined;
        position?: "left" | "right" | "top" | "bottom" | undefined;
        label?: string | undefined;
        min?: number | undefined;
        max?: number | undefined;
        showLine?: boolean | undefined;
        showGrid?: boolean | undefined;
        showTicks?: boolean | undefined;
        tickCount?: number | undefined;
        tickFormat?: string | undefined;
        gridStyle?: "solid" | "dashed" | "dotted" | undefined;
        gridColor?: string | undefined;
        axisColor?: string | undefined;
        labelFontSize?: string | undefined;
    }>>;
    /** Y-axis configuration */
    yAxis: z.ZodOptional<z.ZodObject<{
        /** Axis label */
        label: z.ZodOptional<z.ZodString>;
        /** Show axis line */
        showLine: z.ZodDefault<z.ZodBoolean>;
        /** Show grid lines */
        showGrid: z.ZodDefault<z.ZodBoolean>;
        /** Show tick marks */
        showTicks: z.ZodDefault<z.ZodBoolean>;
        /** Tick count (approximate) */
        tickCount: z.ZodOptional<z.ZodNumber>;
        /** Tick format (e.g. date format, number format) */
        tickFormat: z.ZodOptional<z.ZodString>;
        /** Minimum value (auto if omitted) */
        min: z.ZodOptional<z.ZodNumber>;
        /** Maximum value (auto if omitted) */
        max: z.ZodOptional<z.ZodNumber>;
        /** Axis type */
        type: z.ZodDefault<z.ZodEnum<["linear", "logarithmic", "time", "category"]>>;
        /** Grid line style */
        gridStyle: z.ZodDefault<z.ZodEnum<["solid", "dashed", "dotted"]>>;
        /** Grid line color */
        gridColor: z.ZodDefault<z.ZodString>;
        /** Axis color */
        axisColor: z.ZodDefault<z.ZodString>;
        /** Label font size */
        labelFontSize: z.ZodDefault<z.ZodString>;
        /** Axis position */
        position: z.ZodOptional<z.ZodEnum<["top", "bottom", "left", "right"]>>;
    }, "strict", z.ZodTypeAny, {
        type: "linear" | "logarithmic" | "time" | "category";
        showLine: boolean;
        showGrid: boolean;
        showTicks: boolean;
        gridStyle: "solid" | "dashed" | "dotted";
        gridColor: string;
        axisColor: string;
        labelFontSize: string;
        position?: "left" | "right" | "top" | "bottom" | undefined;
        label?: string | undefined;
        min?: number | undefined;
        max?: number | undefined;
        tickCount?: number | undefined;
        tickFormat?: string | undefined;
    }, {
        type?: "linear" | "logarithmic" | "time" | "category" | undefined;
        position?: "left" | "right" | "top" | "bottom" | undefined;
        label?: string | undefined;
        min?: number | undefined;
        max?: number | undefined;
        showLine?: boolean | undefined;
        showGrid?: boolean | undefined;
        showTicks?: boolean | undefined;
        tickCount?: number | undefined;
        tickFormat?: string | undefined;
        gridStyle?: "solid" | "dashed" | "dotted" | undefined;
        gridColor?: string | undefined;
        axisColor?: string | undefined;
        labelFontSize?: string | undefined;
    }>>;
    /** Secondary Y-axis configuration (for dual-axis charts) */
    yAxisSecondary: z.ZodOptional<z.ZodObject<{
        /** Axis label */
        label: z.ZodOptional<z.ZodString>;
        /** Show axis line */
        showLine: z.ZodDefault<z.ZodBoolean>;
        /** Show grid lines */
        showGrid: z.ZodDefault<z.ZodBoolean>;
        /** Show tick marks */
        showTicks: z.ZodDefault<z.ZodBoolean>;
        /** Tick count (approximate) */
        tickCount: z.ZodOptional<z.ZodNumber>;
        /** Tick format (e.g. date format, number format) */
        tickFormat: z.ZodOptional<z.ZodString>;
        /** Minimum value (auto if omitted) */
        min: z.ZodOptional<z.ZodNumber>;
        /** Maximum value (auto if omitted) */
        max: z.ZodOptional<z.ZodNumber>;
        /** Axis type */
        type: z.ZodDefault<z.ZodEnum<["linear", "logarithmic", "time", "category"]>>;
        /** Grid line style */
        gridStyle: z.ZodDefault<z.ZodEnum<["solid", "dashed", "dotted"]>>;
        /** Grid line color */
        gridColor: z.ZodDefault<z.ZodString>;
        /** Axis color */
        axisColor: z.ZodDefault<z.ZodString>;
        /** Label font size */
        labelFontSize: z.ZodDefault<z.ZodString>;
        /** Axis position */
        position: z.ZodOptional<z.ZodEnum<["top", "bottom", "left", "right"]>>;
    }, "strict", z.ZodTypeAny, {
        type: "linear" | "logarithmic" | "time" | "category";
        showLine: boolean;
        showGrid: boolean;
        showTicks: boolean;
        gridStyle: "solid" | "dashed" | "dotted";
        gridColor: string;
        axisColor: string;
        labelFontSize: string;
        position?: "left" | "right" | "top" | "bottom" | undefined;
        label?: string | undefined;
        min?: number | undefined;
        max?: number | undefined;
        tickCount?: number | undefined;
        tickFormat?: string | undefined;
    }, {
        type?: "linear" | "logarithmic" | "time" | "category" | undefined;
        position?: "left" | "right" | "top" | "bottom" | undefined;
        label?: string | undefined;
        min?: number | undefined;
        max?: number | undefined;
        showLine?: boolean | undefined;
        showGrid?: boolean | undefined;
        showTicks?: boolean | undefined;
        tickCount?: number | undefined;
        tickFormat?: string | undefined;
        gridStyle?: "solid" | "dashed" | "dotted" | undefined;
        gridColor?: string | undefined;
        axisColor?: string | undefined;
        labelFontSize?: string | undefined;
    }>>;
    /** Legend configuration */
    legend: z.ZodOptional<z.ZodObject<{
        /** Show legend */
        show: z.ZodDefault<z.ZodBoolean>;
        /** Legend position */
        position: z.ZodDefault<z.ZodEnum<["top", "bottom", "left", "right"]>>;
        /** Legend alignment */
        alignment: z.ZodDefault<z.ZodEnum<["start", "center", "end"]>>;
        /** Legend layout */
        layout: z.ZodDefault<z.ZodEnum<["horizontal", "vertical"]>>;
        /** Max visible items (scroll or paginate beyond this) */
        maxItems: z.ZodOptional<z.ZodNumber>;
        /** Item gap (px) */
        gap: z.ZodDefault<z.ZodNumber>;
        /** Marker shape */
        markerShape: z.ZodDefault<z.ZodEnum<["circle", "square", "line", "diamond"]>>;
        /** Marker size */
        markerSize: z.ZodDefault<z.ZodNumber>;
        /** Enable click-to-toggle series visibility */
        interactive: z.ZodDefault<z.ZodBoolean>;
        /** Font size */
        fontSize: z.ZodDefault<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        gap: number;
        alignment: "start" | "center" | "end";
        position: "left" | "right" | "top" | "bottom";
        layout: "horizontal" | "vertical";
        show: boolean;
        markerShape: "line" | "circle" | "square" | "diamond";
        markerSize: number;
        interactive: boolean;
        fontSize: string;
        maxItems?: number | undefined;
    }, {
        gap?: number | undefined;
        alignment?: "start" | "center" | "end" | undefined;
        position?: "left" | "right" | "top" | "bottom" | undefined;
        layout?: "horizontal" | "vertical" | undefined;
        show?: boolean | undefined;
        maxItems?: number | undefined;
        markerShape?: "line" | "circle" | "square" | "diamond" | undefined;
        markerSize?: number | undefined;
        interactive?: boolean | undefined;
        fontSize?: string | undefined;
    }>>;
    /** Tooltip configuration */
    tooltip: z.ZodOptional<z.ZodObject<{
        /** Enable tooltip */
        enabled: z.ZodDefault<z.ZodBoolean>;
        /** Trigger mode */
        trigger: z.ZodDefault<z.ZodEnum<["hover", "click", "none"]>>;
        /** Show shared tooltip across all series at the same x-value */
        shared: z.ZodDefault<z.ZodBoolean>;
        /** Tooltip position strategy */
        position: z.ZodDefault<z.ZodEnum<["auto", "top", "bottom", "left", "right"]>>;
        /** Snap to nearest data point */
        snap: z.ZodDefault<z.ZodBoolean>;
        /** Show crosshair lines */
        crosshair: z.ZodDefault<z.ZodBoolean>;
        /** Crosshair style */
        crosshairStyle: z.ZodDefault<z.ZodEnum<["line", "dashed", "dotted"]>>;
        /** Background color */
        backgroundColor: z.ZodDefault<z.ZodString>;
        /** Border color */
        borderColor: z.ZodDefault<z.ZodString>;
        /** Border radius */
        borderRadius: z.ZodDefault<z.ZodString>;
        /** Shadow */
        shadow: z.ZodDefault<z.ZodBoolean>;
        /** Font size */
        fontSize: z.ZodDefault<z.ZodString>;
        /** Value format */
        valueFormat: z.ZodOptional<z.ZodString>;
        /** Date format (for time axes) */
        dateFormat: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        position: "left" | "right" | "top" | "bottom" | "auto";
        borderRadius: string;
        enabled: boolean;
        fontSize: string;
        trigger: "hover" | "none" | "click";
        shared: boolean;
        snap: boolean;
        crosshair: boolean;
        crosshairStyle: "line" | "dashed" | "dotted";
        backgroundColor: string;
        borderColor: string;
        shadow: boolean;
        valueFormat?: string | undefined;
        dateFormat?: string | undefined;
    }, {
        position?: "left" | "right" | "top" | "bottom" | "auto" | undefined;
        borderRadius?: string | undefined;
        enabled?: boolean | undefined;
        fontSize?: string | undefined;
        trigger?: "hover" | "none" | "click" | undefined;
        shared?: boolean | undefined;
        snap?: boolean | undefined;
        crosshair?: boolean | undefined;
        crosshairStyle?: "line" | "dashed" | "dotted" | undefined;
        backgroundColor?: string | undefined;
        borderColor?: string | undefined;
        shadow?: boolean | undefined;
        valueFormat?: string | undefined;
        dateFormat?: string | undefined;
    }>>;
    /** Responsive configuration */
    responsive: z.ZodOptional<z.ZodObject<{
        /** Maintain aspect ratio on resize */
        maintainAspectRatio: z.ZodDefault<z.ZodBoolean>;
        /** Aspect ratio (width / height) */
        aspectRatio: z.ZodDefault<z.ZodNumber>;
        /** Minimum height (px) */
        minHeight: z.ZodDefault<z.ZodNumber>;
        /** Maximum height (px) */
        maxHeight: z.ZodOptional<z.ZodNumber>;
        /** Debounce resize events (ms) */
        resizeDebounce: z.ZodDefault<z.ZodNumber>;
        /** Breakpoint-specific overrides */
        breakpoints: z.ZodDefault<z.ZodArray<z.ZodObject<{
            /** Max width at which this override applies */
            maxWidth: z.ZodNumber;
            /** Override aspect ratio */
            aspectRatio: z.ZodOptional<z.ZodNumber>;
            /** Override legend position */
            legendPosition: z.ZodOptional<z.ZodEnum<["top", "bottom", "left", "right", "hidden"]>>;
            /** Override font size scale factor */
            fontScale: z.ZodOptional<z.ZodNumber>;
            /** Override tick count */
            tickCount: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            maxWidth: number;
            aspectRatio?: number | undefined;
            tickCount?: number | undefined;
            legendPosition?: "left" | "right" | "top" | "bottom" | "hidden" | undefined;
            fontScale?: number | undefined;
        }, {
            maxWidth: number;
            aspectRatio?: number | undefined;
            tickCount?: number | undefined;
            legendPosition?: "left" | "right" | "top" | "bottom" | "hidden" | undefined;
            fontScale?: number | undefined;
        }>, "many">>;
    }, "strict", z.ZodTypeAny, {
        aspectRatio: number;
        minHeight: number;
        maintainAspectRatio: boolean;
        resizeDebounce: number;
        breakpoints: {
            maxWidth: number;
            aspectRatio?: number | undefined;
            tickCount?: number | undefined;
            legendPosition?: "left" | "right" | "top" | "bottom" | "hidden" | undefined;
            fontScale?: number | undefined;
        }[];
        maxHeight?: number | undefined;
    }, {
        maxHeight?: number | undefined;
        aspectRatio?: number | undefined;
        minHeight?: number | undefined;
        maintainAspectRatio?: boolean | undefined;
        resizeDebounce?: number | undefined;
        breakpoints?: {
            maxWidth: number;
            aspectRatio?: number | undefined;
            tickCount?: number | undefined;
            legendPosition?: "left" | "right" | "top" | "bottom" | "hidden" | undefined;
            fontScale?: number | undefined;
        }[] | undefined;
    }>>;
    /** Color palette name */
    colorPalette: z.ZodDefault<z.ZodEnum<["default", "pastel", "vibrant", "monochrome"]>>;
    /** Chart title */
    title: z.ZodOptional<z.ZodString>;
    /** Chart subtitle */
    subtitle: z.ZodOptional<z.ZodString>;
    /** Annotations */
    annotations: z.ZodDefault<z.ZodArray<z.ZodObject<{
        type: z.ZodEnum<["line", "band", "point", "label"]>;
        /** Axis to annotate */
        axis: z.ZodDefault<z.ZodEnum<["x", "y"]>>;
        /** Value for line/point annotations */
        value: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
        /** Start value for band annotations */
        from: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
        /** End value for band annotations */
        to: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
        /** Label text */
        label: z.ZodOptional<z.ZodString>;
        /** Color */
        color: z.ZodDefault<z.ZodString>;
        /** Opacity */
        opacity: z.ZodDefault<z.ZodNumber>;
        /** Line style */
        lineStyle: z.ZodDefault<z.ZodEnum<["solid", "dashed", "dotted"]>>;
    }, "strict", z.ZodTypeAny, {
        type: "label" | "line" | "band" | "point";
        color: string;
        lineStyle: "solid" | "dashed" | "dotted";
        axis: "x" | "y";
        opacity: number;
        value?: string | number | undefined;
        label?: string | undefined;
        from?: string | number | undefined;
        to?: string | number | undefined;
    }, {
        type: "label" | "line" | "band" | "point";
        value?: string | number | undefined;
        label?: string | undefined;
        color?: string | undefined;
        lineStyle?: "solid" | "dashed" | "dotted" | undefined;
        axis?: "x" | "y" | undefined;
        from?: string | number | undefined;
        to?: string | number | undefined;
        opacity?: number | undefined;
    }>, "many">>;
    /** Chart height (px) */
    height: z.ZodDefault<z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>>;
    /** Chart width (px or "100%") */
    width: z.ZodDefault<z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>>;
    /** Padding */
    padding: z.ZodOptional<z.ZodObject<{
        top: z.ZodDefault<z.ZodNumber>;
        right: z.ZodDefault<z.ZodNumber>;
        bottom: z.ZodDefault<z.ZodNumber>;
        left: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        left: number;
        right: number;
        top: number;
        bottom: number;
    }, {
        left?: number | undefined;
        right?: number | undefined;
        top?: number | undefined;
        bottom?: number | undefined;
    }>>;
    /** Enable animation */
    animated: z.ZodDefault<z.ZodBoolean>;
    /** Animation duration (ms) */
    animationDuration: z.ZodDefault<z.ZodNumber>;
    /** Show loading state */
    loading: z.ZodDefault<z.ZodBoolean>;
    /** Empty state message */
    emptyMessage: z.ZodDefault<z.ZodString>;
    /** Enable zoom */
    zoomable: z.ZodDefault<z.ZodBoolean>;
    /** Enable pan */
    pannable: z.ZodDefault<z.ZodBoolean>;
    /** Enable data download/export */
    exportable: z.ZodDefault<z.ZodBoolean>;
    /** Stacked mode (for bar/area charts) */
    stacked: z.ZodDefault<z.ZodBoolean>;
    /** Pie chart specific: inner radius (0 = full pie, >0 = donut) */
    innerRadius: z.ZodOptional<z.ZodNumber>;
    /** Pie chart specific: label position */
    pieLabels: z.ZodOptional<z.ZodEnum<["inside", "outside", "none"]>>;
}, "strict", z.ZodTypeAny, {
    loading: boolean;
    type: "line" | "bar" | "pie" | "area" | "scatter";
    height: string | number;
    width: string | number;
    series: {
        id: string;
        name: string;
        data: {
            x: string | number | Date;
            y: number;
            label?: string | undefined;
            meta?: Record<string, unknown> | undefined;
        }[];
        visible: boolean;
        color?: string | undefined;
        showPoints?: boolean | undefined;
        lineStyle?: "solid" | "dashed" | "dotted" | undefined;
        lineWidth?: number | undefined;
        fillOpacity?: number | undefined;
        stackGroup?: string | undefined;
        pointSize?: number | undefined;
        yAxisId?: string | undefined;
    }[];
    colorPalette: "default" | "pastel" | "vibrant" | "monochrome";
    annotations: {
        type: "label" | "line" | "band" | "point";
        color: string;
        lineStyle: "solid" | "dashed" | "dotted";
        axis: "x" | "y";
        opacity: number;
        value?: string | number | undefined;
        label?: string | undefined;
        from?: string | number | undefined;
        to?: string | number | undefined;
    }[];
    animated: boolean;
    animationDuration: number;
    emptyMessage: string;
    zoomable: boolean;
    pannable: boolean;
    exportable: boolean;
    stacked: boolean;
    title?: string | undefined;
    subtitle?: string | undefined;
    padding?: {
        left: number;
        right: number;
        top: number;
        bottom: number;
    } | undefined;
    xAxis?: {
        type: "linear" | "logarithmic" | "time" | "category";
        showLine: boolean;
        showGrid: boolean;
        showTicks: boolean;
        gridStyle: "solid" | "dashed" | "dotted";
        gridColor: string;
        axisColor: string;
        labelFontSize: string;
        position?: "left" | "right" | "top" | "bottom" | undefined;
        label?: string | undefined;
        min?: number | undefined;
        max?: number | undefined;
        tickCount?: number | undefined;
        tickFormat?: string | undefined;
    } | undefined;
    yAxis?: {
        type: "linear" | "logarithmic" | "time" | "category";
        showLine: boolean;
        showGrid: boolean;
        showTicks: boolean;
        gridStyle: "solid" | "dashed" | "dotted";
        gridColor: string;
        axisColor: string;
        labelFontSize: string;
        position?: "left" | "right" | "top" | "bottom" | undefined;
        label?: string | undefined;
        min?: number | undefined;
        max?: number | undefined;
        tickCount?: number | undefined;
        tickFormat?: string | undefined;
    } | undefined;
    yAxisSecondary?: {
        type: "linear" | "logarithmic" | "time" | "category";
        showLine: boolean;
        showGrid: boolean;
        showTicks: boolean;
        gridStyle: "solid" | "dashed" | "dotted";
        gridColor: string;
        axisColor: string;
        labelFontSize: string;
        position?: "left" | "right" | "top" | "bottom" | undefined;
        label?: string | undefined;
        min?: number | undefined;
        max?: number | undefined;
        tickCount?: number | undefined;
        tickFormat?: string | undefined;
    } | undefined;
    legend?: {
        gap: number;
        alignment: "start" | "center" | "end";
        position: "left" | "right" | "top" | "bottom";
        layout: "horizontal" | "vertical";
        show: boolean;
        markerShape: "line" | "circle" | "square" | "diamond";
        markerSize: number;
        interactive: boolean;
        fontSize: string;
        maxItems?: number | undefined;
    } | undefined;
    tooltip?: {
        position: "left" | "right" | "top" | "bottom" | "auto";
        borderRadius: string;
        enabled: boolean;
        fontSize: string;
        trigger: "hover" | "none" | "click";
        shared: boolean;
        snap: boolean;
        crosshair: boolean;
        crosshairStyle: "line" | "dashed" | "dotted";
        backgroundColor: string;
        borderColor: string;
        shadow: boolean;
        valueFormat?: string | undefined;
        dateFormat?: string | undefined;
    } | undefined;
    responsive?: {
        aspectRatio: number;
        minHeight: number;
        maintainAspectRatio: boolean;
        resizeDebounce: number;
        breakpoints: {
            maxWidth: number;
            aspectRatio?: number | undefined;
            tickCount?: number | undefined;
            legendPosition?: "left" | "right" | "top" | "bottom" | "hidden" | undefined;
            fontScale?: number | undefined;
        }[];
        maxHeight?: number | undefined;
    } | undefined;
    innerRadius?: number | undefined;
    pieLabels?: "none" | "inside" | "outside" | undefined;
}, {
    type: "line" | "bar" | "pie" | "area" | "scatter";
    series: {
        id: string;
        name: string;
        data: {
            x: string | number | Date;
            y: number;
            label?: string | undefined;
            meta?: Record<string, unknown> | undefined;
        }[];
        color?: string | undefined;
        showPoints?: boolean | undefined;
        lineStyle?: "solid" | "dashed" | "dotted" | undefined;
        lineWidth?: number | undefined;
        fillOpacity?: number | undefined;
        stackGroup?: string | undefined;
        pointSize?: number | undefined;
        visible?: boolean | undefined;
        yAxisId?: string | undefined;
    }[];
    loading?: boolean | undefined;
    title?: string | undefined;
    subtitle?: string | undefined;
    padding?: {
        left?: number | undefined;
        right?: number | undefined;
        top?: number | undefined;
        bottom?: number | undefined;
    } | undefined;
    height?: string | number | undefined;
    width?: string | number | undefined;
    xAxis?: {
        type?: "linear" | "logarithmic" | "time" | "category" | undefined;
        position?: "left" | "right" | "top" | "bottom" | undefined;
        label?: string | undefined;
        min?: number | undefined;
        max?: number | undefined;
        showLine?: boolean | undefined;
        showGrid?: boolean | undefined;
        showTicks?: boolean | undefined;
        tickCount?: number | undefined;
        tickFormat?: string | undefined;
        gridStyle?: "solid" | "dashed" | "dotted" | undefined;
        gridColor?: string | undefined;
        axisColor?: string | undefined;
        labelFontSize?: string | undefined;
    } | undefined;
    yAxis?: {
        type?: "linear" | "logarithmic" | "time" | "category" | undefined;
        position?: "left" | "right" | "top" | "bottom" | undefined;
        label?: string | undefined;
        min?: number | undefined;
        max?: number | undefined;
        showLine?: boolean | undefined;
        showGrid?: boolean | undefined;
        showTicks?: boolean | undefined;
        tickCount?: number | undefined;
        tickFormat?: string | undefined;
        gridStyle?: "solid" | "dashed" | "dotted" | undefined;
        gridColor?: string | undefined;
        axisColor?: string | undefined;
        labelFontSize?: string | undefined;
    } | undefined;
    yAxisSecondary?: {
        type?: "linear" | "logarithmic" | "time" | "category" | undefined;
        position?: "left" | "right" | "top" | "bottom" | undefined;
        label?: string | undefined;
        min?: number | undefined;
        max?: number | undefined;
        showLine?: boolean | undefined;
        showGrid?: boolean | undefined;
        showTicks?: boolean | undefined;
        tickCount?: number | undefined;
        tickFormat?: string | undefined;
        gridStyle?: "solid" | "dashed" | "dotted" | undefined;
        gridColor?: string | undefined;
        axisColor?: string | undefined;
        labelFontSize?: string | undefined;
    } | undefined;
    legend?: {
        gap?: number | undefined;
        alignment?: "start" | "center" | "end" | undefined;
        position?: "left" | "right" | "top" | "bottom" | undefined;
        layout?: "horizontal" | "vertical" | undefined;
        show?: boolean | undefined;
        maxItems?: number | undefined;
        markerShape?: "line" | "circle" | "square" | "diamond" | undefined;
        markerSize?: number | undefined;
        interactive?: boolean | undefined;
        fontSize?: string | undefined;
    } | undefined;
    tooltip?: {
        position?: "left" | "right" | "top" | "bottom" | "auto" | undefined;
        borderRadius?: string | undefined;
        enabled?: boolean | undefined;
        fontSize?: string | undefined;
        trigger?: "hover" | "none" | "click" | undefined;
        shared?: boolean | undefined;
        snap?: boolean | undefined;
        crosshair?: boolean | undefined;
        crosshairStyle?: "line" | "dashed" | "dotted" | undefined;
        backgroundColor?: string | undefined;
        borderColor?: string | undefined;
        shadow?: boolean | undefined;
        valueFormat?: string | undefined;
        dateFormat?: string | undefined;
    } | undefined;
    responsive?: {
        maxHeight?: number | undefined;
        aspectRatio?: number | undefined;
        minHeight?: number | undefined;
        maintainAspectRatio?: boolean | undefined;
        resizeDebounce?: number | undefined;
        breakpoints?: {
            maxWidth: number;
            aspectRatio?: number | undefined;
            tickCount?: number | undefined;
            legendPosition?: "left" | "right" | "top" | "bottom" | "hidden" | undefined;
            fontScale?: number | undefined;
        }[] | undefined;
    } | undefined;
    colorPalette?: "default" | "pastel" | "vibrant" | "monochrome" | undefined;
    annotations?: {
        type: "label" | "line" | "band" | "point";
        value?: string | number | undefined;
        label?: string | undefined;
        color?: string | undefined;
        lineStyle?: "solid" | "dashed" | "dotted" | undefined;
        axis?: "x" | "y" | undefined;
        from?: string | number | undefined;
        to?: string | number | undefined;
        opacity?: number | undefined;
    }[] | undefined;
    animated?: boolean | undefined;
    animationDuration?: number | undefined;
    emptyMessage?: string | undefined;
    zoomable?: boolean | undefined;
    pannable?: boolean | undefined;
    exportable?: boolean | undefined;
    stacked?: boolean | undefined;
    innerRadius?: number | undefined;
    pieLabels?: "none" | "inside" | "outside" | undefined;
}>;
export type ChartProps = z.infer<typeof ChartPropsSchema>;
//# sourceMappingURL=charts.d.ts.map