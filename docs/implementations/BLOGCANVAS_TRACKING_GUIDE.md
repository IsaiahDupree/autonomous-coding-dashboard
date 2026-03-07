# BlogCanvas - Event Tracking Implementation Guide

**Priority:** P3
**Status:** Ready for Implementation
**Target App:** `/Users/isaiahdupree/Documents/Software/BlogCanvas`

---

## Overview

BlogCanvas is an AI blog writing and client management platform. Tracking focuses on blog generation, client approvals, and publishing.

---

## Core Value Events

| Event | Trigger | Properties | North Star |
|-------|---------|------------|-----------|
| `blog_created` | New blog post created | `blogId`, `clientId`, `topic`, `wordTarget` | |
| `blog_generated` | AI generated content | `blogId`, `wordCount`, `topic`, `generationTime` | ✅ First Value |
| `blog_approved` | Client approves | `blogId`, `approvalTime`, `revisionCount` | ✅ Aha Moment |
| `blog_published` | Published to platform | `blogId`, `platform`, `publishedUrl` | |
| `client_added` | New client added | `clientId`, `industry`, `plan` | |
| `brief_submitted` | Content brief submitted | `briefId`, `topicsCount`, `clientId` | |

---

## Quick Implementation

### 1. Install SDK

```bash
cd /Users/isaiahdupree/Documents/Software/BlogCanvas
mkdir -p src/lib/tracking
cp /Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness/shared/userEventTracker.ts src/lib/tracking/
```

### 2. Initialize

```typescript
// app/layout.tsx
import { tracker } from '@/lib/tracking/userEventTracker';

if (typeof window !== 'undefined') {
  tracker.init({
    projectId: 'blogcanvas',
    apiEndpoint: process.env.NEXT_PUBLIC_TRACKING_API || 'http://localhost:3001/api/tracking/events',
    debug: process.env.NODE_ENV === 'development',
  });
}
```

### 3. Key Tracking Points

**Blog Created:**
```typescript
// app/blogs/create/action.ts
tracker.track('blog_created', {
  blogId: blog.id,
  clientId: blog.clientId,
  topic: blog.topic,
  wordTarget: blog.targetWordCount,
  keywords: blog.keywords,
});
```

**Blog Generated:** (First Value)
```typescript
// app/api/generate/blog/route.ts
tracker.track('blog_generated', {
  blogId: blog.id,
  wordCount: generatedContent.wordCount,
  topic: blog.topic,
  generationTime: Date.now() - startTime, // ms
  model: 'gpt-4', // or other AI model
  tone: blog.tone, // 'professional', 'casual', 'technical'
});
```

**Blog Approved:** (Aha Moment)
```typescript
// app/api/blogs/[id]/approve/route.ts
tracker.track('blog_approved', {
  blogId: blog.id,
  approvalTime: Date.now() - blog.sentForApprovalAt, // ms
  revisionCount: blog.revisions.length,
  approvedBy: client.id,
  wordCount: blog.finalWordCount,
});
```

**Blog Published:**
```typescript
// app/api/publish/route.ts
tracker.track('blog_published', {
  blogId: blog.id,
  platform: platform, // 'wordpress', 'medium', 'substack', 'custom'
  publishedUrl: publishedUrl,
  scheduledPublish: blog.isScheduled,
});
```

**Client Added:**
```typescript
// app/clients/create/action.ts
tracker.track('client_added', {
  clientId: client.id,
  industry: client.industry,
  plan: client.plan, // 'starter', 'growth', 'agency'
  postsPerMonth: client.postsPerMonth,
});
```

**Brief Submitted:**
```typescript
// app/briefs/submit/action.ts
tracker.track('brief_submitted', {
  briefId: brief.id,
  topicsCount: brief.topics.length,
  clientId: brief.clientId,
  urgency: brief.urgency, // 'standard', 'rush'
});
```

---

## Funnel Definition

```typescript
tracking.defineFunnel({
  id: 'blogcanvas-content',
  name: 'BlogCanvas Content Creation Funnel',
  steps: [
    { name: 'Activated', eventName: 'activation_complete' },
    { name: 'Client Added', eventName: 'client_added' },
    { name: 'Brief Submitted', eventName: 'brief_submitted' },
    { name: 'Blog Generated', eventName: 'blog_generated' },
    { name: 'Blog Approved', eventName: 'blog_approved' },
    { name: 'Published', eventName: 'blog_published' },
  ],
  windowDays: 14,
});
```

---

## Success Criteria

- ✅ All 6 core value events tracked
- ✅ Content workflow tracked (brief → generation → approval → publish)
- ✅ Client management events tracked
- ✅ User identification on login
