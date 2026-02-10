# SnapMix — Agent Prompt

## AUTONOMOUS MODE — DO NOT ASK WHAT TO WORK ON

You are running in a fully autonomous session with NO human interaction. **Never ask what to focus on.** Instead:
1. Read `feature_list.json` and find the FIRST feature where `"passes": false`
2. Implement that feature following TDD (write test → implement → verify)
3. Set `"passes": true` in `feature_list.json` when done
4. Commit your changes
5. Move to the next failing feature

**Do NOT stop to ask questions. Do NOT present options. Just pick the next failing feature and implement it.**

## Project Overview
SnapMix is a Snapchat-style, producer-to-producer track sharing platform. Tracks are shared as ephemeral "Snaps" with real-time visual playback, presence awareness, timecoded reactions, and a lightweight networking/collab layer.

**Brand positioning:** "The social layer for DJs + producers."
**Tagline:** "Stay in tempo with your people."

## Reference Documents
- **PRD**: `docs/PRD_SNAPMIX.md`
- **Feature List**: Feature list JSON in the ACD docs directory

## Core Product: "Track Snaps"
A Snap is an ephemeral, access-controlled track share with:
- Landing page player with real-time visuals (waveform + spectrum + generative)
- "Listening now" presence (sender sees opens, plays, position, reactions live)
- Timecoded comments and markers
- Audio reply ("Snap back") — 15-30s response
- Expiration controls (time + play count + passcode)

## The Dopamine Loop
**Sender sees live:**
- "Opened" → "Playing" → "Looping bar 9-16" → "Left a 🔥 at 0:45" → "Replayed 3x"

**Receiver experience:**
- Big play → instant visual → quick reactions → drop markers → send back a snap

## Architecture

### Frontend
- **Next.js 15** with App Router, TypeScript
- **TailwindCSS** + **shadcn/ui** for components
- **WebAudio API** for spectrum/waveform visualization
- **WebGL/Shaders** for generative visuals (post-MVP)

### Backend
- Next.js API routes (or standalone service)
- **WebSocket** server (Socket.io or Supabase Realtime) for presence + events
- **Worker queue** (BullMQ / Inngest) for transcoding, peaks, watermarking

### Storage & Streaming
- **S3/R2** object storage for originals, transcoded files, waveform peaks JSON
- **CDN** in front for audio segment delivery
- **HLS streaming** with signed, short-lived tokens per session
- Never expose original files — streaming-only transcoded format (AAC/Opus)

### Database
- **Supabase (Postgres)** with tables:
  - `users` — profiles, genres, DAW, role, city
  - `snaps` — sender_id, title, visibility, expires_at, max_plays, passcode_hash
  - `snap_recipients` — per-recipient status tracking
  - `tracks` — audio metadata, stream manifest, BPM, key, waveform peaks URL
  - `snap_sessions` — per-viewer session tracking, watermark_id
  - `snap_events` — real-time event log (type, timecode, payload)
  - `comments` — timecoded text comments
  - `replies` — audio reply snaps
  - `follows`, `dms` — social graph + messaging

### Processing Pipeline
1. **Upload** → validate format (WAV/MP3/FLAC/AIFF)
2. **Transcode** → AAC/Opus via ffmpeg
3. **HLS segmentation** → manifest + segments with short TTLs
4. **Waveform peaks** → extract peaks JSON
5. **BPM/key detection** → auto-tag metadata
6. **Optional watermark** → forensic audio watermark per recipient

## Security Stance
- Streaming-only + expiring links
- Signed, short-lived playback tokens (JWT)
- Rate limiting + bot protection
- Encryption at rest
- Recipient/session watermarking (Pro/Studio)
- Mid-play access revocation
- Optional client-side encryption (Studio)

## Real-Time Events (WebSocket)
All events follow the pattern: `snap.<event_type>`
- `snap.opened` — recipient opened the page
- `snap.playing` / `snap.paused` — playback state
- `snap.position` — throttled playhead updates (1-3s)
- `snap.reaction` — emoji + timecode
- `snap.marker_added` — note + timecode
- `snap.reply_created` — audio reply attached

## Pricing Tiers
| Tier | Price | Key Features |
|------|-------|-------------|
| Free | $0 | 5 snaps/mo, standard quality, 24h max |
| Pro | $9.99/mo | Unlimited, HQ, watermarking, analytics |
| Studio | $24.99/mo | Live Rooms, encryption, teams, API |

## DJ-Specific Features
- Auto BPM + key detection on upload
- Gear/DAW tags on posts
- B2B matchmaking (genre + tempo + city)
- Setlist/crate sharing with transition notes
- Open sessions / flip contests

## Live Listen Rooms (Differentiator)
- Sender joins while receiver listens
- Synchronized playhead across participants
- Live marker drops (click to jump)
- Producer coaching / structured feedback flow

## Development Priority
1. **MVP**: Upload → Snap → Landing Player → Reactions → Presence
2. **Phase 2**: Comments, markers, audio replies
3. **Phase 3**: Profiles, follows, DMs, networking
4. **Phase 4**: Security hardening, watermarking
5. **Phase 5**: DJ features (BPM, B2B, crates)
6. **Phase 6**: Billing + pricing tiers
7. **Phase 7**: Live Listen Rooms
8. **Phase 8**: Analytics, mobile PWA, polish

## Development Instructions
- Use the feature list to track progress
- Implement features in phase order
- All audio processing must happen server-side
- Never expose original audio files to clients
- WebSocket events must be authenticated
- Use signed tokens for all HLS segment access
- Build mobile-first responsive design
- Dark mode as default theme (producer aesthetic)
