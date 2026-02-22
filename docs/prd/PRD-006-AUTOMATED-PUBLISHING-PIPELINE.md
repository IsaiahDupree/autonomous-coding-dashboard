# PRD-006: Automated Publishing Pipeline

## Status: Draft
## Author: Isaiah Dupree
## Created: 2026-02-22
## Priority: P1 — Final step in content automation loop
## Depends On: PRD-001 (Workflow Engine), PRD-002 (Local Agent), PRD-005 (AI Review Gate)

---

## 1. Problem Statement

Publishing is the most fragile step in the ACTP loop. The current system has:

- **PublishLite** (cloud) — scheduling engine with Thompson Sampling timing optimization
- **MPLite** (cloud) — publishing queue that coordinates local machine uploads
- **Safari automation** (local) — osascript-based uploaders for TikTok, Instagram, YouTube
- **Blotato** (local) — alternative upload path via Blotato's local HTTP API

But these are **disconnected pieces**:

1. **No intelligent routing** — Content doesn't automatically flow from "AI approved" to the right publishing method
2. **No platform-aware optimization** — Same content published identically to all platforms (no caption adaptation, hashtag optimization, or timing per platform)
3. **No publish verification** — After upload, nobody confirms the post is actually live and accessible
4. **No rollback** — If a post goes live but the AI review was wrong, there's no automated takedown
5. **No cross-platform coordination** — Can't stagger posts across platforms (TikTok first, Instagram 2 hours later)

This PRD defines the pipeline from **AI-approved content → platform-optimized → scheduled → uploaded → verified → tracking initiated**.

---

## 2. Solution Overview

An automated publishing pipeline that:
1. Receives approved content from the AI Review Gate (PRD-005)
2. Adapts content per-platform (captions, hashtags, aspect ratio, cover image)
3. Determines optimal publish time using Thompson Sampling (PublishLite)
4. Schedules across platforms with configurable stagger delays
5. Dispatches upload tasks to local worker (Safari or Blotato)
6. Verifies published posts are live and accessible
7. Initiates metric tracking via MetricsLite
8. Supports emergency takedown if issues detected post-publish

---

## 3. Architecture

```
AI Review Gate (PRD-005)
     │
     │ decision: APPROVE
     │ content: { video_url, script, platform, creative_id }
     ▼
┌────────────────────────────────────────────────────────┐
│              PUBLISHING PIPELINE                        │
│                                                          │
│  1. Platform Adapter                                     │
│     ├── Adapt caption (length, mentions, emojis)        │
│     ├── Optimize hashtags (trending + niche)             │
│     ├── Select cover image / thumbnail                   │
│     └── Adjust aspect ratio if needed                    │
│                                                          │
│  2. Timing Optimizer (PublishLite Thompson Sampling)      │
│     └── Select optimal publish time per platform         │
│                                                          │
│  3. Cross-Platform Scheduler                             │
│     ├── TikTok: publish immediately (or at optimal time) │
│     ├── Instagram: stagger +2 hours                      │
│     └── YouTube: stagger +4 hours                        │
│                                                          │
│  4. Queue Manager (MPLite)                               │
│     └── Enqueue items with scheduled_at timestamps       │
│                                                          │
└──────────────────────┬─────────────────────────────────┘
                       │
         actp_workflow_tasks (type: safari_upload | blotato_upload)
                       │
                       ▼
┌──────────────────────────────────────────────────────────┐
│                LOCAL AGENT (PRD-002)                       │
│                                                            │
│  5. Upload Executor                                        │
│     ├── Download video from Supabase Storage               │
│     ├── Safari: osascript drives TikTok/IG/YouTube upload  │
│     └── Blotato: HTTP API to local Blotato service         │
│                                                            │
│  6. Post Verification                                      │
│     ├── Navigate to post URL                               │
│     ├── Confirm post is publicly visible                   │
│     └── Extract initial engagement (0-count is fine)       │
│                                                            │
└──────────────────────┬─────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────┐
│              POST-PUBLISH (Cloud)                          │
│                                                            │
│  7. Record Post                                            │
│     └── Insert actp_organic_posts with post_url            │
│                                                            │
│  8. Initiate Tracking                                      │
│     ├── HookLite: create UTM redirect link                 │
│     └── MetricsLite: schedule metric collection            │
│                                                            │
│  9. Cross-Post Monitoring                                  │
│     └── If TikTok performs well → expedite IG/YT publish   │
│                                                            │
└──────────────────────────────────────────────────────────┘
```

---

## 4. Platform Adaptation

### Caption Optimization

Each platform has different optimal caption formats:

