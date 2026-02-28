# AAG Agent 04 — Engagement Warmup Agent

## Mission
Build the warmup agent that schedules and sends platform comments on prospects' posts before any DM outreach. Comments build recognition so the first DM feels familiar, not cold.

## Features to Build
AAG-031 through AAG-050

## Depends On
Agent 01 (migrations), Agent 03 (contacts in pipeline_stage='qualified')

## Working Directory
`/Users/isaiahdupree/Documents/Software/Safari Automation/scripts/acquisition/`

## Output Files
- `acquisition/warmup_agent.py`
- `tests/test_warmup_agent.py`

## Comment Services (already running)
```python
COMMENT_ENDPOINTS = {
    "instagram": "http://localhost:3005/api/instagram/comments/post",
    "twitter":   "http://localhost:3007/api/twitter/comments/post",
    "tiktok":    "http://localhost:3006/api/tiktok/comments/post",
    "threads":   "http://localhost:3004/api/threads/comments/post",
}
# Body: {"postUrl": "https://...", "text": "your comment here"}
# Response: {"success": true, "commentId": "..."}
```

## Market Research API — get recent posts
```python
# Get recent posts for a contact to comment on
POST http://localhost:3106/api/research/{platform}/search
Body: {"keyword": "@{handle}", "maxResults": 5}
# Or check crm_market_research table first (cache)
```

## WarmupAgent Class

```python
class WarmupAgent:
    async def schedule_batch(self, dry_run: bool = False) -> ScheduleResult
    # reads all pipeline_stage='qualified' not yet in acq_warmup_schedules
    # creates warmup schedule rows, advances to 'warming'
    
    async def execute_pending(self, platform: str = None, dry_run: bool = False) -> ExecuteResult
    # reads acq_warmup_schedules WHERE status='pending' AND scheduled_at <= NOW()
    # sends comments, updates rows, checks for completion
    
    async def _get_posts_for_contact(self, contact: Contact, n: int = 3) -> list[PostData]
    # check crm_market_research first, fall back to Market Research API
    
    async def _generate_comment(self, post: PostData, config: WarmupConfig) -> str
    # call Claude to generate insightful comment
    
    async def _check_completion(self, contact_id: str, config: WarmupConfig) -> bool
    # returns True if contact has >= config.comments_target sent comments
```

## Comment Generation — Claude Haiku
```
Generate a {tone} comment for this social media post. 

Post: "{post_text}"
Platform: {platform}
Poster's niche: {niche}

Rules:
- 1-2 sentences only
- Specific to THIS post content (no generic praise)
- {tone_instruction}  # insightful: add an observation | encouraging: affirm their point | curious: ask a relevant question
- Never: "great post", "love this", "so true", anything that sounds bot-like
- No emojis unless the platform is TikTok/Instagram
- No mentions of our service

Comment:
```

## Schedule Creation Logic
```python
for contact in qualified_contacts_without_schedule:
    config = get_warmup_config(contact.source_niche_config_id)
    posts = await get_posts_for_contact(contact, n=config.comments_target + 1)
    
    for i, post in enumerate(posts[:config.comments_target]):
        # Spread over window_days with random hour (8AM-6PM)
        day_offset = i * (config.window_days / config.comments_target)
        scheduled_dt = now + timedelta(days=day_offset) + timedelta(hours=random.uniform(0, 10))
        
        # Check: no same-day comment to same contact
        # Check: never comment same post twice
        INSERT acq_warmup_schedules(contact_id, platform, post_url, scheduled_at, comment_text=None)
    
    UPDATE crm_contacts SET pipeline_stage='warming'
    INSERT acq_funnel_events(contact_id, from='qualified', to='warming')
```

## Comment Sending Logic
```python
for schedule in pending_schedules:
    # 1. Check daily cap
    if not check_cap('comment', schedule.platform):
        reschedule to tomorrow, mark skipped
        continue
    
    # 2. Generate comment if not pre-generated
    if not schedule.comment_text:
        schedule.comment_text = await generate_comment(post_data, config)
    
    # 3. Send via comment service
    result = await send_comment(platform, post_url, comment_text)
    
    # 4. Update DB
    if result.success:
        UPDATE acq_warmup_schedules SET status='sent', sent_at=now, comment_id=result.commentId
        INSERT crm_messages(platform, message_type='comment', is_outbound=True, sent_by_automation=True)
        increment_cap('comment', platform)
        await check_completion(contact_id, config)
    else:
        UPDATE acq_warmup_schedules SET status='failed'
        # retry logic: if this was the 3rd failure for this contact, advance anyway
```

## Completion + Window Timeout
```python
async def check_completion(contact_id, config):
    sent_count = COUNT(acq_warmup_schedules WHERE contact_id=$1 AND status='sent')
    
    if sent_count >= config.comments_target:
        advance_to_ready_for_dm(contact_id, reason='target_met')
    else:
        # Check window timeout
        first_schedule = MIN(scheduled_at) WHERE contact_id=$1
        if now > first_schedule + timedelta(days=config.window_days):
            advance_to_ready_for_dm(contact_id, reason='window_expired')

async def advance_to_ready_for_dm(contact_id, reason):
    UPDATE crm_contacts SET pipeline_stage='ready_for_dm'
    INSERT acq_funnel_events(from='warming', to='ready_for_dm', metadata={'reason': reason})
```

## High-Score Skip (AAG-050)
If `contact.relationship_score >= config.skip_warmup_min_score` (default 85):
Skip warmup entirely, go straight from `qualified` → `ready_for_dm` with reason `high_score_skip`.

## CLI
```bash
python3 acquisition/warmup_agent.py --schedule     # create schedules for qualified contacts
python3 acquisition/warmup_agent.py --execute      # send pending comments
python3 acquisition/warmup_agent.py --status       # show pipeline state
python3 acquisition/warmup_agent.py --platform twitter  # execute only twitter
python3 acquisition/warmup_agent.py --dry-run
```

## Tests Required
```python
test_schedule_spreads_comments_over_window_days()
test_duplicate_post_guard()          # never schedule same post_url twice for same contact
test_same_day_guard()                # never two comments same day to same contact
test_rate_limit_cap_enforcement()
test_stage_advance_on_target_met()
test_window_timeout_advance()
test_high_score_skip_warmup()
test_comment_generator_not_generic()  # assert comment contains words from post_text
test_crm_messages_written_after_send()
```
