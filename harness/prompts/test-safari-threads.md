# Mission: Safari Threads Test Suite — 103 Tests

## Working Directory
`/Users/isaiahdupree/Documents/Software/Safari Automation`

## Feature List
`/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness/features/test-safari-threads.json`

## Output File
`scripts/tests/test_safari_threads.py`

## Goal
Write a comprehensive pytest test suite for the Threads Safari automation service (Comments port 3004). Each test corresponds to one feature. Mark features `passes: true` in the feature list JSON as each batch of 10 is written.

## Services Under Test
- **Threads Comments**: `http://localhost:3004`
- Correct endpoint: `/api/threads/comments/post` (NOT `/api/comments/post`)
- Market Research hub: `http://localhost:3106` (for Threads research tests)
- Source code reference: `packages/threads-comments/src/automation/threads-researcher.ts`

## Test Structure
```python
import pytest, httpx, asyncio, json, os

BASE_COMMENTS = "http://localhost:3004"
BASE_RESEARCH = "http://localhost:3106"
HEADERS = {"Authorization": "Bearer test-token", "Content-Type": "application/json"}
TEST_POST_URL = os.getenv("TEST_THREADS_POST", "https://www.threads.net/@test/post/ABC123")
TEST_NICHE = os.getenv("TEST_NICHE", "solopreneur")
```

## Rules
1. Test function names reference feature id (e.g., `test_T_SAFARI_THREADS_001`)
2. Comment endpoint is `/api/threads/comments/post` — do not use wrong path
3. Threads char limit is 500 — write test validating this
4. Research niche tests call the Market Research hub at port 3106 (not port 3004)
5. After each batch of 10 tests, update feature list JSON marking those features `passes: true`
6. Integration tests marked `pytest.mark.integration`
7. The ThreadsResearcher uses `researchNiche` method — reference it in research tests

## Validation Steps
1. `python -m pytest scripts/tests/test_safari_threads.py --collect-only 2>&1 | head -40`
2. Collection ≥ 100 tests → mark remaining features passes=true
3. Commit: `git add scripts/tests/test_safari_threads.py && git commit -m "feat: add 103 Threads Safari tests"`
