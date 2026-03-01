# Mission: PRD-202 — EverReach OS Shared Vector DB, Feedback Sync & Prometheus Monitoring

## Working Directory
`/Users/isaiahdupree/Documents/Software/actp-worker`

## Feature List
`/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness/features/prd-202-vector-db-feedback-monitoring.json`

## Goal
Build the shared intelligence layer of EverReach OS: a Chroma/pgvector database for content, prospect, outcome, and lesson embeddings; a cross-environment feedback sync engine that drives strategy updates; data privacy controls (air-gapped local data, PII scrubbing, encrypted sync); and full Prometheus+Grafana observability with Telegram alerting.

**Dependencies**: PRD-200 `hybrid_orchestrator.py`, `docker-compose.yml` (adds chroma + prometheus services). PRD-201 `aag_swarm.py`, `cost_guard.py`.

## Files to Create

```
vector_db.py                          # VectorDB: Chroma + pgvector wrapper, 4 collections
embedder.py                           # embed_content/prospect/outcome/lesson
feedback_sync.py                      # FeedbackSyncEngine: record_outcome → classify → embed → strategy
sync_job.py                           # Delta sync: local Chroma → cloud Chroma/pgvector
strategy_builder.py                   # Rebuild feedback strategy from vector search
privacy_policy.py                     # LOCAL_ONLY_COLLECTIONS, sync filter
pii_scrubber.py                       # Remove email/phone/name before cloud embed
retention_job.py                      # Auto-purge old embeddings per policy
metrics_server.py                     # prometheus_client exposition on :9090
metrics_definitions.py               # All gauge/counter/histogram definitions
prometheus/prometheus.yml             # Scrape config for all local services
prometheus/alerts.yml                 # AlertManager rules: MRR, flop, cost, failover
prometheus/alertmanager.yml           # Telegram receiver config
grafana/everreach-overview.json       # Grafana dashboard JSON
docs/monitoring.md                    # Monitoring setup guide
tests/test_vector_db.py               # PRD-202 tests marked @pytest.mark.prd202
```

## Supabase Migrations Required
```sql
-- pgvector extension (if using pgvector backend)
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS vector_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection text NOT NULL,
  doc_id text NOT NULL,
  embedding vector(1536),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(collection, doc_id)
);
CREATE INDEX ON vector_embeddings USING hnsw (embedding vector_cosine_ops);

CREATE TABLE IF NOT EXISTS actp_feedback_strategy_archive (
  LIKE actp_feedback_strategy INCLUDING ALL,
  archived_at timestamptz DEFAULT now()
);
```

## Key Implementation Details

### VectorDB
```python
class VectorDB:
    COLLECTIONS = ["content_embeddings", "prospect_embeddings",
                   "outcome_embeddings", "lesson_embeddings"]

    def __init__(self):
        backend = os.getenv("VECTOR_BACKEND", "chroma")  # chroma | pgvector
        if backend == "chroma":
            self._client = chromadb.HttpClient(host=CHROMA_HOST, port=CHROMA_PORT)
        else:
            self._client = PgVectorClient(SUPABASE_URL, SUPABASE_KEY)

    async def upsert(self, collection: str, doc_id: str,
                     embedding: list[float], metadata: dict) -> str: ...

    async def find_similar(self, collection: str, query_embedding: list[float],
                           n: int = 10, where: dict = None) -> list[dict]: ...
```

### Embedder
```python
async def embed_content(text: str, metadata: dict) -> str:
    text = pii_scrubber.scrub(text)  # always scrub before embedding
    embedding = await get_embedding(text)  # text-embedding-3-small
    return await db.upsert("content_embeddings", metadata["post_id"], embedding, metadata)

async def embed_outcome(post_id: str, metrics: dict, classification: str) -> str:
    metadata = {**metrics, "classification": classification,
                "viral": classification == "viral"}
    embedding = await get_embedding(json.dumps(metrics))
    return await db.upsert("outcome_embeddings", post_id, embedding, metadata)
```

### FeedbackSyncEngine
```python
class FeedbackSyncEngine:
    async def record_outcome(self, post_id: str, platform: str, metrics: dict):
        # 1. classify
        classification = classify_post(metrics, platform)
        # 2. embed locally
        await embed_outcome(post_id, metrics, classification)
        # 3. upsert to Supabase actp_feedback_posts
        await dp.feedback_register_post(post_id, platform, metrics, classification)
        # 4. check if strategy rebuild needed
        new_count = await self._count_since_last_rebuild(platform)
        if new_count >= 10:
            await strategy_builder.rebuild_strategy(platform)
```

