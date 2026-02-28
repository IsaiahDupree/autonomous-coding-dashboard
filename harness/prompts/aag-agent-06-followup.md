# AAG Agent 06 — Follow-up & Human Notification Agent

## Mission
Build the follow-up agent that monitors for replies (via inbox sync), executes the Day 4 and Day 7 follow-up DM sequences for non-responders, archives after Day 7, and sends human notifications when a prospect replies.

## Features to Build
AAG-065 through AAG-075

## Depends On
Agent 01 (migrations), Agent 05 (contacts in pipeline_stage='contacted')

## Working Directory
`/Users/isaiahdupree/Documents/Software/Safari Automation/scripts/acquisition/`

## Output Files
- `acquisition/followup_agent.py`
- `acquisition/notification_client.py`
- `tests/test_followup_agent.py`

## ReplyDetector
```python
class ReplyDetector:
    async def sync_and_detect(self) -> list[Contact]:
        """
        1. Call crm_brain.py --sync (subprocess) to pull latest inbound messages
        2. Query: contacts WHERE pipeline_stage IN ('contacted','follow_up_1','follow_up_2')
                  AND last_inbound_at > last_outbound_at
                  AND last_inbound_at > contacted_at
        3. Return list of contacts with new replies
        """
    
    async def trigger_crm_sync(self):
        """Run: python3 /path/to/crm_brain.py --sync"""
        proc = await asyncio.create_subprocess_exec(
            "python3", CRM_BRAIN_PATH, "--sync",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        await proc.wait()
```

## Reply Handler
```python
async def handle_reply(contact: Contact):
    # 1. Advance stage
    await queries.update_pipeline_stage(contact.id, 'replied')
    await queries.insert_funnel_event(contact.id, contact.pipeline_stage, 'replied', 'agent')
    
    # 2. Cancel any pending follow-ups
    await queries.cancel_pending_followups(contact.id)
    
    # 3. Generate conversation summary
    messages = await queries.get_conversation_messages(contact.id, limit=10)
    summary = await generate_conversation_summary(messages, contact)
    
    # 4. Store notification
    notification_id = await queries.insert_human_notification(
        contact_id=contact.id,
        trigger='replied',
        summary=summary.text,
        context_url=f"{SUPABASE_DASHBOARD_URL}/contacts/{contact.id}"
    )
    
    # 5. Notify human
    await notification_client.notify_reply(contact, summary)
```

## Conversation Summary — Claude
```python
async def generate_conversation_summary(messages, contact) -> Summary:
    thread = "\n".join([f"{'Me' if m.is_outbound else contact.display_name}: {m.message_text}" 
                        for m in messages])
    
    response = await claude.messages.create(
        model="claude-3-haiku-20240307",
        messages=[{"role": "user", "content": f"""
Summarize this conversation in 2 sentences max.
Also assess: sentiment (positive/neutral/objection/interested) 
and suggest a recommended_response_angle.
Return JSON: {{"summary": "...", "sentiment": "...", "recommended_response": "..."}}

Thread:
{thread}
"""}]
    )
    return Summary(**json.loads(response.content[0].text))
```

## NotificationClient
```python
class NotificationClient:
    async def notify_reply(self, contact: Contact, summary: Summary):
        await self.send_push(contact, summary)
        await self.send_email(contact, summary)
    
    async def send_push(self, contact, summary):
        """Use mcp0_notifications_send_notification pattern via AppleScript"""
        script = f'''
        display notification "{summary.text} — {contact.platform}" ¬
            with title "Reply from {contact.display_name}" ¬
            sound name "default"
        '''
        subprocess.run(["osascript", "-e", script])
    
    async def send_email(self, contact, summary):
        """Use Mail.app via AppleScript"""
        subject = f"[CRM] {contact.display_name} replied on {contact.platform}"
        body = f"""
New reply detected from {contact.display_name} (@{contact.handle}) on {contact.platform}.

SUMMARY: {summary.text}
SENTIMENT: {summary.sentiment}
RECOMMENDED RESPONSE: {summary.recommended_response}

ICP Score: {contact.relationship_score}/100
Platform: {contact.platform}
CRM Link: {SUPABASE_DASHBOARD_URL}/contacts/{contact.id}
"""
        script = f'''
        tell application "Mail"
            set newMessage to make new outgoing message with properties ¬
                {{subject:"{subject}", content:"{body}", visible:true}}
            tell newMessage
                make new to recipient at end of to recipients ¬
                    with properties {{address:"{OWNER_EMAIL}"}}
            end tell
        end tell
        '''
        subprocess.run(["osascript", "-e", script])
```

## Follow-up Generator
```python
FOLLOWUP_PROMPTS = {
    2: """Write a follow-up DM (touch 2 of 3). They haven't replied to the first message.
Use a COMPLETELY different angle — lead with a specific result or data point.
2-3 sentences only. End with a yes/no question.
Original message was about: {original_message_topic}
Contact: {contact_brief}""",
    
    3: """Write a final follow-up DM. This is the LAST message you'll send.
1-2 sentences. Close the loop gracefully. Leave the door open without desperation.
Example pattern: "Last one from me — if [trigger event] ever changes, happy to share [value prop]."
Contact: {contact_brief}"""
}

async def generate_followup(contact, touch_number) -> str:
    original = await queries.get_first_outreach(contact.id)
    prompt = FOLLOWUP_PROMPTS[touch_number].format(
        original_message_topic=original.message_text[:100],
        contact_brief=build_brief(contact)
    )
    return await claude_generate(prompt, model="claude-3-haiku-20240307")
```

## Follow-up Timing Rules
```python
async def process_followups():
    # Follow-up 1 (Day 4): stage='contacted', last_outbound < 3 days ago, no inbound
    fu1_contacts = await queries.get_stale_contacted(days=3)
    for c in fu1_contacts:
        msg = await generate_followup(c, touch_number=2)
        await send_and_record(c, msg, touch=2)
        await queries.update_pipeline_stage(c.id, 'follow_up_1')
    
    # Follow-up 2 (Day 7): stage='follow_up_1', last_outbound < 3 days ago, no inbound
    fu2_contacts = await queries.get_stale_followup1(days=3)
    for c in fu2_contacts:
        msg = await generate_followup(c, touch_number=3)
        await send_and_record(c, msg, touch=3)
        await queries.update_pipeline_stage(c.id, 'follow_up_2')
    
    # Archive (Day 7+3): stage='follow_up_2', last_outbound < 3 days ago, no inbound
    archive_contacts = await queries.get_stale_followup2(days=3)
    for c in archive_contacts:
        await queries.update_pipeline_stage(c.id, 'archived')
        await queries.set_archived_at(c.id)
        await queries.insert_funnel_event(c.id, 'follow_up_2', 'archived', 'agent',
                                          metadata={'reason': 'no_reply_after_sequence'})
```

## FollowUpAgent CLI
```bash
python3 acquisition/followup_agent.py --process       # sync + detect replies + send due follow-ups
python3 acquisition/followup_agent.py --show-pending  # list contacts due for follow-up
python3 acquisition/followup_agent.py --dry-run
```

## Tests Required
```python
test_reply_detector_uses_inbound_gt_outbound()
test_stage_advances_to_replied_on_detection()
test_pending_followups_cancelled_on_reply()
test_conversation_summary_returns_valid_json()
test_push_notification_sent_on_reply()
test_followup1_triggers_at_day4()
test_followup2_triggers_at_day7()
test_archive_after_followup2_no_reply()
test_cancel_pending_email_on_dm_reply()
```
