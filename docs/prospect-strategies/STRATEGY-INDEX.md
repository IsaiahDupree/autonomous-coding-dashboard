# LinkedIn Prospect Strategy Index

Master reference for all prospect discovery channels. Each strategy is scored on signal quality,
volume, and build effort. Status: **built** (live in daemon), **live** (implemented this session),
**backlog** (documented, not yet built).

---

## Status Summary

| # | Strategy | Signal | Volume | Effort | Status |
|---|----------|--------|--------|--------|--------|
| 01 | Keyword people search — 2nd degree | ★★★☆☆ | High | Built | **built** |
| 02 | Keyword people search — 3rd degree | ★★★☆☆ | High | Built | **built** |
| 03 | Post commenters (engagement scraper) | ★★★★☆ | Medium | Built | **built** |
| 04 | Post reactors / likers | ★★★☆☆ | Very High | Low | **live** |
| 05 | LinkedIn Events attendees | ★★★★★ | Medium | Medium | **live** |
| 06 | Job posting signals (hiring VA/ops) | ★★★★★ | High | Medium | **live** |
| 07 | LinkedIn Groups members | ★★★★☆ | High | Medium | backlog |
| 08 | 2nd-degree network deep scan | ★★★★☆ | High | Low | backlog |
| 09 | Newsletter / Article commenters | ★★★★☆ | Medium | Low | backlog |
| 10 | Company follower lists | ★★★☆☆ | Medium | Medium | backlog |
| 11 | Product Hunt makers | ★★★★☆ | Medium | Medium | backlog |
| 12 | Indie Hackers revenue-verified founders | ★★★★★ | Low | Low | backlog |
| 13 | Crunchbase seed/Series A companies | ★★★★☆ | Medium | Medium | backlog |
| 14 | AppSumo launches | ★★★☆☆ | Low | Low | backlog |
| 15 | Twitter/X curated founder lists | ★★★☆☆ | Medium | Low | backlog |
| 16 | GitHub intent signals (n8n/Zapier repos) | ★★★★☆ | High | Medium | backlog |
| 17 | Funding announcements (real-time) | ★★★★☆ | Medium | Medium | backlog |
| 18 | Alumni networks (YC, Techstars, On Deck) | ★★★★☆ | Medium | Medium | backlog |
| 19 | Referral mining from closed clients | ★★★★★ | Low | Low | backlog |

---

## Implemented (Built-in Daemon Strategies)

### 01 — Keyword People Search (2nd degree)
**File:** `harness/linkedin-daemon.js` → `SEARCH_STRATEGIES` array
**How it works:** LinkedIn People search by keyword + title filter + connection degree.
18 strategies rotate every 30 min, 3 per cycle.
**Current strategies:** AI SaaS Founders, Software Startup CTOs, Marketing Tech Ops,
API Integration Builders, Scale-Up Operators, No-Code SaaS Founders, Agency AI Owners,
Creator Economy AI, AI Consulting Space, Bootstrapped SaaS, Ecom DTC Founders,
RevOps SaaS Leaders, App Creation Founders, Web App Builders.

### 02 — Keyword People Search (3rd degree)
Same as 01 but `connectionDegree: '3rd'` — LinkedIn returns an entirely different result pool.
Current 3rd-degree mirrors: AI SaaS Founders, No-Code SaaS, Bootstrapped SaaS, App Founders.

### 03 — Post Commenters
**File:** `harness/linkedin-post-scraper.js`
**How it works:** Search LinkedIn content by keyword → visit each post → extract commenters.
Called by `linkedin-engagement-daemon.js` as a subprocess.

---

## Implemented This Session

### 04 — Post Reactors / Likers
**File:** `harness/linkedin-post-scraper.js` (extended with `--include-likers`)
**Business outcome:** 5-10x more prospects per post vs commenters only. People who click
"Insightful" or "Like" on AI/automation posts self-identify their interest. Converts at
similar rates to commenters (~2-4% DM reply). At 50 likers/post × 5 posts = 250 new
prospects per run vs 25 commenters — dramatically expands top-of-funnel.
**Expected pipeline impact:** +50-150 qualified prospects/week.

