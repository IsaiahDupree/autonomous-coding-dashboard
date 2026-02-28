# AAG Agent 09 — Cross-Platform Entity Resolution

## Mission
Build the entity resolution agent that, given one known platform handle, discovers all other social profiles (Twitter, Instagram, TikTok, LinkedIn, website, email) for the same person using Perplexity web search, username fuzzy matching, bio link extraction, and Claude AI disambiguation. Updates crm_contacts with confirmed cross-platform handles.

## Features to Build
AAG-151 through AAG-180

## Depends On
Agent 01 (migrations — acq_entity_associations, acq_resolution_runs tables, crm_contacts columns)

## Working Directory
`/Users/isaiahdupree/Documents/Software/Safari Automation/scripts/acquisition/`

## Output Files
- `acquisition/entity_resolution_agent.py`
- `acquisition/entity/perplexity_client.py`
- `acquisition/entity/username_matcher.py`
- `acquisition/entity/bio_link_extractor.py`
- `acquisition/entity/linktree_parser.py`
- `acquisition/entity/disambiguator.py`
- `acquisition/api/routes/entity.py`
- `tests/test_entity_resolution.py`

## PerplexityClient
```python
import httpx, os, asyncio
from collections import deque
import time

class PerplexityClient:
    BASE_URL = "https://api.perplexity.ai"
    MODEL = "llama-3.1-sonar-large-128k-online"
    
    # Rate limiter: 10 req/min, 500/day
    _request_times = deque(maxlen=10)
    
    def __init__(self):
        self.api_key = os.environ.get("PERPLEXITY_API_KEY")
        if not self.api_key:
            raise PerplexityNotConfiguredError("PERPLEXITY_API_KEY not set — use SafariPerplexityFallback")
    
    async def _rate_limit(self):
        now = time.time()
        if len(self._request_times) == 10:
            oldest = self._request_times[0]
            wait = 60 - (now - oldest)
            if wait > 0:
                await asyncio.sleep(wait)
        self._request_times.append(time.time())
    
    async def search(self, query: str) -> str:
        await self._rate_limit()
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(
                f"{self.BASE_URL}/chat/completions",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={
                    "model": self.MODEL,
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are an identity researcher. Find social media profiles. Return ONLY confirmed findings with specific handles/URLs. Format: {twitter: '@handle', instagram: '@handle', tiktok: '@handle', linkedin: 'url', website: 'url', email: 'addr'}. Say 'not found' for each unknown field."
                        },
                        {"role": "user", "content": query}
                    ],
                    "search_recency_filter": "month",
                    "return_citations": True
                }
            )
            r.raise_for_status()
            # Log usage
            await self._log_usage()
            return r.json()["choices"][0]["message"]["content"]
    
    async def _log_usage(self):
        await queries.insert_api_usage("perplexity", 1, estimated_cost_usd=0.005)
    
    # Query templates
    def query_by_handle(self, handle: str, platform: str, niche: str) -> str:
        return f"Find all social media profiles for the person who posts about {niche} on {platform} as @{handle}. Include Twitter, Instagram, TikTok, LinkedIn URL, personal website, and email."
    
    def query_by_name(self, name: str, niche: str, known_platform: str) -> str:
        return f"Find social media profiles for {name}, a {niche} creator or business owner. Known platform: {known_platform}. Find Twitter handle, Instagram handle, TikTok handle, LinkedIn URL, website."
    
    def query_by_website(self, website_url: str) -> str:
        return f"Who owns {website_url}? Find their Twitter, Instagram, TikTok, LinkedIn profile, and email address."


class SafariPerplexityFallback:
    """Use Safari to navigate perplexity.ai when API key not available."""
    
    async def search(self, query: str) -> str:
        encoded = urllib.parse.quote(query)
        url = f"https://www.perplexity.ai/?q={encoded}"
        # Navigate via AppleScript
        script = f'tell application "Safari" to open location "{url}"'
        subprocess.run(["osascript", "-e", script])
        await asyncio.sleep(6)  # Wait for response
        # Extract text via AppleScript
        extract_script = '''
        tell application "Safari"
            do JavaScript "document.querySelector('.prose, [class*=answer], main')?.innerText || ''" in front document
        end tell
        '''
        result = subprocess.run(["osascript", "-e", extract_script], capture_output=True, text=True)
        return result.stdout.strip()
```

