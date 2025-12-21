# Agent Harness Implementation Roadmap

> Phased plan to transform the Autonomous Coding Dashboard into a fully functional agent harness system.

## Current State Assessment

### What We Have ✅

| Component | Status | Location |
|-----------|--------|----------|
| **Frontend Dashboard** | Basic UI with charts | `index.html`, `app.js`, `index.css` |
| **Backend API** | Express + Prisma + Socket.IO | `backend/src/index.ts` |
| **Database Schema** | Projects, Features, WorkItems, AgentRuns | `backend/prisma/schema.prisma` |
| **Real-time Updates** | Socket.IO + Redis pub/sub | Backend integrated |
| **Feature Sync** | Syncs from `feature_list.json` | `POST /api/projects/:id/features/sync` |
| **Agent Run Proxy** | Proxies to Python agent service | `POST /api/projects/:id/agent-runs` |
| **Harness Scripts** | Runner + prompts created | `harness/` directory |
| **Documentation** | Comprehensive guides | `AGENT_HARNESS_GUIDE.md`, `VIDEO_INSIGHTS_TRANSCRIPT.md` |

### What We Need 🔲

- [ ] Live harness process management (start/stop/monitor)
- [ ] Real-time log streaming from agent sessions
- [ ] Human-in-the-loop approval gates
- [ ] Progress file watching and parsing
- [ ] Git integration for commit history
- [ ] Browser automation integration (Puppeteer MCP)
- [ ] Multi-project harness orchestration
- [ ] Session continuity across context windows

---

## Phase 1: Core Harness Backend (Week 1-2)

**Goal:** Make the harness actually runnable and monitorable from the dashboard.

### 1.1 Harness Process Manager

Create a service that spawns and manages harness processes.

```
backend/services/harness-manager.ts
├── startHarness(projectId, options)
├── stopHarness(projectId)
├── getHarnessStatus(projectId)
├── streamLogs(projectId) → AsyncGenerator
└── Process lifecycle management
```

**Tasks:**
- [ ] Create `HarnessManager` class with child_process spawning
- [ ] Track running processes by project ID
- [ ] Implement graceful shutdown with cleanup
- [ ] Store process PID in Redis for recovery after server restart
- [ ] Add health check ping mechanism

### 1.2 File Watcher Service

Watch harness artifact files for changes and emit events.

```
backend/services/file-watcher.ts
├── watchProject(projectPath)
├── onFeatureListChange → emit 'features:updated'
├── onProgressChange → emit 'progress:updated'
├── onGitCommit → emit 'git:commit'
└── Debounced updates to prevent spam
```

**Tasks:**
- [ ] Use `chokidar` to watch `feature_list.json`, `claude-progress.txt`
- [ ] Parse changes and emit structured events
- [ ] Connect to Socket.IO for real-time frontend updates
- [ ] Handle file creation/deletion edge cases

### 1.3 API Endpoints for Harness Control

```typescript
// New routes in backend/src/index.ts

POST   /api/projects/:id/harness/start   // Start harness
POST   /api/projects/:id/harness/stop    // Stop harness
GET    /api/projects/:id/harness/status  // Get status
GET    /api/projects/:id/harness/logs    // SSE log stream
POST   /api/projects/:id/harness/approve // Human approval gate
```

**Tasks:**
- [ ] Implement start endpoint with options (continuous, maxSessions)
- [ ] Implement stop endpoint with graceful vs force options
- [ ] Status endpoint returns: running/idle/error, session count, last update
- [ ] SSE endpoint for streaming logs to frontend
- [ ] Store harness config per project in database

### 1.4 Database Schema Updates

