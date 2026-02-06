# Product Requirements Document (PRD)
# Programmatic Creative Testing System for Facebook Ads

**Version:** 1.0  
**Date:** January 2025  
**Source:** "How to (logically) test Facebook Ads at an incredible speed" video analysis

---

## 1. Executive Summary

This PRD outlines a comprehensive system for programmatic ad creative testing that transforms Facebook advertising from "creative guesswork" into a systematic, data-driven process. The system enables rapid generation and testing of ad variations by manipulating specific marketing parameters, allowing the Facebook algorithm to identify winning combinations that resonate with target audiences.

**Core Philosophy:** Instead of randomly creating ads and hoping they work, this system uses structured parameters (USPs, marketing angles, messaging frameworks, awareness levels, market sophistication) to systematically test different combinations and discover what resonates with customers.

---

## 2. Problem Statement

### Current Challenges
- Ad creation is often chaotic and relies on creative intuition
- Testing is slow and resource-intensive
- No systematic way to identify why certain ads perform better
- Difficulty scaling creative production while maintaining quality
- Human bottleneck in content generation
- Inability to iterate quickly on winning concepts

### Opportunity
Leverage AI and automation to:
- Generate hundreds of ad variations programmatically
- Test multiple marketing hypotheses simultaneously
- Identify winning message-audience combinations systematically
- Scale creative production without proportionally scaling team size

---

## 3. Target Users

1. **Performance Marketers** - Running Facebook/Meta ad campaigns
2. **E-commerce Brands** - Selling products direct-to-consumer
3. **Marketing Agencies** - Managing multiple client ad accounts
4. **Growth Teams** - Focused on customer acquisition
5. **Solo Entrepreneurs** - Running their own advertising

---

## 4. Core Concepts & Frameworks

### 4.1 Unique Selling Proposition (USP)
The foundational identity of what makes a product/service unique.

**Example (Miracle Bomb skincare):**
- "Impossible to overdo" - the product self-adjusts
- "Works even with shaky hands"
- "Buildable coverage"

### 4.2 Marketing Angles
Specific slices or interpretations of a USP that can be tested independently.

**From USP "Impossible to overdo":**
- "Never looks overdone"
- "Softens back to natural"
- "Beautiful even when applied blind"
- "Shaky hands, steady glow"

### 4.3 Messaging Frameworks
Different tonal/structural approaches to presenting marketing angles:
- **Punchy** - Short, impactful statements
- **Bold Statements** - Provocative claims
- **Desire Future States** - Paint aspirational outcomes
- **Standard** - Straightforward product claims
- **Question-based** - Engage through curiosity

### 4.4 Customer Awareness Levels (Eugene Schwartz)
From "Breakthrough Advertising":

| Level | Name | Description | Messaging Approach |
|-------|------|-------------|-------------------|
| 1 | Unaware | Don't know they have a problem | Educate about problem |
| 2 | Problem Aware | Know problem, not solutions | Agitate problem, introduce solution category |
| 3 | Solution Aware | Know solutions exist, not your product | Differentiate your solution |
| 4 | Product Aware | Know your product, not convinced | Overcome objections, build trust |
| 5 | Most Aware | Ready to buy | Direct offer, urgency |

### 4.5 Market Sophistication (Eugene Schwartz)
How saturated/educated the market is:

| Level | Description | Messaging Strategy |
|-------|-------------|-------------------|
| 1 | New category | Simply state what product does |
| 2 | Competition emerging | Bigger/better claims |
| 3 | Crowded market | Unique mechanism/method |
| 4 | Skeptical market | Proof and specificity |
| 5 | Exhausted market | Identification/tribe building |

---

## 5. System Architecture

