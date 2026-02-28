# PRD-017: ResearchWorker — Staged Evidence Pipeline

**Status**: Drafting  
**Priority**: High  
**Owner**: Isaiah Dupree  
**Runtime**: Python daemon (actp-worker) + Supabase + Workflow Engine

---

## Problem

The current system does web research ad-hoc: browser.search and browser.fetch topics return raw page text that goes directly into Claude's context with no provenance, no quality scoring, no caching, and no memory integration pathway. Research work stalls silently, re-fetches the same URLs repeatedly, and results are never stored in a way other agents can reuse.

---

## Solution

A first-class **ResearchWorker** integrated into the existing 4-plane architecture:

- **Control plane** — `ResearchRequest` contracts (scheduled or on-demand), policy (freshness, domain allowlist, budget)
- **Data plane** — staged 6-step pipeline: plan → search → fetch+extract → rank → synthesize → propose
- **Memory plane** — separate storage for raw evidence, derived artifacts, and approved knowledge (gated)
- **Telemetry plane** — heartbeat per stage, structured events, stall detection, budget governor

---

## Core Contract

### ResearchRequest (what triggers research)

```json
{
  "type": "ResearchRequest",
  "request_id": "rr_abc123",
  "objective": "string — one-line goal",
  "questions": ["specific sub-question 1", "specific sub-question 2"],
  "constraints": {
    "freshness_days": 30,
    "allowed_domains": ["github.com", "docs.*", "arxiv.org"],
    "exclude_domains": [],
    "budget": { "max_fetches": 40, "max_tokens": 8000 }
  },
  "output_format": "evidence_pack_plus_recommendation",
  "must_include_citations": true,
  "triggered_by": "cron|chat|agent",
  "priority": "normal|high|urgent"
}
```

### EvidencePack (output before synthesis)

```json
{
  "type": "EvidencePack",
  "request_id": "rr_abc123",
  "sources": [
    {
      "source_id": "src_1",
      "url": "https://...",
      "fetched_at": "2026-02-25T20:00:00Z",
      "quality": { "authority": 0.8, "recency": 0.9, "specificity": 0.7 },
      "excerpts": [{ "text": "...", "offset": { "start": 120, "end": 340 } }],
      "hash": "sha256:..."
    }
  ],
  "extracted_facts": [
    {
      "claim_id": "c_1",
      "claim": "X supports feature Y",
      "supporting_sources": ["src_1"],
      "confidence": 0.78
    }
  ],
  "coverage_gaps": ["Could not find pricing data for Z"],
  "fetches_used": 12,
  "tokens_used": 3400
}
```

---

## Pipeline Stages (each checkpointed)

| Stage | Input | Output | Event |
|---|---|---|---|
| 1. **Clarify** | ResearchRequest | Research plan (queries, source strategy) | `research.plan_ready` |
| 2. **Search** | Plan | Candidate URLs + snippets | `research.sources_found` |
| 3. **Fetch+Extract** | URLs | Normalized excerpts + facts | `research.extracted` |
| 4. **Rank** | Facts + sources | Quality-scored source list | `research.ranked` |
| 5. **Synthesize** | Ranked facts | Claims linked to evidence (no hallucination) | `research.synthesized` |
| 6. **Propose** (optional) | Synthesis | Memory write proposals → gate | `research.proposals_ready` |

Each stage emits `research.stage_started`, `research.progress`, `research.stage_completed`.  
Each fetch emits a heartbeat updating `last_heartbeat_at`.

---

## Supabase Tables

### `actp_research_requests`
```sql
id uuid primary key default gen_random_uuid(),
request_id text unique not null,
objective text not null,
questions jsonb default '[]',
constraints jsonb default '{}',
output_format text default 'evidence_pack_plus_recommendation',
must_include_citations boolean default true,
triggered_by text default 'agent',
priority text default 'normal',
status text default 'pending',  -- pending|planning|searching|fetching|ranking|synthesizing|proposing|completed|failed
stage text,
stage_progress jsonb default '{}',
last_heartbeat_at timestamptz,
fetches_used int default 0,
tokens_used int default 0,
created_at timestamptz default now(),
completed_at timestamptz
```

### `actp_research_sources`
```sql
id uuid primary key default gen_random_uuid(),
request_id text references actp_research_requests(request_id),
source_id text not null,
url text not null,
fetched_at timestamptz,
authority_score float default 0,
recency_score float default 0,
specificity_score float default 0,
composite_score float default 0,
excerpts jsonb default '[]',
content_hash text,
blocked boolean default false,
created_at timestamptz default now()
```

### `actp_research_facts`
```sql
id uuid primary key default gen_random_uuid(),
request_id text references actp_research_requests(request_id),
claim_id text not null,
claim text not null,
supporting_sources jsonb default '[]',  -- source_ids
confidence float default 0,
verified boolean default false,
created_at timestamptz default now()
```

### `actp_research_results`
```sql
id uuid primary key default gen_random_uuid(),
request_id text references actp_research_requests(request_id) unique,
evidence_pack jsonb not null,
synthesis text,
recommendations jsonb default '[]',
citations jsonb default '[]',
coverage_gaps jsonb default '[]',
created_at timestamptz default now()
```

