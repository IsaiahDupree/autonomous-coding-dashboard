/**
 * SEO Module
 * ==========
 *
 * Implements AUTH-WC-061 through AUTH-WC-065:
 *   061: Title/desc/OG on all pages
 *   062: Auto-generate sitemap.xml
 *   063: Proper robots.txt
 *   064: Schema.org rich results
 *   065: Prevent duplicate content
 */

// ---------------------------------------------------------------------------
// AUTH-WC-061: Title/desc/OG on all pages
// ---------------------------------------------------------------------------

export interface PageMetadata {
  title: string;
  description: string;
  canonical?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'product';
  ogUrl?: string;
  twitterCard?: 'summary' | 'summary_large_image';
  twitterSite?: string;
  twitterCreator?: string;
  noIndex?: boolean;
  noFollow?: boolean;
  alternates?: Array<{ hrefLang: string; href: string }>;
}

/**
 * Generate HTML meta tags from page metadata.
 */
export function generateMetaTags(meta: PageMetadata): string {
  const tags: string[] = [];

  // Basic
  tags.push(`<title>${escapeHtml(meta.title)}</title>`);
  tags.push(`<meta name="description" content="${escapeHtml(meta.description)}">`);

  // Canonical
  if (meta.canonical) {
    tags.push(`<link rel="canonical" href="${escapeHtml(meta.canonical)}">`);
  }

  // Open Graph
  tags.push(`<meta property="og:title" content="${escapeHtml(meta.ogTitle || meta.title)}">`);
  tags.push(`<meta property="og:description" content="${escapeHtml(meta.ogDescription || meta.description)}">`);
  tags.push(`<meta property="og:type" content="${meta.ogType || 'website'}">`);
  if (meta.ogImage) {
    tags.push(`<meta property="og:image" content="${escapeHtml(meta.ogImage)}">`);
  }
  if (meta.ogUrl || meta.canonical) {
    tags.push(`<meta property="og:url" content="${escapeHtml(meta.ogUrl || meta.canonical || '')}">`);
  }

  // Twitter
  tags.push(`<meta name="twitter:card" content="${meta.twitterCard || 'summary_large_image'}">`);
  if (meta.twitterSite) {
    tags.push(`<meta name="twitter:site" content="${escapeHtml(meta.twitterSite)}">`);
  }
  if (meta.twitterCreator) {
    tags.push(`<meta name="twitter:creator" content="${escapeHtml(meta.twitterCreator)}">`);
  }

  // Robots
  const robotDirectives: string[] = [];
  if (meta.noIndex) robotDirectives.push('noindex');
  if (meta.noFollow) robotDirectives.push('nofollow');
  if (robotDirectives.length > 0) {
    tags.push(`<meta name="robots" content="${robotDirectives.join(', ')}">`);
  }

  // Alternate languages
  if (meta.alternates) {
    for (const alt of meta.alternates) {
      tags.push(`<link rel="alternate" hreflang="${escapeHtml(alt.hrefLang)}" href="${escapeHtml(alt.href)}">`);
    }
  }

  return tags.join('\n  ');
}

/**
 * Generate Next.js Metadata object from PageMetadata.
 * Use in layout.tsx or page.tsx exports.
 */
export function toNextMetadata(meta: PageMetadata): Record<string, unknown> {
  const result: Record<string, unknown> = {
    title: meta.title,
    description: meta.description,
    openGraph: {
      title: meta.ogTitle || meta.title,
      description: meta.ogDescription || meta.description,
      type: meta.ogType || 'website',
      ...(meta.ogImage && { images: [{ url: meta.ogImage }] }),
      ...(meta.ogUrl && { url: meta.ogUrl }),
    },
    twitter: {
      card: meta.twitterCard || 'summary_large_image',
      ...(meta.twitterSite && { site: meta.twitterSite }),
      ...(meta.twitterCreator && { creator: meta.twitterCreator }),
    },
  };

  if (meta.canonical) {
    result.alternates = { canonical: meta.canonical };
  }

  if (meta.noIndex || meta.noFollow) {
    result.robots = {
      index: !meta.noIndex,
      follow: !meta.noFollow,
    };
  }

  return result;
}

/**
 * Default metadata for each ACD product.
 */
