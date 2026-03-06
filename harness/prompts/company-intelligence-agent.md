# CompanyIntelligenceAgent — ACD Build Prompt

## Mission
Build `company_intelligence_agent.py` in actp-worker. This agent enriches B2B CRM contacts
with company-level data (ARR estimate, employee count, is_founder, tech_stack) using the
existing PerplexityClient from AAG-09. It then computes an `icp_score_modifier` that the
scoring agent adds on top of the social signal score. Without this, "founders of $500K–$5M
ARR SaaS companies" is an ICP you can describe but never actually score for.

## Working Directory
`/Users/isaiahdupree/Documents/Software/actp-worker/`

## Output Files
- `company_intelligence_agent.py`
- `tests/test_company_intelligence_agent.py`

---

## Depends On
- AAG-153: `acquisition/entity/perplexity_client.py` — `PerplexityClient.search(query) → str`
- AAG-161: Claude disambiguation pattern — parse Perplexity response with Claude
- Supabase table `crm_company_intel` (already migrated)

---

## ICP Score Modifier Rules

```python
def compute_score_modifier(intel: CompanyIntel) -> int:
    score = 0
    # Founder/executive role — biggest signal
    if intel.is_founder:
        score += 20
    elif intel.is_executive:
        score += 8

    # ARR in sweet spot ($500K–$5M)
    if intel.estimated_arr_usd:
        if 500_000 <= intel.estimated_arr_usd <= 5_000_000:
            score += 20
        elif intel.estimated_arr_usd < 500_000:
            score -= 5   # too small, lower priority
        elif intel.estimated_arr_usd > 5_000_000:
            score = min(score, 0)  # cap: too big, won't buy $2,500 service

    # Employee count in right range (10–100 = SMB with budget but not enterprise)
    if intel.employee_count:
        if 10 <= intel.employee_count <= 100:
            score += 5
        elif intel.employee_count < 5:
            score -= 3   # solo, no budget

    # SaaS/software industry confirmation
    if intel.industry and any(k in intel.industry.lower()
                               for k in ("software", "saas", "tech", "ai", "digital")):
        score += 5

    # Confidence-weight the result
    confidence = max(intel.confidence_score or 50, 10) / 100
    return int(score * confidence)
```

---

## Perplexity Query Templates

```python
QUERY_TEMPLATES = [
    # Template 1 — founder + company lookup
    "What company does {display_name} found or run? Is {display_name} a founder or CEO? "
    "What is the company's estimated annual revenue or ARR? What industry? "
    "How many employees? Is it a SaaS company? Answer in JSON format.",

    # Template 2 — LinkedIn context (use if linkedin_url available)
    "Based on LinkedIn profile {linkedin_url}, what company does this person run or work at? "
    "Is this person a founder, CEO, or executive? What is the estimated company revenue? "
    "What industry and tech stack? JSON format.",
]

CLAUDE_PARSE_PROMPT = """
Extract structured company information from this research response.
Return ONLY valid JSON with these exact fields:
{
  "company_name": string or null,
  "company_domain": string or null,
  "estimated_arr_usd": integer or null (annual revenue in USD, e.g. 1500000),
  "employee_count": integer or null,
  "industry": string or null,
  "tech_stack": [list of strings] or [],
  "funding_stage": "bootstrapped"|"seed"|"series_a"|"series_b"|"public"|null,
  "is_founder": boolean or null,
  "is_executive": boolean or null,
  "confidence_score": integer 0-100 (how confident are you in this data)
}

Research response:
{response}
"""
```

---

## Full Implementation

