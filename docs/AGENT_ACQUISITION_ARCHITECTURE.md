# Agent Acquisition Architecture
### Which services need humans, which run on agents, and how agents acquire clients autonomously

---

## Part 1 — Service Taxonomy: Human vs Agent

### ✅ Fully Agentic (runs without human involvement day-to-day)

| Service | Why It's Agentic | Human Role |
|---|---|---|
| **LinkedIn Lead Generation** | Prospecting, ICP scoring, connection requests, message sequences — all automated | One-time: define ICP criteria + approve message templates |
| **Social Media DM Outreach** | Research → qualify → warm-up comments → DM → follow-up → sync inbox | One-time: set niche + message tone. Ongoing: respond to replies that book calls |
| **AI Content Engine** | Research niche → generate content → AI review gate → publish → track performance | One-time: brand voice setup. Monthly: review strategy report |
| **BlogCanvas Pipeline** | Multi-agent: keyword research → outline → draft → SEO → publish to CMS | One-time: connect CMS + brand brief. Review drafts optionally |
| **KindLetters Campaigns** | Generate personalized letters from CRM data → send via Thanks.io | One-time: approve letter template. Per-campaign: define segment |
| **Market Intelligence Reports** | Weekly niche scrape → creator ranking → framework extraction → Supabase | One-time: set niches to track |

---

### ⚠️ Human-in-the-Loop (agent does 70-80%, human approves/closes)

| Service | What Agent Does | What Human Does |
|---|---|---|
| **Copywriting (AI-leveraged)** | Researches niche, scrapes top-performing copy, generates drafts, runs variant scoring | Refines voice, edits final, delivers to client, handles revisions |
| **Mobile App Development (ACD)** | Harness builds features from PRDs, auto-commits, tracks progress | Architects features, communicates with client, QA, deployment |
| **Ad Creative Testing** | Generates creatives, deploys to ad accounts, tracks performance, graduates winners | Defines offer, sets budget, approves creatives, reads reports |

---

### 👤 Human-Led (agent is a tool, not the operator)

| Service | Why Human Required |
|---|---|
| **Sales calls / discovery calls** | Trust, nuance, objection handling, relationship |
| **Brand strategy / positioning** | Requires deep client understanding and judgment |
| **ICP definition** | Human needs to define who is truly a fit |
| **AI Dev Pipeline consulting** | Requires architecture decisions and onboarding |
| **Closing high-ticket clients** | Relationship, negotiation, contract |

---

## Part 2 — The Autonomous Acquisition Pipeline

For all fully agentic services, agents don't just deliver the service — **they also acquire the clients**.  
This is the core loop: agents find prospects, warm them up, pitch the service, and route interested ones to close.

### The 7-Stage Acquisition DAG

```
┌─────────────────────────────────────────────────────────────┐
│                   ORCHESTRATOR                              │
│         (Workflow Engine + safari_cloud_controller)         │
└──────────────────────┬──────────────────────────────────────┘
                       │
          ┌────────────▼────────────┐
          │  Stage 1: DISCOVER      │  Research Agent
          │  Find active prospects  │  Market Research API (3106)
          │  in target niche        │  → crm_creators, crm_market_research
          └────────────┬────────────┘
                       │
          ┌────────────▼────────────┐
          │  Stage 2: QUALIFY       │  ICP Scoring Agent
          │  Score each prospect    │  crm_brain.py --score (Claude)
          │  0-100 against ICP      │  Filter: score >= 65
          └────────────┬────────────┘
                       │
          ┌────────────▼────────────┐
          │  Stage 3: WARM UP       │  Engagement Agent
          │  Comment on 2-3 posts   │  Comment services (3005/3006/3007/3004)
          │  over 3-5 days          │  → crm_messages (type=comment)
          └────────────┬────────────┘
                       │ (wait 3-5 days)
          ┌────────────▼────────────┐
          │  Stage 4: OUTREACH      │  Outreach Agent
          │  Send personalized DM   │  crm_brain.py --generate --send
          │  using their top posts  │  DM services (3001/3003/3102/3105)
          │  as context for Claude  │  → crm_messages (type=dm)
          └────────────┬────────────┘
                       │ (wait 3 days)
          ┌────────────▼────────────┐
          │  Stage 5: CHECK REPLY   │  Sync Agent
          │  Pull inbox → Supabase  │  crm_brain.py --sync
          └──────┬─────────┬────────┘
                 │ replied │ no reply
          ┌──────▼──┐   ┌──▼──────────────────┐
          │ FLAG FOR│   │  Stage 6: FOLLOW UP  │  Follow-up Agent
          │ HUMAN   │   │  Day 4 message       │  Stage-aware crm_brain
          │ (notify)│   │  Day 7 message       │  → crm_message_queue
          └─────────┘   │  Then archive        │
                        └──────────────────────┘
```

---

## Part 3 — Agent Roles & Tools

### Agent 1 — Research Agent
**Job:** Discover high-quality prospects in a target niche.  
**Trigger:** Weekly cron or manual `--niche` flag  
**Tools:**
- Market Research API (`POST /api/research/{platform}/search`) — top posts + creators
- Competitor research (`/api/research/{platform}/niche`) — top 100 by engagement
- TikTok enrichment — pull follower count from live profile page

