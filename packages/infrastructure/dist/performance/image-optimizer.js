"use strict";
/**
 * PERF-003: Image Optimizer
 *
 * Image optimization helpers: resize, compress, format conversion,
 * and responsive image set generation.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageOptimizer = void 0;
// ── ImageOptimizer ───────────────────────────────────────────────────────────
class ImageOptimizer {
    constructor(options = {}) {
        this.defaultQuality = options.defaultQuality ?? 80;
        this.defaultFormat = options.defaultFormat ?? 'webp';
        this.maxWidthPx = options.maxWidthPx ?? 4096;
        this.maxHeightPx = options.maxHeightPx ?? 4096;
        this.stripMetadata = options.stripMetadata ?? true;
    }
    /**
     * Optimize a single image (returns metadata about the optimization).
     * In production this would use sharp, libvips, or a cloud service.
     */
    async optimize(inputSizeBytes, inputWidth, inputHeight, inputFormat, options = {}) {
        const targetFormat = options.format ?? this.defaultFormat;
        const quality = options.quality ?? this.defaultQuality;
        // Calculate target dimensions
        const { width: targetWidth, height: targetHeight } = this.calculateDimensions(inputWidth, inputHeight, options.width, options.height);
        // Estimate output size based on format, quality, and dimensions
        const dimensionRatio = (targetWidth * targetHeight) / (inputWidth * inputHeight);
        const formatRatio = this.getFormatCompressionRatio(inputFormat, targetFormat);
        const qualityRatio = quality / 100;
        const estimatedSize = Math.round(inputSizeBytes * dimensionRatio * formatRatio * qualityRatio);
        const optimizedSize = Math.max(estimatedSize, 1024); // minimum 1KB
        const savings = Math.max(0, inputSizeBytes - optimizedSize);
        return {
            originalSize: inputSizeBytes,
            optimizedSize,
            width: targetWidth,
            height: targetHeight,
            format: targetFormat,
            savings,
        };
    }
    /**
     * Generate an optimization plan for an image.
     */
    plan(width, height, format, sizeBytes) {
        const steps = [];
        let estimatedSize = sizeBytes;
        // Step 1: Format conversion
        if (format !== this.defaultFormat) {
            const ratio = this.getFormatCompressionRatio(format, this.defaultFormat);
            const savings = estimatedSize * (1 - ratio);
            steps.push({
                operation: 'convert_format',
                params: { from: format, to: this.defaultFormat },
                estimatedSavings: Math.round(savings),
            });
            estimatedSize *= ratio;
        }
        // Step 2: Resize if exceeds max dimensions
        if (width > this.maxWidthPx || height > this.maxHeightPx) {
            const { width: newW, height: newH } = this.calculateDimensions(width, height, this.maxWidthPx, this.maxHeightPx);
            const ratio = (newW * newH) / (width * height);
            const savings = estimatedSize * (1 - ratio);
            steps.push({
                operation: 'resize',
                params: { width: newW, height: newH },
                estimatedSavings: Math.round(savings),
            });
            estimatedSize *= ratio;
        }
        // Step 3: Quality optimization
        if (this.defaultQuality < 100) {
            const ratio = this.defaultQuality / 100;
            const savings = estimatedSize * (1 - ratio);
            steps.push({
                operation: 'compress',
                params: { quality: this.defaultQuality },
                estimatedSavings: Math.round(savings),
            });
            estimatedSize *= ratio;
        }
        // Step 4: Strip metadata
        if (this.stripMetadata) {
            const metadataSavings = Math.round(sizeBytes * 0.02); // ~2% for metadata
            steps.push({
                operation: 'strip_metadata',
                params: { stripExif: true, stripIcc: false },
                estimatedSavings: metadataSavings,
            });
            estimatedSize -= metadataSavings;
        }
        estimatedSize = Math.max(Math.round(estimatedSize), 1024);
        return {
            original: { width, height, format, sizeBytes },
            steps,
            estimatedOutputSize: estimatedSize,
            estimatedSavingsPercent: Math.round(((sizeBytes - estimatedSize) / sizeBytes) * 100),
        };
    }
    /**
     * Generate a responsive image set configuration.
     */
    generateResponsiveSet(originalWidth, originalHeight, baseUrl, breakpoints = [320, 640, 960, 1280, 1920]) {
        const aspectRatio = originalHeight / originalWidth;
        const variants = [];
        const effectiveBreakpoints = breakpoints.filter((bp) => bp <= originalWidth);
        // Always include the original width if not already in breakpoints
        if (!effectiveBreakpoints.includes(originalWidth)) {
            effectiveBreakpoints.push(originalWidth);
        }
        for (const width of effectiveBreakpoints) {
            const height = Math.round(width * aspectRatio);
            const estimatedSize = this.estimateSize(width, height, this.defaultFormat);
            variants.push({
                width,
                url: `${baseUrl}?w=${width}&f=${this.defaultFormat}&q=${this.defaultQuality}`,
                format: this.defaultFormat,
                sizeBytes: estimatedSize,
            });
        }
        const srcSet = variants.map((v) => `${v.url} ${v.width}w`).join(', ');
        const sizes = effectiveBreakpoints
            .slice(0, -1)
            .map((bp) => `(max-width: ${bp}px) ${bp}px`)
            .concat([`${effectiveBreakpoints[effectiveBreakpoints.length - 1]}px`])
            .join(', ');
        return { srcSet, sizes, variants };
    }
    /**
     * Get supported output formats.
     */
    getSupportedFormats() {
        return ['jpeg', 'png', 'webp', 'avif'];
    }
    // ── Internal ─────────────────────────────────────────────────────────────
    calculateDimensions(origWidth, origHeight, targetWidth, targetHeight) {
        if (targetWidth && targetHeight) {
            return { width: targetWidth, height: targetHeight };
        }
        if (targetWidth) {
            const ratio = targetWidth / origWidth;
            return { width: targetWidth, height: Math.round(origHeight * ratio) };
        }
        if (targetHeight) {
            const ratio = targetHeight / origHeight;
            return { width: Math.round(origWidth * ratio), height: targetHeight };
        }
        // Clamp to max dimensions
        let width = origWidth;
        let height = origHeight;
        if (width > this.maxWidthPx) {
            const ratio = this.maxWidthPx / width;
            width = this.maxWidthPx;
            height = Math.round(height * ratio);
        }
        if (height > this.maxHeightPx) {
            const ratio = this.maxHeightPx / height;
            height = this.maxHeightPx;
            width = Math.round(width * ratio);
        }
        return { width, height };
    }
    getFormatCompressionRatio(from, to) {
        const ratios = {
            'png->webp': 0.4,
            'png->avif': 0.3,
            'png->jpeg': 0.5,
            'jpeg->webp': 0.7,
            'jpeg->avif': 0.6,
            'webp->avif': 0.85,
            'bmp->webp': 0.05,
            'bmp->jpeg': 0.1,
            'bmp->png': 0.3,
        };
        const key = `${from.toLowerCase()}->${to.toLowerCase()}`;
        return ratios[key] ?? 0.8; // default 20% savings
    }
    estimateSize(width, height, format) {
        const pixels = width * height;
        const bitsPerPixel = {
            jpeg: 2,
            webp: 1.5,
            avif: 1.2,
            png: 8,
        };
        const bpp = bitsPerPixel[format] ?? 2;
        return Math.round((pixels * bpp) / 8);
    }
}
exports.ImageOptimizer = ImageOptimizer;
