# ContactPostEnricher — ACD Build Prompt

## Mission
Build `contact_post_enricher.py` in actp-worker. This agent fills the most critical gap in DM
personalization: pulling the top 3 most engaging posts PER CRM contact before their DM is
generated. Currently only 1 generic post exists from initial discovery. Claude needs specific,
recent post context to write a DM that doesn't sound mass-generated.

## Working Directory
`/Users/isaiahdupree/Documents/Software/actp-worker/`

## Output Files
- `contact_post_enricher.py`
- `tests/test_contact_post_enricher.py`

---

## The Gap This Fills

AAG-007 (ContactSeeder) stores a single `top_post_text` + `top_post_url` per contact from the
bulk niche keyword search. This post is often from a trending topic in the niche, not authored
by the specific contact.

AAG-051 (ContextBuilder) tries to read `crm_market_research` for "top 2 posts" before DM
generation — but the table has either 0 rows or 1 stale row per contact.

**Fix**: Before a contact advances to `ready_for_dm`, pull their last 20 posts, compute
engagement scores, store top 3 in `crm_contact_posts`, update `crm_market_research`.

---

## Platform Profile Post Endpoints

**Primary: RapidAPI** (58 active subscriptions in WhatsCurrentlyInTheMarket repo,
key in env as `RAPIDAPI_KEY`). More reliable than Safari automation.

```python
# Primary: RapidAPI (fast, no browser dependency)
RAPIDAPI_KEY = os.getenv("RAPIDAPI_KEY")  # a87cab3052mshf494034b3141e1ep1aacb0jsn580589e4be0b
RAPIDAPI_HEADERS = lambda host: {
    "X-RapidAPI-Key": RAPIDAPI_KEY,
    "X-RapidAPI-Host": host,
}

RAPIDAPI_PROFILE_ENDPOINTS = {
    # tiktok-scraper7: GET /user/posts?unique_id={handle}&count=30
    "tiktok": {
        "url":    "https://tiktok-scraper7.p.rapidapi.com/user/posts",
        "host":   "tiktok-scraper7.p.rapidapi.com",
        "params": lambda handle: {"unique_id": handle, "count": 30},
        "posts_path": ["data", "videos"],
    },
    # instagram-looter2: GET /v1/posts?username_or_id={handle}
    "instagram": {
        "url":    "https://instagram-looter2.p.rapidapi.com/v1/posts",
        "host":   "instagram-looter2.p.rapidapi.com",
        "params": lambda handle: {"username_or_id_or_url": handle},
        "posts_path": ["data", "items"],
    },
    # twitter: Safari Comments service (no RapidAPI sub for author-filtered tweets)
    "twitter": {
        "url":    "http://localhost:3007/api/search",
        "host":   None,  # local Safari service
        "params": lambda handle: {"author": handle, "limit": 20},
        "posts_path": ["data"],
    },
    # linkedin: market research fallback
    "linkedin": None,
}

# Fallback for all platforms: Market Research API keyword search with author filter
MARKET_RESEARCH_SEARCH = "http://localhost:3106/api/research/{platform}/search"
```

> **Reference**: `WhatsCurrentlyInTheMarket/gap-radar/src/lib/collectors/tiktok.ts`
> for RapidAPI response shapes and `RAPIDAPI_REFERENCE.md` for all 58 subscriptions.

---

## Engagement Score Formula (matches universal_feedback_engine.py weights)

```python
ENGAGEMENT_WEIGHTS = {
    "twitter":   {"likes": 1, "retweets": 2, "bookmarks": 2, "quotes": 3, "replies": 1},
    "instagram": {"likes": 1, "comments": 2, "shares": 3, "saves": 3},
    "tiktok":    {"likes": 1, "comments": 2, "shares": 3, "saves": 2},
    "linkedin":  {"likes": 1, "comments": 2, "shares": 3, "clicks": 2},
    "threads":   {"likes": 1, "reposts": 2, "quotes": 3, "replies": 1},
}

def compute_engagement_score(post: dict, platform: str) -> float:
    weights = ENGAGEMENT_WEIGHTS.get(platform, {})
    score = sum(post.get(metric, 0) * weight for metric, weight in weights.items())
    views = post.get("views") or post.get("impressions") or post.get("reach") or 1
    return round(score / views * 1000, 4)  # per-1000-views normalized
```

