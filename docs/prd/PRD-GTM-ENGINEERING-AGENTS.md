# PRD: GTM Engineering Agents

## Source
Greg Isenberg x Cody Schneider (co-founder, Graph)
Video: https://www.youtube.com/watch?v=RB_M2mKiOcY
Concept: GTM Engineering - everything that used to require keyboard input is now delegated to an agent harness.

## Overview

7 production-ready automation workflows built as a TypeScript CLI toolkit.
Each workflow is a standalone runnable script loading API keys from a single .env file.
Target: /Users/isaiahdupree/Documents/Software/gtm-engineering-agents

## Core Philosophy

API-first software selection: choose tools based on API robustness, not UI quality.
Work backwards from the exact end state, then build the infrastructure to get there.
Run multiple Claude Code instances in parallel - each owns one workflow.

## Tool Stack

FACEBOOK_ADS_API_KEY - Facebook Graph API for ad management
INSTANTLY_API_KEY - Instantly AI cold email campaigns
PHANTOM_BUSTER_API_KEY - LinkedIn scraping + automation
RAFONIC_API_KEY - Podcast host / contact email scraping
MILLION_VERIFIER_API_KEY - Email validation before sending
RAILWAY_API_KEY - On-the-fly Postgres databases
PERPLEXITY_API_KEY - Research / web search
HUBSPOT_API_KEY - CRM
CLAY_API_KEY - Data enrichment pipelines
NOTION_API_KEY - Document creation / giveaway assets
LINKEDIN_API_KEY - LinkedIn messaging API
ANTHROPIC_API_KEY - Claude for personalization + SQL generation

## Workflows

### GTM-001: Workspace Scaffold
Single .env, typed ApiClients loader, shared logger, npm scripts per workflow.
Acceptance: npx tsc --noEmit passes, node dist/workflows/X.js --help works.

### GTM-002: LinkedIn Giveaway Auto-Responder
Input: LinkedIn post URL + keyword + Notion doc URL
Output: DMs sent to every commenter who used the keyword
Flow: scrape comments -> filter keyword -> DM Notion URL -> log progress
Resume-safe: persists replied set to gtm-data/linkedin-giveaway-{postId}-replied.json
Rate limiting: 2s between DMs

### GTM-003: Bulk Facebook Ad Generator
Input: template format + pain points file + count
Output: zip of N 1080x1080 PNG ad creatives + localhost:3210 preview UI
Flow: Perplexity generates N headline+body variations -> React components -> html2canvas PNGs -> jszip download
Preview UI: iframe renders each component, download-zip endpoint

### GTM-004: Podcast Cold Email Pipeline
Input: podcast category + Instantly campaign ID
Output: N verified podcast host emails enrolled in campaign
Flow: Rafonic scrape -> MillionVerifier validate -> Instantly enroll
Resume-safe: persists progress to gtm-data/podcast-pipeline-{category}.json

### GTM-005: On-the-Fly Railway Postgres Analysis
Input: data URL (CSV or JSON) + analysis questions file + output path
Output: JSON results file + Railway DB torn down
Flow: Railway API provision -> pg ingest -> Claude-generated SQL per question -> results -> teardown
Zero lingering cost: DB deleted on completion or SIGINT

### GTM-006: Facebook Ad Performance Optimizer Daemon
Input: account ID + campaign ID + interval hours + pause threshold + scale budget + top N
Output: runs forever; pauses low performers, clones top N into new scaled ad set each interval
Flow: poll metrics -> score -> pause losers -> create Winners-{date} adset -> clone top N
Graceful SIGINT shutdown with final summary log

### GTM-007: LinkedIn ICP Crawler + Auto Email
Input: job titles + company size range + industry + Instantly campaign ID
Output: N enriched + personalized leads enrolled in campaign
Flow: PhantomBuster LinkedIn scrape -> Rafonic email enrichment -> Claude 3-sentence personalization -> Instantly enroll
Dedup: never re-contacts same email across runs (gtm-data/icp-contacted.json)

## Feature List (7 features)

GTM-001: Workspace scaffold - package.json, .env.example, apiClient loader, logger
GTM-002: LinkedIn Giveaway Auto-Responder CLI script
GTM-003: Bulk Facebook Ad Generator with preview UI + PNG zip
GTM-004: Podcast Cold Email Pipeline (Rafonic + MillionVerifier + Instantly)
GTM-005: On-the-fly Railway Postgres analysis with auto-teardown
GTM-006: Facebook Ad Performance Optimizer 24/7 daemon
GTM-007: LinkedIn ICP Crawler + Auto Email (PhantomBuster + Rafonic + Instantly)

## Success Criteria

- npx tsc --noEmit passes cleanly for all 7 features
- Each workflow has a working CLI --help flag
- node dist/workflows/fb-ad-generator/index.js starts preview server on port 3210
- node dist/workflows/fb-optimizer.js runs one optimization cycle and logs summary
- All scripts are resume-safe (crash/restart does not re-send to already-contacted leads)
