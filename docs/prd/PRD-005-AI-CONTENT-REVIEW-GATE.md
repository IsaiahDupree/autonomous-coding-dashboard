# PRD-005: AI Content Review Gate

## Status: Draft
## Author: Isaiah Dupree
## Created: 2026-02-22
## Priority: P1 — Quality control before publishing
## Depends On: PRD-001 (Workflow Engine), PRD-004 (Remotion Content Pipeline)

---

## 1. Problem Statement

The ACTP can generate content at scale, but **there is no quality gate** between content generation and publishing. Without review:

1. **Brand risk** — Low-quality or off-brand content gets published automatically
2. **Platform penalties** — Spammy or policy-violating content triggers account strikes
3. **Wasted budget** — Poor content gets organic reach, wastes the testing slot
4. **No learning signal** — If everything publishes, there's no pre-publish quality signal to improve the generation pipeline

The AI Content Review Gate adds an **automated quality assessment step** between rendering and publishing. It uses AI (Claude/GPT) to evaluate content against configurable rubrics and either approves, requests revision, or rejects content.

---

## 2. Solution Overview

A cloud-based review service that:
- Receives rendered content (video URL + script + metadata) from the Workflow Engine
- Evaluates against multiple rubrics (brand voice, platform compliance, hook quality, etc.)
- Returns a structured score with per-dimension feedback
- Makes an approve/revise/reject decision based on configurable thresholds
- Logs all reviews for training data and rubric improvement
- Supports human override for borderline cases

---

## 3. Architecture

```
Workflow Engine
     │
     │ Step: ai_review
     │
     ▼
┌──────────────────────────────────────┐
│         AI CONTENT REVIEW GATE        │
│                                        │
│  ┌────────────┐  ┌────────────────┐   │
│  │  Rubric     │  │  AI Evaluator  │   │
│  │  Registry   │  │  (Claude API)  │   │
│  └──────┬─────┘  └───────┬────────┘   │
│         │                │             │
│         ▼                ▼             │
│  ┌──────────────────────────────┐     │
│  │       Review Engine          │     │
│  │  - Assemble prompt from rubric│     │
│  │  - Call AI with content      │     │
│  │  - Parse structured response │     │
│  │  - Apply decision thresholds │     │
│  └──────────────┬───────────────┘     │
│                 │                      │
│         ┌───────┼───────┐              │
│         ▼       ▼       ▼              │
│      APPROVE  REVISE  REJECT           │
└──────────────────────────────────────┘
     │         │        │
     ▼         ▼        ▼
  Publish   Re-enter   Archive
  (PRD-006) generation  + log
            pipeline
```

---

## 4. Review Rubrics

### Rubric Definition Schema

```sql
CREATE TABLE actp_review_rubrics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT UNIQUE NOT NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  version         INT DEFAULT 1,
  dimensions      JSONB NOT NULL,        -- array of scoring dimensions
  decision_rules  JSONB NOT NULL,        -- approve/revise/reject thresholds
  platform        TEXT,                  -- null = all platforms
  content_type    TEXT,                  -- null = all types
  enabled         BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now()
);
```

### Default Rubric: `content_quality_v1`

