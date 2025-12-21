/**
 * Connected Dashboard Components
 * ================================
 * 
 * React components that connect to the real backend API.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    projectsApi,
    featuresApi,
    workItemsApi,
    agentRunsApi,
    authApi,
    getAuthToken,
    type Project,
    type Feature,
    type WorkItem,
    type AgentRun
} from './api-client';
import { useAgentRun } from './agent-client';

// ============================================
// HOOKS
// ============================================

/**
 * Hook for fetching and managing projects
 */
export function useProjects() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchProjects = useCallback(async () => {
        try {
            setLoading(true);
            const data = await projectsApi.list();
            setProjects(data);
            setError(null);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to fetch projects');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

    const createProject = async (data: Partial<Project> & { appSpec?: string }) => {
        const project = await projectsApi.create(data);
        setProjects(prev => [project, ...prev]);
        return project;
    };

    return { projects, loading, error, refetch: fetchProjects, createProject };
}

/**
 * Hook for single project with details
 */
export function useProject(projectId: string) {
    const [project, setProject] = useState<Project | null>(null);
    const [features, setFeatures] = useState<Feature[]>([]);
    const [workItems, setWorkItems] = useState<WorkItem[]>([]);
    const [agentRuns, setAgentRuns] = useState<AgentRun[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAll = useCallback(async () => {
        try {
            setLoading(true);
            const [proj, feats, items, runs] = await Promise.all([
                projectsApi.get(projectId),
                featuresApi.list(projectId),
                workItemsApi.list(projectId),
                agentRunsApi.list(projectId),
            ]);
            setProject(proj);
            setFeatures(feats);
            setWorkItems(items);
            setAgentRuns(runs);
            setError(null);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to fetch project');
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        if (projectId) fetchAll();
    }, [projectId, fetchAll]);

    return {
        project, features, workItems, agentRuns,
        loading, error, refetch: fetchAll
    };
}

/**
 * Hook for authentication state
 */
export function useAuth() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = getAuthToken();
        if (token) {
            authApi.getCurrentUser()
                .then(setUser)
                .catch(() => setUser(null))
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const login = async (email: string, password: string) => {
        const result = await authApi.login(email, password);
        setUser(result.user);
        return result;
    };

    const register = async (email: string, password: string, name: string) => {
        const result = await authApi.register(email, password, name);
        setUser(result.user);
        return result;
    };

    const logout = () => {
        authApi.logout();
        setUser(null);
    };

    return { user, loading, isAuthenticated: !!user, login, register, logout };
}

// ============================================
// COMPONENTS
// ============================================

interface ProjectListProps {
    onSelect: (project: Project) => void;
}

/**
 * Connected project list
 */
export function ProjectList({ onSelect }: ProjectListProps) {
    const { projects, loading, error, createProject } = useProjects();
    const [showCreate, setShowCreate] = useState(false);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-red-400 p-4 bg-red-500/10 rounded-lg">
                Error: {error}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Projects ({projects.length})</h2>
                <button
                    onClick={() => setShowCreate(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm"
                >
                    + New Project
                </button>
            </div>

            <div className="grid gap-4">
                {projects.map(project => (
                    <div
                        key={project.id}
                        onClick={() => onSelect(project)}
                        className="p-4 bg-slate-800/50 rounded-lg border border-white/10 cursor-pointer hover:border-blue-500/50 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div
                                className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                                style={{ backgroundColor: project.color }}
                            >
                                {project.name.charAt(0)}
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-white">{project.name}</h3>
                                <p className="text-sm text-gray-400">{project.description}</p>
                            </div>
                            <div className={`px-2 py-1 rounded text-xs ${project.status === 'active' ? 'bg-green-500/20 text-green-400' :
                                    project.status === 'complete' ? 'bg-blue-500/20 text-blue-400' :
                                        'bg-gray-500/20 text-gray-400'
                                }`}>
                                {project.status}
                            </div>
                        </div>
                        {project._count && (
                            <div className="mt-3 flex gap-4 text-sm text-gray-400">
                                <span>{project._count.features} features</span>
                                <span>{project._count.workItems} work items</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

interface ProjectDetailProps {
    projectId: string;
    onBack: () => void;
}

/**
 * Connected project detail view
 */
export function ProjectDetail({ projectId, onBack }: ProjectDetailProps) {
    const { project, features, workItems, agentRuns, loading, error, refetch } = useProject(projectId);
    const { isRunning, startRun, stopRun, events, progress } = useAgentRun(projectId);
    const [activeTab, setActiveTab] = useState<'overview' | 'features' | 'board' | 'agent'>('overview');

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    if (error || !project) {
        return (
            <div className="text-red-400 p-4 bg-red-500/10 rounded-lg">
                {error || 'Project not found'}
            </div>
        );
    }

    const passingFeatures = features.filter(f => f.status === 'passing').length;
    const progressPercent = features.length > 0 ? Math.round((passingFeatures / features.length) * 100) : 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded">
                    ← Back
                </button>
                <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-xl"
                    style={{ backgroundColor: project.color }}
                >
                    {project.name.charAt(0)}
                </div>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-white">{project.name}</h1>
                    <p className="text-gray-400">{project.description}</p>
                </div>
                <div className="flex gap-2">
                    {isRunning ? (
                        <button
                            onClick={stopRun}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg"
                        >
                            Stop Agent
                        </button>
                    ) : (
                        <button
                            onClick={() => startRun()}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg"
                        >
                            Start Agent
                        </button>
                    )}
                </div>
            </div>

            {/* Progress Bar */}
            <div className="bg-slate-800/50 rounded-lg p-4 border border-white/10">
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
                {(['overview', 'features', 'board', 'agent'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 text-sm capitalize transition-colors ${activeTab === tab
                                ? 'text-white border-b-2 border-blue-500'
                                : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-white/10">
                        <div className="text-2xl font-bold text-white">{features.length}</div>
                        <div className="text-sm text-gray-400">Total Features</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-white/10">
                        <div className="text-2xl font-bold text-green-400">{passingFeatures}</div>
                        <div className="text-sm text-gray-400">Passing</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-white/10">
                        <div className="text-2xl font-bold text-white">{workItems.length}</div>
                        <div className="text-sm text-gray-400">Work Items</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-white/10">
                        <div className="text-2xl font-bold text-blue-400">{agentRuns.length}</div>
                        <div className="text-sm text-gray-400">Agent Runs</div>
                    </div>
                </div>
            )}

            {activeTab === 'features' && (
                <div className="space-y-2">
                    {features.map(feature => (
                        <div
                            key={feature.id}
                            className="p-3 bg-slate-800/50 rounded-lg border border-white/10 flex items-center gap-3"
                        >
                            <div className={`w-8 h-8 rounded flex items-center justify-center text-xs ${feature.status === 'passing' ? 'bg-green-500/20 text-green-400' :
                                    feature.status === 'failing' ? 'bg-red-500/20 text-red-400' :
                                        'bg-gray-500/20 text-gray-400'
                                }`}>
                                {feature.status === 'passing' ? '✓' : feature.status === 'failing' ? '✗' : '○'}
                            </div>
                            <div className="flex-1">
                                <div className="font-medium text-white">{feature.title}</div>
                                <div className="text-xs text-gray-500">{feature.featureKey}</div>
                            </div>
                            <div className={`text-xs px-2 py-1 rounded ${feature.status === 'passing' ? 'bg-green-500/20 text-green-400' :
                                    feature.status === 'failing' ? 'bg-red-500/20 text-red-400' :
                                        feature.status === 'in_progress' ? 'bg-yellow-500/20 text-yellow-400' :
                                            'bg-gray-500/20 text-gray-400'
                                }`}>
                                {feature.status}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'board' && (
                <div className="grid grid-cols-4 gap-4">
                    {(['ready', 'in_progress', 'in_review', 'done'] as const).map(status => (
                        <div key={status} className="space-y-2">
                            <h3 className="font-medium text-gray-400 capitalize px-2">
                                {status.replace('_', ' ')}
                            </h3>
                            {workItems.filter(w => w.status === status).map(item => (
                                <div
                                    key={item.id}
                                    className="p-3 bg-slate-800 rounded-lg border border-white/10"
                                >
                                    <div className="text-sm font-medium text-white">{item.title}</div>
                                    <div className="text-xs text-gray-500 mt-1">{item.type}</div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'agent' && (
                <div className="space-y-4">
                    {/* Live terminal */}
                    <div className="bg-slate-900 rounded-lg border border-white/10 p-4 font-mono text-sm h-64 overflow-y-auto">
                        {events.map((event, i) => (
                            <div key={i} className={`${event.event === 'tool_call' ? 'text-cyan-400' :
                                    event.event === 'tool_result' ? 'text-green-400' :
                                        event.event === 'error' ? 'text-red-400' :
                                            'text-gray-300'
                                }`}>
                                [{event.event}] {JSON.stringify(event.data)}
                            </div>
                        ))}
                        {isRunning && <div className="text-gray-500 animate-pulse">▌</div>}
                    </div>

                    {/* Run history */}
                    <div className="space-y-2">
                        <h3 className="font-medium text-gray-400">Recent Runs</h3>
                        {agentRuns.slice(0, 5).map(run => (
                            <div
                                key={run.id}
                                className="p-3 bg-slate-800/50 rounded-lg border border-white/10 flex items-center gap-3"
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
    );
}

/**
 * Login form component
 */
export function LoginForm({ onSuccess }: { onSuccess: () => void }) {
    const { login, register } = useAuth();
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (mode === 'login') {
                await login(email, password);
            } else {
                await register(email, password, name);
            }
            onSuccess();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto p-6 bg-slate-800/50 rounded-xl border border-white/10">
            <h2 className="text-2xl font-bold text-white mb-6">
                {mode === 'login' ? 'Sign In' : 'Create Account'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'register' && (
                    <input
                        type="text"
                        placeholder="Name"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-900 border border-white/10 rounded-lg"
                        required
                    />
                )}

                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-900 border border-white/10 rounded-lg"
                    required
                />

                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-900 border border-white/10 rounded-lg"
                    required
                />

                {error && (
                    <div className="text-red-400 text-sm">{error}</div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg"
                >
                    {loading ? 'Loading...' : mode === 'login' ? 'Sign In' : 'Create Account'}
                </button>
            </form>

            <div className="mt-4 text-center text-sm text-gray-400">
                {mode === 'login' ? (
                    <>
                        Don't have an account?{' '}
                        <button onClick={() => setMode('register')} className="text-blue-400 hover:underline">
                            Sign up
                        </button>
                    </>
                ) : (
                    <>
                        Already have an account?{' '}
                        <button onClick={() => setMode('login')} className="text-blue-400 hover:underline">
                            Sign in
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

export default {
    useProjects,
    useProject,
    useAuth,
    ProjectList,
    ProjectDetail,
    LoginForm,
};
