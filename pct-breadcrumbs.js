/**
 * PCT Breadcrumbs Manager
 * Visual breadcrumb navigation with JSON-LD structured data
 * PCT-WC-068: Breadcrumbs with structured data
 */

class PCTBreadcrumbsManager {
  constructor() {
    this.currentPath = [];
    this.container = null;
  }

  /**
   * Initialize breadcrumbs
   */
  init(containerId = 'pct-breadcrumbs') {
    this.container = document.getElementById(containerId);

    // If container doesn't exist, create it
    if (!this.container) {
      this.container = this.createContainer();
    }

    // Update breadcrumbs on route change
    this.watchRouteChanges();

    // Set initial breadcrumbs
    this.updateFromUrl();

    console.log('[PCT Breadcrumbs] Initialized');
  }

  /**
   * Create breadcrumb container
   */
  createContainer() {
    const container = document.createElement('nav');
    container.id = 'pct-breadcrumbs';
    container.setAttribute('aria-label', 'Breadcrumb');
    container.className = 'pct-breadcrumbs';

    // Insert after header or at start of main content
    const header = document.querySelector('.pct-header');
    if (header && header.nextSibling) {
      header.parentNode.insertBefore(container, header.nextSibling);
    } else {
      document.body.insertBefore(container, document.body.firstChild);
    }

    return container;
  }

  /**
   * Set breadcrumb path
   * @param {Array} path - Array of breadcrumb items [{name, url}]
   */
  set(path) {
    this.currentPath = path;
    this.render();
    this.updateStructuredData();
  }

  /**
   * Update breadcrumbs from current URL
   */
  updateFromUrl() {
    const path = this.parseUrlToPath();
    this.set(path);
  }

  /**
   * Parse URL to breadcrumb path
   */
  parseUrlToPath() {
    const path = [
      { name: 'Dashboard', url: '/index.html' },
    ];

    // Check current page
    const currentPage = window.location.pathname.split('/').pop();

    if (currentPage === 'pct.html' || currentPage === '') {
      path.push({ name: 'PCT System', url: '/pct.html' });

      // Check for hash-based navigation
      const hash = window.location.hash.slice(1);
      if (hash) {
        const tabName = this.getTabName(hash);
        if (tabName) {
          path.push({ name: tabName, url: `/pct.html#${hash}` });
        }
      }
    } else if (currentPage === 'queue.html') {
      path.push({ name: 'Agent Queue', url: '/queue.html' });
    } else if (currentPage === 'control.html') {
      path.push({ name: 'Control Panel', url: '/control.html' });
    }

    return path;
  }

  /**
   * Get human-readable tab name from hash
   */
  getTabName(hash) {
    const tabNames = {
      context: 'Context & Setup',
      usps: 'USPs & Angles',
      generate: 'Hook Generation',
      review: 'Hook Review',
      creative: 'Ad Creative',
      scripts: 'Video Scripts',
      deploy: 'Deployment',
      analytics: 'Analytics',
      automation: 'Automation',
      settings: 'Settings',
    };

    return tabNames[hash] || null;
  }

  /**
   * Render breadcrumbs
   */
  render() {
    if (!this.container) return;

    const ol = document.createElement('ol');
    ol.className = 'pct-breadcrumbs-list';

    this.currentPath.forEach((item, index) => {
      const li = document.createElement('li');
      li.className = 'pct-breadcrumbs-item';

      if (index === this.currentPath.length - 1) {
        // Last item (current page) - not a link
        li.setAttribute('aria-current', 'page');
        li.innerHTML = `<span class="pct-breadcrumbs-current">${this.escapeHtml(item.name)}</span>`;
      } else {
        // Link to previous pages
        li.innerHTML = `<a href="${item.url}" class="pct-breadcrumbs-link">${this.escapeHtml(item.name)}</a>`;
      }

      ol.appendChild(li);
    });

    this.container.innerHTML = '';
    this.container.appendChild(ol);
  }

  /**
   * Update JSON-LD structured data
   */
  updateStructuredData() {
    // Remove existing breadcrumb structured data
    const existing = document.querySelector('script[data-breadcrumb-schema]');
    if (existing) {
      existing.remove();
    }

    // Create new structured data
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: this.currentPath.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: this.makeAbsoluteUrl(item.url),
      })),
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-breadcrumb-schema', 'true');
    script.textContent = JSON.stringify(schema, null, 2);
    document.head.appendChild(script);

    console.log('[PCT Breadcrumbs] Structured data updated');
  }

  /**
   * Make URL absolute
   */
  makeAbsoluteUrl(url) {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('//')) return window.location.protocol + url;
    if (url.startsWith('/')) return window.location.origin + url;
    return window.location.origin + '/' + url;
  }

  /**
   * Escape HTML
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Watch for route changes
   */
  watchRouteChanges() {
    // Listen for popstate (back/forward navigation)
    window.addEventListener('popstate', () => {
      this.updateFromUrl();
    });

    // Listen for hash changes
    window.addEventListener('hashchange', () => {
      this.updateFromUrl();
    });

    // Listen for custom breadcrumb update events
    window.addEventListener('pct:breadcrumb-update', (e) => {
      if (e.detail && e.detail.path) {
        this.set(e.detail.path);
      }
    });
  }

  /**
   * Add item to breadcrumb
   */
  addItem(name, url) {
    this.currentPath.push({ name, url });
    this.render();
    this.updateStructuredData();
  }

  /**
   * Remove last item from breadcrumb
   */
  popItem() {
    this.currentPath.pop();
    this.render();
    this.updateStructuredData();
  }

  /**
   * Get current breadcrumb path
   */
  getCurrentPath() {
    return [...this.currentPath];
  }

  /**
   * Export structured data for debugging
   */
  exportStructuredData() {
    const script = document.querySelector('script[data-breadcrumb-schema]');
    if (script) {
      return JSON.parse(script.textContent);
    }
    return null;
  }
}

// Create singleton instance
const pctBreadcrumbs = new PCTBreadcrumbsManager();

// Export for use in other modules
window.pctBreadcrumbs = pctBreadcrumbs;

// Helper function for easy breadcrumb updates
window.updateBreadcrumbs = function (path) {
  pctBreadcrumbs.set(path);
};

// Add styles
const breadcrumbStyles = document.createElement('style');
breadcrumbStyles.textContent = `
  .pct-breadcrumbs {
    padding: var(--space-sm) 0;
    background: var(--color-bg);
    border-bottom: 1px solid var(--color-border);
  }

  .pct-breadcrumbs-list {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
    list-style: none;
    padding: 0;
    margin: 0;
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 var(--space-md);
  }

  .pct-breadcrumbs-item {
    display: flex;
    align-items: center;
    font-size: 0.875rem;
  }

  .pct-breadcrumbs-item:not(:last-child)::after {
    content: '/';
    margin-left: var(--space-xs);
    color: var(--color-text-light);
  }

  .pct-breadcrumbs-link {
    color: var(--color-primary);
    text-decoration: none;
    transition: color 0.2s;
  }

  .pct-breadcrumbs-link:hover {
    color: var(--color-primary-dark);
    text-decoration: underline;
  }

  .pct-breadcrumbs-link:focus {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
    border-radius: 2px;
  }

  .pct-breadcrumbs-current {
    color: var(--color-text);
    font-weight: 500;
  }

  @media (max-width: 640px) {
    .pct-breadcrumbs {
      font-size: 0.8125rem;
    }

    .pct-breadcrumbs-list {
      padding: 0 var(--space-sm);
    }
  }
`;
document.head.appendChild(breadcrumbStyles);
