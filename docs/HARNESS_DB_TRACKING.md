# Harness Database Tracking

## Overview

The ACD harness now tracks all session metrics to a PostgreSQL database, enabling:
- Historical analysis of autonomous coding runs
- Cost tracking per target/model
- Feature progress over time
- Error rate monitoring
- Token usage optimization

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  run-queue.js   │────▶│ run-harness-v2  │────▶│  metrics-db.js  │
│  (orchestrator) │     │   (sessions)    │     │  (DB client)    │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                                                         ▼
                                                ┌─────────────────┐
                                                │   PostgreSQL    │
                                                │  (acd_database) │
                                                └─────────────────┘
```

## Database Schema

### Tables

| Table | Purpose |
|-------|---------|
| `targets` | Repository metadata (name, path, complexity) |
| `harness_sessions` | Individual harness runs with metrics |
| `progress_snapshots` | Daily progress per target |
| `model_usage` | Token/cost aggregated by model |
| `target_features` | Individual feature tracking |
| `harness_errors` | Error log with stack traces |
| `harness_commits` | Git commits made during sessions |
| `token_usage_details` | Granular token breakdown |

### Session Fields

```typescript
{
  id: UUID,
  targetId: UUID,
  sessionNumber: number,
  sessionType: 'coding' | 'initializer',
  model: 'haiku' | 'sonnet' | 'opus',
  status: 'running' | 'completed' | 'failed',
  
  // Timestamps
  startedAt: DateTime,
  finishedAt: DateTime,
  durationMs: number,
  
  // Token metrics
  inputTokens: number,
  outputTokens: number,
  cacheReadTokens: number,
  cacheWriteTokens: number,
  costUsd: Decimal,
  
  // Progress
  featuresBefore: number,
  featuresAfter: number,
  featuresCompleted: number,
  commitsMade: number,
  
  // Errors
  errorType: string | null,
  errorMessage: string | null
}
```

## Integration

### Session Lifecycle

1. **Session Start** (`run-harness-v2.js`)
   ```javascript
   await metricsDb.ensureTarget(PROJECT_ID, name, path);
   dbSession = await metricsDb.startSession(PROJECT_ID, sessionNumber, type, model);
   ```

2. **Session End** (on close)
   ```javascript
   await metricsDb.endSession(dbSession.id, {
     status, inputTokens, outputTokens, costUsd,
     featuresBefore, featuresAfter, featuresCompleted,
     errorType, errorMessage
   });
   await metricsDb.updateDailyStats(PROJECT_ID, totalFeatures);
   ```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/db/targets` | GET | All targets with sessions |
| `/api/db/targets/summary` | GET | Aggregate stats |
| `/api/db/targets/sync` | POST | Sync from repo-queue.json |
| `/api/db/sessions` | GET | Recent sessions |
| `/api/db/model-usage` | GET | Token/cost by model |
| `/api/db/snapshots` | GET | Daily progress history |
| `/api/db/errors` | GET | Recent errors |
| `/api/db/features/:repoId` | GET | Features for target |

## Configuration

### Environment Variables

```bash
# Database connection
DATABASE_URL=postgresql://acd_user:acd_secure_pass_2026@127.0.0.1:5433/acd_database

# Backend
BACKEND_PORT=3434
```

### Docker Setup

```yaml
# docker-compose.yml
services:
  acd_postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: acd_user
      POSTGRES_PASSWORD: acd_secure_pass_2026
      POSTGRES_DB: acd_database
    ports:
      - "5433:5432"
    volumes:
      - acd_pgdata:/var/lib/postgresql/data
```

## Querying Data

### CLI Examples

```bash
# Get targets summary
curl http://localhost:3434/api/db/targets/summary

# Get recent sessions
curl "http://localhost:3434/api/db/sessions?limit=10"

# Get model usage (30 days)
curl "http://localhost:3434/api/db/model-usage?days=30"

# Get daily progress
curl "http://localhost:3434/api/db/snapshots?days=7"
```

### SQL Examples

```sql
-- Total cost by target
SELECT t.name, SUM(s.cost_usd) as total_cost
FROM targets t
JOIN harness_sessions s ON s.target_id = t.id
GROUP BY t.name
ORDER BY total_cost DESC;

-- Sessions per day
SELECT DATE(started_at) as day, COUNT(*) as sessions
FROM harness_sessions
GROUP BY day
ORDER BY day DESC;

-- Features completed per model
SELECT model, SUM(features_completed) as features
FROM harness_sessions
GROUP BY model;
```

## Testing

Run the full test suite:

```bash
cd harness
node test-all.js
```

Individual test suites:
- `test-metrics-db.js` - Database operations
- `test-model-config.js` - Model complexity selection
- `test-target-sync.js` - API endpoints

## Troubleshooting

### Database Connection Failed

1. Check Docker container is running:
   ```bash
   docker ps | grep acd_postgres
   ```

2. Verify credentials in `harness/metrics-db.js`:
   ```javascript
   const pool = new Pool({
     host: '127.0.0.1',
     port: 5433,
     database: 'acd_database',
     user: 'acd_user',
     password: 'acd_secure_pass_2026'
   });
   ```

### Sessions Not Recording

1. Check harness logs for "DB session" messages:
   ```
   📋 DB session started: <uuid>
   📋 DB session ended: X features completed
   ```

2. If "non-fatal" warnings appear, database may be unavailable

### Missing Token Data

Token metrics come from Claude CLI JSON output. Ensure:
- `--output-format stream-json` flag is set
- Output is being parsed in `parseSessionOutput()`
