/**
 * PCT Web Vitals Monitoring
 * Track Core Web Vitals (LCP, FID, CLS) and display dashboard
 * PCT-WC-059: Web vitals monitoring
 */

class PCTWebVitals {
  constructor() {
    this.metrics = {
      LCP: null, // Largest Contentful Paint
      FID: null, // First Input Delay
      CLS: null, // Cumulative Layout Shift
      FCP: null, // First Contentful Paint
      TTFB: null, // Time to First Byte
      INP: null, // Interaction to Next Paint
    };

    this.history = [];
    this.thresholds = {
      LCP: { good: 2500, needsImprovement: 4000 },
      FID: { good: 100, needsImprovement: 300 },
      CLS: { good: 0.1, needsImprovement: 0.25 },
      FCP: { good: 1800, needsImprovement: 3000 },
      TTFB: { good: 800, needsImprovement: 1800 },
      INP: { good: 200, needsImprovement: 500 },
    };

    this.observers = [];
    this.enabled = true;
  }

  /**
   * Initialize web vitals monitoring
   */
  init() {
    if (!this.enabled) return;

    // Measure LCP
    this.measureLCP();

    // Measure FID
    this.measureFID();

    // Measure CLS
    this.measureCLS();

    // Measure FCP
    this.measureFCP();

    // Measure TTFB
    this.measureTTFB();

    // Measure INP
    this.measureINP();

    // Load history from storage
    this.loadHistory();

    // Save metrics periodically
    setInterval(() => this.saveMetrics(), 30000);

    // Create dashboard widget
    this.createDashboard();

    console.log('[PCT Web Vitals] Initialized');
  }

  /**
   * Measure Largest Contentful Paint (LCP)
   */
  measureLCP() {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];

        this.metrics.LCP = {
          value: lastEntry.renderTime || lastEntry.loadTime,
          timestamp: Date.now(),
          rating: this.getRating('LCP', lastEntry.renderTime || lastEntry.loadTime),
          element: lastEntry.element ? this.getElementSelector(lastEntry.element) : null,
        };

