# Research Notes: "Claude Code & MCP Built My $145K Marketing Machine"

---

## Video Overview

- **Full Title:** Claude Code & MCP Built My $145K Marketing Machine
- **Channel:** Greg Isenberg (YouTube)
- **Guest:** Cody Schneider (co-founder at Graph, GTM engineer, growth marketer)
- **Format:** Live demo / tutorial podcast episode
- **Core Premise:** Cody demos how he uses Claude Code + MCP + APIs to build an autonomous marketing machine — running 10+ parallel agent windows simultaneously, all doing real growth work.

**Key Themes:**
- GTM Engineering as a discipline: using code + APIs to automate the "middle work" of marketing
- Building personal software using Claude Code as the execution layer
- Agent jockeying: running multiple Claude Code windows in parallel, each on a different task
- Using voice (Super Whisper) to give Claude Code instructions hands-free
- The API-first philosophy: evaluating all SaaS tools by API robustness
- Autonomous ad generation, publishing, analysis, and optimization loop
- Deploying software to Railway as persistent background agents

---

## Complete Concept Map

### Foundational Philosophy
- **GTM Engineering** originated at clay.com to describe cascading data enrichment workflows for outbound sales. Cody has expanded this to mean: anything that touches keyboard work in marketing/sales/growth gets passed to an agent harness.
- **The Agent Harness:** Claude Code (or Codex) acts as the execution brain. Every marketing task becomes a "job to be done" workflow custom-built by Claude Code.
- **Personal Software:** Instead of buying SaaS tools with UIs, you build software tailored exactly to your workflow using Claude Code.
- **Voice-First Input:** Super Whisper or similar transcription tools let you dictate instructions to Claude Code without typing.

### The Core Workflow Loop
1. You have an idea / marketing task
2. You describe it via voice into Claude Code
3. Claude Code builds the tool/software
4. You run the tool (or deploy it to Railway as a server)
5. The agent runs continuously in the background
6. You review outputs, adjust, iterate

### Architecture Layers
- **Environment file (.env):** All API keys stored in one place — the "foundation" of the whole system
- **Repository / "Growth Agents" folder:** The home base directory where all personal software is built and lives
- **Skills system:** Pre-built Claude Code "skills" (small programs for specific tasks) stored in the repo, callable by name
- **Agent windows:** Multiple Claude Code terminal instances running in parallel, each on a distinct task
- **Railway:** Cloud deployment for running agents as persistent servers
- **Data Warehouse (Graph MCP):** Live data pipeline syncing Facebook Ads, Google Analytics 4, etc. into a queryable warehouse — the MCP then exposes this as a live endpoint
- **Dashboard layer:** Custom dashboards built on demand by Claude Code to visualize live data

### Core Systems Cody Has Built
1. **LinkedIn Responder Agent** — monitors LinkedIn posts where people requested an asset, auto-responds with the asset link
2. **Bulk Facebook Ad Generator** — React components rendered as 1080x1080 PNG ads, bulk created from pain point research
3. **Podcast Cold Email System** — scrapes podcast RSS/Rafonic for host emails, verifies via Million Verifier, adds to Instantly campaign
4. **LinkedIn Engagement Scraper Pipeline** — Slack command triggers PhantomBuster to extract post engagers, enriched via Apollo, verified via Million Verifier, added to Instantly campaign
5. **Notion Giveaway Document Generator** — creates Notion docs following a template, tied to the LinkedIn giveaway workflow
6. **Facebook Ads Analytics + Optimizer** — pulls data from Graph MCP data warehouse, identifies low performers by CPM, auto-pauses them, promotes winners to dedicated ad sets
7. **Morning KPI Brief** — via Graph MCP + Claude iOS: ask conversational questions about yesterday's traffic, spend, etc.
8. **On-Demand PostgreSQL Databases** — spin up a Railway Postgres DB for ad hoc analysis, use it, spin it down

---

## Section Starting at ~19:48 — Deep Dive Notes

The 19:48 timestamp corresponds to approximately the 36% mark in the transcript. At this point, Cody has already set up the LinkedIn responder agent and is now transitioning into building the **Bulk Facebook Ad Generator**. The section covers everything from ad creative generation through to the full ad optimization loop and deployment architecture.

### The Bulk Facebook Ad Generator (19:48 onward)

**What it is:** A code-based system that generates 1080x1080 pixel Facebook ad images entirely from React components, then exports them as PNGs using html-to-canvas.

**How it was designed:**
- Cody went to Facebook Ads Library and found a "before and after" ad format from competitors
- He gave that as an example to Claude Code
- Claude Code built a React component replicating that format
- The component is entirely parameterized — change the text, change the ad

**Why code instead of an image AI model (like Midjourney/Nano Banana):**
- Staying on brand is easier with code-controlled templates
- Testing messaging variations (pain points, angles) is faster and costs almost nothing — "maybe 1,000 tokens to generate all these variations"
- After finding a winning format, you can remix it into a thousand variations at near-zero cost
- Nano Banana / Kai.ai is the alternative for scroll-stopping creative once you know what angle wins

