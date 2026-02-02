# PRD: Enhanced Metrics & Context Management

## Overview

Enhance the Autonomous Coding Dashboard (ACD) with comprehensive metrics tracking, efficient codebase context management, and detailed session analytics.

---

## Problem Statement

Current ACD tracking lacks:
- Precise timestamp granularity for debugging and optimization
- Detailed token usage breakdowns (input, output, cache read/write)
- Test pass/fail rates and success metrics
- Retry attempt tracking per session
- Codebase size and indexing metrics
- Efficient context utilization across sessions

---

## Goals

1. **Accurate Timestamps** - Millisecond-precision timing for all operations
2. **Token Reporting** - Granular breakdown of token usage by type and model
3. **Test Success Rates** - Track pass/fail ratios and trends
4. **Retry Tracking** - Log retry attempts, reasons, and outcomes
5. **Codebase Metrics** - Index size, file counts, LOC tracking
6. **Context Efficiency** - Optimize context window utilization

---

## Features

### 1. Enhanced Timestamp Tracking

**Requirements:**
- [ ] Session start/end with millisecond precision
- [ ] Per-turn timestamps within sessions
- [ ] API call latency tracking
- [ ] Time-to-first-token metrics
- [ ] Total session wall-clock time vs. API time

**Schema Additions:**
```sql
ALTER TABLE harness_sessions ADD COLUMN
  api_latency_ms INTEGER,
  time_to_first_token_ms INTEGER,
  wall_clock_ms INTEGER,
  turn_count INTEGER DEFAULT 0;

CREATE TABLE session_turns (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES harness_sessions(id),
  turn_number INTEGER NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  tool_calls JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**API Endpoints:**
- `GET /api/db/sessions/:id/turns` - Get turn-by-turn breakdown
- `GET /api/db/sessions/:id/timing` - Get timing analysis

---

### 2. Detailed Token Reporting

**Requirements:**
- [ ] Per-model token breakdown
- [ ] Cache utilization metrics (read/write/hit rate)
- [ ] Cost per 1K tokens by model
- [ ] Token efficiency score (output/input ratio)
- [ ] Context window utilization percentage

**Schema Additions:**
```sql
CREATE TABLE token_usage_details (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES harness_sessions(id),
  model VARCHAR(50) NOT NULL,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  cache_read_tokens INTEGER DEFAULT 0,
  cache_write_tokens INTEGER DEFAULT 0,
  cache_hit_rate DECIMAL(5,4),
  context_utilization DECIMAL(5,4),
  cost_usd DECIMAL(10,6),
  request_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_token_usage_session ON token_usage_details(session_id);
CREATE INDEX idx_token_usage_model ON token_usage_details(model);
```

**Metrics Dashboard:**
| Metric | Description |
|--------|-------------|
| Token Efficiency | `output_tokens / input_tokens` |
| Cache Hit Rate | `cache_read / (cache_read + input_tokens)` |
| Context Utilization | `total_tokens / context_window_size` |
| Cost per Feature | `total_cost / features_completed` |

**API Endpoints:**
- `GET /api/db/token-usage?days=N` - Token usage over time
- `GET /api/db/token-usage/by-model` - Breakdown by model
- `GET /api/db/token-usage/efficiency` - Efficiency metrics

---

### 3. Test Pass Success Rate

**Requirements:**
- [ ] Track test runs per session
- [ ] Pass/fail/skip counts
- [ ] Flaky test detection
- [ ] Test duration tracking
- [ ] Regression detection

**Schema Additions:**
```sql
CREATE TABLE session_test_runs (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES harness_sessions(id),
  test_suite VARCHAR(255),
  total_tests INTEGER DEFAULT 0,
  passed INTEGER DEFAULT 0,
  failed INTEGER DEFAULT 0,
  skipped INTEGER DEFAULT 0,
  duration_ms INTEGER,
  failure_reasons JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE harness_sessions ADD COLUMN
  tests_run INTEGER DEFAULT 0,
  tests_passed INTEGER DEFAULT 0,
  tests_failed INTEGER DEFAULT 0,
  test_pass_rate DECIMAL(5,4);
```

**Metrics:**
- **Pass Rate**: `passed / total * 100`
- **Regression Alert**: Pass rate drops > 10% from previous session
- **Flaky Detection**: Same test fails intermittently across sessions

**API Endpoints:**
- `GET /api/db/tests/:repoId` - Test history for target
- `GET /api/db/tests/flaky` - Flaky test report
- `GET /api/db/tests/regressions` - Regression alerts

---

### 4. Retry Number Tracking

**Requirements:**
- [ ] Track retry attempts per session
- [ ] Reason for each retry (rate limit, error, timeout)
- [ ] Time between retries
- [ ] Success after N retries
- [ ] Model fallback tracking

**Schema Additions:**
```sql
CREATE TABLE session_retries (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES harness_sessions(id),
  retry_number INTEGER NOT NULL,
  reason VARCHAR(50) NOT NULL, -- 'rate_limit', 'error', 'timeout', 'model_fallback'
  original_model VARCHAR(50),
  fallback_model VARCHAR(50),
  wait_duration_ms INTEGER,
  succeeded BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE harness_sessions ADD COLUMN
  retry_count INTEGER DEFAULT 0,
  max_retries_hit BOOLEAN DEFAULT FALSE,
  model_fallbacks INTEGER DEFAULT 0;
```

**API Endpoints:**
- `GET /api/db/retries/:sessionId` - Retry history for session
- `GET /api/db/retries/summary` - Retry rate by error type

---

### 5. Codebase Index Metrics

**Requirements:**
- [ ] Total files in codebase
- [ ] Lines of code (LOC)
- [ ] File type distribution
- [ ] Index build time
- [ ] Index size in tokens
- [ ] Last indexed timestamp

**Schema Additions:**
```sql
CREATE TABLE codebase_indexes (
  id UUID PRIMARY KEY,
  target_id UUID REFERENCES targets(id),
  indexed_at TIMESTAMPTZ DEFAULT NOW(),
  total_files INTEGER DEFAULT 0,
  total_lines INTEGER DEFAULT 0,
  total_size_bytes BIGINT DEFAULT 0,
  index_size_tokens INTEGER DEFAULT 0,
  build_duration_ms INTEGER,
  file_types JSONB, -- {"ts": 150, "js": 50, "py": 30}
  largest_files JSONB, -- Top 10 by size
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE targets ADD COLUMN
  last_indexed_at TIMESTAMPTZ,
  index_size_tokens INTEGER DEFAULT 0,
  total_files INTEGER DEFAULT 0,
  total_loc INTEGER DEFAULT 0;
```

**Indexing Process:**
```javascript
async function indexCodebase(targetPath) {
  const stats = {
    totalFiles: 0,
    totalLines: 0,
    totalBytes: 0,
    fileTypes: {},
    largestFiles: []
  };
  
  // Walk directory, count files/lines
  // Estimate token count (~4 chars per token)
  // Store in codebase_indexes table
  
  return stats;
}
```

**API Endpoints:**
- `GET /api/db/codebase/:repoId` - Codebase metrics
- `POST /api/db/codebase/:repoId/reindex` - Trigger reindex
- `GET /api/db/codebase/largest` - Largest codebases

---

### 6. Efficient Context Management

**Requirements:**
- [ ] Track context window usage per turn
- [ ] Identify context overflow situations
- [ ] Optimize file selection for context
- [ ] Cache frequently accessed files
- [ ] Prioritize recently modified files

**Context Strategy:**

```
┌─────────────────────────────────────────────────────────┐
│                    Context Window                        │
├─────────────────────────────────────────────────────────┤
│ [System Prompt]     ~2K tokens (fixed)                  │
│ [Feature Context]   ~5K tokens (current feature)        │
│ [Recent Files]      ~20K tokens (recently modified)     │
│ [Cached Files]      ~50K tokens (frequently accessed)   │
│ [Available]         ~123K tokens (for conversation)     │
└─────────────────────────────────────────────────────────┘
```

**Schema Additions:**
```sql
CREATE TABLE context_usage (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES harness_sessions(id),
  turn_number INTEGER,
  system_tokens INTEGER DEFAULT 0,
  feature_tokens INTEGER DEFAULT 0,
  file_tokens INTEGER DEFAULT 0,
  conversation_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  context_limit INTEGER DEFAULT 200000,
  utilization DECIMAL(5,4),
  overflow_occurred BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE file_access_log (
  id UUID PRIMARY KEY,
  target_id UUID REFERENCES targets(id),
  file_path TEXT NOT NULL,
  access_count INTEGER DEFAULT 1,
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  avg_tokens INTEGER,
  is_cached BOOLEAN DEFAULT FALSE
);
```

**Optimization Algorithms:**

1. **LRU File Cache**: Keep top 20 most accessed files in context
2. **Relevance Scoring**: Score files by similarity to current feature
3. **Smart Truncation**: Truncate large files to relevant sections
4. **Incremental Context**: Add files on-demand during conversation

**API Endpoints:**
- `GET /api/db/context/:sessionId` - Context usage breakdown
- `GET /api/db/context/hot-files/:repoId` - Most accessed files
- `POST /api/db/context/optimize/:repoId` - Trigger optimization

---

## Database Migrations

### Migration 001: Enhanced Sessions

```sql
-- 001_enhanced_sessions.sql
ALTER TABLE harness_sessions ADD COLUMN IF NOT EXISTS
  api_latency_ms INTEGER,
  time_to_first_token_ms INTEGER,
  wall_clock_ms INTEGER,
  turn_count INTEGER DEFAULT 0,
  retry_count INTEGER DEFAULT 0,
  max_retries_hit BOOLEAN DEFAULT FALSE,
  model_fallbacks INTEGER DEFAULT 0,
  tests_run INTEGER DEFAULT 0,
  tests_passed INTEGER DEFAULT 0,
  tests_failed INTEGER DEFAULT 0,
  test_pass_rate DECIMAL(5,4);
```

### Migration 002: New Tables

```sql
-- 002_new_tables.sql
CREATE TABLE IF NOT EXISTS session_turns (...);
CREATE TABLE IF NOT EXISTS token_usage_details (...);
CREATE TABLE IF NOT EXISTS session_test_runs (...);
CREATE TABLE IF NOT EXISTS session_retries (...);
CREATE TABLE IF NOT EXISTS codebase_indexes (...);
CREATE TABLE IF NOT EXISTS context_usage (...);
CREATE TABLE IF NOT EXISTS file_access_log (...);
```

### Migration 003: Target Enhancements

```sql
-- 003_target_enhancements.sql
ALTER TABLE targets ADD COLUMN IF NOT EXISTS
  last_indexed_at TIMESTAMPTZ,
  index_size_tokens INTEGER DEFAULT 0,
  total_files INTEGER DEFAULT 0,
  total_loc INTEGER DEFAULT 0;
```

---

## Implementation Phases

### Phase 1: Timestamps & Tokens (Week 1)
- [ ] Add timestamp columns to sessions
- [ ] Create token_usage_details table
- [ ] Update run-harness-v2.js to track timing
- [ ] Parse Claude output for token breakdowns
- [ ] Add API endpoints

### Phase 2: Test & Retry Tracking (Week 2)
- [ ] Create session_test_runs table
- [ ] Create session_retries table
- [ ] Integrate with test runner
- [ ] Track retry attempts in harness
- [ ] Add retry summary endpoints

### Phase 3: Codebase Indexing (Week 3)
- [ ] Create codebase_indexes table
- [ ] Build indexing service
- [ ] Add file type detection
- [ ] Calculate LOC and token estimates
- [ ] Add reindex endpoint

### Phase 4: Context Optimization (Week 4)
- [ ] Create context_usage table
- [ ] Create file_access_log table
- [ ] Implement LRU cache
- [ ] Add relevance scoring
- [ ] Integrate with harness

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Token efficiency | > 15% output/input ratio |
| Cache hit rate | > 60% |
| Context utilization | 70-90% |
| Test pass rate | > 95% |
| Retry success rate | > 80% after retries |
| Index build time | < 30 seconds |

---

## API Summary

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/db/sessions/:id/turns` | GET | Turn-by-turn breakdown |
| `/api/db/sessions/:id/timing` | GET | Timing analysis |
| `/api/db/token-usage` | GET | Token usage over time |
| `/api/db/token-usage/by-model` | GET | Usage by model |
| `/api/db/token-usage/efficiency` | GET | Efficiency metrics |
| `/api/db/tests/:repoId` | GET | Test history |
| `/api/db/tests/flaky` | GET | Flaky tests |
| `/api/db/retries/:sessionId` | GET | Retry history |
| `/api/db/retries/summary` | GET | Retry rates |
| `/api/db/codebase/:repoId` | GET | Codebase metrics |
| `/api/db/codebase/:repoId/reindex` | POST | Trigger reindex |
| `/api/db/context/:sessionId` | GET | Context usage |
| `/api/db/context/hot-files/:repoId` | GET | Hot files |

---

## Dependencies

- PostgreSQL 15+
- Node.js 18+
- Prisma ORM
- Claude CLI with stream-json output

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Database bloat from turn-level tracking | Aggregate old data, keep 30-day detail |
| Indexing large codebases slow | Incremental indexing, background jobs |
| Context overflow | Smart truncation, priority scoring |
| Token parsing errors | Fallback to session-level aggregates |

---

## Appendix: Token Cost Reference

| Model | Input/1K | Output/1K | Cache Read/1K | Cache Write/1K |
|-------|----------|-----------|---------------|----------------|
| Haiku | $0.00025 | $0.00125 | $0.00003 | $0.0003 |
| Sonnet | $0.003 | $0.015 | $0.0003 | $0.00375 |
| Opus | $0.015 | $0.075 | $0.0015 | $0.01875 |
