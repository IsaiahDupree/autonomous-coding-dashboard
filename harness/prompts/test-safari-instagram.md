# Mission: Safari Instagram Test Suite — 103 Tests

## Working Directory
`/Users/isaiahdupree/Documents/Software/Safari Automation`

## Feature List
`/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness/features/test-safari-instagram.json`

## Output File
`scripts/tests/test_safari_instagram.py`

## Goal
Write a comprehensive pytest test suite for the Instagram Safari automation services (DM port 3001/3100, Comments port 3005). Each test corresponds to one feature in the feature list. When a test is written AND verified to be correct (runnable without import errors), mark its feature `passes: true` in the feature list JSON.

## Services Under Test
- **Instagram DM**: `http://localhost:3001` and `http://localhost:3100`
- **Instagram Comments**: `http://localhost:3005`
- Existing client: `scripts/instagram_client.py` (use as reference for endpoint shapes)

## Test Structure
```python
import pytest, httpx, asyncio, json

BASE_DM = "http://localhost:3001"
BASE_COMMENTS = "http://localhost:3005"
HEADERS = {"Authorization": "Bearer test-token", "Content-Type": "application/json"}

# Group tests by category matching feature list categories:
# health, auth, core, error_handling, edge_cases, rate_limiting,
# supabase, ai_features, native_tool_calling, session, performance
```

## Rules
1. Each test function name MUST match or reference the feature id (e.g., `test_T_SAFARI_INSTAGRAM_001`)
2. Tests should use `httpx` (sync or async) — import is available in the project
3. Tests that require a live service use `pytest.mark.integration` — still write them
4. Unit/static tests (error shape checks, schema validation) have no marker
5. After writing EACH batch of 10 tests, update the feature list JSON to mark those features `passes: true`
6. Use `pytest.mark.skip` with reason if a test needs a credential that's intentionally not hardcoded
7. Do NOT hardcode real usernames or post URLs — use env vars or constants at the top

## Validation Steps
After writing all tests:
1. Run `cd /Users/isaiahdupree/Documents/Software/Safari\ Automation && python -m pytest scripts/tests/test_safari_instagram.py --collect-only 2>&1 | head -40` to verify collection
2. If collection succeeds with 100+ tests, mark remaining features passes=true
3. Commit: `git add scripts/tests/test_safari_instagram.py && git commit -m "feat: add 103 Instagram Safari tests"`
