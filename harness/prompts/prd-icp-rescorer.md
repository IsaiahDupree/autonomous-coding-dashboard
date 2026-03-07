# PRD: ICP Rescorer

## Goal

845 CRM contacts scored against the wrong ICP — top results are content marketers and brand strategists instead of software founders needing AI automation. This agent re-scores all contacts using a corrected rubric, updates `offer_readiness`, `tags`, `ai_summary`, and `next_action` for the top 50, and flags misaligned contacts (low-fit) to stop wasting outreach cycles on them.

## Working Directory

/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard

## Key Context

- Target ICP: Software founders/CTOs/heads of engineering at $500K–$5M ARR SaaS companies who need AI automation (agent workflows, CRM automation, content pipelines, LinkedIn automation)
- Anti-ICP: content marketers, brand strategists, copywriters, competitors (personal brand coaches, LinkedIn ghostwriters)
- Supabase `crm_contacts`: `offer_readiness` (int), `tags` (array), `ai_summary` (text), `headline` (text), `bio` (text), `next_action` (text), `pipeline_stage`, `metadata` (jsonb)
- ANTHROPIC_API_KEY from actp-worker/.env
- Scoring script: one-shot batch run (not a daemon) — runs in under 30min for 845 contacts

## Output Files

- `harness/icp-rescorer.js` — batch scoring script
- `harness/icp-rescore-report.json` — output: score distribution, top 20, anti-ICP list

---

## Features

### Feature 1: Scoring rubric definition
**Acceptance Criteria:**
- [ ] Defines ICP scoring rubric as a constant (0–100 scale):
  ```js
  const ICP_RUBRIC = {
    // +points (max 100)
    isFounder: 30,           // headline contains founder/co-founder/ceo/cto/owner
    isSaasOrTech: 20,        // headline/bio contains saas/software/startup/tech/engineer/developer/product
    aiInterest: 20,          // bio/headline contains ai/automation/llm/gpt/agent/ml/workflow
    revenueSignal: 15,       // bio contains ARR/revenue/funding/raised/series/bootstrapped/profitable
    builderSignal: 10,       // headline contains builder/building/shipping/scaling
    linkedinActive: 5,       // platform=linkedin (highest intent channel)
    // -points (disqualifiers)
    isContentMarketer: -40,  // headline contains content marketer/copywriter/ghostwriter/brand strategist
    isCompetitor: -50,       // headline contains LinkedIn coach/personal brand coach/LinkedIn ghostwriter
    isAgency: -20,           // headline contains agency/consultant (unless also founder)
    noHeadline: -10,         // headline is null
  };
  ```
- [ ] Score clipped to 0–100
- [ ] `offer_readiness` mapped: score >= 70 → 25, >= 50 → 15, >= 30 → 10, >= 15 → 5, < 15 → 0

### Feature 2: Batch scorer — keyword-based (fast pass)
**Acceptance Criteria:**
- [ ] Processes all 845 contacts in a single Supabase query (SELECT id, display_name, headline, bio, platform, pipeline_stage)
- [ ] Applies `ICP_RUBRIC` keyword scoring to `headline` + `bio` using case-insensitive matching
- [ ] Produces `ScoredContact[]`: `{ id, display_name, headline, score, offer_readiness, flags[] }`
- [ ] `flags` examples: `['is_founder', 'saas_signal', 'ai_interest', 'is_competitor', 'anti_icp']`
- [ ] Marks contacts with score < 10 as `anti_icp: true`
- [ ] Logs distribution: `Score 70+: N, 50-70: N, 30-50: N, 15-30: N, <15: N (anti-ICP)`
- [ ] Runs in < 5s (pure JS, no API calls in this step)

### Feature 3: Claude enrichment — top 50 contacts
**Acceptance Criteria:**
- [ ] Takes top 50 contacts by keyword score
- [ ] For each: calls Claude Haiku with full context (display_name, headline, bio, platform, current pipeline_stage)
- [ ] System: "You are a B2B sales qualifier for an AI automation consultant targeting software founders at $500K-$5M ARR SaaS companies. Score this contact 0-100 for ICP fit and provide: refined_score (int), icp_verdict (perfect_fit|strong_fit|weak_fit|anti_icp), key_reason (1 sentence), next_action (1-2 sentences specific action to take), updated_summary (2-3 sentence profile summary)."
- [ ] Processes in batches of 10 with 2s delay between batches
- [ ] Falls back to keyword score if Claude call fails for a contact
- [ ] Returns enriched scores for top 50

### Feature 4: Supabase bulk updater
**Acceptance Criteria:**
- [ ] Updates ALL 845 contacts with new `offer_readiness` (from keyword score)
- [ ] Updates top 50 contacts additionally with: `ai_summary`, `next_action`, `next_action_at = now() + interval '24 hours'`, `tags` array
- [ ] Tags format: `['icp_rescored_2026-03-07', 'fit:perfect_fit', 'signal:founder', 'signal:saas']`
- [ ] For anti-ICP contacts (score < 10): adds tag `'anti_icp'`, sets `offer_readiness = 0`, sets `next_action = NULL`
- [ ] Does updates in batches of 50 via Supabase upsert
- [ ] Logs: `Updated 845 contacts. Top ICP: N, Anti-ICP tagged: N`
- [ ] Does NOT change `pipeline_stage` — only scoring fields

### Feature 5: Report generator
**Acceptance Criteria:**
- [ ] Writes `harness/icp-rescore-report.json`:
  ```json
  {
    "runDate": "YYYY-MM-DD",
    "totalContacted": 845,
    "scoreDistribution": { "70+": N, "50-70": N, "30-50": N, "15-30": N, "<15": N },
    "top20": [{ "display_name", "headline", "platform", "score", "icp_verdict", "next_action" }],
    "antiIcp": [{ "display_name", "headline", "reason" }],
    "platformBreakdown": { "linkedin": N, "instagram": N, ... }
  }
  ```
- [ ] Sends Telegram summary:
  ```
  🎯 ICP Rescore complete — 845 contacts
  Perfect/Strong fit: N
  Anti-ICP flagged: N
  Top lead: {display_name} — {headline}
  ```
- [ ] Saves report to Obsidian: `~/.memory/vault/PROJECT-MEMORY/icp-rescore-YYYY-MM-DD.md`

### Feature 6: CLI runner + test
**Acceptance Criteria:**
- [ ] `node harness/icp-rescorer.js` — runs full batch
- [ ] `--dry-run` — scores and reports without writing Supabase
- [ ] `--top N` — only enrich top N contacts with Claude (default 50)
- [ ] `--platform linkedin` — only score contacts for one platform
- [ ] Integration test: `--dry-run` runs without errors, produces score distribution, top 20 list has correct fields
- [ ] Print PASS/FAIL

## Do NOT do
- Do not change pipeline_stage
- Do not send any messages
- Do not delete contacts
- Do not use Claude for all 845 (too expensive) — keyword pass first, Claude only for top 50
