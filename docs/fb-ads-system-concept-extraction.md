# Facebook Ads Testing System - Complete Concept Extraction

## Overview
This document extracts ALL concepts, tools, workflows, and integrations from the transcript "How to (logically) test Facebook Ads at an incredible speed" for implementation as a programmatic creative testing system.

---

## 1. CORE MENTAL FRAMEWORK

### 1.1 Philosophy: Structured Testing vs Creative Guesswork
- **Key Insight**: Ads are not "creative guesswork" but a systematic, structured process
- **Goal**: Logically find the right combination that works with customers
- **Method**: Use different parameters that can be tested in a structured way
- **Outcome**: Let Facebook's algorithm determine which ads resonate with customers

### 1.2 The Testing Hierarchy
```
Product Context (Full Context)
    └── Unique Selling Propositions (USPs)
            └── Marketing Angles (per USP)
                    └── Hooks (per Angle)
                            └── Static Ads / Video Ads
```

---

## 2. CONTEXT BUILDING (Full Context)

### 2.1 Brand Description
- Company overview
- Brand values and positioning
- Target market definition

### 2.2 Product Description
- Product features and benefits
- Technical specifications
- Use cases

### 2.3 Voice of the Customer (Gold Nuggets)
- **Sources**:
  - Customer reviews
  - Forum discussions
  - Reddit threads
  - Social media comments
- **Purpose**: Extract exact customer wording/language
- **Key Concept**: "Gold nuggets" = important customer quotes that reveal pain points, desires, and language patterns
- **Related**: Separate "voice mining framework" video mentioned for gathering gold nuggets

### 2.4 Pain Points
- Specific customer problems
- Emotional triggers
- Frustrations with existing solutions

---

## 3. UNIQUE SELLING PROPOSITIONS (USPs)

### 3.1 Definition
- The product's overall unique position in the marketplace
- What differentiates it from competitors
- Can be known by brand or AI-generated from context

### 3.2 Generation Method
- Input: Brand description, product description, voice of customer
- Process: Ask AI to generate 3-5 USPs for the specific product
- Output: List of USPs to test

### 3.3 Example USP (from transcript)
- "The only makeup that's literally impossible to overdo"

---

## 4. MARKETING ANGLES

### 4.1 Definition
- A specific slice or focus of a USP
- Becomes the "hero" of an individual ad campaign
- Laser-focused on a single:
  - Emotional trigger
  - Customer problem
  - Benefit

### 4.2 Purpose
- Test specific ways of communicating positioning
- NOT trying to communicate everything at once
- Each angle = one focused message

### 4.3 Generation Process
- Select a USP
- Click to trigger webhook → Make.com automation
- AI generates multiple marketing angles for that USP
- All angles relate to the selected USP

### 4.4 Example Angles (for "impossible to overdo" USP)
- "You can keep applying and it never looks overdone"
- "If you go too strong with other makeups, it softens back to natural"
- "Even in bad lighting or with shaky hands, you still can't mess it up"

---

## 5. CUSTOMER AWARENESS LEVELS (Eugene Schwartz)

### 5.1 The Five Levels
1. **Unaware** - Don't know they have a problem
2. **Problem Aware** - Know the problem, not the solution
3. **Solution Aware** - Know solutions exist, not your product
4. **Product Aware** - Know your product, not convinced
5. **Most Aware** - Know and trust your product

### 5.2 Application
- Messaging framework changes based on awareness level
- Different hooks/copy for each level
- Selectable parameter in the system

---

## 6. MARKET SOPHISTICATION (Eugene Schwartz)

### 6.1 The Five Levels
- **Level 1**: Market is new, simple claims work ("It washes your clothes")
- **Level 2**: Competitors exist, need bigger claims
- **Level 3**: Need mechanism/proof
- **Level 4**: Need refined mechanism
- **Level 5**: Saturated market, need identification/personality

### 6.2 Example from Transcript
- Washing machines 100 years ago: Level 1 (just show it works)
- Washing machines today: Level 5 (need differentiation)
- Skincare: Level 4-5

### 6.3 Application
- Selectable parameter in hook generation
- Changes how the message is crafted

---

## 7. HOOK GENERATION SYSTEM

### 7.1 Input Parameters
- **USP**: Selected unique selling proposition
- **Marketing Angle**: Selected angle for that USP
- **Awareness Level**: Customer awareness stage
- **Market Sophistication**: Market maturity level
- **Messaging Framework**: Type of hook style
- **Tone**: Punchy, standard, etc.

### 7.2 Messaging Frameworks (Hook Types)
Examples mentioned:
- Desire future states
- Bold statements
- Challenge beliefs
- Pain point focus
- Benefit focus

### 7.3 Hook Database
- System has "hundreds of performing hooks" as examples
- Given to AI as reference for what works in advertising
- Each framework has multiple examples

