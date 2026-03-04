# Social Skills -- Claude Code Skill Files

## Project
/Users/isaiahdupree/Documents/Software/skills

## Context
Build 6 Claude Code skill files for social automation workflows. Each skill lives in its own
subdirectory under /Users/isaiahdupree/Documents/Software/skills/ with a SKILL.md and justfile.
Skills are invoked via slash commands in Claude Code and Windsurf.
CRMLite: https://crmlite-h3k1s46jj-isaiahduprees-projects.vercel.app
Safari Automation services: IG DM :3100, TW DM :3003, TK DM :3102, LI :3105,
  IG comments :3005, TK comments :3006, TW comments :3007, Threads :3004, Market Research :3106

## Instructions
- Implement each feature exactly as specified
- Each skill is a SKILL.md in its own subdirectory of /Users/isaiahdupree/Documents/Software/skills/
- Also create a justfile in each directory with runnable commands
- Update /Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness/social-skills-features.json after completing each feature
- After all skills are created, verify all SKILL.md files are properly formatted

---

## SKL-001: /safari-status skill

**Problem**: No single command to check if all Safari automation services are running.

**Fix**:
1. Create /Users/isaiahdupree/Documents/Software/skills/safari-status/SKILL.md with:
   - Title: Safari Automation Health Check
   - Description: Check all 9 REST services and Safari sessions before starting any workflow
   - When to use: first command every session before any automation
   - Step-by-step: for each port (3100, 3003, 3102, 3105, 3005, 3006, 3007, 3004, 3106), run curl -s --max-time 3 http://localhost:{port}/health and report UP/DOWN + latency
   - Output format: status table | Service | Port | Status | Latency |
   - If any DM service is down: show start command npm run --prefix packages/{name} start:server
   - MCP alternative: once MQS-004 is built, can use *_is_ready tools instead of curl
2. Create justfile with targets:
   - check: curl health on all 9 ports, format as table
   - start-all: start all 9 services in background with log redirection to /tmp/safari-{name}.log
   - stop-all: pkill -f 'node.*packages' to stop all Node safari services

---

## SKL-002: /social-inbox skill

**Problem**: No unified triage across 4 platforms. No draft-reply workflow with approval gate.

**Fix**:
1. Create /Users/isaiahdupree/Documents/Software/skills/social-inbox/SKILL.md with:
   - Title: Unified Social Inbox Triage
   - When to use: daily morning check, before any outreach session
   - Step 1 - Collect: call instagram_get_unread (or instagram_get_conversations filtered unread), twitter_get_unread, tiktok_get_conversations, linkedin_list_conversations
   - Step 2 - Enrich: for each sender call {platform}_crm_get_contact. Note new vs existing contacts.
   - Step 3 - Categorize: hot_lead (buying intent or direct question), needs_reply (engaged, requires response), follow_up_pending (replied to your outreach), spam (promo/bot), monitor (low signal)
   - Step 4 - Draft: for hot_lead and needs_reply, call {platform}_ai_generate_dm with conversation context
   - Step 5 - Output: triage report grouped by category: sender | platform | preview | CRM status | drafted reply
   - Step 6 - Approval: ask user 'Approve and send drafted replies? (yes/no/edit number)'
   - IMPORTANT: do NOT send anything without explicit user approval. Always verify with dryRun=true first.
2. Create justfile with: inbox (full triage), inbox-hot (hot_lead only)

---

## SKL-003: /dm-campaign skill

**Problem**: Batch outreach to a list of usernames requires manual dedup, profile pulls, generation, and approval.

**Fix**:
1. Create /Users/isaiahdupree/Documents/Software/skills/dm-campaign/SKILL.md with:
   - Title: DM Campaign Runner
   - Usage: /dm-campaign [platform] [purpose] [username1] [username2] ...
   - Step 1 - Dedup: for each username call {platform}_crm_get_contact. Skip anyone with interaction in last 14 days.
   - Step 2 - Profile: call {platform}_get_profile for each non-skipped username (bio + recent posts for personalization).
   - Step 3 - Generate: call {platform}_ai_generate_dm with { username, profile, purpose } for each contact.
   - Step 4 - Approval gate: present all drafts numbered. Ask 'Send all (a), selected (1,2,3), edit (e#), skip (s)?'
   - Step 5 - Send: for approved messages, call {platform}_send_dm with dryRun=false and 3-5s delay between sends.
   - Purpose examples: 'collab offer', 'product demo invite', 'follow-up after content', 'podcast guest invite'
   - RULE: NEVER skip the approval gate. NEVER send without explicit confirmation.
