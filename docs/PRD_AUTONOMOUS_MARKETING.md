# PRD: Autonomous Marketing Dashboard (AMD)

> **Version:** 1.0  
> **Date:** February 2026  
> **Status:** Draft  

## Executive Summary

The Autonomous Marketing Dashboard (AMD) is an AI-powered marketing automation system that mirrors the architecture of the Autonomous Coding Dashboard (ACD). It autonomously generates content, manages campaigns, and optimizes marketing efforts for deployed SaaS products using Claude AI.

---

## Problem Statement

After deploying SaaS applications, founders face:
- **Time constraints** - Marketing requires consistent effort
- **Content fatigue** - Creating fresh content daily is exhausting
- **Multi-platform complexity** - Managing Twitter, LinkedIn, email, ads simultaneously
- **Optimization paralysis** - Not knowing what works without extensive testing

## Solution

An autonomous system that:
1. **Generates** marketing content (posts, emails, ads, blogs)
2. **Schedules** content across platforms
3. **Monitors** performance metrics
4. **Optimizes** based on analytics feedback
5. **Reports** on ROI and engagement

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         AMD ARCHITECTURE                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐  │
│  │   Dashboard  │◄──►│   Backend    │◄──►│     PostgreSQL       │  │
│  │   (React)    │    │   (Express)  │    │     Database         │  │
│  └──────────────┘    └──────────────┘    └──────────────────────┘  │
│                              │                                      │
│                              ▼                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                   MARKETING HARNESS                           │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │  │
│  │  │ Campaign    │  │  Content    │  │    Analytics        │   │  │
│  │  │ Queue       │──│  Generator  │──│    Tracker          │   │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                              │                                      │
│                              ▼                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                  PLATFORM INTEGRATIONS                        │  │
│  │   Twitter │ LinkedIn │ Email │ Meta Ads │ Google Ads │ Blog  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Marketing Queue (`marketing-queue.json`)

```json
{
  "version": "1.0",
  "defaults": {
    "timezone": "America/New_York",
    "contentTone": "professional-friendly",
    "hashtagStrategy": "relevant-trending"
  },
  "targets": [
    {
      "id": "mediaposter",
      "name": "MediaPoster",
      "deployedUrl": "https://mediaposter.app",
      "description": "Social media management platform for creators",
      "targetAudience": "Content creators, social media managers, small businesses",
      "uniqueValue": "AI-powered scheduling and analytics",
      "competitors": ["Buffer", "Hootsuite", "Later"],
      "priority": 1,
      "enabled": true,
      "campaigns": {
        "launch": { "status": "active", "startDate": "2026-02-15" },
        "content": { "frequency": "daily", "channels": ["twitter", "linkedin"] },
        "email": { "sequences": ["onboarding", "engagement", "conversion"] },
        "ads": { "platforms": ["meta"], "dailyBudget": 25 }
      },
      "contentCalendar": {
        "monday": ["tip", "feature-highlight"],
        "tuesday": ["user-story", "behind-scenes"],
        "wednesday": ["industry-news", "engagement"],
        "thursday": ["tutorial", "tip"],
        "friday": ["weekly-recap", "fun"],
        "saturday": ["community", "user-generated"],
        "sunday": ["planning", "motivation"]
      }
    }
  ]
}
```

### 2. Campaign Types

| Campaign | Description | Frequency | Automation Level |
|----------|-------------|-----------|------------------|
| **Launch** | Product announcements, PR | One-time | Semi-auto |
| **Content** | Social posts, blogs | Daily/Weekly | Full auto |
| **Email** | Drip campaigns, newsletters | Triggered/Scheduled | Full auto |
| **Ads** | Paid campaigns | Continuous | Semi-auto |
| **SEO** | Blog posts, landing pages | Weekly | Full auto |
| **Engagement** | Replies, community | Real-time | Assisted |

### 3. Content Generation Engine

#### Prompt Templates

**Social Post Generation:**
```markdown
Generate a {platform} post for {product_name}.

Product: {description}
Target Audience: {audience}
Tone: {tone}
Content Type: {content_type}
Character Limit: {limit}

Previous top-performing posts:
{top_posts}

Current trends in this space:
{trends}

Generate 3 variations with different hooks.
```

**Email Sequence Generation:**
```markdown
Generate an email for the {sequence_name} sequence.

Position: Email {n} of {total}
Goal: {goal}
Previous email summary: {previous}
User segment: {segment}

Include:
- Subject line (3 variations)
- Preview text
- Body copy
- CTA
```

