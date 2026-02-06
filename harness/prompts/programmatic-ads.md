# Programmatic Creative Testing System

## Project Overview
Build a comprehensive system for programmatic Facebook ad creative testing that transforms advertising from "creative guesswork" into a systematic, data-driven process. The system enables rapid generation and testing of ad variations by manipulating specific marketing parameters.

## Core Philosophy
Instead of randomly creating ads and hoping they work, use structured parameters (USPs, marketing angles, messaging frameworks, awareness levels, market sophistication) to systematically test different combinations and discover what resonates with customers.

## Reference Documents
- PRD: `/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/docs/PRD-Programmatic-Creative-Testing.md`
- Feature List: `/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/docs/FEATURES-Programmatic-Creative-Testing.md`

## Key Frameworks (Eugene Schwartz - Breakthrough Advertising)

### Customer Awareness Levels
1. **Unaware** - Don't know they have a problem
2. **Problem Aware** - Know problem, not solutions
3. **Solution Aware** - Know solutions exist, not your product
4. **Product Aware** - Know your product, not convinced
5. **Most Aware** - Ready to buy

### Market Sophistication (1-5)
1. New category - simply state what product does
2. Competition emerging - bigger/better claims
3. Crowded market - unique mechanism/method
4. Skeptical market - proof and specificity
5. Exhausted market - identification/tribe building

### Messaging Frameworks
- Punchy (short, impactful)
- Bold Statements (provocative claims)
- Desire Future States (aspirational)
- Question-Based (curiosity-driven)
- Problem-Agitation (pain-focused)
- Social Proof (testimonial-style)

## System Architecture

```
INPUT LAYER
├── Brand Description
├── Product Description
└── Voice of Customer (VoC)
    ├── Reviews
    ├── Forum quotes
    └── "Gold Nuggets" (verbatim quotes)

GENERATION ENGINE
├── Generate/Input USPs
├── Generate Marketing Angles per USP
├── Select Parameters (Framework, Awareness, Sophistication)
└── Generate Hooks (short copy variants)

HUMAN REVIEW CHECKPOINT
├── Review generated hooks
├── Select winners
└── Approve for creative generation

CREATIVE GENERATION
├── Static Ads: Apply hooks to templates
└── Video Ads: Generate scripts (Hook → Lid → Body → CTA)

DEPLOYMENT
├── Push ads to Facebook via API
├── Rate limiting and queue management
└── Let algorithm find winners

ITERATION LOOP
├── Analyze winning parameters
├── Generate variations of winners
└── Scale winners, kill losers
```

## Current Focus: MVP Core Features

### Priority 1: Context & Generation Engine
1. Brand/Product profile forms
2. VoC "gold nugget" collection
3. USP management (manual entry + AI generation)
4. Marketing angle generation from USPs
5. Parameter selectors (framework, awareness, sophistication)
6. Hook generation with AI (Claude/GPT)
7. Hook review interface with approve/reject

### Priority 2: Static Ad Creation
1. Template upload with text zone definition
2. Hook-to-template application
3. Auto-fit text sizing
4. Batch image generation
5. Multiple ad sizes (1080x1080, 1080x1350, 1080x1920)

### Priority 3: Deployment Integration
1. Meta Business account OAuth
2. Campaign/Ad Set browser
3. Batch ad push with rate limiting
4. Status tracking and sync

## Technical Stack
- Frontend: React/Next.js with TailwindCSS
- Backend: Node.js/Express or Next.js API routes
- AI: Claude API (Anthropic) or OpenAI API
- Image Generation: Templated.io API or similar
- Ad Platform: Meta Marketing API
- Database: Supabase (PostgreSQL)

## Database Entities
- Brand, Product, VoiceOfCustomer
- USP, MarketingAngle, Hook
- Template, GeneratedAd
- Campaign, AdSet, Ad (Meta mirrors)
- PerformanceMetric

## Integration Notes
This system can integrate with:
- **WaitlistLab**: As the "Ads Autopilot" component
- **Remotion**: For video ad generation from scripts
- **Meta Pixel**: For conversion tracking back to hooks

## Instructions for Development
1. Read the full PRD before starting any feature
2. Follow the feature list priority matrix (P0 → P1 → P2 → P3)
3. Each hook generation should track its source parameters
4. Always include human review checkpoint before ad deployment
5. Implement rate limiting for Meta API calls
6. Store all generated content for iteration analysis

## Example Hook Generation Flow
```
USP: "Impossible to overdo"
  ↓
Marketing Angle: "Mistake-proof application"
  ↓
Parameters: Punchy framework + Solution Aware + Level 3 Sophistication
  ↓
Generated Hooks:
- "Beautiful even when applied blind"
- "Shaky hands, steady glow"
- "No mirror, no problem"
- "Miracle Bomb makes mistake impossible and glow inevitable"
```

## Success Metrics
- 20-100 ads created per day
- Time to first ad live: < 30 minutes
- 2-5% winner identification rate
- 50% reduction in cost per winning creative
