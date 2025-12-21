# Project Radar Integration - Implementation Guide

## 🎯 Overview

This guide shows how to integrate Project Radar's classification system, glass-morphism styling, and features into the Next.js Autonomous Coding Platform.

## ✨ Key Features to Integrate

### 1. Project Classification System
- **Touch Level**: High/Medium/Low (human involvement needed)
- **Profit Potential**: High/Medium/Low (revenue potential)
- **Difficulty**: High/Medium/Low (technical complexity)
- **Automation Mode**: Human Core, Auto Core, Auto Engine, Hybrid

### 2. Visual Design
- Glass-morphism cards with backdrop blur
- Color-coded projects (each has unique color)
- Pulsing animations for "running" status
- Dark theme matching Project Radar

### 3. Status System
- 7 statuses: Running, In-Progress, Planning, Idle, Waiting, Failed, Done
- Status badges with icons (from lucide-react)
- Real-time auto-refresh every 15 seconds

### 4. Smart Filtering
- All, Active, Auto Projects, Human Projects
- High Profit, Low Touch
- Automation Candidates banner

---

## 📁 Files to Update

### 1. `/app/globals.css`

Add Project Radar's glass-morphism and animations:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Glass-morphism from Project Radar */
.glass-card {
  background: rgba(30, 41, 59, 0.8);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* Pulsing animation for running projects */
@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 5px currentColor; }
  50% { box-shadow: 0 0 20px currentColor; }
}

.status-running {
  animation: pulse-glow 2s ease-in-out infinite;
}
```

### 2. `/app/page.tsx`

Replace the entire file with the enhanced version that includes:
- Classification badges (Touch, Profit, Difficulty)
- Automation mode badges
- Glass-morphism cards
- Status badges with icons
- Filtering system
- Automation candidates banner
- Stats dashboard
- Real-time refresh

**Key Components to Add**:

```typescript
// Status Configuration
const STATUS_CONFIG = {
  'in-progress': { label: 'In Progress', color: 'bg-blue-500', icon: Play },
  'running': { label: 'Running', color: 'bg-green-500', icon: Activity },
  'idle': { label: 'Idle', color: 'bg-gray-500', icon: Pause },
  'planning': { label: 'Planning', color: 'bg-yellow-500', icon: Brain },
  'waiting': { label: 'Waiting', color: 'bg-orange-500', icon: Clock },
  'failed': { label: 'Failed', color: 'bg-red-500', icon: AlertCircle },
  'done': { label: 'Done', color: 'bg-emerald-500', icon: CheckCircle2 }
}

// Automation Configuration  
const AUTOMATION_CONFIG = {
  'human-core': { label: 'Human Core', icon: Users, color: 'text-purple-400' },
  'auto-core': { label: 'Auto Core', icon: Bot, color: 'text-green-400' },
  'auto-engine': { label: 'Auto Engine', icon: Cpu, color: 'text-emerald-400' },
  'hybrid': { label: 'Hybrid', icon: Zap, color: 'text-yellow-400' }
}

// Level Colors for Touch/Profit/Difficulty
const LEVEL_COLORS = {
  high: 'bg-red-500/20 text-red-300 border-red-500/30',
  medium: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  low: 'bg-green-500/20 text-green-300 border-green-500/30'
}
```

**Components**:

```typescript
// Project Icon with colored background
function ProjectIcon({ project, size = 48 }) {
  const initial = project.name.charAt(0).toUpperCase()
  return (
    <div 
      className="rounded-xl flex items-center justify-center font-bold text-white shadow-lg"
      style={{ 
        width: size, 
        height: size, 
        backgroundColor: project.color,
        fontSize: size * 0.4
      }}
    >
      {initial}
    </div>
  )
}

// Status Badge with icon
function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG['idle']
  const Icon = config.icon
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${config.color} text-white`}>
      <Icon size={12} />
      {config.label}
    </div>
  )
}

// Classification Pills
function LevelPill({ level, label }) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs border ${LEVEL_COLORS[level]}`}>
      {label}: {level.charAt(0).toUpperCase() + level.slice(1)}
    </span>
  )
}