**The pain point research step:**
- Claude Code is instructed to use the **Perplexity API** to scrape Reddit (and optionally YouTube, Twitter) for pain points that growth marketers have with data tools like Looker Studio
- Focus areas: can't get analyst bandwidth, too complicated to get started, can't unify data into one location
- These scraped pain points become the copy for each ad variation
- Key insight: "The best ads performing right now are basically you're selling outcomes or talking to the pain points"

**Two schools of thought on ad creative:**
1. Best creative first — use Nano Banana Pro for scroll-stopping visuals (highest quality)
2. Volume first — generate ugly-but-resonant ads at scale, find what converts ($0.15 ROAS), then invest in polish once you know the winning angle

Cody's approach: start with volume/code to find the angle, then remix into premium creative formats.

**The UGC format extension:**
- Take a winning static ad concept
- Send the copy to the **HeyGen API** to generate a video version with a virtual spokesperson
- Bulk upload the video to Facebook as a UGC-style format ad

### Bulk Upload to Facebook (Phase 2)

- Claude Code generates all ad variations as files in a local `/for/bulk/bulk.html` directory
- The ads are downloadable as a ZIP
- Claude Code is then instructed: "Use the Facebook Ads API to bulk upload all of these ads as drafts into [ad set URL]"
- All ads are uploaded as drafts (not live) into an existing ad set that was pre-created in Facebook Ads Manager

### Dashboard Creation for Campaign Tracking

Immediately after upload, Claude Code is asked to build a live tracking dashboard:

**Dashboard components:**
- Line chart: clicks over time + cost + CPC as separate lines
- Scorecard: total spend
- Scorecard: total clicks
- Bar chart: impressions by age demographic (age categories)

**Data source:** The **Graph MCP** — a data warehouse that continuously syncs live Facebook Ads data. This is NOT a Facebook Ads MCP (avoids pagination/rate limit problems). It is a purpose-built data pipeline at Graph.

**Critical insight on MCPs vs data warehouses:**
> "There's like this pagination problem. We see this all the time where people like 'Yeah, I plugged in a Facebook ads MCP, I'm interacting with it' and then realize that they're only seeing like 5% of the data that they think they're actually seeing."
The solution: build or use a proper ETL data pipeline into a warehouse (e.g., BigQuery or Postgres), then expose that via an MCP. The Graph MCP does this — it is a live data endpoint generated from the warehouse, not a direct API wrapper.

### Analyzing and Optimizing Ads (The Autonomous Loop)

After ads are running:

1. Claude Code is asked: "Use the Graph MCP to pull in data for this ad set. I want to look at CPM data to see which are lowest performing (highest CPM price)."
2. Graph MCP pulls live data from the data warehouse
3. Claude Code identifies the high-CPM (low-performing) ads
4. Claude Code is instructed: "Use the Facebook Ads API to turn off these ads with this ad name"
5. The ads are paused via the Facebook Ads API

**The full loop described:**
- Test campaign: constantly tests new creative
- Cron job runs daily: turns off low performers, bumps winners to dedicated ad sets with their own CPA-optimized budget
- Everything runs automatically in the background
- Dashboard shows the state at any time

### The Morning KPI Brief System

Using the **Graph MCP** connected to Claude iOS:
- In the morning, Cody opens Claude on his phone
- Asks: "How many new users went to the homepage yesterday? Use the Graph MCP and Google Analytics 4."
- Claude queries the live data warehouse and responds conversationally
- This works for the whole team — everyone can have a conversational interface to the company's live data

### The LinkedIn Engagement-to-Email Pipeline (In Detail)

**Trigger:** Anyone on the team drops a LinkedIn post URL in a Slack channel using `/linked post`

**Flow:**
1. Slack bot receives the URL
2. **PhantomBuster API** extracts all engagers (commenters/likers) from the LinkedIn post
3. Engager LinkedIn profiles are sent to the **Apollo API** for enrichment (get contact info, company data, etc.)
4. Enriched contacts are sent to **Million Verifier API** to validate email addresses
5. Verified contacts are added to an **Instantly AI** campaign for cold email outreach

**Why this is powerful:** The team can continuously add new LinkedIn posts to the queue. The pipeline runs automatically. No manual scraping or enrichment.

### Podcast Cold Email System

Built to get Cody booked on podcasts:

**Flow:**
1. **Rafonic API** scrapes podcast host emails from the marketing category
2. **Million Verifier API** verifies the emails
3. Verified emails are added to an **Instantly AI** campaign
4. A separate agent monitors Instantly for replies and books Cody onto podcasts

"This ends up turning into way better performing than I expected."

### Deploying to Railway (Making Agents Persistent)

Once a tool/workflow is working locally, Cody deploys it to **Railway**:

- Claude Code is instructed: "Deploy this to a server on Railway so my whole team can access this."
- Railway has a robust API that Claude Code can interact with directly
- Alternative: deploy directly to Vercel for public-facing tools
- On-demand databases: spin up a Postgres DB via Railway API for ad hoc analysis, use it, spin it down when done