### 5.1 High-Level Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         INPUT LAYER                                  │
├─────────────────────────────────────────────────────────────────────┤
│  Brand Description │ Product Description │ Voice of Customer (VoC)  │
│                    │                     │ - Reviews                │
│                    │                     │ - Forum quotes           │
│                    │                     │ - Reddit comments        │
│                    │                     │ - "Gold Nuggets"         │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      GENERATION ENGINE                               │
├─────────────────────────────────────────────────────────────────────┤
│  1. Generate USPs (or use existing)                                 │
│  2. Generate Marketing Angles per USP                               │
│  3. Select Parameters:                                              │
│     - Messaging Framework                                           │
│     - Awareness Level                                               │
│     - Market Sophistication                                         │
│  4. Generate Hooks (short copy variants)                            │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      HUMAN REVIEW CHECKPOINT                         │
├─────────────────────────────────────────────────────────────────────┤
│  - Review generated hooks                                           │
│  - Select winners ("this resonates / this not")                     │
│  - Optionally modify/refine                                         │
│  - Approve for creative generation                                  │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      CREATIVE GENERATION                             │
├─────────────────────────────────────────────────────────────────────┤
│  Static Ads:                    │  Video Ads (Advanced):           │
│  - Apply hooks to templates     │  - Generate full scripts         │
│  - Auto-fit text sizing         │  - Hook → Lid → Body → CTA       │
│  - Multiple template variants   │  - Match with B-roll footage     │
│  - Batch image generation       │  - AI voiceover generation       │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      DEPLOYMENT & TESTING                            │
├─────────────────────────────────────────────────────────────────────┤
│  - Push ads to Facebook via API                                     │
│  - Campaign structure: maximize algorithm freedom                   │
│  - Rate limiting (avoid Facebook throttling)                        │
│  - Let algorithm find winners                                       │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      ITERATION LOOP                                  │
├─────────────────────────────────────────────────────────────────────┤
│  Winners identified → Analyze which parameters worked               │
│  → Generate new variations of winning angles                        │
│  → Test new images with same hooks                                  │
│  → Test new hooks with same angles                                  │
│  → Scale winners, kill losers                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 Technical Stack (Reference Implementation)

| Component | Technology | Purpose |
|-----------|------------|---------|
| Frontend/Interface | Google Sheets | Parameter input, hook review, campaign management |
| Backend Automation | Make.com | Webhooks, workflow orchestration |
| AI Generation | Claude/ChatGPT API | USP, angle, hook, and script generation |
| Image Generation | Templated.io API | Dynamic image creation with text overlay |
| Ad Deployment | Meta Marketing API | Push ads to Facebook/Instagram |
| Video Creation | Icon (optional) | B-roll matching and video assembly |

---

## 6. Functional Requirements

### 6.1 Context Management

**FR-1.1:** System shall store and manage brand descriptions
- Company name, values, voice, positioning

**FR-1.2:** System shall store product descriptions
- Features, benefits, target audience, price points

**FR-1.3:** System shall collect Voice of Customer (VoC) data
- Import customer reviews
- Store "gold nuggets" (verbatim customer quotes)
- Capture pain points and desires
- Support manual entry and bulk import

### 6.2 USP Generation & Management

**FR-2.1:** System shall generate USP suggestions from context
- Analyze product features and customer feedback
- Identify unique differentiators
- Output 5-10 USP candidates

**FR-2.2:** System shall allow manual USP entry
- Brands with existing USPs can input directly

**FR-2.3:** System shall track USP performance over time

### 6.3 Marketing Angle Generation

**FR-3.1:** For each USP, generate multiple marketing angles
- Minimum 5-10 angles per USP
- Angles should be testable hypotheses

**FR-3.2:** Angles should vary in:
- Emotional appeal
- Benefit focus (functional vs emotional)
- Audience segment targeting

### 6.4 Hook Generation

**FR-4.1:** Generate hooks based on configurable parameters:
- Selected USP
- Selected Marketing Angle
- Messaging Framework (punchy, bold, question, etc.)
- Awareness Level (1-5)
- Market Sophistication (1-5)

**FR-4.2:** Hooks should be:
- Short enough for ad headlines (typically 5-15 words)
- Attention-grabbing
- Aligned with selected parameters

**FR-4.3:** Batch generation support
- Generate multiple hooks per parameter combination
- Support generating 50-100+ hooks in single batch

### 6.5 Human Review Interface

**FR-5.1:** Present generated hooks for review
- Show source parameters (USP, angle, framework, etc.)
- Allow approve/reject per hook
- Allow inline editing

**FR-5.2:** Selection interface
- Checkbox or toggle selection
- Bulk select/deselect
- Filter by parameter values

### 6.6 Static Ad Creation

**FR-6.1:** Template management
- Upload base images/templates
- Define text overlay zones
- Configure font, size, color options

**FR-6.2:** Hook-to-image application
- Auto-fit text to defined zones
- Dynamic font sizing based on hook length
- Generate multiple template variants per hook

**FR-6.3:** Batch image generation
- Generate all combinations (hooks × templates)
- Export to standard ad formats (1080x1080, 1080x1920, etc.)

### 6.7 Video Script Generation (Advanced)

**FR-7.1:** Generate full ad scripts based on:
- Winning hook
- Selected marketing angle
- Psychological trigger (optional)
- Target emotion
- Copywriter style reference (optional)
- Target duration

**FR-7.2:** Script structure:
- Hook (attention-grabber)
- Lid (expand on hook, create curiosity)
- Body (deliver value, build desire)
- CTA (call to action)

**FR-7.3:** Output formats:
- Google Docs export
- Teleprompter-ready format
- Timestamp markers for B-roll matching

