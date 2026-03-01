/**
 * PCT Structured Data (JSON-LD)
 * Schema.org markup for rich search results
 * PCT-WC-064: Structured data JSON-LD
 */

class PCTStructuredData {
  constructor() {
    this.schemas = [];
  }

  /**
   * Initialize structured data
   */
  init() {
    // Add organization schema
    this.addOrganization();

    // Add website schema
    this.addWebsite();

    // Add breadcrumbs
    this.addBreadcrumbs();

    console.log('[PCT Structured Data] Initialized');
  }

  /**
   * Add Organization schema
   */
  addOrganization() {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'PCT System',
      description:
        'Programmatic Creative Testing - Systematic Facebook ad creative testing platform',
      url: window.location.origin,
      logo: window.location.origin + '/logo.png',
      sameAs: [
        // Add social media URLs here
      ],
    };

    this.addSchema('organization', schema);
  }

  /**
   * Add Website schema
   */
  addWebsite() {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'PCT System',
      url: window.location.origin,
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: window.location.origin + '/search?q={search_term_string}',
        },
        'query-input': 'required name=search_term_string',
      },
    };

    this.addSchema('website', schema);
  }

  /**
   * Add Breadcrumbs schema
   */
  addBreadcrumbs() {
    const path = window.location.pathname;
    const hash = window.location.hash;

    const breadcrumbs = [
      {
        name: 'Home',
        item: window.location.origin,
      },
    ];

    // Add PCT page
    if (path.includes('pct.html')) {
      breadcrumbs.push({
        name: 'PCT',
        item: window.location.origin + '/pct.html',
      });

      // Add section based on hash
      const sections = {
        '#context': 'Context & Setup',
        '#usps': 'USPs & Angles',
        '#generate': 'Hook Generation',
        '#review': 'Hook Review',
        '#creative': 'Ad Creative',
        '#scripts': 'Video Scripts',
        '#deploy': 'Deployment',
        '#analytics': 'Analytics',
        '#automation': 'Automation',
        '#settings': 'Settings',
      };

      if (sections[hash]) {
        breadcrumbs.push({
          name: sections[hash],
          item: window.location.origin + '/pct.html' + hash,
        });
      }
    }

    const schema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbs.map((crumb, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: crumb.name,
        item: crumb.item,
      })),
    };

    this.addSchema('breadcrumbs', schema);
  }

  /**
   * Add Product schema
   */
  addProduct(data) {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: data.name,
      description: data.description,
      image: data.image,
      brand: {
        '@type': 'Brand',
        name: data.brandName,
      },
    };

    if (data.offers) {
      schema.offers = {
        '@type': 'Offer',
        price: data.offers.price,
        priceCurrency: data.offers.currency || 'USD',
        availability: 'https://schema.org/InStock',
      };
    }

    this.addSchema('product', schema);
  }

  /**
   * Add SoftwareApplication schema
   */
  addSoftwareApplication(data) {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: data.name || 'PCT System',
      applicationCategory: 'BusinessApplication',
      description: data.description,
      operatingSystem: 'Web',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      aggregateRating: data.rating
        ? {
            '@type': 'AggregateRating',
            ratingValue: data.rating.value,
            ratingCount: data.rating.count,
          }
        : undefined,
    };

    this.addSchema('software', schema);
  }

  /**
   * Add schema to page
   */
  addSchema(id, schema) {
    // Remove existing schema with same ID
    this.removeSchema(id);

    // Create script tag
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = `schema-${id}`;
    script.textContent = JSON.stringify(schema, null, 2);
    document.head.appendChild(script);

    this.schemas.push({ id, schema });

    console.log('[PCT Structured Data] Added schema:', id);
  }

  /**
   * Remove schema
   */
  removeSchema(id) {
    const existing = document.getElementById(`schema-${id}`);
    if (existing) {
      existing.remove();
    }

    this.schemas = this.schemas.filter((s) => s.id !== id);
  }

  /**
   * Get all schemas
   */
  getSchemas() {
    return this.schemas;
  }

  /**
   * Validate schemas
   */
  validate() {
    console.log('[PCT Structured Data] Validating schemas...');
    console.log(
      'Use Google Rich Results Test: https://search.google.com/test/rich-results'
    );
    console.log('Or Schema Markup Validator: https://validator.schema.org/');

    return this.schemas.map((s) => ({
      id: s.id,
      valid: s.schema['@context'] && s.schema['@type'],
    }));
  }
}

// Create singleton instance
const pctStructuredData = new PCTStructuredData();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => pctStructuredData.init());
} else {
  pctStructuredData.init();
}

// Export for use in other modules
window.pctStructuredData = pctStructuredData;