## UsernameMatchEngine
```python
import re
from difflib import SequenceMatcher

def squish(s: str) -> str:
    """Remove all non-alphanumeric chars, lowercase."""
    return re.sub(r'[^a-z0-9]', '', s.lower())

def handle_similarity(h1: str, h2: str) -> float:
    return SequenceMatcher(None, squish(h1), squish(h2)).ratio()

def name_to_handle_candidates(display_name: str) -> list[str]:
    """Generate likely handle variants from a display name."""
    parts = display_name.lower().split()
    if not parts:
        return []
    first = re.sub(r'[^a-z0-9]', '', parts[0])
    last = re.sub(r'[^a-z0-9]', '', parts[-1]) if len(parts) > 1 else ''
    candidates = [
        f"{first}{last}", f"{first}_{last}", f"{first}.{last}",
        f"{first[0]}{last}", f"{last}{first}",
        display_name.lower().replace(' ', ''),
        display_name.lower().replace(' ', '_'),
    ]
    return [c for c in candidates if len(c) >= 3]

SAME_HANDLE_THRESHOLD = 0.85

def is_likely_same_handle(known: str, candidate: str) -> bool:
    return handle_similarity(known, candidate) >= SAME_HANDLE_THRESHOLD
```

## BioLinkExtractor
```python
async def extract_bio_links(contact: Contact) -> list[str]:
    """Get URLs from contact's bio on their known platform."""
    # Check crm_market_research cache first
    cached = await queries.get_market_research(contact.id)
    if cached and cached.bio_url:
        urls = [cached.bio_url]
        # Follow linktree/beacons if present
        for url in urls:
            if any(x in url for x in ['linktr.ee', 'beacons.ai', 'bio.site', 'linkin.bio']):
                extra_urls = await parse_link_aggregator(url)
                urls.extend(extra_urls)
        return urls
    return []

async def parse_link_aggregator(url: str) -> list[str]:
    """Extract all linked URLs from Linktree, Beacons, etc."""
    try:
        async with httpx.AsyncClient(timeout=10, headers={"User-Agent": "Mozilla/5.0"}) as c:
            r = await c.get(url)
            # Find all href links that look like social profiles
            links = re.findall(r'href=["\']([^"\']+)["\']', r.text)
            social_patterns = [
                r'twitter\.com/\w+', r'instagram\.com/\w+', r'tiktok\.com/@\w+',
                r'linkedin\.com/in/[\w-]+', r'youtube\.com/@?\w+'
            ]
            found = []
            for link in links:
                for pattern in social_patterns:
                    if re.search(pattern, link):
                        found.append(link)
            return list(set(found))
    except Exception:
        return []
```

## AIDisambiguator
```python
async def disambiguate(known: Contact, candidate: CandidateProfile) -> DisambiguationResult:
    prompt = f"""Are these two social media profiles the SAME PERSON?

Known profile:
- Platform: {known.primary_platform}
- Handle: @{known.primary_handle}
- Display name: {known.display_name}
- Bio snippet: {known.bio_text[:200] if known.bio_text else 'unknown'}

Candidate profile:
- Platform: {candidate.platform}
- Handle: @{candidate.handle}
- Display name: {candidate.display_name}
- Bio snippet: {candidate.bio_text[:200] if candidate.bio_text else 'unknown'}

Evidence:
- Name similarity: {candidate.name_similarity:.0%}
- Bio link overlap: {candidate.bio_link_overlap}
- Perplexity mentioned this link: {candidate.perplexity_mentioned}

Respond with ONLY valid JSON:
{{"same_person": true/false, "confidence": 0-100, "reasoning": "one sentence", "warning": "note if ambiguous or common name"}}

Only return same_person=true if confidence >= 80."""

    response = await claude.messages.create(
        model="claude-3-haiku-20240307",
        max_tokens=150,
        messages=[{"role": "user", "content": prompt}]
    )
    return DisambiguationResult(**json.loads(response.content[0].text))
```

