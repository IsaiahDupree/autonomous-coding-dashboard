# PRD-120: Cross-Agent Goal Optimizer

## Project
- **Repo**: /Users/isaiahdupree/Documents/Software/actp-worker
- **Feature List**: /Users/isaiahdupree/Documents/Software/actp-worker/prd-120-features.json
- **Depends On**: PRD-111 through PRD-119 (all domain agents), PRD-117 (Task Bridge)
- **Priority**: P1 — the outer feedback loop that makes the whole system self-improving

## Context

EverReach OS has 5 domain agents (Social, Content, Acquisition, Revenue, Product) all running in parallel. But there is no agent responsible for:
1. **Evaluating** whether the system as a whole is converging toward goals
2. **Comparing** agent performance (which agent is underperforming? which strategies work?)
3. **Tuning** system prompts and goal parameters dynamically based on observed outcomes
4. **Amplifying** winning strategies (re-run viral templates, scale working outreach sequences)
5. **Killing** losing strategies (remove flop content patterns, retire dead outreach scripts)
6. **Rebalancing** agent resource allocation (e.g., double content if audience growth is behind)

This PRD builds `goal_optimizer.py` — the **outer closed-loop controller** for EverReach OS. It reads outcomes from all other agents and writes updated configurations back, completing the self-improving feedback cycle described in the architectural vision.

## Architecture

```
GoalOptimizerAgent (extends NativeToolAgent, PRD-111)
    ├── GoalGapAnalyzer     — measure actual vs target for all 6 KPI dimensions
    ├── AgentPerformanceRanker — rank all 5 agents by success rate + output quality
    ├── StrategyAmplifier   — detect and re-run winning content/outreach patterns
    ├── StrategyKiller      — detect and retire losing patterns
    ├── SystemPromptTuner   — update agent system prompts in Supabase based on performance
    ├── ResourceRebalancer  — adjust agent poll intervals + task priorities
    └── WeeklyOptimizationReport — comprehensive system health + learning summary

Tools registered: 30 total
System prompt: meta-optimizer with full visibility across all agents and business KPIs
Preset goals: daily_optimization_cycle, weekly_strategy_review
Crons: daily 05:30 (before 06:00 daily routine), weekly Saturday 23:00
```

## Task

### GoalGapAnalyzer Tools
1. `tool_get_all_kpi_gaps()` — query all 6 goal dimensions:
   - Revenue: actual MRR vs $9,500 target (Month 1); cumulative vs $50K (3-month)
   - Products: EverReach users vs 100, ClientPortal users vs 30, Rork apps approved vs 21
   - Audience: followers per platform vs 1M, avg views vs 100K
   - Autonomy: % of tasks completed without manual intervention in last 7d
   - Content Quality: % of published posts scoring >= top 5% HookLite gate
   - Efficiency: AI cost this month vs $400 ceiling
2. `tool_get_revenue_gap()` — SELECT from actp_weekly_snapshots + Stripe + Apple, return {actual, target, gap, pct_to_goal}
3. `tool_get_audience_gap()` — SELECT from actp_follower_snapshots per platform, return gap per platform + overall
4. `tool_get_content_quality_gap()` — SELECT from actp_gate_stats, return pct_passed vs 100% target
5. `tool_get_efficiency_gap()` — SELECT sum(cost_usd) FROM anthropic_cost_log WHERE month=current, return vs $400 target
6. `tool_get_autonomy_score()` — SELECT ratio: completed tasks / (completed + manual_override) last 7d from actp_agent_tasks
7. `tool_create_gap_remediation_tasks(gaps)` — for each critical gap, dispatch task to appropriate agent via TaskBridge

### AgentPerformanceRanker Tools
8. `tool_rank_agents_by_success_rate()` — SELECT agent_type, AVG(success) as success_rate, AVG(duration_ms), COUNT(*) FROM actp_orchestrator_feedback last 7d GROUP BY agent_type ORDER BY success_rate DESC
9. `tool_get_agent_output_quality(agent_type, days=7)` — domain-specific quality metrics:
   - social-media-agent: avg engagement rate on posted content
   - content-agent: pct of generated content that passed HookLite gate
   - acquisition-agent: prospect-to-reply rate, deal close rate
   - revenue-agent: forecast accuracy vs actual
   - product-agent: app build success rate, Stripe churn rate
10. `tool_compare_agent_iterations(agent_type)` — avg iterations per task now vs 7d ago (fewer = more efficient)
11. `tool_get_tool_call_distribution(agent_type)` — which tools are called most vs least in actp_tool_call_log

### StrategyAmplifier Tools
12. `tool_get_winning_content_patterns()` — SELECT template_id, hook_pattern, niche FROM actp_viral_templates WHERE viral_score > 0.8 AND created_at > now()-30d ORDER BY viral_score DESC LIMIT 10
13. `tool_amplify_content_pattern(template_id, times=3)` — INSERT task: 'Generate {times} new variations of template {template_id}, force all through HookLite gate, publish winners'
14. `tool_get_winning_outreach_sequences()` — SELECT sequence pattern from actp_deal_log WHERE stage='closed_won', extract common message structure
15. `tool_amplify_outreach_sequence(sequence_pattern)` — INSERT task to acquisition-agent: 'Apply this winning outreach sequence to next 20 qualified prospects'
16. `tool_get_winning_content_niches()` — SELECT niche FROM actp_niche_performance WHERE avg_views > 50000 ORDER BY avg_views DESC LIMIT 5
17. `tool_double_down_on_niche(niche)` — INSERT task to content-agent: 'Increase content output for {niche} to 2x posts/day for next 7d'

