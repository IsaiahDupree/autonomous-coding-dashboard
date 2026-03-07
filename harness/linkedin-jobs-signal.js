#!/usr/bin/env node

/**
 * LinkedIn Jobs Signal Scraper — Chrome CDP automation
 * =====================================================
 * Searches LinkedIn Jobs for roles that signal manual ops pain:
 *   "operations coordinator", "virtual assistant", "data entry", "manual reporting"
 *
 * Companies actively hiring for these roles have:
 *   1. A proven pain point (they're doing work manually)
 *   2. A proven budget (they're paying salary for it)
 *   → Perfect pitch: "Replace a $40K/yr hire with a $2,500 automation build"
 *
 * Signal quality: VERY HIGH — 6-10% DM reply rate on this angle vs 2-3% cold.
 *
 * Usage:
 *   node harness/linkedin-jobs-signal.js
 *   node harness/linkedin-jobs-signal.js --role "operations coordinator" --max-jobs 20
 *   node harness/linkedin-jobs-signal.js --role "virtual assistant"
 *   node harness/linkedin-jobs-signal.js --role "data entry"
 *   node harness/linkedin-jobs-signal.js --all-roles       # cycle through all signal roles
 *   node harness/linkedin-jobs-signal.js --dry-run
 *
 * Output: JSON array → stdout. Each item:
 *   { name, profileUrl, headline, jobTitle, companyName, jobUrl, engagementType: "job_signal" }
 * Errors → stderr.
 */

import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HARNESS_DIR = __dirname;

const CDP_URL     = process.env.CHROME_CDP_URL || 'http://localhost:9333';
const PROFILE_DIR = path.join(__dirname, '.chrome-linkedin-profile');
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const LOG_FILE    = path.join(HARNESS_DIR, 'linkedin-engagement-log.ndjson');

// Signal roles — companies hiring these need automation
const SIGNAL_ROLES = [
  'operations coordinator',
  'virtual assistant',
  'data entry specialist',
  'manual reporting analyst',
  'operations manager',
  'business operations',
  'workflow coordinator',
];

// ICP company filters — target software / SaaS companies, not enterprises
// We filter by company size signals in headline/description
const ICP_COMPANY_KEYWORDS = ['saas', 'software', 'tech', 'startup', 'ai', 'platform', 'app', 'digital'];
const ICP_TITLES_TO_FIND   = ['CEO', 'Founder', 'Co-Founder', 'CTO', 'Owner', 'President'];

// CLI args
const args = process.argv.slice(2);
function getArg(name, fallback = '') {
  const idx = args.indexOf(name);
  return (idx !== -1 && args[idx + 1] !== undefined) ? args[idx + 1] : fallback;
}
const ROLE       = getArg('--role', 'operations coordinator');
const MAX_JOBS   = parseInt(getArg('--max-jobs', '20'), 10);
const ALL_ROLES  = args.includes('--all-roles');
const DRY_RUN    = args.includes('--dry-run');

// Past week filter
const TIME_FILTER = 'r604800';  // LinkedIn: r604800 = past week, r86400 = past day

function err(msg) { process.stderr.write(`[jobs-signal] ${msg}\n`); }
function appendLog(obj) {
  try { fs.appendFileSync(LOG_FILE, JSON.stringify({ ...obj, ts: new Date().toISOString() }) + '\n'); } catch {}
}

// ── Browser setup ────────────────────────────────────────────────────────────
async function getPage() {
  let context = null;
  let browserForCDP = null;
  let usingCDP = false;

  try {
    browserForCDP = await chromium.connectOverCDP(CDP_URL, { timeout: 3000 });
    const contexts = browserForCDP.contexts();
    context = contexts[0] || await browserForCDP.newContext();
    usingCDP = true;
    err(`Connected to Chrome via CDP (${CDP_URL})`);
  } catch {
    err(`CDP unavailable — launching Chrome with persistent profile`);
  }

  if (!usingCDP) {
    fs.mkdirSync(PROFILE_DIR, { recursive: true });
    context = await chromium.launchPersistentContext(PROFILE_DIR, {
      headless: false,
      executablePath: CHROME_PATH,
      viewport: { width: 1280, height: 800 },
      args: ['--no-sandbox', '--disable-blink-features=AutomationControlled', '--disable-infobars'],
      ignoreDefaultArgs: ['--enable-automation'],
    });
  }

  const pages = context.pages();
  let page = pages.find(p => p.url().includes('linkedin.com')) || pages[0] || await context.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  return { page, context, browserForCDP, usingCDP };
}

