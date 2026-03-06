# PRD: Dedicated Data Collection Agents
**Status**: Planned  
**Priority**: High  
**Owner**: ACTP Worker  
**Supabase**: ivhfuhxorppptyuofbgq

---

## Gap Analysis by Revenue Impact

The current pipeline has 10 AAG agents (Discovery → Scoring → Warmup → Outreach → Follow-up →
Email → Entity Resolution → Orchestrator → Reporting). These gaps are NOT covered by any of them.

| # | Gap | Revenue Link | What's Missing | Agent to Build |
|---|-----|-------------|----------------|----------------|
| **G-01** | Contact post history per profile | Directly blocks DM quality → reply rate → $1,500/mo | Market Research API returns niche-wide posts, NOT per-profile history. `crm_market_research` only has 1 post from initial discovery scrape. ContextBuilder (AAG-051) needs top 3. | **ContactPostEnricher** |
| **G-02** | DM reply detection | Sent DMs never advance pipeline → stalled contacts → missed revenue | DmOutreachExecutor has `conversations` action but nothing polls for NEW inbound replies and writes to CRM. Contacts stay at `pipeline_stage=contacted` forever. | **InboxReplyHarvester** |
| **G-03** | Company/business intel for B2B ICP | ICP is "$500K-$5M ARR founders" — scoring currently has no company size data | ICP scoring only uses social signals (follower count, ER, niche). No Perplexity query for "what company does this person run, what's the ARR estimate?" | **CompanyIntelligenceAgent** |
| **G-04** | Facebook Ads Library competitor creatives | Meta Ads rule engine optimizes existing ads but needs inputs on what to TEST | No agent extracts competitor ad copy patterns, hooks, CTAs from ads.facebook.com/ads/library/ | **AdsLibraryResearcher** |
| **G-05** | Trending signals (sounds, hashtags) | Content reach multiplier — trending audio = 3-5× TikTok reach | No daily monitor for TikTok trending sounds, Twitter trending hashtags in your 5 niches | **TrendingSignalsMonitor** |
| **G-06** | Follower count refresh | Stale scores → wrong prioritization | Contacts have follower_count from discovery day, never refreshed. Score runs re-trigger on crm_market_research updates, but nothing updates follower_count after initial seed. | **FollowerCountRefresher** |
| **G-07** | YouTube competitor intelligence | Growing to 5K subscribers requires knowing what's working | No tracking of competitor YouTube channels: upload frequency, view counts, format mix, subscriber growth rate | **YouTubeCompetitorTracker** |

---

## G-01 — ContactPostEnricher (CRITICAL)

### Problem
The Market Research API (port 3106) is designed for **keyword/niche sweeps** — it returns posts
matching a topic, not posts FROM a specific user. So when AAG-007 (ContactSeeder) adds a contact
to CRM, it stores `top_post_text` and `top_post_url` from the search result that found them —
just 1 post, from the moment of discovery.

When AAG-051 (ContextBuilder) tries to build a DM brief, it reads `crm_market_research` for
"top 2 posts" — but that table only has 1 post, often weeks old, and often a generic niche post
not from this specific profile.

**Result**: Claude writes a DM that says "I saw your post about AI automation" referencing a
generic trend post rather than something they personally said. Generic DMs = low reply rates.

### Solution: ContactPostEnricher

**Trigger**: Contact reaches `pipeline_stage = 'qualified'` AND
(`posts_enriched_at IS NULL` OR `posts_enriched_at < NOW() - INTERVAL '14 days'`)

**Approach per platform:**

| Platform | How to pull profile posts | Data endpoint |
|----------|--------------------------|---------------|
| Instagram | Safari automation → profile scrape | Port 3005: GET /api/profile/{handle}/posts |
| Twitter | Twitter research service | Port 3007: GET /api/search?author={handle}&limit=20 |
| TikTok | TikTok research service | Port 3006: GET /api/profile/{handle}/videos |
| LinkedIn | LinkedIn automation | Port 3105: GET /api/linkedin/profile/{name}/posts |

**Data stored** (new table `crm_contact_posts`):
```sql
contact_id, platform, post_url, post_text, post_type,
likes, comments, shares, saves, views, posted_at,
engagement_score (computed), enriched_at
```

**Output**: `crm_market_research` updated with top 3 posts per contact, sorted by engagement.
`contacts.posts_enriched_at` stamped.

**Cost model**: Only runs for contacts at `qualified` stage+ (not all 520, only those ready for
warmup/DM). Estimate: 50 contacts/week × 1 API call each = trivial cost.