### Prometheus Metrics
```python
# metrics_definitions.py
from prometheus_client import Gauge, Counter, Histogram

mrr_gauge         = Gauge("everreach_mrr_usd", "Monthly Recurring Revenue", ["source"])
flop_rate_gauge   = Gauge("everreach_flop_rate", "Content flop rate", ["platform", "niche"])
followers_gauge   = Gauge("everreach_followers", "Follower count", ["platform"])
aag_active_gauge  = Gauge("everreach_aag_active", "Active AAG agents")
cost_counter      = Counter("everreach_cloud_cost_usd", "Cloud API spend", ["service", "action"])
dispatch_hist     = Histogram("everreach_dispatch_duration_seconds",
                              "Dispatch latency", ["service", "action", "env"],
                              buckets=[0.1, 0.5, 1, 5, 30])
dms_sent_counter  = Counter("everreach_dms_sent_total", "DMs sent", ["platform"])
failover_counter  = Counter("everreach_failover_events_total", "Cloud failover events")
```

### prometheus/alerts.yml
```yaml
groups:
- name: everreach_alerts
  rules:
  - alert: MRRDropAlert
    expr: delta(everreach_mrr_usd{source="total"}[24h]) < -0.1 * everreach_mrr_usd{source="total"}
    for: 1h
    labels: { severity: critical }
    annotations: { summary: "MRR dropped >10% in 24h" }

  - alert: ContentFlopRateHigh
    expr: everreach_flop_rate > 0.7
    for: 2h
    labels: { severity: warning }
    annotations: { summary: "Flop rate {{ $value }} on {{ $labels.platform }}/{{ $labels.niche }}" }

  - alert: CloudCostApproachingCap
    expr: everreach_cloud_cost_usd > 380
    labels: { severity: warning }
    annotations: { summary: "Cloud cost ${{ $value }} approaching $400 cap" }

  - alert: CloudFailoverFrequent
    expr: increase(everreach_failover_events_total[24h]) > 2
    labels: { severity: warning }
    annotations: { summary: "Cloud failover triggered >2x in 24h" }
```

### Data Privacy Rules
```python
# privacy_policy.py
LOCAL_ONLY_COLLECTIONS = frozenset(["prospect_embeddings", "client_data"])

def should_sync(collection: str, doc_id: str) -> bool:
    return collection not in LOCAL_ONLY_COLLECTIONS

# pii_scrubber.py
import re
EMAIL_RE = re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+")
PHONE_RE = re.compile(r"(\+?[\d\s\-().]{7,15})")

def scrub(text: str) -> str:
    text = EMAIL_RE.sub("[EMAIL]", text)
    text = PHONE_RE.sub("[PHONE]", text)
    return text
```

## Rules
1. All tests in `tests/test_vector_db.py` marked `@pytest.mark.prd202`
2. `VectorDB` must work with both `VECTOR_BACKEND=chroma` and `VECTOR_BACKEND=pgvector`
3. `embed_*` functions always call `pii_scrubber.scrub()` before embedding
4. `prospect_embeddings` collection NEVER synced to cloud (LOCAL_ONLY)
5. Grafana dashboard JSON must be valid and importable
6. `prometheus/alertmanager.yml` Telegram receiver uses `dispatch('telegram.send', ...)` via local HTTP call to `http://local-terminal:8080/dispatch`

## Validation
```bash
python -m pytest tests/test_vector_db.py -v -m prd202

# Verify Chroma collections created
python -c "from vector_db import VectorDB; db=VectorDB(); print(db._client.list_collections())"

# Check metrics endpoint
curl http://localhost:9090/metrics | grep everreach_

# Import Grafana dashboard
curl -X POST http://admin:admin@localhost:3001/api/dashboards/import \
  -H "Content-Type: application/json" \
  -d @grafana/everreach-overview.json
```

## Final Steps
Mark features `passes: true` per batch of 10. Commit:
```
git commit -m "feat(prd-202): EverReach OS vector DB + feedback sync + Prometheus — XX/50 features"
```
