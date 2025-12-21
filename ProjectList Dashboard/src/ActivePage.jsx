import { useState, useEffect } from 'react'
import {
    Activity,
    Zap,
    Bot,
    Play,
    RefreshCw,
    Clock,
    TrendingUp
} from 'lucide-react'

// Status configuration
const STATUS_CONFIG = {
    'in-progress': { label: 'In Progress', color: 'bg-blue-500', icon: Play },
    'running': { label: 'Running', color: 'bg-green-500', icon: Activity },
    'planning': { label: 'Planning', color: 'bg-yellow-500', icon: Clock }
}

function ActiveProjectCard({ project }) {
    const statusConfig = STATUS_CONFIG[project.status] || STATUS_CONFIG['in-progress']
    const StatusIcon = statusConfig.icon
    const isRunning = project.status === 'running'

    return (
        <div className={`bg-slate-800/50 rounded-xl p-5 border border-white/10 ${isRunning ? 'ring-2 ring-green-500/50' : ''}`}>
            <div className="flex items-start gap-4">
                <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold text-white"
                    style={{ backgroundColor: project.color }}
                >
                    {project.name.charAt(0)}
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-white">{project.name}</h3>
                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${statusConfig.color} text-white`}>
                            <StatusIcon size={12} />
                            {statusConfig.label}
                        </span>
                    </div>
                    <p className="text-sm text-gray-400 mb-3">{project.description}</p>

                    {/* Progress if available */}
                    {project.progress && (
                        <div className="mb-3">
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-gray-400">Progress</span>
                                <span className="text-white">{project.progress.passing}/{project.progress.total}</span>
                            </div>
                            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-green-500 to-emerald-400"
                                    style={{ width: `${(project.progress.passing / project.progress.total) * 100}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {project.next_action && (
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                            <div className="text-xs text-blue-400 mb-0.5">Current Task</div>
                            <div className="text-sm text-white">{project.next_action}</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default function ActivePage() {
    const [projects, setProjects] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [lastRefresh, setLastRefresh] = useState(new Date())

    const loadProjects = async () => {
        try {
            const res = await fetch('/projects.json?_=' + Date.now())
            const data = await res.json()
            // Filter to only active projects
            const activeProjects = data.filter(p =>
                ['in-progress', 'running', 'planning'].includes(p.status)
            )
            setProjects(activeProjects)
            setLastRefresh(new Date())
            setIsLoading(false)
        } catch (err) {
            console.error('Failed to load projects:', err)
            setIsLoading(false)
        }
    }

    useEffect(() => {
        loadProjects()
        const interval = setInterval(loadProjects, 10000) // Refresh every 10s for active
        return () => clearInterval(interval)
    }, [])

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <RefreshCw className="animate-spin text-blue-500" size={48} />
            </div>
        )
    }

    const running = projects.filter(p => p.status === 'running')
    const inProgress = projects.filter(p => p.status === 'in-progress')
    const planning = projects.filter(p => p.status === 'planning')

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            {/* Header */}
            <header className="border-b border-white/10 sticky top-0 bg-slate-950/90 backdrop-blur-sm z-10">
                <div className="max-w-6xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                                <Activity size={24} className="text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold">Active Projects</h1>
                                <p className="text-sm text-gray-400">{projects.length} projects currently active</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={loadProjects}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-sm transition-colors"
                            >
                                <RefreshCw size={14} />
                                Refresh
                            </button>
                            <span className="text-xs text-gray-500">
                                Updated: {lastRefresh.toLocaleTimeString()}
                            </span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-6xl mx-auto px-6 py-8">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <Activity className="text-green-400" size={24} />
                            <div>
                                <div className="text-2xl font-bold text-white">{running.length}</div>
                                <div className="text-sm text-green-400">Running Now</div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <Play className="text-blue-400" size={24} />
                            <div>
                                <div className="text-2xl font-bold text-white">{inProgress.length}</div>
                                <div className="text-sm text-blue-400">In Progress</div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <Clock className="text-yellow-400" size={24} />
                            <div>
                                <div className="text-2xl font-bold text-white">{planning.length}</div>
                                <div className="text-sm text-yellow-400">Planning</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Running Projects */}
                {running.length > 0 && (
                    <section className="mb-8">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></span>
                            Running Now
                        </h2>
                        <div className="space-y-4">
                            {running.map(project => (
                                <ActiveProjectCard key={project.id} project={project} />
                            ))}
                        </div>
                    </section>
                )}

                {/* In Progress Projects */}
                {inProgress.length > 0 && (
                    <section className="mb-8">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Play className="text-blue-400" size={18} />
                            In Progress
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {inProgress.map(project => (
                                <ActiveProjectCard key={project.id} project={project} />
                            ))}
                        </div>
                    </section>
                )}

                {/* Planning Projects */}
                {planning.length > 0 && (
                    <section className="mb-8">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Clock className="text-yellow-400" size={18} />
                            Planning
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {planning.map(project => (
                                <ActiveProjectCard key={project.id} project={project} />
                            ))}
                        </div>
                    </section>
                )}

                {projects.length === 0 && (
                    <div className="text-center py-12">
                        <Activity className="mx-auto text-gray-600 mb-4" size={48} />
                        <h3 className="text-xl font-semibold text-gray-400 mb-2">No Active Projects</h3>
                        <p className="text-gray-500">All projects are currently idle or completed.</p>
                    </div>
                )}
            </main>
        </div>
    )
}