```python
class PlatformAdapter:
    """Adapt content for specific platform requirements."""

    PLATFORM_SPECS = {
        "tiktok": {
            "max_caption_length": 2200,
            "optimal_caption_length": 150,
            "max_hashtags": 5,
            "supports_links": False,
            "cta_style": "comment_trigger",  # "Comment 'AI' for the link"
            "emoji_density": "medium"
        },
        "instagram": {
            "max_caption_length": 2200,
            "optimal_caption_length": 300,
            "max_hashtags": 30,
            "supports_links": False,
            "cta_style": "link_in_bio",
            "emoji_density": "high"
        },
        "youtube": {
            "max_caption_length": 5000,
            "optimal_caption_length": 500,
            "max_hashtags": 15,
            "supports_links": True,
            "cta_style": "direct_link",
            "emoji_density": "low"
        }
    }

    async def adapt(self, content: dict, platform: str) -> dict:
        """Adapt content for target platform."""
        spec = self.PLATFORM_SPECS[platform]
        adapted = {**content, "platform": platform}

        # Adapt caption
        adapted["caption"] = await self._optimize_caption(
            content["script_text"],
            content["cta_text"],
            spec
        )

        # Select hashtags
        adapted["hashtags"] = await self._select_hashtags(
            content.get("niche_keywords", []),
            platform,
            spec["max_hashtags"]
        )

        # Build final post text
        adapted["post_text"] = self._build_post_text(
            adapted["caption"],
            adapted["hashtags"],
            spec
        )

        return adapted
```

### Hashtag Selection

```python
async def _select_hashtags(
    self, keywords: list[str], platform: str, max_count: int
) -> list[str]:
    """Select optimal hashtags from trending + niche data."""

    # Query ResearchLite for trending hashtags on this platform
    trending = await self.research_client.get_trending_hashtags(platform)

    # Query for niche-relevant hashtags
    niche = await self.research_client.get_niche_hashtags(keywords, platform)

    # Mix: 40% trending + 40% niche + 20% brand
    selected = []
    selected.extend(trending[:int(max_count * 0.4)])
    selected.extend(niche[:int(max_count * 0.4)])
    selected.extend(self.brand_hashtags[:int(max_count * 0.2)])

    return selected[:max_count]
```

---

## 5. Timing Optimization

### Thompson Sampling Integration

PublishLite already implements Thompson Sampling for optimal posting times. The publishing pipeline calls it:

```python
async def get_optimal_publish_time(
    self, platform: str, content_type: str
) -> datetime:
    """Get optimal publish time from PublishLite Thompson Sampling."""

    response = await self.publishlite_client.post(
        "/api/timing/recommend",
        json={
            "platform": platform,
            "content_type": content_type,
            "timezone": "America/New_York"
        }
    )

    data = response.json()
    # Returns: { "recommended_time": "2026-02-23T14:30:00Z", "confidence": 0.82 }

    return datetime.fromisoformat(data["recommended_time"])
```

### Cross-Platform Stagger

```python
STAGGER_CONFIG = {
    "primary": "tiktok",       # Publish here first
    "stagger": {
        "instagram": {"delay_hours": 2, "skip_if_primary_below": 100},  # views
        "youtube": {"delay_hours": 4, "skip_if_primary_below": 500}
    }
}
```

Logic:
1. Publish to TikTok at optimal time
2. After 2 hours, check TikTok performance
3. If > 100 views → publish to Instagram
4. After 4 hours from TikTok, check performance
5. If > 500 views → publish to YouTube Shorts
6. If below thresholds → skip secondary platforms (save the slot)

---

## 6. Upload Execution

### Safari Upload Flow (TikTok)

```python
class SafariTikTokUploader:
    """Upload video to TikTok via Safari automation."""

    async def upload(self, video_path: str, caption: str) -> str:
        """Upload video and return post URL."""

        script = f'''
        tell application "Safari"
            activate
            open location "https://www.tiktok.com/upload"
            delay 5

            -- Wait for upload page to load
            repeat 30 times
                set loaded to (do JavaScript "
                    document.querySelector('[class*=upload]') !== null
                " in current tab of window 1)
                if loaded then exit repeat
                delay 1
            end repeat

            -- Trigger file picker (requires accessibility permissions)
            -- Use drag-and-drop simulation or file input click
            do JavaScript "
                const input = document.querySelector('input[type=file]');
                if (input) {{
                    // Programmatic file selection requires user interaction
                    // Use keyboard shortcut to open file dialog
                }}
            " in current tab of window 1

            -- Alternative: Use `osascript` to interact with file dialog
            delay 2
            tell application "System Events"
                keystroke "g" using {{command down, shift down}}
                delay 1
                keystroke "{video_path}"
                delay 0.5
                keystroke return
                delay 1
                keystroke return
            end tell

            -- Wait for upload to complete
            repeat 120 times
                set uploaded to (do JavaScript "
                    document.querySelector('[class*=progress]')?.textContent?.includes('100') ||
                    document.querySelector('[class*=post-button]') !== null
                " in current tab of window 1)
                if uploaded then exit repeat
                delay 1
            end repeat

            -- Set caption
            do JavaScript "
                const editor = document.querySelector('[contenteditable=true]');
                if (editor) {{
                    editor.focus();
                    editor.textContent = '';
                    document.execCommand('insertText', false, `{caption}`);
                }}
            " in current tab of window 1

            delay 1

            -- Click post button
            do JavaScript "
                const btn = document.querySelector('[class*=post-button], [data-e2e=post-button]');
                if (btn) btn.click();
            " in current tab of window 1

            -- Wait for post to complete and get URL
            delay 10
            set postUrl to (do JavaScript "window.location.href" in current tab of window 1)
        end tell

        return postUrl
        '''

        proc = await asyncio.create_subprocess_exec(
            "osascript", "-e", script,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await proc.communicate()

        if proc.returncode != 0:
            raise RuntimeError(f"TikTok upload failed: {stderr.decode()}")

        post_url = stdout.decode().strip()
        return post_url
```