**Usage:**
```bash
node harness/linkedin-post-scraper.js --keyword "AI automation" --include-likers --max-posts 5
```

### 05 — LinkedIn Events Attendees
**File:** `harness/linkedin-events-scraper.js`
**Business outcome:** Highest-quality LinkedIn source. People who RSVP to an event titled
"AI for Founders" or "SaaS Automation Summit" are self-selecting with explicit intent signal.
Expected DM reply rate: 4-8% (2x baseline). Events typically list 50-500 attendees, all
pre-filtered by interest. One event = 1 month of qualified outreach.
**Expected pipeline impact:** +30-100 high-quality prospects per event, 2-4 events/week searchable.

**Usage:**
```bash
# Search for events + scrape attendees
node harness/linkedin-events-scraper.js --keyword "AI automation founders" --max-events 3
node harness/linkedin-events-scraper.js --event-url "https://www.linkedin.com/events/12345/about/"
```

### 06 — Job Posting Signals
**File:** `harness/linkedin-jobs-signal.js`
**Business outcome:** Companies actively hiring for VA, Operations Coordinator, Data Entry,
or Manual Reporting roles have a proven pain point and proven budget (they're paying salary).
Converting them to automation clients = replacing a $40K/yr hire with a $2,500 project.
Expect 6-10% DM reply rate on this angle vs 2-3% for cold keyword search.
**Expected pipeline impact:** +20-50 high-intent prospects/week, each with explicit buying signal.

**Usage:**
```bash
# Find companies hiring for manual ops roles → extract founder
node harness/linkedin-jobs-signal.js --role "operations coordinator" --max-jobs 20
node harness/linkedin-jobs-signal.js --role "virtual assistant" --max-jobs 20
node harness/linkedin-jobs-signal.js --role "data entry" --max-jobs 20
```

---

## Backlog (Documented, Not Yet Built)

### 07 — LinkedIn Groups Members
**Signal:** ★★★★☆ | Volume: High | Effort: Medium
**Description:** Groups like "SaaS Founders Circle", "AI Automation Community", "B2B SaaS Founders",
"No-Code Builders" have thousands of pre-qualified members.
**Implementation plan:**
- Navigate to group URL → click Members tab
- Scroll to load members list (virtual scroll, pagination)
- Extract name + headline + profileUrl for each visible member
- Filter by headline: Founder/CEO/CTO + Software/SaaS
**Key groups to target:** linkedin.com/groups/9257778 (SaaS Founders), /groups/4858820 (AI/ML),
/groups/2011673 (Startup/Entrepreneur Network)
**Business outcome:** Groups have members who actively opted-in to a community topic —
pre-qualified by interest. Large groups (5K+) provide months of fresh prospects. ~3-5% DM reply.

### 08 — 2nd-Degree Network Deep Scan
**Signal:** ★★★★☆ | Volume: High | Effort: Low
**Description:** Mine MY existing connections' connections. Filter by: title = Founder/CEO/CTO,
industry = Software/SaaS. These are warm because of the shared connection.
**Implementation plan:**
- Navigate to each 1st-degree connection's profile → "X connections" → filter connections page
- OR: Use LinkedIn's "My Network" → "People you may know" with filters
- Batch 10-20 connections per run to avoid rate limits
**Business outcome:** Warmest cold outreach available — shared connection = instant social proof.
2nd-degree DM reply rates are typically 1.5-2x 3rd-degree. ~4-6% reply rate.

### 09 — Newsletter / Article Commenters
**Signal:** ★★★★☆ | Volume: Medium | Effort: Low
**Description:** LinkedIn Articles and Newsletters attract a more serious audience than feed posts.
Target newsletters on: AI for Founders, SaaS Growth, Automation & Ops.
**Implementation plan:**
- Extend `linkedin-post-scraper.js` to handle `/pulse/` article URLs
- Navigate to newsletter author profile → "Articles" tab → get article URLs
- Same commenter extraction as posts (comments render identically)
**Business outcome:** Article commenters are 40-60% more senior than post commenters (writing
substantive replies takes more effort). Higher ICP density per scrape. ~4-5% DM reply.

### 10 — Company Follower Lists
**Signal:** ★★★☆☆ | Volume: Medium | Effort: Medium
**Description:** People following Zapier, n8n, Make, Notion, HubSpot, or competitors are
actively researching tools in your space.
**Implementation plan:**
- Navigate to company page → "Followers" tab (requires being a page admin or using search)
- Alternative: LinkedIn search `people who follow "{company}"` in Boolean search
- Extract followers, filter by title
**Business outcome:** Follower of Zapier = someone evaluating automation options = your exact ICP.
~2-3% DM reply but very high ICP density.

### 11 — Product Hunt Makers
**Signal:** ★★★★☆ | Volume: Medium | Effort: Medium
**Description:** SaaS founders who launched on Product Hunt in the last 6 months are in growth
mode and have a working product.
**Implementation plan:**
- Scrape PH homepage / "launched today" / categories: AI, Productivity, Developer Tools
- Filter: recent launches (< 6 months), category = AI/SaaS/Productivity
- Extract maker names + Twitter/LinkedIn handles from PH maker profiles
- Cross-reference with LinkedIn search to find profile URL
**Scraper target:** producthunt.com/products?category=ai-tools&order=newest
**Business outcome:** PH makers have shipped a product = technical/execution capability, and are
in "growth mode" = exact buying intent for Social Growth System. ~3-5% DM reply.

### 12 — Indie Hackers Revenue-Verified Founders
**Signal:** ★★★★★ | Volume: Low | Effort: Low
**Description:** IH founders share MRR publicly. Filter $5K-$50K MRR = $60K-$600K ARR =
entering your ICP range with proven revenue.
**Implementation plan:**
- Scrape indiehackers.com/products?revenue=5000-50000
- Extract founder name + product + revenue
- Search LinkedIn: `"{founder name}" "{product name}"` to find profile
**Business outcome:** Revenue-verified = confirmed budget exists. Founders in this range need
systems to scale. Highest conversion probability of any channel. ~5-8% DM reply.

### 13 — Crunchbase Funded Companies
**Signal:** ★★★★☆ | Volume: Medium | Effort: Medium
**Description:** Seed/Series A in last 12 months = budget + urgency + growth mode.
**Implementation plan:**
- Crunchbase search: organizations funded in last 12 months, category = SaaS/AI/B2B, funding = Seed/Series A
- Use Crunchbase free tier API or scrape search results
- Extract company + founder name → LinkedIn people search
**Business outcome:** Fresh funding = "spend to grow" mindset. They have runway and are evaluating
vendors. Timing advantage — reach them before competitors do. ~4-6% DM reply.

### 14 — AppSumo Launches
**Signal:** ★★★☆☆ | Volume: Low | Effort: Low
**Description:** AppSumo founders need marketing scale urgently (their deal expires).
**Implementation plan:**
- Scrape appsumo.com/products (active deals)
- Extract product + maker name → LinkedIn search
**Business outcome:** Launching on AppSumo = growth hustle mode. Social Growth System pitch
is very direct fit. ~3-4% DM reply.

### 15 — Twitter/X Curated Founder Lists
**Signal:** ★★★☆☆ | Volume: Medium | Effort: Low
**Description:** VCs and startup journalists maintain public Twitter lists of founders (e.g.,
"SaaS founders I follow", "AI builders").
**Implementation plan:**
- Identify 10-20 high-quality public lists via Twitter search
- Scrape list members → extract Twitter handle + bio
- Cross-reference with LinkedIn search
**Business outcome:** Curation = quality filter done by someone with domain expertise. ~2-3% DM reply
but discovery of niche founders hard to find via LinkedIn alone.

### 16 — GitHub Intent Signals
**Signal:** ★★★★☆ | Volume: High | Effort: Medium
**Description:** Repos that use n8n workflows, Zapier webhooks, Make integrations, or manual CSV
imports signal "founder building automation manually" = perfect fit for AI Automation Build.
**Implementation plan:**
- GitHub API: search repos with `filename:*.json n8n` OR `filename:zap*.json` OR README contains "zapier"
- Filter: updated in last 6 months, stars < 100 (solo founder, not product)
- Extract repo owner → GitHub profile → find LinkedIn/Twitter handle
**Business outcome:** Developer-founders using Zapier/n8n manually are at the exact inflection
point where hiring you makes more sense than DIY. Highest-fit technical signal. ~4-7% reply.

### 17 — Funding Announcements (Real-time)
**Signal:** ★★★★☆ | Volume: Medium | Effort: Medium
**Description:** Monitor Crunchbase, TechCrunch, and LinkedIn's own funding announcement posts
for companies that just raised seed/Series A.
**Implementation plan:**
- LinkedIn content search: `"just raised" OR "seed round" OR "Series A" #SaaS`
- TechCrunch RSS feed filter for funding announcements
- Crunchbase API for recent rounds
**Business outcome:** Time-sensitive edge — reach founders in week 1-4 post-funding when they're
evaluating all vendors. ~5-8% reply rate in this window vs 2-3% cold.

### 18 — Alumni Networks (YC, Techstars, On Deck)
**Signal:** ★★★★☆ | Volume: Medium | Effort: Medium
**Description:** YC, Techstars, On Deck alumni are founder-dense communities. Many list their
alumni status in LinkedIn headline ("YC W22").
**Implementation plan:**
- LinkedIn people search: keyword "YC" OR "Y Combinator" OR "Techstars" OR "On Deck", title = Founder/CEO
- Add as SEARCH_STRATEGIES entries: `{ name: 'YC Alumni Founders', keywords: ['Y Combinator founder SaaS AI'], title: 'CEO OR Founder OR CTO', connectionDegree: '2nd' }`
**Business outcome:** Alumni networks = proven execution (got accepted) + growth ambition.
YC companies skew AI/SaaS heavily. ~3-5% reply.
**Note:** This is the lowest-effort backlog item — just 3 new entries in SEARCH_STRATEGIES.

### 19 — Referral Mining from Closed Clients
**Signal:** ★★★★★ | Volume: Low | Effort: Low
**Description:** Automated structured ask to happy clients: "Who do you know building with AI?"
**Implementation plan:**
- Trigger: when CRMLite contact reaches stage = `won` (project completed)
- Auto-queue a LinkedIn message: "Quick favor — who else in your network is trying to grow with AI automation? Happy to offer them a free strategy call."
- Route reply → CRMLite as new `referred_contact`
**Business outcome:** Referred prospects close at 3-5x the rate of cold outreach. Zero-cost channel
once the client base grows. ~20-40% DM reply, ~30-50% of those convert.

---

## Daemon Integration

All scrapers output a JSON array of:
```json
{
  "name": "Jane Smith",
  "profileUrl": "https://www.linkedin.com/in/janesmith/",
  "headline": "CEO @ AutomateStack | AI SaaS Founder",
  "engagementType": "liker|event_attendee|job_signal",
  "_strategy": "Post Reactors",
  "_source": "chrome"
}
```

The daemon's `scoreProspect()` function scores them and adds to `linkedin-dm-queue.json`.
No auto-send. Human approval required via `/approve` Telegram command or dashboard.

---

## Business Impact Projections

| Source | Prospects/week | Reply Rate | Meetings/week |
|--------|---------------|------------|---------------|
| Keyword search (current) | ~100 | 2-3% | 2-3 |
| + Post reactors (new) | +150 | 2-3% | +3-4 |
| + LinkedIn Events (new) | +60 | 4-8% | +3-5 |
| + Job posting signals (new) | +40 | 6-10% | +3-4 |
| **Total with 3 new sources** | **~350** | avg 3.5% | **~12** |

At 12 discovery meetings/week → 20% close rate → 2-3 clients/week → $5K-$7.5K revenue.
**Target: $5K/month hit within 4-6 weeks of running all three new sources.**
