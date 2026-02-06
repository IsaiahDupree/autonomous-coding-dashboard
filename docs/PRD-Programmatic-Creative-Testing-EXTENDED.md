# Extended PRD: Programmatic Creative Testing System
# Complete Concept Extraction & Integration Architecture

**Version:** 2.0 (Extended)  
**Date:** January 2025  
**Source:** Complete transcript analysis of "How to (logically) test Facebook Ads at an incredible speed"  
**Extends:** PRD-Programmatic-Creative-Testing.md

---

## 1. Complete Concept Extraction

### 1.1 Core Philosophy Concepts

| Concept | Description | Integration Point |
|---------|-------------|-------------------|
| **System Thinking** | Market research and systematic approach before technical implementation | Pre-requisite workflow step |
| **Mental Framework First** | Understanding the framework before diving into technicalities | Onboarding/education module |
| **Not Creative Guesswork** | Transform ads from chaotic guessing to systematic parameter testing | Core value proposition |
| **Programmatic Creative Testing** | Generate and test ad variations by manipulating specific marketing parameters | Main system purpose |
| **Logical Combination Finding** | Systematically discover which parameter combinations work with customers | Algorithm design |

### 1.2 Input Data Concepts

| Concept | Description | Data Model |
|---------|-------------|------------|
| **Brand Description** | Company identity, values, positioning | `brands` table |
| **Product Description** | Features, benefits, target audience | `products` table |
| **Voice of Customer (VoC)** | Language customers use to describe pain points | `voice_of_customer` table |
| **Gold Nuggets** | Verbatim customer quotes organized by pain point context | `gold_nuggets` table |
| **Voice Mining Framework** | AI agents gathering sources from internet (Reddit, forums, reviews) | External data pipeline |
| **Customer Reviews** | Product reviews imported and AI-filtered for important quotes | `reviews` table |

### 1.3 Strategic Framework Concepts (Eugene Schwartz)

#### Customer Awareness Levels
| Level | Name | Description | Messaging Strategy |
|-------|------|-------------|-------------------|
| 1 | **Unaware** | Don't know they have a problem | Educate about the problem existence |
| 2 | **Problem Aware** | Know problem, not solutions | Agitate problem, introduce solution category |
| 3 | **Solution Aware** | Know solutions exist, not your product | Differentiate your specific solution |
| 4 | **Product Aware** | Know your product, not convinced | Overcome objections, build trust |
| 5 | **Most Aware** | Ready to buy, just need push | Direct offer, urgency, deals |

#### Market Sophistication Levels
| Level | Example | Messaging Strategy |
|-------|---------|-------------------|
| 1 | Washing machines 100 years ago | Simply state what product does ("This washes your clothes") |
| 2 | Competition emerging | Bigger/better claims than competitors |
| 3 | Crowded market | Unique mechanism or method differentiation |
| 4 | Skeptical market | Heavy proof and specificity required |
| 5 | Exhausted market (washing machines today) | Identification/tribe building, lifestyle positioning |

### 1.4 Creative Generation Concepts

| Concept | Description | System Feature |
|---------|-------------|----------------|
| **USP (Unique Selling Proposition)** | Product's overall unique position in marketplace (1-4 maximum per product) | USP management module |
| **Marketing Angles** | Specific slices of USP that become hero of individual ad campaign | Angle generator |
| **Hooks** | Short ad copy (5-15 words) that grab attention | Hook generation engine |
| **Messaging Frameworks** | Tonal/structural approaches (punchy, bold, desire, question-based, etc.) | Framework selector |
| **Psychological Triggers** | Emotional drivers (curiosity, challenge beliefs, fear, greed, etc.) | Advanced parameter |
| **Emotion Targeting** | Specific emotion to create in ads (excitement, relief, confidence, etc.) | Script parameter |
| **Copywriter Style Reference** | Emulate famous copywriters (David Ogilvy, Eugene Schwartz, etc.) | AI prompt injection |

### 1.5 Ad Format Concepts

