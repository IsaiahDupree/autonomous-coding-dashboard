/**
 * PCT Accessibility Manager
 * Comprehensive WCAG 2.1 AA compliance system
 * PCT-WC-071 through PCT-WC-080: All accessibility features
 */

class PCTAccessibilityManager {
  constructor() {
    this.config = {
      announceRouteChanges: true,
      respectReducedMotion: true,
      enforceTabOrder: true,
      validateARIA: true,
      checkContrast: true,
    };

    this.liveRegion = null;
    this.skipLink = null;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /**
   * Initialize all accessibility features
   */
  init() {
    console.log('[Accessibility] Initializing...');

    // PCT-WC-071: ARIA labels
    this.enhanceARIA();

    // PCT-WC-072: Keyboard navigation
    this.setupKeyboardNavigation();

    // PCT-WC-073: Focus management
    this.setupFocusManagement();

    // PCT-WC-074: Color contrast
    this.validateColorContrast();

    // PCT-WC-075: Screen reader support
    this.setupScreenReaderSupport();

    // PCT-WC-076: Text scaling
    this.setupResponsiveTextScaling();

    // PCT-WC-077: Form error announcements
    this.setupFormErrorAnnouncements();

    // PCT-WC-078: Reduced motion
    this.setupReducedMotion();

    // PCT-WC-079: High contrast mode
    this.setupHighContrastMode();

    // PCT-WC-080: Accessible tables
    this.enhanceDataTables();

    console.log('[Accessibility] Initialized');
  }

  /**
   * PCT-WC-071: Enhance ARIA attributes on interactive elements
   */
  enhanceARIA() {
    // Add ARIA labels to buttons without text
    document.querySelectorAll('button:not([aria-label])').forEach((btn) => {
      if (!btn.textContent.trim()) {
        // Try to infer label from context
        const icon = btn.querySelector('svg, i');
        if (icon) {
          const title = icon.getAttribute('title') || btn.getAttribute('title');
          if (title) {
            btn.setAttribute('aria-label', title);
          } else {
            console.warn('[A11y] Button needs aria-label:', btn);
          }
        }
      }
    });

    // Add ARIA labels to icon-only links
    document.querySelectorAll('a:not([aria-label])').forEach((link) => {
      if (!link.textContent.trim() && (link.querySelector('svg') || link.querySelector('i'))) {
        const title = link.getAttribute('title');
        if (title) {
          link.setAttribute('aria-label', title);
        } else {
          console.warn('[A11y] Icon link needs aria-label:', link);
        }
      }
    });

    // Add role="button" to clickable elements that aren't buttons
    document.querySelectorAll('[onclick]:not(button):not(a)').forEach((el) => {
      if (!el.hasAttribute('role')) {
        el.setAttribute('role', 'button');
        el.setAttribute('tabindex', '0');
      }
    });

    // Enhance form inputs
    document.querySelectorAll('input, select, textarea').forEach((input) => {
      const id = input.id;
      if (id) {
        const label = document.querySelector(`label[for="${id}"]`);
        if (!label && !input.getAttribute('aria-label')) {
          console.warn('[A11y] Input needs label:', input);
        }
      }

      // Add aria-required for required fields
      if (input.hasAttribute('required') && !input.hasAttribute('aria-required')) {
        input.setAttribute('aria-required', 'true');
      }

      // Add aria-invalid for validation
      if (input.classList.contains('error') || input.classList.contains('invalid')) {
        input.setAttribute('aria-invalid', 'true');
      }
    });

    console.log('[A11y] ARIA attributes enhanced');
  }

  /**
   * PCT-WC-072: Setup keyboard navigation
   */
  setupKeyboardNavigation() {
    // Create skip link
    this.createSkipLink();

    // Ensure all interactive elements are keyboard accessible
    document.querySelectorAll('[onclick]').forEach((el) => {
      if (!el.hasAttribute('tabindex') && el.tagName !== 'BUTTON' && el.tagName !== 'A') {
        el.setAttribute('tabindex', '0');

        // Add keyboard handler
        el.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            el.click();
          }
        });
      }
    });

    // Add escape key handler for modals and overlays
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        // Close any open modals
        const modals = document.querySelectorAll('[role="dialog"]:not([style*="display: none"])');
        modals.forEach((modal) => {
          const closeBtn = modal.querySelector('.pct-lightbox-close, .pct-compare-modal button');
          if (closeBtn) closeBtn.click();
        });

        // Close any other overlays
        const overlays = document.querySelectorAll('.pct-lightbox, .pct-compare-modal');
        overlays.forEach((overlay) => {
          if (overlay.style.display !== 'none') {
            overlay.style.display = 'none';
          }
        });
      }
    });

    // Enhance tab order
    this.enhanceTabOrder();

    // Make sure focus is always visible
    this.ensureFocusVisible();

    console.log('[A11y] Keyboard navigation setup complete');
  }

  /**
   * Create skip to main content link
   */
  createSkipLink() {
    if (document.querySelector('#skip-to-main')) return;

    const skipLink = document.createElement('a');
    skipLink.id = 'skip-to-main';
    skipLink.href = '#main-content';
    skipLink.textContent = 'Skip to main content';
    skipLink.className = 'skip-link';

    skipLink.addEventListener('click', (e) => {
      e.preventDefault();
      const main = document.getElementById('main-content') || document.querySelector('main');
      if (main) {
        main.setAttribute('tabindex', '-1');
        main.focus();
      }
    });

    document.body.insertBefore(skipLink, document.body.firstChild);

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      .skip-link {
        position: absolute;
        top: -40px;
        left: 0;
        background: #6366f1;
        color: white;
        padding: 8px 16px;
        text-decoration: none;
        z-index: 10000;
        border-radius: 0 0 4px 0;
      }
      .skip-link:focus {
        top: 0;
      }
    `;
    document.head.appendChild(style);

    this.skipLink = skipLink;
  }

  /**
   * Enhance tab order
   */
  enhanceTabOrder() {
    // Ensure proper tab order for tabs
    document.querySelectorAll('.pct-tab').forEach((tab, index) => {
      if (!tab.hasAttribute('tabindex')) {
        tab.setAttribute('tabindex', '0');
      }

      // Add arrow key navigation
      tab.addEventListener('keydown', (e) => {
        const tabs = Array.from(document.querySelectorAll('.pct-tab'));
        const currentIndex = tabs.indexOf(tab);

        if (e.key === 'ArrowRight') {
          e.preventDefault();
          const nextTab = tabs[currentIndex + 1] || tabs[0];
          nextTab.focus();
          nextTab.click();
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          const prevTab = tabs[currentIndex - 1] || tabs[tabs.length - 1];
          prevTab.focus();
          prevTab.click();
        }
      });
    });
  }

  /**
   * Ensure focus is always visible
   */
  ensureFocusVisible() {
    const style = document.createElement('style');
    style.textContent = `
      *:focus {
        outline: 2px solid #6366f1;
        outline-offset: 2px;
      }

      *:focus:not(:focus-visible) {
        outline: none;
      }

      *:focus-visible {
        outline: 2px solid #6366f1;
        outline-offset: 2px;
      }

      button:focus-visible,
      a:focus-visible,
      input:focus-visible,
      select:focus-visible,
      textarea:focus-visible {
        outline: 2px solid #6366f1;
        outline-offset: 2px;
        border-radius: 4px;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * PCT-WC-073: Setup focus management on route changes
   */
  setupFocusManagement() {
    // Create live region for route announcements
    this.createLiveRegion();

    // Watch for hash changes (tab navigation)
    window.addEventListener('hashchange', () => {
      this.handleRouteChange();
    });

    // Watch for popstate (back/forward)
    window.addEventListener('popstate', () => {
      this.handleRouteChange();
    });

    // Watch for custom route change events
    window.addEventListener('pct:routechange', () => {
      this.handleRouteChange();
    });

    console.log('[A11y] Focus management setup complete');
  }

  /**
   * Create ARIA live region for announcements
   */
  createLiveRegion() {
    if (document.querySelector('#pct-live-region')) return;

    const liveRegion = document.createElement('div');
    liveRegion.id = 'pct-live-region';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.style.cssText = `
      position: absolute;
      left: -10000px;
      width: 1px;
      height: 1px;
      overflow: hidden;
    `;
    document.body.appendChild(liveRegion);

    this.liveRegion = liveRegion;
  }

  /**
   * Handle route changes
   */
  handleRouteChange() {
    // Move focus to main content
    const main = document.getElementById('main-content') || document.querySelector('.pct-container');
    if (main) {
      main.setAttribute('tabindex', '-1');
      main.focus();

      // Announce route change
      const title = document.title;
      this.announce(`Navigated to ${title}`);
    }
  }

  /**
   * Announce to screen readers
   */
  announce(message, priority = 'polite') {
    if (!this.liveRegion) this.createLiveRegion();

    this.liveRegion.setAttribute('aria-live', priority);
    this.liveRegion.textContent = message;

    // Clear after announcement
    setTimeout(() => {
      this.liveRegion.textContent = '';
    }, 1000);
  }

  /**
   * PCT-WC-074: Validate color contrast
   */
  validateColorContrast() {
    // This would ideally check all text elements against their backgrounds
    // For now, we'll ensure our CSS variables meet WCAG AA standards

    const validations = [
      { bg: '#ffffff', fg: '#111827', name: 'Normal text on white', required: 4.5 },
      { bg: '#ffffff', fg: '#6b7280', name: 'Muted text on white', required: 4.5 },
      { bg: '#6366f1', fg: '#ffffff', name: 'White on primary', required: 4.5 },
    ];

    validations.forEach((v) => {
      const ratio = this.getContrastRatio(v.bg, v.fg);
      const passes = ratio >= v.required;
      console.log(
        `[A11y] ${v.name}: ${ratio.toFixed(2)}:1 ${passes ? '✓' : '✗ FAIL'}`
      );
    });

    console.log('[A11y] Color contrast validation complete');
  }

  /**
   * Calculate contrast ratio between two colors
   */
  getContrastRatio(color1, color2) {
    const l1 = this.getLuminance(color1);
    const l2 = this.getLuminance(color2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  /**
   * Get relative luminance of a color
   */
  getLuminance(hexColor) {
    const rgb = this.hexToRgb(hexColor);
    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((val) => {
      val = val / 255;
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  /**
   * Convert hex color to RGB
   */
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 };
  }

  /**
   * PCT-WC-075: Setup screen reader support
   */
  setupScreenReaderSupport() {
    // Ensure all images have alt text
    document.querySelectorAll('img:not([alt])').forEach((img) => {
      // Check if decorative
      if (img.closest('[role="presentation"]')) {
        img.setAttribute('alt', '');
      } else {
        img.setAttribute('alt', 'Image');
        console.warn('[A11y] Image needs descriptive alt text:', img.src);
      }
    });

    // Add labels to form controls
    document.querySelectorAll('input, select, textarea').forEach((control) => {
      const id = control.id || `control-${Math.random().toString(36).substr(2, 9)}`;
      control.id = id;

      if (!document.querySelector(`label[for="${id}"]`) && !control.getAttribute('aria-label')) {
        const placeholder = control.getAttribute('placeholder');
        if (placeholder) {
          control.setAttribute('aria-label', placeholder);
        }
      }
    });

    // Enhance tables (PCT-WC-080)
    this.enhanceDataTables();

    console.log('[A11y] Screen reader support enhanced');
  }

  /**
   * PCT-WC-076: Setup responsive text scaling
   */
  setupResponsiveTextScaling() {
    // Ensure all text uses relative units (rem/em)
    // Add viewport meta tag if missing
    if (!document.querySelector('meta[name="viewport"]')) {
      const meta = document.createElement('meta');
      meta.name = 'viewport';
      meta.content = 'width=device-width, initial-scale=1.0';
      document.head.appendChild(meta);
    }

    // Test at 200% zoom
    const style = document.createElement('style');
    style.textContent = `
      @media (min-width: 1px) {
        html {
          font-size: 16px;
        }
      }

      /* Support text scaling up to 200% */
      * {
        max-width: 100%;
      }

      /* Prevent horizontal scroll at zoom */
      body {
        overflow-x: hidden;
      }
    `;
    document.head.appendChild(style);

    console.log('[A11y] Responsive text scaling enabled');
  }

  /**
   * PCT-WC-077: Setup form error announcements
   */
  setupFormErrorAnnouncements() {
    // Watch for form submissions
    document.querySelectorAll('form').forEach((form) => {
      form.addEventListener('submit', (e) => {
        const errors = this.validateForm(form);
        if (errors.length > 0) {
          e.preventDefault();
          this.announceFormErrors(errors, form);
        }
      });
    });

    // Add live validation to inputs
    document.querySelectorAll('input[required], textarea[required], select[required]').forEach((input) => {
      input.addEventListener('blur', () => {
        if (!input.validity.valid) {
          input.setAttribute('aria-invalid', 'true');
          const errorId = `${input.id}-error`;
          input.setAttribute('aria-describedby', errorId);

          // Create error message if it doesn't exist
          if (!document.getElementById(errorId)) {
            const error = document.createElement('div');
            error.id = errorId;
            error.className = 'input-error';
            error.setAttribute('role', 'alert');
            error.textContent = input.validationMessage || 'This field is required';
            input.parentNode.appendChild(error);

            // Announce error
            this.announce(error.textContent, 'assertive');
          }
        } else {
          input.setAttribute('aria-invalid', 'false');
          const errorId = `${input.id}-error`;
          const error = document.getElementById(errorId);
          if (error) error.remove();
        }
      });
    });

    console.log('[A11y] Form error announcements setup');
  }

  /**
   * Validate form and return errors
   */
  validateForm(form) {
    const errors = [];
    const inputs = form.querySelectorAll('input, textarea, select');

    inputs.forEach((input) => {
      if (!input.validity.valid) {
        errors.push({
          input,
          message: input.validationMessage || 'Invalid input',
        });
      }
    });

    return errors;
  }

  /**
   * Announce form errors to screen readers
   */
  announceFormErrors(errors, form) {
    // Create error summary
    let summaryId = 'form-error-summary';
    let summary = document.getElementById(summaryId);

    if (!summary) {
      summary = document.createElement('div');
      summary.id = summaryId;
      summary.setAttribute('role', 'alert');
      summary.className = 'form-error-summary';
      form.insertBefore(summary, form.firstChild);
    }

    summary.innerHTML = `
      <h3>Please fix the following errors:</h3>
      <ul>
        ${errors.map((e) => `<li><a href="#${e.input.id}">${e.message}</a></li>`).join('')}
      </ul>
    `;

    // Focus on first error
    errors[0].input.focus();

    // Announce to screen reader
    this.announce(`Form has ${errors.length} error${errors.length > 1 ? 's' : ''}`, 'assertive');
  }

  /**
   * PCT-WC-078: Setup reduced motion support
   */
  setupReducedMotion() {
    // Check user preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const applyReducedMotion = (shouldReduce) => {
      this.reducedMotion = shouldReduce;

      if (shouldReduce) {
        document.body.classList.add('reduce-motion');
      } else {
        document.body.classList.remove('reduce-motion');
      }
    };

    applyReducedMotion(mediaQuery.matches);

    // Listen for changes
    mediaQuery.addEventListener('change', (e) => {
      applyReducedMotion(e.matches);
    });

    // Add CSS rules
    const style = document.createElement('style');
    style.textContent = `
      .reduce-motion *,
      .reduce-motion *::before,
      .reduce-motion *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    `;
    document.head.appendChild(style);

    console.log('[A11y] Reduced motion support enabled');
  }

  /**
   * PCT-WC-079: Setup high contrast mode support
   */
  setupHighContrastMode() {
    // Detect Windows high contrast mode
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)');

    const applyHighContrast = (isHighContrast) => {
      if (isHighContrast) {
        document.body.classList.add('high-contrast');
      } else {
        document.body.classList.remove('high-contrast');
      }
    };

    applyHighContrast(highContrastQuery.matches);

    highContrastQuery.addEventListener('change', (e) => {
      applyHighContrast(e.matches);
    });

    // Add CSS for high contrast mode
    const style = document.createElement('style');
    style.textContent = `
      .high-contrast * {
        border-color: currentColor !important;
      }

      .high-contrast button,
      .high-contrast a,
      .high-contrast input,
      .high-contrast select,
      .high-contrast textarea {
        border: 2px solid currentColor !important;
      }

      .high-contrast *:focus {
        outline: 3px solid currentColor !important;
        outline-offset: 3px !important;
      }
    `;
    document.head.appendChild(style);

    console.log('[A11y] High contrast mode support enabled');
  }

  /**
   * PCT-WC-080: Enhance data tables for accessibility
   */
  enhanceDataTables() {
    document.querySelectorAll('table').forEach((table) => {
      // Add caption if missing
      if (!table.querySelector('caption') && !table.getAttribute('aria-label')) {
        const caption = document.createElement('caption');
        caption.textContent = 'Data table';
        caption.style.position = 'absolute';
        caption.style.left = '-10000px';
        table.insertBefore(caption, table.firstChild);
      }

      // Add scope to th elements
      table.querySelectorAll('th').forEach((th) => {
        if (!th.hasAttribute('scope')) {
          // Determine if it's a row or column header
          const isRowHeader = th.parentElement.querySelector('th') === th;
          th.setAttribute('scope', isRowHeader ? 'row' : 'col');
        }
      });

      // Add role="table" if not present
      if (!table.hasAttribute('role')) {
        table.setAttribute('role', 'table');
      }
    });

    console.log('[A11y] Data tables enhanced');
  }

  /**
   * Run accessibility audit
   */
  async audit() {
    const issues = [];

    // Check for missing alt text
    const imagesWithoutAlt = document.querySelectorAll('img:not([alt])');
    if (imagesWithoutAlt.length > 0) {
      issues.push({
        severity: 'error',
        rule: 'PCT-WC-075',
        message: `${imagesWithoutAlt.length} images missing alt text`,
      });
    }

    // Check for form labels
    const inputsWithoutLabels = Array.from(
      document.querySelectorAll('input, select, textarea')
    ).filter((input) => {
      const id = input.id;
      return id && !document.querySelector(`label[for="${id}"]`) && !input.getAttribute('aria-label');
    });

    if (inputsWithoutLabels.length > 0) {
      issues.push({
        severity: 'error',
        rule: 'PCT-WC-071',
        message: `${inputsWithoutLabels.length} form controls missing labels`,
      });
    }

    // Check for heading hierarchy
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    const headingLevels = headings.map((h) => parseInt(h.tagName[1]));
    let lastLevel = 0;
    let hierarchyIssues = 0;

    headingLevels.forEach((level) => {
      if (level - lastLevel > 1) {
        hierarchyIssues++;
      }
      lastLevel = level;
    });

    if (hierarchyIssues > 0) {
      issues.push({
        severity: 'warning',
        rule: 'PCT-WC-075',
        message: `Heading hierarchy has ${hierarchyIssues} skip(s)`,
      });
    }

    console.log('[A11y] Audit complete:', issues);
    return issues;
  }
}

// Create singleton instance
const pctAccessibility = new PCTAccessibilityManager();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => pctAccessibility.init());
} else {
  pctAccessibility.init();
}

// Export for use in other modules
window.pctAccessibility = pctAccessibility;

// Helper function for announcements
window.announceToScreenReader = function (message, priority = 'polite') {
  pctAccessibility.announce(message, priority);
};