---

## G-02 — InboxReplyHarvester (CRITICAL)

### Problem
The system sends DMs via Safari automation. When a prospect replies, nothing happens — no CRM
update, no notification, no pipeline advancement. The reply sits unread in the platform inbox
until someone manually checks it. This is the most expensive gap: **replied leads going cold.**

Currently:
- `crm_dm_sync_log` exists but only tracks outbound sends
- `crm_messages` has inbound messages but nothing writes them after a reply arrives
- `crm_conversations` tracks threads but isn't polled for new inbound messages

### Solution: InboxReplyHarvester

**Run every 60 minutes** across all 4 platforms.

**Per platform flow:**
```
1. GET conversations from DM service (returns list of conversation threads)
2. For each conversation: check if contact_id in crm_contacts (by handle match)
3. GET messages for that conversation
4. Find messages where is_outbound=false AND created_at > last_harvested_at
5. For each new inbound message:
   a. INSERT crm_messages (contact_id, platform, message_text, is_outbound=false, received_at)
   b. UPDATE crm_contacts.pipeline_stage = 'replied' (if was 'contacted')
   c. INSERT acq_funnel_events (contact_id, from_stage='contacted', to_stage='replied', trigger='reply_detected')
   d. UPDATE last_harvested_at = NOW()
6. Send notification if high-score contact replied
```

**Tables updated**:
- `crm_messages` — new inbound message row
- `crm_contacts` — pipeline_stage advancement
- `acq_funnel_events` — funnel tracking
- `crm_dm_sync_log` — harvest timestamp

**Platforms**: Instagram (3001), Twitter (3003), TikTok (3102), LinkedIn (3105)

---

## G-03 — CompanyIntelligenceAgent (HIGH)

### Problem
ICP scoring (AAG-021) uses social metrics: follower count, engagement rate, niche label, bio text.
But the ICP is explicitly "**founders of $500K–$5M ARR software businesses**." You cannot infer
company revenue from someone's TikTok follower count.

A contact with 800 followers who is the founder of a $2M ARR SaaS should score 95.
A contact with 50K followers who posts about AI but works a day job should score 40.
Currently both get similar scores.

### Solution: CompanyIntelligenceAgent

