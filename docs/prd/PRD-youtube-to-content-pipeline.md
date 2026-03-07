---
slug: youtube-to-content-pipeline
title: YouTube Playlist → Full Content Package Pipeline
status: ready
priority: high
target_path: /Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness
---

# PRD: YouTube Playlist → Full Content Package Pipeline

## What This Replaces / Extends
Replaces the Make.com blueprint "Rapid API Youtube Insight To Medium Notes V10".
Rebuilds it natively using Claude + existing Safari automation stack.
Adds: resources list, learning lessons, key takeaways, Claude skill export,
downloadable attachments, newsletter post, and community post.

## Pipeline Overview

```
YouTube Playlist Scan
  → Pick next unprocessed video
  → RapidAPI: fetch transcript
  → Claude Sonnet: decode + extract structured data
      - Full transcript text
      - Key insights (bullet list)
      - Learning lessons (numbered, actionable)
      - Key takeaways (3-5 one-liners)
      - Resources mentioned (tools, links, books)
      - Claude skill (reusable prompt based on video content)
  → Claude Sonnet: generate content package
      - Medium blog post (HTML, 800-1500 words)
      - Newsletter version (plain text, shorter)
      - Community post (conversational, 200-300 words)
      - Tweet thread (5-7 tweets)
      - Pinterest caption (under 250 chars)
  → Image generation (DALL-E via OpenAI or Sora prompt)
  → Attachments (PDF-ready markdown: summary sheet, lesson plan, resource list)
  → Publish
      - Medium: post with feature image + all attachments linked
      - Newsletter: queue in MPLite or Beehiiv
      - Community: post to Skool/Circle/Discord (via Safari or API)
  → Store all outputs in Supabase (yt_content_packages table)
  → Update status in tracking sheet or Supabase queue
```

## Stack (native replacements)

| Make.com module | Native replacement |
|-----------------|-------------------|
| google-sheets:filterRows | `yt_content_queue` Supabase table (status=pending) |
| http RapidAPI transcriptor | Direct RapidAPI call (same endpoint, same key) |
| openai GPT-4o decode | Claude Sonnet: decode transcript JSON |
| openai Assistant insights | Claude Sonnet: extract insights, lessons, takeaways |
| openai Assistant blog post | Claude Sonnet: generate Medium HTML post |
| DALL-E 3 image | OpenAI Images API or Sora prompt saved for manual run |
| medium:uploadImage | `POST http://localhost:3108/api/medium/posts/create` |
| medium:createPost | `medium_publish` MCP tool |
| google-sheets update | Supabase upsert to `yt_content_packages` |
| pinterest caption | Claude Haiku: short caption |
| tweet thread | Claude Haiku: tweet thread |
| grok-3 voice track | Claude Sonnet: voice track script |

## Supabase Tables

### yt_content_queue
Tracks which videos need processing.
```sql
CREATE TABLE IF NOT EXISTS yt_content_queue (
  id              TEXT PRIMARY KEY,   -- YouTube video ID
  playlist_id     TEXT,
  title           TEXT,
  channel         TEXT,
  url             TEXT,
  status          TEXT DEFAULT 'pending',  -- pending, processing, done, error
  error_msg       TEXT,
  queued_at       TIMESTAMPTZ DEFAULT NOW(),
  processed_at    TIMESTAMPTZ
);
```