### 4. Platform Integrations

#### Supported Platforms

| Platform | API | Features |
|----------|-----|----------|
| **Twitter/X** | v2 API | Posts, threads, analytics |
| **LinkedIn** | Marketing API | Posts, articles, company pages |
| **Email** | SendGrid/Resend | Campaigns, sequences, analytics |
| **Meta Ads** | Marketing API | Ad creation, optimization |
| **Google Ads** | Ads API | Search, display campaigns |
| **Blog** | Direct/CMS | SEO content, publishing |

#### Integration Schema

```typescript
interface PlatformIntegration {
  platform: 'twitter' | 'linkedin' | 'email' | 'meta' | 'google' | 'blog';
  credentials: {
    apiKey?: string;
    apiSecret?: string;
    accessToken?: string;
    refreshToken?: string;
  };
  config: {
    accountId?: string;
    pageId?: string;
    audienceId?: string;
  };
  enabled: boolean;
  rateLimit: {
    postsPerDay: number;
    requestsPerMinute: number;
  };
}
```

### 5. Analytics & Feedback Loop

#### Metrics Tracked

**Engagement Metrics:**
- Impressions, reach
- Likes, comments, shares
- Click-through rate (CTR)
- Engagement rate

**Conversion Metrics:**
- Sign-ups, trials
- Purchases, upgrades
- Cost per acquisition (CPA)
- Return on ad spend (ROAS)

**Content Performance:**
- Top-performing posts
- Best posting times
- Audience growth
- Sentiment analysis

#### Optimization Loop

```
1. Generate Content
       │
       ▼
2. Publish to Platforms
       │
       ▼
3. Collect Analytics (24-72h)
       │
       ▼
4. Score Performance
       │
       ▼
5. Feed Back to AI
       │
       ▼
6. Adjust Strategy
       │
       └──► Loop back to 1
```

---

## Database Schema

### Core Tables

```prisma
model MarketingTarget {
  id              String   @id @default(cuid())
  name            String   @unique
  deployedUrl     String
  description     String
  targetAudience  String
  uniqueValue     String
  priority        Int      @default(99)
  enabled         Boolean  @default(true)
  
  campaigns       Campaign[]
  content         Content[]
  analytics       Analytics[]
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model Campaign {
  id              String   @id @default(cuid())
  targetId        String
  target          MarketingTarget @relation(fields: [targetId], references: [id])
  
  type            String   // launch, content, email, ads, seo
  status          String   // draft, active, paused, completed
  platform        String   // twitter, linkedin, email, meta, google
  
  config          Json     // Platform-specific configuration
  schedule        Json     // Posting schedule
  budget          Float?   // For paid campaigns
  
  startDate       DateTime?
  endDate         DateTime?
  
  content         Content[]
  metrics         CampaignMetrics[]
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model Content {
  id              String   @id @default(cuid())
  targetId        String
  target          MarketingTarget @relation(fields: [targetId], references: [id])
  campaignId      String?
  campaign        Campaign? @relation(fields: [campaignId], references: [id])
  
  type            String   // post, thread, email, ad, blog
  platform        String
  status          String   // draft, scheduled, published, failed
  
  content         String   // The actual content
  variations      Json?    // A/B variations
  mediaUrls       String[] // Attached media
  
  scheduledFor    DateTime?
  publishedAt     DateTime?
  platformPostId  String?  // ID from the platform
  
  metrics         ContentMetrics?
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model ContentMetrics {
  id              String   @id @default(cuid())
  contentId       String   @unique
  content         Content  @relation(fields: [contentId], references: [id])
  
  impressions     Int      @default(0)
  reach           Int      @default(0)
  likes           Int      @default(0)
  comments        Int      @default(0)
  shares          Int      @default(0)
  clicks          Int      @default(0)
  
  engagementRate  Float?
  clickThroughRate Float?
  
  conversions     Int      @default(0)
  revenue         Float    @default(0)
  
  fetchedAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model CampaignMetrics {
  id              String   @id @default(cuid())
  campaignId      String
  campaign        Campaign @relation(fields: [campaignId], references: [id])
  date            DateTime @db.Date
  
  spend           Float    @default(0)
  impressions     Int      @default(0)
  clicks          Int      @default(0)
  conversions     Int      @default(0)
  
  cpc             Float?   // Cost per click
  cpa             Float?   // Cost per acquisition
  roas            Float?   // Return on ad spend
  
  @@unique([campaignId, date])
}
```

