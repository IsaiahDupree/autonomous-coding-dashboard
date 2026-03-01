# PRD-118: ACD Validation & Parallel Test Runner

## Project
- **Repo**: /Users/isaiahdupree/Documents/Software/actp-worker
- **Feature List**: /Users/isaiahdupree/Documents/Software/actp-worker/prd-118-features.json
- **Priority**: P1 — validates every PRD is complete before launch; prevents running broken agents

## Context

The Autonomous Coding Dashboard (ACD) builds multiple PRDs in parallel. Before launching the full system, we need a validation framework that:
1. Reads every `prd-NNN-features.json` and checks pass rates
2. Runs all pytest suites in parallel across PRDs
3. Validates Supabase migrations are applied correctly
4. Checks all required environment variables
5. Verifies all Safari service ports respond
6. Produces a single pass/fail report so the operator knows what's ready to launch

This is the **pre-flight check** before `worker.py` starts. It can also run as a CI gate in the ACD harness.

## Architecture

```
validate.py — EverReach OS Pre-Flight Validator
    ├── FeatureListValidator    — check prd-NNN-features.json pass rates
    ├── PytestParallelRunner    — run all test files in parallel (asyncio.gather)
    ├── MigrationChecker        — verify required DB tables exist in Supabase
    ├── EnvChecker              — validate all required env vars present
    ├── SafariPortChecker       — HTTP health check all 12 Safari ports
    ├── ServiceEndpointChecker  — check all cloud services (GenLite, HookLite, etc.)
    ├── ValidationReporter      — compile pass/fail report, save to Supabase
    └── ValidationServer        — GET /validate, GET /validate/report/latest
```

## Task

### FeatureListValidator
1. `FeatureListValidator.FEATURE_FILES` — dict: prd_id → feature_list path for all PRDs 100-118
2. `FeatureListValidator.load(prd_id)` — load and parse prd-NNN-features.json
3. `FeatureListValidator.get_pass_rate(prd_id)` — passed/total features ratio for a PRD
4. `FeatureListValidator.get_all_pass_rates()` — return dict: prd_id → {passed, total, pct}
5. `FeatureListValidator.get_ready_prds(threshold=0.9)` — PRDs with >= 90% features passing
6. `FeatureListValidator.get_blocking_prds()` — P0 PRDs with < 50% pass rate (must fix before launch)
7. `FeatureListValidator.summarize()` — table: prd_id | passed | total | % | status (ready/partial/blocked)

### PytestParallelRunner
8. `PytestParallelRunner.discover_test_files(repo_path)` — find all tests/test_*.py files
9. `PytestParallelRunner.run_suite(test_file, timeout=120)` — asyncio: subprocess pytest --tb=short -q, capture output
10. `PytestParallelRunner.run_all_parallel()` — asyncio.gather all test suites, collect results
11. `PytestParallelRunner.parse_pytest_output(stdout)` — extract passed/failed/error counts from pytest summary line
12. `PytestParallelRunner.get_summary()` — dict: test_file → {passed, failed, errors, duration_ms}
13. `PytestParallelRunner.get_total_counts()` — sum across all suites: total_passed, total_failed, total_errors
14. `PytestParallelRunner.get_failed_tests()` — list of (test_file, test_name) for all failures
15. `PytestParallelRunner.run_for_prd(prd_id)` — run only tests related to a specific PRD

### MigrationChecker
16. `MigrationChecker.REQUIRED_TABLES` — complete list of all tables that must exist (from PRD-100 through PRD-118):
    actp_agent_runs, actp_agent_memory, actp_agent_tasks, actp_tool_call_log,
    actp_engagement_actions, actp_viral_templates, actp_deal_log, actp_revenue_goals,
    actp_weekly_snapshots, anthropic_cost_log, actp_orchestrator_feedback,
    actp_gen_jobs, actp_follower_snapshots, actp_post_checkbacks, actp_content_performance,
    actp_gate_stats, actp_volume_tracker, actp_niche_performance, actp_agent_registry
17. `MigrationChecker.check_table_exists(table_name)` — SELECT 1 FROM information_schema.tables WHERE table_name=X
18. `MigrationChecker.check_all()` — return dict: table_name → exists bool
19. `MigrationChecker.get_missing_tables()` — list of tables that don't exist yet
20. `MigrationChecker.get_migration_commands()` — return list of SQL files that need to be applied for missing tables

### EnvChecker
21. `EnvChecker.REQUIRED_VARS` — dict: var_name → {required: bool, description: str}:
    ```
    ANTHROPIC_API_KEY: required
    SUPABASE_URL: required
    SUPABASE_SERVICE_ROLE_KEY: required
    NATIVE_AGENT_MODEL: optional (default claude-sonnet-4-5)
    STRIPE_SECRET_KEY: optional (warns if missing — blocks revenue agent)
    TELEGRAM_BOT_TOKEN: optional (warns — blocks weekly reports)
    APPLE_KEY_ID: optional (warns — blocks App Store revenue)
    ENABLE_SOCIAL_MEDIA_AGENT: optional (default false)
    ENABLE_CONTENT_AGENT: optional
    ENABLE_ACQUISITION_AGENT: optional
    ENABLE_REVENUE_AGENT: optional
    ```
22. `EnvChecker.check_all()` — return dict: var_name → {present, value_masked, status: ok/warn/error}
23. `EnvChecker.get_blocking_missing()` — required vars that are missing (blocks startup)
24. `EnvChecker.get_warnings()` — optional vars that are missing (degrades functionality)
25. `EnvChecker.print_summary()` — colored table: ✅ ok / ⚠️ warn / ❌ error per var

