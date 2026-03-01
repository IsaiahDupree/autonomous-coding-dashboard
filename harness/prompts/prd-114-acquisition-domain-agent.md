# PRD-114: Acquisition Domain Agent (Native Tool Calling)

## Project
- **Repo**: /Users/isaiahdupree/Documents/Software/actp-worker
- **Feature List**: /Users/isaiahdupree/Documents/Software/actp-worker/prd-114-features.json
- **Depends On**: PRD-111 (NativeToolAgent base)
- **Priority**: P0 — drives the $4K/month Upwork + $2K/month retainer revenue stream

## Context

This agent is the **B2B sales specialist** for EverReach OS. It extends `NativeToolAgent` and owns the full acquisition pipeline: prospect discovery → ICP scoring → warm-up sequencing → outreach → CRM stage management → deal tracking. Claude decides autonomously how to move each prospect from Awareness → Consideration → Decision → Closed Won.

Current state:
- 500 crm_contacts: 1 Decision (Julian Goldie), 12 Consideration, 466 Awareness
- 24 pending messages: 22 LinkedIn, 2 Gmail
- Julian Goldie: email queued Mon 2026-03-02 13:00 UTC
- LinkedIn force:true bypasses activeHours restriction
- Upwork target: $2K+/project × 2/month
- Retainer target: $2K/month × 1 client

## Domain System Prompt

```
You are a B2B sales and acquisition specialist for EverReach OS. Your mission:
1. Find qualified prospects (ICP: solopreneur/founder/creator, 10K+ followers or $1M+ business)
2. Score each prospect 0-100 using the ICP rubric
3. Warm up prospects through a 3-step sequence before pitching
4. Send personalized outreach on the right channel (LinkedIn DM, Twitter DM, or Gmail)
5. Move prospects through stages: Awareness → Consideration → Decision → Closed Won
6. Close Upwork contracts ($2K+/project, 2/month) and retainer clients ($2K/month)

ICP Criteria (score each 0-100):
- Audience size: 10K-500K = high fit (scores 80+)
- Niche: solopreneur/content_creation/ai_automation = perfect fit
- Engagement rate: > 3% = strong signal
- Revenue indicators: selling courses, coaching, SaaS = offer-ready
- Platform presence: active on 3+ platforms = authority signal
- Engagement score > 200 in actp_content_performance = verified audience

Offer portfolio:
- ACTP content automation service: $2K/month retainer (for creators 10K-100K followers)
- Safari automation CRM: $1.5K setup + $500/month (for agencies/operators)
- Upwork contracts: AI automation, content systems, CRM builds ($2K-$5K per project)

Outreach rules:
- LinkedIn: max 10 connection requests/day, use dry_run=true to preview
- Twitter DM: preferred for creators, more casual tone
- Gmail: for known email contacts only (Julian Goldie = me@juliangoldie.com)
- Never pitch cold — always warm with 2+ value touches first
- LinkedIn messages pass force=true to bypass activeHours check

Target contact: Julian Goldie (score=33, Decision stage, email queued Mon)
Currently 12 Consideration prospects needing follow-up.
```

## Architecture

```
AcquisitionDomainAgent (acquisition_agent.py)
    extends NativeToolAgent (PRD-111)
    tools (24):
        ├── search_linkedin_prospects   — LinkedIn port 3105
        ├── score_prospect              — prospect_funnel_scorer.py logic
        ├── get_top_prospects           — actp_prospect_scores ranked by score
        ├── get_prospects_by_stage      — crm_contacts WHERE stage=X
        ├── get_crm_contact             — crm_contacts by id/handle
        ├── update_prospect_stage       — update crm_contacts stage field
        ├── queue_linkedin_message      — crm_message_queue via LinkedIn port 3105
        ├── queue_twitter_dm            — crm_message_queue via Twitter port 3003
        ├── queue_gmail_outreach        — crm_message_queue type=gmail
        ├── send_pending_outreach       — strategic_outreach.py send_batch logic
        ├── get_pending_outreach        — crm_message_queue WHERE status='pending'
        ├── search_upwork_jobs          — upwork_client.py upwork_search
        ├── score_upwork_job            — upwork_client.py score_job
        ├── generate_proposal           — upwork_client.py generate_proposal (Claude Sonnet)
        ├── submit_upwork_proposal      — upwork_client.py submit_proposal
        ├── get_upwork_applications     — upwork_client.py applications
        ├── research_prospect           — crm_brain.py score logic (Claude AI scoring)
        ├── generate_outreach_message   — crm_brain.py generate logic (brand-aligned)
        ├── get_niche_top_creators      — actp_content_performance top engagement creators
        ├── log_deal_activity           — insert into actp_deal_log
        ├── get_revenue_pipeline        — crm_contacts Decision+Consideration stages
        ├── get_monthly_targets         — check actp_revenue_goals vs actuals
        ├── sync_crm_conversations      — crm_brain.py --sync (pull from all platforms)
        └── get_outreach_stats          — crm_message_queue success rate stats
```

## Task

