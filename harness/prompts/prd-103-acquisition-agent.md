# PRD-103: Autonomous Acquisition Agent

## Project
- **Repo**: /Users/isaiahdupree/Documents/Software/actp-worker
- **Feature List**: /Users/isaiahdupree/Documents/Software/actp-worker/prd-103-features.json
- **Priority**: P0 (CRITICAL — drives $5K+/month revenue goal)

## Context

The Autonomous Acquisition Agent orchestrates the full client and contract acquisition pipeline: prospect discovery → ICP scoring → warmup → multi-channel outreach (LinkedIn, Upwork, DM) → CRM tracking → conversion → onboarding. It runs 24/7 with all 10 AAG (Autonomous Acquisition Group) sub-agents active, targeting $9,500 Month 1 via: EverReach ($2K), Upwork contracts ($4K = 2×$2K), services retainer ($2K), SaaS ($1.5K).

Key targets:
- 2 Upwork contracts/month @ $2K+
- 1 services retainer client @ $2K/month
- 100 EverReach Pro users @ $19.99/mo
- 30 ClientPortal users @ $49/mo
- 22 LinkedIn + 2 Gmail outreach messages queued — fire immediately

## Architecture

```
AcquisitionAgent (acquisition_agent.py)
      ├── ProspectDiscovery    — find ICP-matching leads across platforms
      ├── ICPScorer            — score prospect fit 0–100
      ├── WarmupSequencer      — multi-touch warmup before hard pitch
      ├── OutreachOrchestrator — LinkedIn / Upwork / DM / Email outreach
      ├── CRMBridge            — sync all activity to crm_contacts
      └── ConversionTracker    — track pipeline stages, flag stalled deals
```

## Task

### Core Module: `acquisition_agent.py`
1. `AcquisitionAgent.__init__()` — init with CRM client, outreach clients, goal targets
2. `AcquisitionAgent.run_acquisition_cycle()` — full discover→score→warmup→outreach→track cycle
3. `AcquisitionAgent.run_as_daemon()` — asyncio loop, runs cycle every 2 hours
4. `AcquisitionAgent.get_pipeline_status()` — count per stage, revenue at risk, ETA to targets
5. `AcquisitionAgent.fire_pending_outreach()` — immediately send all queued messages in crm_message_queue

### Prospect Discovery
6. `ProspectDiscovery.run_market_research(niche, platform)` — call Safari market research API
7. `ProspectDiscovery.extract_creator_prospects(research_results)` — creators with >10K followers
8. `ProspectDiscovery.extract_business_prospects(niche)` — companies needing content automation
9. `ProspectDiscovery.deduplicate_prospects(prospects)` — check against crm_contacts to avoid re-adding
10. `ProspectDiscovery.enrich_prospect(handle, platform)` — get follower count, bio, engagement rate
11. `ProspectDiscovery.discover_upwork_jobs(keywords)` — call Safari Upwork API for matching jobs
12. `ProspectDiscovery.score_upwork_job_fit(job)` — rate job fit for skills: content automation, AI, Python

### ICP Scorer
13. `ICPScorer.score_prospect(contact)` — 0–100 score: budget signals, niche fit, engagement, reach
14. `ICPScorer.score_batch(contacts)` — score 10+ in one Claude call for cost efficiency
15. `ICPScorer.classify_stage(score)` — Decision(80+) / Consideration(50-79) / Awareness(<50)
16. `ICPScorer.get_next_action(contact)` — recommended next action based on stage
17. `ICPScorer.prioritize_pipeline(contacts)` — sort by score × recency × channel

### Warmup Sequencer
18. `WarmupSequencer.start_warmup(contact_id, platform)` — enqueue 3-touch warmup sequence
19. `WarmupSequencer.get_warmup_step(contact_id)` — current step: like → comment → DM
20. `WarmupSequencer.execute_warmup_step(contact_id)` — dispatch to Safari automation
21. `WarmupSequencer.advance_sequence(contact_id)` — move to next step after delay
22. `WarmupSequencer.check_due_warmups()` — find all contacts with next_action_at ≤ now
23. `WarmupSequencer.complete_warmup(contact_id)` — mark warmed, ready for pitch

### Outreach Orchestrator
24. `OutreachOrchestrator.send_linkedin_message(contact_id, message)` — via safari linkedin_client
25. `OutreachOrchestrator.send_dm(contact_id, platform, message)` — via dm_outreach_client
26. `OutreachOrchestrator.send_email(contact_id, subject, body)` — via Gmail client
27. `OutreachOrchestrator.submit_upwork_proposal(job_id, proposal_text)` — via upwork_client
28. `OutreachOrchestrator.generate_personalized_message(contact, offer)` — Claude-powered message gen
29. `OutreachOrchestrator.generate_upwork_proposal(job, skills)` — tailored proposal via Claude
30. `OutreachOrchestrator.fire_pending_queue()` — process all crm_message_queue items due now
31. `OutreachOrchestrator.respect_rate_limits(platform)` — enforce per-platform daily send limits

### CRM Bridge
32. `CRMBridge.sync_contact(handle, platform, data)` — upsert to crm_contacts
33. `CRMBridge.update_stage(contact_id, stage)` — update pipeline stage
34. `CRMBridge.log_interaction(contact_id, type, content)` — record every touch
35. `CRMBridge.get_contacts_by_stage(stage)` — fetch Decision/Consideration/Awareness
36. `CRMBridge.flag_stalled(contact_id, days_inactive)` — mark if no activity >7 days
37. `CRMBridge.get_pipeline_metrics()` — counts, conversion rates per stage

### Conversion Tracker
38. `ConversionTracker.record_deal_won(contact_id, product, amount)` — log to actp_deals
39. `ConversionTracker.record_deal_lost(contact_id, reason)` — log with loss reason
40. `ConversionTracker.compute_monthly_revenue()` — sum all deals this month vs. target
41. `ConversionTracker.get_upwork_contracts_count()` — count active Upwork contracts
42. `ConversionTracker.get_retainer_clients()` — list active service retainer clients
43. `ConversionTracker.alert_if_behind_target()` — notify orchestrator if pace < goal

### Supabase Tables
44. Create migration `actp_deals` — id, contact_id FK, product, amount, stage, won_at, lost_at, reason
45. Create migration `actp_acquisition_log` — id, cycle_at, prospects_found, scored, outreach_sent, deals_won
46. Seed Julian Goldie contact with stage=Decision, offer email due Monday 13:00 UTC

### Health Server Routes
47. `GET /api/acquisition/status` — pipeline counts per stage, revenue this month
48. `GET /api/acquisition/pipeline` — full pipeline with contacts per stage
49. `POST /api/acquisition/fire-queue` — immediately process all pending outreach
50. `GET /api/acquisition/upwork/jobs` — latest matching Upwork jobs

## Key Files
- `acquisition_agent.py` (new — main acquisition agent)
- `warmup_sequencer.py` (new — extends engagement_engine_agent.py patterns)
- `outreach_orchestrator.py` (new — unified outreach dispatcher)
- `conversion_tracker.py` (new)
- `engagement_engine_agent.py` (extend with new warmup methods)
- `strategic_outreach.py` (integrate with outreach_orchestrator)

## Testing
```bash
python3 -m pytest tests/test_acquisition_agent.py -v
python3 acquisition_agent.py --fire-pending-queue
python3 acquisition_agent.py --pipeline-status
python3 acquisition_agent.py --run-cycle
```