### Blotato Upload Alternative

```python
class BlotatoUploader:
    """Upload via Blotato's local HTTP API (simpler, more reliable)."""

    BLOTATO_URL = "http://localhost:32123"  # Blotato default port

    async def upload(self, platform: str, video_path: str, caption: str) -> str:
        """Upload via Blotato API."""

        async with httpx.AsyncClient() as client:
            # Upload media file
            with open(video_path, "rb") as f:
                upload_resp = await client.post(
                    f"{self.BLOTATO_URL}/api/upload",
                    files={"file": (os.path.basename(video_path), f, "video/mp4")},
                    timeout=120
                )
            media_id = upload_resp.json()["media_id"]

            # Create post
            post_resp = await client.post(
                f"{self.BLOTATO_URL}/api/post",
                json={
                    "platform": platform,
                    "media_id": media_id,
                    "caption": caption,
                    "publish_now": True
                },
                timeout=60
            )

            return post_resp.json()["post_url"]
```

### Upload Method Selection

```python
async def select_upload_method(self, platform: str) -> str:
    """Select best available upload method."""

    # Prefer Blotato if available (more reliable)
    if self.blotato_available and platform in self.blotato_supported:
        return "blotato_upload"

    # Fall back to Safari automation
    if self.safari_available:
        return "safari_upload"

    raise RuntimeError(f"No upload method available for {platform}")
```

---

## 7. Post Verification

After upload, verify the post is live:

```python
async def verify_post(self, post_url: str, platform: str) -> dict:
    """Verify post is publicly accessible."""

    script = f'''
    tell application "Safari"
        open location "{post_url}"
        delay 5

        set isLive to (do JavaScript "
            // Check for platform-specific indicators that post is live
            const indicators = {{
                'tiktok': () => document.querySelector('[data-e2e=browse-video]') !== null,
                'instagram': () => document.querySelector('article') !== null,
                'youtube': () => document.querySelector('#player') !== null
            }};
            const check = indicators['{platform}'];
            check ? check() : false;
        " in current tab of window 1)

        return isLive
    end tell
    '''

    proc = await asyncio.create_subprocess_exec(
        "osascript", "-e", script,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE
    )
    stdout, _ = await proc.communicate()
    is_live = stdout.decode().strip().lower() == "true"

    return {
        "verified": is_live,
        "verified_at": datetime.utcnow().isoformat(),
        "post_url": post_url
    }
```

---

## 8. Post-Publish Actions

### Record in Database

```sql
INSERT INTO actp_organic_posts (
  creative_id, campaign_id, platform, post_url,
  caption, hashtags, published_at, status,
  publish_method, verified
) VALUES (
  $creative_id, $campaign_id, $platform, $post_url,
  $caption, $hashtags, now(), 'published',
  $method, $verified
);
```

### Create Tracking Link (HookLite)

```python
async def create_tracking_link(self, post: dict) -> str:
    """Create UTM-tagged redirect link via HookLite."""

    resp = await self.hooklite_client.post("/api/r/create", json={
        "destination_url": post.get("landing_page_url", "https://yoursite.com"),
        "utm_source": post["platform"],
        "utm_medium": "organic",
        "utm_campaign": post["campaign_id"],
        "utm_content": post["creative_id"]
    })

    return resp.json()["short_url"]  # e.g., https://hooklite.../r/abc123
```

### Schedule Metric Collection (MetricsLite)

