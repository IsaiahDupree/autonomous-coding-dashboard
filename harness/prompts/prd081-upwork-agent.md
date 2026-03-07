# PRD-081: Upwork Autonomous Agent

## Working Directory
`/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard`

## Feature List
`/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness/features/prd081-upwork-agent.json`

## Goal
Build a fully autonomous Upwork agent that scans gigs, scores feasibility, builds demo projects, pushes to GitHub, deploys to Vercel, and sends proposals via Telegram approval flow.

## Features to Implement

**UW-001** — `harness/upwork-agent.js`: Upwork gig scanner using Safari automation (:3104) to search gigs matching skill keywords (web dev, AI, automation, SaaS). Reads `upwork-keywords.json`, returns array of `{gig_id, title, budget, description, client_history, url}`. Runs every 2h.

**UW-002** — Gig feasibility scorer (0-10 points): landing page/website (+3), design/UI (+2), already has wireframe (+2), <$500 budget (+1), repeated client (+2). Score≥7 = feasible. Written inline in upwork-agent.js.

**UW-003** — Build pipeline: for feasible gig (score≥7), spawn Claude Code agent via `harness/run-harness-project.js` with `harness/prompts/upwork-builder.md`. Builds landing page to `/tmp/upwork-{gig_id}/`. Non-blocking — runs in background.

**UW-004** — GitHub push: after build completes, `git init && git remote add origin https://github.com/isaiahdupree/upwork-demos.git && git push`. Store GitHub URL in queue entry.

**UW-005** — Vercel deploy: `npx vercel --yes --prod` in `/tmp/upwork-{gig_id}/` → capture live URL. Store in queue entry as `demo_url`.

**UW-006** — Passport drive backup: `cp -r /tmp/upwork-{gig_id}/ /Volumes/Passport/clients/upwork/{gig_id}/` if drive mounted.

**UW-007** — Proposal drafter: generates proposal text with demo URL + GitHub link. Template: "I already built this. Demo: {demo_url} | Code: {github_url}. Can deliver in 48h."

**UW-008** — Telegram approval: POST to Telegram bot with gig details + demo URL + `/approve_{id}` and `/skip_{id}` buttons. Message format: title, budget, score, demo URL.

**UW-009** — `harness/telegram-bot.js`: add `/approve_ID` and `/skip_ID` handlers. On approve → submit proposal via Upwork Safari automation. Update `upwork-queue.json` status.

**UW-010** — `harness/upwork-queue.json`: `[{id, gig_id, title, budget, score, demo_url, github_url, proposal_text, status, created_at}]`. Status: `pending_approval → approved → submitted → skipped`.

**UW-011** — `harness/launch-upwork-agent.sh`: `start|stop|status`. Runs `upwork-agent.js` with nohup, 2h cycle. PID file at `harness/upwork-agent.pid`.

**UW-012** — Backend routes in `harness/run-harness.js` or `harness/cron-manager.js`: `GET /api/upwork/status`, `GET /api/upwork/queue`, `POST /api/upwork/scan`.

**UW-013** — `harness/prompts/upwork-builder.md`: Claude Code agent prompt for building landing pages from gig descriptions. Outputs clean HTML/CSS/JS to current directory.

## Rules
- No mock data — real Safari automation via `:3104`
- All file paths absolute or relative to working directory
- Commit after each feature: `git add -A && git commit -m "feat(upwork): UW-00X ..."`
- Mark feature `passes: true` in feature JSON after implementing + basic smoke test
