# Mission: Safari MCP Agents — Final Claude Code E2E Validation

## Working Directory
`/Users/isaiahdupree/Documents/Software/Safari Automation`

## Feature List
`/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness/features/test-safari-e2e-claudecode.json`

## Output File
`scripts/tests/safari_e2e_results.json`

## Goal
You are the **final integration validator** for all Safari MCP automation services. Unlike the other test-writing tasks, you do NOT write pytest files. Instead, you **directly call your own MCP tools** (`mcp6_safari_*` and `mcp7_safari_*`) to execute each feature test live, one at a time, and record the outcome.

Each feature in the feature list maps to a real MCP tool call. After each call:
1. Check whether the response satisfies the feature's acceptance criteria
2. Record `passed: true/false` and any `error` string in the results JSON
3. Mark the feature `passes: true` in the feature list JSON if it passed
4. Move to the next feature immediately — **never run two Safari operations concurrently**

## Test Accounts (safe to use)
- Instagram: `the_isaiah_dupree`
- Twitter: `IsaiahDupree7`
- TikTok: `isaiah_dupree`
- LinkedIn: `isaiah-dupree` (use sparingly — 10 req/day limit)
- Test TikTok video URL: `https://www.tiktok.com/@isaiah_dupree/video/7000000000000000001` (use any valid known URL)
- Test Instagram post URL: use `os.getenv("TEST_IG_POST", "https://www.instagram.com/p/PLACEHOLDER")` pattern in notes
- Test Tweet URL: `https://twitter.com/IsaiahDupree7/status/1` (any valid known tweet)
- Test Threads post: `https://www.threads.net/@the_isaiah_dupree/post/TEST` (any valid known post)

## MCP Tools Available
### mcp6_safari_* (Safari Automation — platform driver)
- `mcp6_safari_health_check` — check all services
- `mcp6_safari_session_ensure(platform)` — lock Safari tab
- `mcp6_safari_session_status(platform)` — current session info
- `mcp6_safari_session_clear(platform)` — force re-scan
- `mcp6_safari_navigate_inbox(platform)` — open DM inbox
- `mcp6_safari_get_conversations(platform)` — list DM conversations
- `mcp6_safari_send_dm(platform, username, text)` — send DM
- `mcp6_safari_post_comment(platform, postUrl, text, useAI?)` — post comment
- `mcp6_safari_market_research(platform, keyword, maxPosts?)` — quick keyword search
- `mcp6_safari_competitor_research(platform, niche, maxCreators?, maxPosts?)` — async competitor ranking
- `mcp6_safari_execute_js(platform, script)` — run JS in active tab

### mcp7_safari_* (Safari Web Inspector — dev tools)
- `mcp7_safari_start_session(sessionId)` — create inspection session
- `mcp7_safari_list_sessions()` — list active sessions
- `mcp7_safari_navigate(sessionId, url)` — navigate to URL
- `mcp7_safari_get_page_info(sessionId)` — get URL + title
- `mcp7_safari_take_screenshot(sessionId)` — screenshot
- `mcp7_safari_execute_script(sessionId, script)` — run JS
- `mcp7_safari_inspect_element(sessionId, selector)` — DOM inspection
- `mcp7_safari_get_console_logs(sessionId)` — console output
- `mcp7_safari_get_network_logs(sessionId)` — network activity
- `mcp7_safari_clear_console_logs(sessionId)` — clear logs
- `mcp7_safari_close_session(sessionId)` — end session

## Execution Rules
1. **One at a time** — complete each MCP call fully before starting the next feature
2. **Services must be running** — before starting, call `mcp6_safari_health_check`. If any required service is down, note it in results as `skipped: "service unavailable"` and continue
3. **Don't crash on failure** — if an MCP call throws or returns an error, mark the feature `passed: false`, record the error, and continue to the next feature
4. **Destructive actions** — DMs/comments are safe to send to own test accounts. LinkedIn: note the rate limit in results
5. **Process in batches of 10** — after every 10 features, write/update `scripts/tests/safari_e2e_results.json` and mark passed features in the feature list JSON
6. **Session isolation** — after finishing all tests for one platform, call `mcp6_safari_session_clear` for that platform before moving to the next

## Results JSON Format
Write `scripts/tests/safari_e2e_results.json` in this exact shape:
```json
{
  "runAt": "2026-03-01T00:00:00.000Z",
  "summary": {
    "total": 103,
    "passed": 0,
    "failed": 0,
    "skipped": 0
  },
  "results": [
    {
      "id": "T-SAFARI-E2E-001",
      "name": "Health check: all services via mcp6_safari_health_check",
      "passed": true,
      "error": null,
      "skipped": false,
      "notes": "All 9 services healthy"
    }
  ]
}
```

## Execution Order
Work through features in the order they appear in the feature list, grouped by category:
1. **health** (001–010) — run health_check first; if critical services are down, mark dependent features as skipped
2. **session** (011–019) — ensure/status/clear for each platform
3. **instagram** (020–027) — navigate, conversations, DM, comment
4. **twitter** (028–035) — navigate, conversations, DM, comment (plain + AI)
5. **tiktok** (036–043) — navigate, conversations, DM, comment
6. **threads** (044–047) — comment, endpoint verification
7. **linkedin** (048–051) — DM + rate limit check
8. **market_research** (052–067) — all 4 platforms × keyword + competitor research
9. **safari_inspector** (068–078) — mcp7 full session lifecycle
10. **integration** (079–084, 103) — cross-platform pipelines
11. **rate_limits** (085–088) — verify rate limit fields
12. **error_handling** (089–092) — error shapes on bad inputs
13. **advanced** (093–095) — execute_js
14. **reporting** (096–102) — write final results, update feature list, commit

## Final Steps
After all 103 features are tested:
1. Write final `scripts/tests/safari_e2e_results.json` with complete summary
2. Update feature list JSON — mark all passing features `passes: true`
3. Commit:
   ```
   git add scripts/tests/safari_e2e_results.json
   git add /Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness/features/test-safari-e2e-claudecode.json
   git commit -m "test(safari-e2e): XX/103 features passing — final MCP Claude Code validation"
   ```
