# PRD-028: Cross-Platform Entity Resolution

**Status:** Ready for ACD  
**Priority:** P1  
**Depends on:** PRD-022 (Discovery), Perplexity API, Claude API, `crm_contacts`

---

## Overview

When a prospect is discovered on one platform (e.g., Twitter), this agent automatically finds and links all their other social profiles (Instagram, TikTok, LinkedIn, website, email). It uses a multi-signal approach: Perplexity web search, username fuzzy matching, bio link cross-reference, and Claude disambiguation. The result is a fully unified contact record with handles on every platform — enabling the outreach agent to pick the best channel and the warmup agent to engage on multiple surfaces.

---

## Goals

1. Given one known platform handle, discover all other handles for the same person
2. Achieve ≥90% accuracy on entity association (Claude confirmation required before linking)
3. Resolve email, personal website, and LinkedIn URL as part of every entity profile
4. Detect and flag false positives (common names, anonymous accounts)
5. Store association graph in `acq_entity_associations` for audit trail
6. Update `crm_contacts` with all verified cross-platform handles

---

## Architecture

```
EntityResolutionAgent
    ├── SignalCollector
    │     ├── PerplexitySearcher    → "find all social media for {name}" web search
    │     ├── UsernameMatchEngine   → fuzzy match known handle against other platforms
    │     ├── BioLinkExtractor      → scrape bio URLs from known profile
    │     └── BacklinkAnalyzer      → search "{website}" to find associated profiles
    │
    ├── CandidateRanker
    │     ├── NameSimilarityScorer  → Levenshtein + phonetic matching
    │     ├── BioSimilarityScorer   → compare bio text across platforms
    │     ├── ProfilePicHasher      → perceptual hash comparison (if accessible)
    │     └── LinkOverlapScorer     → same URLs mentioned in multiple bios
    │
    ├── AIDisambiguator             → Claude confirms/rejects candidate associations
    │     └── Prompt: given these profiles, are they the same person? (0-100 confidence)
    │
    ├── AssociationWriter           → INSERT acq_entity_associations (confirmed only)
    └── ContactEnricher             → UPDATE crm_contacts with all found handles
```

---

## Research Tools

### Perplexity API (Primary Research Tool)
```python
async def perplexity_search(query: str) -> str:
    """Search the web with Perplexity sonar model (real-time web access)."""
    async with httpx.AsyncClient() as client:
        r = await client.post(
            "https://api.perplexity.ai/chat/completions",
            headers={"Authorization": f"Bearer {PERPLEXITY_API_KEY}"},
            json={
                "model": "llama-3.1-sonar-large-128k-online",
                "messages": [
                    {
                        "role": "system",
                        "content": "You are a research assistant. Find social media profiles for the person described. Return structured data: name, twitter, instagram, tiktok, linkedin, website, email. Be precise and only include confirmed findings."
                    },
                    {"role": "user", "content": query}
                ],
                "search_recency_filter": "month"
            },
            timeout=30.0
        )
        return r.json()["choices"][0]["message"]["content"]
```

**Query templates:**
- `"Find all social media profiles for {display_name} who posts about {niche} on {known_platform} as @{handle}"`
- `"What is the LinkedIn, Instagram, and email for {display_name} the {niche} creator?"`
- `"{known_website_url} — find the owner's social media profiles"`

### Safari Research Fallback
If Perplexity API is unavailable, use Safari navigation:
```python
# Navigate to: https://www.perplexity.ai/?q={query}
# Extract text content of the response
```

### Username Pattern Matching
```python
SAME_HANDLE_THRESHOLD = 0.85  # 85% string similarity

def squish(s: str) -> str:
    """Remove spaces, lowercase, remove special chars."""
    return re.sub(r'[^a-z0-9]', '', s.lower())

def handle_similarity(h1: str, h2: str) -> float:
    """Levenshtein ratio between squished handles."""
    return SequenceMatcher(None, squish(h1), squish(h2)).ratio()
```

### BioLinkExtractor
```python
# For each known platform profile:
# 1. Scrape bio text and bio link via Market Research API or direct Safari
# 2. Parse URLs from bio (personal site, linktree, beacons, etc.)
# 3. Follow linktree/beacons to extract all linked platforms
# 4. Return set of discovered URLs + platform handles
```

---

## Claude Disambiguation Prompt

