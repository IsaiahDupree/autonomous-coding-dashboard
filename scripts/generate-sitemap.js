#!/usr/bin/env node

/**
 * Generate XML Sitemap
 * PCT-WC-062: XML sitemap generation
 */

const fs = require('fs');
const path = require('path');

const baseUrl = process.env.BASE_URL || 'https://yourdomain.com';

// Define all routes and their properties
const routes = [
  {
    path: '/',
    changefreq: 'daily',
    priority: 1.0,
  },
  {
    path: '/index.html',
    changefreq: 'daily',
    priority: 1.0,
  },
  {
    path: '/pct.html',
    changefreq: 'daily',
    priority: 0.9,
  },
  {
    path: '/control.html',
    changefreq: 'weekly',
    priority: 0.8,
  },
  {
    path: '/queue.html',
    changefreq: 'weekly',
    priority: 0.8,
  },
  // Add more routes as needed
];

/**
 * Generate sitemap XML
 */
function generateSitemap() {
  const now = new Date().toISOString().split('T')[0];

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  routes.forEach((route) => {
    xml += '  <url>\n';
    xml += `    <loc>${baseUrl}${route.path}</loc>\n`;
    xml += `    <lastmod>${now}</lastmod>\n`;
    xml += `    <changefreq>${route.changefreq}</changefreq>\n`;
    xml += `    <priority>${route.priority}</priority>\n`;
    xml += '  </url>\n';
  });

  xml += '</urlset>\n';

  return xml;
}

/**
 * Main
 */
function main() {
  console.log('Generating sitemap.xml...');

  const sitemap = generateSitemap();
  const outputPath = path.join(process.cwd(), 'public', 'sitemap.xml');

  // Create public directory if it doesn't exist
  const publicDir = path.dirname(outputPath);
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, sitemap);

  console.log(`✅ Sitemap generated at ${outputPath}`);
  console.log(`   ${routes.length} URLs included`);
}

main();
