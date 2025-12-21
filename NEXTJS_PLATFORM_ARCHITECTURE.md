# Autonomous Coding Platform - Full Stack Architecture

## Vision: Complete Autonomous Development Workflow

### User Journey
1. **Browse Projects** → See all projects with current status
2. **Click Project** → View PRD, progress, and agent state
3. **Resume Agent** → One-click continue from last checkpoint
4. **Monitor** → Real-time terminals and agent activity
5. **Update PRD** → Text or voice input for changes
6. **Auto-Test Generation** → AI creates comprehensive tests for changes
7. **Strategic Planning** → Agent re-delegates work based on new tests
8. **Execute** → Agent implements changes autonomously

---

## Technology Stack

### Frontend
- **Next.js 14** (App Router)
- **React** with Server Components
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **shadcn/ui** for components

### Backend (Next.js API Routes)
- **Next.js API Routes** (REST + Server Actions)
- **File System API** for project data
- **Server-Sent Events** for real-time updates
- **WebSocket** for terminal streaming

### AI/Agent Integration
- **Claude API** for PRD analysis
- **Anthropic SDK** for agent control
- **OpenAI Whisper** for voice input (future)
- **Test generation** via Claude prompts

### Data Storage
- **File-based** (feature_list.json, PRD.md per project)
- **SQLite** for metadata (optional)
- **Git** for version control

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                   NEXT.JS APPLICATION                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Projects   │  │     PRD      │  │   Monitor    │ │
│  │    Browser   │  │    Editor    │  │  Terminals   │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│         │                 │                  │          │
│         ↓                 ↓                  ↓          │
│  ┌──────────────────────────────────────────────────┐ │
│  │           Next.js API Routes & Actions           │ │
│  ├──────────────────────────────────────────────────┤ │
│  │ /api/projects  │ /api/prd  │ /api/agent/resume  │ │
│  │ /api/tests     │ /api/voice│ /api/terminal      │ │
│  └──────────────────────────────────────────────────┘ │
│         │                 │                  │          │
└─────────┼─────────────────┼──────────────────┼──────────┘
          │                 │                  │
          ↓                 ↓                  ↓
┌─────────────────────────────────────────────────────────┐
│                    SERVICES LAYER                        │
├─────────────────────────────────────────────────────────┤
│  ProjectService   │  PRDService   │  AgentService       │
│  TestGenerator    │  VoiceParser  │  TerminalStream     │
└─────────────────────────────────────────────────────────┘
          │                 │                  │
          ↓                 ↓                  ↓
