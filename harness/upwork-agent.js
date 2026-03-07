#!/usr/bin/env node

/**
 * Upwork Autonomous Agent
 *
 * This agent:
 * 1. Scans Upwork for gigs matching keywords (Safari automation :3104)
 * 2. Scores feasibility (0-10)
 * 3. For high-scoring gigs: builds demo with Claude Code
 * 4. Pushes to GitHub, deploys to Vercel
 * 5. Sends proposal to Telegram for approval
 * 6. Auto-submits approved proposals
 *
 * Features: UW-001 through UW-013
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// File paths
const KEYWORDS_FILE = path.join(__dirname, 'upwork-keywords.json');
const QUEUE_FILE = path.join(__dirname, 'upwork-queue.json');
const BUILDER_PROMPT = path.join(__dirname, 'prompts', 'upwork-builder.md');

// Configuration
const SAFARI_UPWORK_PORT = 3104;
const SCAN_INTERVAL_HOURS = 2;
const FEASIBILITY_THRESHOLD = 7;
const GITHUB_ORG = 'isaiahdupree';
const VERCEL_ORG = 'isaiahduprees-projects';

/**
 * UW-001: Scan Upwork for gigs
 * Uses Safari automation service at :3104
 */
async function scanUpworkGigs() {
  console.log('[upwork-agent] Starting gig scan...');

  // TODO: Implement Safari automation call to :3104
  // Read keywords from upwork-keywords.json
  // Search Upwork for matching gigs
  // Return array of { gig_id, title, budget, description, client_history, url }

  return [];
}

/**
 * UW-002: Score gig feasibility (0-10)
 *
 * Scoring criteria:
 * - Landing page/website work: +3
 * - Has designs/UI: +2
 * - Has wireframes: +2
 * - Budget < $500: +1
 * - Repeat client: +2
 */
function scoreGig(gig) {
  let score = 0;

  const description = gig.description.toLowerCase();
  const title = gig.title.toLowerCase();

  // Landing page/website work
  if (description.includes('landing page') || description.includes('website') || title.includes('landing page')) {
    score += 3;
  }

  // Has designs
  if (description.includes('design') || description.includes('figma') || description.includes('mockup')) {
    score += 2;
  }

  // Has wireframes
  if (description.includes('wireframe') || description.includes('prototype')) {
    score += 2;
  }

  // Budget check
  const budgetMatch = gig.budget?.match(/\$?(\d+)/);
  if (budgetMatch) {
    const amount = parseInt(budgetMatch[1]);
    if (amount < 500) score += 1;
  }

  // Repeat client
  if (gig.client_history?.jobs_posted > 5) {
    score += 2;
  }

  console.log(`[scorer] ${gig.title}: ${score}/10`);
  return score;
}

/**
 * UW-003: Build demo project with Claude Code
 * Spawns run-harness-project.js with upwork-builder.md prompt
 */
async function buildDemo(gig) {
  const buildDir = `/tmp/upwork-${gig.gig_id}`;

  console.log(`[builder] Building demo for gig ${gig.gig_id} in ${buildDir}`);

  // TODO: Spawn Claude Code agent via run-harness-project.js
  // Pass gig description to upwork-builder.md prompt
  // Build in /tmp/upwork-{gig_id}/
  // Wait for completion

  return { success: false, buildDir };
}

/**
 * UW-004: Push to GitHub
 */
async function pushToGitHub(gig, buildDir) {
  console.log(`[github] Pushing ${gig.gig_id} to GitHub`);

  // TODO: git init, git add, git commit
  // Create repo: gh repo create ${GITHUB_ORG}/upwork-${gig.gig_id} --public
  // git push

  return `https://github.com/${GITHUB_ORG}/upwork-${gig.gig_id}`;
}

/**
 * UW-005: Deploy to Vercel
 */
async function deployToVercel(buildDir) {
  console.log(`[vercel] Deploying ${buildDir}`);

  // TODO: cd buildDir && npx vercel --yes --prod
  // Capture deployment URL from stdout

  return 'https://upwork-demo-placeholder.vercel.app';
}

/**
 * UW-006: Backup to Passport drive
 */
