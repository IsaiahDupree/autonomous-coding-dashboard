# PRD-106: HookLite Hard-Reject Gate Integration

## Project
- **Repo**: /Users/isaiahdupree/Documents/Software/actp-worker
- **Feature List**: /Users/isaiahdupree/Documents/Software/actp-worker/prd-106-features.json
- **Priority**: P0 (CRITICAL — publishing low-quality hooks kills algorithm reach)

## Context

HookLite exists as a Vercel service (`hooklite-hrvcbd155-isaiahduprees-projects.vercel.app`) with a rubric-based scoring system. However, the publish pipeline does NOT currently enforce the gate — content flows through regardless of hook quality score. This means weak hooks are being published, suppressing algorithmic reach and making it impossible to hit 100K average views.

This PRD wires the HookLite gate as a hard blocker in the content pipeline:
- Score every piece of content before it reaches the publish queue
- Hard-reject anything below 85/100 (top 5%)
- Auto-regenerate rejected content and re-score (max 3 attempts)
- Track gate pass/fail rates to measure content quality improvement over time

## Architecture

```
HookGateIntegration (hook_gate_integration.py)
      ├── HookScorer         — calls HookLite API, parses scores
      ├── GateEnforcer       — blocks publish if score < threshold
      ├── RegenerationLoop   — retry generation on failure (max 3x)
      └── GateMetrics        — track pass rates, avg scores per niche
```

## Task

### HookLite API Client
1. `HookScorer.score(content_text, platform)` — POST to HookLite /api/review, return score 0-100
2. `HookScorer.score_batch(pieces, platform)` — score all pieces in one call (batch endpoint)
3. `HookScorer.parse_response(response)` — extract numeric score + rejection_reasons list
4. `HookScorer.get_rubric_dimensions(score_response)` — return per-dimension scores (hook, clarity, cta, etc.)
5. `HookScorer.is_top_5_percent(score)` — True if score >= 85
6. `HookScorer.get_hooklite_url()` — read HOOKLITE_URL from env, fallback to deployed Vercel URL

### Gate Enforcer
7. `GateEnforcer.check(piece)` — score + return GateResult(passed, score, reasons)
8. `GateEnforcer.check_batch(pieces)` — returns list of GateResult per piece
9. `GateEnforcer.filter_passing(pieces)` — return only pieces with score >= 85
10. `GateEnforcer.block_publish(piece_id, score, reasons)` — mark piece as gate_rejected in DB
11. `GateEnforcer.allow_publish(piece_id, score)` — mark piece as gate_passed in DB
12. `GateEnforcer.get_rejection_summary(piece)` — concise string: "Score 71/100 — weak CTA, no tension"

### Regeneration Loop
13. `RegenerationLoop.attempt(piece, brief, attempt_num)` — regenerate piece, re-score
14. `RegenerationLoop.run(piece, brief, max_attempts=3)` — loop until pass or exhaust attempts
15. `RegenerationLoop.build_improvement_prompt(piece, rejection_reasons)` — "Fix: [reasons]. Original: [text]"
16. `RegenerationLoop.log_attempt(piece_id, attempt, score, passed)` — store in actp_gate_attempts
17. `RegenerationLoop.escalate_if_exhausted(piece_id)` — mark as permanently rejected after 3 fails

### Pipeline Integration Points
18. Patch `organic_publisher.py` `_publish_to_platform()` — call gate check before any publish, block if failed
19. Patch `PublishRouter.schedule_multi_platform()` (PRD-102) — gate check before scheduling
20. Patch `blotato_executor` in `workflow_executors.py` — gate check before blotato_multi_publish step
21. Patch `research-to-blotato` workflow — add `hook-gate` step between `generate-content` and `publish-blotato`
22. Add `hook_gate_score` column to `actp_published_content` table
23. Add gate check to `save_published_content` RPC — reject if no gate score recorded

### Supabase Tables
24. Create migration `actp_gate_attempts` — id, piece_id, attempt_num, score, passed, rejection_reasons jsonb, attempted_at
25. Create migration `actp_gate_stats` — id, date, niche, platform, total_scored, passed, failed, avg_score, avg_attempts
26. Add `gate_score` and `gate_passed` columns to `actp_published_content`
27. `get_gate_pass_rate(niche, days=7)` — % of pieces passing gate per niche
28. `get_avg_score_by_niche()` — avg hook score per niche, sorted

### Gate Metrics
29. `GateMetrics.record_result(piece_id, niche, platform, score, passed, attempts)` — persist to actp_gate_stats
30. `GateMetrics.get_daily_stats(date)` — pass rate, avg score, avg attempts for date
31. `GateMetrics.get_niche_quality_ranking()` — niches sorted by avg hook score
32. `GateMetrics.alert_if_pass_rate_drops(threshold=0.3)` — notify if <30% of content passing (prompt quality issue)

### Health Server Routes
33. `GET /api/gate/stats` — today's pass rate, avg score, failures
34. `GET /api/gate/niche-ranking` — niches by avg hook score
35. `POST /api/gate/score` — manually score a piece of content
36. `GET /api/gate/failures` — recent gate failures with rejection reasons

### Tests
37. `test_gate_blocks_low_score()` — mock score=60, verify publish blocked
38. `test_gate_passes_high_score()` — mock score=90, verify publish allowed
39. `test_regeneration_loop_retries_3x()` — mock 3 failures, verify escalate_if_exhausted called
40. `test_pipeline_patch_organic_publisher()` — verify gate called before publish in organic_publisher.py
41. `test_gate_metrics_pass_rate()` — seed 10 attempts (7 pass, 3 fail), verify 70% pass rate

## Key Files
- `hook_gate_integration.py` (new)
- `organic_publisher.py` (patch — add gate check)
- `workflow_executors.py` (patch — add gate step to blotato executor)
- `health_server.py` (add /api/gate routes)

## Testing
```bash
python3 -m pytest tests/test_hook_gate_integration.py -v
python3 hook_gate_integration.py --score "Are you making this common mistake with your content?" --platform tiktok
```
