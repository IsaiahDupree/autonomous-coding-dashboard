# Autonomous Coding Dashboard - Setup Guide

This guide will help you set up and test the complete autonomous coding dashboard with Claude harness integration.

## Prerequisites

1. **Node.js 18+** installed
2. **Claude Code subscription** and CLI installed
3. **Backend API** running (from `/backend` directory)
4. **Redis** running (for backend services)
5. **PostgreSQL** or **Supabase** (for database)

## Step 1: Download and Transcribe Videos ✅

The YouTube videos have been downloaded and transcribed:
- `scripts/transcripts/agent_harnesses_vibe_coding_transcript.md`
- `scripts/transcripts/claude_autonomous_coding_1_transcript.md`
- `scripts/transcripts/claude_autonomous_coding_2_transcript.md`

## Step 2: Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   Create a `.env` file:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/autonomous_coding"
   REDIS_URL="redis://localhost:6379"
   PORT=3001
   ANTHROPIC_API_KEY="your-claude-api-key"
   ```

4. **Initialize database**:
   ```bash
   npm run db:push
   ```

5. **Start backend server**:
   ```bash
   npm run dev
   ```

   The backend should now be running on `http://localhost:3001`

## Step 3: Dashboard Setup

1. **Navigate to dashboard directory**:
   ```bash
   cd dashboard
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment**:
   Create `.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3001
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```

   The dashboard should now be running on `http://localhost:3000`

## Step 4: Test Harness Setup

1. **Verify Claude CLI is installed**:
   ```bash
   which claude
   claude --version
   ```

   If not installed, follow: https://docs.anthropic.com/en/docs/agents-and-tools/claude-code

2. **Test harness script**:
   ```bash
   cd harness
   node run-harness.js --help
   ```

3. **Run test script**:
   ```bash
   cd dashboard
   npx tsx scripts/test-harness.ts
   ```

## Step 5: Using the Dashboard

### View Projects
1. Open `http://localhost:3000` in your browser
2. You'll see all projects listed as cards
3. Click on a project to view details

### Start a Harness
1. Select a project
2. In the "Harness Control" section:
   - Set max sessions (default: 100)
   - Set session delay in milliseconds (default: 5000)
   - Enable/disable continuous mode
   - Enter project path (optional, defaults to current directory)
3. Click "Start Harness"

### Monitor Progress
- **Feature Progress**: See how many features are passing vs total
- **Agent Runs**: View history of agent execution sessions
- **Harness Logs**: Real-time logs from the harness process
- **Usage & Costs**: Track API token usage and costs
- **Recent Activity**: Timeline of recent events

### Stop a Harness
- Click "Stop Harness" button in the Harness Control section

## Step 6: Test Full Autonomous Coding

1. **Create a test project** (if needed):
   ```bash
   # Use the dashboard UI or API
   curl -X POST http://localhost:3001/api/projects \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Test Project",
       "description": "Testing autonomous coding",
       "touchLevel": "medium",
       "profitPotential": "medium",
       "difficulty": "medium",
       "automationMode": "hybrid"
     }'
   ```

2. **Start harness from dashboard**:
   - Select the project
   - Configure harness settings
   - Click "Start Harness"

3. **Monitor in real-time**:
   - Watch feature progress update
   - View harness logs streaming
   - Check agent runs being created
   - Monitor costs accumulating

4. **Verify autonomous execution**:
   - Check that features are being marked as passing
   - Verify commits are being made (if git is configured)
   - Confirm sessions are running automatically

## Troubleshooting

### Backend not connecting
- Verify backend is running: `curl http://localhost:3001/api/health`
- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Check CORS settings in backend

### Harness not starting
- Verify Claude CLI is installed: `which claude`
- Check project path exists
- Verify harness script exists: `ls harness/run-harness.js`
- Check backend logs for errors

### No data showing
- Verify database is initialized: `cd backend && npm run db:push`
- Check if projects exist: `curl http://localhost:3001/api/projects`
- Verify Redis is running: `redis-cli ping`

### Features not updating
- Check if `feature_list.json` exists in project directory
- Verify harness is reading/writing to correct files
- Check file permissions

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│         Next.js Dashboard (Port 3000)           │
│  - Project Management                            │
│  - Real-time Monitoring                          │
│  - Harness Control                               │
└──────────────────┬──────────────────────────────┘
                   │ HTTP API
┌──────────────────▼──────────────────────────────┐
│      Backend API Server (Port 3001)             │
│  - Express.js API                               │
│  - Prisma ORM                                   │
│  - Socket.IO for real-time                      │
│  - Harness Manager Service                      │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│           Claude Harness Process                │
│  - run-harness.js                               │
│  - Initializer Agent                            │
│  - Coding Agent                                 │
│  - Feature List Management                      │
└─────────────────────────────────────────────────┘
```

## Next Steps

1. **Customize prompts**: Edit `harness/prompts/initializer.md` and `harness/prompts/coding.md`
2. **Add more projects**: Use the dashboard UI or API to create projects
3. **Monitor costs**: Set up budget alerts in the dashboard
4. **Review transcripts**: Read the video transcripts for insights on harness best practices

## Resources

- [Claude Quickstarts - Autonomous Coding](https://github.com/anthropics/claude-quickstarts/tree/main/autonomous-coding)
- [Agent Harness Guide](./AGENT_HARNESS_GUIDE.md)
- [Video Transcripts](./scripts/transcripts/)

## Support

If you encounter issues:
1. Check backend logs: `cd backend && npm run dev`
2. Check dashboard logs: Browser console
3. Check harness logs: Dashboard "Harness Logs" section
4. Review error messages in the dashboard UI

