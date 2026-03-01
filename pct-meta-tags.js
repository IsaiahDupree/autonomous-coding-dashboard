/**
 * PCT Meta Tags Manager
 * Dynamic meta tags for SEO and social sharing
 * PCT-WC-061: Dynamic meta tags
 */

class PCTMetaTagsManager {
  constructor() {
    this.defaults = {
      title: 'Programmatic Creative Testing',
      description:
        'Systematic Facebook ad creative testing through structured parameters - USPs, marketing angles, messaging frameworks, awareness levels, and market sophistication',
      image: '/pct-og-image.png',
      url: window.location.origin,
      type: 'website',
      siteName: 'PCT System',
      twitterCard: 'summary_large_image',
      twitterSite: '@pct',
    };

    this.currentMeta = { ...this.defaults };
  }

  /**
   * Initialize meta tags
   */
  init() {
    // Set default meta tags
    this.updateMeta(this.defaults);

    // Update meta tags on route change (for SPA)
    this.watchRouteChanges();

    console.log('[PCT Meta Tags] Initialized');
  }

  /**
   * Update meta tags
   */
  updateMeta(data) {
    const meta = { ...this.defaults, ...data };
    this.currentMeta = meta;

    // Title
    document.title = meta.title;

    // Description
    this.setMeta('name', 'description', meta.description);
    this.setMeta('property', 'og:description', meta.description);
    this.setMeta('name', 'twitter:description', meta.description);

    // Image
    const imageUrl = this.makeAbsoluteUrl(meta.image);
    this.setMeta('property', 'og:image', imageUrl);
    this.setMeta('name', 'twitter:image', imageUrl);

    // URL
    const url = meta.url || window.location.href;
    this.setMeta('property', 'og:url', url);
    this.setLink('canonical', url);

    // Type
    this.setMeta('property', 'og:type', meta.type);

    // Site name
    this.setMeta('property', 'og:site_name', meta.siteName);
    this.setMeta('property', 'og:title', meta.title);
    this.setMeta('name', 'twitter:title', meta.title);

    // Twitter card
    this.setMeta('name', 'twitter:card', meta.twitterCard);

    if (meta.twitterSite) {
      this.setMeta('name', 'twitter:site', meta.twitterSite);
    }

    // Additional meta tags
    if (meta.keywords) {
      this.setMeta('name', 'keywords', meta.keywords);
    }

    if (meta.author) {
      this.setMeta('name', 'author', meta.author);
    }

    // Article-specific meta
    if (meta.type === 'article') {
      if (meta.publishedTime) {
        this.setMeta('property', 'article:published_time', meta.publishedTime);
      }
      if (meta.modifiedTime) {
        this.setMeta('property', 'article:modified_time', meta.modifiedTime);
      }
      if (meta.section) {
        this.setMeta('property', 'article:section', meta.section);
      }
      if (meta.tags && Array.isArray(meta.tags)) {
        meta.tags.forEach((tag) => {
          this.setMeta('property', 'article:tag', tag);
        });
      }
    }

    console.log('[PCT Meta Tags] Updated:', meta.title);
  }

  /**
   * Set a meta tag
   */
  setMeta(attribute, key, value) {
    if (!value) return;

    let element = document.querySelector(`meta[${attribute}="${key}"]`);

    if (!element) {
      element = document.createElement('meta');
      element.setAttribute(attribute, key);
      document.head.appendChild(element);
    }

    element.setAttribute('content', value);
  }

