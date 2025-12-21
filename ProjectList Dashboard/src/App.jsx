import { useState, useEffect } from 'react'
import {
  Activity,
  Zap,
  Brain,
  Bot,
  Clock,
  CheckCircle2,
  AlertCircle,
  Pause,
  Play,
  Filter,
  LayoutGrid,
  List,
  RefreshCw,
  TrendingUp,
  Cpu,
  Users,
  Home,
  FolderOpen,
  Terminal,
  FileText,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
  TestTube2,
  Plus
} from 'lucide-react'
import AgentsPage from './AgentsPage'
import ActivePage from './ActivePage'
import TerminalPage from './TerminalPage'
import FilesPage from './FilesPage'
import HistoryPage from './HistoryPage'
import SettingsPage from './SettingsPage'
import TestsPage from './TestsPage'
import ProjectDetailPage from './ProjectDetailPage'
import CreateProjectModal from './CreateProjectModal'
import { useProjects } from './api'

// Left Sidebar Component
function LeftSidebar({ isCollapsed, onToggle, activePage, onPageChange }) {
  const navItems = [
    { id: 'projects', icon: Home, label: 'Projects' },
    { id: 'agents', icon: Bot, label: 'Agents' },
    { id: 'tests', icon: TestTube2, label: 'Tests' },
    { id: 'active', icon: Activity, label: 'Active' },
    { id: 'terminal', icon: Terminal, label: 'Terminal' },
    { id: 'files', icon: FileText, label: 'Files' },
    { id: 'history', icon: History, label: 'History' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ]

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-slate-950 border-r border-white/10 flex flex-col z-50 transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-56'
        }`}
    >
      {/* Logo */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <Zap size={18} className="text-white" />
          </div>
          {!isCollapsed && (
            <span className="font-bold text-white whitespace-nowrap">Project Radar</span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => onPageChange(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${activePage === item.id
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
          >
            <item.icon size={20} className="flex-shrink-0" />
            {!isCollapsed && <span>{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* Collapse Toggle */}
      <div className="p-2 border-t border-white/10">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-gray-400 hover:bg-white/5 hover:text-white transition-all"
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          {!isCollapsed && <span className="text-sm">Collapse</span>}
        </button>
      </div>

      {/* User section */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            I
          </div>
          {!isCollapsed && (
            <div>
              <div className="text-sm font-medium text-white">Isaiah</div>
              <div className="text-xs text-gray-500">Pro Plan</div>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}

const STATUS_CONFIG = {
  'in-progress': { label: 'In Progress', color: 'bg-blue-500', icon: Play },
  'running': { label: 'Running', color: 'bg-green-500', icon: Activity },
  'idle': { label: 'Idle', color: 'bg-gray-500', icon: Pause },
  'planning': { label: 'Planning', color: 'bg-yellow-500', icon: Brain },
  'waiting': { label: 'Waiting', color: 'bg-orange-500', icon: Clock },
  'failed': { label: 'Failed', color: 'bg-red-500', icon: AlertCircle },
  'done': { label: 'Done', color: 'bg-emerald-500', icon: CheckCircle2 }
}

const AUTOMATION_CONFIG = {
  'human-core': { label: 'Human Core', icon: Users, color: 'text-purple-400' },
  'human-partial-auto': { label: 'Human + Auto', icon: Users, color: 'text-violet-400' },
  'human-led': { label: 'Human Led', icon: Users, color: 'text-indigo-400' },
  'human-rd': { label: 'Human R&D', icon: Brain, color: 'text-blue-400' },
  'human-editorial': { label: 'Human Editorial', icon: Users, color: 'text-cyan-400' },
  'human-design': { label: 'Human Design', icon: Brain, color: 'text-teal-400' },
  'human-passion': { label: 'Passion Project', icon: Users, color: 'text-pink-400' },
  'auto-core': { label: 'Auto Core', icon: Bot, color: 'text-green-400' },
  'auto-engine': { label: 'Auto Engine', icon: Cpu, color: 'text-emerald-400' },
  'auto-infra': { label: 'Auto Infra', icon: Cpu, color: 'text-lime-400' },
  'hybrid': { label: 'Hybrid', icon: Zap, color: 'text-yellow-400' }
}

const LEVEL_COLORS = {
  high: 'bg-red-500/20 text-red-300 border-red-500/30',
  medium: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  low: 'bg-green-500/20 text-green-300 border-green-500/30'
}

// Generate icon based on project
function ProjectIcon({ project, size = 40 }) {
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

function LevelPill({ level, label }) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs border ${LEVEL_COLORS[level]}`}>
      {label}: {level.charAt(0).toUpperCase() + level.slice(1)}
    </span>
  )
}

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

