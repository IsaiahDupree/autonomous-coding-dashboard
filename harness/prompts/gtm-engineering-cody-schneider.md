# GTM Engineering Agent Stack — Claude Code Skill Prompt
**Based on:** Greg Isenberg × Cody Schneider — "Claude Code marketing masterclass"  
**Source:** https://www.youtube.com/watch?v=RB_M2mKiOcY&t=1188s  
**How to use:** Copy a prompt block below and paste it directly into a Claude Code session  
**Prerequisite:** Your `.env` file must have the relevant API keys for each workflow

---

## PROMPT 0 — Workspace Bootstrap (Run This First)

```
You are my GTM engineering agent. Your job is to help me build personal marketing automation software.

First, set up my agent workspace:

1. Create a folder structure at ./gtm-agents/ with these subfolders:
   - linkedin/
   - facebook-ads/
   - email-outreach/
   - data-analysis/
   - notion/
   - dashboard/

2. Create a .env.example file at the root with these keys (blank values):
   FACEBOOK_ADS_API_KEY=
   FACEBOOK_ADS_ACCOUNT_ID=
   INSTANTLY_API_KEY=
   INSTANTLY_CAMPAIGN_ID=
   PHANTOM_BUSTER_API_KEY=
   RAFONIC_API_KEY=
   MILLION_VERIFIER_API_KEY=
   RAILWAY_API_KEY=
   PERPLEXITY_API_KEY=
   HUBSPOT_API_KEY=
   NOTION_API_KEY=
   NOTION_DATABASE_ID=

3. Create a README.md explaining that this is a GTM engineering agent workspace.
   Each subfolder contains a specific automation workflow.
   All workflows read API keys from the root .env file.

Tell me when the workspace is ready, then wait for my next instruction.
```

---

## PROMPT 1 — LinkedIn Giveaway Auto-Responder

```
You are my LinkedIn automation agent.

Task: Build a script that automatically responds to every person who commented
a specific keyword on my LinkedIn post, sending them a giveaway asset.

Requirements:
- Read PHANTOM_BUSTER_API_KEY from .env
- Read NOTION_API_KEY from .env
- Input: LinkedIn post URL, trigger keyword, Notion doc URL to send
- Use Phantom Buster's "LinkedIn Post Commenters Export" phantom to fetch
  all comments from the post
- Filter only comments containing the trigger keyword
- For each match: send a LinkedIn DM with a personalized message that includes
  the Notion document link
- Track who has already been messaged in a local JSON file to avoid duplicates
- Log progress: "Messaged [NAME] at [TIME]"
- Run until all matching commenters have been messaged

Accept these inputs now:
1. LinkedIn post URL: [PASTE URL]
2. Trigger keyword: [PASTE KEYWORD]
3. Notion asset URL: [PASTE NOTION URL]

Build the script, then run it.
```

---

## PROMPT 2 — Bulk Facebook Ad Creative Generator

```
You are my Facebook ad creative agent.

Task: Build a bulk ad creative generator that produces 1080x1080 PNG ad images
from a template, using pain points I research from Reddit.

Step 1 — Research pain points:
- Use the Perplexity API (key in .env) to search Reddit for the top 20 pain
  points people in [MY NICHE] complain about
- Return them as a numbered list

Step 2 — Build the generator:
- Create a React app at ./facebook-ads/bulk-generator/
- Each ad is a React component (pure code, no external images)
- Ad dimensions: 1080x1080px
- Template format: [DESCRIBE YOUR FORMAT OR SAY "before/after split layout"]
- Each variation has: a headline (max 8 words) and body text (max 20 words)
  pulled from the pain points list
- Use html2canvas to render each React component to a PNG
- Build a preview UI showing all ad variations in a grid
- Add a "Download All as ZIP" button

Step 3 — Generate:
- Create 20 ad variations using the pain points from Step 1
- Show me the preview UI at localhost:3000

Install dependencies, build it, and run it.
My niche: [PASTE YOUR NICHE HERE]
```

---

## PROMPT 3 — Podcast Host Cold Email Pipeline

```
You are my outbound email automation agent.

Task: Build a pipeline that scrapes podcast host emails, verifies them,
and enrolls them in a cold email campaign on Instantly AI.

Pipeline:
1. Use Rafonic API (key: RAFONIC_API_KEY in .env) to search for podcasts
   in category: [PODCAST CATEGORY e.g. "marketing", "entrepreneurship"]
   - Fetch up to 500 podcast hosts with contact emails
   - Save raw results to ./email-outreach/raw-podcasts.json

2. Use Million Verifier API (key: MILLION_VERIFIER_API_KEY in .env) to
   validate each email
   - Keep only emails with status "valid" or "catch_all"
   - Save verified list to ./email-outreach/verified-podcasts.json

3. Use Instantly AI API (key: INSTANTLY_API_KEY in .env) to add each
   verified contact to campaign ID: [CAMPAIGN_ID]
   - Include first name, last name, podcast name as personalization variables
   - Skip any contacts already in the campaign

4. Print a summary: total scraped / total verified / total added to campaign

Run all 3 steps now.
```