// Automation Badge
function AutomationBadge({ mode }) {
  const config = AUTOMATION_CONFIG[mode] || AUTOMATION_CONFIG['hybrid']
  const Icon = config.icon
  return (
    <div className={`flex items-center gap-1 ${config.color} text-xs`}>
      <Icon size={12} />
      {config.label}
    </div>
  )
}
```

**Enhanced Project Card**:

```typescript
function ProjectCard({ project }) {
  const isRunning = project.status === 'running'
  
  return (
    <Link href={`/project/${project.id}`}>
      <div 
        className={`glass-card rounded-xl p-4 hover:border-white/20 transition-all duration-300 cursor-pointer ${isRunning ? 'status-running' : ''}`}
      >
        {/* Header with icon + status */}
        <div className="flex items-start gap-3 mb-3">
          <ProjectIcon project={project} />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white truncate">{project.name}</h3>
            <p className="text-xs text-gray-400">{project.type} • {project.category}</p>
          </div>
          <StatusBadge status={project.status} />
        </div>

        {/* Description */}
        <p className="text-sm text-gray-300 mb-3 line-clamp-2">{project.description}</p>

        {/* Classification Metrics */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <LevelPill level={project.touch_level} label="Touch" />
          <LevelPill level={project.profit_potential} label="Profit" />
          <LevelPill level={project.difficulty} label="Diff" />
        </div>

        {/* Automation Mode */}
        <div className="flex items-center justify-between mb-3">
          <AutomationBadge mode={project.automation_mode} />
          {project.progress && (
            <span className="text-xs text-gray-400">
              {project.progress.passing}/{project.progress.total} features
            </span>
          )}
        </div>

        {/* Progress Bar */}
        {project.progress && (
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden mb-3">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400"
              style={{ width: `${(project.progress.passing / project.progress.total) * 100}%` }}
            />
          </div>
        )}

        {/* Next Action */}
        {project.next_action && (
          <div className="bg-black/20 rounded-lg p-2">
            <div className="text-xs text-gray-400 mb-0.5">Next Action</div>
            <div className="text-sm text-white">{project.next_action}</div>
          </div>
        )}
      </div>
    </Link>
  )
}
```

---

## 📊 Data Structure

Each project needs these fields:

```typescript
interface Project {
  id: string
  name: string
  description: string
  type: string  // 'web', 'mobile', 'web+mobile', 'web+api'
  category: string  // 'CRM', 'E-commerce', 'Analytics', etc.
  
  // Classification System
  touch_level: 'high' | 'medium' | 'low'
  profit_potential: 'high' | 'medium' | 'low'
  difficulty: 'high' | 'medium' | 'low'
  automation_mode: 'human-core' | 'auto-core' | 'auto-engine' | 'hybrid'
  
  // Status
  status: 'in-progress' | 'running' | 'idle' | 'planning' | 'waiting' | 'failed' | 'done'
  next_action?: string
  
  // Visual
  color: string  // Hex color for project icon
  
  // Progress (for autonomous projects)
  progress?: {
    passing: number
    total: number
  }
}
```

---

## 🎨 Styling Integration

The key is combining:
1. **Project Radar's** glass-morphism and dark theme
2. **shadcn/ui's** component library
3. **Tailwind CSS** utility classes

**Color Scheme**:
- Background: `bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950`
- Cards: `glass-card` (rgba(30, 41, 59, 0.8) + backdrop-blur)
- Borders: `border-zinc-800` → `border-white/20` on hover
- Text: `text-white`, `text-gray-400`, `text-gray-300`

---

## 🔄 Real-Time Features

```typescript
// Auto-refresh every 15 seconds
useEffect(() => {
  loadProjects()
  const interval = setInterval(loadProjects, 15000)
  return () => clearInterval(interval)
}, [])
```

---

## 🎯 Filtering System

```typescript
const [filter, setFilter] = useState('all')

const filteredProjects = projects.filter(p => {
  if (filter === 'all') return true
  if (filter === 'active') return ['in-progress', 'running', 'planning'].includes(p.status)
  if (filter === 'auto') return p.automation_mode.startsWith('auto')
  if (filter === 'human') return p.automation_mode.startsWith('human')
  if (filter === 'high-profit') return p.profit_potential === 'high'
  if (filter === 'low-touch') return p.touch_level === 'low'
  return true
})
```

---

## 🤖 Automation Candidates

Highlight projects that are good automation candidates:

```typescript
const automationCandidates = projects.filter(
  p => p.touch_level === 'low' && p.profit_potential === 'high'
)

// Display banner
{automationCandidates.length > 0 && (
  <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-green-900/30 to-cyan-900/30 border border-green-500/20">
    <h3 className="font-semibold text-green-400 mb-1 flex items-center gap-2">
      <Bot size={16} />
      Automation Candidates (Low Touch + High Profit)
    </h3>
    <div className="flex flex-wrap gap-2 mt-2">
      {automationCandidates.map(p => (
        <span key={p.id} className="px-2 py-1 bg-green-500/20 rounded text-sm text-green-300">
          {p.name}
        </span>
      ))}
    </div>
  </div>
)}
```

---

## 📈 Statistics Dashboard

```typescript
function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="glass-card rounded-xl p-4 flex items-center gap-3">
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <div className="text-2xl font-bold text-white">{value}</div>
        <div className="text-xs text-gray-400">{label}</div>
      </div>
    </div>
  )
}

