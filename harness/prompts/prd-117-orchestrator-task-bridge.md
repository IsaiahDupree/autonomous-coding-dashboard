# PRD-117: Orchestrator-to-Agent Task Bridge

## Project
- **Repo**: /Users/isaiahdupree/Documents/Software/actp-worker
- **Feature List**: /Users/isaiahdupree/Documents/Software/actp-worker/prd-117-features.json
- **Depends On**: PRD-100 (Cognitive Orchestrator), PRD-111 (NativeToolAgent base), PRD-116 (Worker Daemon)
- **Priority**: P0 — without this, PRD-100 Orchestrator cannot dispatch goals to native agents

## Context

The Cognitive Orchestrator (PRD-100) plans daily goals and needs to dispatch them to the right domain agent. The native agents (PRD-112 through PRD-115) poll `actp_agent_tasks` for tasks. But there is no standardized **bridge layer** that:
1. Routes Orchestrator goals to the correct agent type
2. Enforces task schema validation before insertion
3. Handles priority queuing and task expiry
4. Routes task results back to the Orchestrator for outcome evaluation
5. Provides a full audit trail of every goal → task → result cycle

This PRD builds the `task_bridge.py` — the **message bus** between the Cognitive Orchestrator terminal and all domain agents. It's the nervous system of EverReach OS.

## Architecture

```
Cognitive Orchestrator (PRD-100)
    │ dispatch_goal(agent_type, goal, context, priority)
    ▼
TaskBridge (task_bridge.py)
    ├── TaskRouter        — map goal categories to agent types
    ├── TaskDispatcher    — validate + insert to actp_agent_tasks
    ├── TaskResultPoller  — poll actp_agent_tasks for completed tasks
    ├── OutcomeReporter   — feed results back to Orchestrator evaluation
    ├── TaskAuditor       — full trace: goal → dispatch → claim → complete
    └── PriorityQueue     — CRITICAL > HIGH > NORMAL > LOW ordering
            │
            ▼
actp_agent_tasks (Supabase)
            │
    ┌───────┴───────────────────┐
    ▼       ▼           ▼       ▼
SocialMedia Content  Acquisition Revenue
Agent       Agent    Agent      Agent
(PRD-112)  (PRD-113)(PRD-114)  (PRD-115)
```

## Task

### TaskRouter
1. `TaskRouter.ROUTING_TABLE` — dict mapping goal keywords → agent_type:
   ```python
   {
     "post|comment|engage|follower|instagram|tiktok|twitter|linkedin|social": "social-media-agent",
     "generate|render|script|video|hook|hookgate|publish|content|viral": "content-agent",
     "prospect|upwork|deal|outreach|acquire|crm|email|proposal": "acquisition-agent",
     "revenue|stripe|apple|cost|analytics|report|kpi|goal|mrr": "revenue-agent"
   }
   ```
2. `TaskRouter.route(goal)` — score goal text against each pattern, return best-match agent_type
3. `TaskRouter.route_all(goals_list)` — batch route, return list of (goal, agent_type) tuples
4. `TaskRouter.override(goal, agent_type)` — explicit override map for specific goals
5. `TaskRouter.validate_agent_type(agent_type)` — True if agent_type in known set

### TaskDispatcher
6. `TaskDispatcher.dispatch(agent_type, goal, context=None, priority='normal', ttl_minutes=60)` — validate + INSERT into actp_agent_tasks, return task_id
7. `TaskDispatcher.dispatch_batch(tasks_list)` — INSERT multiple tasks atomically (one DB round-trip)
8. `TaskDispatcher.validate_task(agent_type, goal, context)` — jsonschema validation: goal must be non-empty string, context must be dict or None, agent_type must be valid
9. `TaskDispatcher.set_expiry(task_id, ttl_minutes)` — UPDATE actp_agent_tasks SET expires_at=now()+ttl
10. `TaskDispatcher.cancel_task(task_id, reason)` — UPDATE status='cancelled', cancelled_reason=reason
11. `TaskDispatcher.get_pending_count(agent_type)` — SELECT COUNT(*) pending tasks for agent
12. `TaskDispatcher.expire_stale_tasks()` — UPDATE status='expired' WHERE expires_at < now() AND status='pending' (run every 5min)

### TaskResultPoller
13. `TaskResultPoller.poll(agent_type, timeout=300)` — asyncio: poll actp_agent_tasks WHERE status='completed' AND agent_type=X, return result
14. `TaskResultPoller.get_result(task_id)` — SELECT outcome, tools_used, iterations, duration_ms FROM actp_agent_runs JOIN actp_agent_tasks
15. `TaskResultPoller.poll_all_completed(since_minutes=5)` — SELECT all completed tasks in last N minutes
16. `TaskResultPoller.mark_result_read(task_id)` — UPDATE actp_agent_tasks SET result_read=True

