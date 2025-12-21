# Agent Harness Comprehensive Guide

> A complete guide to building effective agent harnesses for long-running autonomous coding agents, based on Anthropic's official documentation and research.

## Table of Contents
1. [What is an Agent Harness?](#what-is-an-agent-harness)
2. [The Long-Running Agent Problem](#the-long-running-agent-problem)
3. [Two-Part Solution Architecture](#two-part-solution-architecture)
4. [Environment Management](#environment-management)
5. [The Agent Loop](#the-agent-loop)
6. [Implementation Guide](#implementation-guide)
7. [Best Practices](#best-practices)
8. [Multi-Agent Workflows](#multi-agent-workflows)
9. [Testing & Verification](#testing--verification)
10. [Integration with Your Dashboard](#integration-with-your-dashboard)

---

## What is an Agent Harness?

An **agent harness** is the infrastructure layer that wraps an AI agent, providing it with:
- **Context management** across multiple sessions
- **Environment setup** and state persistence
- **Tool access** (terminal, file system, browsers, APIs)
- **Verification mechanisms** to validate work
- **Recovery strategies** when things go wrong

The Claude Agent SDK is Anthropic's general-purpose agent harness, originally built for Claude Code but now powering many types of agents including research, video creation, and automation workflows.

### Key Design Principle
> "Give your agents a computer, allowing them to work like humans do."

By providing Claude with the same tools programmers use (terminal, file editing, linting, running code, debugging), it can complete complex multi-step tasks autonomously.

---

## The Long-Running Agent Problem

### The Core Challenge
Agents must work in **discrete sessions**, where each new session begins with **no memory** of what came before. Context windows are limited, and complex projects cannot be completed within a single window.

### Two Common Failure Modes

#### 1. One-Shotting
The agent tries to do too much at once, running out of context mid-implementation, leaving features half-done and undocumented. The next session must guess what happened and spend time fixing the broken state.

#### 2. Premature Completion
After some features are built, a later agent instance looks around, sees progress, and **declares the job done** prematurely.

### The Solution
A two-fold approach:
1. **Initializer Agent** - Sets up the environment on the first run
2. **Coding Agent** - Makes incremental progress each session, leaving clear artifacts for the next session

---

## Two-Part Solution Architecture

### Part 1: Initializer Agent

The very first session uses a specialized prompt to set up:

```
┌─────────────────────────────────────────────────────────────┐
│                    INITIALIZER AGENT                        │
├─────────────────────────────────────────────────────────────┤
│  1. Create init.sh script (starts dev servers, runs tests)  │
│  2. Create claude-progress.txt (session log file)           │
│  3. Create feature_list.json (comprehensive feature specs)  │
│  4. Make initial git commit                                 │
│  5. Document the project structure                          │
└─────────────────────────────────────────────────────────────┘
```

### Part 2: Coding Agent

Every subsequent session:

```
┌─────────────────────────────────────────────────────────────┐
│                     CODING AGENT                            │
├─────────────────────────────────────────────────────────────┤
│  1. Run pwd to orient                                       │
│  2. Read git logs and progress files                        │
│  3. Read feature list, choose highest-priority unfinished   │
│  4. Run init.sh to start dev server                         │
│  5. Verify basic functionality still works                  │
│  6. Implement ONE feature at a time                         │
│  7. Test end-to-end with browser automation                 │
│  8. Commit with descriptive message                         │
│  9. Update progress file                                    │
│  10. Mark feature as passing in feature_list.json           │
└─────────────────────────────────────────────────────────────┘
```

---

## Environment Management

### Feature List (feature_list.json)

A comprehensive JSON file of all required features, initially marked as failing:

```json
{
  "features": [
    {
      "id": "feat-001",
      "category": "functional",
      "description": "New chat button creates a fresh conversation",
      "priority": 1,
      "steps": [
        "Navigate to main interface",
        "Click the 'New Chat' button",
        "Verify a new conversation is created",
        "Check that chat area shows welcome state",
        "Verify conversation appears in sidebar"
      ],
      "passes": false
    },
    {
      "id": "feat-002",
      "category": "ui",
      "description": "Dark mode toggle switches theme correctly",
      "priority": 2,
      "steps": [
        "Click theme toggle button",
        "Verify background color changes",
        "Verify text color updates",
        "Verify icons update"
      ],
      "passes": false
    }
  ]
}
```

**Important Rules:**
- Use JSON (not Markdown) - models are less likely to inappropriately change JSON
- Features should only be edited by changing the `passes` field
- Use strongly-worded instructions: "It is unacceptable to remove or edit tests"

### Progress File (claude-progress.txt)

A running log of what each session accomplished:

```
=== Session 2024-12-20 19:30:00 ===
- Started dev server, verified basic chat functionality
- Implemented feature feat-003: Message streaming
- Fixed bug: Response text was not word-wrapping
- Committed: "feat: add real-time message streaming with word wrap fix"
- Next priority: feat-004 (conversation persistence)

=== Session 2024-12-20 18:00:00 ===
- Initial setup complete
- Created 47 feature specifications
- Set up React frontend with Vite
- Committed: "chore: initial project scaffold"
```

### Init Script (init.sh)

```bash
#!/bin/bash
# init.sh - Start the development environment

echo "Starting development environment..."

# Kill any existing processes on our ports
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:8080 | xargs kill -9 2>/dev/null

# Start backend
cd backend && npm run dev &
BACKEND_PID=$!

# Wait for backend
sleep 3

# Start frontend
cd ../frontend && npm run dev &
FRONTEND_PID=$!

# Wait for frontend
sleep 5

echo "Dev servers running:"
echo "  Backend: http://localhost:8080 (PID: $BACKEND_PID)"
echo "  Frontend: http://localhost:3000 (PID: $FRONTEND_PID)"

# Basic health check
curl -s http://localhost:8080/health > /dev/null && echo "✓ Backend healthy" || echo "✗ Backend failed"
curl -s http://localhost:3000 > /dev/null && echo "✓ Frontend healthy" || echo "✗ Frontend failed"
```

---

## The Agent Loop

The core feedback loop for any agent:

```
┌──────────────────┐
│  GATHER CONTEXT  │
│  - Read files    │
│  - Check logs    │
│  - Search code   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   TAKE ACTION    │
│  - Write code    │
│  - Run commands  │
│  - Use tools     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  VERIFY WORK     │
│  - Run tests     │
│  - Visual check  │
│  - Lint code     │
└────────┬─────────┘
         │
         ▼
      REPEAT
```

### Context Gathering Methods

| Method | Description | Best For |
|--------|-------------|----------|
| **Agentic Search** | Use bash tools (grep, tail, find) to locate info | Large files, logs |
| **Semantic Search** | Vector embeddings for concept search | Fast retrieval, varied queries |
| **Subagents** | Parallel workers with isolated context | Large document analysis |
| **Compaction** | Auto-summarize when context fills | Long-running sessions |

### Action Tools

| Tool Type | Examples | Use Case |
|-----------|----------|----------|
| **Custom Tools** | fetchInbox, searchEmails | Primary frequent actions |
| **Bash/Scripts** | Shell commands, Python scripts | Flexible general-purpose work |
| **Code Generation** | Write Python/JS to process data | Complex reliable operations |
| **MCPs** | Slack, GitHub, Google Drive | External service integration |

### Verification Methods

| Method | Description | Example |
|--------|-------------|---------|
| **Rules-Based** | Formal rules that fail with clear errors | TypeScript linting, email validation |
| **Visual Feedback** | Screenshots of rendered output | UI testing with Puppeteer/Playwright |
| **LLM as Judge** | Another model evaluates output | Tone checking, quality assessment |

---

## Implementation Guide

### Step 1: Create Your Harness Structure

```
your-project/
├── harness/
│   ├── initializer.js      # First-run setup
│   ├── coding-agent.js     # Main coding loop
│   ├── prompts/
│   │   ├── initializer.md  # Initializer system prompt
│   │   └── coding.md       # Coding agent system prompt
│   └── tools/
│       ├── browser.js      # Puppeteer/Playwright wrapper
│       ├── git.js          # Git operations
│       └── testing.js      # Test runners
├── claude-progress.txt
├── feature_list.json
├── init.sh
└── src/
    └── ... your app code
```

### Step 2: Initializer Agent Prompt

```markdown
# Initializer Agent System Prompt

You are setting up a new project for autonomous development. Your job is to:

1. **Understand the Requirements**
   - Read the user's high-level prompt carefully
   - Break it down into 50-200 specific, testable features
   - Prioritize features (core functionality first)

2. **Create Environment Files**
   - `feature_list.json`: All features with `passes: false`
   - `claude-progress.txt`: Empty, ready for session logs
   - `init.sh`: Script to start dev environment
   - `CLAUDE.md`: Instructions for future coding agents

3. **Set Up the Codebase**
   - Initialize the project with appropriate tooling
   - Create basic folder structure
   - Set up linting and type checking
   - Make initial git commit

4. **Document Everything**
   - Write clear README
   - Document how to run the project
   - Explain the feature list format

DO NOT implement any features. Only set up the environment.
```

### Step 3: Coding Agent Prompt

```markdown
# Coding Agent System Prompt

You are continuing work on an autonomous coding project. Each session:

## Getting Oriented (ALWAYS DO THIS FIRST)
1. Run `pwd` to confirm your working directory
2. Read `claude-progress.txt` to see recent work
3. Read `feature_list.json` to see what's done/pending
4. Run `git log --oneline -10` to see recent commits
5. Run `./init.sh` to start the dev environment
6. Use browser automation to verify basic functionality works

## Working on Features
1. Choose the highest-priority feature with `passes: false`
2. Implement ONLY that one feature
3. Test it end-to-end using browser automation
4. If tests pass, update `feature_list.json` to `passes: true`
5. Commit with a descriptive message
6. Update `claude-progress.txt` with what you did

## Rules
- NEVER remove or edit feature descriptions
- NEVER mark a feature as passing without testing it
- ALWAYS leave the codebase in a working state
- ALWAYS commit before your session ends
- If you break something, fix it before continuing

## Clean State Requirement
Before ending your session, ensure:
- All code compiles/runs without errors
- No half-implemented features
- Progress file is updated
- Latest changes are committed
```

### Step 4: Run the Harness

```javascript
// harness/run.js
import { spawn } from 'child_process';
import fs from 'fs';

const PROGRESS_FILE = 'claude-progress.txt';
const FEATURE_LIST = 'feature_list.json';

function isFirstRun() {
  return !fs.existsSync(PROGRESS_FILE) || !fs.existsSync(FEATURE_LIST);
}

function getPrompt() {
  if (isFirstRun()) {
    return fs.readFileSync('harness/prompts/initializer.md', 'utf-8');
  }
  return fs.readFileSync('harness/prompts/coding.md', 'utf-8');
}

function runAgent() {
  const prompt = getPrompt();
  const sessionType = isFirstRun() ? 'INITIALIZER' : 'CODING';
  
  console.log(`Starting ${sessionType} session...`);
  
  // Using Claude Code in headless mode
  const claude = spawn('claude', [
    '-p', prompt,
    '--allowedTools', 'Edit', 'Bash', 'Read', 'Write',
    '--output-format', 'stream-json'
  ]);
  
  claude.stdout.on('data', (data) => {
    process.stdout.write(data);
  });
  
  claude.on('close', (code) => {
    console.log(`Session ended with code ${code}`);
    // Schedule next session or report status
  });
}

runAgent();
```

---

## Best Practices

### 1. Incremental Progress
- Work on ONE feature at a time
- Never leave features half-implemented
- Commit frequently with descriptive messages

### 2. Clean State
- Every session should leave code that could be merged to main
- No major bugs, orderly code, well-documented
- A developer could easily pick up and continue

### 3. Testing
- Always verify features end-to-end
- Use browser automation (Puppeteer MCP) for UI testing
- Don't mark features as done without actual testing

### 4. Context Management
- Use progress files and git history for session memory
- Keep feature lists in JSON (harder to accidentally modify)
- Use compaction for long-running sessions

### 5. Environment Setup
- Create init.sh scripts for consistent startup
- Test basic functionality before starting new work
- Fix any broken state immediately

---

## Multi-Agent Workflows

### Pattern 1: Writer + Reviewer
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Claude 1  │────▶│   Claude 2  │────▶│   Claude 3  │
│  (Writer)   │     │  (Reviewer) │     │   (Editor)  │
└─────────────┘     └─────────────┘     └─────────────┘
```

### Pattern 2: Parallel Workers
```
┌─────────────┐
│   Claude 1  │──── Feature A
├─────────────┤
│   Claude 2  │──── Feature B (git worktree)
├─────────────┤
│   Claude 3  │──── Feature C (git worktree)
└─────────────┘
```

### Pattern 3: Fanning Out (Headless Mode)
```javascript
// For large migrations or batch processing
const tasks = generateTaskList(); // e.g., 2000 files to migrate

for (const task of tasks) {
  spawn('claude', [
    '-p', `Migrate ${task.file} from React to Vue. Return OK or FAIL.`,
    '--allowedTools', 'Edit', 'Bash(git commit:*)'
  ]);
}
```

### Pattern 4: Pipeline Integration
```bash
# Integrate Claude into data pipelines
claude -p "Analyze this CSV and extract insights" --json | jq '.insights' | next_step
```

---

## Testing & Verification

### End-to-End Testing with Puppeteer

```javascript
// Example: Test that new chat button works
async function testNewChatButton(page) {
  await page.goto('http://localhost:3000');
  await page.click('[data-testid="new-chat-button"]');
  
  // Verify new conversation created
  const chatArea = await page.$('[data-testid="chat-area"]');
  const welcomeState = await chatArea.evaluate(el => 
    el.textContent.includes('Start a new conversation')
  );
  
  if (!welcomeState) {
    throw new Error('New chat did not show welcome state');
  }
  
  // Verify sidebar updated
  const sidebarItem = await page.$('[data-testid="conversation-item"]');
  if (!sidebarItem) {
    throw new Error('New conversation not in sidebar');
  }
  
  return true;
}
```

### Visual Verification
- Take screenshots at key states
- Compare against expected layouts
- Check for layout issues, color problems, missing elements

### Automated Checks
- TypeScript compilation (type errors)
- ESLint (code style)
- Unit tests (logic)
- Integration tests (API)
- E2E tests (full user flows)

---

## Integration with Your Dashboard

Your existing autonomous-coding-dashboard can be enhanced to work with agent harnesses:

### 1. Read Agent Progress
```javascript
// Parse claude-progress.txt for dashboard display
function parseProgressFile(content) {
  const sessions = content.split(/=== Session .+ ===/g).filter(Boolean);
  return sessions.map(session => {
    const lines = session.trim().split('\n');
    return {
      actions: lines.filter(l => l.startsWith('- ')),
      timestamp: extractTimestamp(session)
    };
  });
}
```

### 2. Track Feature Completion
```javascript
// Read feature_list.json for progress metrics
function getFeatureStats() {
  const features = JSON.parse(fs.readFileSync('feature_list.json'));
  const total = features.length;
  const passing = features.filter(f => f.passes).length;
  return {
    total,
    passing,
    pending: total - passing,
    percentComplete: ((passing / total) * 100).toFixed(1)
  };
}
```

### 3. Real-Time Status Updates
```javascript
// Watch for file changes and update dashboard
const chokidar = require('chokidar');

chokidar.watch(['claude-progress.txt', 'feature_list.json'])
  .on('change', (path) => {
    const status = getLatestStatus();
    broadcastToClients(status); // WebSocket update
  });
```

---

## The Two Unsolved Problems (From Video Research)

Based on video transcripts from Cole Medin's research:

### Problem 1: Bounded Attention (Context Rot)

The "dumb zone" occurs when LLMs get overwhelmed with too much context.

**What's partially solved:**
- Memory compaction
- Progress files for offloading
- Sub-agents for isolation

**What's still missing:**
- **Optimal summarization** - Progress files often miss critical info
- **Predictive context** - Can't predict which observation becomes critical later
- **Cross-session continuity** - Same mistakes propagate if handoffs don't include resolution details

> "One thing that happens with harnesses a lot is the same mistake will happen over and over again, because if the handoff doesn't include how it resolved that, it propagates throughout the system."

### Problem 2: Reliability Compounding

```
Single agent reliability: 95%
20-step system reliability: 0.95^20 = 36%
200-step system reliability: ~0%

For full autonomy need: 99.9% per step
```

**Solution:** Strategic human checkpoints - easy injection points for quick validation, then auto-continue.

---

## Real-World Results: 24-Hour Coding Experiment

From the "Claude 24 Hours NONSTOP" experiment:

| Metric | Result |
|--------|--------|
| Duration | 24 hours |
| Sessions | 54 coding agent sessions |
| Features Passing | 54% (100+ features) |
| Application | Full claude.ai clone with chat, themes, code execution |

**Key Learnings:**
- Feature-by-feature approach prevented overwhelming
- Git integration enabled rollback on failures  
- Puppeteer MCP for visual verification was crucial
- Maintained alignment even after 54 sessions
- Didn't hallucinate or go off-track late in execution

---

## Video Sources & References

This guide synthesizes information from:

1. **"Are Agent Harnesses Bringing Back Vibe Coding?"** (Cole Medin)
   - URL: https://www.youtube.com/watch?v=13HP_bSeNjU
   - Topics: Agent harnesses, prompt→context→harness evolution, unsolved problems
   - **Full transcript:** See `VIDEO_INSIGHTS_TRANSCRIPT.md`

2. **"I Forced Claude to Code for 24 Hours NONSTOP"** (Cole Medin)
   - URL: https://www.youtube.com/watch?v=usQ2HBTTWxs
   - Topics: Long-running autonomous coding, 54-session experiment results
   - **Full transcript:** See `VIDEO_INSIGHTS_TRANSCRIPT.md`

3. **Anthropic Official Documentation:**
   - [Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
   - [Claude Code Best Practices](https://www.anthropic.com/engineering/claude-code-best-practices)
   - [Building Agents with Claude Agent SDK](https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk)
   - [Autonomous Coding Quickstart](https://github.com/anthropics/claude-quickstarts/tree/main/autonomous-coding)

---

## Quick Start Checklist

- [ ] Create `feature_list.json` with all features marked `passes: false`
- [ ] Create `claude-progress.txt` (empty or with header)
- [ ] Create `init.sh` to start your dev environment
- [ ] Create `CLAUDE.md` with project-specific instructions
- [ ] Set up initializer agent prompt
- [ ] Set up coding agent prompt
- [ ] Configure browser automation (Puppeteer MCP)
- [ ] Create harness runner script
- [ ] Integrate with dashboard for monitoring
- [ ] Test the full loop manually first

---

*Generated for the Autonomous Coding Dashboard project - December 2024*