**On-demand infrastructure story:**
- Cody needed to analyze a dataset
- Instead of Excel + pivot tables (would have taken 5 hours), he:
  1. Had Claude Code create a Railway Postgres database on the fly
  2. Pushed the data directly into it
  3. Did analysis conversationally with Claude in Claude Code
  4. Exported outputs to destination
  5. Spun the database down
- Total time: 20-30 minutes
- "On-the-fly UIs, on-the-fly databases, on-the-fly software is going to become the standard"

### The Notion Giveaway Document System

- Cody has a Claude Code skill connected to Notion
- He runs giveaways on LinkedIn: creates a resource doc, posts "comment for access"
- The Notion skill creates giveaway documents following a specific template from the repo
- The LinkedIn responder agent then DMs everyone who commented with the Notion link

### Agent Jockeying as a Working Style

By the 19:48 mark, Cody has 10+ Claude Code windows open simultaneously:
- Each window is a different agent working on a different task
- He cycles between them to check status, provide input, unblock them
- This is now his primary working mode: he describes it as running for ~6 weeks
- Started with 2-3 windows, now comfortable with 15
- Key challenge: context switching (remembering what each agent was doing)
- He describes himself as an "agent jockey"

---

## All Tools and Services Mentioned

| Tool Name | What It Does | How Cody Uses It |
|-----------|-------------|-----------------|
| **Claude Code** | AI coding agent / terminal-based LLM agent | Primary execution layer for building all tools and running agents |
| **Codex** | OpenAI's coding agent (alternative) | Mentioned as an alternative to Claude Code for the agent harness |
| **Super Whisper** | Voice-to-text transcription app | Dictates instructions to Claude Code hands-free |
| **PhantomBuster** | LinkedIn / social media automation and scraping | Extracts engagers from LinkedIn posts via API |
| **Instantly AI** | Cold email outreach platform | Receives verified leads for email campaigns; manages campaign sequences |
| **Rafonic** | Podcast database / email scraper | Scrapes podcast host emails by category for outreach |
| **Railway.com** | Cloud deployment platform | Deploys agent software as persistent servers; spins up/down on-demand Postgres databases |
| **Million Verifier** | Email verification service | Validates email addresses before adding to Instantly campaigns |
| **Facebook Ads API** | Meta's official advertising API | Bulk uploads ad creative, pauses low-performing ads, reads campaign data |
| **Facebook Ads Library** | Meta's public ad research tool | Source of inspiration for ad formats (competitors' ads) |
| **Perplexity API** | AI-powered search/research API | Scrapes Reddit, YouTube, Twitter for pain points to use in ad copy |
| **Apollo API** | B2B contact data and enrichment | Enriches LinkedIn profiles with email addresses, company data |
| **Notion API / MCP** | Notion document creation | Automatically creates giveaway documents from templates |
| **HeyGen API** | AI video generation (talking avatar) | Converts winning static ad copy into UGC-style video ads |
| **Graph MCP** | Cody's own data warehouse MCP | Exposes live unified marketing data (Facebook Ads, Google Analytics, etc.) as a queryable endpoint for Claude |
| **Google Analytics 4** | Web analytics | Queried via Graph MCP for daily user/traffic metrics |
| **Slack API** | Team communication platform | Used as a trigger interface — `/linked post` command feeds URLs into the LinkedIn pipeline |
| **Nano Banana (Banana)** | AI image generation tool | Alternative for generating high-quality ad creative; better for visual polish |
| **Kai.ai** | Bulk AI image generation | Mentioned as a tool for bulk image generation workflows |
| **Vercel** | Frontend cloud deployment | Alternative deployment target for tools alongside Railway |
| **HubSpot** | CRM | Listed in Cody's .env file as part of his growth stack |
| **Clay.com** | Data enrichment / GTM engineering platform | Origin of the "GTM Engineering" term; part of stack |
| **Intercom** | Customer messaging platform | Listed in .env file as part of stack |
| **SendGrid** | Transactional email | Listed in .env file as part of stack |
| **Chrome Extension** | Claude browser extension | Used for LinkedIn automation tasks in the browser |
| **Looker Studio** | Google's BI/dashboarding tool | Referenced as the category Cody's product (Graph) competes with |
| **Salesforce** | CRM | Mentioned as having a more robust API than HubSpot — therefore better for AI-era workflows |
| **HubSpot** | CRM | Compared to Salesforce; less API-robust but more common |
| **Figma** | Design tool | Mentioned only as what you used to have to use to make ad variations manually |
| **React** | JavaScript UI framework | Used to build the Facebook ad templates as components |
| **html-to-canvas** | JS library | Converts React components into downloadable PNG images |

---

## The Agent Architecture Cody Built

### Step-by-Step: The Full Facebook Ads Autonomous System

**Phase 1: Setup**
1. Create a root directory (e.g., `growth-agents/`) — this is your "home base"
2. Create a `.env` file with all API keys: Facebook Ads, Perplexity, HubSpot, Instantly, PhantomBuster, Apollo, Million Verifier, Railway, Graph, HeyGen, SendGrid, etc.
3. Install Claude Code front-end design skill (for better UI generation)
4. Set up Super Whisper for voice input

