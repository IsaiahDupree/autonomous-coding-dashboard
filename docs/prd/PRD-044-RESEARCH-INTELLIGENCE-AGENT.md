# PRD-044 — Research Intelligence Agent

**Status:** Draft  
**Priority:** P1  
**Domain:** `research_intel`  
**Module:** `actp-worker/research_intel_agent.py`  
**Supabase Project:** ivhfuhxorppptyuofbgq  
**Related Tables:** actp_research_queue, actp_research_briefs, actp_prospect_scores, crm_contacts

---

## Overview

The Research Intelligence Agent performs deep, automated research on high-value prospects and niche topics when signals indicate offer-readiness. It combines web research (Perplexity API), social profile scraping (LinkedIn via port 3105, Twitter/Threads research APIs), YouTube content history, and Claude synthesis to produce a **Research Brief** — a concise intelligence document that tells us exactly what a prospect cares about, what they've built, what problems they face, and how our offer maps to their current needs.

---

## Goals

1. Produce a Research Brief within 5 minutes when a contact's score crosses 65 or `icp_fit ≥ 70`.
2. Research 5 dimensions per prospect: LinkedIn background, recent social posts, YouTube/content history, business model, and offer-fit analysis.
3. Store briefs in `actp_research_briefs` with structured JSON output.
4. Surface research briefs in the CRM daily brief so outreach writers have full context.
5. Track research queue with priority, status, and processing time.
6. Also support niche-level research: "What are the top 5 problems AI automation tools solve for creators in 2026?"
7. Send Telegram alert when a high-priority brief is complete.

---

## Architecture

```
multi_agent_dispatch.py / crm_intelligence_agent.py
  └─► research_intel_agent.py
        ├─► actp_research_queue   (input: pending research tasks)
        ├─► Research Sources:
        │     LinkedIn profile    → :3105/api/linkedin/profile/extract-current
        │     Twitter posts       → :3007/api/research/twitter/search (author filter)
        │     Threads posts       → :3004/api/research/threads/search (author filter)
        │     YouTube history     → actp_content_performance (our YT tagging data)
        │     Web/Perplexity      → Perplexity API (PERPLEXITY_API_KEY)
        │     CRM history         → crm_messages, crm_conversations
        ├─► Claude synthesis      → structured Research Brief JSON
        └─► actp_research_briefs  (output: stored briefs)
```

---

## Research Dimensions

For each prospect, the agent researches and synthesizes:

| Dimension | Source | Key Questions |
|-----------|--------|---------------|
| Professional Background | LinkedIn (3105) | Role, company, years of experience, mutual connections |
| Recent Social Activity | Twitter/Threads APIs | Last 20 posts: topics, tone, engagement, content themes |
| Content Creator Profile | YouTube/IG history | Uploads, views, niche, growth trajectory |
| Business Model | Web + LinkedIn | Product/service type, target market, revenue signals |
| Offer Fit Analysis | Claude synthesis | How does our offer map to their specific pain points? |

---

## Supabase Tables

### `actp_research_queue` (new)
```sql
CREATE TABLE actp_research_queue (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id     UUID REFERENCES crm_contacts(id),
  niche          TEXT,                -- for niche-level research
  research_type  TEXT NOT NULL,       -- prospect | niche | competitor | trend
  trigger_reason TEXT,               -- score_threshold | icp_fit | manual
  priority       INTEGER DEFAULT 5,  -- 1=highest
  status         TEXT DEFAULT 'pending',  -- pending | processing | complete | failed
  brief_id       UUID,               -- set when complete
  created_at     TIMESTAMPTZ DEFAULT now(),
  started_at     TIMESTAMPTZ,
  completed_at   TIMESTAMPTZ,
  processing_ms  INTEGER
);
CREATE INDEX ON actp_research_queue(status, priority, created_at);
```

### `actp_research_briefs` (new)
```sql
CREATE TABLE actp_research_briefs (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id     UUID REFERENCES crm_contacts(id),
  niche          TEXT,
  research_type  TEXT NOT NULL,
  linkedin_data  JSONB,
  social_posts   JSONB,   -- recent posts array
  content_profile JSONB,
  business_model JSONB,
  offer_fit      JSONB,   -- {fit_score, pain_points[], opportunity, suggested_angle}
  full_brief     TEXT,    -- Claude-synthesized narrative (500-1000 words)
  key_facts      JSONB,   -- [{fact, source}] top 5-7 facts
  outreach_angle TEXT,    -- single-sentence outreach angle recommendation
  confidence     INTEGER, -- 0-100 research confidence score
  sources_used   TEXT[],
  created_at     TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX ON actp_research_briefs(contact_id);
CREATE INDEX ON actp_research_briefs(created_at DESC);
```

---

## Research Brief Output Format

