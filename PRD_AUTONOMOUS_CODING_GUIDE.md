# PRD-Based Autonomous Coding Guide

## 🚀 Quick Start

### 1. Create a Project from PRD

```bash
# Create project with your PRD file
./scripts/setup-prd-project.sh my-app path/to/your/PRD.md

# Or create with sample PRD
./scripts/setup-prd-project.sh my-app
```

This creates:
- `test-projects/my-app/PRD.md` - Your product requirements
- `test-projects/my-app/feature_list.json` - Will be populated by initializer
- `test-projects/my-app/claude-progress.txt` - Progress tracking
- `test-projects/my-app/init.sh` - Environment setup script

### 2. Run Autonomous Coding

```bash
# Run harness on the project (10 sessions)
./scripts/run-autonomous-from-prd.sh test-projects/my-app 10

# Or run continuously until all features done
./scripts/run-autonomous-from-prd.sh test-projects/my-app 100
```

## 📋 How It Works

### Initializer Phase (First Run)
1. Reads `PRD.md` to understand requirements
2. Creates comprehensive `feature_list.json` with all features
3. Sets up project structure
4. Makes initial commit

### Coding Phase (Subsequent Runs)
1. Reads `feature_list.json` to see what's done/pending
2. Reads `claude-progress.txt` for context
3. Chooses highest-priority unfinished feature
4. Implements ONE feature at a time
5. Tests the feature
6. Updates `feature_list.json` when feature passes
7. Commits changes
8. Updates `claude-progress.txt`

## 📁 Project Structure

```
test-projects/
└── my-app/
    ├── PRD.md                    # Product Requirements Document
    ├── feature_list.json         # All features (auto-generated)
    ├── claude-progress.txt       # Session progress log
    ├── init.sh                   # Dev environment setup
    └── src/                      # Your code (created by agent)
```

## 🎯 Example PRD Format

```markdown
# My Application

## Overview
A web application for task management.

## Features
1. User authentication
2. Task creation and editing
3. Task categories
4. Due date reminders
5. Search functionality

## Technical Stack
- React frontend
- Node.js backend
- PostgreSQL database

## Success Criteria
- All features working
- Tests passing
- Responsive design
```

## 🔄 Workflow

1. **Write PRD** - Define what you want built
2. **Setup Project** - Run setup script
3. **Start Harness** - Let it code autonomously
4. **Monitor Progress** - Watch dashboard or logs
5. **Review Code** - Check commits and progress

## 📊 Monitoring

### Via Dashboard
- Open http://localhost:3535
- View project status
- Monitor feature progress
- Check harness logs

### Via Files
- `claude-progress.txt` - Read session summaries
- `feature_list.json` - See feature completion status
- Git commits - Review code changes

## 🎛️ Configuration

### Harness Options
- `--max=N` - Maximum sessions (default: 100)
- `--continuous` - Run until all features done
- Single session - Just run without flags

### Project Settings
Edit `harness/prompts/initializer.md` and `harness/prompts/coding.md` to customize agent behavior.

## ✅ Success Indicators

- Features marked `"passes": true` in `feature_list.json`
- Commits made with descriptive messages
- Progress file updated after each session
- Code compiles/runs without errors

## 🐛 Troubleshooting

### Harness won't start
- Check Claude CLI: `claude --version`
- Verify API key: `echo $CLAUDE_CODE_OAUTH_TOKEN`
- Check project path exists

### Features not completing
- Review `claude-progress.txt` for errors
- Check if tests are passing
- Verify feature descriptions are clear

### Dashboard shows errors
- Check backend is running: `curl http://localhost:3434/api/health`
- Verify database connection
- Check browser console for details

## 🎉 Next Steps

1. Create your first PRD-based project
2. Let the harness code autonomously
3. Monitor progress in dashboard
4. Review and iterate on the code

The system is ready to code autonomously from PRDs!