**Phase 2: Build the Ad Creative System**
1. Go to Facebook Ads Library, find a competitor ad format you like (e.g., before/after)
2. Describe the format to Claude Code via voice; Claude Code builds a React component that replicates it
3. The React component is parameterized with title text + body text slots
4. html-to-canvas converts the component to a 1080x1080 PNG
5. A UI is generated so you can preview the creative visually

**Phase 3: Pain Point Research**
1. Claude Code is instructed to use the Perplexity API
2. It scrapes Reddit, YouTube, and Twitter for pain points in your target category
3. Output: a list of specific pain points and desired outcomes from real user posts
4. These become the copy variations for each ad

**Phase 4: Bulk Ad Generation**
1. Each pain point becomes an ad variation
2. Claude Code generates all variations and places them at `/for/bulk/bulk.html`
3. You can preview all variations in the browser
4. Export as a ZIP file containing all PNG images

**Phase 5: Bulk Upload to Facebook**
1. Claude Code is instructed: "Use the Facebook Ads API to bulk upload all creative from [local folder] as drafts into [ad set URL]"
2. All ads are uploaded as drafts to the pre-created ad set
3. Ads can be reviewed before going live

**Phase 6: Track with a Custom Dashboard**
1. Claude Code is instructed to query the Graph MCP for the ad set ID
2. Claude Code builds a dashboard with: line chart (clicks, cost, CPC over time), scorecards (total spend, total clicks), bar chart (impressions by age)
3. Dashboard is live — data is pulled from the Graph data warehouse which syncs continuously

**Phase 7: Analyze and Optimize**
1. Claude Code queries the Graph MCP: "Pull CPM data for this ad set, show highest CPM (worst performers)"
2. Claude Code identifies the losers by name
3. Claude Code calls the Facebook Ads API: "Pause these specific ads"
4. Winners are promoted to a new ad set with a dedicated CPA-optimized budget

**Phase 8: Automate the Loop**
1. Set up a cron job to run the analysis + optimization script daily
2. Test campaign constantly receives new creative
3. Losers get automatically paused
4. Winners get automatically promoted
5. Everything runs without human intervention

**Phase 9: Deploy to Railway**
1. Claude Code is instructed: "Deploy this to a server on Railway"
2. The entire system (ad generator + uploader + analyzer + optimizer) runs as a persistent server
3. Team members can interact with it via a shared interface
4. On-demand databases can be spun up for ad hoc analysis and torn down when done

---

## Key Strategies and Frameworks

### GTM Engineering Philosophy
- **Definition (evolved):** Building personal software that automates all "middle work" in marketing, sales, and growth using an agent harness (Claude Code) + APIs
- **Old GTM Engineering:** clay.com-style data enrichment cascades for outbound email
- **New GTM Engineering:** any repeatable marketing/growth workflow built as agent-executable software

### The API-First Evaluation Framework
When buying SaaS tools, evaluate by API robustness, not UI:
- Cody is willing to churn from a SaaS if a workflow available in the UI isn't available in the API
- "I'm literally about to churn because this is critical for me and it feels archaic to go interact with your UI"
- Recommendation: Salesforce over HubSpot for AI workflows because Salesforce has a more robust API
- Sam Altman thesis: "Every company is going to be an API company"

### The Volume-First Ad Testing Framework
1. Generate maximum ad variations at near-zero cost (React components + pain point copy)
2. Run all variations to find which angle/format converts
3. Identify the 1-3 winners
4. THEN invest in premium creative (Nano Banana, professional video) for winners only
5. Scale spend on proven winners

### The Pain Point Mining Framework
- Source: Reddit, YouTube, Twitter (via Perplexity API)
- Look for: what people complain about, what outcomes they wish they had, what's frustrating about existing solutions
- Use these verbatim (or lightly edited) as ad copy
- Insight: "The best ads performing right now are basically you're selling outcomes or you're talking to the pain points"

### Agent Jockeying as a Productivity System
- Run 10-15 Claude Code windows simultaneously
- Each window = a separate agent on a separate task
- Give each agent its own directory/project
- Check in periodically to provide input or unblock
- Use plan mode to let agents work without confirmation prompts
- Deploy completed agents to Railway for perpetual background operation
- Context switching is the skill to develop

### The Domain Vocabulary Superpower
- AI outputs are only as good as your ability to describe what you want
- Domain experts have a specialized vocabulary that dramatically improves prompt quality
- Example: describing a specific texture in ad design using correct design terminology one-shots the result vs. generic descriptions that produce garbage
- Insight: "If you have the vocabulary you know and six things and you come to this tooling and can basically express and explain like what you're needing, it changes the entire system"

### The Data Warehouse vs. MCP Architecture
- Plugging in a Facebook Ads MCP directly is naive — you'll see only 5% of your data due to pagination limits
- Instead: build a proper ETL data pipeline into a warehouse (Graph does this)
- Expose the warehouse via a custom MCP (the Graph MCP)
- The MCP generates live endpoints on the fly from the warehouse
- This gives you: no rate limits, full dataset, queryable by Claude in natural language

---

## Claude Code Prompts (EXTRACT THESE)

