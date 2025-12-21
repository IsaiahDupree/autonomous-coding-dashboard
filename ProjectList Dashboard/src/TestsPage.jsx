import { useState } from 'react'
import {
    TestTube2,
    ChevronDown,
    ChevronRight,
    Shield,
    Code,
    Layers,
    GitBranch,
    Bot,
    Database,
    Globe,
    Zap,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Play,
    Server,
    Users,
    FileJson,
    Workflow,
    Target,
    Gauge,
    Lock
} from 'lucide-react'

// Collapsible Section Component
function Section({ title, icon: Icon, color = 'blue', children, defaultOpen = false }) {
    const [isOpen, setIsOpen] = useState(defaultOpen)

    const colors = {
        blue: 'from-blue-500 to-blue-600',
        green: 'from-green-500 to-emerald-600',
        purple: 'from-purple-500 to-pink-600',
        orange: 'from-orange-500 to-red-600',
        cyan: 'from-cyan-500 to-teal-600',
        yellow: 'from-yellow-500 to-orange-600'
    }

    return (
        <div className="mb-4">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center gap-3 p-4 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-white/10 transition-all"
            >
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${colors[color]} flex items-center justify-center`}>
                    <Icon size={18} className="text-white" />
                </div>
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

function TestCategory({ title, items }) {
    return (
        <div className="mb-4">
            <h4 className="text-sm font-semibold text-white mb-2">{title}</h4>
            <ul className="space-y-1">
                {items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
                        <CheckCircle2 size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
                        {item}
                    </li>
                ))}
            </ul>
        </div>
    )
}

function FeatureListExample() {
    const example = `{
  "id": "PM-123",
  "title": "Drag-and-drop tasks on Kanban board",
  "user_story": "As a developer, I want to drag tasks between columns...",
  "acceptance_criteria": [
    "Given a board with a task in 'To Do', when dragged to 'In Progress', status updates",
    "Status transitions must respect the workflow"
  ],
  "test_plan": {
    "levels": ["unit", "integration", "e2e"],
    "types": ["functional", "ui", "regression"]
  },
  "automated_tests": [
    {
      "kind": "unit",
      "path": "tests/unit/board/column_transition.test.ts",
      "required": true
    },
    {
      "kind": "e2e",
      "path": "tests/e2e/board_drag_drop.spec.ts",
      "tool": "playwright",
      "required": true
    }
  ],
  "nonfunctional": {
    "performance_budget_ms": 200,
    "accessibility_checks": ["keyboard_drag_drop_alt", "aria_live_updates"]
  },
  "status": { "passes": false, "last_run": null }
}`

    return (
        <pre className="bg-slate-950 rounded-lg p-4 text-xs overflow-x-auto text-green-400 font-mono">
            {example}
        </pre>
    )
}

export default function TestsPage() {
    return (
        <div className="min-h-screen bg-slate-950 text-white">
            {/* Header */}
            <header className="border-b border-white/10 sticky top-0 bg-slate-950/90 backdrop-blur-sm z-10">
                <div className="max-w-6xl mx-auto px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                            <TestTube2 size={24} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">Test Suite</h1>
                            <p className="text-sm text-gray-400">"Jira-with-Agents" PM + Autonomous Coding Tests</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-6xl mx-auto px-6 py-8">
                {/* Overview */}
                <div className="mb-8 p-6 bg-gradient-to-r from-green-900/30 to-cyan-900/30 border border-green-500/20 rounded-xl">
                    <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
                        <Target className="text-green-400" />
                        What This Suite Covers
                    </h2>
                    <p className="text-gray-300 mb-4">
                        A complete test framework for an autonomous PM + coding platform built on:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-slate-800/50 rounded-lg p-3">
                            <Bot className="text-blue-400 mb-2" size={20} />
                            <div className="font-semibold text-white text-sm">Agent Harness Layer</div>
                            <div className="text-xs text-gray-400">Initializer, Coding, QA, Planner agents</div>
                        </div>
                        <div className="bg-slate-800/50 rounded-lg p-3">
                            <Layers className="text-purple-400 mb-2" size={20} />
                            <div className="font-semibold text-white text-sm">PM Web App (Jira-like)</div>
                            <div className="text-xs text-gray-400">Projects, epics, stories, sprints</div>
                        </div>
                        <div className="bg-slate-800/50 rounded-lg p-3">
                            <Workflow className="text-orange-400 mb-2" size={20} />
                            <div className="font-semibold text-white text-sm">Agent–PM–CI Triad</div>
                            <div className="text-xs text-gray-400">Status sync, test-gating, resilience</div>
                        </div>
                    </div>
                </div>

                {/* Test Categories */}
                <Section title="A. Harness & Agent Behavior Tests" icon={Bot} color="blue" defaultOpen={true}>
                    <div className="space-y-6">
                        <TestCategory
                            title="Unit Tests"
                            items={[
                                "Parsing & writing feature_list.json",
                                "Status transitions of a feature (pending → in_progress → blocked → done)",
                                "Converters between PM tasks ↔ feature_list items",
                                "Safety filters (agent can't delete all tests / wipe backlog)"
                            ]}
                        />
                        <TestCategory
                            title="Integration Tests – Initializer Agent"
                            items={[
                                "Given app_spec.txt → feature_list.json created with N features",
                                "init.sh runs and returns non-zero if tests fail",
                                "Git repo in correct initial state"
                            ]}
                        />
                        <TestCategory
                            title="Integration Tests – Coding Agent Loop"
                            items={[
                                "Loop cannot mark passes: true unless init.sh exits 0",
                                "On failure, writes clear entries to progress log",
                                "Leaves repo in runnable state on failure"
                            ]}
                        />
                        <TestCategory
                            title="Integration Tests – QA Agent"
                            items={[
                                "Given features lacking tests, agent proposes test skeletons",
                                "Tests placed in correct folders with naming conventions"
                            ]}
                        />
                        <TestCategory
                            title="Integration Tests – Planner Agent"
                            items={[
                                "New features in feature_list.json sync to PM app as tasks",
                                "Correct links between features and PM artifacts"
                            ]}
                        />
                        <TestCategory
                            title="System / E2E Tests"
                            items={[
                                "Full flow: Create project → Initializer runs → coding session → tests green → tasks Done",
                                "Agent resume: Stop agents, modify file, restart → reads artifacts, fixes breakage",
                                "Smoke: Boot harness, run init.sh, hit main PM routes",
                                "Regression suite on every agent session + human commit"
                            ]}
                        />
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-sm">
                            <strong className="text-blue-300">Approach:</strong>
                            <span className="text-gray-400 ml-2">White-box on harness modules, black-box E2E on full flow. Risk-based focus on test execution, feature completion logic, PM↔code state mappings.</span>
                        </div>
                    </div>
                </Section>

                <Section title="B. PM Web App Tests (Jira-style)" icon={Layers} color="purple">
                    <div className="space-y-6">
                        <TestCategory
                            title="API & DB Tests"
                            items={[
                                "CRUD for projects, epics, stories, tasks",
                                "Correct status transitions (enforce allowed transitions per workflow)",
                                "Sprint assignments & burndown calculations",
                                "Permissions/roles (viewer, dev, PM, admin, agent-service-user)"
                            ]}
                        />
                        <TestCategory
                            title="UI Tests (E2E / Component)"
                            items={[
                                "Create + edit + drag-drop tasks on boards",
                                "Filtering & searching by status, assignee, tag, repo, agent/human",
                                "Linking tasks to git commits/tests; view build & test status"
                            ]}
                        />
                        <TestCategory
                            title="Integration Tests"
                            items={[
                                "Webhooks from Git platforms: auto-link commit/PR to task",
                                "CI webhooks: update task with build & test results",
                                "Claude Agent SDK: agent actions create comments / task updates",
                                "Contract tests for 3rd-party APIs (GitHub, GitLab, Slack)"
                            ]}
                        />
                        <TestCategory
                            title="Acceptance / BDD Tests"
                            items={[
                                '"As a PM I can create an epic with child stories, start a sprint, and agents automatically pick the top ranked stories and start coding, updating statuses as they progress."'
                            ]}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
                                <Gauge className="text-orange-400 mb-1" size={16} />
                                <div className="text-sm font-semibold text-orange-300">Performance / Load</div>
                                <div className="text-xs text-gray-400">Backlog & boards fast with realistic org sizes, dashboard queries under X ms</div>
                            </div>
                            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                                <Lock className="text-red-400 mb-1" size={16} />
                                <div className="text-sm font-semibold text-red-300">Security</div>
                                <div className="text-xs text-gray-400">AuthN/AuthZ, RBAC, multi-tenant isolation, SAST/DAST, fuzzing</div>
                            </div>
                            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
                                <Users className="text-purple-400 mb-1" size={16} />
                                <div className="text-sm font-semibold text-purple-300">Usability & a11y</div>
                                <div className="text-xs text-gray-400">Keyboard navigation, ARIA roles, contrast checks</div>
                            </div>
                        </div>
                    </div>
                </Section>

                <Section title="C. Agent–PM–CI Triad (Project Heartbeat)" icon={Workflow} color="orange">
                    <div className="space-y-6">
                        <TestCategory
                            title="1. Status & Lifecycle Sync"
                            items={[
                                'When Coding Agent starts: Task moves "Ready" → "In Progress" (agent as assignee)',
                                'When tests pass & PR merged: Task moves to "Done" & release notes updated',
                                'If tests fail: Task set to "Blocked" with failure details attached'
                            ]}
                        />
                        <TestCategory
                            title="2. Test-Gating Logic"
                            items={[
                                'No agent/API path can mark task "Done" unless all linked tests green',
                                'CI build must be successful on main branch',
                                'Canary deployment tests update "Released to X% users"',
                                'Roll back on canary failures'
                            ]}
                        />
                        <TestCategory
                            title="3. Resilience & Recovery"
                            items={[
                                'Restart harness while agents mid-flight → agents rehydrate from artifacts + PM system',
                                'Network/API failures (Claude/git/CI down) → agents back off, tasks move to "Agent Blocked"'
                            ]}
                        />
                        <TestCategory
                            title="4. Chaos / Monkey Tests"
                            items={[
                                "Randomly kill agent processes → confirm no data corruption, no duplicate PRs/tasks",
                                "Randomly reorder/duplicate webhook events → system remains consistent"
                            ]}
                        />
                    </div>
                </Section>

                <Section title="D. Non-Functional Tests (Agent Layer)" icon={Gauge} color="cyan">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-slate-800/50 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Server className="text-cyan-400" size={18} />
                                <span className="font-semibold text-white">Soak/Endurance Testing</span>
                            </div>
                            <ul className="text-sm text-gray-400 space-y-1">
                                <li>• Run agents on long projects for days</li>
                                <li>• No runaway disk usage in artifacts</li>
                                <li>• Logs rotate properly</li>
                            </ul>
                        </div>
                        <div className="bg-slate-800/50 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Layers className="text-cyan-400" size={18} />
                                <span className="font-semibold text-white">Scalability Testing</span>
                            </div>
                            <ul className="text-sm text-gray-400 space-y-1">
                                <li>• Many parallel projects & agents</li>
                                <li>• Queues don't starve</li>
                                <li>• Respect per-org limits</li>
                            </ul>
                        </div>
                        <div className="bg-slate-800/50 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Shield className="text-cyan-400" size={18} />
                                <span className="font-semibold text-white">Reliability & Failover</span>
                            </div>
                            <ul className="text-sm text-gray-400 space-y-1">
                                <li>• If worker node dies, another picks up session</li>
                                <li>• Shared artifacts enable recovery</li>
                            </ul>
                        </div>
                        <div className="bg-slate-800/50 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <FileJson className="text-cyan-400" size={18} />
                                <span className="font-semibold text-white">Compliance / Auditability</span>
                            </div>
                            <ul className="text-sm text-gray-400 space-y-1">
                                <li>• Every action has: Actor, Inputs, Outputs</li>
                                <li>• Agent ID + model version tracked</li>
                                <li>• Diffs, tests run, results logged</li>
                            </ul>
                        </div>
                    </div>
                </Section>

                <Section title="feature_list.json Test Schema" icon={FileJson} color="green">
                    <p className="text-gray-300 mb-4">
                        Each feature item carries metadata for agents to validate completion:
                    </p>
                    <FeatureListExample />
                    <div className="mt-4 bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                        <strong className="text-green-300">QA Agent reads this to:</strong>
                        <ul className="text-sm text-gray-400 mt-2 space-y-1">
                            <li>• Check acceptance_criteria + test_plan</li>
                            <li>• Identify gaps in automated_tests</li>
                            <li>• Generate new tests where missing</li>
                            <li>• Ensure CI runs listed tests when feature touched</li>
                        </ul>
                    </div>
                </Section>

                <Section title="Minimal V1 Test Stack (Start Lean)" icon={Target} color="yellow">
                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <span className="w-8 h-8 rounded-full bg-yellow-600 flex items-center justify-center text-sm font-bold flex-shrink-0">1</span>
                            <div>
                                <strong className="text-white">Unit Tests</strong>
                                <ul className="text-sm text-gray-400 mt-1 space-y-0.5">
                                    <li>• PM domain logic (statuses, workflows, permissions)</li>
                                    <li>• Harness core (feature_list parsing, status gating, test runner wrappers)</li>
                                </ul>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <span className="w-8 h-8 rounded-full bg-yellow-600 flex items-center justify-center text-sm font-bold flex-shrink-0">2</span>
                            <div>
                                <strong className="text-white">Integration Tests</strong>
                                <ul className="text-sm text-gray-400 mt-1 space-y-0.5">
                                    <li>• Initializer & Coding agent ↔ Git</li>
                                    <li>• Initializer & Coding agent ↔ init.sh test runner</li>
                                    <li>• Initializer & Coding agent ↔ PM API</li>
                                </ul>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <span className="w-8 h-8 rounded-full bg-yellow-600 flex items-center justify-center text-sm font-bold flex-shrink-0">3</span>
                            <div>
                                <strong className="text-white">E2E Tests</strong>
                                <ul className="text-sm text-gray-400 mt-1 space-y-0.5">
                                    <li>• "Create project → generate spec → agent builds feature → UI shows Done"</li>
                                    <li>• "Agent resumes after restart and fixes failing test"</li>
                                </ul>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <span className="w-8 h-8 rounded-full bg-yellow-600 flex items-center justify-center text-sm font-bold flex-shrink-0">4</span>
                            <div>
                                <strong className="text-white">Non-Functional (Targeted)</strong>
                                <ul className="text-sm text-gray-400 mt-1 space-y-0.5">
                                    <li>• Basic performance on backlog/board views</li>
                                    <li>• Auth & multi-tenant isolation tests</li>
                                    <li>• Simple soak: 24-hour agent run without degradation</li>
                                </ul>
                            </div>
                        </div>
                        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-sm text-yellow-300">
                            <strong>Layer Later:</strong> a11y depth, security fuzzing, chaos testing, DR drills
                        </div>
                    </div>
                </Section>
            </main>
        </div>
    )
}
