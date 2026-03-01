# Content Factory API Documentation

## Base URL

```
Development: http://localhost:3000/api/cf
Production: https://api.yourapp.com/api/cf
```

## Authentication

All API endpoints require authentication using Bearer tokens:

```http
Authorization: Bearer YOUR_ACCESS_TOKEN
```

---

## Product Dossiers

### List Dossiers

```http
GET /api/cf/dossiers
```

List all product dossiers with pagination and optional filtering.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `limit` | integer | 20 | Items per page (max 100) |
| `status` | string | - | Filter by status: `draft`, `active`, `archived` |
| `category` | string | - | Filter by category |

**Response: 200 OK**

```json
{
  "dossiers": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "slug": "acne-patch",
      "name": "Acne Patch",
      "benefits": ["Clear skin overnight", "Invisible wear"],
      "painPoints": ["Embarrassing breakouts", "Slow healing"],
      "proofTypes": ["before_after"],
      "targetAudience": "Women 18-35 with acne",
      "category": "Beauty",
      "niche": "Skincare",
      "price": 12.99,
      "tiktokShopUrl": "https://shop.tiktok.com/...",
      "affiliateLink": "https://amzn.to/...",
      "status": "active",
      "createdAt": "2026-02-15T10:00:00Z",
      "updatedAt": "2026-02-20T14:30:00Z",
      "_counts": {
        "images": 12,
        "videos": 4,
        "scripts": 5,
        "assembledContent": 8
      }
    }
  ],
  "pagination": {
    "total": 45,
    "page": 1,
    "limit": 20,
    "pages": 3
  }
}
```

---

### Create Dossier

```http
POST /api/cf/dossiers
```

Create a new product dossier.

**Request Body:**

```json
{
  "name": "Acne Patch",
  "benefits": ["Clear skin overnight", "Invisible wear"],
  "painPoints": ["Embarrassing breakouts", "Slow healing"],
  "proofTypes": ["before_after", "testimonial"],
  "targetAudience": "Women 18-35 with acne",
  "category": "Beauty",
  "niche": "Skincare",
  "price": 12.99,
  "tiktokShopUrl": "https://shop.tiktok.com/view/product/...",
  "affiliateLink": "https://amzn.to/3abc123"
}
```

**Response: 201 Created**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "slug": "acne-patch",
  "name": "Acne Patch",
  "status": "draft",
  "createdAt": "2026-02-15T10:00:00Z"
}
```

**Validation Errors: 400 Bad Request**

```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "name",
      "message": "Name is required"
    },
    {
      "field": "benefits",
      "message": "At least one benefit is required"
    }
  ]
}
```

---

### Get Dossier

```http
GET /api/cf/dossiers/:id
```

Retrieve a single dossier with asset counts.

**Response: 200 OK**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "slug": "acne-patch",
  "name": "Acne Patch",
  "benefits": ["Clear skin overnight"],
  "painPoints": ["Embarrassing breakouts"],
  "proofTypes": ["before_after"],
  "category": "Beauty",
  "status": "active",
  "createdAt": "2026-02-15T10:00:00Z",
  "_counts": {
    "images": 12,
    "videos": 4,
    "scripts": 5,
    "assembledContent": 8
  }
}
```

**Response: 404 Not Found**

```json
{
  "error": "Dossier not found"
}
```

---

### Update Dossier

```http
PATCH /api/cf/dossiers/:id
```

Update specific fields of a dossier.

**Request Body:**

```json
{
  "status": "active",
  "price": 14.99,
  "tiktokShopUrl": "https://shop.tiktok.com/new-url"
}
```

