# multi-agent-dispatch — ACTP 9-Domain Agent Orchestrator

## Purpose
Implement and maintain the multi-agent dispatch architecture in `actp-worker`. Each of the 9 domain agents (prospect, ab-tester, scheduler, content-mix, youtube, trends, creators, outreach, remotion) has a corresponding Python module and CLAUDE.md. The dispatch layer in `multi_agent_dispatch.py` routes tasks to the correct module, logs every execution to Supabase, and enables the ACD to autonomously work on any domain.

## Project Location
`/Users/isaiahdupree/Documents/Software/actp-worker/`

## PRDs
- Master: `/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/docs/prd/PRD-029-MULTI-AGENT-ACTP-DISPATCH.md`
- Prospect: `PRD-030-PROSPECT-FUNNEL-SCORER.md`
- A/B Tester: `PRD-031-TWITTER-AB-POST-TESTER.md`
- Scheduler: `PRD-032-POSTING-SCHEDULE-OPTIMIZER.md`
- Content Mix: `PRD-033-CONTENT-MIX-NICHE-RESONANCE.md`
- YouTube: `PRD-034-YOUTUBE-ANALYTICS-MPLITE-INGEST.md`
- Trends: `PRD-035-CROSS-PLATFORM-ASSOCIATION-ENGINE.md`
- Creators: `PRD-036-TOP-CREATORS-MARKET-RESEARCH.md`
- Outreach: `PRD-037-STRATEGIC-DM-EMAIL-OUTREACH.md`
- Remotion: `PRD-038-REMOTION-CONTENT-PRODUCTION.md`

## Feature List
`/Users/isaiahdupree/Documents/Software/actp-worker/multi-agent-features.json`

## Tech Stack
- **Language**: Python 3.11+
- **Async**: asyncio + httpx
- **Database**: Supabase project `ivhfuhxorppptyuofbgq`
- **AI**: Anthropic Claude API (claude-3-5-haiku-20241022 for fast tasks, claude-3-5-sonnet-20241022 for briefs)
- **Posting**: Blotato API (`https://api.blotato.com/v2`), Safari Automation (ports 3003/3100/3102/3105/3106/3107)
- **Video**: Remotion MCP (localhost:3100)
- **Alerts**: Telegram Bot API

## Supabase Tables (use service_role key)
```
SUPABASE_URL=https://ivhfuhxorppptyuofbgq.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<from .env>
```

### Tables by Domain
| Domain | Read | Write |
|--------|------|-------|
| dispatch | — | actp_agent_tasks |
| prospect | crm_contacts, crm_interactions, crm_conversations, actp_platform_associations | actp_prospect_scores |
| ab-tester | actp_posting_schedule | actp_ab_tests, actp_content_performance |
| scheduler | actp_content_performance, actp_ab_tests | actp_posting_schedule |
| content-mix | actp_content_performance, actp_niche_resonance | — |
| youtube | youtube_video_stats | actp_content_performance, actp_niche_resonance |
| trends | actp_platform_research, actp_twitter_research, youtube_video_stats, crm_contacts | actp_platform_associations, actp_cross_platform_trends |
| creators | actp_platform_creators | actp_platform_creators, crm_contacts |
| outreach | actp_prospect_scores, crm_contacts, crm_conversations, crm_interactions | crm_message_queue |
| remotion | actp_niche_resonance | actp_gen_jobs |

### Critical Column Names (confirmed from Supabase — DO NOT GUESS)
```python
# actp_prospect_scores
funnel_stage    # NOT 'stage'
research_data   # Claude-generated brief JSON
research_done   # boolean
offer_readiness # 0-100
icp_fit         # 0-100
next_touch_type # 'dm' | 'email' | 'twitter'

# crm_message_queue
message_body    # NOT 'message'
message_type    # 'outreach' | 'follow_up' | 'value_add'
ai_reasoning    # text (funnel stage context)

# actp_platform_associations
engagement_type # NOT 'match_confidence'
# NO updated_at column

# actp_content_performance
external_id     # NOT 'post_id'
comments_count  # NOT 'comments'
watch_time_minutes # NOT 'watch_time_min'
offer_tags      # text[] ARRAY (NOT single text)

# actp_niche_resonance
avg_watch_time  # NOT 'avg_watch_time_minutes'
top_hook_patterns # text[]
offer_tag       # singular (modal offer in group)
last_updated    # NOT 'updated_at'
# UNIQUE(platform, niche, offer_tag, content_type)

# actp_twitter_research
tweet_text      # NOT 'text'
scraped_at      # NOT 'created_at'

# youtube_video_stats
views           # NOT 'view_count'
likes           # NOT 'like_count'
```