┌─────────────────────────────────────────────────────────┐
│                      FILE SYSTEM                         │
├─────────────────────────────────────────────────────────┤
│  /projects/                                              │
│    ├── project-a/                                        │
│    │   ├── PRD.md                                        │
│    │   ├── PRD_HISTORY.json                             │
│    │   ├── feature_list.json                            │
│    │   ├── test_specs.json                              │
│    │   ├── claude-progress.txt                          │
│    │   └── .git/                                         │
│    └── project-b/                                        │
└─────────────────────────────────────────────────────────┘
```

---

## Core Features Implementation

### 1. Project Browser

**Page**: `/projects`

```typescript
// app/projects/page.tsx
export default async function ProjectsPage() {
  const projects = await getProjects();
  
  return (
    <div className="projects-grid">
      {projects.map(project => (
        <ProjectCard
          key={project.id}
          name={project.name}
          status={project.status}
          progress={project.progress}
          lastSession={project.lastSession}
          onClick={() => router.push(`/project/${project.id}`)}
        />
      ))}
    </div>
  );
}
```

**Project Card Shows**:
- Project name
- Current status (Active/Paused/Complete)
- Progress (142/200 features)
- Last session info
- Quick actions (Resume, View, Delete)

---

### 2. Project Dashboard

**Page**: `/project/[id]`

```typescript
// app/project/[id]/page.tsx
export default async function ProjectPage({ params }) {
  const project = await getProjectDetails(params.id);
  const prd = await getPRD(params.id);
  const sessions = await getSessions(params.id);
  
  return (
    <div className="project-dashboard">
      <ProjectHeader project={project} />
      
      <div className="grid grid-cols-3 gap-6">
        {/* Left: PRD Viewer/Editor */}
        <div className="col-span-2">
          <PRDViewer prd={prd} editable />
        </div>
        
        {/* Right: Status & Actions */}
        <div>
          <StatusCard project={project} />
          <QuickActions projectId={params.id} />
          <SessionHistory sessions={sessions} />
        </div>
      </div>
      
      {/* Bottom: Terminals */}
      <TerminalGrid projectId={params.id} />
    </div>
  );
}
```

---

### 3. PRD Management with Change Tracking

**Data Structure**: `PRD_HISTORY.json`
```json
{
  "current": "v3",
  "versions": [
    {
      "version": "v1",
      "timestamp": "2025-12-05T10:00:00Z",
      "content": "# Original PRD\n...",
      "author": "user",
      "changes": []
    },
    {
      "version": "v2",
      "timestamp": "2025-12-05T14:00:00Z",
      "content": "# Updated PRD\n...",
      "author": "user",
      "changes": [
        {
          "type": "addition",
          "section": "Features",
          "description": "Add dark mode support"
        }
      ],
      "generatedTests": [
        "Dark mode toggle test",
        "Theme persistence test",
        "Accessibility test for dark mode"
      ]
    }
  ]
}
```

**PRD Editor Component**:
```typescript
// components/PRDEditor.tsx
export function PRDEditor({ projectId, initialPRD }) {
  const [prd, setPRD] = useState(initialPRD);
  const [isEditMode, setIsEditMode] = useState(false);
  
  const handleSave = async () => {
    // Detect changes
    const changes = detectPRDChanges(initialPRD, prd);
    
    // Generate tests for changes
    const tests = await generateTestsFromChanges(changes);
    
    // Save new PRD version
    await savePRDVersion({
      projectId,
      content: prd,
      changes,
      tests
    });
    
    // Trigger agent to plan work for new tests
    await triggerAgentReplanning(projectId, tests);
  };
  
  return (
    <div className="prd-editor">
      <div className="toolbar">
        <button onClick={() => setIsEditMode(!isEditMode)}>
          {isEditMode ? 'Preview' : 'Edit'}
        </button>
        <VoiceInputButton onTranscript={handleVoiceInput} />
      </div>
      
      {isEditMode ? (
        <textarea value={prd} onChange={(e) => setPRD(e.target.value)} />
      ) : (
        <MarkdownDisplay content={prd} />
      )}
      
      <button onClick={handleSave}>Save Changes</button>
    </div>
  );
}
```

---

### 4. Voice Input Integration

**API Route**: `/api/voice/transcribe`

```typescript
// app/api/voice/transcribe/route.ts
import { OpenAI } from 'openai';

export async function POST(req: Request) {
  const formData = await req.formData();
  const audio = formData.get('audio') as File;
  
  // Transcribe using Whisper
  const openai = new OpenAI();
  const transcription = await openai.audio.transcriptions.create({
    file: audio,
    model: 'whisper-1',
  });
  
  return Response.json({ text: transcription.text });
}
```

**Voice Input Component**:
```typescript
// components/VoiceInput.tsx
export function VoiceInputButton({ onTranscript }) {
  const [isRecording, setIsRecording] = useState(false);
  
  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    
    recorder.ondataavailable = async (e) => {
      const formData = new FormData();
      formData.append('audio', e.data);
      
      const res = await fetch('/api/voice/transcribe', {
        method: 'POST',
        body: formData
      });
      
      const { text } = await res.json();
      onTranscript(text);
    };
    
    recorder.start();
    setIsRecording(true);
  };
  
  return (
    <button onClick={startRecording} className={isRecording ? 'recording' : ''}>
      🎤 {isRecording ? 'Recording...' : 'Voice Input'}
    </button>
  );
}
```

---

### 5. AI-Powered Test Generation

**Service**: `TestGeneratorService`

```typescript
// services/TestGeneratorService.ts
import Anthropic from '@anthropic-ai/sdk';

export class TestGeneratorService {
  private client = new Anthropic();
  