        console.log('[PCT Web Vitals] LCP:', this.metrics.LCP.value, 'ms');
      });

      observer.observe({ type: 'largest-contentful-paint', buffered: true });
      this.observers.push(observer);
    } catch (e) {
      console.warn('[PCT Web Vitals] LCP measurement failed:', e);
    }
  }

  /**
   * Measure First Input Delay (FID)
   */
  measureFID() {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          this.metrics.FID = {
            value: entry.processingStart - entry.startTime,
            timestamp: Date.now(),
            rating: this.getRating('FID', entry.processingStart - entry.startTime),
            eventType: entry.name,
          };

          console.log('[PCT Web Vitals] FID:', this.metrics.FID.value, 'ms');
        });
      });

      observer.observe({ type: 'first-input', buffered: true });
      this.observers.push(observer);
    } catch (e) {
      console.warn('[PCT Web Vitals] FID measurement failed:', e);
    }
  }

  /**
   * Measure Cumulative Layout Shift (CLS)
   */
  measureCLS() {
    if (!('PerformanceObserver' in window)) return;

    let clsValue = 0;
    let sessionValue = 0;
    let sessionEntries = [];

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          // Only count layout shifts without recent user input
          if (!entry.hadRecentInput) {
            const firstSessionEntry = sessionEntries[0];
            const lastSessionEntry = sessionEntries[sessionEntries.length - 1];

            // Start a new session if the gap is > 1s or > 5s since start
            if (
              sessionValue &&
              entry.startTime - lastSessionEntry.startTime < 1000 &&
              entry.startTime - firstSessionEntry.startTime < 5000
            ) {
              sessionValue += entry.value;
              sessionEntries.push(entry);
            } else {
              sessionValue = entry.value;
              sessionEntries = [entry];
            }

            // Update CLS if this session is the largest
            if (sessionValue > clsValue) {
              clsValue = sessionValue;
              this.metrics.CLS = {
                value: clsValue,
                timestamp: Date.now(),
                rating: this.getRating('CLS', clsValue),
                entries: sessionEntries.length,
              };

              console.log('[PCT Web Vitals] CLS:', this.metrics.CLS.value);
            }
          }
        }
      });

      observer.observe({ type: 'layout-shift', buffered: true });
      this.observers.push(observer);
    } catch (e) {
      console.warn('[PCT Web Vitals] CLS measurement failed:', e);
    }
  }

  /**
   * Measure First Contentful Paint (FCP)
   */
  measureFCP() {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const fcpEntry = entries.find((entry) => entry.name === 'first-contentful-paint');

        if (fcpEntry) {
          this.metrics.FCP = {
            value: fcpEntry.startTime,
            timestamp: Date.now(),
            rating: this.getRating('FCP', fcpEntry.startTime),
          };

          console.log('[PCT Web Vitals] FCP:', this.metrics.FCP.value, 'ms');
          observer.disconnect();
        }
      });

      observer.observe({ type: 'paint', buffered: true });
      this.observers.push(observer);
    } catch (e) {
      console.warn('[PCT Web Vitals] FCP measurement failed:', e);
    }
  }

  /**
   * Measure Time to First Byte (TTFB)
   */
  measureTTFB() {
    try {
      const navigation = performance.getEntriesByType('navigation')[0];
      if (navigation) {
        const ttfb = navigation.responseStart - navigation.requestStart;

        this.metrics.TTFB = {
          value: ttfb,
          timestamp: Date.now(),
          rating: this.getRating('TTFB', ttfb),
        };

        console.log('[PCT Web Vitals] TTFB:', this.metrics.TTFB.value, 'ms');
      }
    } catch (e) {
      console.warn('[PCT Web Vitals] TTFB measurement failed:', e);
    }
  }

  /**
   * Measure Interaction to Next Paint (INP)
   */
  measureINP() {
    if (!('PerformanceObserver' in window)) return;

    let maxDuration = 0;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();

        entries.forEach((entry) => {
          const duration = entry.processingStart - entry.startTime + entry.duration;

          if (duration > maxDuration) {
            maxDuration = duration;
            this.metrics.INP = {
              value: duration,
              timestamp: Date.now(),
              rating: this.getRating('INP', duration),
              eventType: entry.name,
            };

            console.log('[PCT Web Vitals] INP:', this.metrics.INP.value, 'ms');
          }
        });
      });

      observer.observe({ type: 'event', buffered: true, durationThreshold: 16 });
      this.observers.push(observer);
    } catch (e) {
      console.warn('[PCT Web Vitals] INP measurement failed:', e);
    }
  }

  /**
   * Get rating for a metric
   */
  getRating(metric, value) {
    const threshold = this.thresholds[metric];
    if (!threshold) return 'unknown';

    if (value <= threshold.good) return 'good';
    if (value <= threshold.needsImprovement) return 'needs-improvement';
    return 'poor';
  }

  /**
   * Get element selector
   */
  getElementSelector(element) {
    if (!element) return null;

    if (element.id) return `#${element.id}`;
    if (element.className) return `.${element.className.split(' ')[0]}`;
    return element.tagName.toLowerCase();
  }

  /**
   * Get all metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Get metric summary
   */
  getSummary() {
    const summary = {
      score: 0,
      good: 0,
      needsImprovement: 0,
      poor: 0,
      metrics: {},
    };

    Object.entries(this.metrics).forEach(([key, metric]) => {
      if (!metric) return;

      summary.metrics[key] = {
        value: metric.value,
        rating: metric.rating,
      };

      if (metric.rating === 'good') {
        summary.good++;
        summary.score += 100;
      } else if (metric.rating === 'needs-improvement') {
        summary.needsImprovement++;
        summary.score += 50;
      } else if (metric.rating === 'poor') {
        summary.poor++;
      }
    });

    const total = summary.good + summary.needsImprovement + summary.poor;
    summary.score = total > 0 ? Math.round(summary.score / total) : 0;

    return summary;
  }

  /**
   * Save metrics to storage
   */
  saveMetrics() {
    const entry = {
      timestamp: Date.now(),
      url: window.location.pathname,
      metrics: this.getMetrics(),
    };

    this.history.push(entry);

    // Keep only last 100 entries
    if (this.history.length > 100) {
      this.history = this.history.slice(-100);
    }

    try {
      localStorage.setItem('pct_web_vitals_history', JSON.stringify(this.history));
    } catch (e) {
      console.warn('[PCT Web Vitals] Failed to save history:', e);
    }
  }

  /**
   * Load history from storage
   */
  loadHistory() {
    try {
      const stored = localStorage.getItem('pct_web_vitals_history');
      if (stored) {
        this.history = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('[PCT Web Vitals] Failed to load history:', e);
    }
  }

  /**
   * Create dashboard widget
   */
  createDashboard() {
    // Create floating widget
    const widget = document.createElement('div');
    widget.id = 'pct-vitals-widget';
    widget.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 12px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 11px;
      z-index: 999999;
      min-width: 200px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      display: none;
    `;

    widget.innerHTML = `
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <strong>Web Vitals</strong>
        <button id="pct-vitals-close" style="background: none; border: none; color: white; cursor: pointer; padding: 0; font-size: 16px;">&times;</button>
      </div>
      <div id="pct-vitals-content"></div>
    `;

    document.body.appendChild(widget);

    // Close button
    document.getElementById('pct-vitals-close')?.addEventListener('click', () => {
      widget.style.display = 'none';
    });

    // Update dashboard every 2 seconds
    setInterval(() => this.updateDashboard(), 2000);

    // Show widget on Ctrl+Shift+V
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'V') {
        widget.style.display = widget.style.display === 'none' ? 'block' : 'none';
      }
    });

    // Track with memory manager
    if (window.pctMemoryManager) {
      window.pctMemoryManager.onCleanup(() => {
        this.observers.forEach((obs) => obs.disconnect());
        widget.remove();
      });
    }
  }

  /**
   * Update dashboard
   */
  updateDashboard() {
    const content = document.getElementById('pct-vitals-content');
    if (!content) return;

    const getRatingColor = (rating) => {
      if (rating === 'good') return '#0cce6b';
      if (rating === 'needs-improvement') return '#ffa400';
      return '#ff4e42';
    };

    const formatValue = (metric, value) => {
      if (metric === 'CLS') return value.toFixed(3);
      return Math.round(value) + 'ms';
    };

    let html = '';
    ['LCP', 'FID', 'CLS', 'FCP', 'TTFB', 'INP'].forEach((key) => {
      const metric = this.metrics[key];
      if (metric) {
        const color = getRatingColor(metric.rating);
        html += `
          <div style="display: flex; justify-content: space-between; margin: 4px 0;">
            <span>${key}:</span>
            <span style="color: ${color}; font-weight: bold;">${formatValue(key, metric.value)}</span>
          </div>
        `;
      }
    });

    const summary = this.getSummary();
    html += `
      <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.2);">
        <div style="display: flex; justify-content: space-between;">
          <span>Score:</span>
          <span style="font-weight: bold;">${summary.score}/100</span>
        </div>
      </div>
      <div style="margin-top: 4px; font-size: 9px; opacity: 0.7;">
        Press Ctrl+Shift+V to toggle
      </div>
    `;

    content.innerHTML = html;
  }

  /**
   * Cleanup
   */
  cleanup() {
    this.observers.forEach((observer) => observer.disconnect());
    this.observers = [];
  }
}

// Create singleton instance
const pctWebVitals = new PCTWebVitals();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => pctWebVitals.init());
} else {
  pctWebVitals.init();
}

// Export for use in other modules
window.pctWebVitals = pctWebVitals;