---

## Full Implementation

```python
# contact_post_enricher.py
"""
ContactPostEnricher
Pulls top 3 posts per CRM contact before DM generation.
Stores in crm_contact_posts and updates crm_market_research.
"""

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional

import httpx

log = logging.getLogger(__name__)

PROFILE_POST_ENDPOINTS = {
    "instagram": "http://localhost:3005/api/profile/{handle}/posts",
    "twitter":   "http://localhost:3007/api/search?author={handle}&limit=20",
    "tiktok":    "http://localhost:3006/api/profile/{handle}/videos",
    "linkedin":  None,  # uses market research fallback
}

ENGAGEMENT_WEIGHTS = {
    "twitter":   {"likes": 1, "retweets": 2, "bookmarks": 2, "quotes": 3, "replies": 1},
    "instagram": {"likes": 1, "comments": 2, "shares": 3, "saves": 3},
    "tiktok":    {"likes": 1, "comments": 2, "shares": 3, "saves": 2},
    "linkedin":  {"likes": 1, "comments": 2, "shares": 3, "clicks": 2},
    "threads":   {"likes": 1, "reposts": 2, "quotes": 3, "replies": 1},
}


def _compute_engagement_score(post: dict, platform: str) -> float:
    weights = ENGAGEMENT_WEIGHTS.get(platform, {"likes": 1})
    score = sum(post.get(metric, 0) * weight for metric, weight in weights.items())
    views = post.get("views") or post.get("impressions") or post.get("reach") or 1
    return round(score / views * 1000, 4)


def _get_handle(contact: dict, platform: str) -> Optional[str]:
    mapping = {
        "instagram": "instagram_handle",
        "twitter":   "twitter_handle",
        "tiktok":    "tiktok_handle",
        "linkedin":  "display_name",
    }
    col = mapping.get(platform)
    return contact.get(col) if col else None


@dataclass
class EnrichResult:
    contact_id: str
    platform: str
    posts_found: int
    posts_stored: int
    top_post_text: str = ""
    error: Optional[str] = None


class ContactPostEnricher:

    def __init__(self, data_plane):
        self.dp = data_plane
        self._http = httpx.AsyncClient(timeout=45)

    async def _fetch_posts_from_profile(
        self, platform: str, handle: str
    ) -> list[dict]:
        """Pull raw post list from platform profile endpoint."""
        endpoint = PROFILE_POST_ENDPOINTS.get(platform)
        if not endpoint:
            return await self._fetch_posts_market_research(platform, handle)

        url = endpoint.format(handle=handle)
        try:
            resp = await self._http.get(url)
            resp.raise_for_status()
            data = resp.json()
            return data if isinstance(data, list) else data.get("posts", data.get("videos", data.get("data", [])))
        except Exception as e:
            log.warning(f"[PostEnrich] Profile endpoint failed ({platform}/{handle}): {e}")
            return await self._fetch_posts_market_research(platform, handle)

    async def _fetch_posts_market_research(
        self, platform: str, handle: str
    ) -> list[dict]:
        """Fallback: use Market Research API keyword search filtered to author."""
        url = f"http://localhost:3106/api/research/{platform}/search"
        try:
            resp = await self._http.post(url, json={"keyword": handle, "maxResults": 20})
            resp.raise_for_status()
            data = resp.json()
            posts = data.get("posts", [])
            # Filter to only posts authored by this handle
            return [
                p for p in posts
                if handle.lower() in (
                    p.get("author", "")
                    or p.get("handle", "")
                    or p.get("username", "")
                ).lower()
            ]
        except Exception as e:
            log.warning(f"[PostEnrich] Market research fallback failed ({platform}/{handle}): {e}")
            return []

    def _normalize_post(self, raw: dict, platform: str) -> dict:
        """Normalize platform-specific post shape into common schema."""
        return {
            "post_url":      raw.get("url") or raw.get("post_url") or raw.get("link") or "",
            "post_text":     raw.get("text") or raw.get("caption") or raw.get("description") or "",
            "post_type":     raw.get("type") or ("video" if platform in ("tiktok",) else "post"),
            "likes":         int(raw.get("likes") or raw.get("likeCount") or 0),
            "comments":      int(raw.get("comments") or raw.get("commentCount") or 0),
            "shares":        int(raw.get("shares") or raw.get("shareCount") or raw.get("retweets") or 0),
            "saves":         int(raw.get("saves") or raw.get("saveCount") or raw.get("bookmarks") or 0),
            "views":         int(raw.get("views") or raw.get("viewCount") or raw.get("impressions") or 0),
            "posted_at":     raw.get("posted_at") or raw.get("created_at") or raw.get("timestamp"),
            "engagement_score": _compute_engagement_score(raw, platform),
        }

    async def _store_posts(
        self, contact_id: str, platform: str, posts: list[dict]
    ) -> int:
        """Upsert posts to crm_contact_posts. Returns count stored."""
        stored = 0
        for post in posts:
            if not post.get("post_url") and not post.get("post_text"):
                continue
            try:
                await self.dp.supabase_upsert("crm_contact_posts", {
                    "contact_id":       contact_id,
                    "platform":         platform,
                    "post_url":         post["post_url"],
                    "post_text":        post["post_text"],
                    "post_type":        post["post_type"],
                    "likes":            post["likes"],
                    "comments":         post["comments"],
                    "shares":           post["shares"],
                    "saves":            post["saves"],
                    "views":            post["views"],
                    "engagement_score": str(post["engagement_score"]),
                    "posted_at":        post["posted_at"],
                    "enriched_at":      datetime.now(timezone.utc).isoformat(),
                }, conflict_columns=["contact_id", "post_url"])
                stored += 1
            except Exception as e:
                log.warning(f"[PostEnrich] Failed to store post: {e}")
        return stored

    async def _update_market_research(
        self, contact_id: str, platform: str, top_posts: list[dict]
    ) -> None:
        """Write top post into crm_market_research so ContextBuilder can read it."""
        if not top_posts:
            return
        best = top_posts[0]
        existing = await self.dp.supabase_select(
            "crm_market_research",
            filters={"contact_id": contact_id, "platform": platform},
            limit=1,
        )
        record = {
            "contact_id":      contact_id,
            "platform":        platform,
            "top_post_text":   best["post_text"][:1000],
            "top_post_url":    best["post_url"],
            "top_post_likes":  best["likes"],
            "updated_at":      datetime.now(timezone.utc).isoformat(),
        }
        if existing:
            await self.dp.supabase_update("crm_market_research", existing[0]["id"], record)
        else:
            await self.dp.supabase_insert("crm_market_research", record)

    async def enrich_contact(self, contact: dict) -> EnrichResult:
        """Enrich a single contact with their top posts."""
        contact_id = contact["id"]
        platform = contact.get("primary_platform") or contact.get("platform", "instagram")
        handle = _get_handle(contact, platform)

        if not handle:
            return EnrichResult(contact_id, platform, 0, 0,
                                error="no handle found for platform")

        raw_posts = await self._fetch_posts_from_profile(platform, handle)
        if not raw_posts:
            return EnrichResult(contact_id, platform, 0, 0,
                                error="no posts returned from platform")

        normalized = [self._normalize_post(r, platform) for r in raw_posts]
        sorted_posts = sorted(normalized, key=lambda p: p["engagement_score"], reverse=True)
        top3 = sorted_posts[:3]

        stored = await self._store_posts(contact_id, platform, top3)
        await self._update_market_research(contact_id, platform, top3)

        # Stamp enrichment date on contact
        await self.dp.supabase_update("crm_contacts", contact_id, {
            "posts_enriched_at": datetime.now(timezone.utc).isoformat(),
        })

        return EnrichResult(
            contact_id=contact_id,
            platform=platform,
            posts_found=len(raw_posts),
            posts_stored=stored,
            top_post_text=top3[0]["post_text"][:200] if top3 else "",
        )

    async def run_batch(
        self,
        pipeline_stages: list = None,
        limit: int = 50,
        force_refresh: bool = False,
    ) -> dict:
        """
        Enrich all contacts that are qualified/warming/ready_for_dm
        and haven't been enriched in the last 14 days.
        """
        stages = pipeline_stages or ["qualified", "warming", "ready_for_dm"]
        
        # Build filter: pipeline_stage IN (...) AND (posts_enriched_at IS NULL OR stale)
        # Supabase select with OR requires raw query — use execute_sql fallback
        rows = await self.dp.supabase_execute_sql("""
            SELECT id, display_name, primary_platform, pipeline_stage,
                   instagram_handle, twitter_handle, tiktok_handle, linkedin_url
            FROM crm_contacts
            WHERE pipeline_stage = ANY(%s)
              AND (
                posts_enriched_at IS NULL
                OR posts_enriched_at < NOW() - INTERVAL '14 days'
              )
            ORDER BY relationship_score DESC NULLS LAST
            LIMIT %s
        """, [stages, limit])

        contacts = rows if isinstance(rows, list) else []
        log.info(f"[PostEnrich] Enriching {len(contacts)} contacts")

        results = {"total": len(contacts), "success": 0, "failed": 0, "errors": []}

        # Semaphore: max 3 concurrent to avoid overwhelming Safari services
        sem = asyncio.Semaphore(3)

        async def enrich_with_sem(contact):
            async with sem:
                r = await self.enrich_contact(contact)
                await asyncio.sleep(2)  # polite delay per contact
                return r

        outcomes = await asyncio.gather(
            *[enrich_with_sem(c) for c in contacts],
            return_exceptions=True,
        )
        for o in outcomes:
            if isinstance(o, Exception):
                results["failed"] += 1
                results["errors"].append(str(o))
            elif o.error:
                results["failed"] += 1
                results["errors"].append(f"{o.contact_id}: {o.error}")
            else:
                results["success"] += 1

        return results

    async def close(self):
        await self._http.aclose()
```

