'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Play, Pause, RotateCcw } from 'lucide-react'

interface AgentControlsProps {
    projectId: string
    status: string
    onStatusChange: (status: string) => void
}

export default function AgentControls({ projectId, status, onStatusChange }: AgentControlsProps) {
    const [isLoading, setIsLoading] = useState(false)

    const handleResume = async () => {
        setIsLoading(true)
        try {
            const res = await fetch('/api/agent/resume', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ project Id })
            })
            const data = await res.json()
            onStatusChange('running')
        } catch (err) {
            console.error('Failed to resume agent:', err)
        } finally {
            setIsLoading(false)
        }
    }

    const handlePause = async () => {
        setIsLoading(true)
        try {
            const res = await fetch('/api/agent/pause', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId })
            })
            const data = await res.json()
            onStatusChange('paused')
        } catch (err) {
            console.error('Failed to pause agent:', err)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex items-center gap-3">
            <Badge
                variant={status === 'running' ? 'default' : 'outline'}
                className={status === 'running' ? 'bg-green-500' : ''}
            >
                {status === 'running' && '🟢'}
                {status === 'paused' && '⏸️'}
                {status === 'idle' && '⏹️'}
                <span className="ml-1.5 capitalize">{status}</span>
            </Badge>

            {status === 'running' ? (
                <Button
                    variant="outline"
                    onClick={handlePause}
                    disabled={isLoading}
                >
                    <Pause size={16} className="mr-2" />
                    Pause
                </Button>
            ) : (
                <>
                    <Button
                        onClick={handleResume}
                        disabled={isLoading}
                    >
                        <Play size={16} className="mr-2" />
                        Resume
                    </Button>
                    <Button variant="outline">
                        <RotateCcw size={16} className="mr-2" />
                        Reset
                    </Button>
                </>
            )}
        </div>
    )
}