### 7.4 Generation Process
1. Select parameters in Google Sheet
2. Click "Generate" button
3. Triggers webhook to Make.com
4. Make.com calls AI API with:
   - Full context (brand, product, voice)
   - Selected USP
   - Selected marketing angle
   - Messaging framework
   - Examples of performing hooks
5. AI generates multiple hooks
6. Hooks appear in spreadsheet (~1 minute)

### 7.5 Human Review Step
- **Critical**: Human reviews generated hooks before creating ads
- Someone who knows the product
- Selects which hooks resonate
- Can modify hooks if needed
- NOT fully automated - human curation required

---

## 8. STATIC AD CREATION

### 8.1 Image Templates
- Created using **Templated** (tool with API access)
- Templates are pre-designed ad layouts
- Variable text areas for hooks
- **Auto-fit**: Font size adjusts based on hook length

### 8.2 Template Creation Process
1. Take existing product images
2. Hide/mask existing text/hooks
3. Add placeholder text area
4. Configure auto-fit settings
5. Save as reusable template

### 8.3 Ad Generation Process
1. Select hooks to use
2. Select template(s) to apply
3. Click "Generate"
4. System creates image for each hook × template combination
5. Example: 3 hooks × 2 templates = 6 ad variations

### 8.4 Template Management
- Multiple templates per product/campaign
- Creative team or individual creates templates
- Templates can vary in:
  - Layout
  - Image style
  - Text placement
  - Format (square, story, etc.)

---

## 9. VIDEO AD CREATION (Mini VSSL / Text-based Ads)

### 9.1 Purpose
- Iterate on winning static ads
- Create longer-form content from successful hooks
- Voice-over with B-roll format

### 9.2 Script Generation Parameters
- **USP**: Same as winning hook
- **Marketing Angle**: Same as winning hook
- **Original Hook**: The performing hook
- **Ad Inspiration**: Reference ad structure
- **Psychological Trigger**: e.g., "challenge beliefs"
- **Emotion**: Desired emotional response
- **Design Inspiration**: Visual style reference
- **Narrator Type**: Brand spokesperson, etc.
- **Ad Length**: e.g., 4 minutes
- **Copywriter Style**: e.g., David Ogilvy style
- **AI Model**: e.g., ChatGPT-5
- **Awareness Level**: Target customer stage
- **Market Sophistication**: Market maturity

### 9.3 Script Output Structure
- **Hook**: Opening line
- **Lead/Lid**: Transition from hook
- **Body**: Main content
- **CTA**: Call to action

### 9.4 Script Delivery
- Output to Google Doc
- Formatted for voice-over reading
- Can be modified before production

---

## 10. VIDEO PRODUCTION TOOL: ICON

### 10.1 Purpose
- Create voice-over B-roll ads from scripts
- Match B-roll footage to script segments

### 10.2 Process
1. Import all B-roll footage
2. Input generated script
3. Tool segments script into sentences
4. AI matches best B-roll to each segment
5. Create AI voice-over
6. Output complete video ad

### 10.3 Output Potential
- "20 good ads per day minimum with a small team"

---

## 11. FACEBOOK ADS INTEGRATION

### 11.1 Campaign Structure
- **Campaign** → **Ad Sets** → **Ads**
- System pushes ads into existing ad sets
- Campaign/ad set structure created manually (preferred)

### 11.2 Ad Creation Process
1. Select ad set destination
2. Select ads to push
3. Click to trigger webhook
4. Ads created one-by-one (Facebook rate limiting)
5. Can queue 100+ ads

### 11.3 Strategy
- Push many ad variations (100+)
- Let Facebook algorithm determine winners
- Find 1-2 winning ads
- Iterate on winners

### 11.4 Rate Limiting
- Facebook limits bulk ad creation
- System handles this with sequential creation
- "Works slowly but you can just put 100 ads"

---

## 12. ITERATION WORKFLOW

### 12.1 Finding Winners
1. Run many static ad variations
2. Facebook identifies resonating ads
3. Identify winning hooks/angles

### 12.2 Iteration Options
- **Same hook, new images**: Test visual variations
- **Same angle, new hooks**: Test message variations
- **Same USP, new angles**: Test positioning variations
- **Winning hook → Video ad**: Scale up successful message

### 12.3 Scale Strategy
- Static ads for rapid testing
- Video ads for scaling winners
- Continuous iteration cycle

---

## 13. TECHNICAL ARCHITECTURE

### 13.1 Frontend: Google Sheets
- **Purpose**: Data input and management interface
- **Contains**:
  - Brand description
  - Product description
  - Voice of customer/gold nuggets
  - USP list
  - Marketing angles list
  - Hook generation controls
  - Template selection
  - Ad creation controls

