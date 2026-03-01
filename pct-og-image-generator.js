/**
 * PCT OG Image Generator
 * Dynamic social share images with branding and caching
 * PCT-WC-066: Dynamic OG image generation
 */

class PCTOGImageGenerator {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.cache = new Map();
    this.cacheKey = 'pct_og_image_cache';
    this.defaultSize = { width: 1200, height: 630 }; // OG image standard size

    this.loadCacheFromStorage();
  }

  /**
   * Initialize canvas
   */
  initCanvas() {
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.canvas.width = this.defaultSize.width;
      this.canvas.height = this.defaultSize.height;
      this.ctx = this.canvas.getContext('2d');
    }
    return this.ctx;
  }

  /**
   * Generate OG image
   * @param {Object} options - Image generation options
   * @param {string} options.title - Main title text
   * @param {string} options.subtitle - Subtitle text
   * @param {string} options.theme - Theme (light/dark)
   * @param {Object} options.brand - Brand data with colors, logo, etc.
   * @returns {Promise<string>} Data URL of generated image
   */
  async generate(options = {}) {
    const {
      title = 'Programmatic Creative Testing',
      subtitle = 'Systematic Facebook Ad Creative Generation',
      theme = 'light',
      brand = null,
    } = options;

    // Generate cache key
    const cacheKey = this.getCacheKey(options);

    // Check cache first
    if (this.cache.has(cacheKey)) {
      console.log('[OG Image] Using cached image');
      return this.cache.get(cacheKey);
    }

    // Initialize canvas
    const ctx = this.initCanvas();

    // Get brand colors or use defaults
    const colors = this.getBrandColors(brand, theme);

    // Clear canvas
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw background
    this.drawBackground(ctx, colors);

    // Draw brand logo if available
    if (brand && brand.logoUrl) {
      await this.drawLogo(ctx, brand.logoUrl, colors);
    }

    // Draw decorative elements
    this.drawDecorations(ctx, colors);

    // Draw title
    this.drawTitle(ctx, title, colors);

    // Draw subtitle
    if (subtitle) {
      this.drawSubtitle(ctx, subtitle, colors);
    }

    // Draw brand name or watermark
    this.drawWatermark(ctx, brand ? brand.name : 'PCT System', colors);

    // Convert to data URL
    const dataUrl = this.canvas.toDataURL('image/png');

    // Cache the result
    this.cache.set(cacheKey, dataUrl);
    this.saveCacheToStorage();

    console.log('[OG Image] Generated new image');
    return dataUrl;
  }

  /**
   * Get brand colors or defaults
   */
  getBrandColors(brand, theme) {
    if (brand && brand.colors) {
      return {
        background: brand.colors.background || '#ffffff',
        primary: brand.colors.primary || '#6366f1',
        accent: brand.colors.accent || '#f59e0b',
        text: brand.colors.text || '#111827',
        textLight: this.lightenColor(brand.colors.text || '#111827', 40),
      };
    }

    // Default colors based on theme
    if (theme === 'dark') {
      return {
        background: '#111827',
        primary: '#6366f1',
        accent: '#f59e0b',
        text: '#ffffff',
        textLight: '#9ca3af',
      };
    }

    return {
      background: '#ffffff',
      primary: '#6366f1',
      accent: '#f59e0b',
      text: '#111827',
      textLight: '#6b7280',
    };
  }

  /**
   * Draw background with gradient
   */
  drawBackground(ctx, colors) {
    // Solid background
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Subtle gradient overlay
    const gradient = ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
    gradient.addColorStop(0, this.hexToRgba(colors.primary, 0.05));
    gradient.addColorStop(1, this.hexToRgba(colors.accent, 0.05));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Draw decorative elements
   */
  drawDecorations(ctx, colors) {
    // Draw accent circle in top-right
    ctx.fillStyle = this.hexToRgba(colors.primary, 0.1);
    ctx.beginPath();
    ctx.arc(this.canvas.width - 150, 150, 300, 0, Math.PI * 2);
    ctx.fill();

    // Draw accent line at bottom
    ctx.fillStyle = colors.accent;
    ctx.fillRect(80, this.canvas.height - 12, 200, 8);
  }

  /**
   * Draw logo
   */
  async drawLogo(ctx, logoUrl, colors) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const logoSize = 80;
        const x = 80;
        const y = 60;

        // Draw logo with aspect ratio maintained
        const aspectRatio = img.width / img.height;
        const width = aspectRatio > 1 ? logoSize : logoSize * aspectRatio;
        const height = aspectRatio > 1 ? logoSize / aspectRatio : logoSize;

        ctx.drawImage(img, x, y, width, height);
        resolve();
      };
      img.onerror = () => {
        console.warn('[OG Image] Failed to load logo');
        resolve();
      };
      img.src = logoUrl;
    });
  }

  /**
   * Draw title text
   */
  drawTitle(ctx, title, colors) {
    const maxWidth = this.canvas.width - 160;
    const x = 80;
    const y = 280;

    ctx.fillStyle = colors.text;
    ctx.font = 'bold 72px Inter, system-ui, sans-serif';
    ctx.textBaseline = 'top';

    // Word wrap
    const lines = this.wrapText(ctx, title, maxWidth);
    const lineHeight = 85;

    lines.forEach((line, i) => {
      ctx.fillText(line, x, y + i * lineHeight);
    });
  }

  /**
   * Draw subtitle text
   */
  drawSubtitle(ctx, subtitle, colors) {
    const maxWidth = this.canvas.width - 160;
    const x = 80;
    const y = 460;

    ctx.fillStyle = colors.textLight;
    ctx.font = '36px Inter, system-ui, sans-serif';
    ctx.textBaseline = 'top';

    // Word wrap
    const lines = this.wrapText(ctx, subtitle, maxWidth);
    const lineHeight = 45;

    lines.slice(0, 2).forEach((line, i) => {
      ctx.fillText(line, x, y + i * lineHeight);
    });
  }

  /**
   * Draw watermark/brand name
   */
  drawWatermark(ctx, brandName, colors) {
    ctx.fillStyle = colors.textLight;
    ctx.font = '24px Inter, system-ui, sans-serif';
    ctx.textBaseline = 'bottom';
    ctx.fillText(brandName, 80, this.canvas.height - 40);
  }

  /**
   * Wrap text to fit width
   */
  wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    words.forEach((word) => {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  /**
   * Generate cache key from options
   */
  getCacheKey(options) {
    const key = JSON.stringify({
      title: options.title || '',
      subtitle: options.subtitle || '',
      theme: options.theme || 'light',
      brand: options.brand ? options.brand.name : null,
    });
    return btoa(key).slice(0, 32);
  }

  /**
   * Convert hex color to rgba
   */
  hexToRgba(hex, alpha = 1) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  /**
   * Lighten color
   */
  lightenColor(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = ((num >> 8) & 0x00ff) + amt;
    const B = (num & 0x0000ff) + amt;
    return (
      '#' +
      (
        0x1000000 +
        (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
        (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
        (B < 255 ? (B < 1 ? 0 : B) : 255)
      )
        .toString(16)
        .slice(1)
    );
  }

  /**
   * Load cache from localStorage
   */
  loadCacheFromStorage() {
    try {
      const stored = localStorage.getItem(this.cacheKey);
      if (stored) {
        const data = JSON.parse(stored);
        this.cache = new Map(Object.entries(data));
        console.log(`[OG Image] Loaded ${this.cache.size} cached images`);
      }
    } catch (e) {
      console.warn('[OG Image] Failed to load cache:', e);
    }
  }

  /**
   * Save cache to localStorage
   */
  saveCacheToStorage() {
    try {
      const data = Object.fromEntries(this.cache);
      localStorage.setItem(this.cacheKey, JSON.stringify(data));
    } catch (e) {
      console.warn('[OG Image] Failed to save cache:', e);
      // If storage is full, clear old entries
      if (this.cache.size > 10) {
        const entries = Array.from(this.cache.entries());
        this.cache = new Map(entries.slice(-10));
      }
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    localStorage.removeItem(this.cacheKey);
    console.log('[OG Image] Cache cleared');
  }

  /**
   * Get cache stats
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Download generated image
   */
  async downloadImage(options, filename = 'og-image.png') {
    const dataUrl = await this.generate(options);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    link.click();
  }
}

// Create singleton instance
const pctOGImageGenerator = new PCTOGImageGenerator();

// Export for use in other modules
window.pctOGImageGenerator = pctOGImageGenerator;

// Helper function for easy OG image generation
window.generateOGImage = function (options) {
  return pctOGImageGenerator.generate(options);
};
