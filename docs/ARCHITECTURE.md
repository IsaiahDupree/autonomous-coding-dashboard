# 🏗️ ACD System Architecture

## Overview

The Autonomous Coding Dashboard (ACD) is a comprehensive system for managing, monitoring, and executing autonomous AI-powered software development across multiple projects.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ACD ARCHITECTURE                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐  │
│  │   Frontend   │◄──►│   Backend    │◄──►│     PostgreSQL       │  │
│  │   (React)    │    │   (Express)  │    │     Database         │  │
│  │   :3001      │    │   :3434      │    │     :5433            │  │
│  └──────────────┘    └──────────────┘    └──────────────────────┘  │
│         │                   │                      ▲               │
│         │                   │                      │               │
│         ▼                   ▼                      │               │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                      HARNESS LAYER                            │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │  │
│  │  │ run-queue   │  │run-harness  │  │    metrics-db       │   │  │
│  │  │   .js       │──│   -v2.js    │──│       .js           │───┼──┘
│  │  │             │  │             │  │                     │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘   │
│  └──────────────────────────────────────────────────────────────┘  │
│                              │                                      │
│                              ▼                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    ANTHROPIC API                              │  │
│  │                    (Claude Models)                            │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                              │                                      │
│                              ▼                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    TARGET REPOSITORIES                        │  │
│  │   MediaPoster │ GapRadar │ BlogCanvas │ Portal28 │ ...       │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Components

### 1. Frontend (React Dashboard)
**Port: 3001**

- Real-time progress visualization
- Session monitoring
- Cost and token analytics
- Target management interface

**Key Files:**
- `frontend/src/` - React components
- `frontend/src/components/` - UI components
- `frontend/src/api/` - API integration

### 2. Backend (Express API)
**Port: 3434**

REST API providing:
- `/api/db/targets` - Target CRUD operations
- `/api/db/sessions` - Session history
- `/api/db/snapshots` - Daily aggregations
- `/api/db/targets/summary` - Overall statistics

**Key Files:**
- `backend/server.js` - Express server
- `backend/prisma/schema.prisma` - Database schema
- `backend/routes/` - API routes

### 3. PostgreSQL Database
**Port: 5433** (Docker container)

**Core Tables:**
```sql
Target           -- Project definitions
HarnessSession   -- Individual coding sessions
TargetFeature    -- Feature tracking
DailySnapshot    -- Daily aggregations
TokenUsageDetail -- Token consumption
```

**Enhanced Metrics Tables:**
```sql
SessionTurn      -- Per-turn metrics
SessionRetry     -- Retry tracking
CodebaseIndex    -- Codebase metrics
ContextUsage     -- Context window utilization
FileAccessLog    -- File access patterns
```

### 4. Harness Layer

#### run-queue.js
- Queue orchestration
- Target prioritization
- Automatic advancement
- Health monitoring

#### run-harness-v2.js
- Session execution
- Feature implementation
- Progress tracking
- Test validation

#### metrics-db.js
- Database integration
- Session start/end
- Progress synchronization
- Daily stats updates

---

## Data Flow

### Session Lifecycle

```
1. Queue Runner selects target (by priority)
         │
         ▼
2. Harness starts session
   - Creates DB session record
   - Loads feature_list.json
         │
         ▼
3. Claude API processes features
   - Implements code
   - Runs tests
   - Commits changes
         │
         ▼
4. Session ends
   - Updates DB with metrics
   - Syncs target progress
   - Updates daily stats
         │
         ▼
5. Queue advances to next target
```

### Metrics Collection

```
Session Start
    │
    ├── Input tokens
    ├── Start timestamp
    └── Target info
         │
         ▼
During Session
    │
    ├── Turn count
    ├── Cache tokens
    ├── API latency
    └── Retry tracking
         │
         ▼
Session End
    │
    ├── Output tokens
    ├── Total cost
    ├── Test results
    ├── Features completed
    └── Duration metrics
```

---

## Database Schema Highlights

### Target Model
```prisma
model Target {
  id              String    @id @default(cuid())
  name            String    @unique
  repoPath        String
  totalFeatures   Int       @default(0)
  passingFeatures Int       @default(0)
  percentComplete Float     @default(0)
  status          String    @default("pending")
  priority        Int       @default(99)
  enabled         Boolean   @default(true)
  
  // Codebase metrics
  lastIndexedAt   DateTime?
  indexSizeTokens Int?
  totalFiles      Int?
  totalLoc        Int?
}
```

### HarnessSession Model
```prisma
model HarnessSession {
  id            String   @id @default(cuid())
  targetId      String
  sessionNumber Int
  status        String
  model         String?
  
  // Token metrics
  inputTokens   Int      @default(0)
  outputTokens  Int      @default(0)
  cacheReadTokens  Int?
  cacheWriteTokens Int?
  
  // Timing
  startedAt     DateTime @default(now())
  endedAt       DateTime?
  durationMs    Int?
  wallClockMs   Int?
  apiLatencyMs  Int?
  
  // Performance
  turnCount     Int?
  retryCount    Int?
  costUsd       Float    @default(0)
  
  // Test metrics
  testsRun      Int?
  testsPassed   Int?
  testsFailed   Int?
  testPassRate  Float?
}
```

---

## API Endpoints

### Targets
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/db/targets` | List all targets |
| GET | `/api/db/targets/summary` | Overall statistics |
| POST | `/api/db/targets` | Create target |
| PUT | `/api/db/targets/:id` | Update target |

### Sessions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/db/sessions` | List sessions |
| GET | `/api/db/sessions?limit=N` | Limited list |

### Snapshots
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/db/snapshots` | Daily snapshots |
| GET | `/api/db/snapshots?days=N` | Recent days |

---

## Configuration

### Environment Variables
```bash
DATABASE_URL=postgresql://user:pass@host:port/db
ANTHROPIC_API_KEY=sk-ant-...
REDIS_URL=redis://localhost:6379
```

### repo-queue.json
```json
{
  "targets": [
    {
      "name": "ProjectName",
      "path": "/path/to/repo",
      "priority": 1,
      "enabled": true
    }
  ]
}
```

### feature_list.json (per target)
```json
{
  "features": [
    {
      "id": "feature-001",
      "name": "Feature Name",
      "status": "pending"
    }
  ]
}
```

---

## Deployment

### Docker Services
```yaml
services:
  postgres:
    image: postgres:15
    ports:
      - "5433:5432"
    
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
```

### Running the System
```bash
# Start database
docker-compose up -d

# Start backend
cd backend && npm start

# Start frontend
cd frontend && npm start

# Start harness queue
cd harness && node run-queue.js
```

---

## Monitoring

### Health Checks
- Queue runner process: `pgrep -f "node run-queue.js"`
- Backend API: `curl localhost:3434/health`
- Database: Docker container status

### Key Metrics to Monitor
- Session success rate
- Features per hour
- Cost per feature
- Token efficiency
- Queue throughput

---

*Architecture designed for scalability, reliability, and visibility into autonomous coding operations.*
