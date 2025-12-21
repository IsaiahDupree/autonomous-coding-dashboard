# Autonomous Coding Agent Dashboard - Control Panel Guide

## 🎮 Control Panel Overview

The **Agent Control Panel** is a comprehensive UI for managing the autonomous coding agent, monitoring system requirements, and viewing real-time terminal output - all built directly into the dashboard.

**Access**: http://localhost:3000/control.html

---

## ✨ Features

### 1. **System Requirements Checker** ✅

Automatic verification of all system components needed to run the autonomous coding agent:

````carousel
![Control Panel - Requirements & Agent Cards](file:///Users/isaiahdupree/.gemini/antigravity/brain/34766777-7baf-46f1-852d-a9e6681396d3/control_panel_top_1764990121508.png)
<!-- slide -->
**Requirements Monitored**:
- ✅ Python 3.x (v3.14.0)
- ✅ pip (v25.2)
- ✅ Claude Code CLI (v2.0.60)
- ✅ Git (installed)
- ✅ Node.js (v25.2.1)
- ✅ claude-code-sdk (v0.0.25)
- ✅ OAuth Token (configured)
<!-- slide -->
**Actions**:
- Click "🔄 Recheck" to verify requirements
- Each component shows status (✅/❌/⏳)
- Version information displayed
<!-- slide -->
All requirements automatically checked on page load!
````

---

### 2. **Agent Architecture Visualization** 📊

Interactive diagram showing the two-agent pattern:

![Long-Running Agent Harness Architecture](file:///Users/isaiahdupree/.gemini/antigravity/brain/34766777-7baf-46f1-852d-a9e6681396d3/uploaded_image_1764989929650.png)

**Components Shown**:
- **Initializer Agent** (Session 1): Creates feature_list.json, sets up project
- **Coding Agent Loop** (Sessions 2-N): Implements features iteratively
- **Core Artifacts**: Shared state (feature_list.json, claude-progress.txt, init.sh)
- **Fresh Context**: Each session starts with clean context window

---

### 3. **Agent Management Cards** 🤖

Two agent control cards for managing agent lifecycle:

#### Initializer Agent 🔧
- **Status**: Shows Idle/Running/Complete
- **Description**: Creates 200 test cases and project structure
- **Actions**: 
  - ▶️ Start
  - 📋 View Logs

#### Coding Agent 💻
- **Status**: Shows Idle/Running/Paused
- **Description**: Implements features one by one
- **Actions**:
  - ▶️ Start
  - ⏸️ Stop
  - 📋 View Logs

---

### 4. **Run Configuration Panel** ⚙️

Customize agent execution before launch:

**Configuration Options**:
```
📁 Project Directory: ./my_project
🎯 Max Iterations: Unlimited (or specify count)
🤖 Model: 
   - Claude Sonnet 4.5 (default)
   - Claude Sonnet 3.7
   - Claude Opus 4
```

**Quick Actions**:
- ⚡ **Quick Test** - Launches with 3 iterations for testing
- ↩️ **Resume Last Session** - Continues from last checkpoint
- 📁 **Open in VS Code** - Opens project directory

**Launch Button**:
```
🚀 Launch Agent
```
Starts the autonomous coding agent with configured settings.

---

### 5. **Integrated Terminal Views** 💻

Three terminal panels for comprehensive monitoring:

````carousel
![Integrated Terminals - Agent and System Output](file:///Users/isaiahdupree/.gemini/antigravity/brain/34766777-7baf-46f1-852d-a9e6681396d3/control_panel_terminals_1764990148742.png)
<!-- slide -->
**Terminal 1: Agent Output**
- Real-time agent execution logs
- Features being implemented
- Test results
- Git commits
<!-- slide -->
**Terminal 2: System Logs**
- Timestamped system events
- Requirement check results
- Status changes
- Error notifications
<!-- slide -->
**Terminal 3: Full Debug Output**
(Shown below terminals 1 & 2)
- Complete execution trace
- Debug information
- Auto-scroll toggle
- Export logs capability
````

![Full Terminal View](file:///Users/isaiahdupree/.gemini/antigravity/brain/34766777-7baf-46f1-852d-a9e6681396d3/control_panel_full_terminal_1764990154103.png)

**Terminal Features**:
- 🎨 Syntax-colored output (success/error/warning/info)
- 📋 Copy terminal content to clipboard
- 🗑️ Clear terminal
- 🔽 Auto-scroll toggle
- 💾 Export logs to file
- 📏 Scrollable history (400-500px height)

---

## 🚀 Usage Workflow

### Starting a New Project

1. **Navigate to Control Panel**
   ```
   http://localhost:3000/control.html
   ```

2. **Verify Requirements** ✅
   - Panel automatically checks on load
   - All items should show ✅ (green checkmark)
   - If any ❌ appear, see troubleshooting below

3. **Configure Run Settings**
   - Set project directory
   - Choose max iterations (or leave blank for unlimited)
   - Select model

4. **Launch Agent** 🚀
   - Click "🚀 Launch Agent" button
   - Watch terminals for real-time output
   - Initializer agent starts (Session 1)
   - Coding agent auto-continues (Session 2+)

5. **Monitor Progress**
   - View agent terminal for feature implementation
   - View system terminal for status updates
   - View full terminal for complete trace

---

## 📊 Example Terminal Output

### Session 1: Initializer
```
═══════════════════════════════════════════════════════════
🔧 SESSION 1: INITIALIZER AGENT
═══════════════════════════════════════════════════════════

📋 Reading app_spec.txt...
✓ Application specification loaded
📝 Generating feature list with 200 test cases...
   ⏳ This may take several minutes...
✓ Created feature_list.json (200 test cases)
📁 Setting up project structure...
✓ Created directories and init.sh
🔧 Initializing git repository...
✓ Git initialized
✓ Initial commit created

✅ SESSION 1 COMPLETE
```

### Session 2: Coding Agent
```
═══════════════════════════════════════════════════════════
💻 SESSION 2: CODING AGENT
═══════════════════════════════════════════════════════════

📊 Features: 0/200 passing
🔍 Analyzing codebase...
📝 Picking next feature: #1 - Initialize Git Repository
🔨 Implementing feature...
   Running: npm install
   Running: npm test
✓ Tests passing (1/1)
✓ Git commit: feat: initialize git repository
✅ Feature #1 complete

📊 Progress: 1/200 features (0.5%)
⏱️  Average time per feature: 2m 15s

🔄 Continuing with next feature...
```

---

## 🎨 UI Design Features

### Modern Dark Theme
- Deep navy blue background  gradient
- Glassmorphism card effects
- Backdrop blur on panels
- Vibrant accent colors (indigo, purple, cyan)

### Terminal Aesthetics
- Authentic terminal look with macOS-style dots (🔴🟡🟢)  
- Monospace font (JetBrains Mono)
- Color-coded output:
  - 🟢 Green = Success
  - 🔴 Red = Error
  - 🟡 Yellow = Warning
  - 🔵 Blue = Info
- Smooth scrolling
- Customizable scrollbar

### Responsive Layout
- Adapts to mobile, tablet, and desktop
- Terminal grid stacks on smaller screens
- Cards reflow automatically

---

## 🔧 Advanced Features

### Agent Lifecycle Control

**Start Agent**:
```javascript
startAgent('initializer')  // or 'coding'
```
- Updates status badge to 🟢 Running
- Begins execution in terminals
- Logs all actions

**Stop Agent**:
```javascript
stopAgent('coding')
```
- Gracefully pauses execution
- Saves progress to feature_list.json
- Status changes to ⏸️ Paused
- Can resume later with same command

**View Logs**:
```javascript
viewLogs('initializer')
```
- Displays historical logs
- Filters by agent type
- Shows in full terminal

---

## 📁 File Structure

```
autonomous-coding-dashboard/
├── index.html              # Main dashboard
├── control.html            # 🆕 Control panel UI
├── index.css               # Core styles
├── agent-control.css       # 🆕 Control panel styles
├── app.js                  # Dashboard logic
├── agent-control.js        # 🆕 Control panel logic
├── mock-data.js            # Simulation data
├── check-requirements.py   # Python requirements checker
└── CONNECTIVITY_REPORT.md  # Setup documentation
```

---

## 🔄 Real-Time Updates

The control panel simulates real-time agent execution:

**Update Frequency**:
- Requirements: On demand (via "Recheck" button)
- Agent status: Real-time (immediate)
- Terminal output: Streaming (as generated)
- System logs: Timestamped entries

**Auto-Scroll**:
- Enabled by default
- Toggle with "🔽 Auto-scroll ON/OFF" button
- When disabled, terminal stays at current scroll position

---

## 🎯 Quick Actions

### Quick Test (3 iterations)
```bash
# Automatically sets:
Project Directory: ./test_project
Max Iterations: 3

# Perfect for testing before full run
```

### Resume Last Session
```bash
# Finds last active session
# Resumes from last completed feature
# Continues with same configuration
```

### Open in VS Code
```bash
# Opens project directory in VS Code
# Useful for reviewing generated code
# Works with any configured editor
```

---

## ⚙️ Configuration

### Environment Variables Required

The control panel checks for:
```bash
# Option 1: OAuth Token (Currently Set ✅)
CLAUDE_CODE_OAUTH_TOKEN=sk-ant-oat01-***

# Option 2: API Key (Alternative)  
ANTHROPIC_API_KEY=sk-ant-api03-***
```

### Virtual Environment
Agent runs in isolated Python environment:
```bash
Location: /tmp/claude-quickstarts/autonomous-coding/venv
Activate: source venv/bin/activate
```

---

## 🐛 Troubleshooting

### Requirements Show ❌

**Python/pip not found**:
```bash
brew install python
```

**Claude CLI not found**:
```bash
npm install -g @anthropic-ai/claude-code
```

**OAuth Token not set**:
```bash
claude setup-token
export CLAUDE_CODE_OAUTH_TOKEN="<token>"
```

**SDK not installed**:
```bash
cd /tmp/claude-quickstarts/autonomous-coding
source venv/bin/activate
pip install claude-code-sdk
```

### Agent Won't Start

1. Check all requirements show ✅
2. Verify OAuth token is set
3. Ensure virtual environment is activated
4. Check terminal for specific error messages

### Terminal Not Updating

1. Check auto-scroll is enabled
2. Refresh page to restart connection
3. Verify JavaScript console for errors

---

## 📝 Connecting Real Agent

To connect real autonomous-coding agent instead of simulation:

1. **Modify `agent-control.js`**:
   - Replace `simulateAgentRun()` with actual subprocess call
   - Use WebSocket for real-time output streaming
   - Connect to backend API

2. **Add Backend Server**:
   ```python
   # Python Flask/FastAPI backend
   # Manages agent subprocess
   # Streams output via WebSocket
   # Handles agent lifecycle
   ```

3. **Update Terminal Output**:
   ```javascript
   // WebSocket connection
   const ws = new WebSocket('ws://localhost:8000/agent');
   ws.onmessage = (event) => {
     addAgentLog(event.data);
   };
   ```

---

## 🎉 Summary

The **Agent Control Panel** provides:

✅ **All-in-one management** for autonomous coding agent  
✅ **System requirements verification** with auto-checking  
✅ **Visual architecture** diagram for understanding flow  
✅ **Agent lifecycle control** (start/stop/resume)  
✅ **Three integrated terminals** for comprehensive monitoring  
✅ **Real-time output streaming** with color-coded logs  
✅ **Quick actions** for common workflows  
✅ **Modern UI** with dark theme and glassmorphism  

**Access Now**: [http://localhost:3000/control.html](http://localhost:3000/control.html)

---

**Created**: December 5, 2025  
**Dashboard Location**: `/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard`  
**Server**: http://localhost:3000
