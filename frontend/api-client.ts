/**
 * API Client for Dashboard
 * =========================
 * 
 * Connects the React dashboard to the backend API.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4545';

// ============================================
// TYPES
// ============================================

export interface Project {
    id: string;
    name: string;
    description: string | null;
    status: 'draft' | 'active' | 'paused' | 'archived' | 'complete';
    touchLevel: string;
    profitPotential: string;
    difficulty: string;
    automationMode: string;
    color: string;
    nextAction: string | null;
    createdAt: string;
    updatedAt: string;
    _count?: {
        features: number;
        workItems: number;
    };
}

export interface Feature {
    id: string;
    featureKey: string;
    title: string;
    description: string | null;
    status: 'pending' | 'in_progress' | 'passing' | 'failing' | 'blocked';
    priority: number;
}

export interface WorkItem {
    id: string;
    type: 'epic' | 'story' | 'task' | 'bug' | 'subtask';
    status: 'idea' | 'ready' | 'in_progress' | 'in_review' | 'done' | 'released' | 'blocked';
    title: string;
    description: string | null;
    priority: number;
    feature?: { title: string; status: string };
    assigneeUser?: { name: string; avatarUrl: string | null };
}

export interface AgentRun {
    id: string;
    runType: string;
    status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
    sessionNumber: number;
    featuresCompleted: number;
    commitsMade: number;
    startedAt: string | null;
    finishedAt: string | null;
}

export interface User {
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
}

// ============================================
// AUTH STATE
// ============================================

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
    authToken = token;
    if (token) {
        localStorage.setItem('auth_token', token);
    } else {
        localStorage.removeItem('auth_token');
    }
}

export function getAuthToken(): string | null {
    if (!authToken && typeof window !== 'undefined') {
        authToken = localStorage.getItem('auth_token');
    }
    return authToken;
}

// ============================================
// FETCH HELPER
// ============================================

async function apiFetch<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const token = getAuthToken();

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
    };

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data ?? data;
}

// ============================================
// AUTH API
// ============================================

export const authApi = {
    async login(email: string, password: string) {
        const result = await apiFetch<{ token: string; user: User }>('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
        setAuthToken(result.token);
        return result;
    },

    async register(email: string, password: string, name: string) {
        const result = await apiFetch<{ token: string; user: User }>('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, password, name }),
        });
        setAuthToken(result.token);
        return result;
    },

    async getCurrentUser() {
        return apiFetch<User>('/api/auth/me');
    },

    logout() {
        setAuthToken(null);
    },
};

// ============================================
// PROJECTS API
// ============================================

export const projectsApi = {
    async list(): Promise<Project[]> {
        return apiFetch('/api/projects');
    },

    async get(id: string): Promise<Project> {
        return apiFetch(`/api/projects/${id}`);
    },

    async create(data: Partial<Project> & { appSpec?: string }): Promise<Project> {
        return apiFetch('/api/projects', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    async update(id: string, data: Partial<Project>): Promise<Project> {
        return apiFetch(`/api/projects/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    },
};

// ============================================
// FEATURES API
// ============================================

export const featuresApi = {
    async list(projectId: string): Promise<Feature[]> {
        return apiFetch(`/api/projects/${projectId}/features`);
    },

    async sync(projectId: string, features: any[]): Promise<{ synced: number }> {
        return apiFetch(`/api/projects/${projectId}/features/sync`, {
            method: 'POST',
            body: JSON.stringify({ features }),
        });
    },
};

// ============================================
// WORK ITEMS API
// ============================================

export const workItemsApi = {
    async list(projectId: string, filters?: { status?: string; type?: string }): Promise<WorkItem[]> {
        const params = new URLSearchParams();
        if (filters?.status) params.set('status', filters.status);
        if (filters?.type) params.set('type', filters.type);

        const query = params.toString();
        return apiFetch(`/api/projects/${projectId}/work-items${query ? `?${query}` : ''}`);
    },

    async create(projectId: string, data: Partial<WorkItem>): Promise<WorkItem> {
        return apiFetch(`/api/projects/${projectId}/work-items`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    async update(projectId: string, itemId: string, data: Partial<WorkItem>): Promise<WorkItem> {
        return apiFetch(`/api/projects/${projectId}/work-items/${itemId}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    },
};

// ============================================
// AGENT RUNS API
// ============================================

export const agentRunsApi = {
    async list(projectId: string): Promise<AgentRun[]> {
        return apiFetch(`/api/projects/${projectId}/agent-runs`);
    },

    async start(projectId: string, options?: {
        agentType?: string;
        targetFeatureId?: string;
        appSpecContent?: string;
    }): Promise<AgentRun> {
        return apiFetch(`/api/projects/${projectId}/agent-runs`, {
            method: 'POST',
            body: JSON.stringify(options || {}),
        });
    },

    async stop(projectId: string, runId: string): Promise<void> {
        await apiFetch(`/api/projects/${projectId}/agent-runs/${runId}/stop`, {
            method: 'POST',
        });
    },
};

export default {
    authApi,
    projectsApi,
    featuresApi,
    workItemsApi,
    agentRunsApi,
    setAuthToken,
    getAuthToken,
};