## Domain Module Map
```python
DOMAIN_MODULES = {
    "prospect":    "prospect_funnel_scorer.py",
    "ab-tester":   "ab_post_tester.py",
    "scheduler":   "growth_orchestrator.py",
    "content-mix": "growth_orchestrator.py",
    "youtube":     "youtube_mplite_ingest.py",
    "trends":      "platform_association_engine.py",
    "creators":    "growth_orchestrator.py",
    "outreach":    "strategic_outreach.py",
    "remotion":    "remotion_content_producer.py",
}
```

## API Keys & Service URLs
```
ANTHROPIC_API_KEY=<from .env>
TELEGRAM_BOT_TOKEN=<from .env>
TELEGRAM_CHAT_ID=<from .env>
BLOTATO_API_KEY=<from .env>
BLOTATO_API_URL=https://api.blotato.com/v2
MARKET_RESEARCH_URL=http://localhost:3106
REMOTION_URL=http://localhost:3100
```

## Account IDs (Blotato)
```python
BLOTATO_ACCOUNTS = {
    "twitter":   4151,   # @IsaiahDupree7
    "tiktok":    710,    # @isaiah_dupree
    "instagram": 807,    # @the_isaiah_dupree
    "threads":   173,
    "youtube":   228,
    "linkedin":  571,
}
```

## Safari DM Service Ports
```python
DM_PORTS = {
    "instagram": 3100,
    "twitter":   3003,
    "tiktok":    3102,
    "linkedin":  3105,
}
```

## Key CLI Commands (ACD must be able to run these)
```bash
# Dispatch layer
python3 multi_agent_dispatch.py --list
python3 multi_agent_dispatch.py --domain prospect --task score-all
python3 multi_agent_dispatch.py --domain trends --task detect
python3 multi_agent_dispatch.py --domain outreach --task due
python3 multi_agent_dispatch.py --domain outreach --task build-queue
python3 multi_agent_dispatch.py --domain youtube --task analyze
python3 multi_agent_dispatch.py --domain creators --task sync --params '{"platform":"twitter","niche":"ai_automation"}'
python3 multi_agent_dispatch.py --domain ab-tester --task checkback
python3 multi_agent_dispatch.py --domain remotion --task pipeline --params '{"platform":"tiktok"}'
python3 multi_agent_dispatch.py --all
python3 multi_agent_dispatch.py --status

# Direct module CLI (for debugging individual domains)
python3 prospect_funnel_scorer.py --top 10
python3 strategic_outreach.py --due
python3 platform_association_engine.py --trends
python3 youtube_mplite_ingest.py --summary
python3 ab_post_tester.py --status
python3 growth_orchestrator.py --content-mix --platform tiktok
python3 remotion_content_producer.py --queue
```

## E2E Test Suite
`/Users/isaiahdupree/Documents/Software/actp-worker/tests/test_multi_agent_e2e.py`

Run tests:
```bash
cd /Users/isaiahdupree/Documents/Software/actp-worker
python3 -m pytest tests/test_multi_agent_e2e.py -v
```

## Working Rules for ACD

### 1. Never guess column names
Always verify against the "Critical Column Names" section above before writing any Supabase insert/update/upsert. When in doubt: `python3 -c "from supabase import create_client; sb = create_client(...); print(sb.table('TABLE').select('*').limit(1).execute())"` to inspect the real schema.

### 2. Test against real Supabase (no mocks)
All features must work with real Supabase data. Use `--dry-run` for outreach sends, but Supabase reads and writes must be real.

