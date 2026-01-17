# Quick Start Guide

## 🚀 Start Everything

### Option 1: Use Start Scripts (Recommended)

```bash
# Terminal 1: Start Backend
./scripts/start-backend.sh

# Terminal 2: Start Dashboard
./scripts/start-dashboard.sh
```

### Option 2: Manual Start

```bash
# Terminal 1: Backend
cd backend
PORT=3434 npm run dev

# Terminal 2: Dashboard
cd dashboard
DASHBOARD_PORT=3535 npm run dev
```

## ✅ Verify Setup

Run connectivity tests:

```bash
./scripts/test-connectivity.sh
```

Expected output:
- ✅ Claude API Key found
- ✅ Claude CLI installed
- ✅ Harness script valid
- ✅ Prompts exist
- ⚠️ Backend/Dashboard (start them if not running)

## 🧪 Test Harness

### Quick Test (3 sessions)

```bash
./scripts/test-harness-full.sh "" 3
```

### Full Test (10 sessions)

```bash
./scripts/test-harness-full.sh "" 10
```

## 📊 Access Dashboard

Open in browser: **http://localhost:3535**

## 🔧 Configuration

### Ports
- Dashboard: `3535` (set via `DASHBOARD_PORT`)
- Backend: `3434` (set via `BACKEND_PORT` or `PORT`)

### API Key
Automatically sourced from Claude Code Desktop. If not found:
1. Check `CLAUDE_CODE_OAUTH_TOKEN` environment variable
2. Or set `ANTHROPIC_API_KEY`

## 🐛 Troubleshooting

### Backend won't start
```bash
cd backend
npm install
npm run db:push  # Initialize database
PORT=3434 npm run dev
```

### Dashboard won't start
```bash
cd dashboard
npm install
DASHBOARD_PORT=3535 npm run dev
```

### API Key not found
```bash
# Check if set
echo $CLAUDE_CODE_OAUTH_TOKEN

# Or source from Claude Code
export CLAUDE_CODE_OAUTH_TOKEN=$(./scripts/get-claude-key.sh)
```

## 📝 Next Steps

1. Start backend and dashboard
2. Open dashboard at http://localhost:3535
3. Create or select a project
4. Start a harness
5. Monitor progress in real-time

