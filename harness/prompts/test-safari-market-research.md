# Mission: Safari Market Research Test Suite — 103 Tests

## Working Directory
`/Users/isaiahdupree/Documents/Software/Safari Automation`

## Feature List
`/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness/features/test-safari-market-research.json`

## Output File
`scripts/tests/test_safari_market_research.py`

## Goal
Write a comprehensive pytest test suite for the Market Research hub (port 3106) that serves all platforms. Each test corresponds to one feature. Mark features `passes: true` in the feature list JSON as each batch of 10 is written.

## Service Under Test
- **Market Research Hub**: `http://localhost:3106`
- Supported platforms: instagram, twitter, tiktok, threads
- Correct search endpoint: `POST /api/research/{platform}/search` with body `{"keyword": "...", "maxResults": 5}`
- Competitor research: `POST /api/research/{platform}/competitor` (async, returns job_id)
- Top creators: available via the research hub

## Test Structure
```python
import pytest, httpx, asyncio, json, os

BASE = "http://localhost:3106"
HEADERS = {"Authorization": "Bearer test-token", "Content-Type": "application/json"}
PLATFORMS = ["instagram", "twitter", "tiktok", "threads"]
TEST_KEYWORD = os.getenv("TEST_KEYWORD", "solopreneur")
TEST_NICHE = os.getenv("TEST_NICHE", "solopreneur")
```

## Rules
1. Test function names reference feature id (e.g., `test_T_SAFARI_MARKET_RESEARCH_001`)
2. Search endpoint is `/api/research/{platform}/search` with body `{"keyword": "...", "maxResults": N}`
3. Each post in results MUST have: author, likes (or equivalent), url, text fields
4. Competitor research is async — test both job creation AND polling
5. After each batch of 10 tests, update feature list JSON marking those features `passes: true`
6. Integration tests marked `pytest.mark.integration`
7. Supabase tests check `actp_content_performance` table for stored research results

## Validation Steps
1. `python -m pytest scripts/tests/test_safari_market_research.py --collect-only 2>&1 | head -40`
2. Collection ≥ 100 tests → mark remaining features passes=true
3. Commit: `git add scripts/tests/test_safari_market_research.py && git commit -m "feat: add 103 Market Research Safari tests"`
