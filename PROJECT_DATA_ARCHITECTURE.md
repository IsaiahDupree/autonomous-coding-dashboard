# Project Data Persistence Architecture

## Overview

The autonomous coding agent already creates per-project data files. The dashboard needs to **read and display** this existing data instead of using mock data.

## Current Agent Data Storage

### Per-Project Files Created by Agent

```
/path/to/project/
├── feature_list.json          # 200 test cases with status
├── claude-progress.txt        # Session handoff notes  
├── app_spec.txt              # Original specification
├── .git/                     # Git history
│   └── logs/HEAD             # Commit log
├── init.sh                   # Setup script
└── .claude_settings.json     # Security settings
```

### feature_list.json Structure
```json
{
  "features": [
    {
      "id": 1,
      "name": "Initialize Git Repository",
      "status": "passing",  // or "pending"
      "session": 2,
      "timeSpent": "2m 15s",
      "testOutput": "All tests passed",
      "commit": "a3f4b2c",
      "filesChanged": ["init.sh", "package.json"]
    }
    // ... 199 more features
  ]
}
```

---

## Proposed Solution: Multi-Project Dashboard

### Architecture Options

#### **Option 1: File-Based (Simplest)**
Dashboard directly reads `feature_list.json` from project directories.

```javascript
// Read from filesystem
async function loadProjectData(projectPath) {
  const featureList = await readFile(`${projectPath}/feature_list.json`);
  const progress = await readFile(`${projectPath}/claude-progress.txt`);
  const gitLog = await execCommand(`cd ${projectPath} && git log --oneline`);
  
  return {
    features: JSON.parse(featureList),
    progress: progress,
    commits: parseGitLog(gitLog)
  };
}
```

**Pros**: No backend needed, direct file access  
**Cons**: Security restrictions in browser, needs Node.js backend

---

#### **Option 2: Backend API (Recommended)**
Create a simple backend server that serves project data.

```javascript
// Backend API (Express.js)
app.get('/api/projects', (req, res) => {
  const projects = scanProjectsDirectory();
  res.json(projects);
});

app.get('/api/projects/:name/features', (req, res) => {
  const data = readFeatureList(req.params.name);
  res.json(data);
});

app.get('/api/projects/:name/sessions', (req, res) => {
  const progress = readProgressFile(req.params.name);
  res.json(parseProgressNotes(progress));
});
```

**Pros**: Secure, scalable, supports multiple projects  
**Cons**: Requires backend server

---

#### **Option 3: Hybrid with Local Storage**
Use browser LocalStorage to cache project data.

```javascript
// Cache project data locally
function saveProjectToCache(projectName, data) {
  localStorage.setItem(
    `project_${projectName}`,
    JSON.stringify({
      features: data.features,
      sessions: data.sessions,
      lastUpdated: Date.now()
    })
  );
}

function loadProjectFromCache(projectName) {
  const cached = localStorage.getItem(`project_${projectName}`);
  return cached ? JSON.parse(cached) : null;
}
```

**Pros**: Fast access, works offline  
**Cons**: Limited storage, manual sync needed

---

## Recommended Implementation

### Backend Server Structure

```
autonomous-coding-dashboard/
├── frontend/                  # Existing dashboard
│   ├── index.html
│   ├── control.html
│   └── ...
├── backend/                   # NEW: API server
│   ├── server.js             # Express server
│   ├── routes/
│   │   ├── projects.js       # Project endpoints
│   │   ├── features.js       # Feature endpoints
│   │   └── sessions.js       # Session endpoints
│   ├── services/
│   │   ├── fileReader.js     # Read feature_list.json
│   │   ├── gitParser.js      # Parse git logs
│   │   └── progressParser.js # Parse claude-progress.txt
│   └── package.json
└── projects/                  # Projects directory
    ├── project1/
    │   ├── feature_list.json
    │   └── ...
    └── project2/
        ├── feature_list.json
        └── ...
```

### API Endpoints

```javascript
// GET /api/projects
// Returns list of all projects
{
  "projects": [
    { "name": "my_project", "path": "/path/to/my_project", "status": "active" },
    { "name": "test_project", "path": "/path/to/test_project", "status": "complete" }
  ]
}

// GET /api/projects/:name/features
// Returns feature_list.json data
{
  "features": [...200 features...],
  "stats": {
    "total": 200,
    "passing": 142,
    "pending": 58,
    "successRate": 0.71
  }
}

// GET /api/projects/:name/sessions
// Returns parsed session data
{
  "sessions": [
    { "id": 1, "type": "initializer", "duration": "4m32s", "features": 0 },
    { "id": 2, "type": "coding", "duration": "6h15m", "features": 45 }
  ]
}

// GET /api/projects/:name/commits
// Returns git commit history
{
  "commits": [
    { "hash": "a3f4b2c", "message": "feat: implement feature #1", "date": "..." }
  ]
}
```

