# Self-Improving Automation Loop

**PRD-084 Implementation** — All 11 features complete (100%)

## Overview

A self-improving automation system that:
- Collects live KPIs from LinkedIn, DM queues, Upwork, and business goals
- Uses Claude Haiku to identify bottlenecks and recommend actions
- Auto-executes high-confidence improvements (>0.9)
- Routes low-confidence actions to human approval via Telegram
- Tracks strategy performance and DM template A/B testing

## Features

✅ **IL-001**: KPI Collector — Reads state files and produces metrics snapshot
✅ **IL-002**: Claude Haiku Analysis — Structured bottleneck analysis
✅ **IL-003**: Auto-Executor — Applies high-confidence actions (allowlist)
✅ **IL-004**: Approval Queue — Telegram notifications for low-confidence actions
✅ **IL-005**: Strategy Performance Tracker — Per-strategy stats in linkedin-daemon-state.json
✅ **IL-006**: DM Template A/B Tracker — Reply rate tracking, auto-swap lowest performer
✅ **IL-007**: Improvement Log — NDJSON log of all analysis cycles
✅ **IL-008**: Daemon Mode — Runs every 6h, hot-reloads business-goals.json
✅ **IL-009**: Launch Script — `launch-improvement-loop.sh start|stop|status`
✅ **IL-010**: Backend API — 4 routes in live-ops-server.js
✅ **IL-011**: Dashboard Tab — Business Goals tab at http://localhost:3456

## Files

```
harness/
├── improvement-loop.js              # Main daemon (IL-001 to IL-008)
├── launch-improvement-loop.sh       # Control script (IL-009)
├── strategy-performance-tracker.js  # IL-005 implementation
├── dm-template-ab-tracker.js        # IL-006 implementation
├── improvement-log.ndjson           # Analysis cycle log (IL-007)
├── improvement-pending.json         # Approval queue (IL-004)
├── live-ops-server.js               # Dashboard + API routes (IL-010, IL-011)
```

## Usage

### Start the daemon

```bash
bash harness/launch-improvement-loop.sh start
```

Runs every 6 hours. Logs to `harness/logs/improvement-loop.log`.

### Run a single cycle (manual)

```bash
node harness/improvement-loop.js once
```

### Check status

```bash
bash harness/launch-improvement-loop.sh status
```

### View dashboard

Open http://localhost:3456 and click the **Goals** tab.

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/improvement/status` | GET | Last cycle results + daemon status |
| `/api/improvement/log` | GET | Last 20 analysis cycles |
| `/api/improvement/pending` | GET | Pending approval queue |
| `/api/improvement/run` | POST | Trigger a manual cycle |
| `/api/improvement/approve` | POST | Approve a pending action |

## Action Allowlist

Auto-executed if confidence > 0.9:

- `adjust_icp_threshold` — Changes LinkedIn prospect filtering threshold
- `swap_search_strategy` — Rotates to next LinkedIn search strategy
- `update_message_template` — Adds new DM template variant
- `change_daily_limit` — Adjusts daily DM sending limits

## Configuration

### Environment Variables

```bash
# Required for Haiku analysis
export ANTHROPIC_API_KEY="sk-ant-..."

# Optional: Telegram notifications for low-confidence actions
export TELEGRAM_BOT_TOKEN="..."
export TELEGRAM_CHAT_ID="..."
```

### State Files

- `harness/linkedin-daemon-state.json` — LinkedIn daemon state + strategy performance
- `harness/dm-outreach-state.json` — DM send counts + template A/B stats
- `harness/linkedin-dm-queue.json` — LinkedIn DM queue
- `harness/upwork-queue.json` — Upwork proposal queue
- `/Users/isaiahdupree/Documents/Software/business-goals.json` — Business targets

## Dashboard

The **Goals** tab shows:

- Revenue gap vs target ($5K/month)
- Weekly progress bars (DMs sent, Upwork proposals)
- KPIs vs targets table
- Revenue breakdown bar chart
- Recent auto-adjustments table
- Pending approvals (with approve/skip buttons)
- Manual cycle trigger button

## Strategy Performance Tracking (IL-005)

```javascript
import { updateStrategyPerformance, getTopStrategies } from './strategy-performance-tracker.js';

// Update after each LinkedIn cycle
updateStrategyPerformance(strategyIndex, success, qualifiedCount, totalProspects);

// Get top 3 performers
const top = getTopStrategies();
// Returns: [{ strategyIndex: 2, qualifiedRate: 85, attempts: 10 }, ...]
```

Stored in `linkedin-daemon-state.json`:

```json
{
  "strategy_performance": {
    "strategy_0": {
      "attempts": 5,
      "successes": 4,
      "total_prospects": 20,
      "total_qualified": 15,
      "qualified_rate": 75,
      "last_used": "2026-03-07T19:00:00.000Z"
    }
  }
}
```

## DM Template A/B Tracking (IL-006)

```javascript
import { trackDmSend, trackDmReply, checkAndSwapLowestPerformer } from './dm-template-ab-tracker.js';

// Track a send
trackDmSend('linkedin', 'v1');

// Track a reply
trackDmReply('linkedin', 'v1');

// After 20 sends per variant, check for swap
const swapResult = checkAndSwapLowestPerformer('linkedin');
// Returns: { platform, swapped_out: 'v2', reply_rate: 2.5, message: '...' }
```

Stored in `dm-outreach-state.json`:

```json
{
  "template_ab": {
    "linkedin_v1": {
      "platform": "linkedin",
      "variant": "v1",
      "sent": 25,
      "replied": 3,
      "reply_rate": 12.0
    }
  },
  "archived_variants": [
    {
      "platform": "linkedin",
      "variant": "v2",
      "sent": 22,
      "replied": 1,
      "reply_rate": 4.5,
      "archived_at": "2026-03-07T18:00:00.000Z",
      "reason": "low_performance"
    }
  ]
}
```

## Testing

### Test KPI collector

```bash
node harness/improvement-loop.js once
# Check harness/improvement-log.ndjson for results
```

### Test strategy tracking

```bash
node harness/strategy-performance-tracker.js update 2 1 10 15
node harness/strategy-performance-tracker.js top
```

### Test DM A/B tracking

```bash
node harness/dm-template-ab-tracker.js send linkedin v1
node harness/dm-template-ab-tracker.js reply linkedin v1
node harness/dm-template-ab-tracker.js summary linkedin
```

## Logs

- `harness/logs/improvement-loop.log` — Daemon output
- `harness/improvement-log.ndjson` — Analysis cycle history
- `harness/improvement-pending.json` — Actions awaiting approval

## Next Steps

1. Set `ANTHROPIC_API_KEY` in environment or harness/.env
2. Optionally set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` for notifications
3. Start the daemon: `bash harness/launch-improvement-loop.sh start`
4. Open dashboard at http://localhost:3456 → Goals tab
5. Monitor improvement-log.ndjson for auto-adjustments

---

**Status**: ✅ 11/11 features complete (100%)
**Last updated**: 2026-03-07
