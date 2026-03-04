# GTM Engineering with Claude Code — Research Notes
**Source:** https://www.youtube.com/watch?v=RB_M2mKiOcY&t=1188s  
**Guest:** Cody Schneider (co-founder, Graph)  
**Host:** Greg Isenberg  
**Duration:** 54 minutes  
**Extracted:** Auto-transcript analysis

---

## Core Concept: GTM Engineering

GTM Engineering was coined by **clay.com** to describe cascading data-enrichment workflows for outbound sales. It has evolved into something broader: **everything that used to be "middle work" — anything requiring keyboard input — is now delegated to an agent harness.**

> "My job suddenly turns into: I have ideas, I pass them to Claude Code, and I polish the end product. It enables me to do things at scale that were previously impossible."

The mental model shift:
- **Before:** Do work → keyboard → output
- **After:** Have idea → voice/prompt → Claude Code → polish output

---

## Tool Stack (Full List)

| Tool | Purpose | API? |
|------|---------|------|
| **Claude Code** | Primary agent harness | Yes (Claude) |
| **Phantom Buster** | LinkedIn scraping & automation | Yes |
| **Instantly AI** | Cold email campaigns | Yes |
| **Rafonic** | Podcast host / contact email scraping | Yes |
| **Million Verifier** | Email validation before sending | Yes |
| **Railway.com** | On-the-fly Postgres databases | Yes |
| **Facebook Ads API** | Bulk ad creation, monitoring, optimization | Yes |
| **Facebook Ads Library** | Competitor ad creative research | No (web) |
| **Perplexity API** | Research / web search | Yes |
| **HubSpot API** | CRM | Yes |
| **Clay.com** | Data enrichment pipelines | Yes |
| **Intercom API** | Customer messaging | Yes |
| **SendGrid API** | Transactional email | Yes |
| **Notion API** | Document creation / giveaway assets | Yes |
| **Reddit** | Pain point research for ad copy | Web |
| **Super Whisper** | Voice-to-text for dictating Claude prompts | macOS |
| **HTML to Canvas** | Convert React components → downloadable PNG | npm |
| **Graph MCP** | Live data feed from ad platforms to data warehouse | Custom |

---

## Setup: The Agent Workspace

### Step 1 — Create your agent folder
Create a root folder you live out of for all agent work. Cody's is: `Graph Growth Agents/`

### Step 2 — .env file (central API key store)
Every API you interact with daily goes in a single `.env` file. This is how Claude Code gets access to act on your behalf.

```
FACEBOOK_ADS_API_KEY=
INSTANTLY_API_KEY=
PHANTOM_BUSTER_API_KEY=
RAFONIC_API_KEY=
MILLION_VERIFIER_API_KEY=
RAILWAY_API_KEY=
PERPLEXITY_API_KEY=
HUBSPOT_API_KEY=
CLAY_API_KEY=
INTERCOM_API_KEY=
SENDGRID_API_KEY=
NOTION_API_KEY=
```

**Philosophy:** Choose software based on **API robustness**, not UI quality. When you live in a terminal using MCPs to talk to LLMs, the UI is the nice-to-have. The API is the product.

> "Sam Altman said every company is going to be an API company. I fully align with this."

### Step 3 — Install Super Whisper
Voice-to-text for dictating tasks to Claude Code without typing. Critical for speed.

### Step 4 — Install Claude Code front-end design skill
Improves UI output quality when building dashboards and ad creative.

---

## Workflow 1: LinkedIn Giveaway Auto-Responder

**Use case:** You post a giveaway on LinkedIn ("comment TRIAGE to get this email framework"). Hundreds of people comment. Claude Code replies to every single one automatically.

**How it works:**
1. Write giveaway asset in Notion (template doc)
2. Publish LinkedIn post asking people to comment a keyword
3. Run Claude Code agent: provide LinkedIn post URL + Notion doc URL
4. Agent uses LinkedIn via browser automation (Chrome extension) to iterate through all comments and DM the asset to each commenter
5. Let it run in the background while you work on other things

**Input to Claude Code:**
```
Run the LinkedIn respond software. 
The keyword to look for is: [KEYWORD]
LinkedIn post URL: [URL]
Notion document to send: [URL]
Start from most recent comments and work backwards.
```

---

## Workflow 2: Bulk Facebook Ad Generator

