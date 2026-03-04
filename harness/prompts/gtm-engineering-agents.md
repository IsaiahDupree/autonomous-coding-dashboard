# GTM Engineering Agents

## Project
/Users/isaiahdupree/Documents/Software/gtm-engineering-agents

## Context
Build 7 GTM engineering automation workflows based on Cody Schneider's Claude Code masterclass.
Each workflow is a runnable Node.js/TypeScript script with a CLI entry point.
All API keys are loaded from a single .env file. Source: https://www.youtube.com/watch?v=RB_M2mKiOcY

## Instructions
- Implement each feature exactly as specified
- After EACH feature: run npx tsc --noEmit from the package root
- At the end: run npm run build and create a git commit
- Update /Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness/gtm-engineering-agents-features.json after completing each feature - set passes: true, status: completed

---

## GTM-001: Workspace scaffold

**Problem**: No package exists at /Users/isaiahdupree/Documents/Software/gtm-engineering-agents

**Fix**:
1. Create package.json: name gtm-engineering-agents, type module, scripts: build (tsc), and one script per workflow (run:linkedin-giveaway, run:fb-ads, run:podcast-pipeline, run:railway-analysis, run:fb-optimizer, run:icp-crawler). Dependencies: axios, dotenv, jszip, express. DevDeps: typescript, @types/node, @types/express.
2. Create tsconfig.json: target ES2022, moduleResolution node16, outDir dist, strict true, include src/**/*.
3. Create .env.example with all 12 keys documented:
   FACEBOOK_ADS_API_KEY, FACEBOOK_ADS_ACCOUNT_ID, INSTANTLY_API_KEY, PHANTOM_BUSTER_API_KEY,
   RAFONIC_API_KEY, MILLION_VERIFIER_API_KEY, RAILWAY_API_KEY, PERPLEXITY_API_KEY,
   HUBSPOT_API_KEY, CLAY_API_KEY, NOTION_API_KEY, LINKEDIN_API_KEY
4. Create src/lib/api-client.ts: exports getEnv(key: string): string (throws if missing), and a typed ApiClients object that lazily returns pre-configured axios instances for each service using their base URLs and auth headers.
5. Create src/lib/logger.ts: simple timestamped console logger with log(msg), error(msg), success(msg).
6. Create src/index.ts that exports all workflow runner functions.

---

## GTM-002: LinkedIn Giveaway Auto-Responder

**Problem**: After posting a LinkedIn giveaway, hundreds of comments need individual DM replies - impossible manually.

**Fix**:
1. Create src/workflows/linkedin-giveaway.ts
2. Export async function runLinkedInGiveaway(config: { postUrl: string, keyword: string, notionDocUrl: string, maxReplies?: number }): Promise<{ replied: number, skipped: number, errors: number }>
3. Implementation:
   - GET LinkedIn post comments via LinkedIn API (v2/socialActions/{postUrn}/comments) paginating until all fetched
   - Filter comments where text.toLowerCase().includes(config.keyword.toLowerCase())
   - For each matching commenter, send a DM via LinkedIn messaging API (v2/messages) with the notionDocUrl
   - Track replied set in a local JSON file (gtm-data/linkedin-giveaway-{postId}-replied.json) to enable resume on re-run
   - Log each send: [GIVEAWAY] Replied to @{name} ({i}/{total})
4. Add CLI entry: when run with node dist/workflows/linkedin-giveaway.js --post-url=X --keyword=Y --notion-url=Z, calls runLinkedInGiveaway and prints summary
5. Handle rate limiting: add 2s delay between DMs

---

## GTM-003: Bulk Facebook Ad Generator

**Problem**: Creating 100 ad creative variations manually in Ads Manager takes hours.

