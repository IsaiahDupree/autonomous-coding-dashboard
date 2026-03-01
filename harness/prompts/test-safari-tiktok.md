# Mission: Safari TikTok Test Suite — 103 Tests

## Working Directory
`/Users/isaiahdupree/Documents/Software/Safari Automation`

## Feature List
`/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness/features/test-safari-tiktok.json`

## Output File
`scripts/tests/test_safari_tiktok.py`

## Goal
Write a comprehensive pytest test suite for the TikTok Safari automation services (DM port 3102, Comments port 3006). Each test corresponds to one feature in the feature list. Mark features `passes: true` in the feature list JSON as tests are written and verified.

## Services Under Test
- **TikTok DM**: `http://localhost:3102`
- **TikTok Comments**: `http://localhost:3006`
- Existing client: `scripts/dm_outreach_client.py` (tiktok section)

## Test Structure
```python
import pytest, httpx, asyncio, json, os

BASE_DM = "http://localhost:3102"
BASE_COMMENTS = "http://localhost:3006"
HEADERS = {"Authorization": "Bearer test-token", "Content-Type": "application/json"}
TEST_HANDLE = os.getenv("TEST_TIKTOK_HANDLE", "Sarah E Ashley")
# TikTok comments REQUIRE direct video URL format:
# https://www.tiktok.com/@username/video/1234567890123456789
TEST_VIDEO_URL = os.getenv("TEST_VIDEO_URL", "https://www.tiktok.com/@test/video/7000000000000000001")
```

## Rules
1. Each test function name references feature id (e.g., `test_T_SAFARI_TIKTOK_001`)
2. TikTok video URL tests MUST use direct `/video/` URL format (not short links)
3. Comment endpoint is `/api/tiktok/comments/post` (not `/api/comments/post`)
4. After each batch of 10 tests, update feature list JSON marking those features `passes: true`
5. Integration tests marked `pytest.mark.integration`
6. DM inbox search vs profile fallback tests are important — test both strategies

## Validation Steps
1. `python -m pytest scripts/tests/test_safari_tiktok.py --collect-only 2>&1 | head -40`
2. Collection ≥ 100 tests → mark remaining features passes=true
3. Commit: `git add scripts/tests/test_safari_tiktok.py && git commit -m "feat: add 103 TikTok Safari tests"`