**Use case:** Generate 100 unique Facebook ad creatives programmatically, download as PNG files, bulk upload to Facebook Ads Manager.

**How it works:**
1. Go to Facebook Ads Library — find a competitor ad format you like (e.g. "before/after" format)
2. Give Claude Code that format as a template
3. Scrape Reddit for pain points your audience talks about in your niche
4. Claude Code generates N variations of ad copy (headline + body text) from those pain points
5. Each variation is rendered as a **React component** (pure React, no images unless specified)
6. `html-to-canvas` converts each React component to a 1080x1080 PNG
7. Output: zip file of all PNG ad creatives + a visual preview UI to review them

**Tech stack:**
- React components (all text-based, fully coded — no external image assets)
- `html2canvas` npm package for PNG conversion
- Form-based UI to input variations + preview before download

**Input to Claude Code:**
```
Create a bulk Facebook ad generator.
- Image size: 1080x1080px
- Template format: [describe or paste example]
- Build a React component for each ad variation
- Include a UI so I can visually preview the creative
- Use html2canvas to convert React components to downloadable PNGs
- Output as a zip file download
- Generate [N] variations using these pain points: [list from Reddit]
- Ask me questions if you need clarification
```

---

## Workflow 3: Podcast Host Cold Email Pipeline

**Use case:** Scrape every podcast in a category, find host emails, verify them, enroll in cold email campaign to get booked as a guest. Fully automated.

**Pipeline:**
1. **Rafonic** → scrape all podcasts in target category → extract host contact emails
2. **Million Verifier** → validate/verify each email (removes bounces before sending)
3. **Instantly AI** → enroll verified emails into a cold email campaign sequence

**Input to Claude Code:**
```
You have the Rafonic API key in .env.
Build a script that:
1. Scrapes podcast host emails from Rafonic for category: [CATEGORY]
2. Sends each email to Million Verifier API to verify
3. Adds verified emails to Instantly AI campaign ID: [CAMPAIGN_ID]
Run it now.
```

**Result Cody reported:** Better performing outreach than expected. Agent handles replies and books podcast appearances automatically.

---

## Workflow 4: On-the-Fly Data Analysis with Railway Postgres

**Use case:** Any data analysis task — previously required Excel + pivot tables (5 hours). Now done in 20-30 minutes.

**How it works:**
1. Get raw data from any URL or export
2. Spin up a **Railway.com Postgres database on the fly** via Railway API
3. Claude Code pushes all data into that database
4. Analyze data collaboratively with Claude in the same session
5. Push outputs to wherever you want (Sheets, Notion, Slack, etc.)
6. **Spin the Railway database down** when done — no ongoing cost

> "On-the-fly UIs, on-the-fly databases, on-the-fly software is going to become the standard for people working at the forefront of this."

**Input to Claude Code:**
```
I need to analyze [DATA SOURCE/URL].
Using the Railway API key in .env:
1. Create a new Postgres database on Railway
2. Import all data from [SOURCE] into appropriate tables
3. Analyze: [ANALYSIS QUESTIONS]
4. Output results to [DESTINATION]
5. Tear down the Railway database when complete
```

---

## Workflow 5: Facebook Ad Performance Optimizer

**Use case:** Continuously monitor live Facebook ad campaigns, automatically pause low performers, automatically scale budget on winners.

**How it works:**
1. Agent polls Facebook Ads API for performance metrics
2. Classifies ads: high performer / low performer based on your thresholds
3. Auto-pauses ads below threshold
4. Moves top-performing ads into a new ad set with dedicated scaled budget
5. Runs 24/7 in the background

**Input to Claude Code:**
```
Using the Facebook Ads API key in .env:
Build an ad optimizer that:
1. Fetches all active ads in account [ACCOUNT_ID] / campaign [CAMPAIGN_ID]
2. Every [INTERVAL] hours, checks performance metrics (CTR, ROAS, CPC)
3. Pauses any ad with [METRIC] below [THRESHOLD]
4. Creates a new ad set "Winners - [DATE]" with budget $[AMOUNT]
5. Duplicates the top [N] performing ads into that ad set
6. Logs all actions to a dashboard at localhost:[PORT]
Run as a background daemon.
```

---

## Workflow 6: Notion Giveaway Document Generator

**Use case:** Quickly produce professional Notion giveaway docs for lead generation campaigns. Agent uses your existing repo structure as a template.

