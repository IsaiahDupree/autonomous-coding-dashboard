/**
 * PERF-003: Image Optimizer
 *
 * Image optimization helpers: resize, compress, format conversion,
 * and responsive image set generation.
 */
import { ImageOptimizeOptions, ImageOptimizeResult } from '../types';
export interface ResponsiveImageSet {
    srcSet: string;
    sizes: string;
    variants: {
        width: number;
        url: string;
        format: string;
        sizeBytes: number;
    }[];
}
export interface OptimizationPlan {
    original: {
        width: number;
        height: number;
        format: string;
        sizeBytes: number;
    };
    steps: {
        operation: string;
        params: Record<string, unknown>;
        estimatedSavings: number;
    }[];
    estimatedOutputSize: number;
    estimatedSavingsPercent: number;
}
export interface ImageOptimizerOptions {
    defaultQuality?: number;
    defaultFormat?: ImageOptimizeOptions['format'];
    maxWidthPx?: number;
    maxHeightPx?: number;
    stripMetadata?: boolean;
}
export declare class ImageOptimizer {
    private defaultQuality;
    private defaultFormat;
    private maxWidthPx;
    private maxHeightPx;
    private stripMetadata;
    constructor(options?: ImageOptimizerOptions);
    /**
     * Optimize a single image (returns metadata about the optimization).
     * In production this would use sharp, libvips, or a cloud service.
     */
    optimize(inputSizeBytes: number, inputWidth: number, inputHeight: number, inputFormat: string, options?: ImageOptimizeOptions): Promise<ImageOptimizeResult>;
    /**
     * Generate an optimization plan for an image.
     */
    plan(width: number, height: number, format: string, sizeBytes: number): OptimizationPlan;
    /**
     * Generate a responsive image set configuration.
     */
    generateResponsiveSet(originalWidth: number, originalHeight: number, baseUrl: string, breakpoints?: number[]): ResponsiveImageSet;
    /**
     * Get supported output formats.
     */
    getSupportedFormats(): string[];
    private calculateDimensions;
    private getFormatCompressionRatio;
    private estimateSize;
}
