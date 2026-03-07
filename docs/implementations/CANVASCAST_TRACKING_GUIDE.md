# CanvasCast - Event Tracking Implementation Guide

**Priority:** P2
**Status:** Ready for Implementation
**Target App:** `/Users/isaiahdupree/Documents/Software/YoutubeNewb - CanvasCast`

---

## Overview

CanvasCast is a video generation platform. Tracking focuses on project creation, video generation, downloads, and script editing.

---

## Core Value Events

| Event | Trigger | Properties | North Star |
|-------|---------|------------|-----------|
| `project_created` | New video project | `projectId`, `format`, `templateId` | |
| `prompt_submitted` | AI prompt entered | `projectId`, `promptLength`, `topic` | ✅ First Value |
| `video_generated` | Generation complete | `projectId`, `duration`, `processingTime`, `quality` | ✅ Aha Moment |
| `video_downloaded` | User downloads | `projectId`, `format`, `quality`, `fileSize` | |
| `script_edited` | Script modified | `projectId`, `changeCount`, `wordCount` | |
| `voice_selected` | Voice chosen | `projectId`, `voiceId`, `language`, `gender` | |

---

## Quick Implementation

### 1. Install SDK

```bash
cd "/Users/isaiahdupree/Documents/Software/YoutubeNewb - CanvasCast"
mkdir -p src/lib/tracking
cp /Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness/shared/userEventTracker.ts src/lib/tracking/
```

### 2. Initialize

```typescript
// app/layout.tsx
import { tracker } from '@/lib/tracking/userEventTracker';

if (typeof window !== 'undefined') {
  tracker.init({
    projectId: 'canvascast',
    apiEndpoint: process.env.NEXT_PUBLIC_TRACKING_API || 'http://localhost:3001/api/tracking/events',
    debug: process.env.NODE_ENV === 'development',
  });
}
```

### 3. Key Tracking Points

**Project Created:**
```typescript
// app/projects/create/action.ts
tracker.track('project_created', {
  projectId: project.id,
  format: project.format, // '16:9', '9:16', '1:1'
  templateId: project.templateId,
  category: project.category,
});
```

**Prompt Submitted:** (First Value)
```typescript
// components/PromptForm.tsx
tracker.track('prompt_submitted', {
  projectId,
  promptLength: prompt.length,
  topic: detectedTopic,
  includesMusic: options.includesMusic,
});
```

**Video Generated:** (Aha Moment)
```typescript
// app/api/generate/callback/route.ts
tracker.track('video_generated', {
  projectId,
  duration: video.duration, // seconds
  processingTime: Date.now() - startTime, // ms
  quality: video.quality, // '720p', '1080p', '4k'
  fileSize: video.fileSize,
});
```

**Video Downloaded:**
```typescript
// components/DownloadButton.tsx
tracker.track('video_downloaded', {
  projectId,
  format: format, // 'mp4', 'mov', 'webm'
  quality: quality,
  fileSize: video.fileSize,
});
```

**Script Edited:**
```typescript
// components/ScriptEditor.tsx
tracker.track('script_edited', {
  projectId,
  changeCount: editCount,
  wordCount: script.split(' ').length,
  timeSpent: Date.now() - editStartTime,
});
```

**Voice Selected:**
```typescript
// components/VoiceSelector.tsx
tracker.track('voice_selected', {
  projectId,
  voiceId: voice.id,
  language: voice.language,
  gender: voice.gender,
  style: voice.style, // 'professional', 'casual', 'energetic'
});
```

---

## Funnel Definition

```typescript
tracking.defineFunnel({
  id: 'canvascast-creation',
  name: 'CanvasCast Video Creation Funnel',
  steps: [
    { name: 'Activated', eventName: 'activation_complete' },
    { name: 'Project Created', eventName: 'project_created' },
    { name: 'Prompt Submitted', eventName: 'prompt_submitted' },
    { name: 'Video Generated', eventName: 'video_generated' },
    { name: 'Downloaded', eventName: 'video_downloaded' },
  ],
  windowDays: 7,
});
```

---

## Success Criteria

- ✅ All 6 core value events tracked
- ✅ Creation funnel complete (project → prompt → generation → download)
- ✅ User identification on login
- ✅ Performance tracking enabled