**Response: 200 OK**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "slug": "acne-patch",
  "name": "Acne Patch",
  "status": "active",
  "price": 14.99,
  "updatedAt": "2026-02-20T15:00:00Z"
}
```

---

### Delete Dossier

```http
DELETE /api/cf/dossiers/:id
```

Archive a dossier (soft delete - sets status to `archived`).

**Response: 200 OK**

```json
{
  "message": "Dossier archived successfully",
  "id": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

## Image Generation

### Generate Before Images

```http
POST /api/cf/dossiers/:id/generate-before-images
```

Generate "before" images via Remotion → Nano Banana based on pain points.

**Request Body:**

```json
{
  "variants": 3,
  "style": "realistic",
  "customPrompts": [
    "Close-up of acne breakout on chin"
  ]
}
```

**Response: 202 Accepted**

```json
{
  "message": "Image generation started",
  "jobs": [
    {
      "imageId": "650e8400-e29b-41d4-a716-446655440001",
      "remotionJobId": "job_abc123",
      "status": "pending",
      "type": "before",
      "prompt": "Close-up photo of woman's face with visible acne breakout on chin, natural lighting"
    }
  ]
}
```

---

### Generate After Images

```http
POST /api/cf/dossiers/:id/generate-after-images
```

Generate "after" images via Remotion → Nano Banana based on benefits.

**Request Body:**

```json
{
  "variants": 3,
  "style": "realistic"
}
```

**Response: 202 Accepted**

```json
{
  "message": "Image generation started",
  "jobs": [
    {
      "imageId": "650e8400-e29b-41d4-a716-446655440002",
      "remotionJobId": "job_def456",
      "status": "pending",
      "type": "after",
      "prompt": "Close-up photo of woman's face with clear, smooth skin, natural lighting"
    }
  ]
}
```

---

### Get Image Status

```http
GET /api/cf/images/:imageId
```

Check status of image generation job.

**Response: 200 OK**

```json
{
  "id": "650e8400-e29b-41d4-a716-446655440001",
  "dossierId": "550e8400-e29b-41d4-a716-446655440000",
  "type": "before",
  "status": "completed",
  "imageUrl": "https://cdn.remotion.dev/renders/abc123.png",
  "prompt": "Close-up photo of woman's face with visible acne...",
  "model": "nano-banana",
  "metadata": {
    "width": 1080,
    "height": 1920,
    "format": "png"
  },
  "createdAt": "2026-02-20T10:00:00Z"
}
```

**Status Values:**
- `pending`: Job queued
- `generating`: In progress
- `completed`: Ready to use
- `failed`: Generation failed

---

## Video Generation

### Generate Reveal Video

```http
POST /api/cf/dossiers/:id/generate-reveal-video
```

Generate a before→after reveal video via Remotion → Veo 3.1.

**Request Body:**

```json
{
  "beforeImageId": "650e8400-e29b-41d4-a716-446655440001",
  "afterImageId": "650e8400-e29b-41d4-a716-446655440002",
  "transition": "whip-pan",
  "duration": 8,
  "aspectRatio": "9:16"
}
```

**Transition Options:**
- `whip-pan`: Fast swipe reveal
- `split-screen`: Side-by-side comparison
- `wipe`: Vertical or horizontal wipe
- `zoom`: Zoom-in reveal

**Response: 202 Accepted**

```json
{
  "message": "Video generation started",
  "videoId": "750e8400-e29b-41d4-a716-446655440003",
  "remotionJobId": "job_ghi789",
  "status": "pending",
  "estimatedTime": 120
}
```

---

### Get Video Status

```http
GET /api/cf/videos/:videoId
```

Check status of video generation job.

**Response: 200 OK**

```json
{
  "id": "750e8400-e29b-41d4-a716-446655440003",
  "dossierId": "550e8400-e29b-41d4-a716-446655440000",
  "type": "reveal",
  "status": "completed",
  "videoUrl": "https://cdn.remotion.dev/renders/video123.mp4",
  "duration": 8,
  "aspectRatio": "9:16",
  "metadata": {
    "width": 1080,
    "height": 1920,
    "fps": 30,
    "codec": "h264"
  },
  "createdAt": "2026-02-20T11:00:00Z"
}
```

---

## Script Generation

### Generate Script

```http
POST /api/cf/dossiers/:id/generate-script
```

Generate a single script at specified awareness level (Eugene Schwartz framework).

**Request Body:**

```json
{
  "awarenessLevel": 1,
  "marketSophistication": 3,
  "targetPlatform": "tiktok"
}
```

**Awareness Levels:**
1. **Unaware**: POV/meme, no product mention
2. **Problem Aware**: Call out pain, hint at solution
3. **Solution Aware**: Compare options, testimonial style
4. **Product Aware**: Review with pros/cons
5. **Most Aware**: Urgency, direct CTA

**Market Sophistication:**
1. **New market**: Direct claim ("This removes acne")
2. **Improvement**: Better version ("Faster acne removal")
3. **Mechanism**: How it works ("Hydrocolloid technology")
4. **Enhanced mechanism**: New twist on mechanism
5. **Experience**: Identity/lifestyle focus

**Response: 201 Created**

```json
{
  "id": "850e8400-e29b-41d4-a716-446655440004",
  "dossierId": "550e8400-e29b-41d4-a716-446655440000",
  "awarenessLevel": 1,
  "marketSophistication": 3,
  "hook": "POV: You wake up and your skin is perfect",
  "body": "No really, this happened to me. I put these on before bed and when I woke up, the redness was GONE. I wish I knew about these in high school.",
  "cta": "Now I never leave the house without them",
  "fullScript": "POV: You wake up and your skin is perfect\n\nNo really, this happened to me...",
  "estimatedDuration": 15,
  "createdAt": "2026-02-20T12:00:00Z"
}
```

---

### Generate All Scripts

```http
POST /api/cf/dossiers/:id/generate-all-scripts
```

Generate scripts for all 5 awareness levels.

**Request Body:**

```json
{
  "marketSophistication": 3,
  "targetPlatform": "tiktok"
}
```

**Response: 201 Created**

```json
{
  "message": "Generated 5 scripts",
  "scripts": [
    {
      "id": "850e8400-e29b-41d4-a716-446655440004",
      "awarenessLevel": 1,
      "hook": "POV: You wake up and your skin is perfect",
      "estimatedDuration": 15
    },
    {
      "id": "850e8400-e29b-41d4-a716-446655440005",
      "awarenessLevel": 2,
      "hook": "Struggling with breakouts? Here's what finally worked...",
      "estimatedDuration": 18
    }
  ]
}
```

---

## Content Assembly

### Assemble Content

```http
POST /api/cf/assemble
```

Assemble final content from scripts, videos, and images via Remotion templates.

**Request Body:**

```json
{
  "dossierId": "550e8400-e29b-41d4-a716-446655440000",
  "scriptId": "850e8400-e29b-41d4-a716-446655440004",
  "videoIds": ["750e8400-e29b-41d4-a716-446655440003"],
  "imageIds": [],
  "platform": "tiktok",
  "captionStyle": "auto",
  "includeHashtags": true
}
```

**Platform Options:**
- `tiktok`: 9:16, max 60s, captions required
- `instagram`: 9:16 or 4:5, max 90s
- `facebook`: 16:9 or 1:1

**Response: 202 Accepted**

```json
{
  "message": "Content assembly started",
  "assembledId": "950e8400-e29b-41d4-a716-446655440005",
  "remotionRenderId": "render_xyz123",
  "status": "rendering",
  "estimatedTime": 180
}
```

---

### Get Assembled Content

```http
GET /api/cf/assembled/:id
```

Get assembled content status and details.

**Response: 200 OK**

```json
{
  "id": "950e8400-e29b-41d4-a716-446655440005",
  "dossierId": "550e8400-e29b-41d4-a716-446655440000",
  "scriptId": "850e8400-e29b-41d4-a716-446655440004",
  "videoIds": ["750e8400-e29b-41d4-a716-446655440003"],
  "platform": "tiktok",
  "caption": "POV: You wake up and your skin is perfect ✨ #acne #skincare #beforeandafter",
  "hashtags": ["acne", "skincare", "beforeandafter", "clearskin"],
  "complianceDisclosure": "Affiliate link in bio. Results may vary.",
  "finalVideoUrl": "https://cdn.remotion.dev/final/abc123.mp4",
  "status": "ready",
  "metadata": {
    "duration": 15,
    "width": 1080,
    "height": 1920,
    "fileSize": 4521000
  },
  "createdAt": "2026-02-20T13:00:00Z"
}
```

**Status Values:**
- `draft`: Not yet rendered
- `rendering`: Remotion rendering in progress
- `ready`: Ready to publish
- `published`: Already published to platform

---

## Publishing

### Publish to Platform

```http
POST /api/cf/publish/:assembledId
```

Publish assembled content to TikTok or Instagram.

**Request Body:**

```json
{
  "platform": "tiktok",
  "promotionBudget": 5.00,
  "scheduledTime": null
}
```

**Response: 201 Created**

```json
{
  "message": "Content published successfully",
  "publishedId": "a50e8400-e29b-41d4-a716-446655440006",
  "platform": "tiktok",
  "platformPostId": "7234567890123456789",
  "platformUrl": "https://www.tiktok.com/@username/video/7234567890123456789",
  "promotionStatus": "pending",
  "publishedAt": "2026-02-20T14:00:00Z"
}
```

**Promotion Budget:**
- Minimum: $5.00 (micro-test)
- Maximum: $500.00
- Platform: TikTok Promote only

---

### Start Promotion

```http
POST /api/cf/published/:id/promote
```

Start TikTok Promote campaign for published content.

**Request Body:**

```json
{
  "budget": 5.00,
  "duration": 3,
  "objective": "reach"
}
```

**Objectives:**
- `reach`: Maximum views
- `traffic`: Link clicks
- `engagement`: Likes, comments, shares

**Response: 200 OK**

```json
{
  "message": "Promotion started",
  "promotionStatus": "active",
  "promotionStartedAt": "2026-02-20T14:30:00Z",
  "promotionEndedAt": "2026-02-23T14:30:00Z"
}
```

---

## Metrics & Performance

### Get Metrics

```http
GET /api/cf/metrics/:publishedId
```

Get performance metrics for published content.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `startDate` | string | - | Start date (ISO 8601) |
| `endDate` | string | - | End date (ISO 8601) |
| `granularity` | string | `daily` | `daily`, `hourly`, `total` |

**Response: 200 OK**

```json
{
  "publishedId": "a50e8400-e29b-41d4-a716-446655440006",
  "platform": "tiktok",
  "metrics": [
    {
      "date": "2026-02-20",
      "views": 12543,
      "likes": 1032,
      "comments": 87,
      "shares": 234,
      "saves": 156,
      "clicks": 432,
      "conversions": 12,
      "spend": 1.67,
      "engagementRate": 0.1234,
      "ctr": 0.0344
    }
  ],
  "totals": {
    "views": 45231,
    "likes": 3821,
    "comments": 342,
    "shares": 876,
    "saves": 543,
    "clicks": 1543,
    "conversions": 45,
    "spend": 5.00,
    "engagementRate": 0.1245,
    "ctr": 0.0341
  }
}
```

---

### Sync Metrics

```http
POST /api/cf/metrics/:publishedId/sync
```

Manually trigger metrics sync from platform API.

**Response: 200 OK**

```json
{
  "message": "Metrics synced successfully",
  "lastSyncedAt": "2026-02-20T15:00:00Z",
  "recordsUpdated": 3
}
```

---

## Scoring & Winners

### Calculate Score

```http
POST /api/cf/published/:id/score
```

Calculate performance score using configured weights.

**Request Body:**

```json
{
  "scoringConfigId": "b50e8400-e29b-41d4-a716-446655440007"
}
```

**Response: 200 OK**

```json
{
  "publishedId": "a50e8400-e29b-41d4-a716-446655440006",
  "score": 0.842,
  "breakdown": {
    "engagement": {
      "value": 0.1245,
      "weight": 0.4,
      "contribution": 0.334
    },
    "ctr": {
      "value": 0.0341,
      "weight": 0.3,
      "contribution": 0.256
    },
    "conversions": {
      "value": 45,
      "weight": 0.3,
      "contribution": 0.252
    }
  },
  "rank": 1,
  "totalContenders": 15
}
```

---

### Find Winners

```http
GET /api/cf/winners
```

Identify winning content based on scoring algorithm.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `dossierId` | UUID | - | Filter by dossier |
| `minViews` | integer | 1000 | Minimum views threshold |
| `limit` | integer | 10 | Max winners to return |

**Response: 200 OK**

```json
{
  "winners": [
    {
      "publishedId": "a50e8400-e29b-41d4-a716-446655440006",
      "score": 0.842,
      "platformUrl": "https://www.tiktok.com/@username/video/...",
      "awarenessLevel": 1,
      "views": 45231,
      "engagementRate": 0.1245,
      "ctr": 0.0341
    }
  ]
}
```

---

### Generate More Like Winner

```http
POST /api/cf/published/:winnerId/generate-similar
```

Generate new content based on winning patterns.

**Request Body:**

```json
{
  "variants": 3,
  "awarenessLevels": [1, 2]
}
```

**Response: 202 Accepted**

```json
{
  "message": "Generating 3 variants based on winner",
  "newDossierId": "c50e8400-e29b-41d4-a716-446655440008",
  "jobs": [
    {
      "scriptId": "d50e8400-e29b-41d4-a716-446655440009",
      "awarenessLevel": 1
    }
  ]
}
```

---

## Testing & Iteration

### Run A/B Test

```http
POST /api/cf/ab-test
```

Set up A/B test between multiple assembled content pieces.

**Request Body:**

```json
{
  "name": "Hook Test: POV vs Problem",
  "variants": [
    {
      "assembledId": "950e8400-e29b-41d4-a716-446655440005",
      "label": "POV Hook"
    },
    {
      "assembledId": "950e8400-e29b-41d4-a716-446655440010",
      "label": "Problem Hook"
    }
  ],
  "budget": 10.00,
  "duration": 3
}
```

**Response: 201 Created**

```json
{
  "testId": "e50e8400-e29b-41d4-a716-446655440011",
  "name": "Hook Test: POV vs Problem",
  "status": "running",
  "variants": [
    {
      "assembledId": "950e8400-e29b-41d4-a716-446655440005",
      "publishedId": "f50e8400-e29b-41d4-a716-446655440012",
      "budget": 5.00
    },
    {
      "assembledId": "950e8400-e29b-41d4-a716-446655440010",
      "publishedId": "f50e8400-e29b-41d4-a716-446655440013",
      "budget": 5.00
    }
  ],
  "createdAt": "2026-02-20T16:00:00Z"
}
```

---

### Get Test Results

```http
GET /api/cf/ab-test/:testId
```

Get A/B test results with statistical significance.

**Response: 200 OK**

```json
{
  "testId": "e50e8400-e29b-41d4-a716-446655440011",
  "name": "Hook Test: POV vs Problem",
  "status": "completed",
  "results": [
    {
      "label": "POV Hook",
      "publishedId": "f50e8400-e29b-41d4-a716-446655440012",
      "views": 15234,
      "engagementRate": 0.1456,
      "ctr": 0.0423,
      "score": 0.876
    },
    {
      "label": "Problem Hook",
      "publishedId": "f50e8400-e29b-41d4-a716-446655440013",
      "views": 13421,
      "engagementRate": 0.1123,
      "ctr": 0.0321,
      "score": 0.743
    }
  ],
  "winner": {
    "label": "POV Hook",
    "confidence": 0.95,
    "improvement": "+17.9%"
  },
  "statisticalSignificance": true
}
```

---

## Advanced Features

### Import TikTok Shop Products

```http
POST /api/cf/import/tiktok-shop
```

Import products from TikTok Shop as dossiers.

**Request Body:**

```json
{
  "shopUrl": "https://shop.tiktok.com/@yourshop",
  "autoGenerate": true
}
```

**Response: 202 Accepted**

```json
{
  "message": "Import started",
  "jobId": "import_abc123",
  "estimatedProducts": 45
}
```

---

### Sync Shopify Products

```http
POST /api/cf/sync/shopify
```

Sync products from Shopify store.

**Request Body:**

```json
{
  "shopDomain": "yourstore.myshopify.com",
  "apiKey": "shpat_...",
  "collections": ["featured"]
}
```

---

### Check Platform Policy

```http
POST /api/cf/check-policy
```

Check if content complies with platform policies.

**Request Body:**

```json
{
  "assembledId": "950e8400-e29b-41d4-a716-446655440005",
  "platform": "tiktok"
}
```

**Response: 200 OK**

```json
{
  "compliant": true,
  "flags": [],
  "recommendations": [
    "Add 'Results may vary' disclaimer for before/after content"
  ]
}
```

**Non-Compliant Example:**

```json
{
  "compliant": false,
  "flags": [
    {
      "severity": "error",
      "rule": "misleading-claims",
      "message": "Cannot claim '100% cure rate' without FDA approval"
    }
  ],
  "recommendations": [
    "Use softer language like 'may help reduce' instead of 'cures'"
  ]
}
```

---

## Webhooks

### Configure Webhook

```http
POST /api/cf/webhooks
```

Register webhook for event notifications.

**Request Body:**

```json
{
  "url": "https://yourapp.com/webhooks/content-factory",
  "events": ["content.published", "metrics.updated", "test.completed"],
  "secret": "whsec_..."
}
```

**Webhook Events:**
- `content.published`: Content published to platform
- `metrics.updated`: Metrics synced from platform
- `test.completed`: A/B test finished
- `winner.identified`: New winner detected
- `generation.completed`: Image/video generation done
- `generation.failed`: Generation job failed

**Webhook Payload Example:**

```json
{
  "event": "content.published",
  "timestamp": "2026-02-20T14:00:00Z",
  "data": {
    "publishedId": "a50e8400-e29b-41d4-a716-446655440006",
    "platform": "tiktok",
    "platformUrl": "https://www.tiktok.com/@username/video/7234567890123456789"
  }
}
```

---

## Error Handling

### Error Response Format

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional context"
  }
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `UNAUTHORIZED` | 401 | Missing or invalid auth token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource already exists |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `REMOTION_API_ERROR` | 502 | Remotion API unavailable |
| `TIKTOK_API_ERROR` | 502 | TikTok API error |
| `GENERATION_FAILED` | 500 | AI generation failed |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /generate-*` | 50 | 1 hour |
| `POST /publish` | 100 | 1 day |
| `GET /metrics` | 300 | 1 hour |
| All other endpoints | 1000 | 1 hour |

**Rate Limit Headers:**

```http
X-RateLimit-Limit: 50
X-RateLimit-Remaining: 23
X-RateLimit-Reset: 1708444800
```

---

## Pagination

All list endpoints support pagination:

**Request:**
```http
GET /api/cf/dossiers?page=2&limit=20
```

**Response Headers:**
```http
X-Total-Count: 145
X-Page: 2
X-Per-Page: 20
X-Total-Pages: 8
```

**Link Header:**
```http
Link: </api/cf/dossiers?page=1&limit=20>; rel="first",
      </api/cf/dossiers?page=1&limit=20>; rel="prev",
      </api/cf/dossiers?page=3&limit=20>; rel="next",
      </api/cf/dossiers?page=8&limit=20>; rel="last"
```

---

## OpenAPI/Swagger

Full OpenAPI 3.0 specification available at:

```
GET /api/cf/openapi.json
```

Interactive API documentation:

```
GET /api/cf/docs
```

---

## SDKs

### JavaScript/TypeScript

```bash
npm install @yourapp/content-factory-sdk
```

```typescript
import { ContentFactoryClient } from '@yourapp/content-factory-sdk';

const client = new ContentFactoryClient({
  apiKey: process.env.CF_API_KEY,
  baseUrl: 'https://api.yourapp.com/api/cf'
});

// Create dossier
const dossier = await client.dossiers.create({
  name: 'Acne Patch',
  benefits: ['Clear skin overnight']
});

// Generate images
const images = await client.images.generateBefore(dossier.id, {
  variants: 3
});

// Publish content
const published = await client.publish(assembledId, {
  platform: 'tiktok',
  promotionBudget: 5.00
});
```

---

## Support

- **API Status**: https://status.yourapp.com
- **Issues**: https://github.com/yourorg/content-factory/issues
- **Email**: api-support@yourapp.com
