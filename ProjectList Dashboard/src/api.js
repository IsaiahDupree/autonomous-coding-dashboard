/**
 * API Service for Project Radar Dashboard
 * =========================================
 * 
 * Hooks and utilities for connecting to the backend API.
 * Drop-in integration for the existing Vite React app.
 */

import { useState, useEffect, useCallback, useRef } from 'react'

// ============================================
// CONFIGURATION
// ============================================

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const AGENT_API_BASE = import.meta.env.VITE_AGENT_API_URL || 'http://localhost:8000'

// ============================================
// AUTH STATE
// ============================================

let authToken = null

export function setAuthToken(token) {
    authToken = token
    if (token) {
        localStorage.setItem('auth_token', token)
    } else {
        localStorage.removeItem('auth_token')
    }
}

export function getAuthToken() {
    if (!authToken) {
        authToken = localStorage.getItem('auth_token')
    }
    return authToken
}

// ============================================
// FETCH HELPER
// ============================================

async function apiFetch(endpoint, options = {}) {
    const token = getAuthToken()

    const headers = {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
    })

    if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error?.message || `API error: ${response.status}`)
    }

    const data = await response.json()
    return data.data ?? data
}

// ============================================
// PROJECTS HOOKS
// ============================================

/**
 * Fetch all projects with real-time refresh
 */
export function useProjects(autoRefresh = true) {
    const [projects, setProjects] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const fetchProjects = useCallback(async () => {
        try {
            const data = await apiFetch('/api/projects')
            setProjects(data)
            setError(null)
        } catch (e) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchProjects()

        // Auto-refresh every 30 seconds if enabled
        if (autoRefresh) {
            const interval = setInterval(fetchProjects, 30000)
            return () => clearInterval(interval)
        }
    }, [fetchProjects, autoRefresh])

    const createProject = async (data) => {
        const project = await apiFetch('/api/projects', {
            method: 'POST',
            body: JSON.stringify(data),
        })
        setProjects(prev => [project, ...prev])
        return project
    }

    const updateProject = async (id, data) => {
        const updated = await apiFetch(`/api/projects/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        })
        setProjects(prev => prev.map(p => p.id === id ? updated : p))
        return updated
    }

    return {
        projects,
        loading,
        error,
        refetch: fetchProjects,
        createProject,
        updateProject
    }
}

/**
 * Fetch single project with all details
 * Falls back to mock data if backend unavailable
 */
export function useProject(projectId) {
    const [project, setProject] = useState(null)
    const [features, setFeatures] = useState([])
    const [workItems, setWorkItems] = useState([])
    const [agentRuns, setAgentRuns] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [isOffline, setIsOffline] = useState(false)

    const fetchProject = useCallback(async () => {
        if (!projectId) return

        try {
            setLoading(true)
            const [proj, feats, items, runs] = await Promise.all([
                apiFetch(`/api/projects/${projectId}`),
                apiFetch(`/api/projects/${projectId}/features`).catch(() => []),
                apiFetch(`/api/projects/${projectId}/work-items`).catch(() => []),
                apiFetch(`/api/projects/${projectId}/agent-runs`).catch(() => []),
            ])
            setProject(proj)
            setFeatures(feats)
            setWorkItems(items)
            setAgentRuns(runs)
            setError(null)
            setIsOffline(false)
        } catch (e) {
            // Fallback to mock data when backend unavailable
            console.log('Backend unavailable, using mock data for project:', projectId)
            setIsOffline(true)
            setProject({
                id: projectId,
                name: 'Demo Project',
                description: 'Backend API not connected - showing demo data',
                color: '#3B82F6',
                status: 'active'
            })
            setFeatures([
                { id: '1', featureKey: 'F-001', title: 'User Authentication', status: 'passing' },
                { id: '2', featureKey: 'F-002', title: 'Dashboard Layout', status: 'passing' },
                { id: '3', featureKey: 'F-003', title: 'API Integration', status: 'in_progress' },
                { id: '4', featureKey: 'F-004', title: 'Real-time Updates', status: 'pending' },
                { id: '5', featureKey: 'F-005', title: 'Dark Mode Support', status: 'pending' },
            ])
            setWorkItems([
                { id: '1', type: 'story', status: 'done', title: 'Setup project structure' },
                { id: '2', type: 'task', status: 'in_progress', title: 'Connect to API' },
                { id: '3', type: 'task', status: 'ready', title: 'Add error handling' },
                { id: '4', type: 'bug', status: 'ready', title: 'Fix loading state' },
            ])
            setAgentRuns([
                { id: '1', sessionNumber: 1, runType: 'initializer', status: 'completed', featuresCompleted: 5, commitsMade: 3 },
                { id: '2', sessionNumber: 2, runType: 'coding', status: 'completed', featuresCompleted: 10, commitsMade: 7 },
            ])
            setError(null) // Clear error since we have mock data
        } finally {
            setLoading(false)
        }
    }, [projectId])

    useEffect(() => {
        fetchProject()
    }, [fetchProject])

    return {
        project,
        features,
        workItems,
        agentRuns,
        loading,
        error,
        isOffline,
        refetch: fetchProject
    }
}

// ============================================
// AGENT HOOKS
// ============================================

/**
 * Hook for managing agent runs with real-time streaming
 */
export function useAgentRun(projectId) {
    const [run, setRun] = useState(null)
    const [events, setEvents] = useState([])
    const [isRunning, setIsRunning] = useState(false)
    const [error, setError] = useState(null)
    const eventSourceRef = useRef(null)

    const startRun = useCallback(async (options = {}) => {
        try {
            setError(null)
            setEvents([])

            const response = await fetch(`${API_BASE}/api/projects/${projectId}/agent-runs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(authToken && { Authorization: `Bearer ${authToken}` }),
                },
                body: JSON.stringify(options),
            })

            const data = await response.json()
            const newRun = data.data || data

            setRun(newRun)
            setIsRunning(true)

            // Start SSE streaming
            const evtSource = new EventSource(
                `${AGENT_API_BASE}/api/agent-runs/${newRun.run_id}/stream`
            )
            eventSourceRef.current = evtSource

            const eventTypes = ['status', 'tool_call', 'tool_result', 'message', 'feature', 'commit', 'test', 'error', 'complete']

            eventTypes.forEach(type => {
                evtSource.addEventListener(type, (e) => {
                    const event = JSON.parse(e.data)
                    setEvents(prev => [...prev, event])

                    if (type === 'complete' || type === 'error') {
                        setIsRunning(false)
                        evtSource.close()
                    }
                })
            })

            evtSource.onerror = () => {
                console.warn('SSE connection error')
            }

            return newRun
        } catch (e) {
            setError(e.message)
            throw e
        }
    }, [projectId])

    const stopRun = useCallback(async () => {
        if (!run) return

        try {
            await fetch(`${API_BASE}/api/projects/${projectId}/agent-runs/${run.run_id}/stop`, {
                method: 'POST',
                headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
            })
            setIsRunning(false)
            if (eventSourceRef.current) {
                eventSourceRef.current.close()
            }
        } catch (e) {
            setError(e.message)
        }
    }, [run, projectId])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close()
            }
        }
    }, [])

    // Computed values
    const progress = events.reduce((acc, event) => {
        if (event.event === 'status' && event.data?.progress) {
            return event.data.progress
        }
        return acc
    }, { total: 0, passing: 0, pending: 0 })

    const terminalOutput = events
        .filter(e => ['tool_call', 'tool_result', 'message'].includes(e.event))
        .map(e => {
            if (e.event === 'tool_call') return `[${e.data?.name}] ${e.data?.input || ''}`
            if (e.event === 'tool_result') return `  → ${e.data?.output || 'Done'}`
            return e.data?.message || e.data?.text || ''
        })

    return {
        run,
        events,
        progress,
        terminalOutput,
        isRunning,
        error,
        startRun,
        stopRun,
    }
}