### StrategyKiller Tools
18. `tool_get_losing_content_patterns()` — SELECT template_id, hook_pattern FROM actp_viral_templates WHERE viral_score < 0.2 AND test_count >= 3 (published 3+ times and consistently flopped)
19. `tool_kill_content_pattern(template_id, reason)` — UPDATE actp_viral_templates SET retired=True, retired_reason=reason, retired_at=now()
20. `tool_get_losing_niches()` — SELECT niche FROM actp_niche_performance WHERE avg_views < 5000 AND post_count >= 5
21. `tool_kill_niche(niche, reason)` — INSERT into actp_niche_kills, INSERT task to content-agent: 'Stop generating content for niche: {niche}'
22. `tool_get_failed_outreach_patterns()` — SELECT message_template FROM actp_deal_log WHERE stage='no_response' AND sent_count >= 10 (10 sends, 0 replies)
23. `tool_kill_outreach_template(template_id, reason)` — UPDATE template to retired=True, notify acquisition-agent

### SystemPromptTuner Tools
24. `tool_get_agent_current_prompt(agent_type)` — SELECT system_prompt FROM actp_agent_prompts WHERE agent_type=X AND active=True
25. `tool_propose_prompt_improvement(agent_type, improvement_rationale)` — call Claude with: current prompt + performance data + rationale → return improved prompt text
26. `tool_update_agent_prompt(agent_type, new_prompt, reason)` — INSERT into actp_agent_prompts (new active row), UPDATE old to active=False, log to actp_prompt_history
27. `tool_rollback_agent_prompt(agent_type)` — SELECT previous prompt from actp_prompt_history, restore to active

### ResourceRebalancer Tools
28. `tool_get_agent_workload()` — SELECT agent_type, COUNT(*) as pending FROM actp_agent_tasks WHERE status='pending' GROUP BY agent_type
29. `tool_rebalance_agent_priorities()` — if audience growth < 30% of target: bump social + content tasks to HIGH; if revenue < 50% of target: bump acquisition tasks to CRITICAL
30. `tool_get_optimization_history()` — SELECT from actp_optimization_runs last 30d, return what changes were made + outcomes

### Agent Orchestration
31. `GoalOptimizerAgent.__init__()` — super().__init__('goal-optimizer', model, system_prompt) + register all 30 tools
32. `GoalOptimizerAgent.get_system_prompt()` — meta-optimizer: full business goals, all 6 KPI dimensions, strategy amplify/kill rules, prompt tuning authority, resource rebalancing authority
33. `GoalOptimizerAgent.run_daily_optimization_cycle()` — preset goal: 'Analyze all KPI gaps, rank agent performance, amplify top 3 winning strategies, kill any consistently failing patterns, adjust task priorities if any KPI < 40% of target'
34. `GoalOptimizerAgent.run_weekly_strategy_review()` — preset goal: 'Full system review: compare week-over-week KPI progress, update 1 underperforming agent system prompt, create next week optimization priorities, save snapshot'

### Supabase Migrations
35. Migration: `actp_agent_prompts` — id, agent_type text, system_prompt text, active bool default true, performance_snapshot jsonb, created_at
36. Migration: `actp_prompt_history` — id, agent_type, old_prompt, new_prompt, reason, changed_by text default 'goal-optimizer', created_at
37. Migration: `actp_optimization_runs` — id, run_type text (daily/weekly), kpi_gaps jsonb, actions_taken jsonb, agents_affected text[], created_at
38. Migration: `actp_niche_kills` — id, niche text, reason text, avg_views numeric, post_count int, killed_by text, created_at
39. Migration: add `retired bool default false`, `retired_reason text`, `retired_at timestamptz` to `actp_viral_templates`

### Health Routes
40. `GET /api/agents/optimizer/kpi-gaps` — all 6 KPI dimensions with actual vs target
41. `GET /api/agents/optimizer/agent-rankings` — all 5 agents ranked by success rate + quality score
42. `GET /api/agents/optimizer/winning-strategies` — top 5 content patterns + outreach sequences
43. `GET /api/agents/optimizer/history` — last 14 optimization runs with actions taken
44. `POST /api/agents/optimizer/trigger` — manually trigger daily_optimization_cycle

### Tests
45. `test_kpi_gaps_all_6_dimensions_returned()` — mock all data sources, verify get_all_kpi_gaps() returns 6 keys
46. `test_amplifier_creates_task_for_viral_template()` — mock viral template with score=0.9, verify task inserted to content-agent
47. `test_killer_retires_flop_pattern_after_3_publishes()` — mock template score=0.1 + test_count=4, verify retired=True after kill called
48. `test_prompt_tuner_logs_to_history()` — call update_agent_prompt(), verify actp_prompt_history row inserted + old prompt active=False
49. `test_rebalancer_bumps_acquisition_to_critical_when_revenue_under_50pct()` — revenue gap = 60%, verify acquisition tasks bumped to CRITICAL priority
50. `test_daily_cycle_runs_all_5_tool_categories()` — mock all tools, verify goal optimizer calls at least 1 tool from each category in one cycle

## Environment Variables
- `ENABLE_GOAL_OPTIMIZER=true`
- `OPTIMIZER_DAILY_CRON=30 5 * * *` (05:30 daily, before morning routine)
- `OPTIMIZER_MIN_DATA_DAYS=3` (don't optimize until 3 days of data collected)
- `OPTIMIZER_PROMPT_TUNE_THRESHOLD=0.6` (only tune prompts if agent success_rate < 0.6)
