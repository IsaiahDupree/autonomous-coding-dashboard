# PRD-ADLITE-003: actp-worker MetaAdsExecutor

## Overview
Add a `MetaAdsExecutor` to `actp-worker/workflow_executors.py` so the Workflow Engine can trigger Meta ad operations as workflow steps. The executor wraps the `meta_ads_engine.py` logic and the AdLite HTTP API, making Meta ad management a first-class ACTP workflow action alongside `safari_research`, `remotion_render`, etc.

## Working Directory
`/Users/isaiahdupree/Documents/Software/actp-worker/`

## Dependencies
- PRD-ADLITE-001 must be complete (`meta_ads_engine.py` exists)
- PRD-ADLITE-002 must be complete (AdLite has `POST /api/deployments`)
- `ADLITE_URL` and `ADLITE_MASTER_KEY` set in `.env`

## Actions Supported

| Action | Description |
|--------|-------------|
| `run_rules` | Run the rule engine — score all active ads, queue pause/scale decisions |
| `list_decisions` | Fetch recent `actp_meta_decisions` rows from Supabase |
| `list_actions` | Fetch pending/recent `actp_ad_actions` from AdLite |
| `queue_pause` | Manually queue a pause for a specific `ad_id` |
| `queue_scale` | Manually queue a budget scale for a specific `adset_id` |
| `queue_deploy` | Create a deployment record + queue a deploy action |
| `get_deployment` | Fetch a single deployment by ID |
| `update_deployment` | Update deployment status/metrics |
| `get_thresholds` | Read current `actp_meta_thresholds` from Supabase |
| `upsert_threshold` | Create/update a threshold row for an offer |

---

## Implementation

### Modify: `workflow_executors.py`

Add the following class. The existing executor pattern is used:

