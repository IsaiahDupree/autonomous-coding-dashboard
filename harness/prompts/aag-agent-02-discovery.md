# AAG Agent 02 — Prospect Discovery Agent

## Mission
Build the discovery agent that finds qualified prospects from social platforms using the Market Research API and seeds them into `crm_contacts`. This is the top of the acquisition funnel.

## Features to Build
AAG-005 through AAG-020 (excluding AAG-001–004 handled by Agent 01)

## Depends On
Agent 01 must have run migrations first. Tables `acq_niche_configs`, `acq_discovery_runs`, `crm_contacts` must exist.

## Working Directory
`/Users/isaiahdupree/Documents/Software/Safari Automation/scripts/acquisition/`

## Output Files
- `acquisition/discovery_agent.py` — main discovery agent
- `acquisition/clients/market_research_client.py` — Market Research API wrapper
- `tests/test_discovery_agent.py` — pytest tests

## Market Research API (already running at port 3106)
```python
# Search endpoint — returns posts and creators
POST http://localhost:3106/api/research/{platform}/search
Body: {"keyword": "ai automation", "maxResults": 50}
Response: {"posts": [...], "creators": [...]}

# Full niche pipeline — top 100 creators
POST http://localhost:3106/api/research/{platform}/niche
Body: {"niche": "ai automation", "maxCreators": 100}
```

## MarketResearchClient Requirements
```python
class MarketResearchClient:
    async def search_platform(self, platform: str, keyword: str, max_results: int = 50) -> list[ProspectData]
    async def get_top_creators(self, platform: str, niche: str, limit: int = 50) -> list[ProspectData]
```

`ProspectData` dataclass: handle, display_name, platform, follower_count, engagement_rate, top_post_text, top_post_url, top_post_likes, bio_url, niche_label

## DiscoveryAgent Requirements

```python
class DiscoveryAgent:
    async def run(self, niche_config_id: str = None, dry_run: bool = False) -> DiscoveryResult
    async def _scan_platform(self, config: NicheConfig, platform: str, keyword: str) -> list[ProspectData]
    async def _deduplicate(self, prospects: list[ProspectData]) -> tuple[list, list]  # (new, existing)
    async def _seed_contacts(self, prospects: list[ProspectData], config: NicheConfig) -> int
    async def _log_run(self, run: DiscoveryRun) -> None
```

## Deduplication Logic
Check `crm_contacts` for any matching handle across all platform columns:
```sql
SELECT id FROM crm_contacts 
WHERE twitter_handle = $1 OR instagram_handle = $1 
   OR tiktok_handle = $1 OR linkedin_url LIKE '%' || $1 || '%'
```
If match found: skip seeding. Log as `deduplicated` count.

## ContactSeeder Logic
For new prospects, UPSERT `crm_contacts`:
- `pipeline_stage = 'new'`
- Set correct handle column based on platform
- `niche_label` from config
- `source_niche_config_id` = config id
- `relationship_score = NULL` (scored by Agent 03)
- Enqueue to `acq_resolution_queue` for Entity Resolution Agent

## Rate Limiting
```python
# Max 3 concurrent platform scans
semaphore = asyncio.Semaphore(3)
# 5 second delay between requests to same platform
```

## Re-entry Logic
- `archived` contacts: allow re-entry if `archived_at < NOW() - interval '180 days'` → reset to `new`
- `closed_lost` contacts: allow re-entry if `updated_at < NOW() - interval '90 days'` → reset to `new`

## CLI Interface
```bash
python3 acquisition/discovery_agent.py --run                    # all active niches
python3 acquisition/discovery_agent.py --niche-id UUID          # specific niche
python3 acquisition/discovery_agent.py --platform instagram     # specific platform
python3 acquisition/discovery_agent.py --dry-run                # no writes
python3 acquisition/discovery_agent.py --limit 20               # max contacts
```

## Tests Required
```python
test_dedup_finds_existing_contact()      # existing twitter handle → skip
test_seed_new_contact()                  # new prospect → inserted with pipeline_stage=new
test_discovery_run_logged()              # acq_discovery_runs row created
test_rate_limiter_max_3_concurrent()     # semaphore respected
test_reentry_archived_after_180_days()  # resets pipeline_stage
test_reentry_closed_lost_after_90_days()
test_dry_run_no_writes()                 # dry_run=True → nothing inserted
```
