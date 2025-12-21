import { useState } from 'react'
import {
    History as HistoryIcon,
    GitCommit,
    GitBranch,
    Clock,
    CheckCircle2,
    XCircle,
    ChevronRight,
    Filter,
    Calendar
} from 'lucide-react'

// Mock session history
const mockSessions = [
    {
        id: 5,
        date: '2025-12-06',
        startTime: '10:30 AM',
        endTime: '11:45 AM',
        duration: '1h 15m',
        status: 'completed',
        featuresCompleted: 8,
        commits: 12,
        project: 'EverReach',
        highlights: [
            'Implemented payment integration',
            'Fixed iOS subscription bug',
            'Updated user profile UI'
        ]
    },
    {
        id: 4,
        date: '2025-12-05',
        startTime: '2:00 PM',
        endTime: '4:30 PM',
        duration: '2h 30m',
        status: 'completed',
        featuresCompleted: 15,
        commits: 23,
        project: 'BlogCanvas',
        highlights: [
            'Added multi-agent orchestration',
            'Implemented content pipeline',
            'Fixed generation quality issues'
        ]
    },
    {
        id: 3,
        date: '2025-12-04',
        startTime: '9:00 AM',
        endTime: '12:00 PM',
        duration: '3h 0m',
        status: 'completed',
        featuresCompleted: 20,
        commits: 35,
        project: 'SassHot',
        highlights: [
            'Built keyword ingestion pipeline',
            'Created SEO analysis dashboard',
            'Integrated Google APIs'
        ]
    },
    {
        id: 2,
        date: '2025-12-03',
        startTime: '3:00 PM',
        endTime: '3:45 PM',
        duration: '0h 45m',
        status: 'failed',
        featuresCompleted: 2,
        commits: 5,
        project: 'AI Headshots',
        highlights: [
            'Attempted image generation pipeline',
            'API rate limit hit',
            'Rolled back changes'
        ]
    },
    {
        id: 1,
        date: '2025-12-02',
        startTime: '10:00 AM',
        endTime: '1:30 PM',
        duration: '3h 30m',
        status: 'completed',
        featuresCompleted: 25,
        commits: 42,
        project: 'Project Radar',
        highlights: [
            'Initial dashboard setup',
            'Project classification system',
            'Automation candidates feature'
        ]
    }
]

function SessionCard({ session }) {
    const [expanded, setExpanded] = useState(false)

    return (
        <div className="bg-slate-800/50 rounded-xl border border-white/10 overflow-hidden">
            <div
                className="p-4 cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${session.status === 'completed' ? 'bg-green-500/20' : 'bg-red-500/20'
                            }`}>
                            {session.status === 'completed'
                                ? <CheckCircle2 className="text-green-400" size={24} />
                                : <XCircle className="text-red-400" size={24} />
                            }
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-white">Session #{session.id}</span>
                                <span className="text-sm text-gray-400">• {session.project}</span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-400">
                                <span className="flex items-center gap-1">
                                    <Calendar size={14} />
                                    {session.date}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Clock size={14} />
                                    {session.startTime} - {session.endTime}
                                </span>
                                <span className="text-gray-500">({session.duration})</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="text-right">
                            <div className="text-lg font-bold text-white">{session.featuresCompleted}</div>
                            <div className="text-xs text-gray-500">Features</div>
                        </div>
                        <div className="text-right">
                            <div className="text-lg font-bold text-white">{session.commits}</div>
                            <div className="text-xs text-gray-500">Commits</div>
                        </div>
                        <ChevronRight
                            size={20}
                            className={`text-gray-500 transition-transform ${expanded ? 'rotate-90' : ''}`}
                        />
                    </div>
                </div>
            </div>

            {expanded && (
                <div className="px-4 pb-4 pt-2 border-t border-white/5">
                    <h4 className="text-sm font-semibold text-gray-400 mb-2">SESSION HIGHLIGHTS</h4>
                    <ul className="space-y-1">
                        {session.highlights.map((highlight, i) => (
                            <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
                                <GitCommit size={14} className="text-blue-400" />
                                {highlight}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    )
}

export default function HistoryPage() {
    const [filter, setFilter] = useState('all')

    const filteredSessions = mockSessions.filter(s => {
        if (filter === 'all') return true
        return s.status === filter
    })

    const totalFeatures = mockSessions.reduce((sum, s) => sum + s.featuresCompleted, 0)
    const totalCommits = mockSessions.reduce((sum, s) => sum + s.commits, 0)
    const successRate = Math.round((mockSessions.filter(s => s.status === 'completed').length / mockSessions.length) * 100)

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            {/* Header */}
            <header className="border-b border-white/10 sticky top-0 bg-slate-950/90 backdrop-blur-sm z-10">
                <div className="max-w-6xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                                <HistoryIcon size={24} className="text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold">Session History</h1>
                                <p className="text-sm text-gray-400">{mockSessions.length} sessions recorded</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Filter size={16} className="text-gray-400" />
                            <select
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                className="bg-slate-800 border border-white/10 rounded-lg px-3 py-1.5 text-sm"
                            >
                                <option value="all">All Sessions</option>
                                <option value="completed">Completed</option>
                                <option value="failed">Failed</option>
                            </select>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-6xl mx-auto px-6 py-8">
                {/* Stats */}
                <div className="grid grid-cols-4 gap-4 mb-8">
                    <div className="bg-slate-800/50 rounded-xl border border-white/10 p-4">
                        <div className="text-2xl font-bold text-white">{mockSessions.length}</div>
                        <div className="text-sm text-gray-400">Total Sessions</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl border border-white/10 p-4">
                        <div className="text-2xl font-bold text-green-400">{totalFeatures}</div>
                        <div className="text-sm text-gray-400">Features Completed</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl border border-white/10 p-4">
                        <div className="text-2xl font-bold text-blue-400">{totalCommits}</div>
                        <div className="text-sm text-gray-400">Total Commits</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl border border-white/10 p-4">
                        <div className="text-2xl font-bold text-purple-400">{successRate}%</div>
                        <div className="text-sm text-gray-400">Success Rate</div>
                    </div>
                </div>

                {/* Session List */}
                <div className="space-y-4">
                    {filteredSessions.map(session => (
                        <SessionCard key={session.id} session={session} />
                    ))}
                </div>
            </main>
        </div>
    )
}