### 3. Telegram alerts are required for these events:
- Daily sweep complete (domain count pass/fail)
- New decision-stage prospect found
- A/B test winner declared
- Cross-platform trend spike (3+ niches)
- Remotion render complete
- Any platform saturation detected (engagement drops > 30%)

Telegram send:
```python
import httpx, os
def send_telegram(msg: str):
    httpx.post(
        f"https://api.telegram.org/bot{os.environ['TELEGRAM_BOT_TOKEN']}/sendMessage",
        json={"chat_id": os.environ["TELEGRAM_CHAT_ID"], "text": msg, "parse_mode": "HTML"}
    )
```

### 4. Feature list update
After completing a feature, update its `status` to `"done"` and `passes` to `true` in `multi-agent-features.json`.

### 5. Agent task logging (mandatory)
Every dispatch execution MUST write to `actp_agent_tasks`:
```python
sb.table("actp_agent_tasks").insert({
    "domain": domain,
    "task": task,
    "params": params,
    "status": "ok" | "error",
    "result": {"stdout": ..., "returncode": ...},
    "duration_ms": ms,
    "completed_at": datetime.utcnow().isoformat()
}).execute()
```

### 6. Error handling pattern
```python
try:
    result = run_domain_task(domain, task, params)
    status = "ok"
except Exception as e:
    result = {"error": str(e)}
    status = "error"
    send_telegram(f"⚠️ Agent error: {domain}.{task}\n{str(e)[:200]}")
finally:
    log_to_agent_tasks(domain, task, status, result, duration_ms)
```

## Outstanding Features (prioritized for ACD)

Pick up features from `multi-agent-features.json` where `status != "done"` in priority order:

### P1 — High Impact, Implement First
1. **PROS-004** — Research trigger: score >= 65 → Claude brief → `actp_prospect_scores.research_data`
2. **OUTR-004** — Claude-generated personalized DM for decision-stage contacts
3. **OUTR-005** — `--send` dispatches via Safari DM services (Instagram:3100, Twitter:3003)
4. **DISP-004** — `--all` runs all 9 domains + sends Telegram summary
5. **ABTS-005** — Telegram alert when A/B test winner declared
6. **TRND-005** — Telegram alert when 3+ cross-platform trends detected
7. **CRTR-003** — Qualified creators seeded to `crm_contacts`
8. **REMO-004** — `distribute_to_platforms` with blotato_multi_publish workflow task
9. **CMIX-003** — Content gap → auto-trigger Remotion pipeline

### P2 — Expand Capabilities Next
10. **SCHD-002** — Thompson Sampling slots initialization in `actp_posting_schedule`
11. **SCHD-003** — Saturation detection + Telegram alert
12. **ABTS-006** — Feed winning hooks back to `actp_niche_resonance`
13. **E2E-006** — Register 9 agents in `service_registry.py`

## File Structure Reference
```
actp-worker/
├── multi_agent_dispatch.py        ← Central dispatch (EXISTS)
├── prospect_funnel_scorer.py      ← Prospect domain (EXISTS)
├── ab_post_tester.py              ← A/B tester domain (EXISTS)
├── growth_orchestrator.py         ← Scheduler + content-mix + creators (EXISTS)
├── youtube_mplite_ingest.py       ← YouTube domain (EXISTS)
├── platform_association_engine.py ← Trends domain (EXISTS)
├── strategic_outreach.py          ← Outreach domain (EXISTS)
├── remotion_content_producer.py   ← Remotion domain (EXISTS)
├── multi-agent-features.json      ← Feature tracking (EXISTS)
├── .claude/agents/
│   ├── prospect/CLAUDE.md
│   ├── ab-tester/CLAUDE.md
│   ├── scheduler/CLAUDE.md
│   ├── content-mix/CLAUDE.md
│   ├── youtube/CLAUDE.md  (note: was youtube-analytics)
│   ├── trends/CLAUDE.md
│   ├── creators/CLAUDE.md
│   ├── outreach/CLAUDE.md
│   └── remotion/CLAUDE.md
└── tests/
    ├── test_multi_agent_e2e.py    ← E2E test suite (to create)
    └── test_clawbot_acd_dispatch.py
```