---

## Marketing Harness

### Session Types

| Session | Purpose | Model | Frequency |
|---------|---------|-------|-----------|
| **Content Generation** | Create posts, emails | Sonnet 4.5 | Daily |
| **Strategy Review** | Analyze performance, adjust | Sonnet 4.5 | Weekly |
| **Ad Optimization** | Adjust targeting, copy | Sonnet 4.5 | Daily |
| **Competitor Analysis** | Monitor competitors | Haiku | Weekly |
| **Report Generation** | Create performance reports | Haiku | Weekly |

### Harness Flow

```javascript
// marketing-harness.js (pseudocode)

async function runMarketingSession(target, sessionType) {
  // 1. Load target context
  const context = await loadTargetContext(target);
  
  // 2. Fetch recent analytics
  const analytics = await fetchAnalytics(target, { days: 7 });
  
  // 3. Get content calendar for today
  const todaysTasks = getContentCalendar(target, new Date());
  
  // 4. Generate content with Claude
  const content = await generateContent({
    target,
    analytics,
    tasks: todaysTasks,
    topPerformers: analytics.topContent,
  });
  
  // 5. Review and queue for publishing
  for (const item of content) {
    await queueContent(item);
  }
  
  // 6. Publish scheduled content
  await publishScheduledContent(target);
  
  // 7. Update metrics
  await updateMetrics(target);
  
  // 8. Log session
  await logSession({ target, content, metrics });
}
```

---

## API Endpoints

### Targets
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/marketing/targets` | List all targets |
| POST | `/api/marketing/targets` | Create target |
| PUT | `/api/marketing/targets/:id` | Update target |

### Campaigns
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/marketing/campaigns` | List campaigns |
| POST | `/api/marketing/campaigns` | Create campaign |
| PUT | `/api/marketing/campaigns/:id/status` | Update status |

### Content
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/marketing/content` | List content |
| POST | `/api/marketing/content/generate` | Generate new content |
| POST | `/api/marketing/content/:id/publish` | Publish content |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/marketing/analytics/summary` | Overall stats |
| GET | `/api/marketing/analytics/:targetId` | Target analytics |
| POST | `/api/marketing/analytics/refresh` | Refresh metrics |

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Database schema and migrations
- [ ] Marketing queue structure
- [ ] Basic content generation prompts
- [ ] Twitter integration (post only)

### Phase 2: Multi-Platform (Week 3-4)
- [ ] LinkedIn integration
- [ ] Email integration (SendGrid/Resend)
- [ ] Content scheduling system
- [ ] Basic analytics collection

### Phase 3: Optimization (Week 5-6)
- [ ] Analytics feedback loop
- [ ] A/B testing framework
- [ ] Performance scoring
- [ ] Automated optimization

### Phase 4: Ads & Scale (Week 7-8)
- [ ] Meta Ads integration
- [ ] Google Ads integration
- [ ] Budget management
- [ ] ROI tracking

### Phase 5: Intelligence (Week 9-10)
- [ ] Competitor monitoring
- [ ] Trend detection
- [ ] Sentiment analysis
- [ ] Predictive scheduling

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Content automation rate | >80% | % content auto-generated |
| Engagement improvement | +25% | vs. manual baseline |
| Time saved | 10+ hrs/week | Per target |
| Cost per lead | -20% | vs. manual campaigns |
| Content consistency | 100% | Calendar adherence |

---

## Security & Compliance

- **API keys** stored in environment variables
- **OAuth tokens** encrypted at rest
- **Rate limiting** respected per platform
- **Content review** option before auto-publish
- **GDPR/CCPA** compliant email handling

---

## Cost Estimates

| Component | Monthly Cost |
|-----------|--------------|
| Claude API (Sonnet 4.5) | ~$50-100 |
| Platform APIs | Free tier / $0-50 |
| Email service | $0-30 |
| Database | $0-20 |
| **Total** | **~$50-200/month** |

*Plus ad spend budget as configured*

---

## Next Steps

1. **Approve PRD** - Review and finalize scope
2. **Create project** - Set up AMD directory structure
3. **Build foundation** - Database, queue, basic harness
4. **Integrate Twitter** - First platform integration
5. **Deploy & iterate** - Start with one target

---

*"Marketing on autopilot, powered by AI."*