### Tool Implementations
1. `tool_search_linkedin_prospects(query, limit=10)` — POST localhost:3105/api/linkedin/search with ICP query
2. `tool_score_prospect(contact_id)` — run prospect_funnel_scorer logic: audience_size + engagement + niche + revenue_signals
3. `tool_get_top_prospects(limit=20, min_score=60)` — SELECT from actp_prospect_scores ORDER BY score DESC
4. `tool_get_prospects_by_stage(stage, limit=20)` — SELECT crm_contacts WHERE stage=X
5. `tool_get_crm_contact(contact_id)` — SELECT full contact record
6. `tool_update_prospect_stage(contact_id, new_stage, note)` — UPDATE crm_contacts stage + log to crm_score_history
7. `tool_queue_linkedin_message(contact_id, message, force=True)` — POST localhost:3105/api/linkedin/message with force=true
8. `tool_queue_twitter_dm(username, message)` — POST localhost:3003/api/dm/send
9. `tool_queue_gmail_outreach(email, subject, body, send_at)` — INSERT crm_message_queue type=gmail
10. `tool_send_pending_outreach(limit=10)` — run strategic_outreach send_batch for pending queue items
11. `tool_get_pending_outreach(limit=20)` — SELECT crm_message_queue WHERE status='pending' ORDER BY scheduled_at ASC
12. `tool_search_upwork_jobs(keyword, budget_min=1000)` — upwork_client.upwork_search (Safari port 3108 if available, else mock)
13. `tool_score_upwork_job(job_id)` — upwork_client.score_job return 0-100 fit score
14. `tool_generate_proposal(job_id, job_description)` — upwork_client.generate_proposal (Claude Sonnet)
15. `tool_submit_upwork_proposal(job_id, proposal_text, bid_amount)` — upwork_client.submit_proposal
16. `tool_get_upwork_applications()` — upwork_client.applications return active bids
17. `tool_research_prospect(contact_id)` — Claude AI score 0-100 using contact's platform data + engagement
18. `tool_generate_outreach_message(contact_id, offer_type)` — Claude generates brand-aligned personalized message
19. `tool_get_niche_top_creators(niche, min_engagement=200)` — SELECT from actp_content_performance WHERE engagement >= 200
20. `tool_log_deal_activity(contact_id, activity_type, note)` — INSERT into actp_deal_log
21. `tool_get_revenue_pipeline()` — contacts in Decision/Consideration stages with estimated deal values
22. `tool_get_monthly_targets()` — compare $9.5K month target vs current closed deals
23. `tool_sync_crm_conversations()` — call crm_brain.py sync logic (pull all platform convos → Supabase)
24. `tool_get_outreach_stats()` — sent vs reply rate vs booked rate from crm_message_queue

### Agent Orchestration
25. `AcquisitionDomainAgent.__init__()` — super().__init__() + register all 24 tools
26. `AcquisitionDomainAgent.get_system_prompt()` — return domain system prompt with ICP, offers, rules
27. `AcquisitionDomainAgent.run_daily_prospecting()` — preset goal: "Find 20 qualified LinkedIn prospects, score them, queue warm messages for top 10"
28. `AcquisitionDomainAgent.run_pipeline_advance()` — preset goal: "Move all Consideration prospects to Decision, send follow-ups for Decision prospects"
29. `AcquisitionDomainAgent.run_upwork_scan()` — preset goal: "Search Upwork for AI automation/content system jobs with budget>$1K, score top 5, generate proposals"
30. `AcquisitionDomainAgent.send_julian_goldie_email()` — preset goal: "Send queued Julian Goldie offer email if now >= Mon 2026-03-02 13:00 UTC"

### Self-Healing
31. If LinkedIn port 3105 down: fallback to direct osascript strategy (li_prospect.py)
32. If outreach queue > 50 pending: pause new additions, drain existing first
33. Rate limit guard: track daily LinkedIn requests in actp_tool_call_log, stop at 10
34. `health_check_outreach_queue()` — return pending count, oldest pending age, send success rate

### Cron Integration
35. APScheduler: `run_daily_prospecting()` daily at 11:00 and 15:00 (LinkedIn active hours)
36. APScheduler: `run_pipeline_advance()` daily at 09:00
37. APScheduler: `run_upwork_scan()` every 2hr
38. APScheduler: `send_julian_goldie_email()` daily at 13:00 UTC (fires Mon if pending)

### Supabase Tables
39. Migration: `actp_deal_log` — id, contact_id FK, activity_type, note, agent_run_id FK, created_at
40. Migration: `actp_revenue_goals` — id, month, target_revenue, closed_revenue, pipeline_value, updated_at (seed with $9500 month 1 target)

### Health Routes
41. `GET /api/agents/acquisition/status` — agent health, pipeline summary, pending outreach count
42. `GET /api/agents/acquisition/pipeline` — all stages with contact counts + estimated values
43. `POST /api/agents/acquisition/run` — manually trigger a goal for this agent

### Tests
44. `test_score_prospect_icp_rubric()` — solopreneur with 50K followers should score >= 80
45. `test_linkedin_message_sends_force_true()` — verify force=True in payload
46. `test_outreach_queue_respects_rate_limits()` — 10 linkedin messages queued, verify 11th blocked
47. `test_proposal_generation_uses_job_description()` — mock job, verify description in prompt
48. `test_pipeline_advance_moves_consideration()` — seed 3 Consideration contacts, verify follow-ups queued
49. `test_julian_goldie_email_sends_at_correct_time()` — mock datetime Mon 13:00, verify send triggered

## Key Files
- `acquisition_agent.py` (new)
- `native_tool_agent.py` (from PRD-111)
- `strategic_outreach.py` (existing — used by tools)
- `prospect_funnel_scorer.py` (existing — used by tools)
- `crm_brain.py` (existing — used by tools)
- `upwork_client.py` (existing — used by tools)

## Environment Variables
- `ENABLE_ACQUISITION_AGENT=true`
- `SAFARI_LINKEDIN_URL=http://localhost:3105`
- `SAFARI_UPWORK_URL=http://localhost:3108`
