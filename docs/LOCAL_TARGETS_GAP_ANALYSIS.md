# ACTP Local Targets — Gap Analysis

**Date:** February 22, 2026  
**Purpose:** Assess what the 3 local targets (Remotion, Safari Automation, Blotato) actually support vs. what actp-worker currently uses, and identify missing integrations.

---

## Target 1: Remotion Microservice

**Location:** `/Users/isaiahdupree/Documents/Software/Remotion/`  
**Service URL:** `http://localhost:3100`  
**Auth:** `X-API-Key` header  
**Start:** `npm run service:start`  
**Status:** 93.5% complete (143/153 features)

### Available API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Basic health check (no auth) |
| `/health/ready` | GET | Readiness check with queue stats |
| `/api/v1/capabilities` | GET | List all endpoints |
| `/api/v1/render/brief` | POST | Render video from JSON brief → returns jobId |
| `/api/v1/render/batch` | POST | Batch render multiple videos |
| `/api/v1/render/static-ad` | POST | Render static ad images |
| `/api/v1/tts/generate` | POST | Text-to-speech (OpenAI/ElevenLabs) |
| `/api/v1/tts/voice-clone` | POST | Clone voice from reference audio |
| `/api/v1/tts/multi-language` | POST | Multi-language speech generation |
| `/api/v1/video/generate` | POST | AI video generation (LTX/Mochi/Wan2.2/Sora) |
| `/api/v1/video/image-to-video` | POST | Animate static images |
| `/api/v1/image/character` | POST | Generate AI characters (DALL-E) |
| `/api/v1/avatar/infinitetalk` | POST | Generate talking head videos |
| `/api/v1/jobs` | GET | List all jobs with filtering |
| `/api/v1/jobs/:id` | GET | Get job status + result (video_path) |
| `/api/v1/jobs/:id` | DELETE | Cancel a job |

### TypeScript SDK

```typescript
import { RemotionClient } from './src/service/client';
const client = new RemotionClient({ baseUrl: 'http://localhost:3100', apiKey: 'key' });
const result = await client.renderBriefSync({ brief, quality: 'production' });
```

### What actp-worker CURRENTLY does

```python
# remotion_runner.py — runs npx as subprocess
cmd = ["npx", "remotion", "render", REMOTION_COMPOSITION, str(output_file), "--props", props_json]
proc = await asyncio.create_subprocess_exec(*cmd, cwd=REMOTION_PROJECT_DIR)
```

### GAPS

| # | Gap | Impact | Effort |
|---|-----|--------|--------|
| R1 | **Uses `npx` subprocess instead of REST API** | No job queue, no retry, no webhook callbacks | Medium |
| R2 | **Not using TTS endpoints** | Can't generate voiceovers for video content | Low |
| R3 | **Not using AI video generation** | Missing Sora/LTX/Mochi integration through Remotion | Medium |
| R4 | **Not using batch rendering** | Can't render multiple videos in parallel | Low |
| R5 | **Not using talking avatar generation** | Missing talking head content type | Low |
| R6 | **Not using static ad rendering** | Can't auto-generate ad images for AdLite | Low |
| R7 | **No health check from cloud** | Can't monitor Remotion service status | Low |

---

## Target 2: Safari Automation Service

**Location:** `/Users/isaiahdupree/Documents/Software/Safari Automation/`  
**Control API:** `http://localhost:7070`  
**Telemetry WS:** `ws://localhost:7071`  
**Start:** `cd packages/protocol && npm run start`

### Available API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/ready` | GET | Readiness check (database, safari, selectors) |
| `/v1/commands` | POST | Submit command → returns 202 + command_id |
| `/v1/commands/:id` | GET | Get command status + result |
| `/v1/commands` | GET | List commands (filterable) |
| `/v1/commands/:id/cancel` | POST | Cancel a running command |
| `/v1/sora/usage` | GET | Sora generation usage/limits |
| `/v1/telemetry/stats` | GET | Telemetry server stats |

### Command Types

| Command | Description |
|---------|-------------|
| `sora.generate` | Generate a Sora video via browser automation |
| `sora.generate.clean` | Generate + auto-remove watermark |
| `sora.batch.clean` | Batch generate + watermark removal |
| `sora.clean` | Remove watermark from existing video |

### WebSocket Telemetry (ws://localhost:7071)

| Event | Description |
|-------|-------------|
| `status.changed` | Command status changed (QUEUED→RUNNING→SUCCEEDED) |
| `sora.video.downloaded` | Raw video downloaded from Sora |
| `sora.video.cleaned` | Watermark-free video ready |
| `human.required` | Human approval needed |
| `rate.limited` | Platform rate limit hit |