```python
# ─── MetaAdsExecutor ────────────────────────────────────────────────────────

class MetaAdsExecutor(BaseExecutor):
    """
    Executor for Meta Ads operations.
    Routes to meta_ads_engine.py (rule engine) and AdLite REST API.

    Registered task_type: "meta_ads"
    """

    TASK_TYPE = "meta_ads"

    def __init__(self):
        self.adlite_url  = os.getenv("ADLITE_URL", "")
        self.adlite_key  = os.getenv("ADLITE_MASTER_KEY", "")
        self.sb_url      = os.getenv("SUPABASE_URL", "")
        self.sb_key      = os.getenv("SUPABASE_SERVICE_ROLE_KEY",
                                     os.getenv("SUPABASE_ANON_KEY", ""))

    # ------------------------------------------------------------------
    # BaseExecutor interface
    # ------------------------------------------------------------------
    async def execute(self, task: dict) -> dict:
        action = task.get("action", "")
        params = task.get("params", {})
        dispatch = {
            "run_rules":          self._run_rules,
            "list_decisions":     self._list_decisions,
            "list_actions":       self._list_actions,
            "queue_pause":        self._queue_pause,
            "queue_scale":        self._queue_scale,
            "queue_deploy":       self._queue_deploy,
            "get_deployment":     self._get_deployment,
            "update_deployment":  self._update_deployment,
            "get_thresholds":     self._get_thresholds,
            "upsert_threshold":   self._upsert_threshold,
        }
        fn = dispatch.get(action)
        if not fn:
            raise ValueError(f"MetaAdsExecutor: unknown action '{action}'. "
                             f"Valid: {', '.join(dispatch)}")
        return await fn(params)

    # ------------------------------------------------------------------
    # AdLite helpers
    # ------------------------------------------------------------------
    def _adlite_headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.adlite_key}",
            "Content-Type": "application/json",
        }

    async def _adlite_get(self, client: httpx.AsyncClient, path: str,
                           params: dict = {}) -> dict:
        if not self.adlite_url:
            raise RuntimeError("ADLITE_URL not configured")
        r = await client.get(f"{self.adlite_url}{path}",
                             headers=self._adlite_headers(), params=params, timeout=20)
        r.raise_for_status()
        return r.json()

    async def _adlite_post(self, client: httpx.AsyncClient, path: str,
                            body: dict) -> dict:
        if not self.adlite_url:
            raise RuntimeError("ADLITE_URL not configured")
        r = await client.post(f"{self.adlite_url}{path}",
                              headers=self._adlite_headers(), json=body, timeout=20)
        r.raise_for_status()
        return r.json()

    async def _adlite_patch(self, client: httpx.AsyncClient, path: str,
                             body: dict) -> dict:
        if not self.adlite_url:
            raise RuntimeError("ADLITE_URL not configured")
        r = await client.patch(f"{self.adlite_url}{path}",
                               headers=self._adlite_headers(), json=body, timeout=20)
        r.raise_for_status()
        return r.json()

    # ------------------------------------------------------------------
    # Supabase helpers
    # ------------------------------------------------------------------
    def _sb_headers(self) -> dict:
        return {
            "apikey": self.sb_key,
            "Authorization": f"Bearer {self.sb_key}",
            "Content-Type": "application/json",
        }

    async def _sb_get(self, client: httpx.AsyncClient, table: str,
                       params: dict) -> list:
        r = await client.get(f"{self.sb_url}/rest/v1/{table}",
                             headers=self._sb_headers(), params=params, timeout=15)
        r.raise_for_status()
        return r.json()

    async def _sb_upsert(self, client: httpx.AsyncClient, table: str,
                          payload: dict, on_conflict: str = "") -> dict:
        headers = {**self._sb_headers(), "Prefer": "return=representation"}
        if on_conflict:
            headers["Prefer"] += f",resolution=merge-duplicates"
        params = {}
        if on_conflict:
            params["on_conflict"] = on_conflict
        r = await client.post(f"{self.sb_url}/rest/v1/{table}",
                              headers=headers, json=payload, params=params, timeout=15)
        r.raise_for_status()
        rows = r.json()
        return rows[0] if isinstance(rows, list) and rows else {}

    # ------------------------------------------------------------------
    # Actions
    # ------------------------------------------------------------------
    async def _run_rules(self, params: dict) -> dict:
        """Run meta_ads_engine.run_engine() inline."""
        from meta_ads_engine import run_engine
        dry_run = params.get("dry_run", True)
        result = await run_engine(dry_run=dry_run)
        return {"status": "ok", "engine_result": result}

    async def _list_decisions(self, params: dict) -> dict:
        limit = params.get("limit", 20)
        async with httpx.AsyncClient() as c:
            rows = await self._sb_get(c, "actp_meta_decisions", {
                "select": "*",
                "order": "created_at.desc",
                "limit": str(limit),
            })
        return {"decisions": rows, "count": len(rows)}

    async def _list_actions(self, params: dict) -> dict:
        qp: dict = {"limit": str(params.get("limit", 20))}
        if params.get("status"):
            qp["status"] = f"eq.{params['status']}"
        async with httpx.AsyncClient() as c:
            data = await self._adlite_get(c, "/api/actions", qp)
        return data.get("data", data)

    async def _queue_pause(self, params: dict) -> dict:
        ad_id = params.get("ad_id")
        if not ad_id:
            raise ValueError("queue_pause requires 'ad_id'")
        body = {
            "platform": "meta",
            "action_type": "pause",
            "params": {
                "ad_id": ad_id,
                "reason": params.get("reason", "manual_pause"),
            },
        }
        if params.get("deployment_id"):
            body["deployment_id"] = params["deployment_id"]
        async with httpx.AsyncClient() as c:
            data = await self._adlite_post(c, "/api/actions", body)
        return data.get("data", data)

    async def _queue_scale(self, params: dict) -> dict:
        adset_id = params.get("adset_id")
        new_budget_cents = params.get("new_daily_budget_cents")
        if not adset_id or not new_budget_cents:
            raise ValueError("queue_scale requires 'adset_id' and 'new_daily_budget_cents'")
        body = {
            "platform": "meta",
            "action_type": "scale_budget",
            "params": {
                "ad_set_id": adset_id,
                "new_daily_budget_cents": int(new_budget_cents),
                "reason": params.get("reason", "manual_scale"),
            },
        }
        if params.get("deployment_id"):
            body["deployment_id"] = params["deployment_id"]
        async with httpx.AsyncClient() as c:
            data = await self._adlite_post(c, "/api/actions", body)
        return data.get("data", data)

    async def _queue_deploy(self, params: dict) -> dict:
        """Create deployment record + queue a deploy action."""
        required = ["platform", "campaign_id"]
        for f in required:
            if not params.get(f):
                raise ValueError(f"queue_deploy requires '{f}'")

        dep_payload = {
            "platform": params["platform"],
            "campaign_id": params["campaign_id"],
            "ad_set_name": params.get("ad_set_name", ""),
            "ad_name": params.get("ad_name", ""),
            "headline": params.get("headline", ""),
            "description": params.get("description", ""),
            "call_to_action": params.get("call_to_action", "LEARN_MORE"),
            "destination_url": params.get("destination_url", ""),
            "image_url": params.get("image_url"),
            "video_url": params.get("video_url"),
            "daily_budget_cents": int(params.get("daily_budget_cents", 500)),
            "total_budget_cents": int(params.get("total_budget_cents", 0)),
            "targeting": params.get("targeting", {}),
            "offer_id": params.get("offer_id"),
            "icp_id": params.get("icp_id"),
        }

        async with httpx.AsyncClient() as c:
            dep_data = await self._adlite_post(c, "/api/deployments", dep_payload)
            dep = dep_data.get("data", {}).get("deployment", {})
            dep_id = dep.get("id")

            action_payload = {
                "deployment_id": dep_id,
                "platform": params["platform"],
                "action_type": "deploy",
                "params": {
                    "campaign_id": params["campaign_id"],
                    "ad_set_name": params.get("ad_set_name", ""),
                    "ad_name": params.get("ad_name", ""),
                    "headline": params.get("headline", ""),
                    "description": params.get("description", ""),
                    "call_to_action": params.get("call_to_action", "LEARN_MORE"),
                    "destination_url": params.get("destination_url", ""),
                    "image_url": params.get("image_url"),
                    "video_url": params.get("video_url"),
                    "daily_budget_cents": int(params.get("daily_budget_cents", 500)),
                    "targeting": params.get("targeting", {}),
                },
            }
            action_data = await self._adlite_post(c, "/api/actions", action_payload)
            action = action_data.get("data", {}).get("action", {})

        return {
            "deployment_id": dep_id,
            "action_id": action.get("id"),
            "status": "queued",
        }

    async def _get_deployment(self, params: dict) -> dict:
        dep_id = params.get("deployment_id") or params.get("id")
        if not dep_id:
            raise ValueError("get_deployment requires 'deployment_id'")
        async with httpx.AsyncClient() as c:
            data = await self._adlite_get(c, f"/api/deployments/{dep_id}")
        return data.get("data", data)

    async def _update_deployment(self, params: dict) -> dict:
        dep_id = params.get("deployment_id") or params.get("id")
        if not dep_id:
            raise ValueError("update_deployment requires 'deployment_id'")
        update_body = {k: v for k, v in params.items()
                       if k not in ("deployment_id", "id")}
        async with httpx.AsyncClient() as c:
            data = await self._adlite_patch(c, f"/api/deployments/{dep_id}", update_body)
        return data.get("data", data)

    async def _get_thresholds(self, params: dict) -> dict:
        offer_id = params.get("offer_id")
        qp: dict = {"select": "*"}
        if offer_id:
            qp["offer_id"] = f"eq.{offer_id}"
        async with httpx.AsyncClient() as c:
            rows = await self._sb_get(c, "actp_meta_thresholds", qp)
        return {"thresholds": rows, "count": len(rows)}

    async def _upsert_threshold(self, params: dict) -> dict:
        offer_id = params.get("offer_id")
        if not offer_id:
            raise ValueError("upsert_threshold requires 'offer_id'")
        payload = {k: v for k, v in params.items()}
        async with httpx.AsyncClient() as c:
            row = await self._sb_upsert(c, "actp_meta_thresholds", payload,
                                         on_conflict="offer_id")
        return {"threshold": row}
```

