/**
 * Agent Orchestrator API Client & React Hooks
 * =============================================
 * 
 * Frontend integration for the autonomous coding agent service.
 */

// ============================================
// TYPES
// ============================================

export type AgentType = 'initializer' | 'coding' | 'planner' | 'qa';
export type RunStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
export type EventType = 'status' | 'tool_call' | 'tool_result' | 'message' | 'feature' | 'commit' | 'test' | 'error' | 'complete';

export interface AgentEvent {
    event: EventType;
    runId: string;
    projectId: string;
    step: number;
    data: Record<string, unknown>;
    timestamp: string;
}

export interface AgentRun {
    run_id: string;
    project_id: string;
    status: RunStatus;
    agent_type: AgentType;
}

export interface StartRunOptions {
    projectId: string;
    agentType?: AgentType;
    targetFeatureId?: string;
    model?: string;
    maxIterations?: number;
    appSpecContent?: string;
}

export interface Progress {
    total: number;
    passing: number;
    pending: number;
}

// ============================================
// API CLIENT
// ============================================

const API_BASE = process.env.NEXT_PUBLIC_AGENT_API_URL || 'http://localhost:8000';
const WS_BASE = API_BASE.replace('http', 'ws');

export const agentApi = {
    /**
     * Start a new agent run
     */
    async startRun(options: StartRunOptions): Promise<AgentRun> {
        const response = await fetch(`${API_BASE}/api/agent-runs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                project_id: options.projectId,
                agent_type: options.agentType || 'coding',
                target_feature_id: options.targetFeatureId,
                model: options.model,
                max_iterations: options.maxIterations,
                app_spec_content: options.appSpecContent,
            }),
        });

        if (!response.ok) {
            throw new Error(`Failed to start agent run: ${response.statusText}`);
        }

        return response.json();
    },

    /**
     * Get agent run status
     */
    async getRun(runId: string): Promise<AgentRun & { data: Record<string, unknown> }> {
        const response = await fetch(`${API_BASE}/api/agent-runs/${runId}`);

        if (!response.ok) {
            throw new Error(`Failed to get run: ${response.statusText}`);
        }

        return response.json();
    },

    /**
     * Stop a running agent
     */
    async stopRun(runId: string): Promise<void> {
        const response = await fetch(`${API_BASE}/api/agent-runs/${runId}/stop`, {
            method: 'POST',
        });

        if (!response.ok) {
            throw new Error(`Failed to stop run: ${response.statusText}`);
        }
    },

    /**
     * Get historical events for a run
     */
    async getEvents(runId: string): Promise<AgentEvent[]> {
        const response = await fetch(`${API_BASE}/api/agent-runs/${runId}/events`);

        if (!response.ok) {
            throw new Error(`Failed to get events: ${response.statusText}`);
        }

        return response.json();
    },

    /**
     * Subscribe to real-time events via SSE
     */
    subscribeToEvents(runId: string, onEvent: (event: AgentEvent) => void): () => void {
        const eventSource = new EventSource(`${API_BASE}/api/agent-runs/${runId}/stream`);

        const eventTypes = ['status', 'tool_call', 'tool_result', 'message', 'feature', 'commit', 'test', 'error', 'complete'];

        eventTypes.forEach(type => {
            eventSource.addEventListener(type, (e: MessageEvent) => {
                const data = JSON.parse(e.data);
                onEvent(data);
            });
        });

        eventSource.onerror = () => {
            console.error('SSE connection error');
        };

        // Return cleanup function
        return () => eventSource.close();
    },

    /**
     * Create WebSocket connection for project events
     */
    createWebSocket(projectId: string): WebSocket {
        return new WebSocket(`${WS_BASE}/ws/${projectId}`);
    },
};

// ============================================
// REACT HOOKS
// ============================================

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook for managing agent runs
 */
export function useAgentRun(projectId: string) {
    const [run, setRun] = useState<AgentRun | null>(null);
    const [events, setEvents] = useState<AgentEvent[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const cleanupRef = useRef<(() => void) | null>(null);

    const startRun = useCallback(async (options?: Partial<StartRunOptions>) => {
        try {
            setError(null);
            setEvents([]);

            const newRun = await agentApi.startRun({
                projectId,
                ...options,
            });

            setRun(newRun);
            setIsRunning(true);

            // Subscribe to events
            cleanupRef.current = agentApi.subscribeToEvents(newRun.run_id, (event) => {
                setEvents(prev => [...prev, event]);

                if (event.event === 'complete' || event.event === 'error') {
                    setIsRunning(false);
                }

                if (event.event === 'status' && event.data.status) {
                    setRun(prev => prev ? { ...prev, status: event.data.status as RunStatus } : prev);
                }
            });

            return newRun;
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unknown error');
            throw e;
        }
    }, [projectId]);

    const stopRun = useCallback(async () => {
        if (!run) return;

        try {
            await agentApi.stopRun(run.run_id);
            setIsRunning(false);
            setRun(prev => prev ? { ...prev, status: 'cancelled' } : prev);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unknown error');
        }
    }, [run]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (cleanupRef.current) {
                cleanupRef.current();
            }
        };
    }, []);

    // Calculate progress from events
    const progress = events.reduce<Progress>(
        (acc, event) => {
            if (event.event === 'status' && event.data.progress) {
                return event.data.progress as Progress;
            }
            return acc;
        },
        { total: 0, passing: 0, pending: 0 }
    );

    // Extract terminal lines from events
    const terminalOutput = events
        .filter(e => ['tool_call', 'tool_result', 'message'].includes(e.event))
        .map(e => {
            if (e.event === 'tool_call') {
                return `[${e.data.name}] ${e.data.input}`;
            }
            if (e.event === 'tool_result') {
                return `  → ${e.data.output}`;
            }
            return e.data.message || '';
        });

    return {
        run,
        events,
        progress,
        terminalOutput,
        isRunning,
        error,
        startRun,
        stopRun,
    };
}

/**
 * Hook for WebSocket-based real-time updates
 */
export function useAgentWebSocket(projectId: string) {
    const [connected, setConnected] = useState(false);
    const [events, setEvents] = useState<AgentEvent[]>([]);
    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        const ws = agentApi.createWebSocket(projectId);
        wsRef.current = ws;

        ws.onopen = () => setConnected(true);
        ws.onclose = () => setConnected(false);
        ws.onerror = () => setConnected(false);

        ws.onmessage = (e) => {
            const event = JSON.parse(e.data);
            setEvents(prev => [...prev, event]);
        };

        return () => {
            ws.close();
        };
    }, [projectId]);

    const clearEvents = useCallback(() => {
        setEvents([]);
    }, []);

    return {
        connected,
        events,
        clearEvents,
        ws: wsRef.current,
    };
}

// ============================================
// REACT COMPONENTS
// ============================================

import React from 'react';

interface AgentTerminalProps {
    projectId: string;
    className?: string;
}

/**
 * Real-time agent terminal component
 */
export function AgentTerminal({ projectId, className = '' }: AgentTerminalProps) {
    const { events, isRunning, startRun, stopRun, terminalOutput, progress } = useAgentRun(projectId);
    const terminalRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [events]);

    return (
        <div className= {`bg-slate-900 rounded-lg border border-white/10 ${className}`
}>
    {/* Header */ }
    < div className = "flex items-center justify-between px-4 py-3 border-b border-white/10" >
        <div className="flex items-center gap-3" >
            <div className={ `w-3 h-3 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}` } />
                < span className = "font-mono text-sm text-gray-300" >
                    Agent Terminal — { isRunning ? 'Running' : 'Idle' }
</span>
    </div>
    < div className = "flex items-center gap-2" >
        {
            progress.total > 0 && (
                <span className="text-sm text-gray-400">
                    { progress.passing } / { progress.total } features
                </ span >
          )}
{
    isRunning ? (
        <button
              onClick= { stopRun }
              className = "px-3 py-1 text-sm bg-red-600 hover:bg-red-700 rounded"
        >
        Stop
        </button>
          ) : (
        <button
              onClick= {() => startRun()
}
className = "px-3 py-1 text-sm bg-green-600 hover:bg-green-700 rounded"
    >
    Start Agent
        </button>
          )}
</div>
    </div>

{/* Terminal Output */ }
<div
        ref={ terminalRef }
className = "h-96 overflow-y-auto p-4 font-mono text-sm"
    >
{
    terminalOutput.map((line, i) => (
        <div
            key= { i }
            className = {`${line.startsWith('[') ? 'text-cyan-400' :
                line.startsWith('  →') ? 'text-green-400' :
                    'text-gray-300'
            }`}
    >
    { line }
    </div>
        ))}
{
    isRunning && (
        <div className="text-gray-500 animate-pulse" >▌</div>
        )
}
</div>
    </div>
  );
}

interface AgentProgressProps {
    projectId: string;
}

/**
 * Agent progress indicator
 */
export function AgentProgress({ projectId }: AgentProgressProps) {
    const { progress, isRunning, events } = useAgentRun(projectId);

    const latestStatus = events
        .filter(e => e.event === 'status')
        .slice(-1)[0];

    const percentage = progress.total > 0
        ? Math.round((progress.passing / progress.total) * 100)
        : 0;

    return (
        <div className= "bg-slate-800/50 rounded-lg p-4 border border-white/10" >
        <div className="flex items-center justify-between mb-2" >
            <span className="text-sm font-medium text-gray-300" >
                { isRunning? 'Agent Working...': 'Agent Progress' }
                </span>
                < span className = "text-sm text-gray-400" >
                    { progress.passing } / { progress.total } features
                        </span>
                        </div>

                        < div className = "w-full h-2 bg-slate-700 rounded-full overflow-hidden" >
                            <div
          className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
    style = {{ width: `${percentage}%` }
}
        />
    </div>

{
    latestStatus && (
        <div className="mt-2 text-xs text-gray-500" >
            { latestStatus.data.message || `Session ${latestStatus.data.session || 1}` }
            </div>
      )
}
</div>
  );
}

export default {
    agentApi,
    useAgentRun,
    useAgentWebSocket,
    AgentTerminal,
    AgentProgress,
};
