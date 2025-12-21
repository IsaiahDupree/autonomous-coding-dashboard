/**
 * Project Detail Page Component
 * ================================
 * 
 * Shows full project details with agent controls, features, and work items.
 * Integrates with the backend API for real-time updates.
 */

import { useState } from 'react'
import {
    ArrowLeft,
    Play,
    Pause,
    RefreshCw,
    CheckCircle2,
    Circle,
    XCircle,
    Clock,
    Bot,
    GitCommit,
    FileText,
    Layers,
    Kanban,
    Terminal
} from 'lucide-react'
import { useProject, useAgentRun } from './api'

const TAB_CONFIG = [
    { id: 'overview', label: 'Overview', icon: Layers },
    { id: 'features', label: 'Features', icon: CheckCircle2 },
    { id: 'board', label: 'Board', icon: Kanban },
    { id: 'agent', label: 'Agent', icon: Terminal },
]

const FEATURE_STATUS_ICONS = {
    passing: { icon: CheckCircle2, color: 'text-green-400' },
    failing: { icon: XCircle, color: 'text-red-400' },
    in_progress: { icon: Clock, color: 'text-yellow-400' },
    pending: { icon: Circle, color: 'text-gray-400' },
}

const BOARD_COLUMNS = ['ready', 'in_progress', 'in_review', 'done']