// ── Scrape job listings for a given role ────────────────────────────────────
async function scrapeJobsForRole(page, role, maxJobs) {
  const searchUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(role)}&f_TPR=${TIME_FILTER}&f_WT=2,1`;
  err(`Searching jobs: "${role}" → ${searchUrl}`);

  await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2500);

  // Check login
  const loginState = await page.evaluate(() => {
    const p = window.location.pathname;
    if (p.startsWith('/login') || p.startsWith('/checkpoint')) return 'logged_out';
    return 'logged_in';
  });
  if (loginState === 'logged_out') {
    err('Not logged in');
    return [];
  }

  // Scroll to load listings
  for (let i = 0; i < 4; i++) {
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(400);
  }

  // Wait for job list
  await page.waitForSelector('.jobs-search__results-list li, .job-card-container', { timeout: 10000 })
    .catch(() => err('Job list not found — extracting what is visible'));

  // Extract job cards
  const jobData = await page.evaluate((max, signalRole) => {
    const jobs = [];
    const cards = document.querySelectorAll('.jobs-search__results-list li, .job-card-container, [data-job-id]');

    for (const card of cards) {
      if (jobs.length >= max) break;

      const titleEl = card.querySelector('.job-card-list__title, .base-search-card__title, a[href*="/jobs/"]');
      const companyEl = card.querySelector('.job-card-container__company-name, .base-search-card__subtitle, .job-card-list__company-name');
      const linkEl = card.querySelector('a[href*="/jobs/view/"]');

      if (!titleEl || !companyEl) continue;

      const jobTitle  = titleEl.innerText?.trim() || '';
      const companyName = companyEl.innerText?.trim() || '';
      const jobUrl    = linkEl?.href?.split('?')[0] || '';

      jobs.push({ jobTitle, companyName, jobUrl, signalRole });
    }
    return jobs;
  }, maxJobs, role);

  err(`  Found ${jobData.length} job listings for "${role}"`);
  return jobData;
}

// ── Visit a job listing and extract the hiring manager/poster ───────────────
async function extractHiringManager(page, job) {
  if (!job.jobUrl) return null;

  err(`  Visiting job: ${job.jobUrl}`);
  try {
    await page.goto(job.jobUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(2000);

    const prospect = await page.evaluate((jobInfo, icpTitles, icpCompanyKw) => {
      // 1. Try to find the "Meet the hiring team" section (LinkedIn shows this on some postings)
      const hiringSection = document.querySelector(
        '.hirer-card, .job-details-jobs-unified-top-card__hiring-manager, [data-view-name="hiring-manager"]'
      );

      if (hiringSection) {
        const link = hiringSection.querySelector('a[href*="/in/"]');
        if (link) {
          const profileUrl = link.href.split('?')[0];
          const nameEl = hiringSection.querySelector('.hirer-card__title, .actor-name, span[aria-hidden="true"]');
          const name = nameEl?.innerText?.trim() || link.innerText?.trim() || '';
          const headlineEl = hiringSection.querySelector('.hirer-card__description, [class*="subtitle"]');
          const headline = headlineEl?.innerText?.trim() || '';
          if (name && profileUrl.includes('/in/')) {
            return {
              name,
              profileUrl,
              headline,
              jobTitle: jobInfo.jobTitle,
              companyName: jobInfo.companyName,
              jobUrl: jobInfo.jobUrl,
              engagementType: 'job_signal',
              _hiringManagerFound: true,
            };
          }
        }
      }

      // 2. Check if this is a small company (ICP filter) by looking at employee count text
      const aboutSection = document.querySelector('.job-details-jobs-unified-top-card__company-info, .jobs-company__box');
      const aboutText = aboutSection?.innerText?.toLowerCase() || '';
      const isSmallCo = /1-10|11-50|51-200|employees/.test(aboutText);
      const isIcpIndustry = icpCompanyKw.some(kw => aboutText.includes(kw) || jobInfo.companyName.toLowerCase().includes(kw));

      // 3. Return company-level prospect (we'll people-search for founder separately)
      return {
        name: null,  // will be resolved via people search
        profileUrl: null,
        headline: null,
        jobTitle: jobInfo.jobTitle,
        companyName: jobInfo.companyName,
        jobUrl: jobInfo.jobUrl,
        engagementType: 'job_signal',
        _hiringManagerFound: false,
        _isSmallCo: isSmallCo,
        _isIcpIndustry: isIcpIndustry,
      };
    }, job, ICP_TITLES_TO_FIND, ICP_COMPANY_KEYWORDS);

    return prospect;
  } catch (e) {
    err(`  Error visiting ${job.jobUrl}: ${e.message}`);
    return null;
  }
}

// ── Resolve company → founder via LinkedIn people search ────────────────────
async function resolveFounderForCompany(page, companyName, jobUrl, jobTitle) {
  // Search: "[companyName] CEO" or "[companyName] Founder"
  const query = `${companyName} Founder OR CEO OR CTO`;
  const searchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(query)}&origin=GLOBAL_SEARCH_HEADER`;
  err(`  People search: "${query}"`);

  try {
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(2000);

    const results = await page.evaluate((max, jTitle, jUrl, coName) => {
      const out = [];
      const cards = document.querySelectorAll('[data-view-name="search-entity-result-universal-template"], .entity-result');
      for (const card of cards) {
        if (out.length >= 3) break;  // top 3 matches
        const link = card.querySelector('a[href*="/in/"]');
        if (!link) continue;
        const profileUrl = link.href.split('?')[0];
        const nameEl = card.querySelector('.entity-result__title-text span[aria-hidden="true"]');
        const name = nameEl?.innerText?.trim() || link.innerText?.trim() || '';
        const headlineEl = card.querySelector('.entity-result__primary-subtitle');
        const headline = headlineEl?.innerText?.trim() || '';
        const companyEl = card.querySelector('.entity-result__secondary-subtitle');
        const currentCompany = companyEl?.innerText?.trim() || '';

        // Filter: headline must contain CEO/Founder/CTO/Owner
        const isFounder = /CEO|Founder|Co-Founder|CTO|Owner|President/i.test(headline);
        // Current company should match (rough check)
        const companyMatch = currentCompany.toLowerCase().includes(coName.toLowerCase().slice(0, 5));

        if (name && profileUrl.includes('/in/') && isFounder) {
          out.push({
            name,
            profileUrl,
            headline,
            jobTitle: jTitle,
            companyName: coName,
            jobUrl: jUrl,
            engagementType: 'job_signal',
            _resolvedViaSearch: true,
            _companyMatch: companyMatch,
          });
        }
      }
      return out;
    }, 3, jobTitle, jobUrl, companyName);

    // Prefer company match, else take first result
    const best = results.find(r => r._companyMatch) || results[0] || null;
    if (best) err(`  Resolved: ${best.name} @ ${best.companyName}`);
    return best;
  } catch (e) {
    err(`  People search error: ${e.message}`);
    return null;
  }
}