### OutcomeReporter
17. `OutcomeReporter.feed_back_to_orchestrator(task_id, outcome, agent_type)` — INSERT into actp_orchestrator_feedback for COT to evaluate
18. `OutcomeReporter.classify_outcome(outcome_text)` — return success/partial/failure based on outcome content
19. `OutcomeReporter.update_agent_performance(agent_type, success_rate)` — UPDATE actp_agent_registry performance_score
20. `OutcomeReporter.get_agent_performance_summary()` — SELECT avg success rate, avg duration, total runs per agent_type last 7d

### TaskAuditor
21. `TaskAuditor.get_task_trace(task_id)` — SELECT full lifecycle: created → claimed → tool_calls → completed, return ordered list
22. `TaskAuditor.get_daily_summary()` — tasks dispatched, completed, failed, expired per agent_type today
23. `TaskAuditor.get_goal_to_result(task_id)` — single record: original_goal, agent_type, tools_used, outcome, duration_ms
24. `TaskAuditor.export_traces(date, filepath)` — export all task traces for a date to JSON file

### PriorityQueue
25. `PriorityQueue.insert(agent_type, goal, context, priority)` — INSERT with priority_weight: CRITICAL=100, HIGH=75, NORMAL=50, LOW=25
26. `PriorityQueue.claim_next(agent_type)` — SELECT task with highest priority_weight first (ORDER BY priority_weight DESC, created_at ASC)
27. `PriorityQueue.bump_priority(task_id, new_priority)` — UPDATE priority for waiting task
28. `PriorityQueue.get_queue_depth(agent_type)` — pending count by priority level

### Orchestrator Integration Methods
29. `TaskBridge.dispatch_goal(agent_type, goal, context, priority)` — public API: route + validate + dispatch
30. `TaskBridge.dispatch_from_gap_analysis(gap_list)` — take get_goal_gap_analysis() output, create tasks for each gap
31. `TaskBridge.dispatch_daily_routine()` — create all 06:00 morning routine tasks at once:
    - content-agent: "Run daily content pipeline for top niche"
    - social-media-agent: "Run niche research and comment on top 5 posts"
    - acquisition-agent: "Run pipeline advance for all Consideration prospects"
    - revenue-agent: "Run daily KPI check and create gap tasks"
32. `TaskBridge.get_system_status()` — all agents: pending tasks, last completed task, performance score

### Supabase Schema
33. Migration: `actp_orchestrator_feedback` — task_id FK, agent_type, goal, outcome, classification (success/partial/failure), performance_delta, created_at
34. Add columns to `actp_agent_tasks`: `expires_at timestamptz`, `priority_weight int default 50`, `result_read bool default false`, `cancelled_reason text`
35. Add column to `actp_agent_registry`: `performance_score float default 1.0`
36. Index: `actp_agent_tasks (agent_type, status, priority_weight DESC, created_at ASC)` — optimizes claim_next query

### Health Routes
37. `GET /api/bridge/status` — queue depths per agent, pending/completed/failed counts, expiry stats
38. `GET /api/bridge/trace/:task_id` — full task trace
39. `GET /api/bridge/performance` — per-agent performance scores + success rates
40. `POST /api/bridge/dispatch` — manually dispatch a task (body: agent_type, goal, context, priority)
41. `GET /api/bridge/daily-summary` — today's task stats across all agents

### Tests
42. `test_router_routes_social_keywords()` — "post a comment on TikTok" → social-media-agent
43. `test_router_routes_content_keywords()` — "generate 10 scripts for solopreneur" → content-agent
44. `test_dispatcher_validates_empty_goal()` — empty goal string raises ValidationError
45. `test_dispatcher_expires_stale_tasks()` — seed task created 2hr ago, run expire_stale_tasks(), verify status=expired
46. `test_priority_queue_returns_critical_first()` — queue LOW+CRITICAL tasks, verify CRITICAL claimed first
47. `test_outcome_reporter_updates_performance_score()` — 10 success + 2 fail → verify performance_score = 0.83
48. `test_dispatch_daily_routine_creates_4_tasks()` — call dispatch_daily_routine(), verify 4 task rows inserted
49. `test_task_trace_full_lifecycle()` — dispatch → claim → complete, verify trace has all 3 stages

## Key Files
- `task_bridge.py` (new)
- `task_router.py` (new)
- `native_tool_agent.py` (modify: get_next_task() uses PriorityQueue.claim_next())
- `worker.py` (modify: import TaskBridge, call dispatch_daily_routine at 06:00)