function ProjectCard({ project, onClick }) {
  const isRunning = project.status === 'running'
  const timeAgo = project.last_update
    ? getTimeAgo(new Date(project.last_update))
    : 'Never updated'

  return (
    <div
      onClick={onClick}
      className={`glass-card rounded-xl p-4 hover:border-white/20 transition-all duration-300 cursor-pointer ${isRunning ? 'status-running' : ''}`}
      style={{ '--tw-shadow-color': project.color }}
    >
      {/* Header */}
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

      {/* Metrics */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <LevelPill level={project.touch_level} label="Touch" />
        <LevelPill level={project.profit_potential} label="Profit" />
        <LevelPill level={project.difficulty} label="Diff" />
      </div>

      {/* Automation Mode */}
      <div className="flex items-center justify-between mb-3">
        <AutomationBadge mode={project.automation_mode} />
        <span className="text-xs text-gray-500">{timeAgo}</span>
      </div>

      {/* Next Action */}
      {project.next_action && (
        <div className="bg-black/20 rounded-lg p-2">
          <div className="text-xs text-gray-400 mb-0.5">Next Action</div>
          <div className="text-sm text-white">{project.next_action}</div>
        </div>
      )}
    </div>
  )
}

function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000)
  const intervals = [
    { label: 'y', seconds: 31536000 },
    { label: 'mo', seconds: 2592000 },
    { label: 'd', seconds: 86400 },
    { label: 'h', seconds: 3600 },
    { label: 'm', seconds: 60 }
  ]
  for (const interval of intervals) {
    const count = Math.floor(seconds / interval.seconds)
    if (count >= 1) return `${count}${interval.label} ago`
  }
  return 'Just now'
}

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