---

## Register in `workflow_executors.py`

In the executor registry dict (wherever other executors are registered):

```python
EXECUTOR_REGISTRY = {
    ...
    "meta_ads": MetaAdsExecutor(),
}
```

Or if using the dispatch pattern from `BaseExecutor`:

```python
def get_executor(task_type: str) -> BaseExecutor:
    executors = {
        ...
        "meta_ads": MetaAdsExecutor(),
    }
    return executors[task_type]
```

---

## Workflow Definition Example

Example workflow step to run the rule engine daily (add to Workflow Engine):

```json
{
  "slug": "meta-ads-daily-optimization",
  "name": "Meta Ads Daily Optimization",
  "steps": [
    {
      "slug": "run-rule-engine",
      "type": "local_task",
      "task_type": "meta_ads",
      "params": {
        "action": "run_rules",
        "dry_run": false
      },
      "max_retries": 2
    },
    {
      "slug": "log-decisions",
      "type": "local_task",
      "task_type": "meta_ads",
      "depends_on": ["run-rule-engine"],
      "params": {
        "action": "list_decisions",
        "limit": 50
      }
    }
  ]
}
```

---

## cron_definitions.py — update existing entry

```python
{
    "name": "meta_ads_optimization",
    "description": "Meta ads rule engine via MetaAdsExecutor",
    "schedule": "0 8,14,20 * * *",
    "task_type": "meta_ads",
    "task_params": {"action": "run_rules", "dry_run": False},
    "enabled": False,
    "opt_in": True,
},
```