```json
{
  "contact_id": "...",
  "name": "Julian Goldie",
  "research_type": "prospect",
  "linkedin_data": {
    "headline": "SEO & Link Building Expert",
    "company": "Goldie Agency",
    "location": "UK",
    "connections": 5000,
    "mutual": 3
  },
  "social_posts": [
    {"platform": "twitter", "text": "...", "engagement": 847, "topic": "ai_seo"}
  ],
  "offer_fit": {
    "fit_score": 78,
    "pain_points": ["manual content creation", "scaling YouTube production"],
    "opportunity": "He's talking about AI automation but hasn't tried Safari-based posting",
    "suggested_angle": "Show him how we automate Threads/Twitter posting + track performance"
  },
  "outreach_angle": "Reference his recent AI SEO post + offer to show him our Threads automation",
  "key_facts": [
    "Posted 3 times about AI automation this week",
    "Has a YouTube channel with 180K subscribers",
    "Recently mentioned struggling with content consistency"
  ],
  "full_brief": "Julian Goldie is a UK-based SEO expert...",
  "confidence": 82
}
```

---

## CLI Interface

```bash
python3 research_intel_agent.py --queue                           # show pending research tasks
python3 research_intel_agent.py --process                         # process all pending queue items
python3 research_intel_agent.py --process --priority 1            # process P1 items only
python3 research_intel_agent.py --research CONTACT_ID             # immediate research on contact
python3 research_intel_agent.py --niche "ai automation"           # niche-level research brief
python3 research_intel_agent.py --brief BRIEF_ID                  # display a stored brief
python3 research_intel_agent.py --brief CONTACT_ID                # most recent brief for contact
python3 research_intel_agent.py --status                          # queue stats + recent briefs
python3 research_intel_agent.py --competitor HANDLE               # research a competitor profile
python3 research_intel_agent.py --trend "ai automation" --days 7  # recent trend analysis
python3 research_intel_agent.py --enrich-all                      # research all decision-stage contacts
```

### Dispatch Integration
```python
AGENTS["research_intel"] = {
    "process": ("research_intel_agent.py", ["--process"]),
    "queue":   ("research_intel_agent.py", ["--queue"]),
    "status":  ("research_intel_agent.py", ["--status"]),
    "enrich":  ("research_intel_agent.py", ["--enrich-all"]),
    "niche":   ("research_intel_agent.py", ["--niche", "ai_automation"]),
}
```

---

## Claude Synthesis Prompt

```
You are a strategic research analyst. Given the following data about a prospect,
produce a structured Research Brief in JSON format.

Focus on:
1. What business they're building and where they are in their journey
2. What problems they're publicly discussing (pain points)
3. How our offer (Safari automation + Threads/Twitter posting + analytics) maps to their needs
4. The single best outreach angle we should use
5. Key facts that will help personalize outreach

Be specific. Cite actual posts and data. No generic filler.
```

---

## Cron Schedule

| Job | Schedule | Action |
|-----|----------|--------|
| `research_process_queue` | Every 30 min | `--process --priority 1` |
| `research_enrich_decision` | Daily 7 AM | `--enrich-all` |
| `research_niche_trends` | Mon/Thu 6 AM | `--trend` for each primary niche |

---

## Telegram Alerts

```
🔍 Research Brief Ready
Contact: Julian Goldie
Score: 68 | Offer Fit: 78%
Angle: Reference his recent AI SEO post + automation consistency struggle
Key insight: 3 posts this week about AI tools, YouTube scaling pain
View brief: /brief/{id}

📋 Research Queue
Pending: 4 | Processing: 1 | Complete today: 6
Avg processing time: 3m 12s
```

---

## Acceptance Criteria

- [ ] `--process` picks up items from `actp_research_queue` and produces complete briefs
- [ ] Each brief contains all 5 dimensions: LinkedIn, social, content, business, offer_fit
- [ ] `--research CONTACT_ID` produces brief within 5 minutes
- [ ] `offer_fit.fit_score` ranges 0-100 and reflects actual alignment
- [ ] `outreach_angle` is single-sentence and contact-specific
- [ ] Briefs stored in `actp_research_briefs` with correct `contact_id` FK
- [ ] `--queue` shows accurate pending/processing counts
- [ ] Telegram alert fires on brief completion for priority-1 contacts
- [ ] `multi_agent_dispatch.py --domain research_intel --task process` runs cleanly

---

## ACD Enhancement Tasks

1. Implement `research_intel_agent.py` with all CLI flags
2. Create Supabase migrations for `actp_research_queue`, `actp_research_briefs`
3. Implement LinkedIn data fetching via port 3105
4. Implement social post search by author handle via Twitter/Threads research APIs
5. Implement Claude synthesis with structured JSON output validation
6. Add `--competitor` mode for competitor analysis briefs
7. Add `--trend` mode for niche-level trend research
8. Wire Telegram alert on brief completion for decision-stage contacts
