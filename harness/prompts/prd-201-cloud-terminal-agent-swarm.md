# Mission: PRD-201 — EverReach OS Cloud Terminal + Auto-Scaling Agent Swarm

## Working Directory
`/Users/isaiahdupree/Documents/Software/actp-worker`

## Feature List
`/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness/features/prd-201-cloud-terminal-agent-swarm.json`

## Goal
Build the cloud-side layer of the EverReach OS hybrid architecture: a Dockerized cloud terminal server, Kubernetes manifests for auto-scaling 10+ AAG (Autonomous Acquisition Agents), hardened external API integrations (Stripe, Blotato, Upwork, Hunter, RevenueCat), AWS EventBridge cron scheduling, $400/month cost controls, and local failover. This extends the hybrid orchestrator core (PRD-200) for the cloud environment.

**Dependency**: PRD-200 `hybrid_orchestrator.py`, `cloud_executor.py`, `cost_guard.py` must exist or be stubbed before starting.

## Files to Create

```
cloud_server.py                          # FastAPI on port 8090 — cloud terminal API
aag_swarm.py                             # AAGSwarm: spawn/terminate/list/assign agents
aag_agents/prospecting_aag.py           # ProspectingAAG: Upwork + LinkedIn loop
aag_agents/dm_aag.py                     # DmAAG: multi-platform outreach loop
aag_agents/followup_aag.py              # FollowUpAAG: pipeline advancement loop
swarm_coordinator.py                     # Lock manager: prevent agent conflicts
failover.py                              # FailoverWatcher: cloud-down detection + recovery
stripe_client.py                         # Stripe: MRR, subscriptions, charges
revcat_sync.py                           # RevenueCat: subscriber events + MRR sync
hunter_client.py                         # Hunter.io: email finder
revenue_goal_tracker.py                  # $9.5K Month 1 + MRR progress tracker
follower_tracker.py                      # Cross-platform follower count tracking
viral_burst_detector.py                  # >10K views in <2h → scale AAG swarm
cost_guard.py                            # Monthly cost cap with Supabase logging (extends PRD-200)
local_cron.py                            # APScheduler mirror cron (extends PRD-200)
infra/eventbridge.yaml                   # AWS EventBridge cron rules
k8s/cloud-terminal-deployment.yaml      # K8s Deployment: cloud-terminal
k8s/cloud-terminal-service.yaml         # K8s Service: ClusterIP + LoadBalancer
k8s/cloud-secrets.yaml                  # K8s Secret: all API credentials
k8s/cloud-config.yaml                   # K8s ConfigMap: non-secret config
k8s/aag-worker-deployment.yaml          # K8s Deployment: aag-worker pods
k8s/aag-hpa.yaml                        # K8s HPA: min=2 max=10 CPU=70%
k8s/aag-hpa-schedule.yaml               # CronJob: scale down at 22:00, up at 08:00
scripts/deploy-cloud.sh                  # kubectl apply all k8s/ manifests
.github/workflows/cloud-deploy.yml       # CI: build + push Docker image + rollout
docs/cloud-terminal.md                   # Deployment guide
tests/test_cloud_terminal.py             # All PRD-201 tests marked @pytest.mark.prd201
```

## Supabase Migration Required
```sql
CREATE TABLE IF NOT EXISTS actp_cost_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service text NOT NULL,
  action text NOT NULL,
  cost_usd numeric(10,6) NOT NULL DEFAULT 0,
  env text NOT NULL DEFAULT 'cloud',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS actp_cron_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name text NOT NULL,
  fired_at timestamptz NOT NULL DEFAULT now(),
  env text NOT NULL,
  duration_ms int,
  ok bool DEFAULT true
);

CREATE TABLE IF NOT EXISTS actp_growth_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL,
  followers int NOT NULL,
  recorded_at date NOT NULL DEFAULT CURRENT_DATE
);
```

## Key Implementation Details

### AAGSwarm
```python
class AAGSwarm:
    def __init__(self, max_agents: int = 10):
        self.max_agents = max_agents
        self._agents: dict[str, AAGAgent] = {}
        self.coordinator = SwarmCoordinator()

    async def spawn_agent(self, agent_type: str, task: dict) -> str:
        if len(self._active()) >= self.max_agents:
            raise SwarmCapacityError(f"Max {self.max_agents} agents running")
        agent_id = f"{agent_type}-{uuid4().hex[:8]}"
        agent = self._create_agent(agent_type, agent_id)
        self._agents[agent_id] = agent
        asyncio.create_task(agent.run(task))
        return agent_id
```

### Cost Guard (Supabase-backed)
```python
async def get_monthly_cost(self) -> dict:
    rows = await supabase.table("actp_cost_log") \
        .select("cost_usd") \
        .gte("created_at", start_of_month()) \
        .execute()
    total = sum(r["cost_usd"] for r in rows.data)
    return {
        "total_usd": total,
        "remaining_usd": self.cap - total,
        "cap_usd": self.cap,
        "warning": total >= self.soft_cap,  # $380
        "exceeded": total >= self.cap,       # $400
    }
```

### Failover Watcher
```python
class FailoverWatcher:
    async def watch(self):
        failures = 0
        while True:
            try:
                async with httpx.AsyncClient(timeout=10) as c:
                    r = await c.get(f"{CLOUD_ENDPOINT}/health")
                    if r.status_code == 200:
                        if os.environ.get("CLOUD_FAILED") == "1":
                            await self._restore()
                        failures = 0
                    else:
                        failures += 1
            except Exception:
                failures += 1
            if failures >= 3:
                await self._failover()
            await asyncio.sleep(60)
```

### K8s HPA (aag-hpa.yaml)
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: aag-worker-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: aag-worker
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## EventBridge Cron Rules
| Rule | Schedule (UTC) | Endpoint |
|------|---------------|---------|
| daily_routine | 0 6 * * ? * (06:00 UTC) | /cron/daily_routine |
| prospect_scan | 0 11,15 ? * MON-FRI * | /cron/prospect_scan |
| content_feedback | 30 */6 * * ? * | /cron/content_feedback |
| revenue_snapshot | 0 0 * * ? * | /cron/revenue_snapshot |

## Rules
1. All K8s manifests use `namespace: everreach-os` consistently
2. `cloud_server.py` must also import and call `init_all_services()` on startup
3. AAG agents claim tasks from `actp_workflow_tasks` via existing `claim_workflow_task()` RPC
4. All tests in `tests/test_cloud_terminal.py` marked `@pytest.mark.prd201`
5. Stripe, Hunter, RevenueCat clients use `httpx.AsyncClient` with mocks in tests
6. `deploy-cloud.sh` must be idempotent (re-running is safe)

## Validation
```bash
python -m pytest tests/test_cloud_terminal.py -v -m prd201
kubectl apply -f k8s/ --dry-run=client
./scripts/deploy-cloud.sh --dry-run
```

## Final Steps
Mark features `passes: true` per batch of 10. Commit:
```
git commit -m "feat(prd-201): EverReach OS cloud terminal + AAG swarm — XX/50 features"
```