## EntityResolutionAgent.resolve()
```python
async def resolve(self, contact_id: str, dry_run: bool = False) -> ResolutionResult:
    contact = await queries.get_contact(contact_id)
    start = time.time()
    
    # 1. Collect signals in parallel
    perplexity_result, bio_links = await asyncio.gather(
        self._search_perplexity(contact),
        bio_link_extractor.extract_bio_links(contact),
        return_exceptions=True
    )
    
    # 2. Build candidates from all signals
    candidates = self._build_candidates(contact, perplexity_result, bio_links)
    
    # 3. Score candidates
    ranked = self._rank_candidates(contact, candidates)
    
    # 4. Disambiguate top candidates with Claude
    confirmed = []
    for candidate in ranked[:5]:  # max 5 Claude calls per contact
        if candidate.score >= 40:
            result = await disambiguator.disambiguate(contact, candidate)
            if result.same_person and result.confidence >= 80:
                confirmed.append((candidate, result))
    
    if dry_run:
        return ResolutionResult(contact_id=contact_id, confirmed=confirmed, dry_run=True)
    
    # 5. Write to DB
    for candidate, result in confirmed:
        await queries.insert_entity_association(
            contact_id=contact_id,
            found_platform=candidate.platform,
            found_handle=candidate.handle,
            association_type=candidate.type,
            confidence=result.confidence,
            confirmed=True,
            evidence_sources=candidate.evidence_sources,
            claude_reasoning=result.reasoning
        )
        # Update crm_contacts
        await queries.update_contact_handle(contact_id, candidate.platform, candidate.handle)
    
    # 6. Calculate resolution score
    score = await self._calculate_resolution_score(contact_id)
    await queries.update_contact(contact_id, resolution_score=score, entity_resolved=True)
    
    # 7. Log run
    await queries.insert_resolution_run(
        contact_id=contact_id,
        associations_found=len(candidates),
        associations_confirmed=len(confirmed),
        platforms_resolved=[c.platform for c, _ in confirmed],
        email_found=any(c.type=='email' for c, _ in confirmed),
        linkedin_found=any(c.platform=='linkedin' for c, _ in confirmed),
        duration_ms=int((time.time() - start) * 1000)
    )
    
    # 8. If email found, trigger email discovery
    if any(c.type=='email' for c, _ in confirmed):
        await queries.update_contact_email(contact_id, ...)
    
    return ResolutionResult(contact_id=contact_id, confirmed=confirmed, resolution_score=score)
```

## Resolution Score Calculator
```python
def calculate_resolution_score(contact: Contact) -> int:
    score = 0
    if contact.email and contact.email_verified:  score += 30
    elif contact.email:                            score += 20
    if contact.linkedin_url:                       score += 25
    if contact.twitter_handle:                     score += 15
    if contact.instagram_handle:                   score += 15
    if contact.tiktok_handle:                      score += 10
    if contact.website_url:                        score += 5
    return min(score, 100)
```

## False Positive Protection
```python
# Skip Claude call entirely if signals too weak
def should_skip_disambiguation(candidate: CandidateProfile) -> bool:
    return (
        candidate.name_similarity < 0.5
        and not candidate.bio_link_overlap
        and not candidate.perplexity_mentioned
    )
```

## CLI
```bash
python3 acquisition/entity_resolution_agent.py --resolve CONTACT_ID
python3 acquisition/entity_resolution_agent.py --batch --limit 20
python3 acquisition/entity_resolution_agent.py --show-unresolved
python3 acquisition/entity_resolution_agent.py --status
python3 acquisition/entity_resolution_agent.py --dry-run
```

## Tests Required
```python
test_squish_normalizes_handles()
test_handle_similarity_above_threshold()
test_bio_link_extractor_finds_linktree_links()
test_linktree_parser_extracts_social_urls()
test_perplexity_client_rate_limiter()
test_disambiguator_confidence_gate_80()
test_false_positive_skips_weak_signals()
test_resolution_score_calculator()
test_confirmed_handle_written_to_crm_contacts()
test_batch_resolver_respects_semaphore()
```
