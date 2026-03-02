# LinkedIn AI Lead Generation System
**Video**: https://www.youtube.com/watch?v=oq_e9arcdrY  
**Result**: 300+ sales calls, $120K+ revenue from purely inbound LinkedIn leads in 2025  
**Stack**: N8N + Perplexity + Triggery/Unipile + HeyReach  
**Researched**: 2026-03-01

---

## Executive Summary

A complete inbound lead generation system for AI businesses using LinkedIn. 3 posts/week with visuals in under 3 hours, profile optimized as a landing page, and intent-based DM outreach to post engagers only. The flywheel: good content → warm engagers → qualified conversations → booked calls.

---

## System 1: Content Pipeline (3 hours/week)

### 3 Post Types (rotate weekly)
| Type | Day | Format | Goal |
|------|-----|--------|------|
| Educational | Monday | Text + carousel | Saves, shares, expertise positioning |
| Personal | Wednesday | Photo + story | Trust, relatability, follower growth |
| Hook-led | Friday | Text only | Comments, reach, controversy |

### Content Creation Flow
```
Perplexity research (trending AI automation topics)
  → Pick topic with genuine personal POV
  → Write hook (5 variations, pick best)
  → Write post body (structured steps/framework)
  → Write carousel brief (one step per slide)
  → Personal post: AI-placed photo or real behind-the-scenes photo
```

### Hook Formulas That Work
- **Controversial**: "Most AI agencies are making this mistake..."
- **Number-based**: "I booked 300 calls in 2025. Here's the exact system:"
- **Story opener**: "2 years ago I had 0 LinkedIn followers. Last month: 47 inbound calls."
- **Contrarian**: "You don't need a big following to get AI clients. Here's proof:"

**Key insight**: The hook is 80% of the post's performance. Spend 50% of writing time on it. Never start with "I".

### AI Photo Placement Trick
Upload your photo to an AI placement tool → prompt "Generate an image of this person working in [Amsterdam / coffee shop / rooftop office]" → 3 options generated, looks real. Used for the weekly personal post.

### Carousel Rules
- Content = just the steps from the post (don't overthink design)
- Last slide: always a CTA
- Template consistency = brand recognition over time

---

## System 2: Profile Optimization (1-2 hours, one-time)

The profile is a landing page. Every section has one job: convert visitors into booked calls or lead magnet downloads.

### The Core Formula (applied everywhere)
```
[Solution] for [ICP] → [Outcome]
"AI Growth Systems for Marketing Agencies → Scale Faster"
```

### Priority Sections
1. **Headline**: Lead with solution, include ICP and outcome. No buzzwords.
2. **Banner**: Photo + solution statement + CTA arrow
3. **About**: Line 1 (above fold) = ICP + solution + outcome. Rest = story + proof + CTA.
4. **Featured section** (highest CTR on profile — most overlooked):
   - Feature 1: Book a call CTA with branded image
   - Feature 2: Lead magnet (template/tool/checklist)
5. **Experience**: Must have company logo — requires a LinkedIn company page. Without it, looks unestablished.

---

## System 3: Intent-Based DM Outreach

### Why Intent-Based Only
- Cold DM response rate: ~1-3%
- Post engager (warm) response rate: ~15-30%
- LinkedIn strictly limits messaging volume — spend that bandwidth on people already interested

**Timing**: Don't start outreach until month 2-3. First weeks = build posting consistency only.

### Scraping Tools
- **Triggery**: No-code, scrapes post likes + comments → CSV export or Airtable sync
- **Unipile API + N8N**: Programmatic scraping, more control, webhooks
- **HeyReach**: Managed outreach campaigns with built-in rate limiting

### The 3-Message Sequence
```
Message 1 (connection request): Reference specific post they engaged with. ZERO pitch.
  → Goal: just get connected

Message 2 (1-2 days after accept): Open with a genuine question about their situation.
  → Goal: start a real conversation

Message 3 (4-5 days, or natural follow-up): Soft pitch with social proof + Calendly.
  → Goal: book a call
```

**Non-negotiable rule**: Never pitch in a connection request. Never pitch in Message 1 after connecting. Max 3 messages per person — then move on.

### ICP Filtering (N8N)
Filter engagers by headline keywords before reaching out. Keywords like "agency, founder, CEO, marketing, ecommerce, consultant" → keep. "student, looking for work, open to work" → exclude.

---

## ACTP Integration

ACTP already has LinkedIn automation at port 3105 (`safari-automation/packages/linkedin-automation`). The outreach DM sequences map directly to the `send_dm` task type with `platform: "linkedin"`.

### Content generation maps to:
- `content_generate` task with `platform: "linkedin"`, `post_type` field
- Perplexity research can use the existing market research pipeline

### New workflow suggestion: `linkedin-weekly-content`
```
Step 1: research (Perplexity → trending topics)
Step 2: generate-posts (ContentLite → 3 posts)
Step 3: review (ContentLite /api/review)
Step 4: schedule (PublishLite)
Step 5: scrape-engagers (local_task: unipile scrape, run 24h after each post)
Step 6: filter-icps (local_task: N8N filter)
Step 7: outreach (local_task: linkedin_dm via safari-automation port 3105)
```

---

## Key Quotes

> "The hook is the most important part. It drives 80% of engagement. Spend most of your writing time there."

> "LinkedIn is your landing page. A potential lead is only going to book in if your profile clearly conveys who you help and what you do."

> "The featured section gets one of the highest click-through rates on a LinkedIn profile — and most people skip it entirely."

> "In the first connection request you never want to pitch. The only goal is to make the connection."

> "First, focus on being consistent on LinkedIn. Once you have engagement, then start the DM outreach."

---

## Files Created

- `skills/linkedin-leads/SKILL.md`
- `skills/linkedin-leads/justfile`
- `skills/linkedin-leads/sub-agents/post-writer.md`
- `skills/linkedin-leads/sub-agents/profile-optimizer.md`
- `skills/linkedin-leads/sub-agents/dm-outreach.md`
- `docs/research/linkedin-leads/01-linkedin-ai-lead-gen-oq_e9arcdrY.md`
- Updated `AGENTS.md` — linkedin-leads skill registered
