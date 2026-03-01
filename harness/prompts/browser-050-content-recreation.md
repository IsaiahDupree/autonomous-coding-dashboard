# Browser-050 — Content Recreation from Browser Analysis

## Mission
Build the Content Recreation Agent that extracts competitor/trending content via browser automation, analyzes its structural signals, then uses Claude AI to recreate similar content adapted for the user's brand voice and niche. This closes the full loop: browser extracts → agent analyzes → Claude recreates → Remotion renders → publish.

## Working Directory
`/Users/isaiahdupree/Documents/Software/actp-worker/`

## PRD Reference
`docs/prd/PRD-050-CONTENT-RECREATION-FROM-ANALYSIS.md`

## Feature List
`harness/features/browser-050-content-recreation.json`

## Output Files to Create
- `actp-worker/content_recreation_agent.py` — main module (~500 lines)
- `actp-worker/tests/test_content_recreation_agent.py` — unit tests
- `supabase/migrations/20260301000011_content_analysis.sql`
- `supabase/migrations/20260301000012_recreated_content.sql`
- Add `ContentRecreationExecutor` class to `workflow_executors.py`
- Add 4 methods to `data_plane.py`

## All Features to Build (all pending — nothing done yet)
- **F-050-001** `ContentAnalyzer` class — Claude Haiku single-prompt classifier → `ContentAnalysis` dataclass
- **F-050-002** Strategy pattern matching — query `actp_feedback_strategy`, compute `niche_match_score`
- **F-050-003** `ContentRecreator` class — Claude Sonnet, 6 formats, 2-3 variants, includes `prompt_used`
- **F-050-004** `recreate_from_url()` — full chain: extract → analyze → match → recreate → store
- **F-050-005** `recreate_from_batch()` — parallel extraction, rank by score, recreate top N
- **F-050-006** DB migrations — `actp_content_analysis` + `actp_recreated_content` tables
- **F-050-007** `queue_for_production()` — INSERT into `actp_gen_jobs` when format=`short_script`
- **F-050-008** `ContentRecreationExecutor` — `task_type="content_recreate"`, registered in `init_executors()`
- **F-050-009** CLI — `--url`, `--niche`, `--platform`, `--format`, `--batch`, `--keyword`, `--discover`
- **F-050-010** Data plane methods — 4 new methods in `data_plane.py`
- **F-050-011** Seed `content-recreate-research` workflow definition
- **F-050-012** Unit tests — mock browser + Claude, test analysis, recreation, score thresholds
- **F-050-013** Brand voice from `actp_niche_config.prompt_guidelines`
- **F-050-014** `--discover` flag — DDG search → auto-batch top 5 trending URLs

## Key Existing Code to Reuse
- `browser_use_agent.py` → `browser_task(BrowserTask(action="extract", url=url))` for content extraction
- `universal_feedback_engine.py` → `actp_feedback_strategy` table access pattern
- `remotion_content_producer.py` → `actp_gen_jobs` INSERT pattern
- `workflow_executors.py` → `BrowserUseExecutor` as template for `ContentRecreationExecutor`
- `data_plane.py` → existing async Supabase client pattern

## Key Database Tables (already exist — do NOT recreate)
- `actp_feedback_strategy` — winning patterns per platform×niche
- `actp_niche_config` — brand voice / prompt_guidelines per platform×niche
- `actp_gen_jobs` — Remotion production queue
- `actp_workflow_definitions` — workflow seeding target

## ContentAnalysis Dataclass (implement this exactly)
```python
@dataclass
class ContentAnalysis:
    source_url: str
    raw_content: str
    hook: str
    hook_style: str        # question|stat|story|bold_claim|list
    format_type: str       # thread|caption|script|article|email
    word_count: int
    cta_present: bool
    cta_type: str          # follow|click|buy|comment|share|none
    tone: str              # educational|entertaining|inspirational|controversial
    platform_fit: list[str]
    engagement_tier: str   # high|medium|low
    niche_match_score: float
    winning_patterns: list[dict]
    analysis_model: str
```

## RecreationResult Dataclass (implement this exactly)
```python
@dataclass
class RecreationResult:
    analysis_id: str
    target_niche: str
    target_platform: str
    target_format: str
    variants: list[str]    # 2-3 complete content variations
    hook_options: list[str] # 5 alternative hooks
    estimated_score: float
    recreation_model: str
    prompt_used: str
    gen_job_id: str | None
```

## Claude Model Selection
- Analysis (F-050-001, F-050-002): `claude-haiku-4-5-20251001` — fast, cheap, structured JSON output
- Recreation (F-050-003): `claude-sonnet-4-5-20250929` — quality variants

## Supported Formats
| Format | Target Length | Platforms |
|--------|-------------|-----------|
| `thread` | 5-10 tweets, 280 chars each | Twitter, Threads |
| `caption` | 150-300 words + 5 hashtags | Instagram, TikTok, LinkedIn |
| `short_script` | 30-60s voiceover, 100-150 words | TikTok, YouTube Shorts → Remotion |
| `hook_variants` | 5 opening hooks only, 1-2 sentences each | All |
| `long_form` | 800-1200 words | LinkedIn, Threads |
| `email` | Subject + 200-word body | Gmail/Resend |

## Validation
```bash
# Test single URL recreation
python3 content_recreation_agent.py \
  --url https://example.com \
  --niche solopreneur \
  --platform twitter \
  --format thread

# Test batch mode
python3 content_recreation_agent.py \
  --keyword "solopreneur tips" \
  --platform twitter \
  --format caption \
  --top 3

# Test discover mode
python3 content_recreation_agent.py \
  --discover \
  --niche solopreneur \
  --platform twitter \
  --format hook_variants

# Run unit tests
pytest tests/test_content_recreation_agent.py -v

# Verify executor registered
python3 -c "from workflow_executors import init_executors, _EXECUTORS; init_executors(); print('content_recreate' in _EXECUTORS)"
```
Expected: single URL returns 2+ variants, unit tests pass, executor registered = True.