**Output:** `crm_creators` rows + `crm_contacts` rows with `pipeline_stage = 'new'`

```bash
# Run manually
python3 scripts/test_crm_e2e.py --suite market

# Or directly
curl -X POST http://localhost:3106/api/research/instagram/niche \
  -d '{"niche": "ai automation", "maxCreators": 50}'
```

---

### Agent 2 — ICP Scoring Agent
**Job:** Score each prospect against ideal customer profile. Filter low-fit contacts.  
**Trigger:** After Research Agent runs  
**Tools:**
- Claude API (via crm_brain.py `--score`) — 0-100 score + reasoning
- Reads: `crm_contacts` where `relationship_score IS NULL`
- Updates: `crm_contacts.relationship_score`, `crm_score_history`

**ICP criteria (configurable per service):**
- Is a creator/founder with active social presence
- Posts about relevant niche
- Has engagement (not bot accounts)
- Not already a customer

```bash
python3 scripts/crm_brain.py --score
```

**Routing:**
- Score 75–100 → priority queue → fast-track to outreach
- Score 50–74 → standard queue → warm-up first
- Score < 50 → archive, skip outreach

---

### Agent 3 — Engagement (Warm-up) Agent
**Job:** Comment on prospect's recent posts before cold DMing. Builds recognition.  
**Trigger:** Contact enters `pipeline_stage = 'warming'`  
**Tools:**
- Instagram comments (port 3005)
- Twitter comments (port 3007)
- TikTok comments (port 3006)
- Threads comments (port 3004)
- Claude-generated context-aware comments (`useAI: true` on Twitter)

**Rules:**
- 2-3 comments spread across 3-5 days (not same day — looks spammy)
- Never comment more than once per post
- Comment on their best-performing recent posts (from `crm_market_research`)

**Output:** `crm_messages` rows with `message_type = 'comment'`, triggers DM after warmup window

```bash
# Direct call (Twitter)
curl -X POST http://localhost:3007/api/twitter/comments/post \
  -d '{"postUrl": "https://x.com/...", "useAI": true}'
```

---

### Agent 4 — Outreach Agent
**Job:** Send personalized first DM using Claude to write from their content context.  
**Trigger:** Contact completes warmup window, enters `pipeline_stage = 'contacted'`  
**Tools:**
- crm_brain.py `--generate` — Claude reads their top posts + score reasoning, writes a value-first DM
- crm_brain.py `--send` — routes to correct platform DM service
- Supabase `crm_message_queue` — holds generated messages before send
- Rate-limit enforcement per platform (enforced in each DM service)

**Message framework (Claude-generated):**
1. Reference something specific from their content (shows real attention)
2. One-line relevant observation or compliment
3. Offer a specific insight or resource relevant to their niche
4. Soft CTA (not a hard sell — "would this be useful to you?")

```bash
python3 scripts/crm_brain.py --generate  # generates messages, stages in queue
python3 scripts/crm_brain.py --send      # sends from queue, updates pipeline stage
```

---

### Agent 5 — Follow-up Agent
**Job:** Run stage-aware follow-up sequences. Handle no-reply branches.  
**Trigger:** Time-based (days since last outbound with no inbound reply)  
**Tools:**
- crm_brain.py `--pipeline` with stage checks
- Reads: `crm_contacts` where `pipeline_stage = 'contacted'` and `last_outbound_at < NOW() - interval '3 days'`
- Generates follow-up #1 (day 4): different angle, same value-first approach
- Generates follow-up #2 (day 7): final, low-pressure, close the loop

**Reply detected → Human notification route:**
- If `last_inbound_at > last_outbound_at` → update `pipeline_stage = 'replied'`
- Trigger notification (email/Slack/Apple notification) for human to respond
- Human takes over for the close

```bash
# Full pipeline run — handles all stages automatically
python3 scripts/crm_brain.py --pipeline
```

---

### Agent 6 — Reporting Agent
**Job:** Weekly summary of acquisition pipeline performance.  
**Trigger:** Weekly cron (e.g., every Monday 9AM)  
**Output:**
```
Week of Feb 24 – Mar 2, 2026
──────────────────────────────
Prospects discovered:     47
Qualified (score ≥ 65):   22  (47%)
Warmup comments sent:     31
DMs sent:                 18
Replies received:          4  (22%)
Calls booked:              1
Pipeline stage breakdown:
  new:         12
  warming:      8
  contacted:    6
  replied:      4
  call_booked:  1
  closed:       0
```

---

### Agent 7 — Orchestrator
**Job:** Coordinates all agents. Schedules runs, passes state between stages, handles errors.  
**Tools:**
- Workflow Engine (Vercel DAG runner)
- `safari_cloud_controller.py --daemon` (local executor)
- Supabase `safari_command_queue` (cloud → local bridge)
- `crm_contacts.pipeline_stage` (shared state machine)

