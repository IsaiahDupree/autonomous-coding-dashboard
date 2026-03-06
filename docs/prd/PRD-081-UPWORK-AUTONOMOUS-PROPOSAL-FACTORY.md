# PRD-081: Upwork Autonomous Proposal Factory
**Priority:** P0 | **Revenue Impact:** Direct ($500–$2,500/gig) | **Owner:** ACD Agent

## Goal
Find Upwork gigs 100% completable in 2–4 hours of automated software dev, build the deliverable immediately, deploy a live demo, then queue for human Telegram approval before sending.

## Core Loop (every 2 hours)
1. **Search Upwork** (Safari port: check Safari Automation CLAUDE.md for Upwork port) for matching gigs
2. **Score gig** — feasibility score (10-point): is it a website/landing page/simple app/data task?
3. **Feasibility ≥ 7** → dispatch ACD agent to BUILD IT NOW (Claude Code SDK)
4. **ACD agent**: create folder, build website/app, push to GitHub, deploy to Vercel
5. **Attach demo URL** + GitHub link to proposal draft
6. **Queue for Telegram approval** — human reviews proposal + demo link, approves/skips
7. **On approval** — Safari automation sends the Upwork proposal

## Gig Scoring Rubric (10-point)
- +3: Landing page / portfolio site / simple website
- +2: "Just need it deployed" / "Already have designs"
- +2: Fixed price <$500 OR hourly est <4h
- +2: Tech stack we own (HTML/CSS/JS, React, Next.js, Python)
- +1: Client has verified payment method

## Build Pipeline (ACD Agent)
```
For each approved gig:
1. mkdir /tmp/upwork-{gig-id}/
2. Claude Code agent builds deliverable (uses harness)
3. git init → git push to github.com/isaiahdupree/upwork-{gig-id}
4. vercel --yes --prod → get live URL
5. Save: { gig_id, demo_url, github_url, local_path, passport_backup_path }
6. Write to Passport drive: /Volumes/Passport/clients/upwork-{gig-id}/
7. Draft proposal: "I already built this. Demo: {url}. GitHub: {repo}. Approve to ship."
8. Push to Telegram approval queue
```

## Files to Create
- `harness/upwork-agent.js` — gig scanner + proposal queue daemon
- `harness/launch-upwork-agent.sh`
- `harness/upwork-queue.json` — pending proposals
- `harness/prompts/upwork-builder.md` — Claude Code prompt for building deliverables
- Backend routes: `GET /api/upwork/status|queue` + `POST /api/upwork/queue/approve`
- Telegram webhook: POST approval → Safari sends Upwork message

## Telegram Approval Flow
```
Bot message: "New Upwork gig ready to send:
  Title: {gig_title}
  Budget: {budget}
  Demo: {vercel_url}
  GitHub: {github_url}
  Proposal: {draft_text}

  /approve_{id} | /skip_{id}"
```

## Success Metrics
- 5+ proposals sent/week
- ≥1 gig won/week ($500+ revenue)
- All demos deployed before proposal sent (zero "just trust me" proposals)
- Build time <2h per deliverable

## Dependencies
- Upwork Safari automation running
- Claude Code SDK (ANTHROPIC_API_KEY)
- GitHub CLI (`gh`) authenticated
- Vercel CLI (`npx vercel`) authenticated
- Telegram bot token (TELEGRAM_BOT_TOKEN)
- Passport drive mounted at /Volumes/Passport