### 13.2 Backend: Make.com (formerly Integromat)
- **Purpose**: Automation and orchestration
- **Functions**:
  - Webhook receivers (triggered by sheet buttons)
  - AI API connections (Claude/ChatGPT)
  - Prompt assembly and execution
  - Data routing between services
  - Facebook Ads API integration
  - Templated API integration

### 13.3 AI Services
- **Claude (Anthropic)**: Text generation
- **ChatGPT (OpenAI)**: Text generation
- **Purpose**:
  - Extract quotes from reviews
  - Generate USPs
  - Generate marketing angles
  - Generate hooks
  - Generate video scripts

### 13.4 Image Generation: Templated
- API-accessible template tool
- Dynamic text overlay on images
- Auto-fit text sizing
- Batch generation capability

### 13.5 Video Production: Icon
- B-roll matching to scripts
- AI voice-over generation
- Script segmentation
- Video assembly

### 13.6 Ad Platform: Facebook Ads
- API integration for ad creation
- Campaign/ad set management
- Ad performance tracking

---

## 14. TOOLS & SERVICES MENTIONED

| Tool | Purpose | Integration Method |
|------|---------|-------------------|
| Google Sheets | Frontend/UI | Native |
| Make.com | Backend automation | Webhooks, APIs |
| Claude/Anthropic | AI text generation | API via Make.com |
| ChatGPT/OpenAI | AI text generation | API via Make.com |
| Templated | Image template generation | API via Make.com |
| Icon | Video production | Manual/API |
| Facebook Ads | Ad delivery platform | API via Make.com |
| Google Docs | Script output/editing | Integration |

---

## 15. DATA FLOWS

### 15.1 Context → USPs
```
[Brand Desc] + [Product Desc] + [Voice of Customer]
    → AI Prompt
    → Generated USPs
    → Stored in Sheet
```

### 15.2 USP → Angles
```
[Selected USP] + [Full Context]
    → AI Prompt
    → Generated Angles
    → Stored in Sheet
```

### 15.3 Angle → Hooks
```
[USP] + [Angle] + [Awareness] + [Sophistication] + [Framework] + [Examples]
    → AI Prompt
    → Generated Hooks
    → Human Review
    → Selected Hooks
```

### 15.4 Hooks → Static Ads
```
[Selected Hooks] + [Selected Templates]
    → Templated API
    → Generated Images
    → Stored/Ready for Push
```

### 15.5 Static Ads → Facebook
```
[Generated Images] + [Selected Ad Set]
    → Facebook Ads API
    → Created Ads (sequential)
```

### 15.6 Winning Hook → Video Script
```
[Winning Hook] + [Parameters] + [Ad Inspiration]
    → AI Prompt
    → Generated Script
    → Google Doc
```

### 15.7 Script → Video Ad
```
[Script] + [B-roll Library]
    → Icon Tool
    → Matched Footage
    → AI Voice-over
    → Complete Video
```

---

## 16. KEY QUOTES FROM TRANSCRIPT

1. "The goal is to test specific ways of communicating positioning rather than trying to communicate everything at once"

2. "It generates something and then you can select... it's not AI testing thousands and thousands of ads without control"

3. "You can generate like 20 good ads per day minimum with a small team using this method"

4. "We actually can make a system out of it. We actually can use different parameters that we can test in a structured way"

5. "We will logically find the right combination that works with our customers"

---

## 17. IMPLEMENTATION PRIORITIES

### Phase 1: Core Infrastructure
1. Context management (brand, product, voice)
2. USP storage and management
3. Marketing angle generation
4. Hook generation with parameters

### Phase 2: Ad Creation
1. Template management
2. Static ad generation (Templated integration)
3. Human review workflow
4. Batch processing

### Phase 3: Platform Integration
1. Facebook Ads API connection
2. Ad set selection
3. Sequential ad push
4. Rate limiting handling

### Phase 4: Video Extension
1. Script generation from winners
2. Icon integration (or alternative)
3. B-roll management
4. Voice-over generation

### Phase 5: Analytics & Iteration
1. Winner identification
2. Iteration workflows
3. Performance tracking
4. A/B test management

---

## 18. MISSING/UNCLEAR ELEMENTS

1. **Exact prompt templates** - Not shown in detail
2. **Hook database structure** - Mentioned but not shown
3. **Templated exact workflow** - API specifics not detailed
4. **Facebook API rate limits** - Exact numbers not specified
5. **Icon integration method** - Manual vs API unclear
6. **Analytics/tracking** - Not covered in detail
7. **Pricing/costs** - Not discussed

---

## 19. RELATED RESOURCES MENTIONED

1. Voice mining framework video (separate)
2. Beginner marketing video (simpler approach, no automation)
3. Templated tool (link in description)
4. Icon tool (link in description)

---

*Document created for implementation reference. All concepts extracted from transcript dated [timestamp range: 00:00:00 - 00:38:16]*