| Format | Description | Complexity | Use Case |
|--------|-------------|------------|----------|
| **Static Ads** | Image + text overlay | Low | Scale testing at high volume |
| **Mini VSSL** | Text-based video ad with voiceover | Medium | Winner scaling |
| **B-Roll Ad** | Script + matched B-roll footage | High | Premium creative scaling |
| **Script Structure** | Hook → Lid → Body → CTA | Medium | Video ad framework |

### 1.6 Workflow Concepts

| Workflow | Description | Automation Level |
|----------|-------------|------------------|
| **Generate → Review → Create → Deploy** | Main creative pipeline | Semi-automated |
| **Human Review Checkpoint** | Person reviews generated hooks before deployment | Manual step |
| **Resonance Selection** | "This resonates / this not" approval process | Manual + AI assist |
| **Winner Identification** | Facebook algorithm finds best performers | Automated by platform |
| **Iteration Loop** | Winners → Analyze parameters → Generate new variations | Semi-automated |

### 1.7 Technical Implementation Concepts

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Frontend Interface** | Google Sheets | Parameter input, hook review, campaign management |
| **Backend Automation** | Make.com (Integromat) | Webhooks, workflow orchestration |
| **AI Generation** | Claude/ChatGPT API | USP, angle, hook, and script generation |
| **Image Generation** | Templated.io | Dynamic image creation with text overlay, auto-fit text sizing |
| **Video Assembly** | Icon | B-roll matching and video assembly from script |
| **Ad Deployment** | Meta Marketing API | Push ads to Facebook/Instagram |
| **Webhook Triggers** | Checkbox clicks in Sheets | Trigger backend automations |

### 1.8 Scaling Concepts

| Concept | Description | Implementation |
|---------|-------------|----------------|
| **Rate Limiting** | Facebook throttles if too many ads created at once | Queue management, one-by-one creation |
| **Batch Processing** | Generate 100+ hooks, select best, create ads | Batch generation with review step |
| **Template Variations** | Same hook applied to multiple image templates | Template × Hook matrix |
| **Winner Scaling** | Scale budget on winning ads, iterate on winning parameters | Performance-based workflow |
| **20 Good Ads Per Day** | Target output with small team using this method | Productivity metric |

---

## 2. Integration Architecture Options

### Option A: Standalone Remotion Suite Extension

**Description:** Build as extension to existing Remotion video generation suite

**Pros:**
- Leverages existing video rendering infrastructure
- Shared component library
- Established deployment pipeline

**Cons:**
- May not need video rendering for static ad testing
- Remotion optimized for video, not static images
- Different technology stack (React/Node vs potential Python/Make.com)

**Verdict:** ⚠️ Partial fit - good for video ad scaling phase only

---

### Option B: New Standalone Instance

**Description:** Fresh build as independent microservice/application

**Pros:**
- Clean architecture optimized for ad generation
- No legacy constraints
- Can use optimal tech stack (Make.com compatible)

**Cons:**
- Duplicated infrastructure
- No shared state with other systems
- Additional maintenance burden

**Verdict:** ✅ Good for MVP, can integrate later

---

### Option C: WaitlistLab Meta Connectivity Integration

**Description:** Integrate with WaitlistLab's existing Meta API connectivity

**Pros:**
- Existing Meta OAuth and API infrastructure
- Shared ad account management
- Unified analytics across systems
- Already has campaign management

**Cons:**
- WaitlistLab focused on different use case (waitlist/signup)
- May need significant refactoring
- Tighter coupling

**Verdict:** ✅ **RECOMMENDED** - Best synergy for Meta API operations

---

### Option D: Hybrid ACD-Integrated Approach

**Description:** Core logic in ACD dashboard with shared database, Meta connectivity from WaitlistLab

