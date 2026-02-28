# AAG Agent 03 — ICP Scoring Agent

## Mission
Build the Claude-powered ICP scoring agent that reads newly discovered contacts, scores them 0-100 against the ideal customer profile, and routes them to `qualified` or `archived`.

## Features to Build
AAG-021 through AAG-030

## Depends On
Agent 01 (migrations), Agent 02 (contacts exist in crm_contacts with pipeline_stage='new')

## Working Directory
`/Users/isaiahdupree/Documents/Software/Safari Automation/scripts/acquisition/`

## Output Files
- `acquisition/scoring_agent.py`
- `tests/test_scoring_agent.py`

## ScoringAgent Requirements

```python
class ScoringAgent:
    async def run(self, limit: int = 50, niche_id: str = None, dry_run: bool = False) -> ScoringResult
    async def score_contact(self, contact: Contact, config: NicheConfig) -> ScoreResult
    async def batch_score(self, contacts: list[Contact], config: NicheConfig) -> list[ScoreResult]
    async def route_contact(self, contact_id: str, score: int, min_score: int) -> str  # returns new stage
```

## Claude Scoring — Use Haiku (cost efficient)
Model: `claude-3-haiku-20240307`

**Single contact prompt:**
```
You are scoring a social media prospect against an ideal customer profile.

ICP Criteria: {config.scoring_prompt or DEFAULT_SCORING_PROMPT}

Contact:
- Name: {display_name}
- Platform: {platform} (@{handle})
- Followers: {follower_count}
- Bio: {bio_text}
- Top post: "{top_post_text}" ({top_post_likes} likes)
- Niche: {niche_label}

Score this contact 0-100 where:
100 = perfect ICP match
70+ = qualified, worth outreach
50-69 = borderline
<50 = not a fit

Respond with valid JSON only:
{"score": <int>, "reasoning": "<one sentence>", "signals": ["<signal1>", "<signal2>"]}
```

**Batch prompt (up to 20 contacts):**
```
Score each of these {n} contacts. Return a JSON array with one object per contact in order.
Each object: {"contact_index": <int>, "score": <int>, "reasoning": "<one sentence>"}

ICP: {scoring_prompt}

Contacts:
{formatted_contacts_list}
```

## DEFAULT_SCORING_PROMPT
```
Ideal customer: a business owner, coach, consultant, or creator who:
- Posts actively (at least weekly)
- Has 1,000–500,000 followers (not mega-celebrity, not micro-nano)
- Talks about growth, business, content strategy, or audience building
- Would benefit from AI-powered content or outreach automation
- Is NOT already a SaaS tool, agency, or competitor
```

## Routing Logic
```python
async def route_contact(contact_id, score, min_score):
    if score >= min_score:
        new_stage = 'qualified'
    else:
        new_stage = 'archived'
    
    await queries.update_pipeline_stage(contact_id, new_stage)
    await queries.insert_funnel_event(contact_id, from_stage='new', to_stage=new_stage, triggered_by='agent')
    return new_stage
```

## Score History
Every score written to `crm_score_history`:
```python
await queries.insert_score_history(
    contact_id=contact_id,
    score=score,
    reasoning=reasoning,
    model_used='claude-3-haiku',
    scored_at=datetime.utcnow()
)
```
Also UPDATE `crm_contacts.relationship_score = score`.

## Batch Processing Strategy
1. Query `crm_contacts WHERE relationship_score IS NULL AND pipeline_stage='new'` up to `limit`
2. Group by `source_niche_config_id` to use correct scoring prompt per niche
3. Batch up to 20 contacts per Claude call (cost savings)
4. Fall back to individual calls if batch JSON parse fails
5. Log total scored, qualified count, archived count

## Re-scoring Stale Contacts
- If `last_scored_at < NOW() - interval '30 days'` AND `crm_market_research` updated in last 7 days → flag for re-score
- `--rescore-stale` CLI flag triggers this

## CLI Interface
```bash
python3 acquisition/scoring_agent.py --run                    # score all new contacts
python3 acquisition/scoring_agent.py --limit 20               # max N contacts
python3 acquisition/scoring_agent.py --niche-id UUID          # specific niche only
python3 acquisition/scoring_agent.py --rescore-stale          # re-score old scores
python3 acquisition/scoring_agent.py --dry-run                # show scores, no writes
```
Output: score distribution histogram (0-49: X, 50-64: X, 65-79: X, 80-100: X)

## Tests Required
```python
test_scoring_prompt_returns_valid_json()
test_batch_scoring_20_contacts()
test_score_routing_qualified_above_threshold()
test_score_routing_archived_below_threshold()
test_rescore_stale_triggers_correctly()
test_score_written_to_history()
test_fallback_to_individual_on_batch_parse_fail()
```
