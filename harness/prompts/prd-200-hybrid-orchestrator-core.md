# Mission: PRD-200 — EverReach OS Unified Hybrid Orchestrator Core

## Working Directory
`/Users/isaiahdupree/Documents/Software/actp-worker`

## Feature List
`/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness/features/prd-200-hybrid-orchestrator-core.json`

## Goal
Implement the unified hybrid orchestrator core for EverReach OS. This is a single codebase that runs in both cloud and local environments, routing actions to the right executor based on `EVERREACH_ENV` ('cloud' | 'local' | 'hybrid'). It wraps the existing `service_registry.dispatch()` as the local executor and routes to cloud services via HTTP for api-heavy actions.

## Architecture Overview

```
EVERREACH_ENV=hybrid
       ↓
HybridOrchestrator.route(action, params)
       ↓
action_classifier.classify(action) → 'compute' | 'api'
       ↓                    ↓
LocalExecutor          CloudExecutor
service_registry       HTTPS → cloud
.dispatch()            /api/services/*
       ↓                    ↓
 source='local'       source='cloud'
       ↓                    ↓
      ←── fallback on cloud fail ───
```

## Files to Create

```
hybrid_orchestrator.py       # HybridOrchestrator: route(), ENV detection
config/hybrid_config.py      # Config loader from .env
action_classifier.py         # classify() → 'compute' | 'api'
local_routes.py              # service.topic → local dispatch map
cloud_routes.py              # service.topic → cloud URL map
local_executor.py            # LocalExecutor: wraps service_registry.dispatch
cloud_executor.py            # CloudExecutor: httpx POST with retry + fallback
connectivity_check.py        # is_cloud_reachable(), OFFLINE_MODE flag
offline_cache.py             # SQLite cache for last-good responses
local_batch.py               # batch_execute() for 10+ content pieces
local_cron.py                # APScheduler: 06:00 daily_routine + mirrored schedules
local_server.py              # FastAPI on port 8080: /dispatch /health /status /batch
sync_bus.py                  # SyncBus: Redis pub/sub with SQLite fallback
cost_guard.py                # Monthly cost tracker + $400 cap enforcement
cost_rates.py                # $/call estimates per service.topic
route_table.json             # action → {preferred_env, fallback_env}
docker/Dockerfile.local      # Local terminal Docker image
docker/docker-compose.yml    # local-terminal + redis + chroma + prometheus
.env.example                 # All required env vars documented
Makefile                     # local-up/down/build/test/logs targets
docs/hybrid-orchestrator.md  # Setup guide + architecture diagram
tests/test_hybrid_orchestrator.py   # All PRD-200 tests
```

## Key Implementation Details

### HybridOrchestrator
```python
class HybridOrchestrator:
    def __init__(self):
        self.env = os.getenv("EVERREACH_ENV", "local")  # cloud|local|hybrid
        self.local = LocalExecutor()
        self.cloud = CloudExecutor()
        self.classifier = ActionClassifier()
        self.cost_guard = CostGuard()

    async def route(self, action: str, params: dict, force_env: str = None) -> dict:
        env = force_env or self._select_env(action)
        if env == "local":
            return await self.local.execute(action, params)
        elif env == "cloud":
            result = await self.cloud.execute(action, params)
            if not result["ok"] and self.env == "hybrid":
                result = await self.local.execute(action, params)
                result["source"] = "local_fallback"
            return result

    def _select_env(self, action: str) -> str:
        if self.env != "hybrid":
            return self.env
        if self.cost_guard.is_soft_cap_reached():
            return "local"
        return "cloud" if self.classifier.classify(action) == "api" else "local"
```

### Action Classification
```python
LOCAL_PREFERRED = {
    "content.analyze_video", "content.youtube_payload",
    "feedback.checkbacks", "feedback.analysis", "feedback.twitter_cycle",
    "feedback.universal_cycle", "twitter.metrics", "twitter.playbook",
    "blotato.queue_summary", "blotato.queue_audit",
    "system.self_test", "system.heartbeat",
}
CLOUD_PREFERRED = {
    "research.platform", "research.keyword", "research.twitter",
    "dm.send", "dm.conversations", "dm.process_outreach",
    "linkedin.search", "linkedin.prospect", "linkedin.message", "linkedin.campaign",
    "upwork.search", "upwork.propose", "upwork.scan",
    "publish.auto", "publish.multi", "publish.lite",
    "safari.health", "safari.ensure_session",
    "telegram.send", "comments.post", "comments.threads_engage",
}
```

### docker-compose.yml structure
```yaml
version: "3.9"
services:
  local-terminal:
    build: { context: ., dockerfile: docker/Dockerfile.local }
    ports: ["8080:8080"]
    env_file: .env
    environment: { EVERREACH_ENV: local }
    volumes: ["./data/sqlite:/app/data", "./data/chroma:/chroma/chroma"]
    healthcheck: { test: ["CMD", "curl", "-f", "http://localhost:8080/health"] }
    networks: [everreach-net]
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    networks: [everreach-net]
  chroma:
    image: chromadb/chroma:latest
    ports: ["8000:8000"]
    volumes: ["./data/chroma:/chroma/chroma"]
    networks: [everreach-net]
  prometheus:
    image: prom/prometheus:latest
    ports: ["9090:9090"]
    volumes: ["./prometheus:/etc/prometheus"]
    networks: [everreach-net]
networks:
  everreach-net:
```

## Rules
1. Import from existing `service_registry.py` — do not duplicate topic registration
2. All tests in `tests/test_hybrid_orchestrator.py` marked `@pytest.mark.prd200`
3. Use `httpx.AsyncClient` for all cloud HTTP calls
4. Never hardcode API keys — always `os.getenv()`
5. CostGuard reads from Supabase `actp_cost_log` (create if not exists)
6. All tests mockable without live services via `monkeypatch` / `httpx.MockTransport`

## Validation
```bash
# Unit tests
python -m pytest tests/test_hybrid_orchestrator.py -v

# Docker local stack
make local-up
curl http://localhost:8080/health

# Full test
make test
```

## Final Steps
Mark all features `passes: true` in the feature list JSON after implementing each batch of 10. Commit with:
```
git commit -m "feat(prd-200): EverReach OS hybrid orchestrator core — XX/50 features"
```
