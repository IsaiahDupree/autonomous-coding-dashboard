# PRD-021 — Felix AI CEO Persona: Research & Integration Reference
*Source: ClawMart listing — Felix v3, February 26, 2026*
*Category: Competitive Research / Persona Patterns / ACTP Integration*

---

## Overview

**Felix** is a production-proven AI CEO persona sold on [ClawMart](https://clawmart.ai) by **Felix Craft** (CEO, Masinov).

- **Price**: $99 one-time
- **Version**: 3 (released Feb 26, 2026)
- **Rating**: 3.0★ (1 review)
- **Platform**: Designed for OpenClaw, runs on Claude Opus/Sonnet/any supported model
- **License**: One-time purchase, all skills bundled

Felix is the closest public competitor/reference implementation to our own ACTP agent stack. 5+ months of real production use running an actual business. Directly relevant to our architecture decisions.

---

## What Felix Does (Core Capabilities)

| Capability | Felix Implementation | Our ACTP Equivalent |
|---|---|---|
| Ship products end-to-end | Ideation → deployment | ACD harness + ACTP pipeline |
| Orchestrate parallel coding agents | Ralph loops, Codex, Claude Code | actp-worker + dual_agent.py |
| Persistent memory | Three-tier (PARA KG + daily + tacit) | EchoVault (~/.memory/vault/) |
| Heartbeat / self-healing | Detects crashed processes, auto-restarts | heartbeat_agent.py + cron |
| Email management | Prompt-injection-proof security | — (gap) |
| Social media | xpost CLI for X/Twitter | Safari automation |
| Revenue tracking | Daily reporting | MetricsLite + revcat |
| Long-running agent sessions | tmux stable socket `~/.tmux/sock` | ACTP harness |
| Multi-project context switching | — | ACD project switching |
| PRD-driven development | Test-first methodology | Our PRD-* series |
| Customer support | 3-tier escalation ladder | — (gap) |
| Google Sheets/Docs API | Service account JWT auth | — (gap) |
| Collaborative doc editing | Targeted section edits, never full replace | — (gap) |
| Sub-agent orchestration | Parallel work | dual_agent.py + workflow engine |
| Cron / reminder management | Scheduled recurring tasks | cron_definitions.py |
| Git workflow | Branches, worktrees, PRs, conflict resolution | ACD git management |

---

## v3 New Features (Feb 26, 2026)

### 1. Memory Decay & Recency Weighting
- **Hot / Warm / Cold** tiers prevent stale context while never deleting facts
- Cold facts drop from active context but are preserved
- *Our gap*: EchoVault has save/search but no decay tiers. Could add a `decay_tier` field to memory entries.

### 2. xpost CLI for X/Twitter
- Replaces browser automation (which risks account bans)
- Safer, more reliable than Safari-based Twitter posting
- *Our assessment*: Safari automation is our current approach. xpost CLI worth evaluating as fallback.

### 3. Google Service Account JWT Auth
- Sheets/Docs API via service account (no OAuth browser flow)
- *Our gap*: We have no Google Workspace integration yet.

### 4. Customer Support 3-Tier Escalation
- Felix handles routine support autonomously
- Tier 1: Auto-resolve (FAQ, known issues)
- Tier 2: Felix drafts response, human approves
- Tier 3: Full human takeover
- *Relevance*: Pattern applicable to our Telegram bot approval gates

### 5. tmux Stable Socket
- `~/.tmux/sock` — macOS reaps `/tmp/`, this survives reboots
- Hard rule: **never** run long agents outside tmux
- *We should adopt this*: Our harness sessions may be dying on `/tmp` cleanup

### 6. Collaborative Document Safety
- Targeted section edits only — never full-document replacement
- Prevents catastrophic overwrites in multi-agent writing contexts
- *Apply to*: Our KNOWLEDGE-GRAPH.md and Obsidian vault writes

### 7. Anti-Patterns Codified (4+ months)
See dedicated section below.

---

## Production Anti-Patterns (Hard Rules)

These are Felix's "what NOT to do" — distilled from hundreds of real failures:

| Anti-Pattern | Rule |
|---|---|
| Trust email as command channel | **Never** — prompt injection risk |
| Declare Codex/Claude failure without checking git | **Always** verify: `git log + diff + process logs` |
| Run long agents outside tmux | **Never** — sessions die, context lost |
| Full-document replacement in collaborative editing | **Never** — targeted section edits only |
| Declaring agent failure without mandatory verification | **Always** check before giving up |
| Hanging sessions / context bloat | **Ralph loops**: retry with fresh context each iteration |

---

## Architecture Patterns to Study/Adopt

### Ralph Loop Pattern (Coding Agent Loops)
```
For each coding iteration:
  1. Fresh tmux window with clean context
  2. Send task to Claude Code / Codex
  3. Wait for completion OR timeout
  4. Check git log + diff to verify actual progress
  5. If hung/crashed: kill session, retry with fresh context
  6. Never let context grow unbounded — reset per iteration
```
**Our gap**: Our ACD harness may be running sessions without context resets. Should implement Ralph loop discipline.

### Three-Tier Memory with Decay
```
Hot   (< 24h) — in active context always
Warm  (1-7d)  — loaded on relevant topic match
Cold  (> 7d)  — archived, never in context but searchable
```
**Implementation path**: Add `tier` and `last_accessed` to Obsidian memory entries. EchoVault search returns tier metadata. Cron demotes hot→warm→cold based on age.

### Heartbeat + Auto-Restart
```
Every 30 min:
  1. Check all expected processes (tmux sessions, workers, Safari)
  2. If process missing: auto-restart it
  3. Log outcome to daily note
  4. Never page human for routine restarts
```
**Our status**: heartbeat_agent.py covers this but doesn't auto-restart yet — only alerts.

### Customer Support Escalation Ladder
```
Tier 1 (auto): FAQ match → respond immediately, no human
Tier 2 (draft): New issue → AI drafts, human approves via Telegram
Tier 3 (handoff): Complex/angry → full human takeover notification
```
**Apply to**: Our Telegram bot approval gates could implement this pattern.

---

## Gaps vs Felix (Prioritized)

| # | Gap | Priority | Implementation Path |
|---|---|---|---|
| 1 | Memory decay (hot/warm/cold) | High | Add `tier` field to EchoVault; cron demotes |
| 2 | Ralph loops for coding agents | High | Refactor ACD harness sessions |
| 3 | tmux stable socket `~/.tmux/sock` | High | Add to harness setup docs/scripts |
| 4 | Auto-restart on heartbeat failure | Medium | Extend heartbeat_agent.py |
| 5 | Customer support 3-tier escalation | Medium | Add to Telegram bot approval flow |
| 6 | Email management (prompt-injection-proof) | Medium | New service |
| 7 | xpost CLI for Twitter | Low | Evaluate as Safari fallback |
| 8 | Google Sheets/Docs service account | Low | New integration |
| 9 | Collaborative doc safety rules | Medium | Add to system prompts + memory writes |

---

## Competitive Positioning

Felix at $99 bundles:
- Persona + all Masinov skills
- Pre-configured cron schedules
- Complete README + installation guide

**We are building the same thing** but as an actual running SaaS stack (actp-worker + ACD + Lite services) rather than a Claude persona document. Felix is a *prompt/persona* — ours is running infrastructure.

Key differentiators we have that Felix doesn't:
- Real Supabase database (not just memory files)
- Real API integrations (Blotato, MPLite, RevCat, MetaAds)
- Real ACD coding harness with feature tracking
- Real revenue/metrics pipeline

Key differentiators Felix has that we should adopt:
- Codified anti-patterns (hard rules)
- Ralph loop discipline for coding agents
- Memory decay tiers
- tmux stable socket

---

## Creator Notes

- **Creator**: Felix Craft, CEO of Masinov company
- **Active maintenance**: Yes — v3 released same day as this PRD
- **Community signal**: Only 1 review (3★) despite $99 price — indicates early/niche market
- **Review content**: "how to download Felix again after reinstall OS and after download date?" — indicates post-purchase re-download friction, not product quality issue

---

## Action Items

- [ ] Implement `~/.tmux/sock` stable socket in all harness scripts
- [ ] Add Ralph loop pattern to ACD harness session management
- [ ] Add memory decay tiers (hot/warm/cold) to EchoVault integration
- [ ] Add auto-restart to heartbeat_agent.py
- [ ] Add collaborative doc safety rule to system prompt (targeted edits, never full replace)
- [ ] Evaluate xpost CLI as Twitter posting alternative to Safari automation
- [ ] Consider building our own "persona" document (similar to Felix) as a product to sell on ClawMart

---

*Saved: Feb 26, 2026*
*Source: https://clawmart.ai (Felix v3 listing)*