### `actp_memory_proposals`
```sql
id uuid primary key default gen_random_uuid(),
request_id text,
proposal_type text,  -- semantic|procedural|daily_note
target_file text,    -- ~/.memory/vault/KNOWLEDGE-GRAPH.md etc.
proposed_content text,
status text default 'pending',  -- pending|approved|rejected|quarantine
auto_approve_score float,       -- >= 0.85 and multi-source → auto-approve
approved_at timestamptz,
approved_by text default 'system',
created_at timestamptz default now()
```

---

## API Routes (ResearchLite extension or new service)

| Method | Route | Description |
|---|---|---|
| `POST` | `/research/requests` | Enqueue a ResearchRequest |
| `GET` | `/research/requests/{id}` | Status + current stage |
| `GET` | `/research/results/{id}` | EvidencePack + Synthesis |
| `POST` | `/research/heartbeats` | Worker liveness update |
| `POST` | `/memory/proposals` | Submit gated memory write |
| `GET` | `/memory/proposals` | List pending proposals |
| `POST` | `/memory/proposals/{id}/approve` | Approve + commit to vault |

---

## Worker Executors (actp-worker task types)

### `research_plan` executor
- Receives: ResearchRequest
- Calls: ContentLite `/api/generate/research-plan` (Claude Haiku)
- Outputs: list of search queries + domain strategy
- Checkpoints stage 1

### `research_fetch` executor
- Receives: URL list from plan
- Calls: browser.fetch per URL (via service_registry)
- Sanitizes: strips scripts/forms/hidden instructions (prompt injection defense)
- Domain allowlist enforcement
- Heartbeats every 5 fetches
- Checkpoints stage 3

### `research_synthesize` executor
- Receives: ranked facts from stage 4
- Calls: ContentLite `/api/generate/synthesis`
- Constraint: synthesis may only make claims that map to `claim_id` from EvidencePack
- Checkpoints stage 5

### `research_propose` executor
- Receives: synthesis + facts
- Evaluates auto-approve gate: confidence >= 0.85 AND supporting_sources >= 2
- Writes approved proposals to `~/.memory/vault/` files directly
- Quarantines borderline proposals for human review

---

## Retry Matrix

| Error type | Strategy |
|---|---|
| Network timeout | Exponential backoff + jitter, max 3 retries |
| HTTP 403 / blocked | Skip source, try alternate, log in coverage_gaps |
| Low-quality source | Lower composite_score, broaden query |
| Budget exceeded | Return partial EvidencePack with coverage_gap notes |
| Stage stall > 5 min | Restart stage from checkpoint |

---

## Security: Prompt Injection Defense

All fetched page content is sanitized before hitting any LLM:
1. Strip `<script>`, `<form>`, `<iframe>`, CSS, hidden elements
2. Truncate to 3000 chars per source
3. "System message firewall": fetched content passed as tool result, never as system/user message
4. Store content hash for audit/replay

---

## Scheduling (Control Plane Crons)

| Cron | Schedule | Objective |
|---|---|---|
| `competitor_pricing_watch` | Weekly Mon 6AM | Check competitor pricing changes |
| `docs_breaking_changes` | Daily 7AM | Watch key API docs for breaking changes |
| `revenue_benchmark_refresh` | Monthly 1st | Refresh revenue benchmarks + growth benchmarks |
| `stack_cve_monitor` | Daily 4AM | CVE alerts for stack dependencies |

---

## Integration with ClawBot (dispatch_actp_topic)

New topics added to service_registry:
- `research.enqueue` — start a research job from Telegram chat
- `research.status` — check research job status
- `research.results` — get latest synthesis for a topic
- `research.memory_proposals` — list pending memory proposals

Example from Telegram:
```
User: research the best TypeScript ORM options
→ TOOL_CALL: {"name": "dispatch_actp_topic", "arguments": {"topic": "research.enqueue", "params": {"objective": "best TypeScript ORM options", "questions": ["What are the most popular TypeScript ORMs?", "How do they compare on performance and DX?"]}}}
```

---

## Memory Write Path

```
EvidencePack
    ↓
actp_memory_proposals (status=pending)
    ↓ auto-gate (confidence≥0.85, sources≥2, recency≤30d)
    ↓
approved → write to ~/.memory/vault/KNOWLEDGE-GRAPH.md
           write to ~/.memory/vault/DAILY-NOTES/YYYY-MM-DD.md
quarantine → human review via Telegram notification
```

---

## Success Metrics

- P95 research job completes in < 3 minutes
- Zero hallucinations in synthesis (all claims traced to evidence)
- Memory proposal approval rate > 70%
- Budget governor prevents > 95% of cost overruns
- Stall rate < 5% (heartbeat + checkpoint prevents re-work)

---

## Implementation Order

1. Supabase tables (4 tables + memory_proposals)
2. `research_plan` + `research_fetch` executors in actp-worker
3. ResearchLite endpoint `POST /api/research/synthesize`
4. Memory proposal gate + vault writer
5. service_registry topics (research.enqueue, research.status, research.results)
6. Cron jobs (competitor_watch, cve_monitor)
7. ClawBot wiring via dispatch_actp_topic