```prisma
model HarnessConfig {
  id              String   @id @default(cuid())
  projectId       String   @unique
  project         Project  @relation(fields: [projectId], references: [id])
  
  maxSessions     Int      @default(100)
  sessionDelayMs  Int      @default(5000)
  autoStart       Boolean  @default(false)
  continuous      Boolean  @default(false)
  
  // Prompt customization
  initializerPrompt  String?  @db.Text
  codingPrompt       String?  @db.Text
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model HarnessSession {
  id          String   @id @default(cuid())
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id])
  
  sessionNumber    Int
  sessionType      String   // 'initializer' | 'coding'
  status           String   // 'running' | 'completed' | 'failed'
  
  featuresAtStart  Int
  featuresAtEnd    Int?
  
  startedAt   DateTime @default(now())
  endedAt     DateTime?
  
  logFile     String?  // Path to session log
  
  @@index([projectId, sessionNumber])
}
```

---

## Phase 2: Dashboard Integration (Week 2-3)

**Goal:** Connect the frontend to real harness data and controls.

### 2.1 Replace Mock Data with Live Data

**Tasks:**
- [ ] Create `HarnessService` class in frontend for API calls
- [ ] Replace `mockData` with real API responses
- [ ] Add loading states and error handling
- [ ] Implement polling fallback when WebSocket disconnects

### 2.2 Real-Time Updates via Socket.IO

```javascript
// Frontend socket connection
const socket = io('http://localhost:3001');

socket.on('connect', () => {
  socket.emit('subscribe', projectId);
});

socket.on('harness:status', (data) => {
  updateHarnessStatus(data);
});

socket.on('features:updated', (data) => {
  updateFeatureList(data);
});

socket.on('progress:updated', (data) => {
  updateProgressTimeline(data);
});

socket.on('harness:log', (line) => {
  appendToLogViewer(line);
});
```

**Tasks:**
- [ ] Add Socket.IO client to frontend
- [ ] Create event handlers for all harness events
- [ ] Update charts and tables on data changes
- [ ] Show live session number and feature count

### 2.3 Harness Control Panel UI

```
┌─────────────────────────────────────────────────────────┐
│  HARNESS CONTROL                                        │
├─────────────────────────────────────────────────────────┤
│  Status: ● Running (Session 12/100)                     │
│  Progress: ████████████░░░░░░░░ 58% (145/250 features)  │
│                                                         │
│  [▶ Start]  [⏹ Stop]  [⚙ Settings]                      │
│                                                         │
│  Mode: ○ Single Session  ● Continuous                   │
│  Max Sessions: [100]                                    │
└─────────────────────────────────────────────────────────┘
```

**Tasks:**
- [ ] Create harness control component in HTML/JS
- [ ] Start/Stop buttons with confirmation dialogs
- [ ] Settings modal for max sessions, delay, prompts
- [ ] Mode toggle (single vs continuous)
- [ ] Real-time status indicator with pulse animation

### 2.4 Live Log Viewer

```
┌─────────────────────────────────────────────────────────┐
│  SESSION LOGS                          [Pause] [Clear]  │
├─────────────────────────────────────────────────────────┤
│  19:45:32 📋 Starting session #12 (CODING)              │
│  19:45:33    Progress: 144/250 features (57.6%)         │
│  19:45:35 🔧 Reading feature_list.json...               │
│  19:45:36 🔧 Running init.sh...                         │
│  19:45:40 ✓  Dev server started on :3000                │
│  19:45:42 🔍 Testing feature feat-145...                │
│  19:45:55 ✅ Feature feat-145 PASSED                    │
│  19:45:56 📝 Committing: "feat: add user settings"      │
│  ▼ Auto-scroll                                          │
└─────────────────────────────────────────────────────────┘
```

**Tasks:**
- [ ] Create scrollable log viewer component
- [ ] SSE connection for log streaming
- [ ] Syntax highlighting for different log types
- [ ] Pause/resume auto-scroll
- [ ] Search/filter functionality
- [ ] Download full log option

---

## Phase 3: Human-in-the-Loop (Week 3-4)

**Goal:** Add strategic human checkpoints as identified in video research.

### 3.1 Approval Gates System

Define checkpoint types:
1. **Feature Approval** - After implementing, before marking as passed
2. **Session Review** - After N sessions, review overall progress
3. **Error Recovery** - When agent encounters unrecoverable error
4. **Milestone Check** - At 25%, 50%, 75% completion

