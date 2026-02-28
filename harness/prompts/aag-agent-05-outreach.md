# AAG Agent 05 — Outreach Agent (DM + Email Coordination)

## Mission
Build the outreach agent that generates personalized first DMs using Claude (informed by contact's actual posts), sends them via the correct platform DM service, and writes every touch to crm_messages. Also coordinates with email channel to ensure only one active outreach channel per contact.

## Features to Build
AAG-051 through AAG-064, AAG-139, AAG-140

## Depends On
Agent 01 (migrations), Agent 04 (contacts in pipeline_stage='ready_for_dm')

## Working Directory
`/Users/isaiahdupree/Documents/Software/Safari Automation/scripts/acquisition/`

## Output Files
- `acquisition/outreach_agent.py`
- `acquisition/channel_coordinator.py`
- `tests/test_outreach_agent.py`

## DM Service Endpoints (already running)
```python
DM_SEND_ENDPOINTS = {
    "instagram": "http://localhost:3001/api/messages/send-to",  # {"username": ..., "message": ...}
    "twitter":   "http://localhost:3003/api/messages/send-to",
    "tiktok":    "http://localhost:3102/api/messages/send-to",
    # LinkedIn requires 2-step:
    # 1. POST http://localhost:3105/api/linkedin/messages/open {"participantName": "Full Name"}
    # 2. POST http://localhost:3105/api/linkedin/messages/send {"text": "message"}
}
```

## OutreachAgent Class

```python
class OutreachAgent:
    async def run(self, service_slug: str = None, limit: int = 10, dry_run: bool = False) -> OutreachResult
    async def process_contact(self, contact: Contact, service_slug: str, dry_run: bool) -> TouchResult
    async def build_context(self, contact: Contact) -> ContactBrief
    async def generate_dm(self, brief: ContactBrief, service_slug: str, touch: int = 1) -> str
    async def validate_message(self, message: str, platform: str) -> ValidationResult
    async def send_dm(self, contact: Contact, message: str, dry_run: bool) -> SendResult
    async def record_touch(self, contact: Contact, message: str, result: SendResult) -> None
```

## ContextBuilder
```python
@dataclass
class ContactBrief:
    contact_id: str
    display_name: str
    platform: str
    handle: str
    score: int
    score_reasoning: str
    top_posts: list[PostData]   # from crm_market_research, sorted by engagement
    niche: str
    follower_count: int
    service_description: str    # from service_slug config

async def build_context(contact, service_slug) -> ContactBrief:
    posts = await queries.get_top_posts(contact.id, limit=3)
    score_history = await queries.get_latest_score(contact.id)
    service = SERVICE_DESCRIPTIONS[service_slug]
    return ContactBrief(...)
```

## DM Generation — Claude Sonnet (quality matters here)
Model: `claude-3-5-sonnet-20241022`

```
You are writing a personalized first DM to a prospect on {platform}.

Contact context:
- Name: {display_name}
- Platform: {platform} (@{handle})
- ICP Score: {score}/100
- Score reasoning: {score_reasoning}
- Their top post: "{top_post_text}" ({top_post_likes} likes)
- Their niche: {niche}

Service being offered: {service_description}

Write a first DM that:
1. Opens with ONE specific reference to their content (not "great content!" — be specific)
2. Delivers a genuine insight or relevant observation in 1-2 sentences
3. Makes a soft, low-pressure ask — NOT a pitch, NOT a meeting request
   (e.g., "Curious if you've tried [X] — would love to share what we're seeing work for accounts like yours")
4. Feels like a peer reaching out, not a vendor
5. Max 4 sentences total. No emojis. No "I hope this finds you well." No "reaching out."

DM (write only the message, nothing else):
```

## MessageValidator
```python
BANNED_PHRASES = [
    "hope this finds you", "reaching out", "quick call", "pick your brain",
    "synergy", "i noticed your profile", "would love to connect",
    "let me know if you're interested", "free consultation"
]
MAX_LENGTH = {"twitter": 280, "instagram": 1000, "tiktok": 500, "linkedin": 500}

def validate(message: str, platform: str) -> ValidationResult:
    score = 10
    errors = []
    if len(message) > MAX_LENGTH[platform]: score -= 3; errors.append("too_long")
    for phrase in BANNED_PHRASES:
        if phrase.lower() in message.lower(): score -= 2; errors.append(f"banned:{phrase}")
    # Must reference something specific (check for quote or proper noun)
    return ValidationResult(score=score, errors=errors, passed=score >= 6)
```

## Send Logic

```python
async def send_dm(contact, message, dry_run):
    if dry_run:
        return SendResult(success=True, dry_run=True, message_id=None)
    
    # Check daily cap
    if not await daily_caps.check('dm', contact.primary_platform):
        raise DailyCapReached(contact.primary_platform)
    
    platform = contact.primary_platform
    handle = get_handle(contact, platform)
    
    if platform == "linkedin":
        # Two-step LinkedIn flow
        open_result = await http.post(f"{LINKEDIN_URL}/api/linkedin/messages/open",
                                      {"participantName": contact.display_name})
        if not open_result.get("success"):
            raise SendError("linkedin_open_failed")
        result = await http.post(f"{LINKEDIN_URL}/api/linkedin/messages/send", {"text": message})
    else:
        result = await http.post(DM_SEND_ENDPOINTS[platform],
                                 {"username": handle, "message": message})
    
    if result.get("success"):
        await daily_caps.increment('dm', platform)
    
    return SendResult(success=result.get("success"), platform_message_id=result.get("messageId"))
```

## Recording Every Touch
```python
async def record_touch(contact, message, result, touch_number=1):
    # 1. INSERT crm_messages
    await queries.insert_message(
        contact_id=contact.id,
        platform=contact.primary_platform,
        message_text=message,
        message_type='dm',
        is_outbound=True,
        sent_by_automation=True,
        sent_at=datetime.utcnow()
    )
    # 2. INSERT acq_outreach_sequences
    await queries.insert_outreach_sequence(
        contact_id=contact.id,
        service_slug=service_slug,
        touch_number=touch_number,
        message_text=message,
        platform=contact.primary_platform,
        sent_at=datetime.utcnow(),
        status='sent'
    )
    # 3. UPDATE crm_contacts pipeline_stage
    await queries.update_pipeline_stage(contact.id, 'contacted')
    await queries.insert_funnel_event(contact.id, 'ready_for_dm', 'contacted', 'agent')
    # 4. UPDATE last_outbound_at
    await queries.update_last_outbound(contact.id, datetime.utcnow())
```

## ChannelCoordinator
```python
class ChannelCoordinator:
    async def get_active_channel(self, contact: Contact) -> str:
        # LinkedIn contact with email → 'email'
        # Others → 'dm'
        # If DM sequence active → 'dm' (block email)
        # If DM archived → 'email' (switch)
    
    async def pause_email_if_dm_replied(self, contact_id: str) -> None
    async def cancel_dm_if_email_replied(self, contact_id: str) -> None
```

## CLI
```bash
python3 acquisition/outreach_agent.py --generate --limit 5    # preview DMs, no send
python3 acquisition/outreach_agent.py --send --limit 10
python3 acquisition/outreach_agent.py --service linkedin-lead-gen
python3 acquisition/outreach_agent.py --dry-run
```

## Tests Required
```python
test_context_builder_includes_top_posts()
test_message_validator_rejects_banned_phrases()
test_message_validator_rejects_too_long()
test_send_router_linkedin_uses_two_step()
test_daily_cap_blocks_send_at_limit()
test_touch_recorded_in_crm_messages()
test_pipeline_stage_advances_to_contacted()
test_channel_coordinator_blocks_email_during_dm()
```
