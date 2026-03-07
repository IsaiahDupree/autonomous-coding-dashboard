#!/usr/bin/env node
/**
 * research-to-publish.js — Research → Content → Publish Loop
 *
 * Reads today's Twitter research synthesis JSON, generates platform-optimized
 * content using Claude Haiku, queues to MPLite, optionally publishes a Medium
 * article, and reports completion via Telegram.
 *
 * Usage:
 *   node harness/research-to-publish.js              # run full pipeline
 *   node harness/research-to-publish.js --dry-run    # generate content, no network calls
 *   node harness/research-to-publish.js --date 2026-03-07
 *   node harness/research-to-publish.js --topics-only
 *   node harness/research-to-publish.js --medium-only
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Config ─────────────────────────────────────────────────────────────────
const ACTP_ENV       = '/Users/isaiahdupree/Documents/Software/actp-worker/.env';
const SYNTHESIS_DIR  = `${process.env.HOME}/Documents/twitter-research/synthesis`;
const STATE_FILE     = path.join(__dirname, 'research-to-publish-state.json');
const LOG_FILE       = path.join(__dirname, 'research-to-publish-log.ndjson');

const MPLITE_URL     = 'https://mediaposter-lite-isaiahduprees-projects.vercel.app/api/queue';
const BLOTATO_URL    = 'https://backend.blotato.com/v2/posts';
const SUPABASE_URL   = 'https://ivhfuhxorppptyuofbgq.supabase.co';

const BLOTATO_ACCOUNTS = { twitter: 571, instagram: 807, linkedin: 786, tiktok: 710 };

// ── CLI args ────────────────────────────────────────────────────────────────
const args       = process.argv.slice(2);
const DRY_RUN    = args.includes('--dry-run');
const TOPICS_ONLY = args.includes('--topics-only');
const MEDIUM_ONLY = args.includes('--medium-only');
const DATE_ARG   = (() => { const i = args.indexOf('--date'); return i !== -1 ? args[i + 1] : null; })();

// ── Env loader ──────────────────────────────────────────────────────────────
function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  fs.readFileSync(file, 'utf8').split('\n').forEach(line => {
    const m = line.match(/^([A-Z0-9_]+)=(.+)/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  });
}
loadEnv(ACTP_ENV);
loadEnv(`${process.env.HOME}/.env`);

// ── Logger ──────────────────────────────────────────────────────────────────
function log(msg, data = {}) {
  const entry = { ts: new Date().toISOString(), msg, ...data };
  console.log(`[rtp] ${msg}`);
  try { fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n'); } catch {}
}

function logError(msg, err) {
  console.error(`[rtp] ERROR: ${msg}`, err?.message || err);
  try { fs.appendFileSync(LOG_FILE, JSON.stringify({ ts: new Date().toISOString(), level: 'error', msg, error: String(err?.message || err) }) + '\n'); } catch {}
}

// ── Telegram notify ──────────────────────────────────────────────────────────
async function sendTelegram(text) {
  const token  = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId || DRY_RUN) { log(`[telegram skip] ${text.slice(0, 80)}`); return; }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (e) {
    logError('Telegram send failed', e);
  }
}

// ── State helpers ────────────────────────────────────────────────────────────
function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch { return {}; }
}
function saveState(s) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2));
}

// ── FEATURE 2: Synthesis Loader + Content Planner ───────────────────────────
function loadSynthesis(dateStr) {
  const dir = SYNTHESIS_DIR;
  let filePath = path.join(dir, `${dateStr}.json`);

  if (!fs.existsSync(filePath)) {
    log(`No synthesis for ${dateStr}, falling back to most recent`);
    if (!fs.existsSync(dir)) throw new Error(`Synthesis dir missing: ${dir}`);
    const files = fs.readdirSync(dir)
      .filter(f => f.endsWith('.json'))
      .sort()
      .reverse();
    if (!files.length) throw new Error('No synthesis files found');
    filePath = path.join(dir, files[0]);
    log(`Using: ${files[0]}`);
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function planContent(synthesis) {
  const topics = (synthesis.topTopics || synthesis.top_topics || [])
    .slice(0, 3);

  if (!topics.length) throw new Error('No topTopics in synthesis');

  const plan = topics.map((t, i) => ({
    topic: typeof t === 'string' ? t : (t.topic || t.name || String(t)),
    topicData: typeof t === 'object' ? t : { topic: t },
    formats: ['tweet_thread', 'linkedin', 'instagram', ...(i === 0 ? ['medium'] : [])],
    isTop: i === 0,
  }));

  const totalPieces = plan.reduce((acc, p) => acc + p.formats.length, 0);
  log(`Content plan: ${plan.length} topics x 3 platforms + 1 Medium = ${totalPieces} pieces`);

  return plan;
}

// ── FEATURE 3: AI Content Generator ─────────────────────────────────────────
const SYSTEM_PROMPT = `You are a B2B SaaS content strategist writing for software founders ($500K-$5M ARR). Write punchy, insight-driven content that demonstrates expertise in AI automation. No fluff. Hook-first. Always add one contrarian or non-obvious angle.`;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function templateTweets(topic) {
  return [
    `Most founders get AI automation wrong. Here's what actually works for ${topic}:`,
    `The real insight: focus on outcomes, not tools. When you build ${topic} right, you 10x output without hiring.`,
    `Want to implement this? Start with your biggest bottleneck. DM me "AUTOMATE" and I'll share our exact framework.`,
  ];
}

function templateLinkedin(topic) {
  return `The problem with ${topic} in 2026:\n\nFounders try to automate everything at once.\n\nThey fail.\n\nHere's what actually works:\n\n→ Start with one painful workflow\n→ Build one reliable automation\n→ Scale only what works\n\nThe contrarian take: fewer automations done well beats 20 half-built ones.\n\nWhat automation has had the biggest ROI for you?\n\n#AIAutomation #SaaS #OperationalEfficiency`;
}

function templateInstagram(topic) {
  return `The ${topic} playbook nobody talks about 👇\n\n• Start small, prove ROI first\n• Automate the boring stuff first\n• Build on what already works\n• Measure outputs, not activity\n• Iterate weekly, not quarterly\n\nThe real unlock? Combining AI with your existing workflows — not replacing them.\n\nSave this for your next strategy session.\n\n#AIAutomation #SaaSGrowth #StartupLife #FounderMindset #ContentCreation #DigitalMarketing #AITools #ProductivityHacks #BusinessGrowth #TechStartup #Automation #ScaleUp #B2BSaaS #FutureOfWork #BuildInPublic`;
}

function templateMedium(topic, toolsToWatch) {
  const tools = toolsToWatch?.slice(0, 3).join(', ') || 'Claude AI, N8n, Zapier';
  return {
    title: `The ${topic} Playbook: What Founders Getting It Right Have in Common`,
    body: `# The ${topic} Playbook: What Founders Getting It Right Have in Common

## The Problem Nobody Talks About

Most software founders approach ${topic} the same way: they buy the shiniest tool, try to automate everything at once, then wonder why nothing sticks.

The founders who win? They do the opposite.

## What the Data Actually Shows

After analyzing hundreds of automation implementations, a clear pattern emerges. Successful founders don't start with the tool — they start with the pain point.

The question isn't "what can AI automate?" It's "what's costing us the most time right now?"

## The Three-Step Framework

**Step 1: Identify the highest-leverage bottleneck**
Pick the one workflow that, if automated, would free up 5+ hours per week. Not the flashiest — the most painful.

**Step 2: Build one thing well**
Resist the urge to automate six things at once. Pick one. Make it reliable. Then document what worked.

**Step 3: Scale what's proven**
Only after your first automation runs for 30 days without babysitting do you add the next one.

## The Contrarian Take

The conventional wisdom says automate everything. The reality: over-automation creates new bottlenecks. Every automation is a system that can break.

The founders outperforming their peers in 2026 are running fewer, tighter automations — not more.

## Tools Worth Watching

${tools} — these are the platforms where the best implementations are happening right now.

## Your Next Move

Start with one workflow. Pick your biggest operational pain point. Build one automation. Run it for a month.

Then DM me what you built — I read every message.`,
  };
}

async function generateContent(plan, synthesis) {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const client = anthropicKey ? new Anthropic({ apiKey: anthropicKey }) : null;
  const toolsToWatch = synthesis.toolsToWatch || synthesis.tools_to_watch || [];
  const results = [];

  for (const item of plan) {
    const { topic, topicData } = item;
    const topicContext = JSON.stringify(topicData).slice(0, 500);
    log(`Generating content for: ${topic}`);
    const t0 = Date.now();

    let tweets, linkedin, instagram, medium;

    if (client) {
      try {
        // Tweet thread
        const twRes = await client.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 500,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: `Write a 3-tweet thread about: "${topic}". Context: ${topicContext}\n\nRules:\n- Each tweet under 280 chars\n- Tweet 1: hook\n- Tweet 2: insight\n- Tweet 3: CTA\n\nRespond with JSON: {"tweets": ["tweet1", "tweet2", "tweet3"]}` }],
        });
        const twText = twRes.content[0].text;
        const twJson = JSON.parse(twText.match(/\{[\s\S]*\}/)?.[0] || '{}');
        tweets = twJson.tweets?.length ? twJson.tweets.map(t => String(t).slice(0, 280)) : templateTweets(topic);
        await sleep(1000);

        // LinkedIn
        const liRes = await client.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 600,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: `Write a LinkedIn post about: "${topic}". Context: ${topicContext}\n\nRules:\n- Under 1300 chars\n- Structure: Problem → Insight → Takeaway → soft CTA\n- Line breaks for readability\n- Max 3 relevant hashtags\n\nRespond with just the post text.` }],
        });
        linkedin = liRes.content[0].text.slice(0, 1300);
        await sleep(1000);

        // Instagram
        const igRes = await client.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 700,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: `Write an Instagram caption about: "${topic}". Context: ${topicContext}\n\nRules:\n- Under 2200 chars\n- Hook line first\n- 3-5 bullet insights\n- CTA\n- End with 10-15 relevant hashtags\n\nRespond with just the caption text.` }],
        });
        instagram = igRes.content[0].text.slice(0, 2200);
        await sleep(1000);

        // Medium (top topic only)
        if (item.isTop) {
          const toolsList = toolsToWatch.slice(0, 3).join(', ') || 'Claude AI, N8n, Zapier';
          const mdRes = await client.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 1500,
            system: SYSTEM_PROMPT,
            messages: [{ role: 'user', content: `Write a Medium article (600-900 words) about: "${topic}". Context: ${topicContext}\n\nRules:\n- Markdown format\n- Title + 4-6 sections with ## headers\n- SEO-friendly\n- Include tool recommendations for: ${toolsList}\n- One contrarian angle\n\nRespond with: {"title": "...", "body": "full markdown article"}` }],
          });
          const mdText = mdRes.content[0].text;
          const mdJson = JSON.parse(mdText.match(/\{[\s\S]*\}/)?.[0] || '{}');
          medium = mdJson.title ? { title: mdJson.title, body: mdJson.body || mdText } : templateMedium(topic, toolsToWatch);
          await sleep(1000);
        }

        log(`Generated via Claude Haiku in ${Date.now() - t0}ms: ${topic}`);
      } catch (e) {
        logError(`Claude generation failed for ${topic}, using templates`, e);
        tweets = templateTweets(topic);
        linkedin = templateLinkedin(topic);
        instagram = templateInstagram(topic);
        if (item.isTop) medium = templateMedium(topic, toolsToWatch);
      }
    } else {
      log(`No ANTHROPIC_API_KEY — using template content for: ${topic}`);
      tweets = templateTweets(topic);
      linkedin = templateLinkedin(topic);
      instagram = templateInstagram(topic);
      if (item.isTop) medium = templateMedium(topic, toolsToWatch);
    }

    results.push({ topic, tweets, linkedin, instagram, medium });
  }

  return results;
}

// ── FEATURE 4: Platform Queue + Publish ─────────────────────────────────────
async function queueContent(generated, supabase, researchDate) {
  const blobKey = process.env.BLOTATO_API_KEY;
  const stats = { twitter: 0, linkedin: 0, instagram: 0, failed: 0 };

  // Base schedule times
  const now = new Date();
  let twOffset = 2, liOffset = 6, igOffset = 8;

  for (const item of generated) {
    const { topic, tweets, linkedin, instagram } = item;

    // Check idempotency
    if (!DRY_RUN && supabase) {
      const { data: existing } = await supabase
        .from('content_publish_log')
        .select('id')
        .eq('research_date', researchDate)
        .eq('topic', topic)
        .eq('platform', 'twitter')
        .maybeSingle();
      if (existing) { log(`Skipping already-queued topic: ${topic}`); continue; }
    }

    // Tweet thread
    try {
      const firstTweet = tweets[0];
      const twTime = new Date(now.getTime() + twOffset * 3600000).toISOString();

      if (!DRY_RUN) {
        // Publish first tweet immediately via Blotato
        if (blobKey) {
          const bloRes = await fetch(BLOTATO_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'blotato-api-key': blobKey },
            body: JSON.stringify({ account_id: BLOTATO_ACCOUNTS.twitter, text: firstTweet }),
          });
          const bloData = await bloRes.json().catch(() => ({}));
          const blobId = bloData?.id || bloData?.post_id || null;

          await supabase?.from('content_publish_log').insert({
            research_date: researchDate, content_type: 'tweet', platform: 'twitter',
            content_text: firstTweet, topic, blotato_post_id: String(blobId || ''), status: 'published', published_at: new Date().toISOString(),
          });
        }

        // Queue remaining tweets via MPLite
        for (let i = 1; i < tweets.length; i++) {
          const scheduled = new Date(now.getTime() + (twOffset + i * 0.5) * 3600000).toISOString();
          const mpRes = await fetch(MPLITE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ platform: 'twitter', content: tweets[i], scheduled_for: scheduled }),
          });
          const mpData = await mpRes.json().catch(() => ({}));
          await supabase?.from('content_publish_log').insert({
            research_date: researchDate, content_type: 'tweet', platform: 'twitter',
            content_text: tweets[i], topic, mplite_queue_id: String(mpData?.id || ''), status: 'queued',
          });
        }
      }

      log(`Queued twitter post for ${topic} at ${twTime}`);
      stats.twitter++;
      twOffset += 2;
    } catch (e) {
      logError(`Twitter queue failed for ${topic}`, e);
      stats.failed++;
      if (!DRY_RUN) await supabase?.from('content_publish_log').insert({
        research_date: researchDate, content_type: 'tweet', platform: 'twitter', topic, status: 'failed',
      });
    }

    // LinkedIn
    try {
      const liTime = new Date(now.getTime() + liOffset * 3600000).toISOString();

      if (!DRY_RUN) {
        const mpRes = await fetch(MPLITE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ platform: 'linkedin', content: linkedin, scheduled_for: liTime }),
        });
        const mpData = await mpRes.json().catch(() => ({}));
        await supabase?.from('content_publish_log').insert({
          research_date: researchDate, content_type: 'linkedin_post', platform: 'linkedin',
          content_text: linkedin, topic, mplite_queue_id: String(mpData?.id || ''), status: 'queued',
        });
      }

      log(`Queued linkedin post for ${topic} at ${liTime}`);
      stats.linkedin++;
      liOffset += 6;
    } catch (e) {
      logError(`LinkedIn queue failed for ${topic}`, e);
      stats.failed++;
    }

    // Instagram
    try {
      const igTime = new Date(now.getTime() + igOffset * 3600000).toISOString();

      if (!DRY_RUN) {
        const mpRes = await fetch(MPLITE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ platform: 'instagram', content: instagram, scheduled_for: igTime }),
        });
        const mpData = await mpRes.json().catch(() => ({}));
        await supabase?.from('content_publish_log').insert({
          research_date: researchDate, content_type: 'instagram_caption', platform: 'instagram',
          content_text: instagram, topic, mplite_queue_id: String(mpData?.id || ''), status: 'queued',
        });
      }

      log(`Queued instagram post for ${topic} at ${igTime}`);
      stats.instagram++;
      igOffset += 8;
    } catch (e) {
      logError(`Instagram queue failed for ${topic}`, e);
      stats.failed++;
    }
  }

  return stats;
}

// ── FEATURE 5: Medium Article Publisher ─────────────────────────────────────
async function publishMedium(mediumContent, topic, researchDate, supabase) {
  if (!mediumContent) return null;

  // Check idempotency
  if (!DRY_RUN && supabase) {
    const { data: existing } = await supabase
      .from('content_publish_log')
      .select('medium_url')
      .eq('research_date', researchDate)
      .eq('platform', 'medium')
      .maybeSingle();
    if (existing) {
      log(`Medium article already published for ${researchDate} — skipping`);
      return existing.medium_url;
    }
  }

  if (DRY_RUN) {
    log(`[dry-run] Would publish Medium: ${mediumContent.title}`);
    return null;
  }

  try {
    // Medium publishing via Safari MCP is not available in this script — log intent
    // In production this would call mcp__safari-medium__medium_publish
    log(`Medium publish: ${mediumContent.title} (Safari MCP required — skipping in script mode)`);
    const mediumUrl = null; // placeholder — real call happens via MCP in Claude session

    if (supabase) {
      await supabase.from('content_publish_log').insert({
        research_date: researchDate, content_type: 'medium_article', platform: 'medium',
        content_text: mediumContent.body, topic, medium_url: mediumUrl || '', status: mediumUrl ? 'published' : 'skipped',
        published_at: mediumUrl ? new Date().toISOString() : null,
      });
    }

    if (mediumUrl) {
      await sendTelegram(`Medium article published: ${mediumContent.title}\n${mediumUrl}`);
    }
    return mediumUrl;
  } catch (e) {
    logError('Medium publish failed (non-fatal)', e);
    return null;
  }
}

// ── FEATURE 6: Completion Report ─────────────────────────────────────────────
async function sendReport(generated, stats, mediumUrl, researchDate) {
  const topicNames = generated.map(g => g.topic).join(', ');
  const topMedium  = generated.find(g => g.medium);
  const totalPieces = stats.twitter + stats.linkedin + stats.instagram + (mediumUrl ? 1 : 0);

  const report = [
    `Content pipeline complete — ${researchDate}`,
    '',
    `Topics covered: ${topicNames}`,
    '',
    'Queued:',
    `• Twitter: ${stats.twitter} tweet threads`,
    `• LinkedIn: ${stats.linkedin} posts`,
    `• Instagram: ${stats.instagram} captions`,
    `• Medium: ${mediumUrl ? `${topMedium?.medium?.title} (${mediumUrl})` : 'skipped'}`,
    '',
    `Total pieces: ${totalPieces}`,
  ].join('\n');

  log(`\n${report}`);
  await sendTelegram(report);

  const state = {
    lastRunDate: researchDate,
    topicsProcessed: generated.map(g => g.topic),
    piecesQueued: totalPieces,
    mediumUrl: mediumUrl || null,
    updatedAt: new Date().toISOString(),
  };
  saveState(state);
}

// ── MAIN PIPELINE ─────────────────────────────────────────────────────────────
async function main() {
  const today = DATE_ARG || new Date().toISOString().slice(0, 10);
  log(`Starting research-to-publish pipeline${DRY_RUN ? ' (DRY RUN)' : ''} for ${today}`);

  // Init Supabase
  const supabase = (!DRY_RUN && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
    ? createClient(process.env.SUPABASE_URL || SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    : null;

  const stages = {};

  try {
    // Stage 1: Load synthesis
    let t0 = Date.now();
    log('Stage 1: Loading synthesis...');
    const synthesis = loadSynthesis(today);
    stages.loader = Date.now() - t0;
    log(`Synthesis loaded in ${stages.loader}ms`);

    // Stage 2: Plan content
    t0 = Date.now();
    log('Stage 2: Planning content...');
    const plan = planContent(synthesis);
    stages.planner = Date.now() - t0;

    if (TOPICS_ONLY) {
      console.log('\nPlanned topics:');
      plan.forEach((p, i) => console.log(`  ${i + 1}. ${p.topic} → ${p.formats.join(', ')}`));
      process.exit(0);
    }

    // Stage 3: Generate content
    t0 = Date.now();
    log('Stage 3: Generating content with Claude Haiku...');
    const generated = await generateContent(plan, synthesis);
    stages.generator = Date.now() - t0;
    log(`Content generated in ${stages.generator}ms`);

    if (MEDIUM_ONLY) {
      const topItem = generated.find(g => g.medium);
      if (topItem?.medium) {
        const medUrl = await publishMedium(topItem.medium, topItem.topic, today, supabase);
        log(`Medium result: ${medUrl || 'skipped'}`);
      }
      process.exit(0);
    }

    // Stage 4: Queue content
    t0 = Date.now();
    log('Stage 4: Queuing content to MPLite...');
    const stats = await queueContent(generated, supabase, today);
    stages.queue = Date.now() - t0;
    log(`Queued in ${stages.queue}ms — twitter:${stats.twitter} linkedin:${stats.linkedin} instagram:${stats.instagram} failed:${stats.failed}`);

    // Stage 5: Medium
    t0 = Date.now();
    log('Stage 5: Medium article...');
    const topItem = generated.find(g => g.medium);
    const mediumUrl = topItem?.medium ? await publishMedium(topItem.medium, topItem.topic, today, supabase) : null;
    stages.medium = Date.now() - t0;

    // Stage 6: Report
    t0 = Date.now();
    log('Stage 6: Sending completion report...');
    await sendReport(generated, stats, mediumUrl, today);
    stages.report = Date.now() - t0;

    log(`Pipeline complete. Stages: ${JSON.stringify(stages)}`);

  } catch (err) {
    logError(`Pipeline failed`, err);
    await sendTelegram(`Research-to-publish failed: ${err.message}`);
    process.exit(1);
  }
}

main();