### Prompt 1: Initial Environment and Repository Setup
**Context:** Sets up the foundational working environment for all GTM engineering work.
**Prompt:**
```
I need you to help me set up a growth agents repository. Create a folder structure with the following:

1. A root directory called "growth-agents"
2. A .env.example file with placeholder keys for the following services: Facebook Ads API, Perplexity API, HubSpot API, Clay.com API, Instantly AI API, PhantomBuster API, Apollo API, Million Verifier API, Railway API, SendGrid API, HeyGen API, Notion API, Google Analytics 4
3. A README.md explaining the repo structure and how to add a new API key
4. A /skills subdirectory where we will store reusable workflow scripts
5. A /demos subdirectory for demo projects

Also create a simple shell script that loads the .env file and verifies all API keys are present before running any tool. Let me know when it's done and what I need to fill in.
```

### Prompt 2: Build the LinkedIn Post Auto-Responder Agent
**Context:** Automates responding to LinkedIn posts where people asked for an asset in the comments.
**Prompt:**
```
I need you to build a LinkedIn auto-responder skill. Here is what it should do:

1. Accept a LinkedIn post URL and a Notion document URL as inputs
2. Use the Chrome browser extension / Playwright to open the LinkedIn post
3. Find all comments on the post
4. For each comment that includes the keyword [KEYWORD — e.g., "triage"], reply with a DM or comment containing the Notion document link
5. Process comments chronologically from most recent
6. Skip any comment that has already been responded to
7. Log each response with timestamp and commenter name to a local CSV

Store this as a reusable skill in /skills/linkedin-responder.js.

The keyword to look for is: [INSERT KEYWORD]
The Notion document URL is: [INSERT NOTION URL]
The LinkedIn post URL is: [INSERT POST URL]

Ask me if you need any clarification before building. Run in plan mode first.
```

### Prompt 3: Build the Bulk Facebook Ad Generator (React + html-to-canvas)
**Context:** Creates a code-based ad creative system that generates 1080x1080 PNG ads from parameterized React components.
**Prompt:**
```
I need you to build a bulk Facebook ad generator. Here are the specifications:

1. Build this as a React application (no external UI library, keep it simple)
2. The ad format is 1080x1080 pixels
3. I'll describe the ad template: [DESCRIBE YOUR AD FORMAT — e.g., "before and after format: left side shows the problem state in dark red background with bold headline, right side shows the solution in green with outcome text"]
4. The template should have parameterized slots for: headline text, body copy, call to action text, and background color
5. Include a preview UI where I can see all generated ads in a grid
6. Use html-to-canvas to convert each React component to a downloadable 1080x1080 PNG
7. Add a "Download All as ZIP" button that exports all generated ads
8. Add a form-based input UI where I can paste in a list of headline/copy combinations (one per line, comma separated)
9. Also add a bulk input mode where I can paste a CSV with columns: headline, body_copy, cta_text, background_color

Place the output at /for/bulk/bulk.html. Ask me questions if you need clarification.
```

### Prompt 4: Pain Point Research via Perplexity API
**Context:** Uses the Perplexity API to scrape Reddit (and other platforms) for ICP pain points to use as ad copy.
**Prompt:**
```
I need you to research pain points using the Perplexity API. Here is the task:

1. Use the Perplexity API (key is in .env as PERPLEXITY_API_KEY) to search Reddit for discussions about pain points with [TARGET CATEGORY — e.g., "data reporting and business intelligence tools like Looker Studio, Tableau, and Google Data Studio"]
2. Also search YouTube comments and Twitter/X for the same topic
3. Focus specifically on:
   - Complaints about not being able to get analyst bandwidth
   - Frustrations with complexity and time to get started
   - Problems with unifying data from multiple sources into one place
   - Outcomes and results people wish they could achieve easily
4. Return a structured JSON list of pain points, each with: the pain point text, the source (Reddit/YouTube/Twitter), an example quote from a real post, and the desired outcome (what they wish they had instead)
5. Aim for at least 20-30 distinct pain points
6. Remove duplicates and cluster similar ones

Output the results to a file called pain-points.json in the current directory. I'll use these as copy for Facebook ads.
```

### Prompt 5: Generate Bulk Ad Copy Variations from Pain Points
**Context:** Takes the researched pain points and generates ad copy variations for bulk upload.
**Prompt:**
```
I have a pain-points.json file in this directory. I need you to:

1. Read the pain-points.json file
2. For each pain point, generate 3 ad copy variations:
   - Variation A: Problem-focused headline (state the pain point directly)
   - Variation B: Outcome-focused headline (state what they'll achieve)
   - Variation C: Question format (ask them if they experience this pain)
3. For each variation, also generate: a 2-sentence body copy that expands on the headline, and a call-to-action (one of: "Learn More", "Get Started Free", "See How It Works", "Try It Today")
4. Output everything as a CSV file called ad-variations.csv with columns: variation_id, headline, body_copy, cta, pain_point_source, format_type
5. Also output a summary: total variations generated, average headline length, list of all CTA options used

I want to end up with enough variations to test at least 50 different angles.
```