**Architecture:**
```
┌─────────────────────────────────────────────────────────────────┐
│                    ACD Dashboard (Existing)                      │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│  │ Project Manager  │  │ Feature Tracking │  │ Agent Harness │ │
│  └──────────────────┘  └──────────────────┘  └───────────────┘ │
│                              │                                   │
│  ┌───────────────────────────┴───────────────────────────────┐ │
│  │              NEW: Programmatic Creative Module             │ │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────────┐ │ │
│  │  │ Context │ │   USP   │ │  Hooks  │ │ Ad Generation   │ │ │
│  │  │ Manager │ │ Manager │ │ Engine  │ │ (Static/Video)  │ │ │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────────────┘ │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Shared Supabase Database                     │
├─────────────────────────────────────────────────────────────────┤
│  brands │ products │ usps │ angles │ hooks │ ads │ performance  │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   WaitlistLab   │ │    Remotion     │ │   Make.com      │
│  Meta API Layer │ │  Video Render   │ │  Automations    │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

**Verdict:** ✅✅ **BEST OPTION** - Leverages all existing infrastructure

---

## 3. Recommended Integration Approach

### Phase 1: Core Module in ACD (Weeks 1-4)
- Add Programmatic Creative module to ACD dashboard
- Implement context management (brands, products, VoC)
- Build USP and angle generators using existing AI integrations
- Create hook generation engine with parameter controls
- Store all data in shared Supabase database

### Phase 2: Image Generation (Weeks 5-6)
- Integrate Templated.io API for image generation
- Template management UI in ACD
- Batch image generation with hook × template matrix
- Image review and approval workflow

### Phase 3: Meta Deployment (Weeks 7-8)
- Leverage WaitlistLab's existing Meta OAuth
- Build campaign browser connected to WaitlistLab Meta service
- Ad push queue with rate limiting
- Status sync and tracking

### Phase 4: Analytics & Iteration (Weeks 9-10)
- Performance data import from Meta
- Parameter-to-performance correlation
- Winner identification algorithm
- "Create more like this" iteration workflows

### Phase 5: Video Scaling (Weeks 11-12)
- Script generation from winning hooks
- Remotion integration for video rendering
- B-roll matching (via Icon or custom)
- AI voiceover integration

---

## 4. Database Schema Additions

```sql
-- Brand and Product Context
CREATE TABLE pct_brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  voice_tone TEXT,
  values JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE pct_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES pct_brands(id),
  name TEXT NOT NULL,
  description TEXT,
  features JSONB,
  benefits JSONB,
  target_audience TEXT,
  price_points JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE pct_voice_of_customer (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES pct_products(id),
  source TEXT, -- 'amazon_review', 'reddit', 'forum', 'survey'
  content TEXT NOT NULL,
  pain_points JSONB,
  desires JSONB,
  sentiment TEXT, -- 'positive', 'negative', 'neutral'
  is_gold_nugget BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Strategic Elements
CREATE TABLE pct_usps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES pct_products(id),
  content TEXT NOT NULL,
  is_ai_generated BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'draft', -- 'draft', 'approved', 'archived'
  performance_score FLOAT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE pct_marketing_angles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usp_id UUID REFERENCES pct_usps(id),
  content TEXT NOT NULL,
  category TEXT, -- 'emotional', 'functional', 'social_proof'
  status TEXT DEFAULT 'draft',
  performance_score FLOAT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generation Parameters
CREATE TABLE pct_messaging_frameworks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL, -- 'punchy', 'bold_statements', 'desire_future', etc.
  description TEXT,
  examples JSONB,
  prompt_template TEXT,
  is_custom BOOLEAN DEFAULT FALSE
);

-- Hooks
CREATE TABLE pct_hooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  angle_id UUID REFERENCES pct_marketing_angles(id),
  content TEXT NOT NULL,
  framework_id UUID REFERENCES pct_messaging_frameworks(id),
  awareness_level INT, -- 1-5
  sophistication_level INT, -- 1-5
  status TEXT DEFAULT 'generated', -- 'generated', 'approved', 'rejected', 'deployed'
  rating INT, -- 1-5 stars
  performance_score FLOAT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Templates and Ads
CREATE TABLE pct_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES pct_brands(id),
  name TEXT NOT NULL,
  image_url TEXT,
  text_zones JSONB, -- [{x, y, width, height, font, size, color}]
  sizes JSONB, -- ['1080x1080', '1080x1350', '1080x1920']
  templated_io_id TEXT, -- external service ID
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE pct_generated_ads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hook_id UUID REFERENCES pct_hooks(id),
  template_id UUID REFERENCES pct_templates(id),
  image_url TEXT,
  size TEXT,
  status TEXT DEFAULT 'generated', -- 'generated', 'approved', 'deployed', 'rejected'
  meta_ad_id TEXT, -- Facebook ad ID when deployed
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Video Scripts (Advanced)
CREATE TABLE pct_scripts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hook_id UUID REFERENCES pct_hooks(id),
  hook_text TEXT,
  lid_text TEXT,
  body_text TEXT,
  cta_text TEXT,
  duration_target INT, -- seconds
  psychological_trigger TEXT,
  emotion_target TEXT,
  copywriter_style TEXT,
  narrator_style TEXT,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance Tracking