async function backupToPassport(gig, buildDir) {
  const passportPath = `/Volumes/My Passport/clients/upwork/${gig.gig_id}`;

  // Check if drive is mounted
  if (!fs.existsSync('/Volumes/My Passport')) {
    console.log('[backup] Passport drive not mounted, skipping backup');
    return false;
  }

  // TODO: cp -r buildDir passportPath

  console.log(`[backup] Backed up to ${passportPath}`);
  return true;
}

/**
 * UW-007: Generate proposal text
 */
function generateProposal(gig, demoUrl, githubUrl) {
  return `I already built this. Demo: ${demoUrl} | Code: ${githubUrl}. Can deliver in 48h.`;
}

/**
 * UW-008: Send to Telegram for approval
 */
async function sendToTelegram(queueEntry) {
  console.log(`[telegram] Sending gig ${queueEntry.gig_id} for approval`);

  // TODO: POST to Telegram bot API
  // Send message with gig details + demo URL
  // Include /approve_{id} and /skip_{id} buttons

  return true;
}

/**
 * UW-010: Load/save queue
 */
function loadQueue() {
  if (!fs.existsSync(QUEUE_FILE)) {
    return [];
  }
  return JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8'));
}

function saveQueue(queue) {
  fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2));
}

/**
 * Main pipeline
 */
async function runPipeline() {
  try {
    console.log('[upwork-agent] === Starting Upwork scan cycle ===');

    // UW-001: Scan gigs
    const gigs = await scanUpworkGigs();
    console.log(`[upwork-agent] Found ${gigs.length} gigs`);

    // UW-002: Score and filter
    const feasibleGigs = gigs
      .map(gig => ({ ...gig, score: scoreGig(gig) }))
      .filter(gig => gig.score >= FEASIBILITY_THRESHOLD);

    console.log(`[upwork-agent] ${feasibleGigs.length} gigs above threshold (${FEASIBILITY_THRESHOLD})`);

    // Load existing queue
    const queue = loadQueue();

    // Process each feasible gig
    for (const gig of feasibleGigs) {
      // Check if already processed
      if (queue.find(q => q.gig_id === gig.gig_id)) {
        console.log(`[upwork-agent] Gig ${gig.gig_id} already in queue, skipping`);
        continue;
      }

      // UW-003: Build demo
      const buildResult = await buildDemo(gig);
      if (!buildResult.success) {
        console.log(`[upwork-agent] Build failed for ${gig.gig_id}, skipping`);
        continue;
      }

      // UW-004: Push to GitHub
      const githubUrl = await pushToGitHub(gig, buildResult.buildDir);

      // UW-005: Deploy to Vercel
      const demoUrl = await deployToVercel(buildResult.buildDir);

      // UW-006: Backup to Passport
      await backupToPassport(gig, buildResult.buildDir);

      // UW-007: Generate proposal
      const proposalText = generateProposal(gig, demoUrl, githubUrl);

      // Create queue entry
      const queueEntry = {
        id: `uw-${Date.now()}`,
        gig_id: gig.gig_id,
        title: gig.title,
        budget: gig.budget,
        score: gig.score,
        demo_url: demoUrl,
        github_url: githubUrl,
        proposal_text: proposalText,
        status: 'pending_approval',
        created_at: new Date().toISOString()
      };

      // UW-008: Send to Telegram
      await sendToTelegram(queueEntry);

      // Add to queue
      queue.push(queueEntry);
      saveQueue(queue);

      console.log(`[upwork-agent] ✓ Queued gig ${gig.gig_id} for approval`);
    }

    console.log('[upwork-agent] === Scan cycle complete ===');

  } catch (error) {
    console.error('[upwork-agent] Error in pipeline:', error);
  }
}

// Run immediately, then every N hours
if (require.main === module) {
  const mode = process.argv[2];

  if (mode === '--once') {
    runPipeline().then(() => process.exit(0));
  } else {
    console.log(`[upwork-agent] Starting in continuous mode (scan every ${SCAN_INTERVAL_HOURS}h)`);
    runPipeline(); // Run immediately
    setInterval(runPipeline, SCAN_INTERVAL_HOURS * 60 * 60 * 1000);
  }
}

module.exports = { runPipeline, scoreGig, scanUpworkGigs };
