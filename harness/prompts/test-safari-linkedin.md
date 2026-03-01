# Mission: Safari LinkedIn Test Suite — 103 Tests

## Working Directory
`/Users/isaiahdupree/Documents/Software/Safari Automation`

## Feature List
`/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness/features/test-safari-linkedin.json`

## Output File
`scripts/tests/test_safari_linkedin.py`

## Goal
Write a comprehensive pytest test suite for the LinkedIn Safari automation service (port 3105). Each test corresponds to one feature. Mark features `passes: true` in the feature list JSON as each batch of 10 tests is written.

## Services Under Test
- **LinkedIn Automation**: `http://localhost:3105`
- Existing client: `scripts/linkedin_client.py` (37 async functions — use as reference for all endpoints)
- Rate limit: LinkedIn enforces ~10 connection requests/day — tests must be safe to run without sending real requests

## Test Structure
```python
import pytest, httpx, asyncio, json, os

BASE = "http://localhost:3105"
HEADERS = {"Authorization": "Bearer test-token", "Content-Type": "application/json"}
TEST_PROFILE_URL = os.getenv("TEST_LI_PROFILE", "https://www.linkedin.com/in/test-person")
TEST_QUERY = os.getenv("TEST_LI_QUERY", "founder saas")
# Note: Do NOT use Isaiah's profile for DM tests
```

## Rules
1. Test function names reference feature id (e.g., `test_T_SAFARI_LINKEDIN_001`)
2. Connection request tests use `dry_run=True` to avoid real sends
3. `force=true` bypass tests verify active-hours guard logic
4. AI scoring tests check that score is integer 0-100 with non-empty reasoning
5. After each batch of 10 tests, update feature list JSON marking those features `passes: true`
6. Integration tests marked `pytest.mark.integration`
7. outreach_stats endpoint tests verify: sent, replied, conversion_rate fields

## Validation Steps
1. `python -m pytest scripts/tests/test_safari_linkedin.py --collect-only 2>&1 | head -40`
2. Collection ≥ 100 tests → mark remaining features passes=true
3. Commit: `git add scripts/tests/test_safari_linkedin.py && git commit -m "feat: add 103 LinkedIn Safari tests"`
