# API Documentation

**Base URL:** `http://localhost:4000`
**Version:** 1.0.0
**Last Updated:** 2026-03-01

---

## Table of Contents

1. [Authentication](#authentication)
2. [Core System APIs](#core-system-apis)
3. [ACD (Autonomous Coding Dashboard)](#acd-autonomous-coding-dashboard)
4. [PCT (Programmatic Creative Testing)](#pct-programmatic-creative-testing)
5. [CF (Content Factory)](#cf-content-factory)
6. [GDPR & Privacy](#gdpr--privacy)
7. [Error Handling](#error-handling)
8. [Rate Limiting](#rate-limiting)

---

## Authentication

### Authentication Methods

1. **Session-based** (cookies) - For web dashboards
2. **JWT Tokens** - For API access
3. **API Keys** - For programmatic access

### Get CSRF Token
```http
GET /api/csrf-token
```

**Response**:
```json
{
  "csrfToken": "abc123..."
}
```

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response**:
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "token": "jwt-token-here"
}
```

### Protected Routes

All `/api/*` routes require authentication. Include JWT in headers:

```http
Authorization: Bearer <jwt-token>
```

---

## Core System APIs

### Health Check

#### Basic Health
```http
GET /api/health
```

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2026-03-01T12:00:00Z"
}
```

#### Memory Health
```http
GET /api/health/memory
```

**Response**:
```json
{
  "rss": "150 MB",
  "heapTotal": "80 MB",
  "heapUsed": "60 MB",
  "external": "5 MB",
  "arrayBuffers": "1 MB"
}
```

### System Status
```http
GET /api/status
```

**Response**:
```json
{
  "running": true,
  "activeHarness": null,
  "targets": 16,
  "completedTargets": 9,
  "sessionsToday": 3,
  "uptime": "24h 15m"
}
```

---

## ACD (Autonomous Coding Dashboard)

### Projects

#### List Projects
```http
GET /api/projects
```

**Query Parameters**:
- `orgId` (optional): Filter by organization
- `status` (optional): Filter by status (active, archived, completed)

**Response**:
```json
{
  "projects": [
    {
      "id": "uuid",
      "orgId": "uuid",
      "name": "MediaPoster",
      "description": "Social media management platform",
      "repoUrl": "https://github.com/user/mediaposter",
      "status": "active",
      "created_at": "2026-01-15T10:00:00Z"
    }
  ],
  "total": 16
}
```

#### Create Project
```http
POST /api/projects
Content-Type: application/json

{
  "orgId": "uuid",
  "name": "New Project",
  "description": "Project description",
  "repoUrl": "https://github.com/user/repo",
  "branch": "main",
  "settings": {}
}
```

**Response**:
```json
{
  "id": "uuid",
  "orgId": "uuid",
  "name": "New Project",
  "status": "active",
  "created_at": "2026-03-01T12:00:00Z"
}
```

#### Get Project
```http
GET /api/projects/:id
```

**Response**:
```json
{
  "id": "uuid",
  "name": "MediaPoster",
  "description": "Social media management platform",
  "repoUrl": "https://github.com/user/mediaposter",
  "status": "active",
  "featuresTotal": 538,
  "featuresCompleted": 538,
  "featuresPassed": 486,
  "lastSessionAt": "2026-02-20T15:30:00Z"
}
```

#### Update Project
```http
PATCH /api/projects/:id
Content-Type: application/json

{
  "name": "Updated Name",
  "description": "Updated description",
  "status": "archived"
}
```

### Features

#### List Project Features
```http
GET /api/projects/:id/features
```

**Query Parameters**:
- `status` (optional): pending, in_progress, completed
- `priority` (optional): P0, P1, P2, P3
- `passes` (optional): true, false

**Response**:
```json
{
  "features": [
    {
      "id": "uuid",
      "featureId": "PCT-WC-001",
      "name": "User authentication",
      "description": "Implement JWT authentication",
      "category": "auth",
      "priority": "P0",
      "status": "completed",
      "passes": true,
      "created_at": "2026-01-15T10:00:00Z"
    }
  ],
  "total": 538,
  "completed": 486,
  "pending": 52
}
```

#### Sync Features from JSON
```http
POST /api/projects/:id/features/sync
Content-Type: application/json

{
  "features": [
    {
      "featureId": "PCT-WC-001",
      "name": "Feature name",
      "description": "Feature description",
      "category": "auth",
      "priority": "P0",
      "criteria": ["Login works", "Logout works"]
    }
  ]
}
```

### Work Items

#### List Work Items
```http
GET /api/projects/:id/work-items
```

**Query Parameters**:
- `status` (optional): todo, in_progress, done
- `type` (optional): task, bug, enhancement
- `assigneeId` (optional): Filter by assignee

**Response**:
```json
{
  "workItems": [
    {
      "id": "uuid",
      "title": "Fix login bug",
      "type": "bug",
      "status": "in_progress",
      "priority": "P1",
      "assignee": {
        "id": "uuid",
        "name": "John Doe"
      },
      "created_at": "2026-03-01T10:00:00Z"
    }
  ]
}
```

#### Create Work Item
```http
POST /api/projects/:id/work-items
Content-Type: application/json

{
  "title": "Implement feature X",
  "description": "Detailed description",
  "type": "task",
  "priority": "P1",
  "featureId": "uuid",
  "assigneeId": "uuid"
}
```

#### Update Work Item
```http
PATCH /api/projects/:id/work-items/:wid
Content-Type: application/json

{
  "status": "done",
  "effort": 5
}
```

### Harness Sessions

#### Start Harness Session
```http
POST /api/projects/:id/harness/start
Content-Type: application/json

{
  "continuous": false,
  "maxSessions": 1,
  "config": {
    "model": "claude-sonnet-4-6",
    "maxTurnsPerAgent": 100
  }
}
```

**Response**:
```json
{
  "sessionId": "uuid",
  "status": "running",
  "startedAt": "2026-03-01T12:00:00Z"
}
```

#### Stop Harness Session
```http
POST /api/projects/:id/harness/stop
```

**Response**:
```json
{
  "stopped": true,
  "sessionId": "uuid",
  "duration": "45m 32s"
}
```

#### Get Harness Status
```http
GET /api/projects/:id/harness/status
```

**Response**:
```json
{
  "running": true,
  "sessionId": "uuid",
  "sessionNumber": 5,
  "startedAt": "2026-03-01T12:00:00Z",
  "featuresCompleted": 23,
  "featuresPassed": 18,
  "currentAgent": "coding",
  "progress": {
    "total": 200,
    "completed": 142,
    "percentage": 71
  }
}
```

#### Get Harness Logs
```http
GET /api/projects/:id/harness/logs
```

**Query Parameters**:
- `sessionId` (optional): Filter by session
- `level` (optional): info, warn, error
- `limit` (optional): Number of logs to return

**Response**:
```json
{
  "logs": [
    {
      "id": "uuid",
      "sessionId": "uuid",
      "timestamp": "2026-03-01T12:30:00Z",
      "level": "info",
      "message": "Feature PCT-WC-001 completed successfully",
      "metadata": {}
    }
  ]
}
```

#### Stream Harness Logs (SSE)
```http
GET /api/projects/:id/harness/logs/stream
```

Returns a Server-Sent Events stream of real-time logs.

### Agent Runs

#### Create Agent Run
```http
POST /api/projects/:id/agent-runs
Content-Type: application/json

{
  "agentType": "coding",
  "prompt": "Implement login feature",
  "config": {
    "model": "claude-sonnet-4-6",
    "maxTurns": 50
  }
}
```

#### List Agent Runs
```http
GET /api/projects/:id/agent-runs
```

**Response**:
```json
{
  "runs": [
    {
      "id": "uuid",
      "agentType": "coding",
      "status": "completed",
      "startedAt": "2026-03-01T12:00:00Z",
      "completedAt": "2026-03-01T12:45:00Z",
      "turnCount": 23,
      "tokensUsed": 45000
    }
  ]
}
```

### Database APIs

#### Get Targets
```http
GET /api/db/targets
```

#### Get Targets Summary
```http
GET /api/db/targets/summary
```

#### Sync Targets
```http
POST /api/db/targets/sync
```

#### Get Model Usage
```http
GET /api/db/model-usage
```

**Query Parameters**:
- `startDate` (optional): Filter from date
- `endDate` (optional): Filter to date

#### Get Sessions
```http
GET /api/db/sessions
```

**Query Parameters**:
- `targetId` (optional): Filter by target
- `status` (optional): Filter by status

#### Get Progress Snapshots
```http
GET /api/db/snapshots
```

**Query Parameters**:
- `sessionId`: Required session ID

#### Get Token Usage
```http
GET /api/db/token-usage
```

**Query Parameters**:
- `sessionId` (optional): Filter by session
- `groupBy` (optional): session, agent, day

---

## PCT (Programmatic Creative Testing)

Base path: `/api/pct`

### Brands

#### List Brands
```http
GET /api/pct/brands
```

**Response**:
```json
{
  "brands": [
    {
      "id": "uuid",
      "workspaceId": "uuid",
      "name": "Miracle Bomb",
      "description": "Premium skincare brand",
      "brandVoice": "Friendly, confident",
      "logoUrl": "https://...",
      "brandGuidelines": {
        "colors": {
          "primary": "#6366f1",
          "accent": "#f59e0b"
        },
        "fonts": {
          "heading": "Montserrat",
          "body": "Inter"
        }
      },
      "created_at": "2026-01-01T00:00:00Z"
    }
  ]
}
```

#### Create Brand
```http
POST /api/pct/brands
Content-Type: application/json

{
  "workspaceId": "uuid",
  "name": "Brand Name",
  "description": "Brand description",
  "brandVoice": "Professional, trustworthy",
  "brandValues": "Quality, innovation",
  "toneStyle": "professional",
  "logoUrl": "https://...",
  "brandGuidelines": {
    "colors": {...},
    "fonts": {...}
  }
}
```

#### Get Brand
```http
GET /api/pct/brands/:id
```

#### Update Brand
```http
PUT /api/pct/brands/:id
Content-Type: application/json

{
  "name": "Updated Name",
  "description": "Updated description"
}
```

#### Delete Brand
```http
DELETE /api/pct/brands/:id
```

### Products

#### List Brand Products
```http
GET /api/pct/brands/:brandId/products
```

**Response**:
```json
{
  "products": [
    {
      "id": "uuid",
      "brandId": "uuid",
      "name": "Glow Serum",
      "description": "Vitamin C infused serum",
      "features": ["Vitamin C", "SPF 30", "Lightweight"],
      "benefits": ["Brighter skin", "All-day hydration"],
      "targetAudience": "Women 25-45",
      "pricePoint": "49.99",
      "category": "Skincare",
      "imageUrl": "https://...",
      "created_at": "2026-01-15T00:00:00Z"
    }
  ]
}
```

#### Create Product
```http
POST /api/pct/brands/:brandId/products
Content-Type: application/json

{
  "name": "Product Name",
  "description": "Product description",
  "features": ["Feature 1", "Feature 2"],
  "benefits": ["Benefit 1", "Benefit 2"],
  "targetAudience": "Target demographic",
  "pricePoint": "99.99",
  "category": "Category",
  "imageUrl": "https://..."
}
```

#### Get Product
```http
GET /api/pct/products/:id
```

#### Update Product
```http
PUT /api/pct/products/:id
```

#### Delete Product
```http
DELETE /api/pct/products/:id
```

#### Bulk Import Products
```http
POST /api/pct/brands/:brandId/products/bulk-import
Content-Type: application/json

{
  "format": "csv",
  "data": "name,description,features,benefits,...\nProduct 1,Description 1,..."
}
```

Or:

```json
{
  "format": "json",
  "data": [
    {
      "name": "Product 1",
      "description": "Description 1",
      "features": ["Feature 1"],
      "benefits": ["Benefit 1"]
    }
  ]
}
```

### Voice of Customer (VoC)

#### List Product VoC
```http
GET /api/pct/products/:productId/voc
```

**Response**:
```json
{
  "voc": [
    {
      "id": "uuid",
      "productId": "uuid",
      "source": "review",
      "quote": "This product changed my life!",
      "sentiment": "positive",
      "tags": ["testimonial", "results"],
      "created_at": "2026-02-01T00:00:00Z"
    }
  ]
}
```

#### Add VoC Quote
```http
POST /api/pct/products/:productId/voc
Content-Type: application/json

{
  "source": "review",
  "quote": "Amazing product, highly recommend!",
  "sentiment": "positive",
  "tags": ["testimonial"]
}
```

#### Bulk Add VoC
```http
POST /api/pct/products/:productId/voc/bulk
Content-Type: application/json

{
  "quotes": [
    {
      "source": "review",
      "quote": "Quote 1",
      "sentiment": "positive"
    },
    {
      "source": "forum",
      "quote": "Quote 2",
      "sentiment": "neutral"
    }
  ]
}
```

#### Extract Pain Points (AI)
```http
POST /api/pct/products/:productId/voc/extract-pain-points
Content-Type: application/json

{
  "vocIds": ["uuid1", "uuid2", "uuid3"]
}
```

**Response**:
```json
{
  "painPoints": [
    "Skin feels dry after using other serums",
    "Hard to find effective anti-aging products",
    "Most products are too expensive"
  ]
}
```

#### Extract Benefits (AI)
```http
POST /api/pct/products/:productId/voc/extract-benefits
```

**Response**:
```json
{
  "benefits": [
    "Skin feels smoother within days",
    "Visible reduction in fine lines",
    "Non-greasy formula absorbs quickly"
  ]
}
```

#### Delete VoC
```http
DELETE /api/pct/voc/:id
```

### USPs (Unique Selling Propositions)

#### List Product USPs
```http
GET /api/pct/products/:productId/usps
```

**Response**:
```json
{
  "usps": [
    {
      "id": "uuid",
      "productId": "uuid",
      "uspText": "Impossible to overdo",
      "source": "ai_generated",
      "aiModel": "claude-sonnet-4-6",
      "isPrimary": true,
      "score": 9.2,
      "created_at": "2026-02-15T00:00:00Z"
    }
  ]
}
```

#### Create USP
```http
POST /api/pct/products/:productId/usps
Content-Type: application/json

{
  "uspText": "The only serum you'll ever need",
  "source": "manual",
  "isPrimary": false
}
```

#### Generate USPs with AI
```http
POST /api/pct/products/:productId/usps/generate
Content-Type: application/json

{
  "count": 5,
  "context": {
    "vocIds": ["uuid1", "uuid2"],
    "competitorInfo": "Competitor analysis..."
  }
}
```

**Response**:
```json
{
  "usps": [
    {
      "id": "uuid",
      "uspText": "Clinically proven results in 7 days",
      "source": "ai_generated",
      "score": 8.7
    },
    {
      "id": "uuid",
      "uspText": "Dermatologist-developed formula",
      "source": "ai_generated",
      "score": 8.2
    }
  ],
  "model": "claude-sonnet-4-6",
  "promptUsed": "..."
}
```

#### Update USP
```http
PUT /api/pct/usps/:id
Content-Type: application/json

{
  "uspText": "Updated USP text",
  "isPrimary": true
}
```

#### Delete USP
```http
DELETE /api/pct/usps/:id
```

#### Archive USP
```http
POST /api/pct/usps/:id/archive
```

#### Restore USP
```http
POST /api/pct/usps/:id/restore
```

#### Score USP (AI)
```http
POST /api/pct/usps/:id/score
Content-Type: application/json

{
  "criteria": ["uniqueness", "believability", "desirability", "clarity"]
}
```

**Response**:
```json
{
  "score": 8.5,
  "breakdown": {
    "uniqueness": 9.0,
    "believability": 8.5,
    "desirability": 8.0,
    "clarity": 8.5
  },
  "feedback": "Strong USP with clear differentiation..."
}
```

### Marketing Angles

#### List USP Angles
```http
GET /api/pct/usps/:uspId/angles
```

**Response**:
```json
{
  "angles": [
    {
      "id": "uuid",
      "uspId": "uuid",
      "angleText": "Mistake-proof application",
      "created_at": "2026-02-20T00:00:00Z"
    }
  ]
}
```

#### Create Angle
```http
POST /api/pct/usps/:uspId/angles
Content-Type: application/json

{
  "angleText": "Never worry about uneven application"
}
```

#### Generate Angles with AI
```http
POST /api/pct/usps/:uspId/angles/generate
Content-Type: application/json

{
  "count": 3,
  "targetAudience": "busy professionals",
  "painPoints": ["limited time", "not makeup experts"]
}
```

**Response**:
```json
{
  "angles": [
    {
      "id": "uuid",
      "angleText": "Perfect application in under 2 minutes"
    },
    {
      "id": "uuid",
      "angleText": "Professional results without the skill"
    }
  ]
}
```

#### Update Angle
```http
PUT /api/pct/angles/:id
```

#### Delete Angle
```http
DELETE /api/pct/angles/:id
```

### Hooks

#### Generate Hook Matrix
```http
POST /api/pct/hooks/generate-matrix
Content-Type: application/json

{
  "angleId": "uuid",
  "frameworks": ["punchy", "bold_statements", "question_based"],
  "awarenessLevels": ["solution_aware", "product_aware"],
  "sophisticationLevels": [3, 4],
  "hooksPerCombination": 3
}
```

**Response**:
```json
{
  "hooks": [
    {
      "id": "uuid",
      "hookText": "Beautiful even when applied blind",
      "framework": "punchy",
      "awarenessLevel": "solution_aware",
      "sophisticationLevel": 3,
      "status": "pending_review"
    },
    {
      "id": "uuid",
      "hookText": "What if you could never mess up your makeup?",
      "framework": "question_based",
      "awarenessLevel": "product_aware",
      "sophisticationLevel": 4,
      "status": "pending_review"
    }
  ],
  "totalGenerated": 18,
  "model": "claude-sonnet-4-6"
}
```

#### Generate Hooks
```http
POST /api/pct/hooks/generate
Content-Type: application/json

{
  "angleId": "uuid",
  "framework": "punchy",
  "awarenessLevel": "solution_aware",
  "sophisticationLevel": 3,
  "count": 5
}
```

#### List Hooks
```http
GET /api/pct/hooks
```

**Query Parameters**:
- `status` (optional): pending_review, approved, rejected
- `framework` (optional): Filter by framework
- `awarenessLevel` (optional): Filter by awareness level
- `tag` (optional): Filter by tag
- `search` (optional): Search hook text

**Response**:
```json
{
  "hooks": [
    {
      "id": "uuid",
      "angleId": "uuid",
      "hookText": "Shaky hands, steady glow",
      "framework": "punchy",
      "awarenessLevel": "solution_aware",
      "sophisticationLevel": 3,
      "status": "approved",
      "tags": ["empathy", "benefit"],
      "created_at": "2026-02-22T00:00:00Z",
      "reviewed_at": "2026-02-23T00:00:00Z"
    }
  ],
  "total": 156,
  "approved": 89,
  "pending": 45,
  "rejected": 22
}
```

#### Get Hook Tags
```http
GET /api/pct/hooks/tags
```

**Response**:
```json
{
  "tags": [
    { "tag": "empathy", "count": 45 },
    { "tag": "benefit", "count": 67 },
    { "tag": "urgency", "count": 23 }
  ]
}
```

#### Export Hooks
```http
GET /api/pct/hooks/export
```

**Query Parameters**:
- `format`: csv, json, xlsx
- `status` (optional): Filter status
- `includeMetadata`: true/false

Returns downloadable file.

#### Generate Hook Variations
```http
POST /api/pct/hooks/:id/variations
Content-Type: application/json

{
  "count": 3,
  "style": "shorter" | "longer" | "different_angle"
}
```

**Response**:
```json
{
  "variations": [
    {
      "id": "uuid",
      "hookText": "Steady glow, every time",
      "style": "shorter"
    }
  ]
}
```

#### Bulk Update Hooks
```http
PATCH /api/pct/hooks/bulk/update
Content-Type: application/json

{
  "hookIds": ["uuid1", "uuid2", "uuid3"],
  "update": {
    "status": "approved",
    "tags": ["winner"]
  }
}
```

#### Update Hook
```http
PATCH /api/pct/hooks/:id
Content-Type: application/json

{
  "status": "approved",
  "reviewNotes": "Great hook, approved for testing",
  "tags": ["empathy", "benefit"]
}
```

#### Delete Hook
```http
DELETE /api/pct/hooks/:id
```

### Templates

#### List Templates
```http
GET /api/pct/templates
```

**Response**:
```json
{
  "templates": [
    {
      "id": "uuid",
      "workspaceId": "uuid",
      "name": "Instagram Story",
      "imageUrl": "https://...",
      "textZones": [
        {
          "id": "zone-1",
          "x": 50,
          "y": 100,
          "width": 300,
          "height": 80,
          "fontSize": 32,
          "fontFamily": "Inter",
          "color": "#ffffff",
          "align": "center"
        }
      ],
      "sizes": ["1080x1920"],
      "created_at": "2026-01-10T00:00:00Z"
    }
  ]
}
```

#### Create Template
```http
POST /api/pct/templates
Content-Type: application/json

{
  "workspaceId": "uuid",
  "name": "Template Name",
  "imageUrl": "https://...",
  "textZones": [...],
  "sizes": ["1080x1080", "1080x1350"]
}
```

#### Get Template
```http
GET /api/pct/templates/:id
```

#### Update Template
```http
PUT /api/pct/templates/:id
```

#### Duplicate Template
```http
POST /api/pct/templates/:id/duplicate
Content-Type: application/json

{
  "name": "Template Copy"
}
```

#### Delete Template
```http
DELETE /api/pct/templates/:id
```

### Generated Ads

#### Generate Ads Batch
```http
POST /api/pct/generated-ads/batch
Content-Type: application/json

{
  "hookIds": ["uuid1", "uuid2"],
  "templateIds": ["uuid3", "uuid4"],
  "sizes": ["1080x1080", "1080x1350"]
}
```

**Response**:
```json
{
  "ads": [
    {
      "id": "uuid",
      "hookId": "uuid1",
      "templateId": "uuid3",
      "imageUrl": "https://generated-ad-url...",
      "size": "1080x1080",
      "status": "generated"
    }
  ],
  "totalGenerated": 8
}
```

#### List Generated Ads
```http
GET /api/pct/generated-ads
```

**Query Parameters**:
- `hookId` (optional): Filter by hook
- `templateId` (optional): Filter by template
- `status` (optional): generated, deployed, archived
- `size` (optional): Filter by size

#### Bulk Update Ads
```http
PATCH /api/pct/generated-ads/bulk/update
Content-Type: application/json

{
  "adIds": ["uuid1", "uuid2"],
  "update": {
    "status": "deployed"
  }
}
```

#### Update Ad
```http
PATCH /api/pct/generated-ads/:id
```

#### Delete Ad
```http
DELETE /api/pct/generated-ads/:id
```

### Video Scripts

#### Generate Video Script
```http
POST /api/pct/video-scripts/generate
Content-Type: application/json

{
  "hookId": "uuid",
  "platform": "tiktok",
  "duration": 30,
  "structure": {
    "hook": 3,
    "lid": 5,
    "body": 18,
    "cta": 4
  },
  "style": "energetic"
}
```

**Response**:
```json
{
  "id": "uuid",
  "hookId": "uuid",
  "platform": "tiktok",
  "scriptText": "Full script here...",
  "structure": {
    "hook": {
      "duration": 3,
      "text": "Hook text...",
      "visualCues": ["Close-up of product"]
    },
    "lid": {
      "duration": 5,
      "text": "Lid text...",
      "visualCues": ["Problem demonstration"]
    },
    "body": {
      "duration": 18,
      "text": "Body text...",
      "visualCues": ["Product application", "Results"]
    },
    "cta": {
      "duration": 4,
      "text": "CTA text...",
      "visualCues": ["Product shot", "Link overlay"]
    }
  },
  "duration": 30,
  "status": "draft"
}
```

#### List Video Scripts
```http
GET /api/pct/video-scripts
```

**Query Parameters**:
- `platform` (optional): tiktok, instagram, youtube
- `status` (optional): draft, approved, produced
- `hookId` (optional): Filter by hook

#### Get Video Script
```http
GET /api/pct/video-scripts/:id
```

#### Update Video Script
```http
PATCH /api/pct/video-scripts/:id
Content-Type: application/json

{
  "status": "approved",
  "scriptText": "Updated script..."
}
```

#### Delete Video Script
```http
DELETE /api/pct/video-scripts/:id
```

#### Rewrite Script Section
```http
POST /api/pct/video-scripts/:id/rewrite-section
Content-Type: application/json

{
  "section": "hook",
  "prompt": "Make it more energetic and attention-grabbing"
}
```

**Response**:
```json
{
  "section": "hook",
  "originalText": "Original hook...",
  "rewrittenText": "Rewritten hook...",
  "visualCues": ["Updated cues"]
}
```

### Meta Integration

#### List Meta Accounts
```http
GET /api/pct/meta/accounts
```

**Response**:
```json
{
  "accounts": [
    {
      "id": "uuid",
      "workspaceId": "uuid",
      "name": "Business Ad Account",
      "metaAccountId": "act_123456789",
      "accessToken": "encrypted",
      "status": "active",
      "currency": "USD",
      "timezone": "America/Los_Angeles",
      "created_at": "2026-01-01T00:00:00Z"
    }
  ]
}
```

#### Create Meta Account
```http
POST /api/pct/meta/accounts
Content-Type: application/json

{
  "workspaceId": "uuid",
  "name": "Ad Account Name",
  "metaAccountId": "act_123456789",
  "accessToken": "long-lived-token...",
  "currency": "USD",
  "timezone": "America/Los_Angeles"
}
```

#### Update Meta Account
```http
PUT /api/pct/meta/accounts/:id
```

#### Delete Meta Account
```http
DELETE /api/pct/meta/accounts/:id
```

#### Verify Meta Account
```http
POST /api/pct/meta/accounts/:id/verify
```

**Response**:
```json
{
  "valid": true,
  "accountName": "My Ad Account",
  "balance": "1000.00",
  "currency": "USD"
}
```

#### Sync Meta Campaigns
```http
POST /api/pct/meta/accounts/:id/sync-campaigns
```

**Response**:
```json
{
  "synced": 12,
  "campaigns": [
    {
      "id": "uuid",
      "metaCampaignId": "123456",
      "name": "Q1 2026 Campaign",
      "status": "ACTIVE",
      "objective": "CONVERSIONS"
    }
  ]
}
```

#### List Meta Campaigns
```http
GET /api/pct/meta/accounts/:id/campaigns
```

#### Sync Ad Sets
```http
POST /api/pct/meta/campaigns/:campaignId/sync-adsets
```

#### List Ad Sets
```http
GET /api/pct/meta/campaigns/:campaignId/adsets
```

#### Create Meta Campaign
```http
POST /api/pct/meta/accounts/:id/campaigns
Content-Type: application/json

{
  "name": "New Campaign",
  "objective": "CONVERSIONS",
  "status": "PAUSED",
  "budgetType": "daily",
  "budgetAmount": "50.00"
}
```

#### Create Meta Ad Set
```http
POST /api/pct/meta/campaigns/:campaignId/adsets
Content-Type: application/json

{
  "name": "Ad Set Name",
  "status": "PAUSED",
  "dailyBudget": "25.00",
  "targeting": {
    "geoLocations": {
      "countries": ["US"]
    },
    "ageMin": 25,
    "ageMax": 45,
    "genders": [2]
  },
  "optimizationGoal": "CONVERSIONS"
}
```

#### Deploy Ads to Meta
```http
POST /api/pct/meta/deploy
Content-Type: application/json

{
  "metaAccountId": "uuid",
  "metaAdSetId": "uuid",
  "ads": [
    {
      "generatedAdId": "uuid",
      "name": "Ad 1 - Punchy Hook",
      "message": "Hook text goes here"
    },
    {
      "videoScriptId": "uuid",
      "name": "Ad 2 - Video",
      "message": "Video ad message"
    }
  ],
  "scheduleAt": "2026-03-05T00:00:00Z"
}
```

**Response**:
```json
{
  "deployments": [
    {
      "id": "uuid",
      "adId": "uuid",
      "metaAdId": "ad_123456",
      "status": "pending",
      "deployedAt": null,
      "scheduledFor": "2026-03-05T00:00:00Z"
    }
  ],
  "totalDeployed": 2,
  "rateLimitRemaining": 48
}
```

#### List Deployments
```http
GET /api/pct/meta/deployments
```

**Query Parameters**:
- `metaAccountId` (optional): Filter by account
- `status` (optional): pending, live, paused, archived
- `deployedAfter` (optional): Date filter

#### Get Deployment
```http
GET /api/pct/meta/deployments/:id
```

#### Sync Deployment Status
```http
POST /api/pct/meta/sync-status
Content-Type: application/json

{
  "deploymentIds": ["uuid1", "uuid2", "uuid3"]
}
```

**Response**:
```json
{
  "synced": 3,
  "updates": [
    {
      "deploymentId": "uuid1",
      "previousStatus": "pending",
      "newStatus": "live",
      "metaStatus": "ACTIVE"
    }
  ]
}
```

#### Get Meta Stats
```http
GET /api/pct/meta/stats
```

**Query Parameters**:
- `metaAccountId` (optional): Filter by account
- `startDate`: Required start date
- `endDate`: Required end date

**Response**:
```json
{
  "summary": {
    "impressions": 125000,
    "clicks": 2500,
    "conversions": 45,
    "spend": "450.00",
    "revenue": "2250.00",
    "roas": 5.0,
    "ctr": 2.0,
    "cpc": "0.18",
    "cpa": "10.00"
  },
  "byDeployment": [
    {
      "deploymentId": "uuid",
      "hookText": "Shaky hands, steady glow",
      "impressions": 25000,
      "clicks": 500,
      "conversions": 12,
      "spend": "90.00",
      "roas": 6.2
    }
  ]
}
```

### Activity Log

#### List Activity
```http
GET /api/pct/activity-log
```

**Query Parameters**:
- `workspaceId`: Required workspace ID
- `limit` (optional): Number of records
- `offset` (optional): Pagination offset

**Response**:
```json
{
  "activities": [
    {
      "id": "uuid",
      "workspaceId": "uuid",
      "userId": "uuid",
      "action": "hook_approved",
      "entityType": "hook",
      "entityId": "uuid",
      "metadata": {
        "hookText": "Shaky hands, steady glow"
      },
      "timestamp": "2026-03-01T12:30:00Z"
    }
  ],
  "total": 234
}
```

#### Log Activity
```http
POST /api/pct/activity-log
Content-Type: application/json

{
  "workspaceId": "uuid",
  "userId": "uuid",
  "action": "template_created",
  "entityType": "template",
  "entityId": "uuid",
  "metadata": {
    "templateName": "Instagram Story"
  }
}
```

### Users & Workspaces

#### List Users
```http
GET /api/pct/users
```

#### Create User
```http
POST /api/pct/users
```

#### Update User
```http
PUT /api/pct/users/:id
```

#### Delete User
```http
DELETE /api/pct/users/:id
```

#### List Workspaces
```http
GET /api/pct/workspaces
```

#### Create Workspace
```http
POST /api/pct/workspaces
Content-Type: application/json

{
  "name": "My Workspace",
  "settings": {}
}
```

---

## CF (Content Factory)

Base path: `/api/cf`

### Product Dossiers

#### List Dossiers
```http
GET /api/cf/dossiers
```

#### Create Dossier
```http
POST /api/cf/dossiers
Content-Type: application/json

{
  "productName": "Product Name",
  "description": "Product description",
  "voiceOfCustomer": [...],
  "competitorAnalysis": {...},
  "targetDemographic": {...}
}
```

#### Get Dossier
```http
GET /api/cf/dossiers/:id
```

#### Update Dossier
```http
PUT /api/cf/dossiers/:id
```

#### Delete Dossier
```http
DELETE /api/cf/dossiers/:id
```

### Scripts

#### List Scripts
```http
GET /api/cf/scripts
```

**Query Parameters**:
- `dossierId` (optional): Filter by dossier
- `platform` (optional): youtube, tiktok, instagram

#### Create Script
```http
POST /api/cf/scripts
Content-Type: application/json

{
  "dossierId": "uuid",
  "platform": "youtube",
  "scriptText": "Full script...",
  "hooks": [...],
  "structure": {...},
  "duration": 60
}
```

#### Generate Script (AI)
```http
POST /api/cf/scripts/generate
Content-Type: application/json

{
  "dossierId": "uuid",
  "platform": "youtube",
  "duration": 60,
  "angle": "problem-solution",
  "tone": "educational"
}
```

#### Get Script
```http
GET /api/cf/scripts/:id
```

#### Update Script
```http
PUT /api/cf/scripts/:id
```

#### Delete Script
```http
DELETE /api/cf/scripts/:id
```

### Generated Assets

#### Generate Images
```http
POST /api/cf/images/generate
Content-Type: application/json

{
  "scriptId": "uuid",
  "scenes": [
    {
      "description": "Product hero shot on white background",
      "style": "professional photography"
    }
  ]
}
```

#### Generate Videos
```http
POST /api/cf/videos/generate
Content-Type: application/json

{
  "scriptId": "uuid",
  "provider": "remotion",
  "config": {...}
}
```

#### List Generated Images
```http
GET /api/cf/images
```

#### List Generated Videos
```http
GET /api/cf/videos
```

### Assembled Content

#### List Assembled Content
```http
GET /api/cf/assembled
```

#### Create Assembly
```http
POST /api/cf/assembled
Content-Type: application/json

{
  "scriptId": "uuid",
  "videoId": "uuid",
  "imageIds": ["uuid1", "uuid2"],
  "audioUrl": "https://...",
  "platform": "youtube"
}
```

#### Get Assembly
```http
GET /api/cf/assembled/:id
```

### Published Content

#### List Published Content
```http
GET /api/cf/published
```

**Query Parameters**:
- `platform` (optional): youtube, tiktok, instagram
- `status` (optional): scheduled, published, failed

#### Publish Content
```http
POST /api/cf/publish
Content-Type: application/json

{
  "assembledContentId": "uuid",
  "platform": "youtube",
  "publishAt": "2026-03-05T12:00:00Z",
  "metadata": {
    "title": "Video Title",
    "description": "Video description",
    "tags": ["tag1", "tag2"]
  }
}
```

#### Get Published Content
```http
GET /api/cf/published/:id
```

#### Update Published Content
```http
PUT /api/cf/published/:id
```

### Performance Metrics

#### Get Content Performance
```http
GET /api/cf/metrics
```

**Query Parameters**:
- `publishedContentId`: Required content ID
- `startDate` (optional): Filter from date
- `endDate` (optional): Filter to date

**Response**:
```json
{
  "metrics": [
    {
      "date": "2026-03-01",
      "views": 1500,
      "likes": 89,
      "comments": 23,
      "shares": 12,
      "watchTime": 45000,
      "engagement": 8.3
    }
  ],
  "totals": {
    "views": 15000,
    "likes": 890,
    "comments": 230,
    "shares": 120
  }
}
```

#### Sync Metrics
```http
POST /api/cf/metrics/sync
Content-Type: application/json

{
  "publishedContentIds": ["uuid1", "uuid2"]
}
```

### Angle Testing

#### List Angle Tests
```http
GET /api/cf/angle-tests
```

#### Create Angle Test
```http
POST /api/cf/angle-tests
Content-Type: application/json

{
  "dossierId": "uuid",
  "angleName": "Problem-Solution",
  "description": "Focus on pain point → solution format",
  "scriptIds": ["uuid1", "uuid2", "uuid3"]
}
```

#### Get Angle Test Results
```http
GET /api/cf/angle-tests/:id/results
```

**Response**:
```json
{
  "testId": "uuid",
  "angleName": "Problem-Solution",
  "scripts": [
    {
      "scriptId": "uuid1",
      "publishedContentId": "uuid",
      "views": 5000,
      "engagement": 7.2,
      "conversions": 12
    },
    {
      "scriptId": "uuid2",
      "publishedContentId": "uuid",
      "views": 8000,
      "engagement": 9.5,
      "conversions": 24
    }
  ],
  "winner": {
    "scriptId": "uuid2",
    "reason": "Highest engagement and conversions"
  }
}
```

---

## GDPR & Privacy

Base path: `/api/gdpr`

### Data Export

#### Request Data Export
```http
POST /api/gdpr/export
Content-Type: application/json

{
  "userId": "uuid",
  "format": "json" | "csv"
}
```

**Response**:
```json
{
  "exportId": "uuid",
  "status": "processing",
  "estimatedCompletionAt": "2026-03-01T12:30:00Z"
}
```

#### Get Export Status
```http
GET /api/gdpr/export/:exportId
```

**Response**:
```json
{
  "exportId": "uuid",
  "status": "completed",
  "downloadUrl": "https://...",
  "expiresAt": "2026-03-08T12:00:00Z"
}
```

### Data Deletion

#### Request Data Deletion
```http
POST /api/gdpr/delete
Content-Type: application/json

{
  "userId": "uuid",
  "confirmPassword": "user-password"
}
```

**Response**:
```json
{
  "deletionId": "uuid",
  "scheduledFor": "2026-03-31T00:00:00Z",
  "message": "Your data deletion request has been scheduled. You have 30 days to cancel."
}
```

#### Cancel Deletion
```http
POST /api/gdpr/delete/:deletionId/cancel
```

### Privacy Settings

#### Get Privacy Settings
```http
GET /api/gdpr/settings
```

#### Update Privacy Settings
```http
PUT /api/gdpr/settings
Content-Type: application/json

{
  "userId": "uuid",
  "settings": {
    "dataSharing": false,
    "analytics": true,
    "marketing": false
  }
}
```

---

## Error Handling

### Error Response Format

All errors follow this structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "Additional context"
    },
    "requestId": "uuid"
  }
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily down |

### Example Error Responses

#### Validation Error
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "email": "Invalid email format",
      "password": "Must be at least 8 characters"
    },
    "requestId": "req_123"
  }
}
```

#### Not Found
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Project not found",
    "details": {
      "projectId": "uuid"
    },
    "requestId": "req_124"
  }
}
```

---

## Rate Limiting

### Rate Limits

| Endpoint Category | Limit | Window |
|------------------|-------|--------|
| Authentication | 5 requests | 1 minute |
| Read Operations | 100 requests | 1 minute |
| Write Operations | 30 requests | 1 minute |
| AI Generation | 10 requests | 1 minute |
| Meta API | 200 requests | 1 hour |

### Rate Limit Headers

All responses include rate limit headers:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1709308800
```

### Rate Limit Exceeded Response

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Rate limit exceeded",
    "details": {
      "limit": 100,
      "window": "1 minute",
      "retryAfter": 45
    }
  }
}
```

---

## Pagination

### Query Parameters

- `limit`: Number of results per page (default: 20, max: 100)
- `offset`: Number of results to skip (default: 0)
- `cursor`: Cursor-based pagination (alternative to offset)

### Pagination Response

```json
{
  "data": [...],
  "pagination": {
    "total": 500,
    "limit": 20,
    "offset": 40,
    "hasMore": true,
    "nextCursor": "cursor_abc123"
  }
}
```

---

## Webhooks

### Configure Webhook
```http
POST /api/webhooks
Content-Type: application/json

{
  "url": "https://your-app.com/webhook",
  "events": ["feature.completed", "session.finished", "ad.deployed"],
  "secret": "your-webhook-secret"
}
```

### Webhook Payload

```json
{
  "event": "feature.completed",
  "timestamp": "2026-03-01T12:00:00Z",
  "data": {
    "featureId": "uuid",
    "projectId": "uuid",
    "status": "completed",
    "passes": true
  },
  "signature": "sha256=..."
}
```

### Verifying Webhooks

Verify the signature using HMAC SHA256:

```javascript
const crypto = require('crypto');

const signature = req.headers['x-signature'];
const payload = JSON.stringify(req.body);
const expected = crypto
  .createHmac('sha256', webhookSecret)
  .update(payload)
  .digest('hex');

if (signature !== `sha256=${expected}`) {
  throw new Error('Invalid signature');
}
```

---

## SDK Examples

### Node.js

```javascript
const axios = require('axios');

const client = axios.create({
  baseURL: 'http://localhost:4000/api',
  headers: {
    'Authorization': 'Bearer your-jwt-token',
    'Content-Type': 'application/json'
  }
});

// List projects
const projects = await client.get('/projects');

// Generate hooks
const hooks = await client.post('/pct/hooks/generate', {
  angleId: 'uuid',
  framework: 'punchy',
  count: 5
});
```

### Python

```python
import requests

class ACDClient:
    def __init__(self, base_url, token):
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }

    def list_projects(self):
        response = requests.get(
            f'{self.base_url}/projects',
            headers=self.headers
        )
        return response.json()

    def generate_hooks(self, angle_id, framework, count=5):
        response = requests.post(
            f'{self.base_url}/pct/hooks/generate',
            headers=self.headers,
            json={
                'angleId': angle_id,
                'framework': framework,
                'count': count
            }
        )
        return response.json()

client = ACDClient('http://localhost:4000/api', 'your-jwt-token')
projects = client.list_projects()
```

---

## Additional Resources

- [Database Schema](DATABASE_SCHEMA.md)
- [Deployment Guide](CONTENT_FACTORY_DEPLOYMENT.md)
- [Testing Strategy](CONTENT_FACTORY_TESTING.md)
- [Security Best Practices](ENVIRONMENT_SECURITY.md)

---

**Last Updated:** 2026-03-01
**API Version:** 1.0.0
**Support:** [GitHub Issues](https://github.com/IsaiahDupree/autonomous-coding-dashboard/issues)
