# Justfile — Agentic Browser Automation & UI Testing
# Install: brew install just
# Usage: j <recipe>

BASE_URL := env_var_or_default("BASE_URL", "http://localhost:3000")
RESULTS_DIR := "e2e/results"

# ── Agentic Browser Automation ────────────────────────────────

# Run agentic UI review — parallel sub-agents, one per user story
ui-review:
    @mkdir -p {{RESULTS_DIR}}/screenshots
    claude --dangerously-skip-permissions \
      -p "$(cat .claude/commands/ui-review.md) Base URL: {{BASE_URL}}"

# Run browser automation task list (pass task file or inline tasks)
automate tasks="e2e/automation-tasks.md":
    @mkdir -p {{RESULTS_DIR}}/screenshots
    claude --dangerously-skip-permissions \
      -p "$(cat .claude/commands/automate.md) Task list file: {{tasks}}. Execute all tasks against {{BASE_URL}}."

# Run a single user story (quick test)
story description="" url=BASE_URL:
    @mkdir -p {{RESULTS_DIR}}/screenshots
    claude --dangerously-skip-permissions \
      -p "$(cat .claude/agents/ui-tester.md) Story: {{description}} Base URL: {{url}}"

# ── Traditional Playwright Tests ──────────────────────────────

# Run all playwright tests
test:
    npx playwright test

# Run agentic test project only
test-agentic:
    npx playwright test --project=agentic

# Run specific test file
test-file file="":
    npx playwright test {{file}}

# Run tests in UI mode
test-ui:
    npx playwright test --ui

# Run tests in headed mode (watch browser)
test-headed:
    npx playwright test --headed

# Open last playwright report
report:
    npx playwright show-report

# ── ACD Dispatch Commands ─────────────────────────────────────

# Dispatch: natural language to running agent (interactive)
dispatch description="":
    @claude -s dispatch "{{description}}"

# Check status of running agent
status slug="":
    @if [ -z "{{slug}}" ]; then \
        echo "Usage: just status <slug>"; \
        exit 1; \
    fi; \
    claude -s acd-mcp-server -c "acd_status {{slug}}" && \
    claude -s acd-mcp-server -c "acd_logs {{slug}}"

# List all running agents with progress
running:
    @claude -s acd-mcp-server -c "acd_list_running"

# ── Dev Utilities ─────────────────────────────────────────────

# Start dev server (required before running tests locally)
dev:
    cd backend && npm run dev

# Install playwright browsers
install-browsers:
    npx playwright install

# Benchmark Agent Teams vs Single Claude vs Swarm (3 parallel Python utils)
benchmark-agent-teams:
    @chmod +x scripts/benchmark-agent-teams.sh
    bash scripts/benchmark-agent-teams.sh

# Enable Claude Code Agent Teams (OAuth/Claude Max — no API key needed)
enable-agent-teams:
    CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 claude --dangerously-skip-permissions \
      -p "$(cat .claude/commands/enable-agent-teams.md)"

# Test that Agent Teams are active in current session
agent-teams-test:
    CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 claude --dangerously-skip-permissions \
      -p "Verify Agent Teams are enabled. Check ~/.claude/settings.json for CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS. Report: enabled or not enabled."

# Show available recipes
help:
    @just --list

# ── CI / Batch ────────────────────────────────────────────────

# Full CI run: traditional tests + agentic review
ci: test
    @echo "Traditional tests done. Running agentic review..."
    just ui-review

# Quick smoke test (agentic, just first 3 stories)
smoke:
    claude --dangerously-skip-permissions \
      -p "Run only the first 3 stories from e2e/user-stories.md against {{BASE_URL}}. Use .claude/agents/ui-tester.md spec per story."