**Trigger**: Contact has `linkedin_url` AND `company_intel_enriched_at IS NULL`
(Only runs for LinkedIn contacts since that's where company info is meaningful)

**Perplexity query templates** (from AAG-154 pattern):
```
"What company does {display_name} found or run? What industry? Estimated ARR or revenue?"
"Is {display_name} ({linkedin_url}) a founder/CEO? What is their company's size and market?"
```

**Data extracted** (new table `crm_company_intel`):
```sql
contact_id, company_name, company_domain, estimated_arr_usd,
employee_count, industry, tech_stack[], funding_stage,
is_founder bool, is_executive bool, confidence_score,
perplexity_raw_response, enriched_at
```

**Score modifier** added to ICP scoring:
- `is_founder=true` AND `estimated_arr_usd` in $500K–$5M range: +20 pts
- `is_founder=true`, `estimated_arr_usd` unknown: +10 pts
- `is_executive=true`: +8 pts
- `employee_count` 10–100: +5 pts (right-sized company)
- `estimated_arr_usd > $5M`: score cap at 70 (too big, won't buy $2,500 service)

---

## G-04 — AdsLibraryResearcher

### Problem
The Meta Ads rule engine (PRD-META-ADS-RULE-ENGINE.md) pauses losers and scales winners —
but needs a pipeline of new creatives to TEST. Without competitive creative research, you're
guessing at ad copy rather than learning from what's already working in the market.

Facebook Ads Library (ads.facebook.com/ads/library/) is publicly accessible and shows all
active ads for any advertiser or keyword, including how long each ad has been running.
Long-running ads = proven winners.

### Solution: AdsLibraryResearcher

**Run weekly** (Sunday 2AM) per target niche.

**Search queries**: "AI automation", "marketing automation", "social media growth", "AI tools",
"solopreneur", matching the 5 content niches.

**Data collected** (new table `actp_meta_competitor_ads`):
```sql
advertiser_name, advertiser_id, ad_id, ad_text, headline, cta,
media_type (image/video), platforms_running[], start_date,
estimated_days_running (longevity = proof of profitability),
hook_type (question/stat/story/pain_point/social_proof),
niche_label, scraped_at
```

**Analysis output** (new table `actp_meta_creative_patterns`):
- Top 5 hooks by longevity (long-running = profitable)
- CTA distribution across winners
- Media type distribution

**Feeds into**: Meta Ads creative brief generation for new ad testing

---

## G-05 — TrendingSignalsMonitor

### Problem
Content generation uses niche playbooks + feedback loop strategy but doesn't react to
what's trending TODAY. TikTok videos using trending sounds get 3–5× organic reach.
Twitter posts referencing trending topics get outsized impressions.

No daily signal collection exists.

### Solution: TrendingSignalsMonitor

**Run daily 6AM** (before content generation cron at 8AM).

**Per platform:**

| Platform | Signal | How to collect | Endpoint |
|----------|--------|---------------|----------|
| TikTok | Trending sounds in niche | Safari TikTok research | Port 3006: scrape discover/trending |
| Twitter | Trending hashtags in niches | Safari Twitter research | Port 3007: trending topics API |
| Instagram | Trending audio for reels | Safari IG research | Port 3005: scrape reels explore |
| YouTube | Trending search terms | YouTube Trends RSS | No Safari needed |

**Data stored** (new table `actp_trending_signals`):
```sql
platform, signal_type (sound/hashtag/topic/search_term),
signal_value, signal_url, relevance_niche,
estimated_post_count, trending_velocity (rising/peak/declining),
collected_at
```

**Feeds into**: Content generation prompt injection
```
"Current trending on TikTok in creator_economy: 'original sound by @xyz' (2.3M uses)"
"Current trending on Twitter in ai_automation: #VibeCode (140K posts today)"
```

---

## G-06 — FollowerCountRefresher

### Problem
ICP scores depend heavily on follower count (micro-influencer 1K–100K scores higher for
creator offer; under 1K scores lower for B2B). Follower counts go stale after discovery.

520 contacts were discovered at various times. Many may have grown significantly.

### Solution: FollowerCountRefresher

**Run weekly Saturday 4AM**.

**Logic**: For each `crm_contacts` WHERE `follower_count_updated_at < NOW() - 30 days`
AND `pipeline_stage NOT IN ('archived', 'closed_lost')`:

- Call Market Research API per-profile or Safari scrape profile page
- If new `follower_count != old_follower_count`: UPDATE + flag for re-scoring
- If `follower_count` grew >50% since last check: bump priority in pipeline

---

## G-07 — YouTubeCompetitorTracker

### Problem
Target: 5K YouTube subscribers (currently 2,810). Need to know what content formats are growing
fastest in AI automation / creator economy niches on YouTube to replicate. No tracking exists.

### Solution: YouTubeCompetitorTracker

**Run weekly Monday 3AM**.

**Competitor channels** (seeded in `actp_youtube_competitors` table):
- Top 10 AI automation channels
- Top 10 solopreneur/creator economy channels

**Data collected per channel per week**:
```sql
channel_id, channel_name, subscriber_count, weekly_new_subscribers,
videos_uploaded_this_week, avg_views_this_week, best_video_title,
best_video_views, format_mix (shorts/long_form), upload_day_pattern
```

**Analysis output**: Weekly report on format trends, what's growing fastest, thumbnail patterns

---

## Implementation Priority

Build in this order (by revenue impact × ease):

1. **G-02 InboxReplyHarvester** — fastest to build, uses existing DM service endpoints, directly recovers stalled revenue
2. **G-01 ContactPostEnricher** — improves DM quality, moderate build complexity
3. **G-03 CompanyIntelligenceAgent** — improves B2B scoring accuracy, uses existing Perplexity client from AAG-09
4. **G-05 TrendingSignalsMonitor** — content reach multiplier, feeds existing generation pipeline
5. **G-04 AdsLibraryResearcher** — feeds Meta Ads creative testing pipeline
6. **G-06 FollowerCountRefresher** — maintenance quality improvement
7. **G-07 YouTubeCompetitorTracker** — strategic intelligence, lower urgency

---

## New Supabase Tables Required

- `crm_contact_posts` — per-contact post history (G-01)
- `crm_company_intel` — company/business data per contact (G-03)  
- `actp_meta_competitor_ads` — Facebook Ads Library scrapes (G-04)
- `actp_meta_creative_patterns` — extracted creative patterns (G-04)
- `actp_trending_signals` — daily trending sounds/hashtags/topics (G-05)
- `actp_youtube_competitors` — competitor channel registry (G-07)
- `actp_youtube_channel_snapshots` — weekly channel performance data (G-07)

(G-02 uses existing tables. G-06 updates existing `crm_contacts`.)