export const PRODUCT_METADATA: Record<string, PageMetadata> = {
  portal28: {
    title: 'Portal28 - Course Platform & Authentication Hub',
    description: 'Create, manage, and sell online courses with integrated authentication, payments, and analytics.',
    ogType: 'website',
  },
  softwarehub: {
    title: 'SoftwareHub - Software Licensing & Distribution',
    description: 'License management, secure downloads, and course delivery for software products.',
    ogType: 'website',
  },
  waitlistlab: {
    title: 'WaitlistLab - Meta Ads Management & Lead Capture',
    description: 'Automated Meta advertising, lead form management, and conversion tracking.',
    ogType: 'website',
  },
  gapradar: {
    title: 'GapRadar - Market Research & Ad Analysis',
    description: 'Discover market gaps, analyze competitor ads, and find opportunities with AI-powered research.',
    ogType: 'website',
  },
  blogcanvas: {
    title: 'BlogCanvas - Blog CMS & Content Platform',
    description: 'Create and manage blogs with a modern CMS designed for content creators.',
    ogType: 'website',
  },
  vellopad: {
    title: 'VelloPad - Book Writing & Print-on-Demand',
    description: 'Write, publish, and sell books with integrated print-on-demand fulfillment.',
    ogType: 'website',
  },
  velvethold: {
    title: 'VelvetHold - Date Reservation Platform',
    description: 'Reserve and manage dates for events, appointments, and special occasions.',
    ogType: 'website',
  },
};

// ---------------------------------------------------------------------------
// AUTH-WC-062: Auto-generate sitemap.xml
// ---------------------------------------------------------------------------

export interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
  alternates?: Array<{ hrefLang: string; href: string }>;
}

/**
 * Generate sitemap.xml content.
 */