**Fix**:
1. Create src/workflows/fb-ad-generator/ directory
2. Create src/workflows/fb-ad-generator/generator.ts:
   - Export async function generateAdVariations(config: { template: string, painPoints: string[], count: number, outputDir: string }): Promise<string[]>
   - For each pain point, use Perplexity API (POST https://api.perplexity.ai/chat/completions) to generate headline + body text variations
   - Returns array of variation objects: { headline: string, body: string, painPoint: string }
3. Create src/workflows/fb-ad-generator/react-template.ts:
   - Export function buildAdReactComponent(variation: AdVariation): string that returns a complete React component string (1080x1080px div with headline, body, branding)
   - The component uses inline styles only (no external dependencies)
4. Create src/workflows/fb-ad-generator/server.ts:
   - Express server on port 3210 that serves a preview UI
   - GET / returns HTML page listing all generated variations with rendered preview iframes
   - GET /ad/:id returns the React component HTML for a specific variation
   - POST /download-zip returns a zip of all variation HTML files (use jszip)
   - On server start, auto-opens browser to localhost:3210
5. Create src/workflows/fb-ad-generator/index.ts CLI entry: reads --template, --pain-points-file, --count flags, runs generateAdVariations, starts preview server

---

## GTM-004: Podcast Cold Email Pipeline

**Problem**: Booking podcast appearances requires manually finding hosts, verifying emails, and enrolling in campaigns.

**Fix**:
1. Create src/workflows/podcast-pipeline.ts
2. Export async function runPodcastPipeline(config: { category: string, campaignId: string, maxPodcasts?: number }): Promise<{ scraped: number, verified: number, enrolled: number }>
3. Implementation:
   - Step 1 - Scrape: POST to Rafonic API https://api.rafonic.com/v1/podcasts/search with { category, limit: maxPodcasts } - extract hostEmail, podcastName, hostName from response
   - Step 2 - Verify: for each email POST to MillionVerifier https://api.millionverifier.com/api/v3/verify with { email } - keep only result: valid
   - Step 3 - Enroll: for each verified email POST to Instantly API https://api.instantly.ai/api/v1/lead/add with { campaign_id: campaignId, email, first_name: hostName, custom_variables: { podcast_name: podcastName } }
   - Persist progress to gtm-data/podcast-pipeline-{category}.json (resume-safe)
   - Log each step with counts
4. CLI entry: node dist/workflows/podcast-pipeline.js --category=X --campaign-id=Y

---

## GTM-005: On-the-Fly Railway Postgres Analysis

**Problem**: Data analysis from external sources requires manual Excel work taking hours.

**Fix**:
1. Create src/workflows/railway-analysis.ts
2. Export async function runRailwayAnalysis(config: { dataUrl: string, analysisQuestions: string[], outputPath: string }): Promise<{ dbId: string, results: Record<string, unknown> }>
3. Implementation:
   - Step 1 - Provision: POST to Railway API https://backboard.railway.app/graphql/v2 to create a new Postgres service and get connection string
   - Step 2 - Ingest: fetch data from config.dataUrl (supports CSV via papaparse, JSON), connect to Railway Postgres via pg, create appropriate table, bulk insert rows
   - Step 3 - Analyze: for each analysisQuestion, call Claude API (claude-haiku-4-5-20251001) with the schema + question to generate a SQL query, execute it, return results
   - Step 4 - Output: write results as JSON to config.outputPath
   - Step 5 - Teardown: DELETE Railway service via API to avoid ongoing cost
   - Log each step with timing: [RAILWAY] Provisioned in Xs, [RAILWAY] Ingested N rows, [RAILWAY] Analysis complete, [RAILWAY] Torn down
4. CLI entry: node dist/workflows/railway-analysis.js --data-url=X --questions-file=Y --output=Z

---

## GTM-006: Facebook Ad Performance Optimizer Daemon

**Problem**: Manually monitoring ad performance and pausing/scaling requires constant attention.

**Fix**:
1. Create src/workflows/fb-optimizer.ts
2. Export async function runFbOptimizer(config: { accountId: string, campaignId: string, intervalHours: number, pauseThreshold: { metric: string, value: number }, scaleBudget: number, topN: number }): Promise<never>
3. Implementation as an infinite loop:
   - Fetch all active ads via Facebook Graph API GET /{campaignId}/ads?fields=id,name,insights{ctr,spend,actions,cost_per_result}
   - Score each ad: ads below config.pauseThreshold get status=PAUSED via POST /{adId}?status=PAUSED
   - Find top N performers by the metric
   - Create a new ad set Winners-{ISO date} via POST /{campaignId}/adsets with budget config.scaleBudget
   - For each top performer, duplicate ad into the new ad set via POST /{adId}/copies
   - Log summary: [OPTIMIZER] Paused: N ads, Scaled: N ads, New adset: {id}
   - Sleep for config.intervalHours * 3600 * 1000 ms
   - Loop forever
4. Graceful shutdown on SIGINT: log final summary
5. CLI entry: node dist/workflows/fb-optimizer.js --account-id=X --campaign-id=Y --interval=6 --pause-metric=ctr --pause-threshold=0.01 --scale-budget=500 --top-n=3

---

## GTM-007: LinkedIn ICP Crawler + Auto Email

**Problem**: Finding and contacting ICPs on LinkedIn requires manual searching, enrichment, and email writing.

**Fix**:
1. Create src/workflows/icp-crawler.ts
2. Export async function runIcpCrawler(config: { titles: string[], companySizeMin: number, companySizeMax: number, industry: string, campaignId: string, emailsPerRun?: number }): Promise<{ found: number, enriched: number, enrolled: number }>
3. Implementation:
   - Step 1 - Scrape: POST to PhantomBuster API https://api.phantombuster.com/api/v2/agents/launch to trigger LinkedIn Profile Scraper phantom with config.titles + industry + company size filter. Poll GET /agents/{agentId}/output until complete. Parse profile list from output.
   - Step 2 - Enrich: for each profile, POST to Rafonic https://api.rafonic.com/v1/enrich/email with { linkedin_url, full_name, company } to find business email. Skip if not found.
   - Step 3 - Personalize: for each enriched contact, call Claude API with their role, company, and industry to generate a 3-sentence personalized cold email opening.
   - Step 4 - Enroll: POST to Instantly AI /api/v1/lead/add with email, first_name, custom_variables including the personalized opening so Instantly can inject it into the campaign template.
   - Dedup against gtm-data/icp-contacted.json to never re-contact the same email
   - Log: [ICP] Found: N profiles, Enriched: N emails, Enrolled: N leads
4. CLI entry: node dist/workflows/icp-crawler.js --titles='CTO,VP Engineering' --industry=SaaS --campaign-id=X
