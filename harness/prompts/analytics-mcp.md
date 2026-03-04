# Analytics MCP Server

## Project
/Users/isaiahdupree/Documents/Software/analytics-mcp

## Context
Performance data is scattered across four sources: Supabase table youtube_video_stats (YouTube analytics polled via google_setup.py), Supabase tables actp_twitter_feedback + actp_twitter_strategy (Twitter closed-loop engine), MPLite's publish_queue table (published items across all platforms), and the Blotato API (account-level post status). This batch creates a Node.js MCP server that surfaces cross-platform analytics to any agent — video stats, tweet performance, daily publish counts, top performers — all in one place. Supabase project: ivhfuhxorppptyuofbgq. SUPABASE_URL and SUPABASE_KEY (service role) env vars. BLOTATO_API_KEY env var.

## Instructions
- Implement each feature exactly as specified
- After EACH feature: run node --check server.js to confirm valid syntax
- After FEAT-007: run npm test to confirm all tests pass
- At the end: create a git commit with message "feat: analytics mcp server"
- Update harness/analytics-mcp-features.json after each: set passes=true, status=completed

---

## FEAT-001: Project scaffold

**Problem**: No analytics-mcp directory or server exists.

**Fix**:
1. Create /Users/isaiahdupree/Documents/Software/analytics-mcp/package.json: name "analytics-mcp", version "1.0.0", main "server.js", scripts: { "test": "node --test tests/server.test.js" }, dependencies: {}
2. Create /Users/isaiahdupree/Documents/Software/analytics-mcp/server.js with: const readline = require('readline'); const https = require('https'); const http = require('http');
3. Add config: const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ivhfuhxorppptyuofbgq.supabase.co'; const SUPABASE_KEY = process.env.SUPABASE_KEY; const BLOTATO_KEY = process.env.BLOTATO_API_KEY; if (!SUPABASE_KEY) throw new Error('SUPABASE_KEY env var required');
4. Add supabaseFetch(table, params='') async function: calls SUPABASE_URL + '/rest/v1/' + table + '?' + params with headers apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, Accept: 'application/json'. Uses built-in https. Returns parsed JSON array.
5. Add blotatoFetch(path, method='GET', body=null) async function: calls https://backend.blotato.com/v2 + path with header 'blotato-api-key': BLOTATO_KEY. Returns { status, data }.
6. Create /Users/isaiahdupree/Documents/Software/analytics-mcp/tests/server.test.js with placeholder test.
7. Create .gitignore: node_modules/

**Acceptance**: node --check /Users/isaiahdupree/Documents/Software/analytics-mcp/server.js exits 0.

---

## FEAT-002: analytics_youtube tool

**Problem**: No agent can query YouTube video performance without writing raw Supabase SQL.

**Fix**:
1. Implement async function analytics_youtube({ limit = 20, sort_by = 'views', min_views = 0 }). Valid sort_by values: views, watch_time_minutes, avg_view_duration_secs, likes, published_at. Call supabaseFetch('youtube_video_stats', 'select=video_id,title,views,likes,watch_time_minutes,avg_view_duration_secs,published_at,check_bucket&order=' + sort_by + '.desc&limit=' + limit). Filter client-side: rows where views >= min_views. Return { videos: filtered, count: filtered.length, sort_by, pulled_from: 'youtube_video_stats' }.
2. Add to TOOLS: { name: 'analytics_youtube', description: 'Get YouTube video performance stats from Supabase. Sorted by views by default. Includes watch time and average view duration.', inputSchema: { type: 'object', properties: { limit: { type: 'number', description: 'Max results, default 20' }, sort_by: { type: 'string', enum: ['views','watch_time_minutes','avg_view_duration_secs','likes','published_at'] }, min_views: { type: 'number' } } } }
3. Register in TOOL_HANDLERS.

**Acceptance**: Tool appears in tools/list.

---

## FEAT-003: analytics_twitter tool