### SafariPortChecker
26. `SafariPortChecker.PORTS` — dict: port → service_name for all 12 Safari ports:
    ```
    3001: instagram-dm, 3002: tiktok-dm, 3003: twitter-dm, 3004: threads-comments,
    3005: instagram-comments, 3006: tiktok-comments, 3007: twitter-comments,
    3009: facebook-comments, 3105: linkedin, 3106: market-research, 3108: upwork
    ```
27. `SafariPortChecker.check_port(port, timeout=3)` — GET http://localhost:{port}/health, return up/down/latency
28. `SafariPortChecker.check_all_parallel()` — asyncio.gather all port checks
29. `SafariPortChecker.get_critical_ports()` — ports required for core functionality: 3001, 3002, 3005, 3106
30. `SafariPortChecker.get_status_summary()` — dict: service → {up, latency_ms, error}

### ServiceEndpointChecker
31. `ServiceEndpointChecker.ENDPOINTS` — dict: service_name → url for all cloud services:
    ```
    genlite: https://actp-genlite-bj9s9aswy-isaiahduprees-projects.vercel.app/api/health
    hooklite: https://hooklite-hrvcbd155-isaiahduprees-projects.vercel.app/api/health
    contentlite: https://contentlite-bf8rwf8z6-isaiahduprees-projects.vercel.app/api/health
    metricslite: https://metricslite-ea58t3a9r-isaiahduprees-projects.vercel.app/api/health
    researchlite: https://researchlite-nvn955oaj-isaiahduprees-projects.vercel.app/api/health
    mplite: https://mediaposter-lite-isaiahduprees-projects.vercel.app/api/health
    workflow-engine: https://workflow-engine-7vhmjxq8i-isaiahduprees-projects.vercel.app/api/health
    ```
32. `ServiceEndpointChecker.check_service(name, url, timeout=10)` — GET url, return status_code, latency_ms
33. `ServiceEndpointChecker.check_all_parallel()` — asyncio.gather all endpoint checks
34. `ServiceEndpointChecker.get_degraded_services()` — services returning non-200 or timeout

### ValidationReporter
35. `ValidationReporter.build_report(all_check_results)` — compile full validation report dict:
    ```json
    {
      "timestamp": "...", "overall_status": "ready|partial|blocked",
      "feature_lists": {}, "tests": {}, "migrations": {}, "env": {},
      "safari_ports": {}, "cloud_services": {},
      "ready_agents": [], "blocked_agents": [],
      "launch_recommendation": "safe_to_launch|fix_first|partial_launch"
    }
    ```
36. `ValidationReporter.save_to_supabase(report)` — INSERT into actp_validation_reports
37. `ValidationReporter.print_summary(report)` — colored console output: sections with ✅/⚠️/❌
38. `ValidationReporter.get_launch_recommendation(report)` — logic:
    - `safe_to_launch`: all P0 PRDs >= 90%, all required env ok, DB tables present
    - `partial_launch`: P0 PRDs >= 70%, some warnings, non-critical services down
    - `fix_first`: any P0 PRD < 50%, required env missing, critical DB tables absent

### Migration for Validation
39. Migration: `actp_validation_reports` — id, timestamp, overall_status, report_json, passed_count, failed_count, launch_recommendation, created_at

### Main Entry Point
40. `async def main()` — run all checks in parallel:
    1. asyncio.gather(feature_validator, pytest_runner, migration_checker, env_checker, safari_checker, service_checker)
    2. Build report
    3. Save to Supabase
    4. Print summary
    5. Exit with code 0 (all pass) or 1 (any blocking failure)
41. `if __name__ == '__main__': asyncio.run(main())`
42. CLI flag `--fast` — skip pytest (feature lists + env + ports only, runs in <10s)
43. CLI flag `--prd PRD_ID` — validate only a specific PRD
44. CLI flag `--fix-missing-tables` — auto-apply migrations for missing tables
45. CLI flag `--json` — output report as JSON to stdout (for CI integration)

### Health Routes
46. `GET /validate` — run full validation, return JSON report (slow, ~60s with pytest)
47. `GET /validate/fast` — run fast validation (no pytest), return JSON report (<10s)
48. `GET /validate/report/latest` — return last saved validation report from Supabase
49. `GET /validate/safari-ports` — current Safari port status only
50. `GET /validate/features` — feature list pass rates for all PRDs

### Tests
51. `test_feature_validator_loads_all_prds()` — verify feature files found for PRD-111 through PRD-118
52. `test_pytest_runner_parses_output()` — mock pytest output "5 passed, 1 failed", verify counts extracted
53. `test_migration_checker_detects_missing_table()` — mock Supabase, verify missing table returned
54. `test_env_checker_blocks_on_missing_api_key()` — unset ANTHROPIC_API_KEY, verify get_blocking_missing() non-empty
55. `test_safari_port_checker_handles_connection_refused()` — mock port refusing, verify up=False in result
56. `test_launch_recommendation_safe_when_all_pass()` — all checks pass, verify 'safe_to_launch'
57. `test_launch_recommendation_fix_first_on_missing_env()` — missing ANTHROPIC_API_KEY, verify 'fix_first'

## Key Files
- `validate.py` (new — main pre-flight validator)
- `validation_runner.py` (new — parallel pytest runner)
- `tests/` (existing — all test files discovered automatically)

## Run
```bash
# Full validation with pytest
python3 validate.py

# Fast validation (no pytest)
python3 validate.py --fast

# Validate specific PRD
python3 validate.py --prd prd-112

# CI mode (JSON output, exit code)
python3 validate.py --json > validation_report.json
echo $?  # 0=pass, 1=fail
```