**Input to Claude Code:**
```
Create a Notion document using the Notion API key in .env.
Base it on the giveaway document structure already in this repo.
Content for this new giveaway:
- Topic: [TOPIC]
- Asset type: [CHECKLIST / FRAMEWORK / TEMPLATE]
- Key points to include: [CONTEXT]
Match the style and format of existing giveaway docs in [REPO_PATH].
```

---

## Workflow 7: LinkedIn ICP Crawler + Auto Email

**Use case:** Continuously crawl LinkedIn for Ideal Customer Profile matches, enrich their data, write personalized cold emails, send via Instantly.

**How it works:**
1. Agent scrapes LinkedIn via Phantom Buster for profiles matching ICP criteria
2. Enriches each profile (company data, email via Clay/Rafonic)
3. Writes a personalized email for each contact based on their profile
4. Enrolls them in Instantly AI cold email sequence
5. Runs continuously in the background

**Input to Claude Code:**
```
Using Phantom Buster API key and Instantly API key in .env:
Build a background LinkedIn ICP crawler that:
1. Uses Phantom Buster to scrape LinkedIn profiles matching:
   - Title: [JOB TITLES]
   - Company size: [RANGE]
   - Industry: [INDUSTRY]
2. For each profile, use [Clay/Rafonic] API to find their business email
3. Write a personalized 3-sentence cold email referencing their specific role/company
4. Add to Instantly campaign: [CAMPAIGN_ID]
5. Run continuously, deduplicate against already-contacted list
6. Log stats: profiles found / emails found / emails sent
```

---

## Running Multiple Claude Code Instances Simultaneously

Cody runs **10 Claude Code instances in parallel** — each in its own terminal window/folder, each working on a different task. While one is writing LinkedIn replies, another is building the ad generator, another is running the podcast pipeline.

**Mental model:** You are the manager. Claude Code instances are your team running in parallel. Your job is to:
1. Start each instance with a clear task
2. Briefly monitor that it's on the right path
3. Let it run and move to the next task
4. Come back and polish the output

**Practical setup:**
- Each project/task has its own subfolder inside your agents root
- Open a new terminal tab → `cd agents/[project]` → `claude` → give task
- Repeat for each parallel task

---

## Key Principles from Cody

### 1. API-First Software Selection
> "Salesforce, even though it's historically clunkier, is actually better for this AI foundation because it has a more robust API."

When evaluating any SaaS tool now: **Does it have a robust API?** That's the primary criterion. The UI is secondary.

### 2. Domain Expertise × Vocabulary = Competitive Moat
The person who can most precisely describe what they want gets the best output. Technical vocabulary matters enormously:
- A graphic designer of 20 years describing an ad texture → one-shots the result
- Generic description → terrible result

> "If you have the vocabulary across 6 things and can express what you need — that changes the entire system."

### 3. Work Backwards from the Final Product
Don't start with "how do I build this?" Start with "what is the exact end state I want?" Then work backwards to the infrastructure needed.

### 4. Agent Swarms Architecture
- **Leaf agents:** Do one specific job (LinkedIn scraper, email writer, ad monitor)
- **Orchestrator agent:** Manages the whole system, routes work to leaf agents
- Everything runs in the background 24/7

### 5. On-the-Fly Everything
- **On-the-fly UI:** Build a dashboard for this exact task → delete it when done
- **On-the-fly database:** Spin up Railway Postgres → analyze → tear down
- **On-the-fly software:** Personal tools built for exactly how YOU work

---

## The Big Picture Vision

> "Everything I would do that touches a keyboard, I'm now passing to some type of agent harness — whether it's Claude Code, Codex, or any of these tools. My job turns into: I have ideas, I pass them to Claude Code, I polish the end product."

This isn't about open-ended "give agents access to everything." It's about **specific jobs-to-be-done workflows, custom-made for how you operate day-to-day.**

Winners: one-person businesses, small teams with domain expertise, marketers who learn the tools.

---

## Resources
- **gtmengineeringcourse.com** — Free GTM engineering course Cody is building
- **graph.com** — Cody's company, Graph MCP for live ad data
- **Phantom Buster** — phantombuster.com
- **Instantly AI** — instantly.ai
- **Rafonic** — rafonic.com
- **Million Verifier** — millionverifier.com
- **Railway** — railway.app
- **Super Whisper** — superwhisper.com