  async generateTestsFromChanges(prdChanges: PRDChange[]): Promise<string[]> {
    const prompt = `
Given these changes to a Product Requirements Document:

${prdChanges.map(c => `- ${c.type}: ${c.description}`).join('\n')}

Generate comprehensive test cases that:
1. Verify the new functionality works correctly
2. Ensure existing features aren't broken
3. Cover edge cases and error handling
4. Include integration tests where needed

Return as JSON array of test descriptions.
    `;
    
    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });
    
    const tests = JSON.parse(response.content[0].text);
    return tests;
  }
  
  async delegateWorkForTests(projectId: string, tests: string[]) {
    // Read current feature_list.json
    const featureList = await readFeatureList(projectId);
    
    // Append new test cases
    const newFeatures = tests.map((test, i) => ({
      id: featureList.features.length + i + 1,
      name: test,
      status: 'pending',
      session: null,
      timeSpent: '-'
    }));
    
    featureList.features.push(...newFeatures);
    
    // Save updated feature_list.json
    await writeFeatureList(projectId, featureList);
    
    // Notify agent of new work
    await notifyAgentOfNewWork(projectId);
  }
}
```

---

### 6. Agent Resume & Control

**API Route**: `/api/agent/resume`

```typescript
// app/api/agent/resume/route.ts
export async function POST(req: Request) {
  const { projectId } = await req.json();
  
  // Get project path
  const projectPath = getProjectPath(projectId);
  
  // Check current agent status
  const agentStatus = await checkAgentStatus(projectId);
  
  if (agentStatus === 'running') {
    return Response.json({ 
      error: 'Agent already running' 
    }, { status: 400 });
  }
  
  // Resume agent
  const process = spawn('python3', [
    'autonomous_agent_demo.py',
    '--project-dir', projectPath
  ], {
    cwd: '/tmp/claude-quickstarts/autonomous-coding'
  });
  
  // Stream output to connected clients
  streamProcessOutput(projectId, process);
  
  return Response.json({ 
    status: 'resumed',
    pid: process.pid
  });
}
```

---

### 7. Real-Time Terminal Streaming

**API Route**: `/api/terminal/stream` (Server-Sent Events)

```typescript
// app/api/terminal/stream/[projectId]/route.ts
export async function GET(
  req: Request,
  { params }: { params: { projectId: string } }
) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      // Subscribe to project terminal output
      subscribeToTerminal(params.projectId, (data) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      });
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}
```

**Frontend**: Subscribe to terminal stream

```typescript
// hooks/useTerminalStream.ts
export function useTerminalStream(projectId: string) {
  const [output, setOutput] = useState<string[]>([]);
  
  useEffect(() => {
    const eventSource = new EventSource(
      `/api/terminal/stream/${projectId}`
    );
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setOutput(prev => [...prev, data.line]);
    };
    
    return () => eventSource.close();
  }, [projectId]);
  
  return output;
}
```

---

## Next.js Project Structure

```
autonomous-coding-platform/
├── app/
│   ├── layout.tsx                  # Root layout
│   ├── page.tsx                    # Home/landing
│   ├── projects/
│   │   └── page.tsx                # Projects browser
│   ├── project/
│   │   └── [id]/
│   │       ├── page.tsx            # Project dashboard
│   │       ├── prd/page.tsx        # PRD editor
│   │       ├── terminals/page.tsx  # Terminal view
│   │       └── settings/page.tsx   # Project settings
│   └── api/
│       ├── projects/
│       │   └── route.ts            # List/create projects
│       ├── prd/
│       │   ├── route.ts            # Get/update PRD
│       │   └── changes/route.ts    # PRD change detection
│       ├── agent/
│       │   ├── resume/route.ts     # Resume agent
│       │   ├── pause/route.ts      # Pause agent
│       │   └── status/route.ts     # Agent status
│       ├── tests/
│       │   └── generate/route.ts   # AI test generation
│       ├── terminal/
│       │   └── stream/[id]/route.ts # Terminal SSE
│       └── voice/
│           └── transcribe/route.ts  # Voice → text
├── components/
│   ├── ProjectCard.tsx
│   ├── PRDEditor.tsx
│   ├── VoiceInput.tsx
│   ├── Terminal.tsx
│   ├── AgentControls.tsx
│   └── TestList.tsx
├── services/
│   ├── ProjectService.ts
│   ├── PRDService.ts
│   ├── AgentService.ts
│   ├── TestGeneratorService.ts
│   └── TerminalService.ts
├── lib/
│   ├── anthropic.ts               # Anthropic SDK setup
│   ├── openai.ts                  # OpenAI SDK (Whisper)
│   └── utils.ts
└── public/
    └── projects/                   # Projects directory
        ├── project-a/
        └── project-b/
```

---

## Implementation Plan

### Phase 1: Next.js Setup (Today)
1. ✅ Initialize Next.js 14 with TypeScript
2. ✅ Setup Tailwind CSS
3. ✅ Create basic layout and navigation
4. ✅ Project browser page
5. ✅ Project dashboard page structure

### Phase 2: Core Features (Tomorrow)
6. ✅ File-based project storage
7. ✅ PRD viewer/editor
8. ✅ Agent resume API
9. ✅ Terminal streaming
10. ✅ Basic monitoring

### Phase 3: Advanced Features (This Week)
11. ✅ PRD change detection
12. ✅ AI test generation
13. ✅ Voice input integration
14. ✅ Work delegation system
15. ✅ Real-time updates

---

## Ready to Build?

Shall I create the Next.js application now with:
1. ✅ Project browser
2. ✅ PRD editor with version tracking
3. ✅ Voice input support
4. ✅ AI-powered test generation
5. ✅ Agent control & monitoring
6. ✅ Real-time terminal streaming

This will replace the current static dashboard with a full-stack autonomous coding platform!