export function generateSitemap(entries: SitemapEntry[]): string {
  const urls = entries.map(entry => {
    const parts = [`    <loc>${escapeXml(entry.loc)}</loc>`];

    if (entry.lastmod) {
      parts.push(`    <lastmod>${escapeXml(entry.lastmod)}</lastmod>`);
    }
    if (entry.changefreq) {
      parts.push(`    <changefreq>${entry.changefreq}</changefreq>`);
    }
    if (entry.priority !== undefined) {
      parts.push(`    <priority>${entry.priority.toFixed(1)}</priority>`);
    }

    // Alternate language versions
    if (entry.alternates) {
      for (const alt of entry.alternates) {
        parts.push(`    <xhtml:link rel="alternate" hreflang="${escapeXml(alt.hrefLang)}" href="${escapeXml(alt.href)}"/>`);
      }
    }

    return `  <url>\n${parts.join('\n')}\n  </url>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>`;
}

/**
 * Generate a sitemap index for multiple sitemaps.
 */
export function generateSitemapIndex(sitemaps: Array<{ loc: string; lastmod?: string }>): string {
  const entries = sitemaps.map(sm => {
    const parts = [`    <loc>${escapeXml(sm.loc)}</loc>`];
    if (sm.lastmod) parts.push(`    <lastmod>${escapeXml(sm.lastmod)}</lastmod>`);
    return `  <sitemap>\n${parts.join('\n')}\n  </sitemap>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</sitemapindex>`;
}

/**
 * Generate sitemap entries from route definitions.
 */
export function routesToSitemapEntries(
  baseUrl: string,
  routes: Array<{ path: string; priority?: number; changefreq?: SitemapEntry['changefreq'] }>,
): SitemapEntry[] {
  return routes.map(route => ({
    loc: `${baseUrl.replace(/\/$/, '')}${route.path}`,
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: route.changefreq || 'weekly',
    priority: route.priority ?? 0.5,
  }));
}

// ---------------------------------------------------------------------------
// AUTH-WC-063: Proper robots.txt
// ---------------------------------------------------------------------------

export interface RobotsTxtConfig {
  /** Base URL of the site */
  siteUrl: string;
  /** Paths to disallow for all bots */
  disallow?: string[];
  /** Paths to allow (override disallow) */
  allow?: string[];
  /** Crawl delay in seconds */
  crawlDelay?: number;
  /** Specific bot rules */
  botRules?: Array<{
    userAgent: string;
    disallow?: string[];
    allow?: string[];
    crawlDelay?: number;
  }>;
  /** Include sitemap link */
  includeSitemap?: boolean;
}

/**
 * Generate robots.txt content.
 */
export function generateRobotsTxt(config: RobotsTxtConfig): string {
  const lines: string[] = [];

  // Default rules
  lines.push('User-agent: *');

  const disallowPaths = config.disallow || [
    '/api/',
    '/admin/',
    '/_next/',
    '/auth/callback',
    '/auth/reset-password',
    '/*.json$',
    '/private/',
  ];

  for (const path of disallowPaths) {
    lines.push(`Disallow: ${path}`);
  }

  const allowPaths = config.allow || [];
  for (const path of allowPaths) {
    lines.push(`Allow: ${path}`);
  }

  if (config.crawlDelay) {
    lines.push(`Crawl-delay: ${config.crawlDelay}`);
  }

  // Bot-specific rules
  if (config.botRules) {
    for (const rule of config.botRules) {
      lines.push('');
      lines.push(`User-agent: ${rule.userAgent}`);
      for (const path of rule.disallow || []) {
        lines.push(`Disallow: ${path}`);
      }
      for (const path of rule.allow || []) {
        lines.push(`Allow: ${path}`);
      }
      if (rule.crawlDelay) {
        lines.push(`Crawl-delay: ${rule.crawlDelay}`);
      }
    }
  }

  // Sitemap
  if (config.includeSitemap !== false) {
    lines.push('');
    lines.push(`Sitemap: ${config.siteUrl.replace(/\/$/, '')}/sitemap.xml`);
  }

  return lines.join('\n') + '\n';
}

// ---------------------------------------------------------------------------
// AUTH-WC-064: Schema.org rich results
// ---------------------------------------------------------------------------

export type SchemaType =
  | 'Organization'
  | 'WebSite'
  | 'WebPage'
  | 'Product'
  | 'Course'
  | 'SoftwareApplication'
  | 'Article'
  | 'FAQPage'
  | 'BreadcrumbList';

export interface SchemaOrgData {
  type: SchemaType;
  data: Record<string, unknown>;
}

/**
 * Generate JSON-LD script tag for Schema.org structured data.
 */
export function generateJsonLd(schemas: SchemaOrgData[]): string {
  const scripts = schemas.map(schema => {
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': schema.type,
      ...schema.data,
    };
    return `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`;
  });
  return scripts.join('\n');
}

/**
 * Create Organization schema for ACD products.
 */
export function createOrganizationSchema(config: {
  name: string;
  url: string;
  logo?: string;
  description?: string;
  sameAs?: string[];
}): SchemaOrgData {
  return {
    type: 'Organization',
    data: {
      name: config.name,
      url: config.url,
      ...(config.logo && { logo: config.logo }),
      ...(config.description && { description: config.description }),
      ...(config.sameAs && { sameAs: config.sameAs }),
    },
  };
}

/**
 * Create WebSite schema with search action.
 */
export function createWebSiteSchema(config: {
  name: string;
  url: string;
  searchUrl?: string;
}): SchemaOrgData {
  const data: Record<string, unknown> = {
    name: config.name,
    url: config.url,
  };

  if (config.searchUrl) {
    data.potentialAction = {
      '@type': 'SearchAction',
      target: `${config.searchUrl}?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    };
  }

  return { type: 'WebSite', data };
}

/**
 * Create Course schema (for Portal28/SoftwareHub courses).
 */
export function createCourseSchema(config: {
  name: string;
  description: string;
  provider: string;
  providerUrl: string;
  url: string;
  image?: string;
  price?: number;
  currency?: string;
}): SchemaOrgData {
  return {
    type: 'Course',
    data: {
      name: config.name,
      description: config.description,
      provider: {
        '@type': 'Organization',
        name: config.provider,
        url: config.providerUrl,
      },
      url: config.url,
      ...(config.image && { image: config.image }),
      ...(config.price !== undefined && {
        offers: {
          '@type': 'Offer',
          price: config.price,
          priceCurrency: config.currency || 'USD',
          availability: 'https://schema.org/InStock',
        },
      }),
    },
  };
}

/**
 * Create SoftwareApplication schema.
 */
export function createSoftwareSchema(config: {
  name: string;
  description: string;
  url: string;
  operatingSystem?: string;
  applicationCategory?: string;
  price?: number;
  currency?: string;
  rating?: { value: number; count: number };
}): SchemaOrgData {
  return {
    type: 'SoftwareApplication',
    data: {
      name: config.name,
      description: config.description,
      url: config.url,
      ...(config.operatingSystem && { operatingSystem: config.operatingSystem }),
      ...(config.applicationCategory && { applicationCategory: config.applicationCategory }),
      ...(config.price !== undefined && {
        offers: {
          '@type': 'Offer',
          price: config.price,
          priceCurrency: config.currency || 'USD',
        },
      }),
      ...(config.rating && {
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: config.rating.value,
          ratingCount: config.rating.count,
        },
      }),
    },
  };
}

/**
 * Create BreadcrumbList schema.
 */
export function createBreadcrumbSchema(
  items: Array<{ name: string; url: string }>,
): SchemaOrgData {
  return {
    type: 'BreadcrumbList',
    data: {
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: item.url,
      })),
    },
  };
}

/**
 * Create FAQPage schema.
 */
export function createFAQSchema(
  faqs: Array<{ question: string; answer: string }>,
): SchemaOrgData {
  return {
    type: 'FAQPage',
    data: {
      mainEntity: faqs.map(faq => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    },
  };
}

// ---------------------------------------------------------------------------
// AUTH-WC-065: Prevent duplicate content
// ---------------------------------------------------------------------------

/**
 * Express middleware that adds canonical URL headers.
 */
export function canonicalUrlMiddleware(options: {
  baseUrl: string;
  /** Params to strip from canonical URL */
  stripParams?: string[];
  /** Force HTTPS */
  forceHttps?: boolean;
  /** Force trailing slash */
  trailingSlash?: boolean;
}) {
  const {
    baseUrl,
    stripParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref', 'fbclid', 'gclid'],
    forceHttps = true,
    trailingSlash = false,
  } = options;

  return (req: any, res: any, next: any): void => {
    let canonicalPath = req.path;

    // Normalize trailing slash
    if (trailingSlash && !canonicalPath.endsWith('/')) {
      canonicalPath += '/';
    } else if (!trailingSlash && canonicalPath.length > 1 && canonicalPath.endsWith('/')) {
      canonicalPath = canonicalPath.slice(0, -1);
    }

    // Build canonical URL without tracking params
    const url = new URL(canonicalPath, baseUrl);
    const originalParams = new URLSearchParams(req.query as Record<string, string>);
    for (const [key, value] of originalParams) {
      if (!stripParams.includes(key)) {
        url.searchParams.set(key, value);
      }
    }

    if (forceHttps) {
      url.protocol = 'https:';
    }

    const canonicalUrl = url.toString();
    res.setHeader('Link', `<${canonicalUrl}>; rel="canonical"`);

    next();
  };
}

/**
 * Generate canonical link tag HTML.
 */
export function generateCanonicalLink(url: string): string {
  return `<link rel="canonical" href="${escapeHtml(url)}">`;
}

/**
 * Redirect middleware for duplicate content prevention.
 * Redirects www to non-www, HTTP to HTTPS, etc.
 */
export function duplicateContentRedirect(options: {
  preferNonWww?: boolean;
  forceHttps?: boolean;
} = {}) {
  const { preferNonWww = true, forceHttps = true } = options;

  return (req: any, res: any, next: any): void => {
    let shouldRedirect = false;
    let redirectUrl = `${req.protocol}://${req.hostname}${req.originalUrl}`;

    // Force HTTPS
    if (forceHttps && req.protocol === 'http' && !req.hostname.includes('localhost')) {
      redirectUrl = redirectUrl.replace('http://', 'https://');
      shouldRedirect = true;
    }

    // Prefer non-www
    if (preferNonWww && req.hostname.startsWith('www.')) {
      redirectUrl = redirectUrl.replace('://www.', '://');
      shouldRedirect = true;
    }

    if (shouldRedirect) {
      res.redirect(301, redirectUrl);
      return;
    }

    next();
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
