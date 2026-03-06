# PRD: Upwork Autonomous Fulfillment Pipeline
## Find Gig → Build → Deploy → Passport Backup → Telegram Approval Gate

**Status:** Draft  
**Date:** 2026-03-05  
**Source:** Founder voice memo — autonomous system vision  
**Scope:** Autonomous discovery of completable Upwork gigs, AI build + deploy, human Telegram approval before send

---

## 1. Problem Statement

Upwork has thousands of small gigs (landing pages, simple apps, single-feature websites) that can be completed in 2-4 hours of software work. We need a system that:

1. Autonomously finds those gigs (filterable by skills + estimated time)
2. Pre-builds the deliverable before even bidding (demo-first approach)
3. Deploys a live Vercel preview the client can see immediately
4. Backs up the code to Passport drive + GitHub
5. Sends a Telegram message to the human: "Here's what I built. Approve to send proposal?"
6. Human taps ✅ → proposal is sent with the demo link

This creates a flywheel: agent finds gig → builds it → human just approves → wins clients.

---

## 2. Existing Infrastructure to Build On

| Component | Location | Status |
|-----------|----------|--------|
| Upwork Safari service | localhost:3108 | ✅ Running |
| Claude Code SDK / claude_launcher.py | actp-worker/ | ✅ Working |
| GitHub automation | actp-worker/ | ✅ Pattern exists |
| Vercel deploy via CLI | vercel CLI | ✅ Available |
| Telegram bot | actp-worker/telegram_bot.py | ✅ Working |
| Passport drive | /Volumes/My Passport | ✅ Mounted |
| agent_swarm.py coding agent | actp-worker/ | ✅ Sonnet/Claude Code |

---

## 3. Features

### UAF-001 — Upwork Job Scanner

Safari agent (port 3108) action: `search_jobs`
- Filter criteria (configurable in `upwork_config.yaml`):
  - `max_budget_hours: 4` — only gigs estimable ≤ 4h
  - `skills: [website, landing page, react, nextjs, html, css, simple app]`
  - `budget_min: 50, budget_max: 2000`
  - `client_rating_min: 4.5`
  - `posted_within_hours: 24`
- Returns structured job records: `{ id, title, description, budget, skills, client_rating, url, posted_at }`
- Stores in Supabase `actp_upwork_jobs` with status=new

### UAF-002 — Job Feasibility Scorer

Claude Haiku reviews each new job:
- Input: job title + description
- Output: `{ feasible: bool, estimated_hours: float, deliverable_type: string, confidence: float, reason: string }`
- `deliverable_type` options: landing_page, portfolio_site, simple_react_app, wordpress_setup, api_integration, other
- Only jobs with `feasible=true AND estimated_hours ≤ 4 AND confidence ≥ 0.8` proceed
- Stores scoring result in `actp_upwork_jobs.ai_assessment` jsonb

### UAF-003 — Autonomous Build Agent

For each feasible job:
1. Create project folder: `/Volumes/My Passport/client-projects/{job_id}/`
2. Spawn coding agent (agent_swarm.py, role=coding, engine=claude_code_unstructured)
3. Goal prompt: `"Build a {deliverable_type} based on this client brief: {description}. Make it professional, responsive, and deployable. Save all files to {project_dir}."`
4. Agent uses Claude Code to generate full project (HTML/CSS/JS or Next.js)
5. On completion: validate build (run `npm run build` or check HTML valid)
6. Store build result: status, files_created, build_log

### UAF-004 — GitHub Push

After successful build:
```bash
cd {project_dir}
git init
git add .
git commit -m "Initial build for Upwork job {job_id}: {job_title}"
git remote add origin https://github.com/IsaiahDupree/upwork-{job_id}
git push -u origin main
```
- Uses GitHub CLI (`gh repo create`) to create private repo
- Store GitHub URL in job record

### UAF-005 — Vercel Deploy