```json
{
  "slug": "content_quality_v1",
  "name": "Content Quality Review v1",
  "dimensions": [
    {
      "id": "hook_strength",
      "name": "Hook Strength",
      "weight": 0.25,
      "description": "Does the first 3 seconds grab attention? Is there a pattern interrupt, curiosity gap, or bold claim?",
      "scoring": "1-10 scale. 1=no hook, 5=decent hook, 10=scroll-stopping"
    },
    {
      "id": "clarity",
      "name": "Message Clarity",
      "weight": 0.20,
      "description": "Is the core message clear within 5 seconds? Can a viewer understand the value proposition?",
      "scoring": "1-10 scale. 1=confusing, 5=understandable, 10=instantly clear"
    },
    {
      "id": "brand_alignment",
      "name": "Brand Alignment",
      "weight": 0.15,
      "description": "Does the tone, visual style, and messaging match the brand guidelines?",
      "scoring": "1-10 scale. 1=off-brand, 5=acceptable, 10=perfect brand fit"
    },
    {
      "id": "platform_fit",
      "name": "Platform Fit",
      "weight": 0.15,
      "description": "Is the format, duration, and style optimized for the target platform (TikTok/IG/YT)?",
      "scoring": "1-10 scale. 1=wrong format, 5=acceptable, 10=native to platform"
    },
    {
      "id": "cta_effectiveness",
      "name": "CTA Effectiveness",
      "weight": 0.10,
      "description": "Is there a clear call-to-action? Does it drive the desired behavior?",
      "scoring": "1-10 scale. 1=no CTA, 5=has CTA, 10=compelling CTA"
    },
    {
      "id": "production_quality",
      "name": "Production Quality",
      "weight": 0.10,
      "description": "Are text overlays readable? Audio clear? Transitions smooth? No visual artifacts?",
      "scoring": "1-10 scale. 1=broken, 5=acceptable, 10=polished"
    },
    {
      "id": "compliance",
      "name": "Policy Compliance",
      "weight": 0.05,
      "description": "Does the content comply with platform policies? No prohibited claims, misleading content, or copyright issues?",
      "scoring": "1-10 scale. 1=violating, 5=borderline, 10=fully compliant"
    }
  ],
  "decision_rules": {
    "approve": {
      "min_weighted_score": 7.0,
      "no_dimension_below": 4,
      "compliance_min": 8
    },
    "revise": {
      "min_weighted_score": 5.0,
      "max_revision_attempts": 2
    },
    "reject": {
      "below_weighted_score": 5.0,
      "or_any_dimension_below": 2,
      "or_compliance_below": 5
    }
  }
}
```

---

## 5. AI Evaluation

### Prompt Construction

```python
def build_review_prompt(content: dict, rubric: dict) -> str:
    """Build the AI review prompt from content + rubric."""
    return f"""You are a content quality reviewer for a marketing automation system.

Review the following content against each scoring dimension. Be critical but fair.

## Content to Review

**Platform**: {content['platform']}
**Content Type**: {content['content_type']}
**Duration**: {content['duration_seconds']}s

**Script/Caption**:
{content['script_text']}

**Hook (first 3 seconds)**:
{content['hook_text']}

**Call to Action**:
{content['cta_text']}

**Text Overlays**:
{json.dumps(content.get('text_overlays', []), indent=2)}

**Template Used**: {content['template_name']}
**Target Audience**: {content.get('target_audience', 'general')}

## Scoring Dimensions

{_format_dimensions(rubric['dimensions'])}

## Instructions

For each dimension, provide:
1. A score from 1-10
2. A brief explanation (1-2 sentences)
3. A specific improvement suggestion if score < 8

Also provide:
- An overall assessment (2-3 sentences)
- A decision: APPROVE, REVISE, or REJECT

Respond in this exact JSON format:
{{
  "dimensions": {{
    "hook_strength": {{ "score": 8, "explanation": "...", "suggestion": "..." }},
    "clarity": {{ "score": 7, "explanation": "...", "suggestion": "..." }},
    ...
  }},
  "overall_assessment": "...",
  "decision": "APPROVE",
  "revision_notes": null
}}"""
```

### AI API Call

```python
async def evaluate_content(self, content: dict, rubric: dict) -> dict:
    """Call AI API to evaluate content against rubric."""

    prompt = self.build_review_prompt(content, rubric)

    # Use Claude Haiku for cost efficiency (reviews are high-volume)
    response = await self.anthropic.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}],
        system="You are an expert content reviewer. Always respond with valid JSON."
    )

    # Parse structured response
    review = json.loads(response.content[0].text)

    # Calculate weighted score
    weighted_score = sum(
        review["dimensions"][dim["id"]]["score"] * dim["weight"]
        for dim in rubric["dimensions"]
        if dim["id"] in review["dimensions"]
    )

    review["weighted_score"] = round(weighted_score, 2)

    # Apply decision rules (override AI decision with rules if needed)
    review["final_decision"] = self._apply_decision_rules(
        review, rubric["decision_rules"]
    )

    return review
```