```python
async def schedule_metrics(self, post_id: str, platform: str):
    """Schedule metric collection checkpoints."""

    # Collect at: 1h, 4h, 12h, 24h, 48h, 7d
    checkpoints = [1, 4, 12, 24, 48, 168]

    await self.metricslite_client.post("/api/schedule-collection", json={
        "post_id": post_id,
        "platform": platform,
        "checkpoints_hours": checkpoints
    })
```

---

## 9. Emergency Takedown

If post-publish monitoring detects issues:

```python
async def emergency_takedown(self, post_url: str, platform: str, reason: str):
    """Remove a published post via Safari automation."""

    # Navigate to post → click delete/archive
    # Platform-specific deletion flow
    # Record takedown in actp_organic_posts

    await self.update_post(post_url, {
        "status": "taken_down",
        "takedown_reason": reason,
        "taken_down_at": datetime.utcnow().isoformat()
    })
```

Triggers for emergency takedown:
- AI review override to REJECT after publish (human catches issue)
- Platform flags content (detected via webhook or metric anomaly)
- Engagement signals indicate content is harming brand (unusual negative comments)

---

## 10. Data Model Additions

### `actp_publish_schedule`
```sql
CREATE TABLE actp_publish_schedule (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id    UUID REFERENCES actp_workflow_executions(id),
  creative_id     UUID REFERENCES actp_creatives(id),
  platform        TEXT NOT NULL,
  scheduled_at    TIMESTAMPTZ NOT NULL,
  status          TEXT DEFAULT 'scheduled',
    -- scheduled | publishing | published | failed | skipped | cancelled
  stagger_group   UUID,                  -- links staggered posts together
  stagger_order   INT DEFAULT 0,
  skip_threshold  JSONB,                 -- { "primary_views_min": 100 }
  publish_method  TEXT,                  -- safari_upload | blotato_upload
  adapted_content JSONB,                 -- platform-specific caption, hashtags
  post_url        TEXT,
  verified        BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now()
);
```

---

## 11. Failure Modes

| Failure | Detection | Mitigation |
|---------|-----------|------------|
| Safari upload fails (DOM change) | osascript error | Retry once; fall back to Blotato; alert |
| Blotato not running | Connection refused | Fall back to Safari; alert |
| Platform rejects upload (file too large) | Error during upload | Compress video; retry |
| Login session expired | Redirect to login page | Pause publishing; alert user to re-login |
| Post URL not returned | Empty stdout from script | Navigate to profile, find latest post |
| Verification fails (post not visible) | `verify_post` returns false | Wait 60s, retry; may be processing delay |
| Caption too long for platform | Pre-check before upload | Truncate with "..." preservation |
| Hashtags blocked by platform | Post rejected or shadow-banned | Remove flagged hashtags; maintain blocklist |
| Rate limited by platform | Multiple upload failures | Enforce 15-min minimum between posts per platform |
| Scheduled time missed (worker offline) | `scheduled_at` in past | Publish ASAP; adjust timing for next posts |

---

## 12. Rate Limits & Publishing Schedule

| Platform | Max Posts/Day | Min Interval | Optimal Posts/Day |
|----------|---------------|-------------|-------------------|
| TikTok | 10 | 2 hours | 2-3 |
| Instagram Reels | 5 | 3 hours | 1-2 |
| YouTube Shorts | 5 | 4 hours | 1 |
| Twitter/X | 20 | 30 minutes | 3-5 |
| Threads | 10 | 1 hour | 1-2 |

Enforced by the Queue Manager before scheduling.

---

## 13. Success Metrics

| Metric | Target |
|--------|--------|
| Upload success rate | > 95% |
| Post verification rate | > 98% of uploads verified live |
| Publishing latency (scheduled → live) | < 5 minutes |
| Platform adaptation quality | > 90% (human audit) |
| Cross-platform stagger accuracy | Within 15 min of scheduled time |
| Metric tracking initiation rate | 100% of published posts |
| Emergency takedown latency | < 10 minutes from trigger |

---

## 14. Implementation Plan

| Phase | Scope | Estimate |
|-------|-------|----------|
| Phase 1 | Platform Adapter (caption, hashtags per platform) | 2 days |
| Phase 2 | Timing integration with PublishLite Thompson Sampling | 1 day |
| Phase 3 | Cross-platform stagger scheduler | 1 day |
| Phase 4 | Safari TikTok uploader (osascript) | 2 days |
| Phase 5 | Safari Instagram uploader | 2 days |
| Phase 6 | Safari YouTube Shorts uploader | 1 day |
| Phase 7 | Blotato integration (alternative upload path) | 1 day |
| Phase 8 | Post verification (Safari check) | 1 day |
| Phase 9 | Post-publish actions (DB record, HookLite link, MetricsLite schedule) | 1 day |
| Phase 10 | Emergency takedown flow | 1 day |
| Phase 11 | Workflow definition + integration with PRD-001 | 1 day |
