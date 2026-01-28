# Port Configuration Guide

## Default Ports

- **Dashboard**: `3535` (was 3000)
- **Backend API**: `3434` (was 3001)
- **Database**: `5432` (PostgreSQL default)
- **Redis**: `6379` (Redis default)

## Configuration

### Environment Variables

All ports are configurable via environment variables:

```bash
# Backend
export BACKEND_PORT=3434
export PORT=3434  # Alternative

# Dashboard
export DASHBOARD_PORT=3535

# API URL (for dashboard)
export NEXT_PUBLIC_API_URL=http://localhost:3434
export NEXT_PUBLIC_BACKEND_PORT=3434
```

### Quick Start Scripts

Use the provided scripts which automatically configure ports:

```bash
# Start backend
./scripts/start-backend.sh

# Start dashboard
./scripts/start-dashboard.sh
```

### Manual Start

```bash
# Backend
cd backend
PORT=3434 npm run dev

# Dashboard
cd dashboard
DASHBOARD_PORT=3535 npm run dev
```

## API Key Configuration

The system automatically sources the API key from Claude Code Desktop:

1. **Environment Variables** (highest priority):
   - `CLAUDE_CODE_OAUTH_TOKEN`
   - `ANTHROPIC_API_KEY`

2. **Claude Code Desktop** (automatic):
   - Scripts use `scripts/get-claude-key.sh` to source from Claude Code
   - Backend automatically sources if env vars not set

## Testing

Run connectivity tests:

```bash
./scripts/test-connectivity.sh
```

Run full harness test:

```bash
./scripts/test-harness-full.sh [project-id] [max-sessions]
```

Run all tests:

```bash
./scripts/run-all-tests.sh
```

## URLs

- Dashboard: http://localhost:3535
- Backend API: http://localhost:3434
- Health Check: http://localhost:3434/api/health