---

## Tests: `tests/test_meta_ads_executor.py`

```python
"""Tests for MetaAdsExecutor"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock

@pytest.mark.asyncio
async def test_list_decisions_returns_list():
    from workflow_executors import MetaAdsExecutor
    executor = MetaAdsExecutor()
    with patch.object(executor, '_sb_get', AsyncMock(return_value=[
        {"id": "abc", "action": "PAUSE", "ad_id": "ad_123"}
    ])):
        result = await executor.execute({"action": "list_decisions", "params": {"limit": 5}})
    assert result["count"] == 1
    assert result["decisions"][0]["action"] == "PAUSE"


@pytest.mark.asyncio
async def test_unknown_action_raises():
    from workflow_executors import MetaAdsExecutor
    executor = MetaAdsExecutor()
    with pytest.raises(ValueError, match="unknown action"):
        await executor.execute({"action": "invalid_action", "params": {}})


@pytest.mark.asyncio
async def test_queue_pause_requires_ad_id():
    from workflow_executors import MetaAdsExecutor
    executor = MetaAdsExecutor()
    with pytest.raises(ValueError, match="requires 'ad_id'"):
        await executor.execute({"action": "queue_pause", "params": {}})


@pytest.mark.asyncio
async def test_queue_scale_requires_params():
    from workflow_executors import MetaAdsExecutor
    executor = MetaAdsExecutor()
    with pytest.raises(ValueError):
        await executor.execute({"action": "queue_scale", "params": {"adset_id": "as_123"}})
```

---

## Acceptance Criteria

- [ ] `MetaAdsExecutor` class exists in `workflow_executors.py` with all 10 actions
- [ ] `MetaAdsExecutor` registered in executor registry under `"meta_ads"`
- [ ] `run_rules` action calls `meta_ads_engine.run_engine()` (requires PRD-ADLITE-001)
- [ ] `queue_pause` and `queue_scale` POST to AdLite `/api/actions`
- [ ] `queue_deploy` creates deployment + queues deploy action
- [ ] `get_thresholds` and `upsert_threshold` read/write `actp_meta_thresholds` via Supabase
- [ ] All 4 unit tests pass: `pytest tests/test_meta_ads_executor.py -v`
- [ ] Worker can execute a `meta_ads` task via the Workflow Engine poll loop