```python
# company_intelligence_agent.py
"""
CompanyIntelligenceAgent
Enriches B2B contacts with company data via Perplexity.
Computes icp_score_modifier and stores in crm_company_intel.
"""

import asyncio
import json
import logging
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional

log = logging.getLogger(__name__)

QUERY_TEMPLATES = [
    (
        "What company does {display_name} found or run? Is {display_name} a founder or CEO? "
        "What is the company's estimated annual revenue or ARR? What industry? "
        "How many employees? Is it a SaaS or software company? Answer in JSON."
    ),
    (
        "LinkedIn profile {linkedin_url} — what company does this person run? "
        "Are they a founder, CEO, or executive? Company estimated revenue? "
        "Industry, employee count, tech stack? JSON format."
    ),
]

CLAUDE_PARSE_PROMPT = """\
Extract company intel from this research response. Return ONLY valid JSON:
{{
  "company_name": string or null,
  "company_domain": string or null,
  "estimated_arr_usd": integer or null,
  "employee_count": integer or null,
  "industry": string or null,
  "tech_stack": [],
  "funding_stage": "bootstrapped"|"seed"|"series_a"|"series_b"|"public"|null,
  "is_founder": true/false/null,
  "is_executive": true/false/null,
  "confidence_score": 0-100
}}

Research:
{response}
"""


@dataclass
class CompanyIntel:
    contact_id: str
    company_name: Optional[str] = None
    company_domain: Optional[str] = None
    estimated_arr_usd: Optional[int] = None
    employee_count: Optional[int] = None
    industry: Optional[str] = None
    tech_stack: list = field(default_factory=list)
    funding_stage: Optional[str] = None
    is_founder: Optional[bool] = None
    is_executive: Optional[bool] = None
    confidence_score: int = 50
    icp_score_modifier: int = 0
    perplexity_raw: str = ""


def compute_score_modifier(intel: CompanyIntel) -> int:
    score = 0
    if intel.is_founder:
        score += 20
    elif intel.is_executive:
        score += 8

    if intel.estimated_arr_usd is not None:
        if 500_000 <= intel.estimated_arr_usd <= 5_000_000:
            score += 20
        elif intel.estimated_arr_usd < 500_000:
            score -= 5
        elif intel.estimated_arr_usd > 5_000_000:
            score = min(score, 0)

    if intel.employee_count is not None:
        if 10 <= intel.employee_count <= 100:
            score += 5
        elif intel.employee_count < 5:
            score -= 3

    if intel.industry and any(k in intel.industry.lower()
                               for k in ("software", "saas", "tech", "ai", "digital")):
        score += 5

    confidence = max(intel.confidence_score, 10) / 100
    return int(score * confidence)


class CompanyIntelligenceAgent:

    def __init__(self, data_plane, perplexity_client, claude_client):
        self.dp = data_plane
        self.perplexity = perplexity_client
        self.claude = claude_client

    def _build_query(self, contact: dict) -> str:
        linkedin_url = contact.get("linkedin_url")
        display_name = contact.get("display_name", "")

        if linkedin_url:
            return QUERY_TEMPLATES[1].format(linkedin_url=linkedin_url)
        return QUERY_TEMPLATES[0].format(display_name=display_name)

    async def _parse_with_claude(self, raw_response: str) -> dict:
        prompt = CLAUDE_PARSE_PROMPT.format(response=raw_response[:3000])
        try:
            result = await self.claude.complete(
                prompt=prompt,
                model="claude-3-haiku-20240307",
                max_tokens=500,
            )
            # Extract JSON from response
            text = result.content if hasattr(result, "content") else str(result)
            json_match = re.search(r'\{.*\}', text, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
        except Exception as e:
            log.warning(f"[CompanyIntel] Claude parse failed: {e}")
        return {}

    async def enrich_contact(self, contact: dict) -> CompanyIntel:
        contact_id = contact["id"]
        display_name = contact.get("display_name", "unknown")

        query = self._build_query(contact)
        log.info(f"[CompanyIntel] Enriching {display_name} ({contact_id})")

        intel = CompanyIntel(contact_id=contact_id)

        try:
            raw = await self.perplexity.search(query)
            intel.perplexity_raw = raw or ""

            if raw:
                parsed = await self._parse_with_claude(raw)
                intel.company_name       = parsed.get("company_name")
                intel.company_domain     = parsed.get("company_domain")
                intel.estimated_arr_usd  = parsed.get("estimated_arr_usd")
                intel.employee_count     = parsed.get("employee_count")
                intel.industry           = parsed.get("industry")
                intel.tech_stack         = parsed.get("tech_stack") or []
                intel.funding_stage      = parsed.get("funding_stage")
                intel.is_founder         = parsed.get("is_founder")
                intel.is_executive       = parsed.get("is_executive")
                intel.confidence_score   = int(parsed.get("confidence_score") or 50)

        except Exception as e:
            log.error(f"[CompanyIntel] Perplexity failed for {contact_id}: {e}")
            intel.confidence_score = 0

        intel.icp_score_modifier = compute_score_modifier(intel)

        # Upsert to crm_company_intel
        await self.dp.supabase_upsert("crm_company_intel", {
            "contact_id":          contact_id,
            "company_name":        intel.company_name,
            "company_domain":      intel.company_domain,
            "estimated_arr_usd":   intel.estimated_arr_usd,
            "employee_count":      intel.employee_count,
            "industry":            intel.industry,
            "tech_stack":          intel.tech_stack,
            "funding_stage":       intel.funding_stage,
            "is_founder":          intel.is_founder,
            "is_executive":        intel.is_executive,
            "icp_score_modifier":  intel.icp_score_modifier,
            "confidence_score":    intel.confidence_score,
            "perplexity_raw":      intel.perplexity_raw[:5000],
            "enriched_at":         datetime.now(timezone.utc).isoformat(),
            "updated_at":          datetime.now(timezone.utc).isoformat(),
        }, conflict_columns=["contact_id"])

        # Stamp contact
        await self.dp.supabase_update("crm_contacts", contact_id, {
            "company_intel_enriched_at": datetime.now(timezone.utc).isoformat(),
        })

        # If modifier is significant, trigger re-score
        if abs(intel.icp_score_modifier) >= 10:
            log.info(f"[CompanyIntel] Significant modifier {intel.icp_score_modifier:+d} "
                     f"for {display_name} — flagging for re-score")
            await self.dp.supabase_update("crm_contacts", contact_id, {
                "last_scored_at": None,  # Forces re-score on next scoring run
            })

        return intel

    async def run_batch(self, limit: int = 20) -> dict:
        """
        Enrich contacts that have linkedin_url and haven't been company-enriched yet.
        Limited to 20/run due to Perplexity rate limits (max 10 req/min → 20 with spacing).
        """
        rows = await self.dp.supabase_execute_sql("""
            SELECT id, display_name, primary_platform, pipeline_stage,
                   linkedin_url, twitter_handle, instagram_handle
            FROM crm_contacts
            WHERE company_intel_enriched_at IS NULL
              AND pipeline_stage NOT IN ('archived', 'closed_lost')
              AND (linkedin_url IS NOT NULL OR primary_platform = 'linkedin')
            ORDER BY relationship_score DESC NULLS LAST
            LIMIT %s
        """, [limit])

        contacts = rows if isinstance(rows, list) else []
        log.info(f"[CompanyIntel] Batch enriching {len(contacts)} contacts")

        results = {"total": len(contacts), "enriched": 0, "failed": 0,
                   "score_modifiers": [], "errors": []}

        for contact in contacts:
            try:
                intel = await self.enrich_contact(contact)
                results["enriched"] += 1
                if intel.icp_score_modifier != 0:
                    results["score_modifiers"].append({
                        "contact_id":  contact["id"],
                        "name":        contact.get("display_name"),
                        "modifier":    intel.icp_score_modifier,
                        "company":     intel.company_name,
                        "arr":         intel.estimated_arr_usd,
                        "is_founder":  intel.is_founder,
                    })
                await asyncio.sleep(7)  # ~8 req/min within Perplexity limit
            except Exception as e:
                log.error(f"[CompanyIntel] {contact['id']}: {e}")
                results["failed"] += 1
                results["errors"].append(str(e))

        return results
```