### Prompt 6: Bulk Upload Ads to Facebook via the Ads API
**Context:** Takes the locally generated ad PNG files and bulk uploads them to a Facebook ad set as drafts.
**Prompt:**
```
I need you to bulk upload Facebook ads using the Facebook Ads API. Here are the details:

1. The Facebook Ads API access token is in .env as FACEBOOK_ADS_ACCESS_TOKEN
2. The ad account ID is in .env as FACEBOOK_AD_ACCOUNT_ID
3. The target ad set ID is: [INSERT AD SET ID]
4. All ad creative PNG files are located in: [INSERT LOCAL FOLDER PATH]
5. For each PNG file in that folder:
   a. Upload the image to the Facebook Ads API as an ad image
   b. Create an ad creative using that image
   c. Create a draft ad in the target ad set with that creative
   d. Use the filename (without extension) as the ad name for tracking purposes
   e. Set destination URL to: [INSERT URL] (or leave as draft with no URL if not provided)
6. Upload all as DRAFT status (do not publish yet)
7. Log each upload with: filename, Facebook image ID, creative ID, ad ID, upload timestamp
8. Save the log to ad-upload-log.json

Handle rate limits with exponential backoff. Report progress as you go.
```

### Prompt 7: Build a Facebook Ads Performance Dashboard
**Context:** Builds a live tracking dashboard for a Facebook ad campaign using the Graph MCP data warehouse.
**Prompt:**
```
I need you to build a Facebook ads performance dashboard. Use the Graph MCP (it is connected and available) to pull live data from our Facebook Ads data warehouse.

The ad set ID to track is: [INSERT AD SET ID]

Build a dashboard with the following components:
1. Line chart showing: clicks over time, cost over time, and CPC (cost per click) over time — all on the same chart with a shared time axis, date range selectable
2. Two scorecards side by side: (a) Total Spend to date, (b) Total Clicks to date
3. Bar chart: Impressions broken down by age demographic (use Facebook's age brackets)
4. A data table showing each individual ad in the set with columns: ad name, impressions, clicks, CTR, spend, CPC, CPM, status

Make this as a standalone HTML file that auto-refreshes every 5 minutes. Use Chart.js for the charts. Store it at /dashboards/facebook-ads-[AD_SET_ID].html.

Pull the data via Graph MCP queries. If you need to clarify what data fields are available in the Graph MCP, ask me.
```

### Prompt 8: Identify and Pause Low-Performing Facebook Ads
**Context:** Analyzes active ads by CPM and pauses the worst performers using the Facebook Ads API.
**Prompt:**
```
I need you to analyze my Facebook ad set and turn off the low performers.

1. Use the Graph MCP to pull all ads in ad set ID: [INSERT AD SET ID]
2. Get the CPM (cost per thousand impressions) for each ad over the last 7 days
3. Identify the bottom 30% of ads by CPM performance (highest CPM = worst performance per impression)
4. Only include ads that have at least 500 impressions (ignore ads with too little data)
5. List the low performers with their: ad name, ad ID, CPM, impressions, spend
6. Ask me to confirm before pausing (show the list and say "Shall I pause these [N] ads?")
7. After confirmation, use the Facebook Ads API to pause each of those ads (set status to PAUSED)
8. Log all paused ads to paused-ads-log.json with timestamp

The Facebook Ads API credentials are in .env.
```

### Prompt 9: Promote Winning Ads to a New Dedicated Ad Set
**Context:** Takes the best-performing ads and promotes them to their own CPA-optimized ad set with a dedicated budget.
**Prompt:**
```
I need to promote my winning Facebook ads to a new dedicated ad set for scaling.

1. Use the Graph MCP to pull performance data for ad set ID: [INSERT SOURCE AD SET ID]
2. Identify the top 20% of ads by: lowest CPC AND highest CTR (both criteria must be in the top 20%)
3. For each winning ad, get: ad name, ad ID, creative ID, CPM, CPC, CTR, total spend to date
4. Using the Facebook Ads API:
   a. Create a new ad set named "[SOURCE AD SET NAME] - Winners - [TODAY'S DATE]"
   b. Set the optimization goal to OFFSITE_CONVERSIONS (CPA optimization)
   c. Set a daily budget of: [INSERT BUDGET, e.g., $50/day]
   d. Target the same audience as the source ad set (clone the targeting)
   e. Duplicate each winning ad creative into the new ad set
   f. Set the ads to ACTIVE status
5. Report back: how many ads were promoted, the new ad set ID, estimated daily spend

The Facebook Ads API credentials are in .env. The parent campaign ID is: [INSERT CAMPAIGN ID].
```

### Prompt 10: Build the Podcast Cold Email Pipeline
**Context:** Scrapes podcast host emails from Rafonic, verifies them, and adds them to an Instantly campaign.
**Prompt:**
```
I need you to build an end-to-end podcast outreach pipeline. Here is the workflow:

Step 1 — Scrape podcast hosts:
- Use the Rafonic API (key in .env as RAFONIC_API_KEY) to get all podcasts in the [INSERT CATEGORY — e.g., "marketing"] category
- Extract: podcast name, host name, host email address, podcast RSS URL, estimated listener count if available
- Save to podcasts-raw.json

Step 2 — Verify emails:
- Send each email to the Million Verifier API (key in .env as MILLION_VERIFIER_API_KEY)
- Keep only emails with status "valid" or "catch-all"
- Save verified contacts to podcasts-verified.json

Step 3 — Add to Instantly campaign:
- Use the Instantly AI API (key in .env as INSTANTLY_API_KEY)
- Add each verified contact to the campaign ID: [INSERT CAMPAIGN ID]
- For each contact, include custom variables: {{podcast_name}}, {{host_name}}, {{category}}
- Log each addition to instantly-upload-log.json

Report total podcasts found, total verified, total added to campaign, and any errors encountered.
```