---

## Implementation Steps

### Phase 1: Backend Setup (30 minutes)

1. **Create backend directory**
   ```bash
   mkdir backend
   cd backend
   npm init -y
   npm install express cors fs-extra simple-git
   ```

2. **Create server.js**
   ```javascript
   const express = require('express');
   const cors = require('cors');
   const projectRoutes = require('./routes/projects');
   
   const app = express();
   app.use(cors());
   app.use(express.json());
   
   app.use('/api/projects', projectRoutes);
   
   app.listen(3001, () => {
     console.log('Backend running on http://localhost:3001');
   });
   ```

3. **Create project routes** (read feature_list.json, parse git logs, etc.)

### Phase 2: Frontend Updates (20 minutes)

1. **Replace mock-data.js** with API calls
   ```javascript
   // Instead of: const data = mockData.features
   // Use:
   async function loadFeatures(projectName) {
     const response = await fetch(`http://localhost:3001/api/projects/${projectName}/features`);
     return await response.json();
   }
   ```

2. **Add project selector** to sidebar
   ```html
   <select id="project-selector" onchange="switchProject()">
     <option value="my_project">My Project</option>
     <option value="test_project">Test Project</option>
   </select>
   ```

3. **Implement auto-refresh** for active projects
   ```javascript
   setInterval(() => {
     if (isProjectActive()) {
       refreshProjectData();
     }
   }, 5000); // Refresh every 5 seconds
   ```

### Phase 3: Project Management (15 minutes)

1. **Project scanner** - Auto-discover projects in directory
2. **Project switcher** - Switch between multiple projects
3. **Data caching** - LocalStorage for recent projects

---

## Data Flow Diagram

```
┌─────────────────┐
│ Autonomous      │
│ Coding Agent    │
│                 │
│ Writes:         │
│ ├─ feature_list │
│ ├─ progress.txt │
│ └─ git commits  │
└────────┬────────┘
         │
         │ Files on disk
         ↓
┌─────────────────┐
│ Backend API     │
│ (Express.js)    │
│                 │
│ Reads files &   │
│ serves via API  │
└────────┬────────┘
         │
         │ HTTP/WebSocket
         ↓
┌─────────────────┐
│ Dashboard       │
│ (Frontend)      │
│                 │
│ Displays data   │
│ in UI           │
└─────────────────┘
```

---

## Example: Reading Real Data

### Before (Mock Data)
```javascript
// sidebar.js
const features = mockData.features; // Static data
```

### After (Real Data)
```javascript
// sidebar.js
const projectName = getCurrentProject();
const response = await fetch(`http://localhost:3001/api/projects/${projectName}/features`);
const { features } = await response.json(); // Live data from feature_list.json
```

---

## Multi-Project Support

### Project Selector in Sidebar
```html
<div class="sidebar-header">
  <select class="project-dropdown" onchange="switchProject(this.value)">
    <option value="my_project">My Project (142/200)</option>
    <option value="test_project">Test Project (3/200)</option>
    <option value="demo_app">Demo App (200/200)</option>
  </select>
</div>
```

### Dashboard State Management
```javascript
// Save current project to localStorage
function switchProject(projectName) {
  localStorage.setItem('currentProject', projectName);
  loadProjectData(projectName);
  updateUI();
}

// Load on page load
const currentProject = localStorage.getItem('currentProject') || 'my_project';
loadProjectData(currentProject);
```

---

## File Watching for Real-Time Updates

```javascript
// Backend: Watch for file changes
const chokidar = require('chokidar');

const watcher = chokidar.watch('./projects/*/feature_list.json');

watcher.on('change', (path) => {
  const projectName = extractProjectName(path);
  // Notify connected dashboard clients via WebSocket
  io.emit('project-updated', { projectName });
});
```

```javascript
// Frontend: Listen for updates
const socket = io('http://localhost:3001');

socket.on('project-updated', ({ projectName }) => {
  if (projectName === getCurrentProject()) {
    refreshProjectData(); // Auto-reload data
  }
});
```

---

## Summary

**Current**: Dashboard uses static mock data  
**Needed**: Read real data from agent's output files  
**Solution**: Backend API that reads `feature_list.json` and serves to dashboard

**Next Steps**:
1. ✅ Create backend Express server
2. ✅ Add API endpoints for projects/features/sessions
3. ✅ Update frontend to fetch real data
4. ✅ Add project selector for multi-project support
5. ✅ Implement file watching for real-time updates

Would you like me to implement the backend API server now?
