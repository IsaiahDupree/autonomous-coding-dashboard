# PRD-031: Twitter A/B Post Tester (Blotato vs Safari)

**Status:** Ready for ACD  
**Priority:** P1  
**Author:** Isaiah Dupree  
**Created:** 2026-03-01  
**Depends on:** Blotato API (`https://api.blotato.com/v2`), Safari Automation (port 3007), Anthropic Claude API, `actp_ab_tests`, `actp_content_performance`  
**Module:** `ab_post_tester.py`  
**Agent CLAUDE.md:** `actp-worker/.claude/agents/ab-tester/CLAUDE.md`

---

## Overview

We post to Twitter via two methods — Blotato's scheduling API and direct Safari browser automation. This PRD defines an A/B testing system that posts the same concept as two variants (one via each method), tracks real engagement metrics at 1h / 4h / 24h checkback windows, and statistically determines which method drives higher engagement for each content niche.

The end goal is a data-driven answer to: **"Does Blotato's algorithm scheduling or direct Safari posting produce better Twitter engagement, and does the answer vary by niche?"**

---

## Goals

1. Generate 2 Claude-written variants of a tweet concept (same core idea, different hooks/angles)
2. Post variant A via Blotato API, variant B via Safari automation (or vice versa)
3. Check engagement (views, likes, RTs, replies) at 1h, 4h, and 24h post-publish
4. Declare a winner when 24h data is available using a weighted engagement score
5. Write all results to `actp_ab_tests` for trend analysis across niches
6. Surface test results in Telegram: active tests, recent winners, method performance by niche

---

## Test Architecture

```
create_test(niche, topic)
    │
    ├── Claude: generate_variants(topic, niche)
    │     → variant_a (hook style: question)
    │     → variant_b (hook style: statement/data)
    │
    ├── _post_blotato(variant_a)          POST https://api.blotato.com/v2/media
    │     headers: {"blotato-api-key": BLOTATO_API_KEY}
    │     body: {"text": ..., "targets": [{"accountId": 4151}]}
    │     → records blotato_post_id
    │
    ├── _post_safari(variant_b)           POST http://localhost:3007/api/tweet
    │     body: {"text": ..., "niche": ...}
    │     → records safari_tweet_url
    │
    └── Save to actp_ab_tests: {test_id, niche, variant_a_id, variant_b_id, status=running}

run_checkbacks()   ← Every 2h cron
    │
    ├── For each running test (0–24h old):
    │     ├── _fetch_engagement(blotato_post_id) → views, likes, rts, replies at current window
    │     ├── _fetch_engagement(safari_tweet_url)
    │     └── UPDATE actp_ab_tests.metrics_{1h|4h|24h}
    │
    └── If 24h data collected → _declare_winner()

_declare_winner()
    ├── Engagement score: likes*3 + rts*5 + replies*4 + views*0.1
    ├── If |score_a - score_b| > 15%: declare winner
    ├── Else: inconclusive
    └── UPDATE actp_ab_tests.winner + Telegram alert
```

---

## Blotato API Spec

```
URL:     POST https://api.blotato.com/v2/media
Headers: blotato-api-key: {BLOTATO_API_KEY}
Body:    {
           "text": "tweet content here",
           "targets": [
             { "accountId": 4151 }   ← Twitter account @IsaiahDupree7
           ]
         }
Response: { "postId": "...", "status": "scheduled" }
```

**Account IDs:**
- Twitter: `4151` (@IsaiahDupree7)
- TikTok: `710` (@isaiah_dupree)
- Instagram: `807` (@the_isaiah_dupree)
- Threads: `173`

---

## Safari Automation API Spec

```
URL:     POST http://localhost:3007/api/tweet
Headers: Content-Type: application/json
Body:    { "text": "tweet content", "niche": "ai_automation" }
Response: { "success": true, "tweetUrl": "https://twitter.com/..." }
```

---

## Data Model

### `actp_ab_tests`
```sql
-- EXISTING TABLE — columns in use:
id              uuid PRIMARY KEY
niche           text
test_method_a   text  -- 'blotato'
test_method_b   text  -- 'safari'
variant_a_text  text
variant_b_text  text
post_id_a       text  -- Blotato postId
post_url_b      text  -- Safari tweet URL
status          text  -- 'running' | 'complete' | 'inconclusive'
winner          text  -- 'a' | 'b' | 'tie'
metrics_1h      jsonb -- {views_a, likes_a, rts_a, views_b, likes_b, rts_b}
metrics_4h      jsonb
metrics_24h     jsonb
eng_score_a     numeric
eng_score_b     numeric
created_at      timestamptz
completed_at    timestamptz
```

---

## Engagement Score Formula

```
engagement_score = (likes × 3) + (retweets × 5) + (replies × 4) + (views × 0.1)
```

Winner declared when 24h data collected AND `|score_a - score_b| / max(score_a, score_b) > 0.15` (15% margin).

---

## Content Niches for Testing

- `ai_automation` — AI tools, automation workflows, Claude/GPT hacks
- `saas_growth` — SaaS metrics, churn reduction, product-led growth
- `content_creation` — Creator economy, video production, hooks
- `digital_marketing` — Ads, funnels, conversion optimization
- `creator_economy` — Monetization, audience building, sponsorships

---

## CLI Interface

```bash
python3 ab_post_tester.py --create "topic phrase" --niche ai_automation
python3 ab_post_tester.py --status          # Show all running/recent tests
python3 ab_post_tester.py --checkback       # Pull engagement for all active tests
python3 ab_post_tester.py --schedule        # Next optimal post window
python3 ab_post_tester.py --all-schedules   # All platform windows
python3 ab_post_tester.py --results         # Completed tests with winners
```

---

## Cron Schedule

```python
{
    "name": "ab_test_checkback",
    "cron": "0 */2 * * *",   # Every 2h
    "module": "ab_post_tester",
    "function": "run_checkbacks",
}
```

---

## Acceptance Criteria

- [ ] `--create "topic" --niche ai_automation` posts one tweet via Blotato + one via Safari
- [ ] Both posts confirmed with real post IDs/URLs in `actp_ab_tests`
- [ ] Checkback at 1h, 4h, 24h pulls real engagement metrics from Safari Twitter API
- [ ] Winner declared at 24h with engagement score diff > 15%
- [ ] Telegram alert: "🧪 A/B Test Winner: Blotato +34% on ai_automation niche"
- [ ] `actp_agent_tasks` logged with `domain=ab-tester`, result includes test_id
- [ ] `--status` shows active tests with current engagement snapshot
- [ ] Failed post (network/auth error) sets `status=error` and alerts via Telegram

---

## ACD Enhancement Tasks

| ID | Task | Priority |
|----|------|----------|
| ABTS-001 | Add TikTok A/B test support (Blotato vs Safari TikTok) | P2 |
| ABTS-002 | Statistical significance test (chi-square) before declaring winner | P2 |
| ABTS-003 | Feed winners back into `actp_twitter_niche_config` strategy | P1 |
| ABTS-004 | Multi-variant testing (3 variants: question hook / data hook / story hook) | P3 |
| ABTS-005 | Auto-create next test when previous completes (rolling A/B program) | P2 |
| ABTS-006 | Niche-level meta-analysis: does Blotato win for educational, Safari for viral? | P2 |
