# Integration Test Checklist

Verification commands for every service in the ACTP autonomous system.
Run from the `actp-worker` directory unless noted otherwise.

---

## 1. YouTube Client

### Prerequisites
```bash
# Install Google API libraries
pip install google-auth google-auth-oauthlib google-api-python-client

# Required env vars
export YOUTUBE_CHANNEL_ID="UCxxxxxxxxxxxxxxxxxxxxxxxx"
export YOUTUBE_CLIENT_SECRETS_FILE="/path/to/client_secrets.json"
export YOUTUBE_TOKEN_FILE="/path/to/youtube_token.json"
export SUPABASE_URL="https://ivhfuhxorppptyuofbgq.supabase.co"
export SUPABASE_ANON_KEY="..."
```

### Auth (one-time)
```bash
python youtube_client.py --auth
# Opens browser → authorize → saves youtube_token.json
```

### Verification commands
```bash
# Test connection + channel stats
python youtube_client.py --test

# Sync 20 most recent videos to Supabase
python youtube_client.py --sync

# Check Supabase table populated
python -c "
from supabase import create_client
import os
sb = create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_ANON_KEY'])
rows = sb.table('youtube_video_stats').select('video_id,title,views,ctr').limit(5).execute()
for r in rows.data: print(r)
"
```

### Executor dispatch test
```bash
python -c "
import asyncio
from workflow_executors import YoutubeExecutor
async def test():
    ex = YoutubeExecutor()
    r = await ex.execute({'action': 'channel_stats'})
    print(r)
asyncio.run(test())
"
```

### Expected outputs
- `--test`: prints channel title, subscriber count, video count, first 5 video IDs
- `--sync`: prints `✅ Synced N videos`
- `youtube_video_stats` table: rows with `video_id`, `views`, `ctr`, `watch_time_minutes`

---

## 2. Gmail Client

### Prerequisites
```bash
# Same google-api libraries as YouTube (shared client_secrets.json)
pip install google-auth google-auth-oauthlib google-api-python-client

# Required env vars
export GMAIL_CREDENTIALS_FILE="/path/to/client_secrets.json"
export GMAIL_TOKEN_FILE="/path/to/gmail_token.json"
export ANTHROPIC_API_KEY="sk-ant-..."
export ENABLE_GMAIL="true"
export SUPABASE_URL="https://ivhfuhxorppptyuofbgq.supabase.co"
export SUPABASE_ANON_KEY="..."
```

### Auth (one-time)
```bash
python gmail_client.py --auth
# Opens browser → authorize Gmail (modify scope) → saves gmail_token.json
```

### Verification commands
```bash
# List 5 unread emails
python gmail_client.py --test

# Process inbox (classify + score + draft replies + sync CRM)
# SAFE: drafts are created, not sent (confidence < 0.9 threshold)
python gmail_client.py --process

# Check gmail_emails table
python -c "
from supabase import create_client
import os
sb = create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_ANON_KEY'])
rows = sb.table('gmail_emails').select('from_email,subject,classification,intent_score').limit(5).execute()
for r in rows.data: print(r)
"
```

### Executor dispatch test
```bash
python -c "
import asyncio
from workflow_executors import GmailExecutor
async def test():
    ex = GmailExecutor()
    r = await ex.execute({'action': 'read_unread', 'max_results': 5})
    print(f'Found {r[\"count\"]} emails')
    for e in r['emails'][:3]: print(f'  {e[\"from_email\"]}: {e[\"subject\"]}')
asyncio.run(test())
"
```

### Classify a test email
```bash
python -c "
import asyncio
from workflow_executors import GmailExecutor
async def test():
    ex = GmailExecutor()
    r = await ex.execute({
        'action': 'classify',
        'from_email': 'test@example.com',
        'subject': 'Interested in your automation services',
        'body': 'Hi, I saw your work and I need help building an automation pipeline. What are your rates?'
    })
    print(r)
asyncio.run(test())
"
# Expected: {'classification': 'lead', 'intent_score': 70-90}
```