CREATE TABLE pct_performance_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ad_id UUID REFERENCES pct_generated_ads(id),
  date DATE,
  impressions INT,
  clicks INT,
  spend DECIMAL,
  ctr FLOAT,
  cpc DECIMAL,
  conversions INT,
  roas FLOAT,
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. API Endpoints Required

### Internal APIs (ACD Backend)
```
POST   /api/pct/brands                    - Create brand
GET    /api/pct/brands                    - List brands
POST   /api/pct/products                  - Create product
GET    /api/pct/products?brand_id=        - List products
POST   /api/pct/voc                       - Add voice of customer
POST   /api/pct/voc/import                - Bulk import reviews
POST   /api/pct/usps/generate             - AI generate USPs
POST   /api/pct/angles/generate           - Generate angles from USP
POST   /api/pct/hooks/generate            - Generate hooks (batch)
GET    /api/pct/hooks?status=&angle_id=   - List/filter hooks
PATCH  /api/pct/hooks/:id                 - Update hook status
POST   /api/pct/templates                 - Create template
POST   /api/pct/ads/generate              - Generate ad images
POST   /api/pct/ads/deploy                - Push to Meta
GET    /api/pct/performance               - Get performance data
POST   /api/pct/scripts/generate          - Generate video script
```

### External API Integrations
```
# Anthropic/OpenAI
POST   /v1/messages (Claude) or /v1/chat/completions (OpenAI)

# Templated.io
POST   /v2/render               - Render image with template
GET    /v2/templates            - List available templates

# Meta Marketing API (via WaitlistLab)
GET    /act_{ad_account_id}/campaigns
GET    /act_{ad_account_id}/adsets
POST   /act_{ad_account_id}/ads
GET    /{ad_id}/insights
```

---

## 6. Feature Flags & Configuration

```json
{
  "pct_enabled": true,
  "pct_ai_provider": "anthropic", // or "openai"
  "pct_ai_model": "claude-3-sonnet-20240229",
  "pct_image_provider": "templated", // or "custom"
  "pct_meta_integration": "waitlistlab", // uses WaitlistLab's OAuth
  "pct_video_enabled": false, // Phase 5
  "pct_max_hooks_per_batch": 100,
  "pct_ad_push_rate_limit": 1, // ads per second
  "pct_default_awareness_level": 3,
  "pct_default_sophistication_level": 4
}
```

---

## 7. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Hooks generated per day | 500+ | Database count |
| Ads created per day | 100+ | Database count |
| Time from concept to live ad | < 30 minutes | Workflow timing |
| Winner rate (2%+ CTR) | 2-5% of tested ads | Performance tracking |
| Cost per winning creative | 50% reduction | Cost analysis |
| Iteration cycle time | < 24 hours | Workflow timing |

---

## 8. Risk Mitigation

| Risk | Mitigation |
|------|------------|
| AI generates off-brand content | Human review checkpoint, brand voice training |
| Meta API rate limiting | Queue management, exponential backoff |
| Ad account restrictions | Compliance review, gradual scaling |
| Template limitations | Multiple templates, A/B testing |
| Over-reliance on automation | Maintain human creative oversight |
| Data privacy concerns | VoC data anonymization, secure storage |

---

## 9. Appendix: Complete Extracted Quotes from Video

### On System Philosophy
- "Market research and system thinking before everything else"
- "This is not creative guesswork that is completely chaotic"
- "We actually can make a system out of it"
- "Logically find the right combination that works with our customers"

### On Voice of Customer
- "Ads should use the language customers use in reviews, forums, or Reddit to describe their pain points"
- "Gold nuggets - verbatim customer quotes organized by pain point context"
- "Voice mining framework - using AI agents to gather every source on the internet"

