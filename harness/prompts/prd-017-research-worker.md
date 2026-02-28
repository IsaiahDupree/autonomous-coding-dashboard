# PRD-017: ResearchWorker — Staged Evidence Pipeline

## Project
- **Repo**: /Users/isaiahdupree/Documents/Software/actp-worker
- **PRD**: /Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/docs/prd/PRD-017-RESEARCH-WORKER.md
- **Priority**: High

## Context

Web research is currently ad-hoc: `browser.search` and `browser.fetch` topics return raw page text directly into Claude's context with no provenance, no quality scoring, no caching, and no memory integration. Research re-fetches the same URLs repeatedly and results are never stored for reuse.

### Current State
- `service_registry.py` has `browser.search` and `browser.fetch` topics (raw, no pipeline)
- No evidence store, no caching, no deduplication
- Research work stalls silently with no stall detection

### Target Architecture: 6-Stage Pipeline
```
ResearchRequest
  → Stage 1: Planner       (decompose → sub-questions + search queries)
  → Stage 2: Searcher      (web search, respect domain allowlist + freshness)
  → Stage 3: Fetcher       (fetch URLs, extract clean text, strip boilerplate)
  → Stage 4: Ranker        (score relevance, filter below threshold)
  → Stage 5: Synthesizer   (Claude Haiku → structured EvidencePack)
  → Stage 6: Proposer      (ProposedKnowledge items, gated for memory promotion)
```

### New Files
```
research_worker.py       # main orchestrator
evidence_store.py        # SQLite + Supabase caching layer
```

### New Supabase Tables
- `actp_research_requests` — request_id, objective, status, created_at, completed_at
- `actp_evidence_items` — item_id, request_id, url, title, content_hash, relevance_score, fetched_at

## Task

Implement the ResearchWorker as described in PRD-017:

1. **Create research_worker.py** — main 6-stage pipeline orchestrator
2. **ResearchRequest dataclass** — request_id, objective, questions[], constraints (freshness_days, allowed_domains, budget), output_format, priority
3. **EvidencePack dataclass** — request_id, evidence_items[], synthesis, citations[], confidence_score, produced_at
4. **Stage 1 Planner** — use Claude Haiku to decompose objective into sub-questions and search queries
5. **Stage 2 Searcher** — run searches via existing `browser.search` dispatch, respect domain allowlist and freshness
6. **Stage 3 Fetcher+Extractor** — fetch via `browser.fetch`, extract clean text, strip nav/footer boilerplate
7. **Stage 4 Ranker** — TF-IDF or keyword scoring of fetched docs against questions, filter below 0.2 threshold
8. **Stage 5 Synthesizer** — Claude Haiku call to synthesize ranked evidence → structured EvidencePack
9. **Stage 6 Proposer** — generate ProposedKnowledge items from synthesis, tag for memory promotion
10. **Create evidence_store.py** — SQLite cache + Supabase write for actp_evidence_items
11. **URL deduplication** — skip re-fetch if content_hash cached and not expired by freshness_days
12. **Budget governor** — stop at max_fetches/max_tokens, emit budget_exceeded event
13. **Heartbeat per stage** — telemetry event (stage, duration, item_count) to actp_agent_audit_log
14. **Stall detection** — if stage takes >120s, mark stalled and send Telegram alert
15. **Add research.submit, research.status, research.result** to service_registry

## Testing

```bash
# Unit tests
python3 -m pytest tests/ -v -k "research"

# Full test suite (must not regress)
python3 -m pytest tests/ -v
```

## Key Files
- `service_registry.py` — add research.* topics
- `workflow_task_poller.py` — add ResearchWorkerExecutor
- `data_plane.py` — add research_submit/status/result methods

## CRITICAL: Feature Tracking

After completing each task, update `prd-017-features.json` in the project root:

```bash
python3 -c "
import json
with open('prd-017-features.json') as f: data = json.load(f)
for feat in data['features']:
    if feat['id'] == 'RES-001': feat['passes'] = True
with open('prd-017-features.json', 'w') as f: json.dump(data, f, indent=2)
print('Updated RES-001 to passes=true')
"
```

Do this for EVERY feature you complete.

## Git Workflow

```bash
git add -A && git commit -m "feat(prd-017): <description>"
```

## Constraints
- Do NOT break existing tests (currently 308+)
- Claude model for synthesis: claude-haiku-4-5-20251001 (cheap, fast)
- SQLite path: `~/.actp/evidence.db`
- Supabase project: ivhfuhxorppptyuofbgq
- No mock data — real web fetches and real DB writes required
- Budget default: max_fetches=40, max_tokens=8000 per request