**Scheduled runs:**
```
Daily 6AM:    Research Agent      (discover new prospects)
Daily 7AM:    ICP Scoring Agent   (score new contacts)
Daily 8AM:    Engagement Agent    (send warmup comments)
Daily 9AM:    Outreach Agent      (send pending DMs)
Daily 10AM:   Sync Agent          (pull inboxes → Supabase)
Daily 11AM:   Follow-up Agent     (handle no-reply sequences)
Monday 9AM:   Reporting Agent     (weekly pipeline report)
```

---

## Part 4 — Acquisition Architecture Per Agentic Service

### LinkedIn Lead Generation Service

```
Research Agent:    li_prospect.py --search --query "agency owner" --limit 50
                   → Scrapes LinkedIn search, extracts profiles
                       ↓
ICP Scoring:       Claude scores: "Does this person run an agency with 2-20 people
                   and would benefit from automated lead generation?"
                       ↓
Connection:        li_prospect.py --connect --limit 5
                   → Sends connection request with personalized note
                       ↓
[Accept detected]
                       ↓
Message:           crm_brain.py --generate (LinkedIn-specific template)
                   POST /api/linkedin/messages/send-to
                   → Value-first intro + what you do + CTA
                       ↓
Follow-up:         Day 4, Day 7 if no reply
```

**Target niche for this service:** B2B founders, agency owners, recruiters

---

### Social Media Outreach Service (selling this to others)

The meta play: use the service to sell the service.

```
Research Agent:    Market Research API → "social media agency"
                   Find: agencies that post about client acquisition, growth
                       ↓
ICP Scoring:       "Does this agency owner struggle with consistent lead flow?
                   Are they posting about needing more clients?"
                       ↓
Warm-up:           Comment on their posts about outreach challenges
                   ("This is exactly why I built something around this...")
                       ↓
DM:                "I noticed you're talking about [specific challenge].
                   I run an automated outreach system for agencies.
                   Would a quick demo of what it can do be useful?"
                       ↓
Reply → Human handles call → Close
```

---

### AI Content Engine (selling to creators/brands)

```
Research Agent:    Find creators posting about "burning out on content"
                   or "struggling to stay consistent"
                       ↓
ICP Scoring:       "Has 5k-100k followers, posts inconsistently (gaps > 7 days),
                   content is good but output is low"
                       ↓
Warm-up:           Thoughtful comments on their content strategy posts
                       ↓
DM:                "Your content is genuinely good — the ideas are there.
                   I help creators like you publish 3x as often with an
                   AI system I built. Here's what it generated for a similar
                   account last week: [example]. Would this be useful?"
                       ↓
Reply → Human shows demo → Close
```

---

## Part 5 — State Machine (crm_contacts.pipeline_stage)

```
         ┌─────────┐
         │  new    │  ← Research Agent discovers
         └────┬────┘
              │ ICP score ≥ 65
         ┌────▼────────┐
         │  qualified  │  ← ICP Scoring Agent approves
         └────┬────────┘
              │ warmup started
         ┌────▼────────┐
         │  warming    │  ← Engagement Agent commenting
         └────┬────────┘
              │ 3-5 days elapsed
         ┌────▼────────┐
         │  contacted  │  ← Outreach Agent sends DM
         └────┬────────┘
              │                │ replied
         ┌────▼────────┐  ┌────▼────────┐
         │ follow_up_1 │  │  replied    │  ← Sync Agent detects reply
         └────┬────────┘  └────┬────────┘
              │                │ human notified
         ┌────▼────────┐  ┌────▼────────┐
         │ follow_up_2 │  │ call_booked │  ← Human schedules call
         └────┬────────┘  └────┬────────┘
              │ no reply       │
         ┌────▼────────┐  ┌────▼──────────┐
         │  archived   │  │ closed_won /  │
         └─────────────┘  │ closed_lost   │
                          └───────────────┘
```

---

## Part 6 — What Still Needs a Human

These are the moments where human judgment or relationship is irreplaceable:

1. **Defining the ICP** — Who is the ideal client? What are the disqualifiers? One-time setup.
2. **Approving message templates** — Tone, offer, CTA. Review quarterly.
3. **Responding to replies** — Agents flag hot leads; human handles the conversation from `replied` stage onward.
4. **Sales calls** — Close the deal. This is where your copywriting skill converts.
5. **Client onboarding** — First 30 days: access, setup, expectation setting.
6. **Reviewing weekly reports** — Adjust ICP scoring, message quality, niche targeting based on data.

**Time investment per week once fully running: ~3–5 hours.**  
The rest is agents.

---

## Quick Start — Run the Acquisition Loop Now

```bash
# 1. Start all services
bash /Users/isaiahdupree/Documents/Software/Safari\ Automation/scripts/start-services.sh

# 2. Run one full acquisition cycle (discover → score → sync)
python3 scripts/crm_brain.py --pipeline

# 3. Check pipeline state
python3 scripts/safari_cloud_controller.py --status

# 4. See who's in each stage
# → Supabase: SELECT pipeline_stage, COUNT(*) FROM crm_contacts GROUP BY 1;

# 5. Start the cloud daemon (runs acquisition loop every 30s)
python3 scripts/safari_cloud_controller.py --daemon
```