// Usage
<div className="grid grid-cols-5 gap-4">
  <StatCard icon={LayoutGrid} label="Total Projects" value={projects.length} color="bg-blue-600" />
  <StatCard icon={Activity} label="Active" value={activeCount} color="bg-green-600" />
  <StatCard icon={Bot} label="Auto Projects" value={autoCount} color="bg-cyan-600" />
  <StatCard icon={Users} label="Human Projects" value={humanCount} color="bg-purple-600" />
  <StatCard icon={TrendingUp} label="High Profit" value={highProfitCount} color="bg-orange-600" />
</div>
```

---

## 🚀 Implementation Steps

1. ✅ **Add CSS** - Update `/app/globals.css` with glass-morphism styles

2. ✅ **Update Page** - Replace `/app/page.tsx` with enhanced version

3. ✅ **Add Icons** - Ensure lucide-react icons are imported:
   ```bash
   npm install lucide-react
   ```

4. ✅ **Test** - Run `npm run dev` and verify:
   - Glass-morphism cards render correctly
   - Status badges show with icons
   - Classification pills display
   - Filtering works
   - Automation candidates banner appears
   - Running projects have pulsing animation

5. ✅ **Add Data** - Create `/lib/projects.ts` with project data matching the interface

6. ✅ **Connect API** - Later, replace mock data with real API calls to read from `feature_list.json`

---

## 🎨 Example Mock Data

```typescript
const mockProjects = [
  {
    id: 'everreach',
    name: 'EverReach',
    description: 'AI-enhanced personal CRM + Warmth Score system',
    type: 'web+mobile',
    category: 'CRM',
    touch_level: 'high',
    profit_potential: 'high',
    difficulty: 'high',
    automation_mode: 'human-core',
    status: 'in-progress',
    next_action: 'Ship iOS build',
    color: '#1e40af',
    progress: { passing: 87, total: 200 }
  },
  {
    id: 'ecommerce-auto',
    name: 'E-Commerce Platform',
    description: 'Autonomous agent building full-stack e-commerce',
    type: 'web',
    category: 'E-commerce',
    touch_level: 'low',
    profit_potential: 'high',
    difficulty: 'medium',
    automation_mode: 'auto-core',
    status: 'running',
    next_action: 'Feature #143: Payment integration',
    color: '#7c3aed',
    progress: { passing: 142, total: 200 }
  }
]
```

---

## 🔥 Result

You'll have a unified platform that:
- ✅ Shows ALL projects (autonomous + manual)
- ✅ Classifies by touch/profit/difficulty
- ✅ Highlights automation candidates
- ✅ Beautiful glass-morphism design
- ✅ Real-time status updates
- ✅ Smart filtering and sorting
- ✅ Progress tracking for autonomous agents
- ✅ One-click navigation to project details

**Next**: Build the individual project page (`/project/[id]`) with PRD editor, voice input, terminals, and agent controls!