  /**
   * Set a link tag
   */
  setLink(rel, href) {
    if (!href) return;

    let element = document.querySelector(`link[rel="${rel}"]`);

    if (!element) {
      element = document.createElement('link');
      element.setAttribute('rel', rel);
      document.head.appendChild(element);
    }

    element.setAttribute('href', href);
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
   * Watch for route changes
   */
  watchRouteChanges() {
    // Listen for popstate (back/forward navigation)
    window.addEventListener('popstate', () => {
      this.updateMetaForRoute();
    });

    // Listen for custom route change events
    window.addEventListener('pct:routechange', (e) => {
      if (e.detail && e.detail.meta) {
        this.updateMeta(e.detail.meta);
      }
    });

    // Watch for hash changes
    window.addEventListener('hashchange', () => {
      this.updateMetaForRoute();
    });
  }

  /**
   * Update meta tags based on current route
   */
  updateMetaForRoute() {
    const path = window.location.pathname;
    const hash = window.location.hash;

    // Define meta for different routes
    const routes = {
      '/pct.html': {
        title: 'Programmatic Creative Testing',
        description:
          'Systematic Facebook ad creative testing through structured parameters',
      },
      '#context': {
        title: 'Context & Setup - PCT',
        description: 'Set up your brand, products, and voice of customer data',
      },
      '#usps': {
        title: 'USPs & Angles - PCT',
        description: 'Generate unique selling propositions and marketing angles',
      },
      '#generate': {
        title: 'Hook Generation - PCT',
        description: 'Generate ad hooks using AI with strategic parameters',
      },
      '#review': {
        title: 'Hook Review - PCT',
        description: 'Review and approve generated hooks',
      },
      '#creative': {
        title: 'Ad Creative - PCT',
        description: 'Generate static ad creatives from approved hooks',
      },
      '#scripts': {
        title: 'Video Scripts - PCT',
        description: 'Generate video ad scripts with psychological triggers',
      },
      '#deploy': {
        title: 'Deployment - PCT',
        description: 'Deploy ads to Facebook via Meta Marketing API',
      },
      '#analytics': {
        title: 'Analytics - PCT',
        description: 'Analyze ad performance and identify winners',
      },
      '#automation': {
        title: 'Automation - PCT',
        description: 'Set up webhooks and automation workflows',
      },
      '#settings': {
        title: 'Settings - PCT',
        description: 'Configure API keys and default presets',
      },
    };

    const meta = routes[hash] || routes[path] || {};
    if (Object.keys(meta).length > 0) {
      this.updateMeta(meta);
    }
  }

  /**
   * Generate OG image URL for dynamic content
   * PCT-WC-066: Uses canvas-based dynamic OG image generator
   */
  async generateOGImage(data) {
    // Use the OG image generator if available
    if (window.pctOGImageGenerator) {
      const brand = this.getCurrentBrand();
      const imageDataUrl = await window.pctOGImageGenerator.generate({
        title: data.title || this.currentMeta.title,
        subtitle: data.subtitle || this.currentMeta.description,
        theme: data.theme || 'light',
        brand: brand,
      });
      return imageDataUrl;
    }

    // Fallback to static image
    return '/pct-og-image.png';
  }

  /**
   * Get current brand data for OG image generation
   */
  getCurrentBrand() {
    // Try to get brand from global state
    if (window.selectedBrand) {
      return {
        name: window.selectedBrand.name,
        logoUrl: window.selectedBrand.logoUrl,
        colors: {
          primary: window.selectedBrand.colorPrimary,
          accent: window.selectedBrand.colorAccent,
          background: window.selectedBrand.colorBg,
          text: window.selectedBrand.colorText,
        },
      };
    }
    return null;
  }

  /**
   * Get current meta tags
   */
  getCurrentMeta() {
    return { ...this.currentMeta };
  }

  /**
   * Validate meta tags
   */
  validate() {
    const warnings = [];

    // Check title length
    if (this.currentMeta.title.length > 60) {
      warnings.push(`Title too long (${this.currentMeta.title.length} chars, max 60)`);
    }

    // Check description length
    if (this.currentMeta.description.length > 160) {
      warnings.push(
        `Description too long (${this.currentMeta.description.length} chars, max 160)`
      );
    }

    // Check image
    if (!this.currentMeta.image) {
      warnings.push('Missing OG image');
    }

    // Check canonical URL
    const canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      warnings.push('Missing canonical URL');
    }

    if (warnings.length > 0) {
      console.warn('[PCT Meta Tags] Validation warnings:', warnings);
      return { valid: false, warnings };
    }

    console.log('[PCT Meta Tags] Validation passed');
    return { valid: true, warnings: [] };
  }

  /**
   * Export meta tags as JSON for debugging
   */
  export() {
    return {
      title: document.title,
      meta: Array.from(document.querySelectorAll('meta')).map((el) => ({
        name: el.getAttribute('name'),
        property: el.getAttribute('property'),
        content: el.getAttribute('content'),
      })),
      links: Array.from(document.querySelectorAll('link')).map((el) => ({
        rel: el.getAttribute('rel'),
        href: el.getAttribute('href'),
      })),
    };
  }

  /**
   * Preview how page will appear in social shares
   */
  preview() {
    const meta = this.getCurrentMeta();

    const preview = {
      facebook: {
        title: meta.title,
        description: meta.description,
        image: this.makeAbsoluteUrl(meta.image),
        url: meta.url,
      },
      twitter: {
        title: meta.title,
        description: meta.description,
        image: this.makeAbsoluteUrl(meta.image),
        card: meta.twitterCard,
      },
      linkedin: {
        title: meta.title,
        description: meta.description,
        image: this.makeAbsoluteUrl(meta.image),
      },
    };

    console.log('[PCT Meta Tags] Social share preview:', preview);
    return preview;
  }
}

// Create singleton instance
const pctMetaTags = new PCTMetaTagsManager();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => pctMetaTags.init());
} else {
  pctMetaTags.init();
}

// Export for use in other modules
window.pctMetaTags = pctMetaTags;

// Helper function for easy meta updates
window.updateMeta = function (data) {
  pctMetaTags.updateMeta(data);
};