### Platform Automations Available

| Platform | File | Capabilities |
|----------|------|-------------|
| **TikTok** | `safari_tiktok_cli.py` | Video upload, caption, hashtags |
| **Instagram** | `safari_instagram_poster.py` | Reel upload, caption |
| **YouTube** | `safari_youtube_uploader` | Shorts upload |
| **Twitter/X** | `safari_twitter_poster.py` | Tweet posting, DMs |
| **Threads** | `safari_threads_poster.py` | Post creation |
| **Reddit** | `safari_reddit_poster.py` | Post creation |
| **Sora** | `sora_full_automation.py` | Full video generation pipeline |

### What actp-worker CURRENTLY does

```python
# safari_executor.py — runs CLI tools as subprocess
cmd = [cli_path, "--video", str(video_path), "--caption", full_caption, "--platform", platform]
proc = await asyncio.create_subprocess_exec(*cmd)
```

### GAPS

| # | Gap | Impact | Effort |
|---|-----|--------|--------|
| S1 | **Uses CLI subprocess instead of HTTP command API** | No async tracking, no telemetry, brittle | Medium |
| S2 | **Not using Sora browser automation** | Can't generate videos via sora.chatgpt.com | High |
| S3 | **Not using WebSocket telemetry** | No real-time progress updates for video gen | Medium |
| S4 | **Not using watermark removal pipeline** | Sora videos have watermarks | Medium |
| S5 | **Not checking Sora usage limits** | Could hit rate limits blindly | Low |
| S6 | **No health/ready check integration** | Can't verify Safari is ready before commands | Low |
| S7 | **Missing Twitter/Threads/Reddit posting** | Only TikTok/Instagram/YouTube implemented | Low |

---

## Target 3: Blotato

**Cloud API:** `https://backend.blotato.com/v2`  
**Auth:** `blotato-api-key: YOUR_KEY` header  
**Docs:** https://help.blotato.com/api/api-reference

### Available API Endpoints

| Endpoint | Method | Description | Rate Limit |
|----------|--------|-------------|------------|
| `/v2/posts` | POST | Publish/schedule to 9 platforms | 30/min |
| `/v2/media` | POST | Upload media → Blotato CDN URL | 10/min |
| `/v2/videos/creations` | POST | Create AI video | 1/min |
| `/v2/videos/creations/:id` | GET | Get video status | — |
| `/v2/videos/:id` | DELETE | Delete video | — |

### Supported Platforms (9 total)

| Platform | Target Config Required |
|----------|----------------------|
| **Twitter/X** | `{ targetType: "twitter" }` |
| **Instagram** | `{ targetType: "instagram", mediaType: "reel"\|"story" }` |
| **TikTok** | `{ targetType: "tiktok", privacyLevel, disabledComments, disabledDuet, disabledStitch, isBrandedContent }` |
| **YouTube** | `{ targetType: "youtube", title, privacyStatus, shouldNotifySubscribers }` |
| **Facebook** | `{ targetType: "facebook", pageId }` |
| **LinkedIn** | `{ targetType: "linkedin" }` |
| **Pinterest** | `{ targetType: "pinterest", boardId }` |
| **Threads** | `{ targetType: "threads" }` |
| **Bluesky** | `{ targetType: "bluesky" }` |

### Publishing Flow

```
1. Upload video → POST /v2/media { url: "https://..." }
   Response: { url: "https://database.blotato.com/video.mp4" }

2. Publish → POST /v2/posts
   {
     post: {
       accountId: "acc_xxxxx",
       content: { text: "caption", mediaUrls: ["https://database.blotato.com/video.mp4"], platform: "tiktok" },
       target: { targetType: "tiktok", privacyLevel: "PUBLIC_TO_EVERYONE", ... }
     }
   }
   Response: { postSubmissionId: "UNIQUE_ID" }
```

### AI Video Creation

```
POST /v2/videos/creations
{ script: "prompt text", style: "cinematic", template: { id: "base/pov/wake-up" } }
→ { item: { id: "videogen_123", status: "Queued" } }

GET /v2/videos/creations/videogen_123
→ { item: { id: "videogen_123", status: "Done", mediaUrl: "https://..." } }
```

### What actp-worker CURRENTLY does