### Video Frame Analysis (Optional Enhancement)

For video content, optionally extract key frames and include them in the review:

```python
async def extract_review_frames(self, video_url: str) -> list[str]:
    """Extract key frames from video for visual review."""
    # Download video
    local_path = await self._download(video_url)

    # Extract frames at 0s, 3s (post-hook), midpoint, last 2s
    frames = []
    for timestamp in [0, 3, "mid", -2]:
        frame_path = await self._extract_frame(local_path, timestamp)
        # Upload to temp storage
        frame_url = await self._upload_temp(frame_path)
        frames.append(frame_url)

    return frames
```

When frames are available, include them in the prompt as image content blocks (Claude vision).

---

## 6. Data Model

### `actp_content_reviews`
```sql
CREATE TABLE actp_content_reviews (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creative_id       UUID REFERENCES actp_creatives(id),
  execution_id      UUID REFERENCES actp_workflow_executions(id),
  rubric_id         UUID REFERENCES actp_review_rubrics(id),
  rubric_slug       TEXT NOT NULL,

  -- AI evaluation results
  dimension_scores  JSONB NOT NULL,       -- { "hook_strength": { score, explanation, suggestion } }
  weighted_score    FLOAT NOT NULL,
  overall_assessment TEXT,

  -- Decision
  ai_decision       TEXT NOT NULL,        -- APPROVE | REVISE | REJECT
  final_decision     TEXT NOT NULL,       -- Same as ai_decision unless overridden
  override_by       TEXT,                 -- user who overridden, if any
  override_reason   TEXT,

  -- Revision tracking
  revision_number   INT DEFAULT 0,
  revision_notes    TEXT,
  previous_review_id UUID,               -- links to previous review if this is a re-review

  -- Metadata
  ai_model          TEXT NOT NULL,
  prompt_tokens     INT,
  completion_tokens INT,
  latency_ms        INT,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_content_reviews_creative ON actp_content_reviews(creative_id);
CREATE INDEX idx_content_reviews_decision ON actp_content_reviews(final_decision);
```

---

## 7. API Endpoints

### Review Service (runs in ContentLite or as new service)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/review` | Submit content for review |
| GET | `/api/review/:id` | Get review result |
| POST | `/api/review/:id/override` | Human override of decision |
| GET | `/api/review/rubrics` | List rubrics |
| POST | `/api/review/rubrics` | Create/update rubric |
| GET | `/api/review/stats` | Review decision statistics |

### Review Request

```json
POST /api/review
{
  "creative_id": "uuid",
  "execution_id": "uuid",
  "rubric_slug": "content_quality_v1",
  "content": {
    "platform": "tiktok",
    "content_type": "video",
    "script_text": "Stop scrolling if you use AI...",
    "hook_text": "Stop scrolling if you use AI",
    "cta_text": "Link in bio",
    "duration_seconds": 25,
    "video_url": "https://storage.supabase.co/...",
    "template_name": "HookTextVideo",
    "text_overlays": [...]
  }
}
```

### Review Response

```json
{
  "review_id": "uuid",
  "weighted_score": 7.85,
  "final_decision": "APPROVE",
  "dimensions": {
    "hook_strength": { "score": 9, "explanation": "Strong pattern interrupt with direct address", "suggestion": null },
    "clarity": { "score": 8, "explanation": "Message is clear within first 5 seconds", "suggestion": null },
    "brand_alignment": { "score": 7, "explanation": "Tone is on-brand but visual style could be more consistent", "suggestion": "Add brand gradient overlay" },
    "platform_fit": { "score": 8, "explanation": "Good vertical format, appropriate duration for TikTok", "suggestion": null },
    "cta_effectiveness": { "score": 7, "explanation": "CTA present but generic", "suggestion": "Make CTA more specific: 'Comment AI for the free link'" },
    "production_quality": { "score": 8, "explanation": "Clean overlays, readable text", "suggestion": null },
    "compliance": { "score": 9, "explanation": "No policy issues detected", "suggestion": null }
  },
  "overall_assessment": "Strong hook-driven content with clear messaging. Minor improvements possible on CTA specificity and brand visual consistency. Approved for publishing.",
  "revision_notes": null
}
```

