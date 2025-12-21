# Project Detail Page - Implementation Guide

## 🎯 Overview

The `/project/[id]` page is the control center for each project, combining:
- ✅ PRD viewer/editor with version tracking
- ✅ Voice input for PRD updates  
- ✅ Agent controls (Resume/Pause)
- ✅ Real-time terminals
- ✅ Test results viewer (200 features)
- ✅ Session history
- ✅ File browser

---

## 📁 File Structure

```
app/
├── project/
│   └── [id]/
│       ├── page.tsx          # Main project dashboard
│       ├── layout.tsx         # Project layout wrapper
│       └── loading.tsx        # Loading state
├── api/
│   ├── project/
│   │   └── [id]/
│   │       ├── route.ts      # Get project data
│   │       └── prd/
│   │           └── route.ts  # PRD CRUD operations
│   ├── agent/
│   │   ├── resume/
│   │   │   └── route.ts      # Resume agent
│   │   └── pause/
│   │       └── route.ts      # Pause agent
│   ├── terminal/
│   │   └── stream/
│   │       └── [id]/
│   │           └── route.ts  # SSE terminal stream
│   └── voice/
│       └── transcribe/
│           └── route.ts      # Voice → text
components/
├── project/
│   ├── PRDEditor.tsx          # PRD editor component
│   ├── VoiceInput.tsx         # Voice input button
│   ├── AgentControls.tsx      # Start/stop/resume
│   ├── TerminalPanel.tsx      # Terminal viewer
│   ├── TestResults.tsx        # 200 features list
│   └── SessionHistory.tsx     # Past sessions
```

---

## 🎨 Project Page Layout

### Main Dashboard (`/project/[id]/page.tsx`)

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Play, Pause, Terminal, FileText, CheckSquare, History, Settings } from 'lucide-react'

import PRDEditor from '@/components/project/PRDEditor'
import AgentControls from '@/components/project/AgentControls'
import TerminalPanel from '@/components/project/TerminalPanel'
import TestResults from '@/components/project/TestResults'
import SessionHistory from '@/components/project/SessionHistory'