### Prompt 11: Build the LinkedIn-to-Email Pipeline (Slack-Triggered)
**Context:** Creates a full Slack-triggered pipeline that extracts LinkedIn post engagers, enriches them, and adds to an email campaign.
**Prompt:**
```
I need to build a Slack-triggered LinkedIn engagement scraper that feeds into email outreach. Here is the full workflow:

Trigger: A Slack command `/linked post [LINKEDIN_POST_URL]` drops a LinkedIn post URL into the pipeline

Step 1 — PhantomBuster extraction:
- Use the PhantomBuster API (key in .env as PHANTOMBUSTER_API_KEY) to launch the LinkedIn Post Engagers phantom
- Input: the LinkedIn post URL from the Slack command
- Extract: all likers and commenters — their LinkedIn profile URLs and names
- Wait for the phantom to complete and retrieve results

Step 2 — Apollo enrichment:
- For each LinkedIn profile URL, use the Apollo API (key in .env as APOLLO_API_KEY) to find:
  - First name, last name
  - Email address
  - Company name
  - Job title
  - Company size

Step 3 — Email verification:
- Send each email to Million Verifier (key in .env as MILLION_VERIFIER_API_KEY)
- Discard invalid emails

Step 4 — Add to Instantly:
- Add verified contacts to Instantly campaign ID: [INSERT CAMPAIGN ID]
- Include custom fields: {{first_name}}, {{company}}, {{title}}, {{linkedin_url}}

Set this up as a Slack bot using Slack's Bolt SDK. The Slack bot token is in .env as SLACK_BOT_TOKEN. Deploy instructions will come later.
```

### Prompt 12: Create a Morning KPI Brief System
**Context:** Enables conversational querying of live marketing data each morning via the Graph MCP.
**Prompt:**
```
I need to set up a morning KPI brief system using the Graph MCP.

Please do the following:

1. Create a script called morning-brief.js that:
   a. Uses the Graph MCP to query Google Analytics 4 for: new users yesterday, sessions yesterday, top 3 pages by traffic yesterday
   b. Uses the Graph MCP to query Facebook Ads for: total spend yesterday, total clicks yesterday, best performing ad (by CTR) yesterday
   c. Uses the Graph MCP to query Google Ads (if available) for: total spend yesterday, total conversions yesterday
   d. Formats all of this into a clean plain-English brief
   e. Optionally sends the brief to a Slack channel (use SLACK_WEBHOOK_URL from .env)

2. Set up a cron job that runs morning-brief.js every day at 8:00 AM local time

3. Also document how to query this data conversationally by adding the Graph MCP to Claude Desktop or Claude iOS so that I can ask questions like "How much did we spend on Facebook ads yesterday?" and get live answers

The Graph MCP is already configured in my Claude settings. Show me any additional configuration needed.
```

### Prompt 13: Deploy a Tool to Railway as a Persistent Server
**Context:** Takes any locally working Claude Code-built tool and deploys it to Railway as a persistent background agent.
**Prompt:**
```
I need to deploy [TOOL NAME — describe the tool briefly] to Railway so it runs persistently in the background and my team can access it.

The tool is located at: [INSERT LOCAL PATH]

Please:
1. Use the Railway API (key in .env as RAILWAY_API_KEY) or the Railway CLI to:
   a. Create a new Railway project called "[TOOL NAME]"
   b. Link the local directory to this Railway project
   c. Set up all required environment variables from .env in Railway's project settings
   d. Deploy the application

2. If this is a Node.js app: set the start command to "node [ENTRY FILE]"
   If this is a Python app: set the start command to "python [ENTRY FILE]"
   If this needs a database: also provision a Railway PostgreSQL instance and link it

3. After deployment:
   a. Return the public URL where the tool is accessible
   b. Test that the deployment is working by hitting the health check endpoint (or root URL)
   c. Set up auto-restart on failure

4. Create a simple team access guide: how team members can use this tool (what URL, what inputs it accepts)

Report back the Railway project ID, deployment URL, and any environment variables that need to be manually added in the Railway dashboard.
```

