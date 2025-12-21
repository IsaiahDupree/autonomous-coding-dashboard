# Project Radar - Isaiah's Project Dashboard

A visual dashboard to track all your web and mobile app projects, their statuses, automation fitness, and progress.

## Features

- **19 Projects Tracked**: All your web/mobile apps classified by touch, profit, and difficulty
- **Automation Candidates**: Highlights low-touch, high-profit projects ideal for automation
- **Real-time Status**: Auto-refreshes every 15 seconds
- **CLI Integration**: Update status from automation scripts
- **Startup Support**: Launch on Mac boot so you never forget project status

## Quick Start

```bash
# Install dependencies
npm install

# Start the dashboard
npm run dev

# Open http://localhost:4000
```

## Project Classification

| Mode | Description |
|------|-------------|
| **Human Core** | High touch, requires your brain for strategy/UX |
| **Auto Core** | Low touch, ideal for full automation |
| **Auto Engine** | Automated processing pipeline, human oversight |
| **Hybrid** | Mix of automated + human tasks |

## Automation Candidates (Delegate These)

Projects matching **Low Touch + High Profit + Low/Medium Difficulty**:

1. **SteadyLetters** - Handwritten letter API
2. **Prompt Sharing & Storage** - Prompt locker tool
3. **AI Context Organizer** - ChatGPT convo exports
4. **Transcript & Description Generator** - Video → social copy
5. **SassHot** - SEO keyword research tool

## Update Status from CLI

```bash
# List all projects
node scripts/update-status.js --list

# Update a project's status
node scripts/update-status.js sasshot --status running --action "Fetching keyword data"

# Mark as idle
node scripts/update-status.js sasshot --status idle --action "Review results"
```

### Status Values
- `running` - Automation actively working
- `in-progress` - Human actively working
- `planning` - In design/planning phase
- `idle` - Not currently being worked on
- `waiting` - Blocked on something
- `failed` - Last run failed
- `done` - Completed

## Startup on Mac Boot

### Option 1: Login Items (Simple)

1. Open **System Settings → General → Login Items**
2. Add the `start-radar.sh` script

### Option 2: LaunchAgent (More Reliable)

```bash
# Copy the plist to LaunchAgents
cp com.isaiah.projectradar.plist ~/Library/LaunchAgents/

# Load it
launchctl load ~/Library/LaunchAgents/com.isaiah.projectradar.plist

# To unload
launchctl unload ~/Library/LaunchAgents/com.isaiah.projectradar.plist
```

## Integration with Automation Scripts

Your automation scripts can update the dashboard by modifying `public/projects.json`:

```javascript
import { updateProjectStatus } from './scripts/update-status.js'

// In your automation pipeline
updateProjectStatus('sasshot', { 
  status: 'running', 
  next_action: 'Fetching TikTok keyword data' 
})

// After completion
updateProjectStatus('sasshot', { 
  status: 'idle', 
  next_action: 'Review results & design UI' 
})
```

## Project Data Location

All project data lives in `public/projects.json`. Edit directly or use the CLI tool.

## Tech Stack

- **React 18** + Vite
- **Tailwind CSS** for styling
- **Lucide Icons**

---

Built for Isaiah's meta-OS project management workflow.
