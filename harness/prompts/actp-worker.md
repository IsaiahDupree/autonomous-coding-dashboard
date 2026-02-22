# actp-worker — Local macOS Worker Daemon

## Purpose
Build a Python daemon that runs on the local Mac, polls cloud queues (MPLite, GenLite), and executes tasks requiring macOS-native resources: Safari browser automation, Blotato uploads, Remotion video rendering, and ffmpeg processing. The bridge between Vercel-hosted Lite services and macOS-only tools. Part of the ACTP Lite distributed service mesh.

## Project Location
`/Users/isaiahdupree/Documents/Software/actp-worker/`

## PRD
`/Users/isaiahdupree/Documents/Software/MediaPoster/Backend/services/creative_testing_pipeline/docs/architecture/ACTP_WORKER_PRD.md`

## Feature List
`/Users/isaiahdupree/Documents/Software/actp-worker/feature_list.json`

## Tech Stack
- **Language**: Python 3.11+
- **Async**: asyncio + httpx
- **Database**: Supabase (for heartbeat + logs)
- **Local tools**: Safari (AppleScript), Blotato (local HTTP), Remotion (Node subprocess), ffmpeg
- **Process management**: launchd (macOS auto-start)

## Cloud Services Polled
- **MPLite** — `GET /api/queue/next` → claim → Safari/Blotato upload → report complete
- **GenLite** — `GET /api/jobs/next` → claim → Remotion render → upload to Storage → report complete

## Supabase Tables
- `actp_worker_heartbeats` — Write: worker status every 60s
- `actp_worker_logs` — Write: structured log entries

## Environment Variables
```
MPLITE_URL=https://mediaposter-lite.vercel.app
MPLITE_KEY=mpl_...
GENLITE_URL=https://genlite.vercel.app
GENLITE_KEY=gl_...
SUPABASE_URL=https://ivhfuhxorppptyuofbgq.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
BLOTATO_LOCAL_URL=http://localhost:PORT
REMOTION_PROJECT_PATH=/Users/isaiahdupree/Documents/Software/remotion
WORKER_POLL_INTERVAL=10
WORKER_MAX_CONCURRENT=2
WORKER_DOWNLOAD_DIR=/tmp/actp-worker
WORKER_LOG_LEVEL=info
```

## Existing Local Tools to Integrate (DO NOT REBUILD)
- `safari_tiktok_cli` — TikTok upload via Safari automation
- `safari_instagram_poster` — Instagram upload via Safari automation
- Blotato app — macOS desktop app with local HTTP API for social uploads
- Remotion — `/Users/isaiahdupree/Documents/Software/remotion/` (npx remotion render)
- ffmpeg — Video processing installed via Homebrew

## File Structure
```
actp-worker/
├── worker.py              # Main daemon entry point
├── config.py              # Configuration dataclass
├── pollers/
│   ├── base_poller.py
│   ├── mplite_poller.py
│   └── genlite_poller.py
├── executors/
│   ├── base_executor.py
│   ├── safari_executor.py
│   ├── blotato_executor.py
│   └── remotion_executor.py
├── heartbeat.py
├── cli.py
├── diagnostics.py
├── requirements.txt
├── .env.example
├── com.actp.worker.plist
└── README.md
```

## Sibling Services (DO NOT REBUILD)
- **MPLite** ✅ — https://mediaposter-lite.vercel.app
- **HookLite** ✅ — https://hooklite.vercel.app
- **MetricsLite** — Analytics cron
- **GenLite** — Video generation queue
- **AdLite** — Ad deployment queue
- **ACTPDash** — Campaign dashboard

## Critical Rules
- NEVER use mock data, mock providers, or placeholder implementations
- NEVER hardcode API keys or secrets
- Worker must be fully autonomous — zero manual intervention for normal operation
- Graceful degradation: missing capabilities (no Safari, no Blotato) don't crash the worker
- Heartbeat must report to Supabase even when idle
- All network operations must be async with proper timeout handling
- Clean up temp files on all code paths
- launchd plist for auto-start on login
