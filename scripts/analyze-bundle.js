#!/usr/bin/env node

/**
 * PCT Bundle Analyzer
 * Analyzes bundle sizes and checks against budgets
 * PCT-WC-057: Bundle size monitoring
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const config = require('../pct-bundle-analyzer.config.js');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

/**
 * Get file size in KB
 */
function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return (stats.size / 1024).toFixed(2);
  } catch (e) {
    return null;
  }
}

/**
 * Get gzipped size
 */
function getGzipSize(filePath) {
  try {
    const content = fs.readFileSync(filePath);
    const gzipped = zlib.gzipSync(content, { level: 9 });
    return (gzipped.length / 1024).toFixed(2);
  } catch (e) {
    return null;
  }
}

/**
 * Get brotli size
 */
function getBrotliSize(filePath) {
  try {
    const content = fs.readFileSync(filePath);
    const compressed = zlib.brotliCompressSync(content, {
      params: {
        [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
      },
    });
    return (compressed.length / 1024).toFixed(2);
  } catch (e) {
    return null;
  }
}

/**
 * Analyze a single file
 */
function analyzeFile(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  const raw = getFileSize(fullPath);

  if (raw === null) {
    return {
      file: filePath,
      exists: false,
      raw: 0,
      gzip: 0,
      brotli: 0,
      budget: config.budgets[filePath] || null,
      overBudget: false,
      percentOver: 0,
    };
  }

  const result = {
    file: filePath,
    exists: true,
    raw: parseFloat(raw),
    gzip: config.compression.gzip ? parseFloat(getGzipSize(fullPath)) : null,
    brotli: config.compression.brotli ? parseFloat(getBrotliSize(fullPath)) : null,
    budget: config.budgets[filePath] || null,
  };

  // Check budget
  if (result.budget) {
    const size = result.gzip || result.raw;
    result.overBudget = size > result.budget;
    result.percentOver = ((size / result.budget - 1) * 100).toFixed(2);
  }

  return result;
}

/**
 * Format size with color
 */
function formatSize(size, budget) {
  if (!budget) return `${size} KB`;

  const percent = (size / budget) * 100;
  let color = colors.green;

  if (percent > 100 + config.errorThreshold) {
    color = colors.red;
  } else if (percent > 100 + config.warningThreshold) {
    color = colors.yellow;
  }

  return `${color}${size} KB${colors.reset} (${percent.toFixed(0)}%)`;
}

/**
 * Generate report
 */
function generateReport(results) {
  console.log('\n' + colors.cyan + '='.repeat(80) + colors.reset);
  console.log(colors.cyan + '  PCT Bundle Size Analysis' + colors.reset);
  console.log(colors.cyan + '='.repeat(80) + colors.reset + '\n');

  // Table header
  console.log(
    `${'File'.padEnd(35)} ${'Raw'.padStart(10)} ${'Gzip'.padStart(10)} ${'Brotli'.padStart(10)} ${'Budget'.padStart(10)} ${'Status'.padStart(10)}`
  );
  console.log('-'.repeat(85));

  let totalRaw = 0;
  let totalGzip = 0;
  let totalBrotli = 0;
  let hasErrors = false;
  let hasWarnings = false;

  results.forEach((result) => {
    if (!result.exists) {
      console.log(`${result.file.padEnd(35)} ${colors.yellow}NOT FOUND${colors.reset}`);
      return;
    }

    totalRaw += result.raw;
    if (result.gzip) totalGzip += result.gzip;
    if (result.brotli) totalBrotli += result.brotli;

    const raw = `${result.raw.toFixed(2)} KB`.padStart(10);
    const gzip = result.gzip ? `${result.gzip.toFixed(2)} KB`.padStart(10) : '  -'.padStart(10);
    const brotli = result.brotli ? `${result.brotli.toFixed(2)} KB`.padStart(10) : '  -'.padStart(10);
    const budget = result.budget ? `${result.budget} KB`.padStart(10) : '  -'.padStart(10);

    let status = colors.green + '✓ OK' + colors.reset;
    if (result.overBudget) {
      const percent = parseFloat(result.percentOver);
      if (percent > config.errorThreshold) {
        status = colors.red + `✗ +${result.percentOver}%` + colors.reset;
        hasErrors = true;
      } else if (percent > config.warningThreshold) {
        status = colors.yellow + `⚠ +${result.percentOver}%` + colors.reset;
        hasWarnings = true;
      }
    }

    console.log(`${result.file.padEnd(35)} ${raw} ${gzip} ${brotli} ${budget} ${status.padStart(10)}`);
  });

  // Total
  console.log('-'.repeat(85));
  const totalGzipStr = totalGzip > 0 ? `${totalGzip.toFixed(2)} KB`.padStart(10) : '  -'.padStart(10);
  const totalBrotliStr = totalBrotli > 0 ? `${totalBrotli.toFixed(2)} KB`.padStart(10) : '  -'.padStart(10);
  const totalBudget = config.budgets.total || '-';
  const totalBudgetStr = typeof totalBudget === 'number' ? `${totalBudget} KB`.padStart(10) : '  -'.padStart(10);

  let totalStatus = colors.green + '✓ OK' + colors.reset;
  if (typeof totalBudget === 'number' && totalGzip > 0) {
    const percent = ((totalGzip / totalBudget - 1) * 100).toFixed(2);
    if (totalGzip > totalBudget) {
      if (percent > config.errorThreshold) {
        totalStatus = colors.red + `✗ +${percent}%` + colors.reset;
        hasErrors = true;
      } else if (percent > config.warningThreshold) {
        totalStatus = colors.yellow + `⚠ +${percent}%` + colors.reset;
        hasWarnings = true;
      }
    }
  }

  console.log(
    `${'TOTAL'.padEnd(35)} ${`${totalRaw.toFixed(2)} KB`.padStart(10)} ${totalGzipStr} ${totalBrotliStr} ${totalBudgetStr} ${totalStatus.padStart(10)}`
  );

  console.log('\n');

  // Summary
  if (hasErrors) {
    console.log(colors.red + '❌ Bundle size budget exceeded!' + colors.reset);
    return 1;
  } else if (hasWarnings) {
    console.log(colors.yellow + '⚠️  Bundle size approaching budget limit' + colors.reset);
    return 0;
  } else {
    console.log(colors.green + '✅ All bundles within budget' + colors.reset);
    return 0;
  }
}

/**
 * Save history
 */
function saveHistory(results) {
  if (!config.history.enabled) return;

  const historyFile = path.join(process.cwd(), config.history.file);
  let history = [];

  try {
    if (fs.existsSync(historyFile)) {
      history = JSON.parse(fs.readFileSync(historyFile, 'utf-8'));
    }
  } catch (e) {
    console.warn('Failed to load history:', e.message);
  }

  const entry = {
    timestamp: new Date().toISOString(),
    results,
    totalRaw: results.reduce((sum, r) => sum + (r.raw || 0), 0).toFixed(2),
    totalGzip: results.reduce((sum, r) => sum + (r.gzip || 0), 0).toFixed(2),
    totalBrotli: results.reduce((sum, r) => sum + (r.brotli || 0), 0).toFixed(2),
  };

  history.push(entry);

  // Keep only max entries
  if (history.length > config.history.maxEntries) {
    history = history.slice(-config.history.maxEntries);
  }

  try {
    fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
    console.log(colors.blue + `📊 History saved to ${config.history.file}` + colors.reset);
  } catch (e) {
    console.warn('Failed to save history:', e.message);
  }
}

/**
 * Main
 */
function main() {
  console.log('Analyzing bundle sizes...\n');

  const results = config.files.map((file) => analyzeFile(file));

  const exitCode = generateReport(results);

  // Save results
  if (config.output.json) {
    fs.writeFileSync(config.output.json, JSON.stringify(results, null, 2));
    console.log(colors.blue + `📄 JSON report saved to ${config.output.json}` + colors.reset);
  }

  // Save history
  saveHistory(results);

  console.log('');
  process.exit(exitCode);
}

// Run
main();