### On USPs and Angles
- "USP is the product's overall unique position in the marketplace"
- "A product typically has 1-4 USPs maximum"
- "Marketing angles are specific slices of a USP that become the hero of one individual ad campaign"
- "Each angle should be laser-focused on a single emotional trigger, customer problem, or benefit"

### On Testing Strategy
- "Static ads for testing at scale because they are less complicated to produce"
- "Generate hooks, select the best ones, combine with different images"
- "Facebook algorithm optimizes ad delivery"
- "Find one or two winners, then iterate"

### On Scaling Winners
- "If you know that this ad was a winner, then you know that this angle pushing this USP works"
- "Create new iterations - new images with same hooks, new hooks with same angles"
- "Generate 20 good ads per day minimum with a small team using this method"

---

## 10. Performing Hooks Database (AI Example Library)

### 10.1 Concept
The system maintains a database of **hundreds of proven performing hooks** that serve as examples for AI generation. This is a critical differentiator - instead of generating from scratch, AI learns from what already works in advertising.

### 10.2 Structure
```sql
CREATE TABLE pct_hook_examples (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hook_text TEXT NOT NULL,
  framework_id UUID REFERENCES pct_messaging_frameworks(id),
  industry TEXT,
  performance_notes TEXT,
  source TEXT, -- 'internal_winner', 'swipe_file', 'competitor'
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 10.3 Usage in Generation
When generating hooks, the AI prompt includes:
1. Full product/brand context
2. Selected USP and marketing angle
3. Target awareness level and sophistication
4. **5-10 relevant example hooks from the database** matched by framework

### 10.4 Feedback Loop
- Winning hooks from campaigns automatically added to examples
- Poor performers flagged for review
- Continuous improvement of example quality

---

## 11. Trigger-Based Workflow Architecture

### 11.1 Google Sheets Button → Webhook Pattern
The original system uses checkbox clicks in Google Sheets to trigger Make.com webhooks:

```
[Google Sheet Checkbox] 
    → onEdit trigger (Apps Script)
    → HTTP POST to Make.com webhook
    → Make.com scenario executes
    → Results written back to Sheet
```

### 11.2 ACD Equivalent Architecture
For our implementation, replace Google Sheets triggers with UI buttons:

```
[Dashboard Button Click]
    → API endpoint call
    → Background job queued
    → AI generation executed
    → WebSocket notification to UI
    → Results displayed in real-time
```

### 11.3 Webhook Compatibility Layer
For users who prefer Google Sheets workflow:
- Expose webhook endpoints compatible with Make.com
- Allow triggering generation via external webhooks
- Support both UI-driven and webhook-driven workflows

---

## 12. Production Metrics & Targets

### 12.1 Output Velocity Targets
From transcript: *"You can generate like 20 good ads per day minimum with a small team using this method"*

| Metric | Target | Method |
|--------|--------|--------|
| Hooks generated | 500+/day | Batch generation |
| Hooks approved | 50-100/day | Human review |
| Static ads created | 100+/day | Template × Hook automation |
| Ads deployed | 50-100/day | Rate-limited push |
| Video scripts | 5-10/day | Winner scaling |

### 12.2 Quality Metrics
| Metric | Target | Measurement |
|--------|--------|-------------|
| Hook approval rate | >20% | Approved / Generated |
| Ad approval rate by Meta | >95% | Approved / Pushed |
| Winner rate (2%+ CTR) | 2-5% | Performance tracking |
| Time to first ad | <30 min | Workflow timing |

---

## 13. Next Steps for ACD Integration

1. **Create Project Entry** - Add to ACD project list with all features
2. **Database Migration** - Run schema additions on Supabase
3. **API Development** - Build endpoints in ACD backend
4. **UI Components** - Add PCT module to dashboard
5. **AI Integration** - Connect to existing Claude/OpenAI setup
6. **WaitlistLab Bridge** - Create shared Meta API service
7. **Hook Examples Database** - Seed with initial performing hooks
8. **Testing** - End-to-end workflow validation
9. **Documentation** - User guides and API docs