### Expected outputs
- `--test`: lists emails with from/subject/date
- `--process`: `{'status': 'ok', 'processed': N, 'leads': X, 'clients': Y}`
- `gmail_emails` table: rows with `classification`, `intent_score`, `reply_draft`
- `crm_contacts` table: new rows for unknown senders

---

## 3. Safari Automation Services

### Check all service health
```bash
curl -s http://localhost:3001/health | python -m json.tool   # Instagram DM
curl -s http://localhost:3003/health | python -m json.tool   # Twitter DM
curl -s http://localhost:3102/health | python -m json.tool   # TikTok DM
curl -s http://localhost:3105/health | python -m json.tool   # LinkedIn
curl -s http://localhost:3005/health | python -m json.tool   # Instagram Comments
curl -s http://localhost:3006/health | python -m json.tool   # TikTok Comments
curl -s http://localhost:3007/health | python -m json.tool   # Twitter Comments
curl -s http://localhost:3004/health | python -m json.tool   # Threads Comments
curl -s http://localhost:3106/health | python -m json.tool   # Market Research
```

### Start all services (Safari Automation directory)
```bash
cd "/Users/isaiahdupree/Documents/Software/Safari Automation"
PORT=3001 npx tsx packages/instagram-dm/src/api/server.ts &
PORT=3003 npx tsx packages/twitter-dm/src/api/server.ts &
PORT=3102 npx tsx packages/tiktok-dm/src/api/server.ts &
PORT=3105 npx tsx packages/linkedin-automation/src/api/server.ts &
PORT=3005 npx tsx packages/instagram-comments/src/api/server.ts &
PORT=3007 SAFARI_RESEARCH_ENABLED=true npx tsx packages/twitter-comments/src/api/server.ts &
PORT=3006 npx tsx packages/tiktok-comments/src/api/server.ts &
PORT=3004 npx tsx packages/threads-comments/src/api/server.ts &
PORT=3106 npx tsx packages/market-research/src/api/server.ts &
```

### Cloud Sync service
```bash
cd "/Users/isaiahdupree/Documents/Software/Safari Automation"
PORT=3200 npx tsx packages/cloud-sync/src/api/server.ts &
curl -s http://localhost:3200/health | python -m json.tool
```

---

## 4. Cloud Sync Executor

```bash
python -c "
import asyncio
from workflow_executors import CloudSyncExecutor
async def test():
    ex = CloudSyncExecutor()
    r = await ex.execute({'action': 'status'})
    print(r)
asyncio.run(test())
"
```

---

## 5. Market Research Executor

```bash
python -c "
import asyncio
from workflow_executors import MarketResearchExecutor
async def test():
    ex = MarketResearchExecutor()
    r = await ex.execute({'action': 'search', 'platform': 'twitter', 'keyword': 'automation', 'max_results': 3})
    print(r)
asyncio.run(test())
"
```

---

## 6. Universal Feedback Executor

```bash
python -c "
import asyncio
from workflow_executors import UniversalFeedbackExecutor
async def test():
    ex = UniversalFeedbackExecutor()
    r = await ex.execute({'action': 'summary', 'platform': 'twitter'})
    print(r)
asyncio.run(test())
"
```

---

## 7. Supabase Table Verification

```bash
python -c "
from supabase import create_client
import os

sb = create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_ANON_KEY'])
tables = [
    'youtube_video_stats',
    'gmail_emails',
    'crm_contacts',
    'crm_conversations',
    'crm_message_queue',
    'actp_feedback_posts',
    'actp_feedback_strategy',
    'actp_platform_research',
    'actp_published_content',
    'actp_workflow_definitions',
    'actp_workflow_executions',
    'actp_workflow_tasks',
]
for t in tables:
    try:
        r = sb.table(t).select('id').limit(1).execute()
        print(f'  ✅ {t}')
    except Exception as e:
        print(f'  ❌ {t}: {e}')
"
```

---

## 8. Workflow Engine

```bash
# Health check
curl -s https://workflow-engine-7vhmjxq8i-isaiahduprees-projects.vercel.app/api/health

# List workflow definitions
curl -s https://workflow-engine-7vhmjxq8i-isaiahduprees-projects.vercel.app/api/workflows \
  -H "Authorization: Bearer $WORKFLOW_ENGINE_MASTER_KEY" | python -m json.tool
```