```
You are an identity verification system. Determine if these social media profiles belong to the SAME person.

Known profile:
- Platform: {known_platform}
- Handle: @{known_handle}  
- Display name: {known_display_name}
- Bio: {known_bio}
- Follower count: {known_followers}
- Top post topic: {known_post_topic}

Candidate profile:
- Platform: {candidate_platform}
- Handle: @{candidate_handle}
- Display name: {candidate_display_name}
- Bio: {candidate_bio}
- Follower count: {candidate_followers}

Evidence:
- Name similarity score: {name_sim}
- Bio link overlap: {link_overlap}
- Perplexity search result: "{perplexity_excerpt}"

Respond with JSON:
{
  "same_person": true/false,
  "confidence": 0-100,
  "reasoning": "one sentence",
  "warning": "if ambiguous, note why"
}

Only confirm same_person=true if confidence >= 80.
```

---

## Data Model

### `acq_entity_associations`
```sql
CREATE TABLE acq_entity_associations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id          uuid REFERENCES crm_contacts(id),
  known_platform      text NOT NULL,
  known_handle        text NOT NULL,
  found_platform      text NOT NULL,
  found_handle        text,
  found_url           text,
  association_type    text NOT NULL,   -- 'social_handle','email','website','linkedin'
  confidence          integer NOT NULL, -- 0-100
  confirmed           boolean DEFAULT false,
  evidence_sources    text[] DEFAULT '{}',  -- ['perplexity','username_match','bio_link']
  claude_reasoning    text,
  resolved_at         timestamptz DEFAULT now(),
  created_at          timestamptz DEFAULT now()
);
```

### `acq_resolution_runs`
```sql
CREATE TABLE acq_resolution_runs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id      uuid REFERENCES crm_contacts(id),
  associations_found    integer DEFAULT 0,
  associations_confirmed integer DEFAULT 0,
  platforms_resolved    text[] DEFAULT '{}',
  email_found     boolean DEFAULT false,
  linkedin_found  boolean DEFAULT false,
  duration_ms     integer,
  run_at          timestamptz DEFAULT now()
);
```

### Changes to `crm_contacts`
```sql
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS twitter_handle   text;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS instagram_handle text;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS tiktok_handle    text;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS linkedin_url     text;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS website_url      text;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS entity_resolved  boolean DEFAULT false;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS resolution_score integer; -- 0-100 completeness
```

---

## Resolution Score

After resolution, score each contact 0-100 for completeness:
```python
def resolution_score(contact: Contact) -> int:
    score = 0
    if contact.email:             score += 30
    if contact.linkedin_url:      score += 25
    if contact.twitter_handle:    score += 15
    if contact.instagram_handle:  score += 15
    if contact.tiktok_handle:     score += 10
    if contact.website_url:       score += 5
    return score
```

High resolution score (≥70) → use best channel for outreach.  
Low score (<40) → research more before outreach.

---

## API Design

### `POST /api/acquisition/entity/resolve`
Resolve all platforms for a contact.
```json
{ "contact_id": "uuid", "sources": ["perplexity", "username_match", "bio_link"] }
```
Returns: `{ associations_found, confirmed, resolution_score, platforms: {} }`

### `POST /api/acquisition/entity/resolve-batch`
Resolve a batch of contacts.
```json
{ "contact_ids": ["uuid"], "limit": 20 }
```

### `GET /api/acquisition/entity/associations`
List all associations for a contact with confidence scores and evidence.

### `POST /api/acquisition/entity/confirm`
Manually confirm or reject a candidate association.
```json
{ "association_id": "uuid", "confirmed": true }
```

### `GET /api/acquisition/entity/status`
Resolution pipeline status: unresolved contacts, avg resolution score, email discovery rate.

---

## Features

See `feature_list_acquisition_email_entity.json` → category `entity` (AAG-161 to AAG-200)

---

## Implementation Notes

- **Perplexity API key:** `PERPLEXITY_API_KEY` env var. Rate limit: 50 req/min on standard plan
- **Confidence threshold:** Only link associations with Claude confidence >= 80. Store 60-79 as `confirmed=false` for human review
- **False positive protection:** never auto-link common names (check: is handle_similarity < 0.5 AND no bio link overlap? → skip)
- **Linktree/Beacons parsing:** GET https://linktr.ee/{handle}, parse all linked URLs from HTML. Same for beacons.ai, bio.site
- **Rate limiting:** max 10 Perplexity searches/minute (respect API limit), queue excess
- **LinkedIn URL normalization:** always store as `https://www.linkedin.com/in/{slug}/`
- **Resolution trigger:** run after every new contact seeded (AAG-022→028 pipeline) + weekly re-run for unresolved contacts
- **Privacy:** don't store personal email addresses in logs/analytics tables — only in `crm_contacts.email` and `acq_email_discoveries`
