# ACD Infrastructure Documentation

## Overview

The Autonomous Coding Dashboard (ACD) manages multiple coding projects through an automated harness system. This document covers the complete infrastructure setup.

---

## Services

| Service | Container | Port | Purpose |
|---------|-----------|------|---------|
| **PostgreSQL** | `acd_postgres` | 5433 | Dedicated ACD database |
| **Redis** | `autonomous-coding-dashboard-redis-1` | 6379 | Job queue and pub/sub |
| **Backend API** | — | 3434 | Express.js REST API |
| **Agent Orchestrator** | — | 8000 | Python FastAPI agent service |
| **Queue Runner** | — | — | Multi-repo harness orchestrator |

---

## Database

### Connection Details

| Setting | Value |
|---------|-------|
| **Host** | `127.0.0.1` |
| **Port** | `5433` |
| **Database** | `acd_database` |
| **User** | `acd_user` |
| **Password** | `acd_secure_pass_2026` |

### Connection String

```
postgresql://acd_user:acd_secure_pass_2026@127.0.0.1:5433/acd_database
```

### Database Models

#### Core Models
- **Target** - Repos from repo-queue.json with progress tracking
- **HarnessSession** - Each harness run with metrics
- **ProgressSnapshot** - Daily progress snapshots
- **ModelUsage** - Token usage and costs by model
- **QueueStatus** - Overall queue state

#### Existing Models
- **Project** - Project metadata
- **Feature** - Feature tracking
- **AgentRun** - Agent execution history
- **Commit** - Git commits by agents

---

## Environment Files

### Root `.env`
**Location:** `/autonomous-coding-dashboard/.env`

```env
# Claude Code OAuth Token
CLAUDE_CODE_OAUTH_TOKEN=sk-ant-oat01-...

# Database Configuration
DATABASE_URL=postgresql://acd_user:acd_secure_pass_2026@127.0.0.1:5433/acd_database
POSTGRES_USER=acd_user
POSTGRES_PASSWORD=acd_secure_pass_2026
POSTGRES_DB=acd_database
POSTGRES_PORT=5433

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Backend Configuration
BACKEND_PORT=3434
AGENT_SERVICE_URL=http://localhost:8000
```

### Backend `.env`
**Location:** `/autonomous-coding-dashboard/backend/.env`

```env
PORT=3434
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgresql://acd_user:acd_secure_pass_2026@127.0.0.1:5433/acd_database
GENERATIONS_DIR=./generations
AGENT_SERVICE_URL=http://localhost:8000
NODE_ENV=development
```

---

## Docker Setup

### Start Services

```bash
cd /Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard

# Start database and Redis
docker compose up -d postgres redis

# Verify containers
docker ps --filter name=acd
```

### docker-compose.yml

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: acd_postgres
    environment:
      POSTGRES_USER: acd_user
      POSTGRES_PASSWORD: acd_secure_pass_2026
      POSTGRES_DB: acd_database
    ports:
      - "5433:5432"
    volumes:
      - acd_postgres_data:/var/lib/postgresql/data
      - ./backend/prisma/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
```

---

## Starting the ACD

### 1. Start Database & Redis

```bash
cd /Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard
docker compose up -d postgres redis
```

### 2. Run Migrations

```bash
cd backend
npx prisma db push
```

### 3. Start Backend

```bash
cd backend
npm run dev
# or: npx tsx watch src/index.ts
```

### 4. Start Agent Orchestrator

```bash
cd backend
uvicorn services.agent_orchestrator:app --port 8000
```

### 5. Start Queue Runner

```bash
cd harness
node run-queue.js --loop
```

---

## API Endpoints

### Health & Status

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/status` | GET | Harness status |
| `/api/targets/status` | GET | All targets with progress |
| `/api/scheduler/stats` | GET | Scheduler metrics |

### Database Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/db/targets` | GET | All targets from DB |
| `/api/db/targets/summary` | GET | Aggregate stats |
| `/api/db/targets/sync` | POST | Sync repo-queue.json to DB |
| `/api/db/sessions?limit=50` | GET | Recent harness sessions |
| `/api/db/model-usage?days=7` | GET | Model usage stats |
| `/api/db/snapshots?days=7` | GET | Progress snapshots |