**Problem**: Twitter feedback loop data (tweet performance + strategy) is inaccessible without knowing Supabase table schemas.

**Fix**:
1. Implement async function analytics_twitter({ niche, classification, limit = 20 }). Fetch from actp_twitter_feedback: supabaseFetch('actp_twitter_feedback', 'select=tweet_id,niche,hook_type,classification,metrics_1h,metrics_4h,metrics_24h,created_at&order=created_at.desc&limit=' + limit + (niche ? '&niche=eq.' + niche : '') + (classification ? '&classification=eq.' + classification : '')). In parallel, fetch latest strategy: supabaseFetch('actp_twitter_strategy', 'select=niche,winning_hooks,winning_topics,winning_formats,best_times,avg_engagement&order=created_at.desc&limit=5'). Return { tweets: feedbackRows, strategy_by_niche: strategyRows, filters: { niche, classification }, niches_available: ['ai_automation','saas_growth','content_creation','digital_marketing','creator_economy'] }.
2. Add to TOOLS: { name: 'analytics_twitter', description: 'Get Twitter tweet performance data + winning strategy patterns. Filter by niche or classification (viral/strong/average/weak/flop).', inputSchema: { type: 'object', properties: { niche: { type: 'string', enum: ['ai_automation','saas_growth','content_creation','digital_marketing','creator_economy'] }, classification: { type: 'string', enum: ['viral','strong','average','weak','flop'] }, limit: { type: 'number' } } } }
3. Register in TOOL_HANDLERS.

**Acceptance**: Tool appears in tools/list.

---

## FEAT-004: analytics_daily_summary tool

**Problem**: No single call gives today's publish counts across all platforms.

**Fix**:
1. Implement async function analytics_daily_summary(). Get today's date as YYYY-MM-DD. Fetch from MPLite publish_queue: supabaseFetch('publish_queue', 'select=platform,status,published_at&published_at=gte.' + today + 'T00:00:00Z'). Group by platform + status client-side. Also fetch from actp_organic_posts if accessible (same Supabase project): supabaseFetch('actp_organic_posts', 'select=platform,status,created_at&created_at=gte.' + today + 'T00:00:00Z'). Build summary: { date: today, by_platform: { instagram: { published: N, failed: N, queued: N }, tiktok: {...}, youtube: {...}, twitter: {...} }, total_published: N, total_queued: N, sources: ['publish_queue','actp_organic_posts'] }.
2. Add to TOOLS: { name: 'analytics_daily_summary', description: "Get today's publish counts by platform across MPLite queue and ACTP organic posts.", inputSchema: { type: 'object', properties: {} } }
3. Register in TOOL_HANDLERS.

**Acceptance**: Tool appears in tools/list. Returns today's date in response.

---

## FEAT-005: analytics_top_performers tool

**Problem**: Agents cannot identify which content performed best to replicate winning patterns.

**Fix**:
1. Implement async function analytics_top_performers({ platform, days = 30, metric = 'views', limit = 10 }). If platform === 'youtube' or !platform: query youtube_video_stats for top videos by metric (views, likes, watch_time_minutes) with published_at within last N days. If platform === 'twitter' or !platform: query actp_twitter_feedback where classification IN ('viral','strong') within last N days, sort by metrics_24h->likes desc. If platform === 'tiktok' or platform === 'instagram': query publish_queue where platform=platform and status=published within last N days (no engagement data yet — return post_ids with published_at). Aggregate all results into { platform_results: { youtube: [...], twitter: [...], tiktok: [...], instagram: [...] }, top_overall: [ top 3 across all platforms with source label ] }.
2. Add to TOOLS: { name: 'analytics_top_performers', description: 'Get top performing content across platforms for the last N days. Returns videos, tweets, and posts sorted by engagement.', inputSchema: { type: 'object', properties: { platform: { type: 'string', enum: ['youtube','twitter','tiktok','instagram'] }, days: { type: 'number', description: 'Lookback window in days, default 30' }, metric: { type: 'string', enum: ['views','likes','watch_time_minutes'], description: 'Sort metric for YouTube' }, limit: { type: 'number' } } } }
3. Register in TOOL_HANDLERS.