### 6.8 Ad Deployment

**FR-8.1:** Campaign structure management
- Define campaign hierarchy (Campaign → Ad Set → Ad)
- Select target ad sets for deployment

**FR-8.2:** Batch ad creation
- Push multiple ads via Meta API
- Rate limiting to avoid throttling
- Queue management for large batches

**FR-8.3:** Status tracking
- Track push success/failure
- Link spreadsheet rows to live ads

### 6.9 Performance Tracking & Iteration

**FR-9.1:** Connect performance data back to parameters
- Which USP performed best?
- Which angle resonated?
- Which framework worked?

**FR-9.2:** Iteration workflows
- "Create more like this" for winners
- Generate new hooks for winning angles
- Generate new images for winning hooks

---

## 7. Non-Functional Requirements

### 7.1 Performance
- Hook generation: < 60 seconds for batch of 50
- Image generation: < 5 seconds per image
- Ad push: Respect Meta API rate limits (typically 1 ad/second)

### 7.2 Scalability
- Support 1000+ hooks per product
- Support 100+ active ads per campaign
- Multi-product management

### 7.3 Reliability
- Webhook retry logic for failed automations
- Idempotent operations to prevent duplicates
- Error logging and alerting

### 7.4 Security
- Secure API key storage
- Access control for team members
- Audit logging for compliance

---

## 8. User Stories

### Epic 1: Context Setup
- **US-1.1:** As a marketer, I want to input my brand description so the system understands my brand voice
- **US-1.2:** As a marketer, I want to upload customer reviews so the system can extract insights
- **US-1.3:** As a marketer, I want to manually add "gold nuggets" from customer research

### Epic 2: Creative Generation
- **US-2.1:** As a marketer, I want to generate USPs automatically based on my product and reviews
- **US-2.2:** As a marketer, I want to select a USP and generate multiple marketing angles
- **US-2.3:** As a marketer, I want to configure parameters (framework, awareness, sophistication) and generate hooks
- **US-2.4:** As a marketer, I want to review generated hooks and select the best ones
- **US-2.5:** As a marketer, I want to generate ad images using my selected hooks and templates

### Epic 3: Ad Deployment
- **US-3.1:** As a marketer, I want to push approved ads to my Facebook ad account
- **US-3.2:** As a marketer, I want to select which ad set receives the new ads
- **US-3.3:** As a marketer, I want to see the status of my ad deployments

### Epic 4: Iteration
- **US-4.1:** As a marketer, I want to identify which parameters drove winning ads
- **US-4.2:** As a marketer, I want to generate more variations of winning concepts
- **US-4.3:** As a marketer, I want to test new images with proven hooks

---

## 9. Success Metrics

| Metric | Target | Rationale |
|--------|--------|-----------|
| Ads created per day | 20-100 | 10x improvement over manual |
| Time to first ad live | < 30 minutes | From concept to running ad |
| Winner identification rate | 2-5% | Find 2-5 winners per 100 tested |
| Cost per winning creative | -50% | Half the cost of traditional methods |
| Iteration cycle time | < 24 hours | Rapid learning loops |

---

## 10. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| AI generates off-brand content | Medium | Human review checkpoint before deployment |
| Facebook API rate limiting | High | Queue management, batch scheduling |
| Template limitations | Medium | Multiple template variants, A/B testing |
| Over-reliance on automation | Medium | Maintain human creative oversight |
| Ad account restrictions | High | Compliance review, gradual scaling |

---

## 11. Future Enhancements

### Phase 2
- Automated performance data ingestion
- AI-recommended next tests based on results
- Cross-platform support (Google Ads, TikTok)

### Phase 3
- Fully automated video ad creation
- Dynamic creative optimization integration
- Predictive performance modeling

### Phase 4
- Multi-language support
- Competitor creative analysis
- Automated budget allocation to winners

---

## 12. Appendix

### A. Reference Materials
- "Breakthrough Advertising" by Eugene Schwartz
- Voice Mining Framework (referenced in video)
- Templated.io documentation
- Meta Marketing API documentation

### B. Example Hook Outputs

**USP:** "Impossible to overdo"  
**Angle:** "Mistake-proof application"  
**Framework:** Punchy  
**Awareness:** Solution Aware  

Generated Hooks:
1. "Beautiful even when applied blind"
2. "Shaky hands, steady glow"
3. "No mirror, no problem"
4. "Miracle Bomb makes mistake impossible and glow inevitable"

### C. Campaign Structure Best Practice
- Give Facebook algorithm maximum freedom
- Test at ad set level, not campaign level
- Start with broad targeting
- Let algorithm find responsive audiences