---

## ContactPostEnricherExecutor (add to `workflow_executors.py`)

```python
class ContactPostEnricherExecutor:
    task_type = "contact_post_enrich"

    def __init__(self, data_plane):
        self.dp = data_plane

    async def execute(self, task: dict) -> dict:
        from contact_post_enricher import ContactPostEnricher
        action = task.get("action", "run_batch")
        enricher = ContactPostEnricher(self.dp)
        try:
            if action == "run_batch":
                return await enricher.run_batch(
                    pipeline_stages=task.get("stages"),
                    limit=task.get("limit", 50),
                    force_refresh=task.get("force_refresh", False),
                )
            elif action == "enrich_contact":
                rows = await self.dp.supabase_select(
                    "crm_contacts",
                    filters={"id": task["contact_id"]},
                    limit=1,
                )
                if not rows:
                    return {"error": "Contact not found"}
                result = await enricher.enrich_contact(rows[0])
                return {
                    "contact_id":    result.contact_id,
                    "posts_found":   result.posts_found,
                    "posts_stored":  result.posts_stored,
                    "top_post_text": result.top_post_text,
                    "error":         result.error,
                }
            elif action == "status":
                rows = await self.dp.supabase_execute_sql("""
                    SELECT
                      COUNT(*) FILTER (WHERE posts_enriched_at IS NOT NULL) AS enriched,
                      COUNT(*) FILTER (WHERE posts_enriched_at IS NULL
                                       AND pipeline_stage IN ('qualified','warming','ready_for_dm')) AS needs_enrichment,
                      COUNT(*) AS total
                    FROM crm_contacts
                """, [])
                return rows[0] if rows else {}
            else:
                return {"error": f"Unknown action: {action}"}
        finally:
            await enricher.close()
```

---

## Cron Entry

```python
CronJob(
    name="contact_post_enrichment",
    task_type="contact_post_enrich",
    action="run_batch",
    schedule="0 7 * * *",   # daily 7AM UTC (before outreach cron)
    enabled=True,
    params={"stages": ["qualified", "warming", "ready_for_dm"], "limit": 100},
),
```

---

## Tests Required

```python
test_normalize_post_computes_engagement_score()
test_normalize_post_handles_missing_fields()
test_enrich_contact_stores_top3_sorted_by_engagement()
test_enrich_contact_updates_crm_market_research()
test_enrich_contact_stamps_posts_enriched_at()
test_fetch_posts_falls_back_to_market_research()
test_run_batch_respects_semaphore_limit()
test_run_batch_skips_recently_enriched_contacts()
test_enrich_contact_returns_error_when_no_handle()
```