### Prompt 14: On-Demand Data Analysis with Railway PostgreSQL
**Context:** Creates a temporary PostgreSQL database on Railway for ad hoc data analysis, runs the analysis, then tears it down.
**Prompt:**
```
I need to do a quick data analysis using an on-demand database. Here is what I need:

1. Use the Railway API to spin up a new PostgreSQL database instance called "analysis-[TODAY'S DATE]"
2. Get the connection string and store it temporarily in memory

3. I have a dataset at: [INSERT FILE PATH or URL]
   - If it's a CSV: create the appropriate table schema and import the data
   - If it's a JSON array: normalize it into a relational table
   - If it's a URL: download it first, then import

4. Once the data is imported, perform the following analysis:
   [DESCRIBE YOUR ANALYSIS — e.g., "Find the top 10 performing ads by CTR, grouped by age demographic, for spend above $50"]

5. Output the results as:
   - A summary table printed to the terminal
   - A CSV file saved to ./analysis-results-[TODAY'S DATE].csv

6. After I confirm the results look correct, tear down the Railway PostgreSQL instance using the Railway API (to avoid ongoing costs)

Railway API key is in .env as RAILWAY_API_KEY. Let me know when the database is ready before starting the analysis.
```

### Prompt 15: Build a Notion Giveaway Document
**Context:** Creates a formatted Notion document following the giveaway template for LinkedIn lead gen.
**Prompt:**
```
I need you to create a Notion giveaway document using our existing template structure.

1. Look in the /skills directory for the Notion giveaway skill and use that as the template
2. Also reference any existing giveaway documents in the repo for structure guidance
3. The new giveaway document should cover: [INSERT TOPIC — e.g., "Email Triage System for Founders"]

The document should include:
- A title and subtitle
- A "What you'll get" section with 3-5 bullet points
- A step-by-step breakdown (numbered list, each step explained clearly)
- A tools/resources section listing what's needed
- A "Why this works" explanation section
- A CTA at the bottom directing to [INSERT YOUR PRODUCT/SERVICE]

After creating the content:
1. Use the Notion API (key in .env as NOTION_API_KEY) to create this document in the giveaway database (database ID: [INSERT NOTION DATABASE ID])
2. Return the public share URL of the created Notion page
3. Save the URL to giveaway-urls.json for tracking

Format the document so it looks polished and can be sent directly to LinkedIn commenters.
```

---

## Quotable Insights

**On GTM Engineering's evolution:**
> "Everything that used to be the middle work that we would do — like all of anything that I would do to touch the keyboard — I'm now passing it on to some type of agent harness... My job suddenly turns into: I have ideas, I pass them on to Claude Code, and then I'm basically polishing the end product."

**On what's now possible:**
> "Build 100 Facebook ads, publish them to Facebook, build a dashboard to track that, analyze the data within Claude Code, have it turn off the Facebook ads that are the low performers, have it bump up the Facebook ads that are the best performers to a new ad set with its own dedicated budget. And everything that I just described happening in literally, you know, 30 minutes."

**On agent jockeying:**
> "This is literally how I'm working now. I'm just jocking agents across and then if I can automate them and get them to do like if I can figure out okay this is the specific lane that you can focus on then I'm spinning that up onto a server on Railway."

**On the MCP pagination problem:**
> "We see this all the time where people like 'Yeah, I plugged in a Facebook ads MCP, I'm interacting with it' and then realize that they're only seeing like 5% of the data that they think they're actually seeing."

**On APIs becoming the primary interface:**
> "I'm literally about to churn because I'm just like this is critical for me and now it feels archaic for me to go and interact with your [UI] to do this output."

**On evaluating SaaS tools in the AI era:**
> "[Salesforce] is actually the better product for this AI foundation because it has a more robust API so you can do more with it."

**On domain vocabulary as the real superpower:**
> "If you have the vocabulary you know and six things and you come to this tooling and can basically express and explain like what you're needing or what you're looking for, it changes the entire system."

**On the texture example (one-shot prompting):**
> "I wanted to put texture on the back of an ad and I kept trying to describe it. It came out terrible. And then I found this like person giving a description of like how do you make it have a TV-type texture, right? And it was like all of these specific — it was like a specific lexicon to describe the quality. Literally one-shots it immediately — exactly what I was looking for."

**On on-demand infrastructure:**
> "On-the-fly UIs, on-the-fly databases, on-the-fly software is going to become the standard for these people that are working at the forefront of this."

**On data analysis replacing Excel:**
> "What used to would have taken me probably 5 hours historically to like clean the data appropriately, I smashed that out in like probably 20 to 30 minutes."

**On autonomous marketing becoming real:**
> "I have one that's just like crawling LinkedIn like as we speak and it's like looking for ICP and then it enriches them. It writes a personalized email and it cold emails them. And like I don't think people understand like what's about to happen in like the next 12 months."

**On agent swarms:**
> "An agent swarm is just an agent that does like a specific thing. And then there's an agent that manages like that whole system. And then like imagine like five pillars under like another agent."

**On who wins and who loses:**
> "The winners are going to be one-person businesses, small teams. And then maybe your head of marketing that currently you're getting paid $100,000 a year — now all of a sudden if you can figure out how to do all these things, you could make the case like 'Hey, triple my salary.'"

**On rapid job displacement:**
> "I have a friend who runs a startup and he texted me yesterday and he's like I think I'm going to fire 50 people and that's like 70% of his team. I think I can automate all of their jobs right now with agent swarms."

---

*Research compiled from transcript of YouTube video "Claude Code & MCP Built My $145K Marketing Machine" — Greg Isenberg channel, featuring Cody Schneider. Timestamp section starting at approximately 19:48.*