export default function ProjectDetailPage({ projectId, onBack }) {
    const { project, features, workItems, agentRuns, loading, error, refetch } = useProject(projectId)
    const { isRunning, startRun, stopRun, events, progress, terminalOutput } = useAgentRun(projectId)
    const [activeTab, setActiveTab] = useState('overview')

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        )
    }

    if (error || !project) {
        return (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
                {error || 'Project not found'}
            </div>
        )
    }

    const passingFeatures = features.filter(f => f.status === 'passing').length
    const progressPercent = features.length > 0
        ? Math.round((passingFeatures / features.length) * 100)
        : 0

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={onBack}
                    className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                >
                    <ArrowLeft size={20} />
                </button>

                <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg"
                    style={{ backgroundColor: project.color || '#3B82F6' }}
                >
                    {project.name?.charAt(0) || 'P'}
                </div>

                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-white">{project.name}</h1>
                    <p className="text-gray-400 text-sm">{project.description}</p>
                </div>

                <div className="flex items-center gap-3">
                    {isRunning ? (
                        <button
                            onClick={stopRun}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                        >
                            <Pause size={18} />
                            Stop Agent
                        </button>
                    ) : (
                        <button
                            onClick={() => startRun()}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                        >
                            <Play size={18} />
                            Start Agent
                        </button>
                    )}

                    <button
                        onClick={refetch}
                        className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <RefreshCw size={18} />
                    </button>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="glass-card rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Feature Progress</span>
                    <span className="text-sm font-medium text-white">
                        {passingFeatures} / {features.length} ({progressPercent}%)
                    </span>
                </div>
                <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-white/10">
                {TAB_CONFIG.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${activeTab === tab.id
                                ? 'text-white border-b-2 border-blue-500'
                                : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard
                        label="Total Features"
                        value={features.length}
                        icon={FileText}
                    />
                    <StatCard
                        label="Passing"
                        value={passingFeatures}
                        color="text-green-400"
                        icon={CheckCircle2}
                    />
                    <StatCard
                        label="Work Items"
                        value={workItems.length}
                        icon={Layers}
                    />
                    <StatCard
                        label="Agent Runs"
                        value={agentRuns.length}
                        color="text-blue-400"
                        icon={Bot}
                    />
                </div>
            )}

            {activeTab === 'features' && (
                <div className="space-y-2">
                    {features.length === 0 ? (
                        <div className="text-center text-gray-400 py-8">
                            No features yet. Start the agent to generate feature_list.json
                        </div>
                    ) : (
                        features.map(feature => {
                            const statusConfig = FEATURE_STATUS_ICONS[feature.status] || FEATURE_STATUS_ICONS.pending
                            const Icon = statusConfig.icon
                            return (
                                <div
                                    key={feature.id}
                                    className="glass-card rounded-lg p-3 flex items-center gap-3"
                                >
                                    <Icon size={20} className={statusConfig.color} />
                                    <div className="flex-1">
                                        <div className="font-medium text-white">{feature.title}</div>
                                        <div className="text-xs text-gray-500">{feature.featureKey}</div>
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded ${feature.status === 'passing' ? 'bg-green-500/20 text-green-400' :
                                            feature.status === 'failing' ? 'bg-red-500/20 text-red-400' :
                                                'bg-gray-500/20 text-gray-400'
                                        }`}>
                                        {feature.status}
                                    </span>
                                </div>
                            )
                        })
                    )}
                </div>
            )}

            {activeTab === 'board' && (
                <div className="grid grid-cols-4 gap-4">
                    {BOARD_COLUMNS.map(column => (
                        <div key={column} className="space-y-2">
                            <h3 className="font-medium text-gray-400 capitalize px-2">
                                {column.replace('_', ' ')}
                            </h3>
                            <div className="space-y-2 min-h-48">
                                {workItems
                                    .filter(item => item.status === column)
                                    .map(item => (
                                        <div
                                            key={item.id}
                                            className="glass-card rounded-lg p-3"
                                        >
                                            <div className="text-sm font-medium text-white">{item.title}</div>
                                            <div className="text-xs text-gray-500 mt-1">{item.type}</div>
                                        </div>
                                    ))
                                }
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'agent' && (
                <div className="space-y-4">
                    {/* Live Terminal */}
                    <div className="glass-card rounded-xl overflow-hidden">
                        <div className="flex items-center gap-2 px-4 py-2 border-b border-white/10">
                            <div className={`w-3 h-3 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
                            <span className="text-sm text-gray-400 font-mono">
                                Agent Terminal — {isRunning ? 'Running' : 'Idle'}
                            </span>
                        </div>
                        <div className="h-64 overflow-y-auto p-4 bg-slate-950 font-mono text-sm">
                            {terminalOutput.length === 0 ? (
                                <div className="text-gray-500">No output yet. Start the agent to see activity.</div>
                            ) : (
                                terminalOutput.map((line, i) => (
                                    <div
                                        key={i}
                                        className={
                                            line.startsWith('[') ? 'text-cyan-400' :
                                                line.startsWith('  →') ? 'text-green-400' :
                                                    'text-gray-300'
                                        }
                                    >
                                        {line}
                                    </div>
                                ))
                            )}
                            {isRunning && <div className="text-gray-500 animate-pulse">▌</div>}
                        </div>
                    </div>

                    {/* Recent Runs */}
                    <div className="space-y-2">
                        <h3 className="font-medium text-gray-400 flex items-center gap-2">
                            <GitCommit size={16} />
                            Recent Agent Runs
                        </h3>
                        {agentRuns.slice(0, 5).map(run => (
                            <div
                                key={run.id}
                                className="glass-card rounded-lg p-3 flex items-center gap-3"
                            >
                                <div className={`w-3 h-3 rounded-full ${run.status === 'completed' ? 'bg-green-500' :
                                        run.status === 'running' ? 'bg-yellow-500 animate-pulse' :
                                            run.status === 'failed' ? 'bg-red-500' :
                                                'bg-gray-500'
                                    }`} />
                                <div className="flex-1">
                                    <div className="text-sm text-white">Session {run.sessionNumber}</div>
                                    <div className="text-xs text-gray-500">{run.runType}</div>
                                </div>
                                <div className="text-sm text-gray-400">
                                    {run.featuresCompleted} features, {run.commitsMade} commits
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

function StatCard({ label, value, color = 'text-white', icon: Icon }) {
    return (
        <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-800 rounded-lg">
                    <Icon size={20} className={color} />
                </div>
                <div>
                    <div className={`text-2xl font-bold ${color}`}>{value}</div>
                    <div className="text-sm text-gray-400">{label}</div>
                </div>
            </div>
        </div>
    )
}