2. Create justfile with: campaign (interactive), campaign-dry (drafts only, no sends)

---

## SKL-004: /upwork-hunt skill

**Problem**: No batch workflow for searching, scoring, generating, and submitting Upwork proposals.

**Fix**:
1. Create /Users/isaiahdupree/Documents/Software/skills/upwork-hunt/SKILL.md with:
   - Title: Upwork Proposal Factory
   - Usage: /upwork-hunt [keywords] [max-proposals=5]
   - Step 1 - Search: call upwork_search_jobs { keywords, limit: 20 }
   - Step 2 - Score: call upwork_score_jobs on full list. Sort descending.
   - Step 3 - Select: take top N (default 5). Show list with scores. Ask user to confirm or adjust.
   - Step 4 - Generate: call upwork_generate_proposal for each selected job.
   - Step 5 - Review: show each proposal with job title. Ask 'Submit all (a), selected (1,2,3), edit (e#), skip (s)?'
   - Step 6 - Submit: call upwork_submit_proposal with dryRun=false for approved ones. Log proposal ID.
   - ICP criteria (document): automation, API integrations, marketing tech, AI/LLM. Budget $500+. Fixed-price preferred.
   - RULE: never submit to jobs with score below 60.
2. Create justfile with: hunt (interactive), hunt-preview (search + score only, no submit)

---

## SKL-005: /social-research skill

**Problem**: No structured cross-platform prospect brief before DMing.

**Fix**:
1. Create /Users/isaiahdupree/Documents/Software/skills/social-research/SKILL.md with:
   - Title: Cross-Platform Prospect Brief
   - Usage: /social-research [handle or full name]
   - Step 1 - CRM lookup: call {platform}_crm_get_contact for all 4 platforms with the handle.
   - Step 2 - LinkedIn: call linkedin_get_profile or linkedin_search_profiles for bio, company, role.
   - Step 3 - Instagram: call instagram_get_profile for follower count, bio, recent post themes (if exists).
   - Step 4 - Twitter: call twitter_get_profile for follower count, recent tweets, engagement style.
   - Step 5 - Market Research: POST /api/research/{platform}/search with handle to get recent posts.
   - Step 6 - Synthesize one-page brief with: Identity (name, role, company), Platforms (handles, follower counts), Recent Activity (themes), Engagement Style (formal/casual), CRM History, Recommended Outreach Angle (best platform + opening line).
   - If a platform returns NOT_FOUND, skip silently and note in brief.
2. Create justfile with: research (takes handle as arg, runs full brief)

---

## SKL-006: /comment-sweep skill

**Problem**: High-value post commenters are not identified or followed up with systematically.

**Fix**:
1. Create /Users/isaiahdupree/Documents/Software/skills/comment-sweep/SKILL.md with:
   - Title: Engagement Harvester
   - Usage: /comment-sweep [post-url] [platform]
   - Step 1 - Fetch: call {platform}_get_post_comments with post URL.
   - Step 2 - Filter: remove duplicates, bots (follower count < 10), own comments.
   - Step 3 - Enrich: call {platform}_crm_get_contact for each unique commenter.
   - Step 4 - Score: for commenters without CRM record, call {platform}_get_profile. Score: high (followers > 1000 or ICP keywords in bio), medium (engaged), low (no signal).
   - Step 5 - Report: ranked list with handle | score | comment preview | CRM status | followers | recommended action (DM now / add to campaign / monitor).
   - Step 6 - Action: ask 'Open DM drafts for top N high-score commenters? (yes/no)'. If yes, run /dm-campaign dry-run for approval.
   - RULE: only DM high and medium score commenters with relevant bios.
2. Create justfile with: sweep (post-url and platform as args)
