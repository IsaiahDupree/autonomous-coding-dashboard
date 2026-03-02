import { useState, useEffect } from 'react'
import {
    ChevronDown,
    ChevronRight,
    Activity,
    Zap,
    Bot,
    FileText,
    GitBranch,
    Terminal,
    CheckCircle2,
    Play,
    RefreshCw,
    Code,
    Database,
    FolderOpen,
    Settings,
    Cpu,
    CircleDot,
    AlertCircle
} from 'lucide-react'
import { useAgentStatus } from './api'

// Collapsible Dropdown Component
function Dropdown({ title, icon: Icon, children, defaultOpen = false }) {
    const [isOpen, setIsOpen] = useState(defaultOpen)

    return (
        <div className="mb-4">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center gap-3 p-4 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-white/10 transition-all"
            >
                <Icon size={20} className="text-blue-400" />
                <span className="font-semibold text-white flex-1 text-left">{title}</span>
                {isOpen ? (
                    <ChevronDown size={20} className="text-gray-400" />
                ) : (
                    <ChevronRight size={20} className="text-gray-400" />
                )}
            </button>
            {isOpen && (
                <div className="mt-2 p-4 rounded-xl bg-slate-900/50 border border-white/5">
                    {children}
                </div>
            )}
        </div>
    )
}

// ── Live Parallel Agents Panel ─────────────────────────────────────────────
const MODEL_COLORS = {
    'claude-opus':   { bg: 'bg-purple-500/15', border: 'border-purple-500/40', text: 'text-purple-300', bar: 'bg-purple-500' },
    'claude-sonnet': { bg: 'bg-blue-500/15',   border: 'border-blue-500/40',   text: 'text-blue-300',   bar: 'bg-blue-500'   },
    'claude-haiku':  { bg: 'bg-teal-500/15',   border: 'border-teal-500/40',   text: 'text-teal-300',   bar: 'bg-teal-500'   },
    default:         { bg: 'bg-slate-700/30',  border: 'border-white/10',      text: 'text-gray-300',   bar: 'bg-gray-500'   },
}

function modelTheme(model = '') {
    if (model.includes('opus'))   return MODEL_COLORS['claude-opus']
    if (model.includes('sonnet')) return MODEL_COLORS['claude-sonnet']
    if (model.includes('haiku'))  return MODEL_COLORS['claude-haiku']
    return MODEL_COLORS.default
}