export default function App() {
  const [projects, setProjects] = useState([])
  const [filter, setFilter] = useState('all')
  const [sortBy, setSortBy] = useState('name')
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [isLoading, setIsLoading] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [activePage, setActivePage] = useState('projects')
  const [selectedProjectId, setSelectedProjectId] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const { createProject } = useProjects(false) // Don't auto-fetch, we have our own

  const loadProjects = async () => {
    try {
      const res = await fetch('/projects.json?_=' + Date.now())
      const data = await res.json()
      setProjects(data)
      setLastRefresh(new Date())
      setIsLoading(false)
    } catch (err) {
      console.error('Failed to load projects:', err)
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadProjects()
    const interval = setInterval(loadProjects, 15000)
    return () => clearInterval(interval)
  }, [])

  // Stats
  const stats = {
    total: projects.length,
    inProgress: projects.filter(p => ['in-progress', 'running'].includes(p.status)).length,
    autoProjects: projects.filter(p => p.automation_mode.startsWith('auto')).length,
    humanProjects: projects.filter(p => p.automation_mode.startsWith('human')).length,
    highProfit: projects.filter(p => p.profit_potential === 'high').length
  }

  // Filter and sort
  const filteredProjects = projects
    .filter(p => {
      if (filter === 'all') return true
      if (filter === 'active') return ['in-progress', 'running', 'planning'].includes(p.status)
      if (filter === 'auto') return p.automation_mode.startsWith('auto')
      if (filter === 'human') return p.automation_mode.startsWith('human')
      if (filter === 'high-profit') return p.profit_potential === 'high'
      if (filter === 'low-touch') return p.touch_level === 'low'
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      if (sortBy === 'status') return a.status.localeCompare(b.status)
      if (sortBy === 'profit') {
        const order = { high: 0, medium: 1, low: 2 }
        return order[a.profit_potential] - order[b.profit_potential]
      }
      return 0
    })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-radar-dark flex items-center justify-center">
        <RefreshCw className="animate-spin text-blue-500" size={48} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-radar-dark text-white">
      {/* Left Sidebar */}
      <LeftSidebar
        isCollapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        activePage={activePage}
        onPageChange={setActivePage}
      />

      {/* Agents Page */}
      {activePage === 'agents' && (
        <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-56'}`}>
          <AgentsPage />
        </div>
      )}

      {/* Tests Page */}
      {activePage === 'tests' && (
        <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-56'}`}>
          <TestsPage />
        </div>
      )}

      {/* Active Page */}
      {activePage === 'active' && (
        <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-56'}`}>
          <ActivePage />
        </div>
      )}

      {/* Terminal Page */}
      {activePage === 'terminal' && (
        <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-56'}`}>
          <TerminalPage />
        </div>
      )}

      {/* Files Page */}
      {activePage === 'files' && (
        <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-56'}`}>
          <FilesPage />
        </div>
      )}

      {/* History Page */}
      {activePage === 'history' && (
        <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-56'}`}>
          <HistoryPage />
        </div>
      )}

      {/* Settings Page */}
      {activePage === 'settings' && (
        <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-56'}`}>
          <SettingsPage />
        </div>
      )}

      {/* Project Detail Page */}
      {activePage === 'projects' && selectedProjectId && (
        <div className={`transition-all duration-300 p-6 ${sidebarCollapsed ? 'ml-16' : 'ml-56'}`}>
          <ProjectDetailPage
            projectId={selectedProjectId}
            onBack={() => setSelectedProjectId(null)}
          />
        </div>
      )}

      {/* Projects Page - Main Content with sidebar offset */}
      {activePage === 'projects' && !selectedProjectId && (
        <div className={`transition-all duration-300 p-6 ${sidebarCollapsed ? 'ml-16' : 'ml-56'}`}>
          {/* Header */}
          <header className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <img src="/radar-icon.svg" alt="Radar" className="w-10 h-10" />
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Project Radar
                </h1>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm font-medium transition-colors"
                >
                  <Plus size={16} />
                  New Project
                </button>
                <button
                  onClick={loadProjects}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-sm transition-colors"
                >
                  <RefreshCw size={14} />
                  Refresh
                </button>
                <span className="text-xs text-gray-500">
                  Last updated: {lastRefresh.toLocaleTimeString()}
                </span>
              </div>
            </div>
            <p className="text-gray-400">Isaiah's project management dashboard</p>
          </header>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <StatCard icon={LayoutGrid} label="Total Projects" value={stats.total} color="bg-blue-600" />
            <StatCard icon={Activity} label="Active" value={stats.inProgress} color="bg-green-600" />
            <StatCard icon={Bot} label="Auto Projects" value={stats.autoProjects} color="bg-cyan-600" />
            <StatCard icon={Users} label="Human Projects" value={stats.humanProjects} color="bg-purple-600" />
            <StatCard icon={TrendingUp} label="High Profit" value={stats.highProfit} color="bg-orange-600" />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-gray-400" />
              <span className="text-sm text-gray-400">Filter:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'all', label: 'All' },
                { id: 'active', label: 'Active' },
                { id: 'auto', label: 'Automate' },
                { id: 'human', label: 'Human Tasks' },
                { id: 'high-profit', label: 'High Profit' },
                { id: 'low-touch', label: 'Low Touch' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${filter === f.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/5 text-gray-300 hover:bg-white/10'
                    }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-sm text-gray-400">Sort:</span>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="name">Name</option>
                <option value="status">Status</option>
                <option value="profit">Profit Potential</option>
              </select>
            </div>
          </div>

          {/* Automation Candidates Banner */}
          {filter === 'all' && (
            <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-green-900/30 to-cyan-900/30 border border-green-500/20">
              <h3 className="font-semibold text-green-400 mb-1 flex items-center gap-2">
                <Bot size={16} />
                Automation Candidates (Low Touch + High Profit)
              </h3>
              <div className="flex flex-wrap gap-2 mt-2">
                {projects
                  .filter(p => p.touch_level === 'low' && p.profit_potential === 'high')
                  .map(p => (
                    <span key={p.id} className="px-2 py-1 bg-green-500/20 rounded text-sm text-green-300">
                      {p.name}
                    </span>
                  ))
                }
              </div>
            </div>
          )}

          {/* Project Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProjects.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                onClick={() => setSelectedProjectId(project.id)}
              />
            ))}
          </div>

          {filteredProjects.length === 0 && (
            <div className="text-center text-gray-500 py-12">
              No projects match the current filter.
            </div>
          )}

          {/* Footer */}
          <footer className="mt-12 pt-6 border-t border-white/10 text-center text-sm text-gray-500">
            Project Radar v1.0 • Auto-refreshes every 15 seconds
          </footer>
        </div>
      )}

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={async (projectData) => {
          // Add to local state immediately
          const newProject = {
            id: Date.now().toString(),
            ...projectData,
            status: 'draft',
            type: 'App',
            category: 'New',
            touch_level: projectData.classification?.touch || 'medium',
            profit_potential: projectData.classification?.profit || 'medium',
            difficulty: projectData.classification?.difficulty || 'medium',
            automation_mode: projectData.automationMode || 'hybrid',
            last_update: new Date().toISOString()
          }
          setProjects(prev => [newProject, ...prev])

          // Try to create via API (will fail if backend not running)
          try {
            await createProject(projectData)
          } catch (e) {
            console.log('Backend unavailable, project saved locally only')
          }
        }}
      />
    </div>
  )
}
