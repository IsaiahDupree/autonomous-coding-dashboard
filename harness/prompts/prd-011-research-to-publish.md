# PRD-011: Research-to-Publish Automation Pipeline

## Project
- **Repo**: /Users/isaiahdupree/Documents/Software/actp-worker
- **PRD**: /docs/prd/PRD-011-RESEARCH-TO-PUBLISH-AUTOMATION.md
- **Priority**: P0 (CRITICAL)

## Context

The autonomous revenue loop requires: Research → Generate → Review → Publish → Track → Feedback → Repeat. Individual pieces work (Safari research, Blotato publishing, Twitter feedback) but they're not wired together as an automated pipeline.

### What Already Works
- Safari Automation researches 5 platforms (Twitter, Threads, Instagram, TikTok, Facebook)
- Twitter feedback engine: checkbacks at 1hr/4hr/24hr, classification, strategy generation
- Blotato publishes to 9 platforms via API
- MediaPoster smart scheduling with Thompson Sampling
- 5 niches configured: ai_automation, saas_growth, content_creation, digital_marketing, creator_economy
- 33 crons defined in cron_definitions.py

### What's Missing
- Content generation from research data (no Claude integration in pipeline)
- AI review gate before publishing
- Scheduled publishing with optimal timing
- Daily automation cron chain
- Feedback → next generation loop closure

## Task

Wire the research-to-publish pipeline end-to-end:

### 1. Content Generation Trigger
Create `trigger_daily_content_generation()` in `workflow_task_poller.py`:
```python
async def trigger_daily_content_generation():
    """Generate 10 tweets per niche from latest research + strategy."""
    niches = ["ai_automation", "saas_growth", "content_creation", "digital_marketing", "creator_economy"]
    for niche in niches:
        # Pull latest strategy from actp_twitter_strategy
        # Pull recent research from actp_platform_research
        # Call Claude Haiku to generate 10 tweets
        # Store in actp_twitter_queue with status='draft'
```

### 2. AI Review Gate
Create `trigger_content_review()` in `workflow_task_poller.py`:
- Pull drafts from `actp_twitter_queue` where status='draft'
- Score each on 7 dimensions (hook, relevance, clarity, CTA, originality, platform-fit, compliance)
- Auto-approve if score ≥7.0, reject if ≤4.0
- Update status to 'reviewed' or 'rejected'

### 3. Scheduled Publishing
Create `trigger_scheduled_publishing()` in `workflow_task_poller.py`:
- Pull approved content (status='reviewed', score≥7.0)
- Schedule across day using Thompson Sampling optimal times
- Twitter → Safari Automation (`safari_comments_client.post_tweet()`)
- Other platforms → Blotato API (`blotato_client.full_publish()`)
- Auto-register each publish in feedback loop

### 4. Feedback Loop Closure
- Verify `twitter_feedback_engine.register_published_tweet()` fires after each publish
- Verify checkbacks run at 1hr/4hr/24hr
- Verify `analyze_and_build_strategy()` updates niche strategy
- Next day's generation uses updated strategy → loop closed

### 5. Daily Cron Chain
Add to `cron_definitions.py`:
```python
{"name": "daily_content_generation", "fn": "trigger_daily_content_generation", "schedule": "0 6 * * *", "enabled": True},
{"name": "daily_content_review", "fn": "trigger_content_review", "schedule": "35 6 * * *", "enabled": True},
{"name": "daily_scheduled_publishing", "fn": "trigger_scheduled_publishing", "schedule": "0 7 * * *", "enabled": True},
```

## Supabase Tables Needed

```sql
CREATE TABLE IF NOT EXISTS actp_twitter_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  niche text NOT NULL,
  content text NOT NULL,
  platform text DEFAULT 'twitter',
  status text DEFAULT 'draft',  -- draft, reviewed, rejected, scheduled, published, failed
  review_score numeric,
  review_details jsonb DEFAULT '{}',
  scheduled_at timestamptz,
  published_at timestamptz,
  post_url text,
  post_id text,
  generation_prompt text,
  created_at timestamptz DEFAULT now()
);
```

## Testing
```bash
# Run existing tests
python3 -m pytest tests/test_workflow_task_poller.py -v

# Manual trigger test
python3 -c "import asyncio; from workflow_task_poller import trigger_daily_content_generation; asyncio.run(trigger_daily_content_generation())"
```

## Constraints
- Use Claude Haiku via CLI for generation (same as bot — no extra API key)
- Start with ai_automation niche as pilot, enable others after 3 days
- Max AI cost: $15/day across all niches
- All publishes MUST register in feedback loop
- Do NOT break existing 308 tests