### yt_content_packages
Stores all generated content per video.
```sql
CREATE TABLE IF NOT EXISTS yt_content_packages (
  video_id            TEXT PRIMARY KEY,
  playlist_id         TEXT,
  title               TEXT,
  channel             TEXT,
  url                 TEXT,

  -- Raw data
  transcript_text     TEXT,
  transcript_raw      JSONB,

  -- Structured extracts
  insights            TEXT,      -- bullet list of key insights
  learning_lessons    TEXT,      -- numbered actionable lessons
  key_takeaways       TEXT,      -- 3-5 punchy one-liners
  resources           JSONB,     -- [{name, url, type}] tools/links/books mentioned
  claude_skill        TEXT,      -- reusable Claude prompt derived from video
  voice_track         TEXT,      -- narration script for short video

  -- Content package
  medium_post_html    TEXT,
  newsletter_text     TEXT,
  community_post      TEXT,
  tweet_thread        TEXT,
  pinterest_caption   TEXT,

  -- Attachments (markdown, stored as text, downloadable as PDF)
  attachment_summary  TEXT,      -- 1-page summary sheet
  attachment_lessons  TEXT,      -- structured lesson plan
  attachment_resources TEXT,     -- curated resource list

  -- Publish results
  medium_post_id      TEXT,
  medium_post_url     TEXT,
  image_url           TEXT,
  image_drive_id      TEXT,
  newsletter_queued   BOOLEAN DEFAULT FALSE,
  community_posted    BOOLEAN DEFAULT FALSE,

  -- Metadata
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  published_at        TIMESTAMPTZ
);
```

## Features

### YTC-001: RapidAPI Transcript Fetch
Call `https://youtube-transcriptor.p.rapidapi.com/transcript?video_id={id}&lang=en`
with the RapidAPI key from env `RAPIDAPI_KEY`.
Parse response JSON to extract plain text transcript.
Passes: transcript_text is non-empty for a known video ID.

### YTC-002: Claude Transcript Decode + Structure
Send raw transcript JSON to Claude Sonnet with prompt:
"Decode this YouTube transcript JSON and return clean text. Then extract:
1. Key insights (bullet list, max 10)
2. Learning lessons (numbered, actionable, max 7)
3. Key takeaways (3-5 punchy one-liners readers remember)
4. Resources mentioned (tools, books, links, people — JSON array with name/url/type)
5. A Claude skill: a reusable system prompt someone could use to apply the main concept"

Return structured JSON with all 5 fields.
Passes: all 5 fields non-empty for a real video transcript.

### YTC-003: Medium Blog Post Generation
Send structured extract to Claude Sonnet:
"Write an 800-1500 word Medium blog post in HTML format based on these notes.
Include: compelling title, subtitle, introduction, 3-5 H2 sections covering the insights,
practical takeaways section, conclusion with CTA. Embed the learning lessons naturally.
Link to any resources mentioned."

Use video title + channel as context. Return HTML.
Passes: HTML is valid, word count 800-1500, contains ≥3 H2 headings.

### YTC-004: Newsletter Version
From the blog post, Claude Haiku generates a shorter plain-text newsletter version:
- Subject line
- Opening hook (2-3 sentences)
- Top 3 lessons (brief bullets)
- CTA to read full post on Medium
- Max 400 words

Passes: newsletter_text < 400 words, contains subject line and CTA.

### YTC-005: Community Post
Claude Haiku generates a conversational community post (200-300 words):
"Write a casual, engaging community post sharing what you learned from watching this video.
Sound like a human sharing a discovery, not a marketer. End with a question to spark discussion."

Passes: community_post 200-300 words, ends with a question.

### YTC-006: Tweet Thread
Claude Haiku generates 5-7 tweet thread:
- Tweet 1: hook with key insight
- Tweets 2-5: one learning per tweet
- Tweet 6: resource or tool mentioned
- Tweet 7: CTA to Medium post
Each tweet ≤280 chars. Format as numbered list.

Passes: 5-7 tweets, each ≤280 chars.

### YTC-007: Pinterest Caption
Claude Haiku generates one caption ≤250 chars referencing the image content and linking to Medium post.
Passes: caption ≤250 chars.

### YTC-008: Voice Track Script
Claude Sonnet generates a narration script for a short-form video (60-90 seconds spoken):
"Write a voice track for a 60-90 second video about the unique insights from this content.
Speaker-only text. Engaging, curious tone. No stage directions. No quotation marks."
Then Grok-3 (via xAI API) improves it for engagement.

Passes: voice_track 150-300 words, reads naturally in 60-90 seconds.

### YTC-009: Attachment — 1-Page Summary Sheet
Claude generates a clean markdown document:
```
# {title}
Source: {url}
Channel: {channel}

## What This Is About
{2-3 sentence summary}

## Key Insights
{bullet list}

## Learning Lessons
{numbered list}

## Key Takeaways
{3-5 one-liners}

## Resources
{table with name, type, url}
```
Passes: attachment_summary is valid markdown with all sections.

