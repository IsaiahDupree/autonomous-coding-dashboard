# PRD-010: ACTP End-to-End Pipeline Completion

## Project
- **Repos**: ContentLite, GenLite, MetricsLite, actp-worker
- **PRD**: /docs/prd/PRD-010-ACTP-END-TO-END-PIPELINE.md
- **Priority**: P0 (CRITICAL)

## Context

ACTP is a 10-service distributed system. Cloud services (ContentLite, GenLite, MetricsLite, etc.) are deployed to Vercel but are **scaffolds with no real implementation**. The actp-worker (Python daemon) is fully built with 17 executors and 121 topics. The gap is the cloud services need real Claude/Anthropic implementations.

### Service Locations
- ContentLite: /Users/isaiahdupree/Documents/Software/contentlite/
- GenLite: /Users/isaiahdupree/Documents/Software/genlite/
- MetricsLite: /Users/isaiahdupree/Documents/Software/metricslite/
- actp-worker: /Users/isaiahdupree/Documents/Software/actp-worker/

### Shared Supabase: ivhfuhxorppptyuofbgq

## Task

Implement real functionality in the scaffold services:

### ContentLite (HIGHEST PRIORITY)
1. Install `@anthropic-ai/sdk` 
2. Implement `app/api/generate/from-blueprint/route.ts`:
   - Accept blueprint JSON (hook_type, format, topic, length, cta_pattern)
   - Call Claude Haiku to generate video script + captions
   - Return structured JSON with script, shot_list, captions
3. Implement `app/api/generate/tweets/route.ts`:
   - Accept niche + strategy + count
   - Generate optimized tweets using Claude
   - Return array of tweet objects
4. Implement `app/api/review/route.ts`:
   - 7-dimension rubric scoring (hook, relevance, clarity, CTA, originality, platform-fit, compliance)
   - Weighted average score, APPROVE/REVISE/REJECT decision
   - Store in `actp_content_reviews` table

### GenLite
1. Implement `app/api/jobs/route.ts` POST — insert job into `actp_gen_jobs`
2. Implement `app/api/cron/process-jobs/route.ts` — find pending, mark claimed
3. Implement `app/api/jobs/[id]/complete/route.ts` — mark succeeded with video_url

### MetricsLite
1. Implement `app/api/scores/route.ts` — engagement scoring formula
2. Implement `app/api/winners/route.ts` — top N posts by score
3. Implement `app/api/timing/route.ts` — day×hour engagement matrix

## Environment Variables Needed
```
ANTHROPIC_API_KEY=sk-ant-...
SUPABASE_URL=https://ivhfuhxorppptyuofbgq.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
API_KEY=... (service auth key)
```

## Testing
- Each service has vitest config — run `npm test` in each
- Verify via curl: `curl -X POST .../api/generate/tweets -d '{"niche":"ai_automation","count":3}'`
- End-to-end: trigger `research-to-blotato` workflow via Workflow Engine

## Constraints
- Use Claude Haiku for all generation (cheap: ~$0.001 per call)
- All services follow same pattern: Next.js 16.1.6, Supabase client, API key auth
- Do NOT break existing API routes — only add real implementations behind them
- Push to GitHub after each service is complete (auto-deploys to Vercel)