**Tasks:**
- [ ] Create `ApprovalGate` model in database
- [ ] Add approval gate insertion in harness runner
- [ ] Create notification system for pending approvals
- [ ] Build approval UI with context (screenshots, diffs)

### 3.2 Approval UI Component

```
┌─────────────────────────────────────────────────────────┐
│  🔔 APPROVAL REQUIRED                                   │
├─────────────────────────────────────────────────────────┤
│  Feature: feat-089 - Dark mode toggle                   │
│  Session: #34                                           │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  [Screenshot of implemented feature]             │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Changes: +45 lines, -12 lines in 3 files              │
│  Tests: 3/3 passing                                     │
│                                                         │
│  [✓ Approve & Continue]  [✗ Reject & Retry]  [⏸ Pause] │
└─────────────────────────────────────────────────────────┘
```

**Tasks:**
- [ ] Implement approval modal with feature details
- [ ] Show screenshot from Puppeteer if available
- [ ] Show git diff of changes
- [ ] Approve/Reject/Pause actions
- [ ] Browser notifications for new approvals
- [ ] Optional audio alerts

### 3.3 Harness Runner Integration

Update `harness/run-harness.js` to support gates:

```javascript
// After feature implementation
if (config.requireApprovalForFeatures) {
  await createApprovalGate({
    projectId,
    type: 'feature_approval',
    featureId: currentFeature.id,
    screenshot: await takeScreenshot(),
    diff: await getGitDiff(),
  });
  
  // Wait for approval
  await waitForApproval(gateId);
}
```

**Tasks:**
- [ ] Add approval gate creation to harness runner
- [ ] Implement `waitForApproval()` with polling/webhook
- [ ] Handle rejection with rollback option
- [ ] Add configurable checkpoint intervals

### 3.4 Notification System

**Tasks:**
- [ ] Browser push notifications for approvals needed
- [ ] Email notifications (optional, via SendGrid/etc)
- [ ] Slack/Discord webhook integration
- [ ] Sound alerts toggle in settings

---

## Phase 4: Advanced Features (Week 4-6)

**Goal:** Multi-project support, optimizations, and polish.

### 4.1 Multi-Project Dashboard

```
┌─────────────────────────────────────────────────────────┐
│  PROJECT RADAR                                          │
├─────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ EverReach│  │ SassHot  │  │ BlogCanv │              │
│  │ ● Running│  │ ○ Idle   │  │ ● Running│              │
│  │ 67%      │  │ 23%      │  │ 89%      │              │
│  └──────────┘  └──────────┘  └──────────┘              │
│                                                         │
│  Active Harnesses: 2/5                                  │
│  Total Progress: 145/380 features today                 │
└─────────────────────────────────────────────────────────┘
```

**Tasks:**
- [ ] Project cards grid with status indicators
- [ ] Run multiple harnesses in parallel (resource limits)
- [ ] Aggregate stats across all projects
- [ ] Priority queue for harness execution

### 4.2 Git Integration

**Tasks:**
- [ ] Display commit history from project repo
- [ ] Show diffs for each session's changes
- [ ] One-click rollback to previous commit
- [ ] Branch management for harness work

### 4.3 Puppeteer/Playwright Integration

**Tasks:**
- [ ] Capture screenshots at key moments
- [ ] Store screenshots with session/feature metadata
- [ ] Visual regression testing between sessions
- [ ] Live browser preview stream (via noVNC or similar)

### 4.4 Analytics & Reporting

**Tasks:**
- [ ] Features per hour/day metrics
- [ ] Token usage tracking and cost estimation
- [ ] Session success/failure rates
- [ ] Time-to-completion predictions
- [ ] Export reports as PDF/CSV

### 4.5 Prompt Editor

**Tasks:**
- [ ] In-app editor for initializer/coding prompts
- [ ] Syntax highlighting for markdown
- [ ] Version history for prompts
- [ ] A/B testing different prompts

---

## Implementation Priority Matrix

| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| Harness Process Manager | High | Medium | P0 |
| Start/Stop API | High | Low | P0 |
| File Watcher | High | Medium | P0 |
| Real-time Log Viewer | High | Medium | P1 |
| Socket.IO Integration | High | Low | P1 |
| Approval Gates | High | High | P1 |
| Live Dashboard Data | Medium | Medium | P1 |
| Multi-Project Support | Medium | High | P2 |
| Git Integration | Medium | Medium | P2 |
| Screenshot Capture | Medium | Medium | P2 |
| Analytics | Low | Medium | P3 |
| Prompt Editor | Low | Low | P3 |

---

## Quick Start: Phase 1 Tasks

### Today's Focus

1. **Create Harness Manager Service**
   ```bash
   # File: backend/src/services/harness-manager.ts
   ```

2. **Add Harness API Routes**
   ```bash
   # Add to: backend/src/index.ts
   # Routes: /harness/start, /harness/stop, /harness/status
   ```

3. **Update Database Schema**
   ```bash
   cd backend
   npx prisma migrate dev --name add_harness_tables
   ```

4. **Connect File Watcher**
   ```bash
   npm install chokidar
   # File: backend/src/services/file-watcher.ts
   ```

5. **Test End-to-End**
   ```bash
   # Start backend
   npm run dev
   
   # In another terminal, test harness start
   curl -X POST http://localhost:3001/api/projects/test/harness/start
   ```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  Dashboard  │  │   Control   │  │  Log Viewer │              │
│  │   Charts    │  │   Panel     │  │             │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                │                │                      │
│         └────────────────┼────────────────┘                      │
│                          │                                       │
│                    Socket.IO + REST                              │
└──────────────────────────┼───────────────────────────────────────┘
                           │
┌──────────────────────────┼───────────────────────────────────────┐
│                     BACKEND API                                  │
│  ┌─────────────┐  ┌──────┴──────┐  ┌─────────────┐              │
│  │   Express   │  │  Socket.IO  │  │   Redis     │              │
│  │   Routes    │  │   Server    │  │   Pub/Sub   │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                │                │                      │
│  ┌──────┴────────────────┴────────────────┴──────┐              │
│  │              SERVICE LAYER                     │              │
│  │  ┌───────────────┐  ┌───────────────┐         │              │
│  │  │    Harness    │  │     File      │         │              │
│  │  │    Manager    │  │    Watcher    │         │              │
│  │  └───────┬───────┘  └───────┬───────┘         │              │
│  └──────────┼──────────────────┼─────────────────┘              │
│             │                  │                                 │
└─────────────┼──────────────────┼─────────────────────────────────┘
              │                  │
┌─────────────┼──────────────────┼─────────────────────────────────┐
│             │    FILE SYSTEM   │                                 │
│  ┌──────────▼──────────┐  ┌────▼────────────────┐               │
│  │   harness/          │  │  Project Files       │               │
│  │   run-harness.js    │  │  feature_list.json   │               │
│  │   prompts/          │  │  claude-progress.txt │               │
│  └─────────────────────┘  │  init.sh             │               │
│                           └──────────────────────┘               │
│                                                                  │
│  ┌──────────────────────────────────────────────┐               │
│  │              CLAUDE CODE CLI                  │               │
│  │        (Spawned by Harness Manager)          │               │
│  └──────────────────────────────────────────────┘               │
└──────────────────────────────────────────────────────────────────┘
```

---

## Success Metrics

| Phase | Metric | Target |
|-------|--------|--------|
| Phase 1 | Can start/stop harness from API | ✓ Working |
| Phase 1 | Logs stream to frontend | ✓ Working |
| Phase 2 | Dashboard shows live feature progress | ✓ Working |
| Phase 2 | Real-time updates via Socket.IO | ✓ Working |
| Phase 3 | Human approval gates functional | ✓ Working |
| Phase 3 | Notifications delivered | ✓ Working |
| Phase 4 | 3+ projects running simultaneously | ✓ Working |
| Phase 4 | <2s latency for status updates | ✓ Working |

---

*Created December 20, 2024*
