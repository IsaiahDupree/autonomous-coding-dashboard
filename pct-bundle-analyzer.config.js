/**
 * PCT Bundle Analyzer Configuration
 * PCT-WC-057: Bundle size monitoring
 */

module.exports = {
  // Bundle size budgets (in KB)
  budgets: {
    'pct.js': 500,
    'pct.css': 100,
    'pct-memory-manager.js': 50,
    'pct-cache.js': 30,
    'pct-lazy-loader.js': 30,
    'pct-request-dedup.js': 30,
    'index.css': 150,
    'index.html': 50,
    'pct.html': 50,
    // Total budget
    total: 1000,
  },

  // Files to analyze
  files: [
    'pct.js',
    'pct.css',
    'pct-memory-manager.js',
    'pct-cache.js',
    'pct-lazy-loader.js',
    'pct-request-dedup.js',
    'index.css',
  ],

  // Compression settings
  compression: {
    gzip: true,
    brotli: true,
  },

  // Threshold for warnings (percentage over budget)
  warningThreshold: 10, // Warn if 10% over budget

  // Threshold for errors (percentage over budget)
  errorThreshold: 20, // Error if 20% over budget

  // Output settings
  output: {
    json: 'bundle-analysis.json',
    html: 'bundle-analysis.html',
    csv: 'bundle-analysis.csv',
  },

  // Historical tracking
  history: {
    enabled: true,
    file: 'bundle-history.json',
    maxEntries: 100, // Keep last 100 builds
  },
};