---

## 9. All Executors Registered

```bash
python -c "
import workflow_executors as we
we.init_executors()
print(f'Total executors: {len(we._EXECUTORS)}')
for k in sorted(we._EXECUTORS.keys()):
    print(f'  {k}')
"
```

### Expected executor list (15 total)
```
blotato_multi_publish
blotato_upload
cloud_sync
crm_dm_sync
feedback_loop
firefly
gmail
linkedin
market_research
mediaposter
remotion_render
safari_research
safari_upload
save_content
send_dm
sora_generate
universal_feedback
upwork
youtube
```

---

## 10. Cron Job Verification

```bash
python -c "
from cron_definitions import CRON_JOBS
print(f'Total cron jobs: {len(CRON_JOBS)}')
for job in CRON_JOBS:
    print(f'  [{job.schedule}] {job.name}')
"
```

---

## 11. Heartbeat Agent

```bash
python -c "
import asyncio
from heartbeat_agent import run_heartbeat
result = asyncio.run(run_heartbeat())
print(result['status'])
for issue in result.get('issues', []):
    print(f'  ⚠️  {issue}')
"
```

---

## 12. Google OAuth Setup Guide

Both `youtube_client.py` and `gmail_client.py` share the same `client_secrets.json`.

### Steps
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. **APIs & Services → Enable APIs**:
   - YouTube Data API v3
   - YouTube Analytics API
   - Gmail API
4. **APIs & Services → Credentials → Create OAuth 2.0 Client ID**
   - Application type: Desktop App
   - Download JSON → save as `client_secrets.json` in `actp-worker/`
5. **OAuth consent screen**: add your Google account as a test user
6. Run auth for each service:
   ```bash
   cd /Users/isaiahdupree/Documents/Software/actp-worker
   python youtube_client.py --auth   # saves youtube_token.json
   python gmail_client.py --auth     # saves gmail_token.json
   ```
7. Add to `.env`:
   ```
   YOUTUBE_CHANNEL_ID=UCxxxxxxxxxxxxxxxxxxxxxxxx
   ENABLE_YOUTUBE_ANALYTICS=true
   ENABLE_GMAIL=true
   GMAIL_AUTO_SEND_THRESHOLD=0.9
   ```

---

## Quick Full-System Smoke Test

```bash
cd /Users/isaiahdupree/Documents/Software/actp-worker

python -c "
import asyncio, os, sys

async def smoke_test():
    passed = []
    failed = []

    # 1. All executors load
    try:
        import workflow_executors as we
        we.init_executors()
        passed.append(f'Executors: {len(we._EXECUTORS)} registered')
    except Exception as e:
        failed.append(f'Executors: {e}')

    # 2. Config loads
    try:
        import config
        passed.append('Config: loaded')
    except Exception as e:
        failed.append(f'Config: {e}')

    # 3. YouTube client imports
    try:
        import youtube_client
        passed.append('youtube_client: imported')
    except Exception as e:
        failed.append(f'youtube_client: {e}')

    # 4. Gmail client imports
    try:
        import gmail_client
        passed.append('gmail_client: imported')
    except Exception as e:
        failed.append(f'gmail_client: {e}')

    # 5. Supabase reachable
    try:
        from supabase import create_client
        sb = create_client(os.environ.get('SUPABASE_URL',''), os.environ.get('SUPABASE_ANON_KEY',''))
        sb.table('youtube_video_stats').select('id').limit(1).execute()
        passed.append('Supabase: youtube_video_stats reachable')
    except Exception as e:
        failed.append(f'Supabase: {e}')

    print(f'\\n✅ PASSED ({len(passed)}):')
    for p in passed: print(f'  {p}')
    if failed:
        print(f'\\n❌ FAILED ({len(failed)}):')
        for f in failed: print(f'  {f}')
        sys.exit(1)
    else:
        print('\\n🎉 All checks passed')

asyncio.run(smoke_test())
"
```