function AgentCard({ agent }) {
    const theme = modelTheme(agent.model)
    const pct   = agent.stats?.percentComplete ?? 0
    const isRunning = agent.status === 'running'
    const label = agent.id.replace(/^p051-0?\d+-/, '').replace(/-/g, ' ')
    const modelShort = (agent.model || '').replace('claude-', '').replace(/-20\d+$/, '')

    return (
        <div className={`rounded-xl p-4 border ${theme.bg} ${theme.border} transition-all`}>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    {isRunning
                        ? <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        : <span className="w-2 h-2 rounded-full bg-gray-500" />}
                    <span className="font-semibold text-white capitalize text-sm">{label}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${theme.bg} ${theme.border} ${theme.text}`}>{modelShort}</span>
                    <span className="text-xs text-gray-500">s{agent.session}</span>
                </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mb-2">
                <div
                    className={`h-full rounded-full transition-all duration-700 ${theme.bar}`}
                    style={{ width: `${pct}%` }}
                />
            </div>

            <div className="flex justify-between text-xs text-gray-400">
                <span>{agent.stats?.passing ?? 0}/{agent.stats?.total ?? 0} features</span>
                <span className="font-mono">{pct}%</span>
            </div>
        </div>
    )
}

function LiveAgentsPanel() {
    const { agents, asOf, loading, error, runningCount, totalFeatures, passingFeatures, overallPct } = useAgentStatus(5000)

    const ago = asOf ? Math.round((Date.now() - new Date(asOf).getTime()) / 1000) : null

    if (loading) return (
        <div className="rounded-xl border border-white/10 bg-slate-900/50 p-6 flex items-center gap-3 text-gray-400">
            <RefreshCw size={16} className="animate-spin" />
            <span>Connecting to backend…</span>
        </div>
    )

    if (error || agents.length === 0) return (
        <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 flex items-center gap-3 text-yellow-400 text-sm">
            <AlertCircle size={16} />
            <span>{error ? `Backend error: ${error}` : 'No active agents found (last 6h). Start a harness to see live progress.'}</span>
        </div>
    )

    return (
        <div className="rounded-xl border border-white/10 bg-slate-900/50 overflow-hidden">
            {/* Summary bar */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        <span className="text-white font-semibold">{runningCount} running</span>
                        <span className="text-gray-500 text-sm">/ {agents.length} total</span>
                    </div>
                    <div className="text-sm text-gray-400">
                        <span className="text-white font-mono">{passingFeatures}</span>
                        <span>/{totalFeatures} features · </span>
                        <span className="text-green-400 font-mono">{overallPct}%</span>
                    </div>
                </div>
                <span className="text-xs text-gray-600">{ago != null ? `${ago}s ago` : ''}</span>
            </div>

            {/* Overall progress bar */}
            <div className="px-6 py-2 bg-slate-950/40">
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-700"
                        style={{ width: `${overallPct}%` }}
                    />
                </div>
            </div>

            {/* Agent grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4">
                {agents.map(agent => <AgentCard key={agent.id} agent={agent} />)}
            </div>
        </div>
    )
}

// Architecture Diagram placeholder
function ArchitectureDiagram() {
    return (
        <div className="bg-slate-950 rounded-xl p-6 border border-white/10">
            <h4 className="text-lg font-bold text-white mb-6 text-center">Long-Running Agent Harness</h4>

            <div className="flex flex-col gap-4">
                {/* Session 1 - Initializer */}
                <div className="flex items-start gap-4">
                    <div className="w-32 text-right">
                        <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">SESSION 1</span>
                    </div>
                    <div className="flex-1">
                        <div className="bg-blue-600/20 border border-blue-500/30 rounded-lg p-4">
                            <h5 className="font-bold text-blue-300 mb-2">INITIALIZER AGENT</h5>
                            <p className="text-xs text-gray-400 mb-2">(Session 1)</p>
                            <ul className="text-sm text-gray-300 space-y-1">
                                <li>• Create feature_list.json (200+ test cases)</li>
                                <li>• Create init.sh</li>
                                <li>• Scaffold project structure</li>
                                <li>• Initialize git repo</li>
                            </ul>
                        </div>
                    </div>
                    <div className="w-32 text-center text-gray-500 text-xs self-center">creates →</div>
                </div>

                {/* Core Artifacts */}
                <div className="flex items-start gap-4">
                    <div className="w-32"></div>
                    <div className="flex-1"></div>
                    <div className="w-64">
                        <div className="bg-orange-600/20 border border-orange-500/30 rounded-lg p-4">
                            <h5 className="font-bold text-orange-300 mb-2">CORE ARTIFACTS</h5>
                            <p className="text-xs text-gray-400 mb-2">(Shared State)</p>
                            <ul className="text-sm text-gray-300 space-y-1">
                                <li className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                                    feature_list.json
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                                    claude-progress.txt
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                                    init.sh
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Sessions 2-N - Coding Agent Loop */}
                <div className="flex items-start gap-4">
                    <div className="w-32 text-right">
                        <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded">SESSIONS 2-N</span>
                    </div>
                    <div className="flex-1">
                        <div className="bg-green-600/20 border border-green-500/30 rounded-lg p-4">
                            <h5 className="font-bold text-green-300 mb-2">CODING AGENT LOOP</h5>
                            <p className="text-xs text-gray-400 mb-2">(Sessions 2-N)</p>
                            <ol className="text-sm text-gray-300 space-y-1">
                                <li>1. Get Bearings (read files, git log)</li>
                                <li>2. Regression Test (verify passing)</li>
                                <li>3. Pick Next Feature (passes: false)</li>
                                <li>4. Implement & Test (browser + UI)</li>
                                <li>5. Update & Commit</li>
                            </ol>
                            <div className="mt-3 flex items-center gap-2 text-green-400 text-sm">
                                <RefreshCw size={14} />
                                Loop until all tests pass
                            </div>
                        </div>
                    </div>
                    <div className="w-64 flex flex-col items-center justify-center text-gray-500 text-xs">
                        <div>↕ reads/updates</div>
                    </div>
                </div>

                {/* Completion */}
                <div className="flex items-center justify-center mt-4">
                    <div className="bg-purple-600/20 border border-purple-500/30 rounded-lg px-6 py-3">
                        <div className="flex items-center gap-2 text-purple-300 font-bold">
                            <CheckCircle2 size={20} />
                            COMPLETE – 200+ Tests Passing
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function AgentsPage() {
    return (
        <div className="min-h-screen bg-slate-950 text-white">
            {/* Header */}
            <header className="border-b border-white/10 sticky top-0 bg-slate-950/90 backdrop-blur-sm z-10">
                <div className="max-w-6xl mx-auto px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                            <Bot size={24} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">Autonomous Agents</h1>
                            <p className="text-sm text-gray-400">Multi-Session Coding Agent Architecture</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-6xl mx-auto px-6 py-8">

                {/* Live Parallel Agents — polls /api/harness/agents every 5s */}
                <section className="mb-8">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Cpu className="text-green-400" />
                        Live Agent Progress
                        <span className="ml-2 text-xs font-normal text-gray-500 bg-slate-800 px-2 py-0.5 rounded-full">auto-refresh 5s</span>
                    </h2>
                    <LiveAgentsPanel />
                </section>

                {/* Architecture Diagram */}
                <section className="mb-8">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Zap className="text-yellow-400" />
                        Architecture Overview
                    </h2>
                    <ArchitectureDiagram />
                </section>

                {/* Dropdowns */}
                <section>
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <FileText className="text-blue-400" />
                        Detailed Documentation
                    </h2>

                    <Dropdown
                        title="1. app_spec.txt → Primary Context"
                        icon={FileText}
                        defaultOpen={true}
                    >
                        <p className="text-gray-300 mb-3">
                            You give the system one main spec file that describes the app you want built.
                            This is the only big prompt you keep re-using so you don't have to re-paste specs every session.
                        </p>
                        <div className="bg-slate-800 rounded-lg p-3 font-mono text-sm text-green-400">
                            app_spec.txt → primary context for all sessions
                        </div>
                    </Dropdown>

                    <Dropdown
                        title="2. INITIALIZER AGENT (Session 1)"
                        icon={Play}
                    >
                        <p className="text-gray-300 mb-3">
                            First run = "bootstrap the project." It reads app_spec.txt and then:
                        </p>
                        <ul className="space-y-3">
                            <li className="flex items-start gap-3">
                                <Database className="text-blue-400 mt-1 flex-shrink-0" size={18} />
                                <div>
                                    <strong className="text-white">Creates feature_list.json</strong>
                                    <p className="text-sm text-gray-400">A structured list of ~200+ features / test cases (the master checklist).</p>
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <Terminal className="text-blue-400 mt-1 flex-shrink-0" size={18} />
                                <div>
                                    <strong className="text-white">Creates init.sh</strong>
                                    <p className="text-sm text-gray-400">Script for setting up / running tests, etc.</p>
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <FolderOpen className="text-blue-400 mt-1 flex-shrink-0" size={18} />
                                <div>
                                    <strong className="text-white">Scaffolds project structure</strong>
                                    <p className="text-sm text-gray-400">Folders, starter files, maybe basic configs.</p>
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <GitBranch className="text-blue-400 mt-1 flex-shrink-0" size={18} />
                                <div>
                                    <strong className="text-white">Initializes the git repo</strong>
                                    <p className="text-sm text-gray-400">So future sessions can use git history as context.</p>
                                </div>
                            </li>
                        </ul>
                        <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm text-blue-300">
                            This first agent creates the shared state used later.
                        </div>
                    </Dropdown>

                    <Dropdown
                        title="3. CORE ARTIFACTS (Shared State)"
                        icon={Database}
                    >
                        <p className="text-gray-300 mb-3">
                            These are the files that survive across sessions and keep the agent "remembering":
                        </p>
                        <div className="space-y-3">
                            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                                    <strong className="text-orange-300">feature_list.json</strong>
                                </div>
                                <p className="text-sm text-gray-400 ml-5">Source of truth for all tests/features and pass/fail state.</p>
                            </div>
                            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                                    <strong className="text-orange-300">claude-progress.txt</strong>
                                </div>
                                <p className="text-sm text-gray-400 ml-5">Running log: what was done, what broke, what's next (handoff notes between sessions).</p>
                            </div>
                            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                                    <strong className="text-orange-300">init.sh</strong>
                                </div>
                                <p className="text-sm text-gray-400 ml-5">How to run tests / dev server / etc.</p>
                            </div>
                        </div>
                        <p className="mt-4 text-sm text-gray-400 italic">
                            Every later session reads & writes these.
                        </p>
                    </Dropdown>

                    <Dropdown
                        title="4. CODING AGENT LOOP (Sessions 2-N)"
                        icon={RefreshCw}
                    >
                        <p className="text-gray-300 mb-3">
                            For every subsequent session, the coding agent does:
                        </p>
                        <ol className="space-y-3">
                            <li className="flex items-start gap-3">
                                <span className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                                <div>
                                    <strong className="text-white">Get Bearings</strong>
                                    <p className="text-sm text-gray-400">Read key files + git log + claude-progress.txt to reconstruct context.</p>
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                                <div>
                                    <strong className="text-white">Regression Test</strong>
                                    <p className="text-sm text-gray-400">Run tests via init.sh to confirm everything still passes.</p>
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                                <div>
                                    <strong className="text-white">Pick Next Feature</strong>
                                    <p className="text-sm text-gray-400">Look in feature_list.json for the next item where <code className="bg-slate-800 px-1 rounded">passes: false</code>.</p>
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center text-xs font-bold flex-shrink-0">4</span>
                                <div>
                                    <strong className="text-white">Implement & Test</strong>
                                    <p className="text-sm text-gray-400">Write code (backend/UI/etc.), then run tests/browser checks.</p>
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center text-xs font-bold flex-shrink-0">5</span>
                                <div>
                                    <strong className="text-white">Update & Commit</strong>
                                    <p className="text-sm text-gray-400">Update feature_list.json (mark feature as passing), append to claude-progress.txt, commit to git.</p>
                                </div>
                            </li>
                        </ol>
                        <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-sm text-green-300 flex items-center gap-2">
                            <RefreshCw size={16} />
                            Then it loops: pick another failing feature and repeat "with fresh context" each time.
                        </div>
                    </Dropdown>

                    <Dropdown
                        title="5. Completion"
                        icon={CheckCircle2}
                    >
                        <p className="text-gray-300 mb-3">
                            When every test in feature_list.json is passing, you hit:
                        </p>
                        <div className="flex justify-center py-6">
                            <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl px-8 py-4 text-center">
                                <div className="flex items-center gap-3 text-xl font-bold text-white">
                                    <CheckCircle2 size={28} />
                                    COMPLETE
                                </div>
                                <div className="text-purple-200 mt-1">200+ Tests Passing</div>
                            </div>
                        </div>
                    </Dropdown>

                    <Dropdown
                        title="Feature List Schema"
                        icon={Code}
                    >
                        <p className="text-gray-300 mb-3">
                            Structure for feature_list.json:
                        </p>
                        <pre className="bg-slate-900 rounded-lg p-4 text-sm overflow-x-auto">
                            {`{
  "features": [
    {
      "id": 1,
      "name": "User authentication",
      "description": "Users can sign up, log in, and log out",
      "category": "auth",
      "passes": false,
      "session": null,
      "time_spent": null
    },
    {
      "id": 2,
      "name": "Dashboard layout",
      "description": "Main dashboard with navigation",
      "category": "ui",
      "passes": true,
      "session": 2,
      "time_spent": "15m"
    }
  ],
  "total": 200,
  "passing": 87,
  "current_session": 5
}`}
                        </pre>
                    </Dropdown>

                    <Dropdown
                        title="Project Classification"
                        icon={Settings}
                    >
                        <p className="text-gray-300 mb-3">
                            Projects are classified by:
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                                <strong className="text-red-300">Touch Level</strong>
                                <p className="text-sm text-gray-400">High / Medium / Low human involvement needed</p>
                            </div>
                            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                                <strong className="text-yellow-300">Profit Potential</strong>
                                <p className="text-sm text-gray-400">High / Medium / Low revenue potential</p>
                            </div>
                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                                <strong className="text-blue-300">Build Difficulty</strong>
                                <p className="text-sm text-gray-400">High / Medium / Low technical complexity</p>
                            </div>
                            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                                <strong className="text-green-300">Automation Fit</strong>
                                <p className="text-sm text-gray-400">Human Core, Auto Core, Hybrid</p>
                            </div>
                        </div>
                        <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                            <strong className="text-emerald-300">Automation Candidates (Delegate to Bots):</strong>
                            <p className="text-sm text-gray-400 mt-1">
                                Low Touch + High Profit + Low/Med Difficulty = Perfect for autonomous agents
                            </p>
                            <ul className="text-sm text-emerald-300 mt-2 space-y-1">
                                <li>• SteadyLetters</li>
                                <li>• Prompt Sharing & Storage App</li>
                                <li>• AI Context Organizer</li>
                                <li>• Transcript & Social Description App</li>
                                <li>• SassHot</li>
                            </ul>
                        </div>
                    </Dropdown>
                </section>
            </main>
        </div>
    )
}