export default function ProjectPage() {
  const params = useParams()
  const [project, setProject] = useState<any>(null)
  const [agentStatus, setAgentStatus] = useState('idle')
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    loadProject()
  }, [params.id])

  const loadProject = async () => {
    const res = await fetch(`/api/project/${params.id}`)
    const data = await res.json()
    setProject(data)
  }

  if (!project) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <div className="min-h-screen" style={{background: '#0f172a'}}>
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl"
                style={{backgroundColor: project.color}}
              >
                {project.name.charAt(0)}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{project.name}</h1>
                <p className="text-sm text-gray-400">{project.description}</p>
              </div>
            </div>
            <AgentControls 
              projectId={params.id as string} 
              status={agentStatus}
              onStatusChange={setAgentStatus}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <FileText size={16} />
              Overview
            </TabsTrigger>
            <TabsTrigger value="prd" className="flex items-center gap-2">
              <FileText size={16} />
              PRD
            </TabsTrigger>
            <TabsTrigger value="tests" className="flex items-center gap-2">
              <CheckSquare size={16} />
              Tests ({project.progress?.total || 0})
            </TabsTrigger>
            <TabsTrigger value="terminal" className="flex items-center gap-2">
              <Terminal size={16} />
              Terminal
            </TabsTrigger>
            <TabsTrigger value="sessions" className="flex items-center gap-2">
              <History size={16} />
              Sessions
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: Project Stats */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle>Project Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-400">Progress</span>
                          <span className="text-white font-semibold">
                            {project.progress?.passing || 0}/{project.progress?.total || 0}
                          </span>
                        </div>
                        <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                            style={{
                              width: `${((project.progress?.passing || 0) / (project.progress?.total || 1)) * 100}%`
                            }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="glass-card p-4 rounded-lg">
                          <div className="text-2xl font-bold text-green-400">
                            {project.progress?.passing || 0}
                          </div>
                          <div className="text-xs text-gray-400">Passing</div>
                        </div>
                        <div className="glass-card p-4 rounded-lg">
                          <div className="text-2xl font-bold text-yellow-400">1</div>
                          <div className="text-xs text-gray-400">Running</div>
                        </div>
                        <div className="glass-card p-4 rounded-lg">
                          <div className="text-2xl font-bold text-gray-400">
                            {(project.progress?.total || 0) - (project.progress?.passing || 0)}
                          </div>
                          <div className="text-xs text-gray-400">Pending</div>
                        </div>
                      </div>

                      {project.next_action && (
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                          <div className="text-xs text-blue-400 mb-1">Next Action</div>
                          <div className="text-white">{project.next_action}</div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Quick PRD Preview */}
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>PRD Overview</span>
                      <Button size="sm" onClick={() => setActiveTab('prd')}>
                        Edit PRD
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-invert max-w-none">
                      <p className="text-gray-300">
                        {project.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right: Classification & Details */}
              <div className="space-y-6">
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle>Classification</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Touch Level</div>
                      <Badge variant="outline">{project.touch_level}</Badge>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Profit Potential</div>
                      <Badge variant="outline">{project.profit_potential}</Badge>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Difficulty</div>
                      <Badge variant="outline">{project.difficulty}</Badge>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Automation Mode</div>
                      <Badge variant="outline">{project.automation_mode}</Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle>Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Type</span>
                      <span className="text-white">{project.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Category</span>
                      <span className="text-white">{project.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Status</span>
                      <Badge>{project.status}</Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* PRD Tab */}
          <TabsContent value="prd">
            <PRDEditor projectId={params.id as string} />
          </TabsContent>

          {/* Tests Tab */}
          <TabsContent value="tests">
            <TestResults projectId={params.id as string} />
          </TabsContent>

          {/* Terminal Tab */}
          <TabsContent value="terminal">
            <TerminalPanel projectId={params.id as string} />
          </TabsContent>

          {/* Sessions Tab */}
          <TabsContent value="sessions">
            <SessionHistory projectId={params.id as string} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
```

---

## 🎤 PRD Editor Component

**File**: `components/project/PRDEditor.tsx`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Mic, Save, History } from 'lucide-react'
import VoiceInput from './VoiceInput'

export default function PRDEditor({ projectId }: { projectId: string }) {
  const [prd, setPRD] = useState('')
  const [isEditMode, setIsEditMode] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [versions, setVersions] = useState<any[]>([])

  useEffect(() => {
    loadPRD()
  }, [projectId])

  const loadPRD = async () => {
    const res = await fetch(`/api/project/${projectId}/prd`)
    const data = await res.json()
    setPRD(data.content || '')
    setVersions(data.versions || [])
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const res = await fetch(`/api/project/${projectId}/prd`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: prd })
      })
      const data = await res.json()
      
      // If changes detected, generate tests
      if (data.changes && data.changes.length > 0) {
        // Show test generation notification
        alert(`Generated ${data.generatedTests.length} new tests for changes!`)
      }
      
      setIsEditMode(false)
      loadPRD()
    } catch (err) {
      console.error('Failed to save PRD:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleVoiceInput = (text: string) => {
    // Append voice input to PRD
    setPRD(prev => prev + '\n\n' + text)
    setIsEditMode(true)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main PRD Editor */}
      <div className="lg:col-span-2">
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Product Requirements Document</CardTitle>
              <div className="flex gap-2">
                <VoiceInput onTranscript={handleVoiceInput} />
                {isEditMode ? (
                  <>
                    <Button onClick={handleSave} disabled={isSaving}>
                      <Save size={16} className="mr-2" />
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditMode(false)}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => setIsEditMode(true)}>
                    Edit PRD
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isEditMode ? (
              <Textarea
                value={prd}
                onChange={(e) => setPRD(e.target.value)}
                className="min-h-[600px] font-mono"
                placeholder="# Project Requirements\n\nDescribe your project..."
              />
            ) : (
              <div className="prose prose-invert max-w-none">
                <pre className="whitespace-pre-wrap">{prd || 'No PRD yet. Click Edit to add one.'}</pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Version History Sidebar */}
      <div>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History size={16} />
              Versions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {versions.map((v, i) => (
                <div key={i} className="glass-card p-3 rounded-lg cursor-pointer hover:bg-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline">v{versions.length - i}</Badge>
                    <span className="text-xs text-gray-400">
                      {new Date(v.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  {v.changes && v.changes.length > 0 && (
                    <div className="text-xs text-gray-300">
                      {v.changes.length} change(s)
                    </div>
                  )}
                  {v.generatedTests && (
                    <div className="text-xs text-green-400 mt-1">
                      +{v.generatedTests.length} tests
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

---

## 🎤 Voice Input Component

**File**: `components/project/VoiceInput.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Mic, MicOff } from 'lucide-react'

export default function VoiceInput({ onTranscript }: { onTranscript: (text: string) => void }) {
  const [isRecording, setIsRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const audioChunks: Blob[] = []

      recorder.ondataavailable = (e) => {
        audioChunks.push(e.data)
      }

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
        const formData = new FormData()
        formData.append('audio', audioBlob)

        const res = await fetch('/api/voice/transcribe', {
          method: 'POST',
          body: formData
        })
        
        const { text } = await res.json()
        onTranscript(text)
        
        stream.getTracks().forEach(track => track.stop())
      }

      recorder.start()
      setMediaRecorder(recorder)
      setIsRecording(true)
    } catch (err) {
      console.error('Failed to start recording:', err)
    }
  }

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop()
      setIsRecording(false)
    }
  }

  return (
    <Button
      variant={isRecording ? "destructive" : "outline"}
      onClick={isRecording ? stopRecording : startRecording}
    >
      {isRecording ? (
        <>
          <MicOff size={16} className="mr-2" />
          Stop Recording
        </>
      ) : (
        <>
          <Mic size={16} className="mr-2" />
          Voice Input
        </>
      )}
    </Button>
  )
}
```

---

## 🚀 Next Implementation Steps

1. ✅ **Create directory structure**:
   ```bash
   mkdir -p app/project/[id]
   mkdir -p components/project
   mkdir -p app/api/project/[id]/prd
   ```

2. ✅ **Copy components** from guide above

3. ✅ **Install additional packages**:
   ```bash
   npm install @anthropic-ai/sdk openai
   ```

4. ✅ **Test project page** at http://localhost:3001/project/everreach

---

Ready to implement? I can create all the component files next!
