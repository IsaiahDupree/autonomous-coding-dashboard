# PRD-100: Cognitive Orchestrator Terminal (COT)

## Project
- **Repo**: /Users/isaiahdupree/Documents/Software/actp-worker
- **Feature List**: /Users/isaiahdupree/Documents/Software/actp-worker/prd-100-features.json
- **Priority**: P0 (CRITICAL — system brain)

## Context

The Cognitive Orchestrator Terminal (COT) is the main brain of the autonomous business machine. It sits above all other agents, receives business goals, plans daily workflows, delegates tasks to specialized agents, monitors outcomes, and continuously optimizes toward the defined targets:

- $5,000+/month revenue → $50,000 cumulative in 3 months
- 1,000,000 followers on TikTok, Instagram, YouTube, Twitter/X, Threads
- 100,000+ average views per video
- 2–3 posts/day per platform
- All 10 AAG acquisition agents running 24/7
- AI costs ≤ $400/month

The COT runs as a persistent Python asyncio daemon in `actp-worker`, firing a daily 06:00 routine automatically, tracking progress against all goals, making delegation decisions, and surfacing optimization recommendations.

## Architecture

```
BusinessGoals (goals.py)
      ↓
CognitiveOrchestrator (cognitive_orchestrator.py)
      ├── GoalTracker        — reads Supabase, computes % toward each goal
      ├── DailyPlanner       — generates today's action plan from goals + state
      ├── AgentDelegator     — dispatches tasks to sub-agents via ACTP task queue
      ├── OutcomeEvaluator   — scores results, classifies wins/losses
      └── OptimizationEngine — adjusts strategy based on feedback
```

## Task

Implement the full Cognitive Orchestrator Terminal:

### Core Module: `cognitive_orchestrator.py`
1. `GoalTracker.load_goals()` — loads all business goals from `goals.py` config
2. `GoalTracker.compute_progress()` — queries Supabase for current metrics vs. targets
3. `GoalTracker.get_gap_report()` — returns ranked list of goals furthest from target
4. `DailyPlanner.generate_plan(gap_report)` — builds today's action plan (content volume, outreach targets, app submissions)
5. `DailyPlanner.prioritize_actions(plan)` — sorts by ROI × urgency
6. `AgentDelegator.dispatch(action)` — pushes tasks to ACTP workflow task queue
7. `AgentDelegator.broadcast_goals(agents)` — sends current goal state to all sub-agents
8. `OutcomeEvaluator.evaluate(results)` — scores each completed action (pass/fail/partial)
9. `OutcomeEvaluator.classify_outcome(metric, threshold)` — viral/strong/average/weak/flop
10. `OptimizationEngine.adjust_strategy(evaluations)` — updates niche configs, posting frequency, outreach targets

### Goals Config: `goals.py`
11. Define `REVENUE_GOALS` dict: monthly targets, product breakdown (EverReach, ClientPortal, Upwork, services)
12. Define `AUDIENCE_GOALS` dict: per-platform follower targets, views/video target
13. Define `AUTONOMY_GOALS` dict: agent uptime %, daily routine completion rate
14. Define `EFFICIENCY_GOALS` dict: AI cost ceiling $400/month, batch size minimums
15. `compute_goal_score(goal_key)` → 0.0–1.0 normalized progress

### Daily Routine: `daily_routine.py`
16. `run_morning_routine()` — fires at 06:00, triggers research, content gen, publish, prospect
17. `schedule_daily_routine()` — uses APScheduler to register 06:00 cron
18. `run_midday_check()` — 12:00 feedback checkbacks, classify performance
19. `run_evening_optimize()` — 19:00 analyze winners, update strategy for tomorrow
20. `routine_status()` — returns completion status of each routine phase

### Orchestrator Loop
21. `start_orchestrator_loop()` — asyncio main loop, runs continuously
22. `health_check_all_agents()` — pings all registered agents, flags unhealthy
23. `auto_recover_agent(agent_id)` — triggers self-healing for failed agents
24. `log_orchestrator_event(event_type, data)` — writes to `actp_orchestrator_log` table
25. `get_orchestrator_status()` — returns full system status dict

### Supabase Tables
26. Create migration for `actp_orchestrator_log` — id, event_type, data jsonb, created_at
27. Create migration for `actp_goal_snapshots` — id, goal_key, current_value, target_value, pct_complete, snapshot_at
28. Create migration for `actp_daily_plans` — id, plan_date, actions jsonb, status, completed_at
29. Seed initial goal snapshot from current known values
30. `get_latest_snapshot(goal_key)` — query helper

### Health Server Integration
31. `GET /api/orchestrator/status` — full system status
32. `GET /api/orchestrator/goals` — current goal progress %
33. `GET /api/orchestrator/plan/today` — today's action plan
34. `POST /api/orchestrator/plan/trigger` — manually trigger daily plan
35. `GET /api/orchestrator/log` — last 50 orchestrator events

### Testing
36. `test_goal_tracker_compute()` — verify progress computation
37. `test_daily_planner_generates_valid_plan()` — plan has ≥5 actions
38. `test_outcome_evaluator_classifies_correctly()` — viral/flop classification
39. `test_optimization_engine_adjusts_niche()` — strategy update on flop
40. `test_morning_routine_fires()` — mock APScheduler, verify all phases called

## Key Files
- `cognitive_orchestrator.py` (new — main COT module)
- `goals.py` (new — business goals config)
- `daily_routine.py` (new — scheduled automation)
- `health_server.py` (add routes)
- `worker.py` (boot orchestrator loop)

## Testing
```bash
python3 -m pytest tests/test_cognitive_orchestrator.py -v
python3 cognitive_orchestrator.py --status
python3 daily_routine.py --run-morning
```