// ── Process one role ─────────────────────────────────────────────────────────
async function processRole(page, role, maxJobs) {
  const jobs = await scrapeJobsForRole(page, role, maxJobs);
  const prospects = [];

  for (const job of jobs) {
    // Visit job page to try to find hiring manager
    const prospect = await extractHiringManager(page, job);
    if (!prospect) continue;

    if (prospect._hiringManagerFound && prospect.profileUrl) {
      // Direct hit — hiring manager is listed
      prospects.push(prospect);
    } else if (prospect._isSmallCo !== false || prospect._isIcpIndustry) {
      // Small/ICP company — search for founder
      await page.waitForTimeout(1000);
      const founder = await resolveFounderForCompany(page, job.companyName, job.jobUrl, job.jobTitle);
      if (founder) prospects.push(founder);
    }

    await page.waitForTimeout(1500);
  }

  appendLog({ role, jobs_found: jobs.length, prospects_resolved: prospects.length });
  err(`Role "${role}": ${jobs.length} jobs → ${prospects.length} prospects`);
  return prospects;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  if (DRY_RUN) {
    err('DRY RUN — no browser actions');
    process.stdout.write(JSON.stringify({
      dryRun: true,
      roles: ALL_ROLES ? SIGNAL_ROLES : [ROLE],
      maxJobs: MAX_JOBS,
    }));
    return;
  }

  const { page, context, browserForCDP, usingCDP } = await getPage();

  try {
    const roles = ALL_ROLES ? SIGNAL_ROLES : [ROLE];
    const allProspects = [];
    const seenProfiles = new Set();

    for (const role of roles) {
      const roleProspects = await processRole(page, role, MAX_JOBS);
      for (const p of roleProspects) {
        if (p.profileUrl && !seenProfiles.has(p.profileUrl)) {
          seenProfiles.add(p.profileUrl);
          allProspects.push(p);
        } else if (!p.profileUrl) {
          // No profileUrl yet — include company-level signals for manual review
          allProspects.push(p);
        }
      }
      if (roles.length > 1) await page.waitForTimeout(2000);
    }

    err(`Total unique prospects from job signals: ${allProspects.length}`);
    process.stdout.write(JSON.stringify(allProspects));

  } finally {
    if (!usingCDP && context) await context.close();
    if (browserForCDP) await browserForCDP.close();
  }
}

main().catch(e => {
  err(`Fatal: ${e.message}`);
  process.stdout.write(JSON.stringify({ error: e.message }));
  process.exit(1);
});