### Example Requests

```bash
# Health check
curl http://localhost:3434/api/health

# Get all targets with progress
curl http://localhost:3434/api/targets/status

# Sync targets to database
curl -X POST http://localhost:3434/api/db/targets/sync

# Get database summary
curl http://localhost:3434/api/db/targets/summary
```

---

## Tiered Intelligence

The ACD uses complexity-based model selection:

| Complexity | Primary Model | Use Case |
|------------|---------------|----------|
| **High** | Sonnet | Architecture, integrations, new projects |
| **Medium** | Sonnet | Standard feature implementation |
| **Low** | Haiku | Simple tasks, bug fixes, docs |

### Configuration

Defined in `harness/repo-queue.json`:

```json
{
  "modelTiers": {
    "high": { "models": ["sonnet", "opus"], "fallback": "haiku" },
    "medium": { "models": ["sonnet", "haiku"], "fallback": "haiku" },
    "low": { "models": ["haiku"], "fallback": "haiku" }
  },
  "repos": [
    {
      "id": "mediaposter",
      "complexity": "high",
      ...
    }
  ]
}
```

---

## Target Complexity Assignments

| Target | Complexity | Model |
|--------|------------|-------|
| MediaPoster | 🔴 High | Sonnet |
| GapRadar | 🟡 Medium | Sonnet |
| BlogCanvas | 🟢 Low | Haiku |
| Portal28 | 🟡 Medium | Sonnet |
| CanvasCast | 🟡 Medium | Sonnet |
| EverReach App Kit | 🟡 Medium | Sonnet |
| SteadyLetters | 🟢 Low | Haiku |
| VelloPad | 🟡 Medium | Sonnet |
| VelvetHold | 🟢 Low | Haiku |
| AI Video Platform | 🟢 Low | Haiku |
| Remotion | 🔴 High | Sonnet |
| EverReach Expo | 🔴 High | Sonnet |
| WaitlistLab | 🔴 High | Sonnet |
| ShortsLinker | 🔴 High | Sonnet |

---

## Troubleshooting

### Database Connection Issues

```bash
# Check if container is running
docker ps | grep acd_postgres

# Check port is available
lsof -i :5433

# Check logs
docker logs acd_postgres
```

### Reset Database

```bash
# Stop container
docker compose down

# Remove volume (WARNING: deletes all data)
docker volume rm autonomous-coding-dashboard_acd_postgres_data

# Restart and recreate
docker compose up -d postgres
cd backend && npx prisma db push
```

### Backend Not Starting

```bash
# Check for port conflicts
lsof -i :3434

# Verify .env file
cat backend/.env

# Check Redis connection
redis-cli ping
```

---

## File Structure

```
autonomous-coding-dashboard/
├── .env                          # Root environment variables
├── docker-compose.yml            # Docker services config
├── ENV_SETUP.md                  # Environment setup guide
├── docs/
│   └── ACD_INFRASTRUCTURE.md     # This document
├── backend/
│   ├── .env                      # Backend environment
│   ├── .env.example              # Template
│   ├── prisma/
│   │   ├── schema.prisma         # Database schema
│   │   └── init.sql              # DB initialization
│   ├── src/
│   │   ├── index.ts              # Express API
│   │   └── services/
│   │       ├── target-sync.ts    # Database sync service
│   │       ├── harness-manager.ts
│   │       └── ...
│   └── services/
│       └── agent_orchestrator.py # Python agent service
└── harness/
    ├── repo-queue.json           # Target configuration
    ├── run-queue.js              # Multi-repo orchestrator
    ├── run-harness-v2.js         # Single-repo harness
    └── prompts/                  # Harness prompts
```

---

## Current Status

```
Targets:     14 (all enabled)
Complete:    7 (50%)
Features:    1,732 / 2,352 (73.6%)
Active:      MediaPoster
Model:       Sonnet (high complexity)
```

---

*Last Updated: February 2, 2026*