---

## 8. Decision Flow

```
Content arrives for review
     │
     ▼
  Evaluate with AI
     │
     ├── weighted_score >= 7.0 AND no dim < 4 AND compliance >= 8
     │   └── ✅ APPROVE → advance to publishing (PRD-006)
     │
     ├── weighted_score >= 5.0 AND revision_number < max_revisions
     │   └── 🔄 REVISE → feed revision_notes back to ContentLite
     │         → re-generate → re-render → re-review
     │
     ├── weighted_score < 5.0 OR any dim < 2 OR compliance < 5
     │   └── ❌ REJECT → archive creative, log reason
     │
     └── Edge case: AI response unparseable
         └── ⚠️ MANUAL_REVIEW → flag for human, hold in queue
```

### Revision Loop

When a review returns REVISE:
1. The Workflow Engine receives `revision_notes` from the AI
2. A new workflow step sends the original blueprint + revision notes to ContentLite
3. ContentLite regenerates the script incorporating feedback
4. The Remotion pipeline re-renders
5. The content goes through review again (with `revision_number` incremented)
6. Max 2 revision attempts; after that, REJECT

---

## 9. Cost Management

| Model | Cost/Review | Use Case |
|-------|-------------|----------|
| Claude Haiku 4.5 | ~$0.002 | Default for all reviews |
| Claude Sonnet 4.5 | ~$0.015 | Borderline cases (score 6-7) |
| Claude Opus 4.6 | ~$0.08 | Manual escalation only |

**Estimated volume**: 50 reviews/day × $0.002 = **$0.10/day** on Haiku.

For video frame analysis (vision), add ~$0.01/review for 4 frames.

---

## 10. Learning & Improvement

### Feedback Loop

After content is published and metrics are collected:
1. MetricsLite scores the organic performance
2. Compare AI review score vs actual performance
3. If AI approved content that performed poorly → signal rubric may be too lenient
4. If AI rejected content similar to high performers → signal rubric may be too strict
5. Quarterly rubric tuning based on correlation analysis

### Review Data as Training Signal

```sql
-- Find where AI review score diverges from actual performance
SELECT
  r.weighted_score AS ai_score,
  m.engagement_rate AS actual_performance,
  r.dimension_scores,
  r.final_decision
FROM actp_content_reviews r
JOIN actp_creatives c ON c.id = r.creative_id
JOIN actp_organic_posts p ON p.creative_id = c.id
JOIN actp_performance_logs m ON m.post_id = p.id
WHERE m.collected_at > p.published_at + interval '48 hours'
ORDER BY ABS(r.weighted_score/10 - m.engagement_rate) DESC
LIMIT 20;
```

---

## 11. Success Metrics

| Metric | Target |
|--------|--------|
| Review latency | < 5 seconds per review |
| Approval rate | 60-80% (too high = rubric too lenient) |
| Reject rate | 5-15% (too high = generation quality issue) |
| Revision success rate | > 70% of revisions eventually approve |
| AI score ↔ performance correlation | > 0.5 Pearson |
| Cost per review | < $0.005 |
| False approval rate (approved but performed poorly) | < 15% |

---

## 12. Implementation Plan

| Phase | Scope | Estimate |
|-------|-------|----------|
| Phase 1 | `actp_review_rubrics` + `actp_content_reviews` tables | 0.5 day |
| Phase 2 | Default rubric (`content_quality_v1`) | 0.5 day |
| Phase 3 | AI evaluation engine (prompt construction + Claude API call) | 2 days |
| Phase 4 | Decision rule engine (approve/revise/reject logic) | 1 day |
| Phase 5 | Review API endpoints | 1 day |
| Phase 6 | Workflow Engine integration (ai_review executor type) | 1 day |
| Phase 7 | Revision loop (feed back to ContentLite + re-review) | 1 day |
| Phase 8 | Video frame extraction + vision review (optional) | 2 days |
| Phase 9 | ACTPDash review dashboard UI | 1 day |