---

## PROMPT 4 — On-the-Fly Data Analysis with Railway Postgres

```
You are my data analysis agent.

Task: Analyze data from [DATA SOURCE] using a temporary Railway Postgres database.

Steps:
1. Use Railway API (key: RAILWAY_API_KEY in .env) to create a new Postgres
   database called "analysis-[TODAYS-DATE]" in my Railway account

2. Load data from [DATA SOURCE / URL / FILE PATH] into the database:
   - Detect the schema automatically
   - Create appropriate tables
   - Import all records

3. Perform this analysis:
   [DESCRIBE WHAT YOU WANT TO KNOW - e.g.:
   "Show me the top 10 performing campaigns by CTR"
   "Which day of week has the highest engagement rate?"
   "Compare revenue by traffic source"]

4. Output results as:
   - A summary table in the terminal
   - A CSV file saved to ./data-analysis/results-[DATE].csv
   - Key insights as bullet points

5. Tear down the Railway database when done to avoid ongoing charges

Data source: [PASTE URL OR FILE PATH]
Analysis questions: [PASTE YOUR QUESTIONS]
```

---

## PROMPT 5 — Facebook Ad Performance Optimizer (Background Daemon)

```
You are my Facebook ads optimization agent.

Task: Build and run a background daemon that monitors my Facebook ad campaigns
and automatically optimizes performance.

Build a script at ./facebook-ads/optimizer.py that:

1. Every 6 hours, fetches all active ads from Facebook Ads API
   (credentials: FACEBOOK_ADS_API_KEY and FACEBOOK_ADS_ACCOUNT_ID in .env)
   for campaign: [CAMPAIGN_ID]

2. For each ad, calculates:
   - CTR (click-through rate)
   - CPC (cost per click)
   - ROAS (return on ad spend, if conversion data available)

3. Auto-pauses any ad where:
   - CTR < 0.5% after 1000+ impressions, OR
   - CPC > $[YOUR THRESHOLD] after $[SPEND] spent

4. When 3+ ads have been paused, takes the top 2 performers and:
   - Creates a new ad set called "Winners - [DATE]"
   - Sets budget to $[SCALE_BUDGET]/day
   - Duplicates the top ads into this new ad set

5. Logs every action to ./facebook-ads/optimizer-log.json and to a
   live dashboard at localhost:8080 showing:
   - Active ads count
   - Paused today count
   - Current winner ad set
   - Spend today vs budget

Run the daemon now. It should start immediately and continue running.
Campaign ID: [CAMPAIGN_ID]
Pause threshold CTR: 0.5%
Scale budget: $50/day
```

---

## PROMPT 6 — LinkedIn ICP Crawler + Personalized Cold Email

```
You are my LinkedIn prospecting agent.

Task: Build a background agent that continuously finds Ideal Customer Profile
contacts on LinkedIn, finds their emails, and enrolls them in cold outreach.

Build ./linkedin/icp-crawler.py that:

1. Uses Phantom Buster API (key: PHANTOM_BUSTER_API_KEY in .env) to run
   a LinkedIn Sales Navigator search for profiles matching:
   - Job titles: [LIST YOUR TARGET TITLES e.g. "Head of Marketing, VP Marketing, CMO"]
   - Company size: [e.g. "11-200 employees"]
   - Industry: [e.g. "SaaS, Software, Technology"]
   - Location: [e.g. "United States"]
   - Fetch 100 profiles per run

2. For each profile, uses Rafonic API to find their business email address

3. Writes a personalized 3-sentence cold email for each contact:
   - Sentence 1: Reference their specific role and company
   - Sentence 2: State a relevant problem you solve
   - Sentence 3: Simple CTA — 15-minute call this week?
   - Keep it under 75 words total

4. Enrolls each new contact in Instantly campaign: [CAMPAIGN_ID]
   with their personalized email as a custom variable

5. Saves all processed contacts to ./linkedin/contacted.json to prevent duplicates

6. Runs once every 24 hours automatically

7. Logs: "[TIME] Found [N] profiles / [N] emails found / [N] added to campaign"

Build and run it now.
ICP titles: [PASTE YOUR TARGET JOB TITLES]
Industry: [PASTE YOUR TARGET INDUSTRY]
Instantly campaign ID: [PASTE CAMPAIGN ID]
```

---

## PROMPT 7 — Notion Giveaway Document Generator