**Acceptance**: Tool appears in tools/list. Calling with no args returns all platforms.

---

## FEAT-006: analytics_publish_history and analytics_health tools

**Problem**: Agents cannot see recent publish history or verify analytics data sources are reachable.

**Fix**:
1. Implement async function analytics_publish_history({ platform, status = 'published', days = 7, limit = 50 }). Query publish_queue with platform filter (if provided), status filter, published_at >= (now - days). Return { items: rows.map(r => ({ id: r.id, platform: r.platform, caption: r.caption?.slice(0,80), published_at: r.published_at, platform_post_id: r.platform_post_id })), total: rows.length, days, platform }.
2. Add analytics_publish_history to TOOLS: { name: 'analytics_publish_history', description: 'Get recent publish history from MPLite queue. Filter by platform and status.', inputSchema: { type: 'object', properties: { platform: { type: 'string' }, status: { type: 'string', enum: ['published','failed','queued','scheduled'] }, days: { type: 'number' }, limit: { type: 'number' } } } }
3. Implement async function analytics_health(). Check Supabase connectivity: supabaseFetch('youtube_video_stats', 'select=count&limit=1') catch error. Check Blotato (if key set): blotatoFetch('/users/me/accounts') catch error. Return { supabase: { ok: boolean, error?: string }, blotato: { ok: boolean, configured: boolean, error?: string } }.
4. Add analytics_health to TOOLS: { name: 'analytics_health', description: 'Check that Supabase and Blotato API are reachable for analytics data.', inputSchema: { type: 'object', properties: {} } }
5. Register both in TOOL_HANDLERS.

**Acceptance**: Both tools appear in tools/list.

---

## FEAT-007: MCP stdio transport

**Problem**: Tools exist but no MCP protocol — Claude Code cannot connect.

**Fix**:
1. In server.js define const TOOLS = [] and const TOOL_HANDLERS = { analytics_youtube, analytics_twitter, analytics_daily_summary, analytics_top_performers, analytics_publish_history, analytics_health } BEFORE the readline setup.
2. Implement full MCP stdio transport: readline on stdin, parse JSON-RPC lines. Handle initialize → { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'analytics', version: '1.0.0' } }. Handle tools/list → { tools: TOOLS }. Handle tools/call → invoke handler, return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }, isError: true on throw. Handle notifications/initialized as no-op. Write all JSON-RPC responses as single lines to stdout.

**Acceptance**: echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1"}}}' | SUPABASE_KEY=test node server.js returns a line containing protocolVersion.

---

## FEAT-008: Tests

**Problem**: No tests — broken Supabase queries are undetectable.

**Fix**:
1. In /Users/isaiahdupree/Documents/Software/analytics-mcp/tests/server.test.js use node:test and node:assert.
2. Extract all non-HTTP logic (date math, groupBy, aggregation) into lib.js. server.js requires('./lib').
3. Test 'groupByPlatformStatus': create function groupByPlatformStatus(rows) in lib.js. Test with mock rows [{ platform: 'instagram', status: 'published' }, { platform: 'instagram', status: 'failed' }, { platform: 'tiktok', status: 'published' }]. Assert result.instagram.published === 1, result.instagram.failed === 1, result.tiktok.published === 1.
4. Test 'getDateDaysAgo': create function getDateDaysAgo(days) in lib.js returning ISO string. Assert getDateDaysAgo(0) starts with today's date YYYY-MM-DD, getDateDaysAgo(7) is 7 days earlier.
5. Test 'tool schema completeness': load TOOLS from lib.js, assert each has name, description, inputSchema.
6. Test 'SUPABASE_KEY guard': spawn child process without SUPABASE_KEY env, assert exit code 1.
7. Run npm test — all pass.

**Acceptance**: npm test exits 0 with at least 5 passing assertions.