```python
# blotato_executor.py — uses assumed local HTTP API
async with httpx.AsyncClient() as client:
    files = {"video": (video_path.name, f, "video/mp4")}
    res = await client.post(f"{BLOTATO_BASE_URL}/api/upload", files=files, data=data)
```

### GAPS

| # | Gap | Impact | Effort |
|---|-----|--------|--------|
| B1 | **Uses assumed local API instead of official v2 cloud API** | Won't work — Blotato API is cloud-hosted | High |
| B2 | **Not uploading to Blotato CDN before posting** | mediaUrls must be database.blotato.com domain | Medium |
| B3 | **Missing platform-specific target configs** | TikTok needs 5 required fields, YouTube needs title/privacy | Medium |
| B4 | **Not using scheduling features** | Can't schedule posts for optimal timing | Low |
| B5 | **Not using AI video creation** | Missing Blotato's built-in video gen (POV, narrated, slideshows) | Medium |
| B6 | **Not using multi-platform posting** | Currently one-at-a-time via Safari | Medium |
| B7 | **Missing 3 platforms** | LinkedIn, Pinterest, Bluesky not reachable via Safari | Low |

---

## Cross-Cutting Gaps

| # | Gap | Impact | Effort |
|---|-----|--------|--------|
| X1 | **No unified local services health check** | Cloud can't verify Remotion + Safari + Blotato all running | Medium |
| X2 | **No video pipeline integration** | Remotion render → watermark removal → Blotato CDN → publish isn't wired | High |
| X3 | **Worker heartbeat doesn't report local service status** | ACTPDash can't show which local capabilities are available | Low |
| X4 | **No Sora→ACTP pipeline** | Safari generates Sora video → should feed into ACTP as creative | High |
| X5 | **Two publishing paths not unified** | Safari automation OR Blotato, but no smart routing | Medium |

---

## Priority Recommendations

### Phase 1 — Critical (use real APIs)

1. **B1+B2+B3: Rewrite blotato_executor to use official v2 API**
   - Upload media via `POST /v2/media`
   - Publish via `POST /v2/posts` with correct platform targets
   - This is the most impactful fix — Blotato's cloud API works anywhere

2. **R1: Rewrite remotion_runner to use microservice API**
   - Call `POST /api/v1/render/brief` instead of `npx` subprocess
   - Poll `GET /api/v1/jobs/:id` for completion
   - Gets proper job queue, retry, and webhook support

3. **S1: Rewrite safari_executor to use HTTP command API**
   - Call `POST /v1/commands` instead of subprocess CLI
   - Poll `GET /v1/commands/:id` for status
   - Use `/ready` check before sending commands

### Phase 2 — High Value (new capabilities)

4. **X2: Wire the full video pipeline**
   - Remotion renders → (optional watermark removal via Safari) → upload to Blotato CDN → publish

5. **S2+S4: Integrate Sora generation + watermark removal**
   - `POST /v1/commands { type: "sora.generate.clean" }` → clean video
   - Feed result into ACTP as a new creative

6. **B5+B6: Use Blotato for multi-platform + AI video**
   - Publish to all 9 platforms from one API
   - Use Blotato AI video creation as additional content source

### Phase 3 — Nice to Have

7. **R2+R5: TTS + Talking avatars** via Remotion service
8. **X1+X3: Unified local health reporting** in worker heartbeat
9. **B4: Scheduled posting** via Blotato API
10. **S3: WebSocket telemetry** for real-time progress in ACTPDash

---

## Environment Variables Needed

```bash
# Remotion Microservice
REMOTION_SERVICE_URL=http://localhost:3100
REMOTION_SERVICE_API_KEY=your-remotion-api-key

# Safari Automation Service
SAFARI_SERVICE_URL=http://localhost:7070
SAFARI_SERVICE_TOKEN=your-safari-token

# Blotato Cloud API
BLOTATO_API_KEY=your-blotato-api-key
BLOTATO_ACCOUNT_TIKTOK=acc_xxxxx
BLOTATO_ACCOUNT_INSTAGRAM=acc_xxxxx
BLOTATO_ACCOUNT_YOUTUBE=acc_xxxxx
BLOTATO_ACCOUNT_TWITTER=acc_xxxxx
BLOTATO_ACCOUNT_THREADS=acc_xxxxx
BLOTATO_ACCOUNT_FACEBOOK=acc_xxxxx
BLOTATO_ACCOUNT_LINKEDIN=acc_xxxxx
BLOTATO_ACCOUNT_PINTEREST=acc_xxxxx
BLOTATO_ACCOUNT_BLUESKY=acc_xxxxx
```