### YTC-010: Attachment — Lesson Plan
Claude generates a structured lesson plan:
```
# Lesson Plan: {topic from video}

## Learning Objectives
## Prerequisites
## Lesson Outline (30-60 min)
## Exercises / Practice
## Assessment / Check Your Understanding
## Further Reading
```
Passes: attachment_lessons contains all 6 sections.

### YTC-011: Claude Skill Export
The `claude_skill` field is a reusable Claude system prompt.
Format:
```
# Skill: {skill name derived from video topic}
# Source: {video title} by {channel}

## System Prompt
{prompt text that lets someone apply the main concept from the video}

## Example Usage
{1-2 example user messages + expected Claude response}
```
Passes: claude_skill contains System Prompt and Example Usage sections.

### YTC-012: Feature Image Generation
Call OpenAI Images API with DALL-E 3:
- Prompt: "Professional, elegant thumbnail image for a blog post about: {key_takeaways[0]}"
- Size: 1024x1024, quality: standard, style: vivid
- Upload result to Supabase Storage → get public URL
- Store as image_url

Passes: image_url is a valid public URL pointing to a 1024x1024 image.

### YTC-013: Medium Publish
Call `POST http://localhost:3108/api/medium/posts/create` with:
- title: generated title
- content: medium_post_html with feature image tag at top
- tags: extracted from video topic (max 5)
- publishImmediately: true

Store returned post URL and ID.
Passes: medium_post_url is a valid `medium.com/...` URL.

### YTC-014: Newsletter Queue
Call MPLite or direct Beehiiv API to queue the newsletter version:
- If MPLite: `POST https://mediaposter-lite-isaiahduprees-projects.vercel.app/api/queue`
- If Beehiiv: `POST https://api.beehiiv.com/v2/publications/{id}/posts`
Set newsletter_queued = true.
Passes: newsletter queued successfully (HTTP 200).

### YTC-015: Supabase Upsert
After all generation, upsert all fields into `yt_content_packages`.
Update `yt_content_queue` status to `done`.
Passes: record exists in Supabase with non-null medium_post_url and all content fields.

### YTC-016: Playlist Scanner Daemon
Daemon process: `youtube-content-daemon.js`
- Every 2 hours, scan configured YouTube playlist IDs via YouTube Data API
- For each video not in `yt_content_queue` (or status != done), insert with status=pending
- Process queue one video at a time (rate limit: max 10 videos/day)
- Send Telegram notification on each successful Medium publish with title + URL

Passes: daemon runs, scans playlist, finds unprocessed videos, queues them, processes one per run.

### YTC-017: Telegram Notifications
On each successful pipeline run, send to Telegram:
```
✅ New content published from YouTube

📹 Video: {title}
📺 Channel: {channel}
📝 Medium: {medium_post_url}
🎯 Takeaway: {key_takeaways[0]}

Content created:
• Blog post (Medium)
• Newsletter draft
• {n} tweets
• Voice track script
• 3 downloadable attachments
• Claude skill exported
```
Passes: message received in Telegram on test run.

## Environment Variables Required
```
RAPIDAPI_KEY=a87cab3052mshf494034b3141e1ep1aacb0...  # from blueprint
OPENAI_API_KEY=...
XAI_API_KEY=...      # for Grok-3 voice track improvement
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
SUPABASE_URL=https://ivhfuhxorppptyuofbgq.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
YOUTUBE_PLAYLIST_IDS=PLxxx,PLyyy   # comma-separated playlist IDs to watch
```

## File Structure
```
harness/
  youtube-content-daemon.js    # main daemon
  youtube-content-pipeline.js  # pipeline logic (transcript→content→publish)
  youtube-content-prompts.js   # all Claude prompts as named exports
```

## Acceptance Criteria
All 17 features pass. End-to-end: one YouTube video from a watched playlist
→ transcript fetched → full content package generated → Medium post live →
newsletter queued → Telegram notification received → Supabase record complete.
