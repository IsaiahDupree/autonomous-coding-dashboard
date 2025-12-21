# CLAUDE.md - Project Instructions for Autonomous Agents

This file provides context and instructions for Claude when working on this project.

## Project Overview

This is the **Autonomous Coding Dashboard** - a web application for monitoring and controlling autonomous coding agents that use the Claude Agent SDK.

## Key Files

| File | Purpose |
|------|---------|
| `feature_list.json` | All features with pass/fail status - update only `passes` field |
| `claude-progress.txt` | Session log - append your work summary here |
| `init.sh` | Starts the development environment |
| `harness/run-harness.js` | The agent harness runner script |
| `harness/prompts/*.md` | System prompts for initializer and coding agents |
| `harness/dashboard-integration.js` | Functions to read harness state |

## Project Structure

```
autonomous-coding-dashboard/
├── index.html           # Main dashboard page
├── index.css            # Dashboard styles
├── app.js               # Dashboard logic
├── mock-data.js         # Sample data for development
├── feature_list.json    # Feature specifications (DO NOT modify descriptions)
├── claude-progress.txt  # Session history log
├── init.sh              # Dev environment startup script
├── harness/             # Agent harness system
│   ├── run-harness.js   # Harness runner
│   ├── dashboard-integration.js
│   ├── package.json
│   └── prompts/
│       ├── initializer.md
│       └── coding.md
├── backend/             # Backend API (if exists)
└── frontend/            # Frontend app (if exists)
```

## Running the Project

```bash
# Start development servers
./init.sh

# View the dashboard
open http://localhost:3000
```

## Feature Implementation Rules

1. **Work incrementally** - One feature at a time
2. **Test thoroughly** - Use browser automation to verify
3. **Commit often** - Descriptive commit messages
4. **Update status** - Mark features as passing only after testing
5. **Log progress** - Append to claude-progress.txt

## Coding Conventions

- Use vanilla JavaScript unless React/Vue is already set up
- Follow existing code style in the project
- Add comments for complex logic
- Use semantic HTML elements
- Keep CSS organized by component/section

## Testing Requirements

- Test all user interactions manually or with Puppeteer
- Verify responsive behavior on mobile viewports
- Check for console errors
- Ensure no regressions in existing features

## Common Commands

```bash
# Check feature status
cat feature_list.json | jq '.features | map(select(.passes == false)) | length'

# View recent progress
tail -50 claude-progress.txt

# Run the harness (single session)
node harness/run-harness.js

# Run continuously until complete
node harness/run-harness.js --continuous
```

## API Endpoints (if backend exists)

- `GET /api/status` - Current harness status
- `POST /api/harness/start` - Start the harness
- `POST /api/harness/stop` - Stop the harness
- `GET /api/features` - Feature list with status

## Important Notes

- Never remove or edit feature descriptions in feature_list.json
- Always leave code in a working state before ending a session
- If something is broken, fix it before adding new features
- Use git to track all changes and enable rollback if needed