```
You are my content creation agent.

Task: Create a professional Notion giveaway document for a lead generation campaign.

Using the Notion API (key: NOTION_API_KEY in .env):

1. Create a new page in my Notion workspace
2. Structure it as a giveaway asset with:
   - Cover section: bold title + 1-sentence value prop
   - "What you'll get" section: 3-5 bullet points
   - Main content: [FRAMEWORK / CHECKLIST / TEMPLATE]
   - CTA section at the bottom: follow [SOCIAL HANDLE] for more

3. Format it cleanly — use Notion headers (H1/H2), bullet lists, callout blocks
   for key insights, and dividers between sections

4. When done, return the shareable Notion page URL

Giveaway topic: [PASTE TOPIC e.g. "Email triage framework for founders"]
Key points to include: [PASTE 5-10 BULLET POINTS OF CONTENT]
Your social handle to promote: [PASTE HANDLE]
```

---

## PROMPT 8 — Agent Swarm Orchestrator

```
You are my GTM agent swarm orchestrator.

I want to run multiple marketing automation workflows simultaneously.
Set up an orchestrator that manages these parallel agents:

Agents to spawn:
1. linkedin-responder — watches for new LinkedIn comments matching keywords
2. ad-optimizer — monitors Facebook ads every 6 hours
3. icp-crawler — runs LinkedIn prospecting daily
4. email-pipeline — processes any new contacts through verify → enroll

Build ./dashboard/orchestrator.py that:

1. Starts each agent as a background subprocess
2. Monitors heartbeat from each (ping every 60s)
3. Restarts any agent that goes silent for 5+ minutes
4. Exposes a status dashboard at localhost:9000 showing:
   - Each agent: name / status (running/stopped/error) / last action / uptime
   - Total actions taken today per agent
   - Any error logs

5. Sends a daily Slack/email summary at 9AM with what each agent accomplished

Build the orchestrator and start all agents now.
```

---

## PROMPT 9 — Competitive Ad Research Tool

```
You are my ad research agent.

Task: Analyze competitor ad creatives from Facebook Ads Library to extract
winning formats I can use as templates.

Steps:
1. Use a headless browser (Playwright) to scrape Facebook Ads Library
   at https://www.facebook.com/ads/library/
   - Search for: [COMPETITOR NAME or KEYWORD]
   - Collect the first 50 active ads
   - For each ad capture: headline, body text, CTA button, format (image/video/carousel)

2. Analyze patterns:
   - Most common headline structures (question / stat / how-to / before-after)
   - Most common body text length
   - Most common CTA buttons
   - Recurring pain point themes

3. Output a report at ./facebook-ads/competitor-analysis-[DATE].md with:
   - Top 5 headline templates (fill-in-the-blank format)
   - Top 3 ad body structures
   - Recommended CTA based on what's most used
   - 10 specific ad copy angles I should test

Competitor / keyword to research: [PASTE COMPETITOR OR NICHE KEYWORD]
```

---

## PROMPT 10 — Full GTM Stack Health Check

```
You are my GTM stack monitoring agent.

Task: Run a health check on my entire GTM automation stack.

Check each of these and report status (✅ working / ⚠️ degraded / ❌ down):

1. Facebook Ads API — call /me endpoint with FACEBOOK_ADS_API_KEY
2. Instantly AI API — call /api/v1/authenticate with INSTANTLY_API_KEY
3. Phantom Buster API — call /api/v2/users/me with PHANTOM_BUSTER_API_KEY
4. Rafonic API — call health endpoint with RAFONIC_API_KEY
5. Million Verifier API — call /verify with a test email
6. Railway API — list projects with RAILWAY_API_KEY
7. Notion API — call /v1/users/me with NOTION_API_KEY
8. Perplexity API — send a test query with PERPLEXITY_API_KEY

For any ❌ or ⚠️ APIs: suggest the most likely fix (expired key, wrong endpoint, etc.)

Print a clean status table when done.
```

---

## Key Principles to Give Claude Code as Context

Paste this at the start of any session to prime Claude Code with Cody's philosophy:

```
You are my GTM engineering agent operating from a terminal.

Working principles:
- Everything I used to do manually with a keyboard, you now do for me
- I will describe the end state I want; you figure out the implementation
- API access is in .env — use it to act on my behalf across all services
- Prefer building small, specific tools over one giant system
- Build on-the-fly: spin up temporary databases/UIs as needed, tear them down when done
- Run things in the background — I'll check back on you
- When you have multiple tasks, ask me if I want them run in parallel (separate windows)
- Log everything: I need to see what you did and what the results were
- Domain knowledge note: I will provide the specific vocabulary for my niche —
  use my exact language when writing copy or outreach
- Software selection: always prefer tools with robust APIs over nice UIs
```