After GitHub push:
```bash
cd {project_dir}
vercel --yes --token $VERCEL_TOKEN
```
- Returns live preview URL: `https://upwork-{job_id}.vercel.app`
- Store Vercel URL in job record
- Verify URL returns 200 before proceeding

### UAF-006 — Passport Drive Backup

```
/Volumes/My Passport/
  client-projects/
    {job_id}/          ← full project code
      README.md        ← job title, client brief summary, GitHub URL, Vercel URL
      src/             ← deliverable source
```
- Write README.md with all metadata before backup is considered complete

### UAF-007 — Telegram Approval Gate

Send Telegram message to owner (TELEGRAM_CHAT_ID):

```
🔨 Job Ready for Review

📋 {job_title}
💰 Budget: {budget}
⏱  Est. hours: {estimated_hours}

✅ Build complete
🔗 Live demo: {vercel_url}
📦 GitHub: {github_url}

Approve sending proposal?
[✅ Yes, Send] [❌ Skip]
```

- Inline keyboard buttons: callback_data = `upwork_approve_{job_id}` / `upwork_skip_{job_id}`
- Wait up to 24h for approval
- On ✅ approve → trigger UAF-008
- On ❌ skip → mark job as skipped, log reason (optional text reply)

### UAF-008 — Proposal Sender

On human approval:
1. Generate proposal text via Claude Sonnet:
   - Input: job description + vercel_url + our skills/profile
   - Output: personalized 3-paragraph proposal with demo link
2. Safari Upwork agent submits proposal:
   - Navigate to job URL
   - Click "Apply Now"
   - Paste proposal text
   - Submit bid (use job's suggested rate or our standard rate)
3. Mark job as `proposal_sent` in Supabase
4. Send Telegram confirmation: "✅ Proposal sent for {job_title}"

### UAF-009 — Pipeline Cron

| Job | Schedule | Description |
|-----|----------|-------------|
| upwork_job_scan | Every 4h | Scan new jobs, score feasibility |
| upwork_build_queue | Every 1h | Build next feasible job in queue |
| upwork_proposal_check | Daily 9AM | Check proposal status, follow up |

### UAF-010 — Won Job Workflow

On job win notification:
1. Telegram message: "🎉 Job won: {title}. Deliver by {deadline}."
2. Human confirms → agent sends deliverable files + GitHub access to client
3. Mark as `delivered`
4. Archive project: move to `/Volumes/My Passport/completed/{job_id}/`

---

## 4. Implementation Order

1. UAF-001: Upwork job scanner (extend port 3108 service)
2. UAF-002: Feasibility scorer (Claude Haiku + Supabase job table)
3. UAF-003: Build agent (agent_swarm coding role)
4. UAF-004: GitHub push automation
5. UAF-005: Vercel deploy automation
6. UAF-006: Passport drive backup
7. UAF-007: Telegram approval gate (inline keyboard)
8. UAF-008: Proposal sender
9. UAF-009: Cron registration
10. UAF-010: Won job workflow

---

## 5. Key Files to Create/Modify

```
actp-worker/
  upwork_pipeline.py         # NEW — orchestrates full pipeline
  upwork_build_agent.py      # NEW — wraps agent_swarm coding role
  upwork_deploy.py           # NEW — GitHub + Vercel deployment
  upwork_proposal.py         # NEW — proposal generation + submission
  telegram_approval.py       # EXTEND — add inline keyboard handler

supabase/migrations/
  YYYYMMDD_upwork_jobs.sql   # NEW — actp_upwork_jobs table

config/
  upwork_config.yaml         # NEW — job filter criteria, rate settings
```

---

## 6. Acceptance Criteria

- [ ] Scanner finds ≥ 5 new feasible jobs per day
- [ ] Build agent produces deployable code for landing_page type in ≤ 30 min
- [ ] Vercel deploy URL returns HTTP 200
- [ ] Telegram approval message sent within 5 min of build completion
- [ ] Tapping ✅ in Telegram causes proposal to be submitted on Upwork within 2 min
- [ ] All projects backed up to `/Volumes/My Passport/client-projects/` with README