---

## Integration with ICP Scoring (patch `scoring_agent.py`)

When `ICPScoringAgent` builds the scoring prompt for a contact, add this step:

```python
# In build_contact_brief(contact_id):
company = await self.dp.supabase_select(
    "crm_company_intel",
    filters={"contact_id": contact_id},
    limit=1,
)
company_context = ""
if company:
    c = company[0]
    parts = []
    if c.get("company_name"):    parts.append(f"Company: {c['company_name']}")
    if c.get("estimated_arr_usd"): parts.append(f"Est. ARR: ${c['estimated_arr_usd']:,}")
    if c.get("is_founder"):       parts.append("Role: Founder/CEO")
    elif c.get("is_executive"):   parts.append("Role: Executive")
    if c.get("employee_count"):   parts.append(f"Team size: {c['employee_count']}")
    company_context = " | ".join(parts)

# Inject into scoring prompt:
# "- Business context: {company_context}" (new line in prompt)

# After scoring, ADD modifier:
raw_score = claude_score  # 0-100 from Claude
modifier = company[0]["icp_score_modifier"] if company else 0
final_score = max(0, min(100, raw_score + modifier))
```

---

## CompanyIntelligenceExecutor (add to `workflow_executors.py`)

```python
class CompanyIntelligenceExecutor:
    task_type = "company_intel"

    def __init__(self, data_plane, perplexity_client, claude_client):
        self.dp = data_plane
        self.perplexity = perplexity_client
        self.claude = claude_client

    async def execute(self, task: dict) -> dict:
        from company_intelligence_agent import CompanyIntelligenceAgent
        action = task.get("action", "run_batch")
        agent = CompanyIntelligenceAgent(self.dp, self.perplexity, self.claude)

        if action == "run_batch":
            return await agent.run_batch(limit=task.get("limit", 20))

        elif action == "enrich_contact":
            rows = await self.dp.supabase_select(
                "crm_contacts", filters={"id": task["contact_id"]}, limit=1
            )
            if not rows:
                return {"error": "Contact not found"}
            intel = await agent.enrich_contact(rows[0])
            return {
                "company_name":       intel.company_name,
                "estimated_arr_usd":  intel.estimated_arr_usd,
                "is_founder":         intel.is_founder,
                "icp_score_modifier": intel.icp_score_modifier,
                "confidence_score":   intel.confidence_score,
            }

        elif action == "status":
            rows = await self.dp.supabase_execute_sql("""
                SELECT
                  COUNT(*) AS total_enriched,
                  COUNT(*) FILTER (WHERE is_founder = true) AS founders,
                  COUNT(*) FILTER (WHERE estimated_arr_usd BETWEEN 500000 AND 5000000) AS in_icp_range,
                  AVG(icp_score_modifier) AS avg_modifier
                FROM crm_company_intel
            """, [])
            return rows[0] if rows else {}

        return {"error": f"Unknown action: {action}"}
```

---

## Cron Entry

```python
CronJob(
    name="company_intel_enrichment",
    task_type="company_intel",
    action="run_batch",
    schedule="0 6 * * *",   # daily 6AM UTC
    enabled=True,
    params={"limit": 20},   # 20/day respects Perplexity rate limits
),
```

---

## Tests Required

```python
test_compute_score_modifier_founder_in_icp_range()          # +20 founder + +20 ARR = +40 raw, confidence-weighted
test_compute_score_modifier_too_large_arr_caps_to_zero()    # ARR > $5M → modifier ≤ 0
test_compute_score_modifier_no_data_returns_zero()
test_enrich_contact_upserts_crm_company_intel()
test_enrich_contact_stamps_company_intel_enriched_at()
test_enrich_contact_flags_for_rescore_on_large_modifier()
test_parse_with_claude_extracts_json_from_prose()
test_run_batch_respects_perplexity_rate_limit_delay()
test_run_batch_skips_non_linkedin_contacts()
```