/**
 * WebSocket connection for real-time project updates
 */
export function useProjectSocket(projectId) {
    const [connected, setConnected] = useState(false)
    const [lastEvent, setLastEvent] = useState(null)
    const wsRef = useRef(null)

    useEffect(() => {
        if (!projectId) return

        const ws = new WebSocket(`ws://localhost:3001`)
        wsRef.current = ws

        ws.onopen = () => {
            setConnected(true)
            ws.send(JSON.stringify({ action: 'subscribe', projectId }))
        }

        ws.onclose = () => setConnected(false)
        ws.onerror = () => setConnected(false)

        ws.onmessage = (e) => {
            const event = JSON.parse(e.data)
            setLastEvent(event)
        }

        return () => ws.close()
    }, [projectId])

    return { connected, lastEvent }
}

// ============================================
// AUTH HOOKS
// ============================================

export function useAuth() {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const token = getAuthToken()
        if (token) {
            apiFetch('/api/auth/me')
                .then(setUser)
                .catch(() => setUser(null))
                .finally(() => setLoading(false))
        } else {
            setLoading(false)
        }
    }, [])

    const login = async (email, password) => {
        const result = await apiFetch('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        })
        setAuthToken(result.token)
        setUser(result.user)
        return result
    }

    const register = async (email, password, name) => {
        const result = await apiFetch('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, password, name }),
        })
        setAuthToken(result.token)
        setUser(result.user)
        return result
    }

    const logout = () => {
        setAuthToken(null)
        setUser(null)
    }

    return {
        user,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Transform backend project to frontend format
 */
export function transformProject(apiProject) {
    return {
        id: apiProject.id,
        name: apiProject.name,
        description: apiProject.description || '',
        status: apiProject.status || 'idle',
        color: apiProject.color || '#3B82F6',
        touch: apiProject.touchLevel || 'medium',
        profit: apiProject.profitPotential || 'medium',
        difficulty: apiProject.difficulty || 'medium',
        automation_mode: apiProject.automationMode || 'hybrid',
        next_action: apiProject.nextAction,
        last_update: apiProject.updatedAt,
        features_total: apiProject._count?.features || 0,
        features_passing: 0, // TODO: Track in backend
        work_items: apiProject._count?.workItems || 0,
    }
}

/**
 * Check if backend is available
 */
export async function checkBackendHealth() {
    try {
        const response = await fetch(`${API_BASE}/api/health`)
        return response.ok
    } catch {
        return false
    }
}

export default {
    useProjects,
    useProject,
    useAgentRun,
    useProjectSocket,
    useAuth,
    transformProject,
    checkBackendHealth,
    setAuthToken,
    getAuthToken,
}
