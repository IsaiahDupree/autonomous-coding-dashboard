# Upwork Autonomous Agent

**Status:** In Development (PRD-081)
**Priority:** 9/10

## Overview

An autonomous agent that:
1. **Scans** Upwork for relevant gigs (landing pages, websites, SaaS)
2. **Scores** feasibility (0-10 based on complexity, budget, client history)
3. **Builds** working demos with Claude Code agents
4. **Deploys** to GitHub + Vercel
5. **Proposes** with live demo URL via Telegram approval flow

## Key Innovation

Unlike traditional Upwork proposals, this agent **builds the deliverable FIRST**, then proposes with a live demo link. This dramatically increases win rate by proving capability upfront.

## Architecture

```
┌─────────────────┐
│ Upwork Scanner  │ (UW-001) Safari automation :3104
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Feasibility     │ (UW-002) Score 0-10
│ Scorer          │         Threshold: 7
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Demo Builder    │ (UW-003) Claude Code agent
└────────┬────────┘         builds to /tmp/upwork-{id}/
         │
         ├─────► GitHub Push    (UW-004)
         ├─────► Vercel Deploy  (UW-005)
         └─────► Passport Backup (UW-006)
         │
         ▼
┌─────────────────┐
│ Proposal        │ (UW-007) "I already built this. Demo: ..."
│ Generator       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Telegram Gate   │ (UW-008, UW-009) /approve or /skip
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Auto-Submit     │ Submit to Upwork via Safari automation
└─────────────────┘
```

## Files

| File | Purpose |
|------|---------|
| `upwork-agent.js` | Main orchestrator |
| `upwork-keywords.json` | Search terms and filters |
| `upwork-queue.json` | Proposal queue (pending/approved/submitted) |
| `prompts/upwork-builder.md` | Claude Code prompt for building demos |
| `launch-upwork-agent.sh` | Start/stop/status script |
| `telegram-bot.js` | Approval handlers (/approve_ID, /skip_ID) |

## Configuration

### Required Environment Variables

```bash
# Safari Automation (Upwork service)
SAFARI_UPWORK_PORT=3104

# GitHub
GITHUB_TOKEN=ghp_...                    # For creating repos
GITHUB_ORG=isaiahdupree

# Vercel
VERCEL_TOKEN=...                        # For deployments
VERCEL_ORG=isaiahduprees-projects

# Telegram
TELEGRAM_BOT_TOKEN=...                  # For approval flow
TELEGRAM_CHAT_ID=...                    # Your chat ID
```

### Search Keywords (`upwork-keywords.json`)

```json
{
  "skills": ["landing page", "website", "saas", "automation"],
  "excludes": ["wordpress", "shopify", "data entry"],
  "budgetMin": 100,
  "budgetMax": 500
}
```

## Usage

### Start the Agent

```bash
# Start in daemon mode (2h scan cycle)
./harness/launch-upwork-agent.sh start

# Check status
./harness/launch-upwork-agent.sh status

# Stop
./harness/launch-upwork-agent.sh stop

# Run once (for testing)
node harness/upwork-agent.js --once
```

### Manual Operations

```bash
# View queue
cat harness/upwork-queue.json | jq '.[] | {title, status, demo_url}'

# Check logs
tail -f harness/logs/upwork-agent.log
```

### Telegram Commands

When a gig is ready for approval, you'll receive:

```
🎯 NEW UPWORK GIG — Score: 8/10
Title: "Build landing page for SaaS startup"
Budget: $350 fixed
Demo: https://upwork-demo-xyz.vercel.app
Code: https://github.com/isaiahdupree/upwork-demo-xyz

Reply: /approve_uw-123456 | /skip_uw-123456
```

Commands:
- `/approve_ID` - Submit proposal to Upwork
- `/skip_ID` - Mark as rejected, don't submit

## Scoring System (0-10)

| Criteria | Points |
|----------|--------|
| Landing page/website work | +3 |
| Has designs/UI/Figma | +2 |
| Has wireframes/prototype | +2 |
| Budget < $500 | +1 |
| Repeat client (5+ jobs) | +2 |

**Threshold:** 7+ = feasible, build demo

## Build Pipeline

For each feasible gig:

1. **Extract requirements** from description
2. **Spawn Claude Code agent** with `upwork-builder.md` prompt
3. **Build in** `/tmp/upwork-{gig_id}/`
4. **Git init + push** to `github.com/isaiahdupree/upwork-{gig_id}`
5. **Deploy** via `npx vercel --yes --prod`
6. **Backup** to `/Volumes/My Passport/clients/upwork/{gig_id}/`
7. **Generate proposal** with demo URL + GitHub link
8. **Send to Telegram** for approval

## Queue Schema

```json
[
  {
    "id": "uw-1709876543210",
    "gig_id": "~0123456789abcdef",
    "title": "Build landing page for SaaS",
    "budget": "$350 fixed",
    "score": 8,
    "demo_url": "https://upwork-demo-xyz.vercel.app",
    "github_url": "https://github.com/isaiahdupree/upwork-demo-xyz",
    "proposal_text": "I already built this. Demo: ... | Code: ...",
    "status": "pending_approval",
    "created_at": "2026-03-07T12:34:56Z",
    "approved_at": null
  }
]
```

**Status lifecycle:**
- `pending_approval` - Waiting for Telegram approval
- `approved` - Approved, ready to submit
- `submitted` - Submitted to Upwork
- `skipped` - Rejected, don't submit

## Feature List

All 13 features tracked in:
`harness/features/prd081-upwork-agent.json`

Progress: **0/13 complete**

## Dependencies

- **Safari Automation** (:3104) - Upwork search + proposal submission
- **Claude Code** - Demo building agents
- **GitHub CLI** (`gh`) - Repo creation
- **Vercel CLI** (`vercel`) - Deployments
- **Telegram Bot API** - Approval flow
- **Passport Drive** (optional) - Backups

## Testing

```bash
# Test Safari connection
curl http://localhost:3104/health

# Test GitHub CLI
gh auth status

# Test Vercel CLI
vercel whoami

# Test Telegram bot
curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe"
```

## Success Metrics

- **Scan rate:** 2h cycles
- **Build success:** >80% of feasible gigs build successfully
- **Approval rate:** >50% of builds get approved via Telegram
- **Win rate:** Track via Upwork (goal: 20%+ of submitted proposals)

## Roadmap

- [ ] **Phase 1:** UW-001 to UW-006 - Core pipeline (scan → build → deploy)
- [ ] **Phase 2:** UW-007 to UW-010 - Proposal gen + Telegram approval
- [ ] **Phase 3:** UW-011 to UW-013 - Daemon mode + API routes
- [ ] **Phase 4:** Analytics + win rate tracking in Supabase

## Related Projects

- **upwork-hunter** (`/Users/isaiahdupree/Documents/Software/Safari Automation/packages/upwork-hunter`) - Older RSS-based proposal generator (different approach)
- This project is **demo-first**, that one is **proposal-first**

---

**Last Updated:** 2026-03-07 (Initializer Session)
