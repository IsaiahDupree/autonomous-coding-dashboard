#!/usr/bin/env node
/**
 * trend-engagement-poller.js
 *
 * Daemon / cron script that polls YouTube Analytics for all published
 * trend videos and updates `trend_video_posts` in Supabase.
 * Also generates AI improvement notes when a video has >100 views.
 *
 * Usage:
 *   node harness/trend-engagement-poller.js            # run once
 *   node harness/trend-engagement-poller.js --watch    # poll every 4h
 *   node harness/trend-engagement-poller.js --report   # print report + exit
 */

import { refreshEngagement, getEngagementReport } from './youtube-publisher.js';

const WATCH_MODE  = process.argv.includes('--watch');
const REPORT_MODE = process.argv.includes('--report');
const INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours

async function runOnce() {
  const ts = new Date().toISOString();
  console.log(`[${ts}] Refreshing engagement metrics...`);
  try {
    const { updated, errors } = await refreshEngagement();
    console.log(`  Updated: ${updated} | Errors: ${errors}`);
  } catch (e) {
    console.error('  Failed:', e.message);
  }
}

async function printReport() {
  const rows = await getEngagementReport();
  if (!rows.length) { console.log('No published videos yet.'); return; }

  console.log(`\n=== Trend Video Performance Report (${rows.length} videos) ===\n`);

  // Sort by engagement rate desc
  rows.sort((a, b) => (b.engagement_rate || 0) - (a.engagement_rate || 0));

  for (const r of rows) {
    const age = r.published_at ? Math.round((Date.now() - new Date(r.published_at)) / 864e5) : '?';
    console.log(`${r.format.toUpperCase()} | ${r.topic}`);
    console.log(`  Published: ${r.published_at?.slice(0, 10) || 'pending'} (${age}d ago)`);
    console.log(`  Views: ${r.views.toLocaleString()} | Likes: ${r.likes} | Comments: ${r.comments}`);
    console.log(`  Engagement: ${(r.engagement_rate || 0).toFixed(2)}% | CTR: ${(r.ctr || 0).toFixed(2)}% | Avg view: ${(r.avg_view_duration_pct || 0).toFixed(0)}%`);
    if (r.youtube_url) console.log(`  URL: ${r.youtube_url}`);
    if (r.improvement_notes) {
      console.log(`  Improvement notes:`);
      r.improvement_notes.split('\n').forEach(n => console.log(`    • ${n}`));
    }
    console.log();
  }

  // Summary stats
  const totalViews = rows.reduce((s, r) => s + (r.views || 0), 0);
  const avgEngage = rows.reduce((s, r) => s + (r.engagement_rate || 0), 0) / rows.length;
  const bestVideo = rows[0];

  console.log('─── Summary ───────────────────────');
  console.log(`Total views across all videos: ${totalViews.toLocaleString()}`);
  console.log(`Average engagement rate: ${avgEngage.toFixed(2)}%`);
  console.log(`Best performing: "${bestVideo?.topic}" (${(bestVideo?.engagement_rate || 0).toFixed(2)}% engagement)`);
  console.log();
}

if (REPORT_MODE) {
  await printReport();
} else if (WATCH_MODE) {
  console.log(`Engagement poller started — refreshing every ${INTERVAL_MS / 3600000}h`);
  await runOnce();
  setInterval(runOnce, INTERVAL_MS);
} else {
  await runOnce();
}
