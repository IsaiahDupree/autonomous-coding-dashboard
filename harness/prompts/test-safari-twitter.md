# Mission: Safari Twitter Test Suite — 103 Tests

## Working Directory
`/Users/isaiahdupree/Documents/Software/Safari Automation`

## Feature List
`/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness/features/test-safari-twitter.json`

## Output File
`scripts/tests/test_safari_twitter.py`

## Goal
Write a comprehensive pytest test suite for the Twitter Safari automation services (DM port 3003, Comments port 3007). Each test corresponds to one feature in the feature list. When a test is written AND verified to be correct (runnable without import errors), mark its feature `passes: true` in the feature list JSON.

## Services Under Test
- **Twitter DM**: `http://localhost:3003`
- **Twitter Comments**: `http://localhost:3007`
- Existing client: `scripts/dm_outreach_client.py` and `packages/twitter-dm/src/api/` (use as reference)
- Known issue: Twitter composeTweet typing fails (known regression, write the test but mark as xfail)

## Test Structure
```python
import pytest, httpx, asyncio, json, os

BASE_DM = "http://localhost:3003"
BASE_COMMENTS = "http://localhost:3007"
HEADERS = {"Authorization": "Bearer test-token", "Content-Type": "application/json"}
TEST_HANDLE = os.getenv("TEST_TWITTER_HANDLE", "saraheashley")
TEST_TWEET_URL = os.getenv("TEST_TWEET_URL", "https://twitter.com/saraheashley/status/123456789")
```

## Rules
1. Each test function name MUST reference the feature id (e.g., `test_T_SAFARI_TWITTER_001`)
2. Tests use `httpx` — available in project
3. Integration tests use `pytest.mark.integration`
4. Mark `composeTweet` typing tests as `pytest.mark.xfail(reason="known regression: composeTweet typing")`
5. After writing each batch of 10 tests, update feature list JSON marking those features `passes: true`
6. Do NOT hardcode real credentials — use env vars or constants
7. Twitter character limit tests must validate 280-char rule

## Validation Steps
After writing all tests:
1. Run `cd /Users/isaiahdupree/Documents/Software/Safari\ Automation && python -m pytest scripts/tests/test_safari_twitter.py --collect-only 2>&1 | head -40`
2. If collection succeeds with 100+ tests, mark remaining features passes=true
3. Commit: `git add scripts/tests/test_safari_twitter.py && git commit -m "feat: add 103 Twitter Safari tests"`
