# PCT Agent Task Definitions
# Task-Ready Features for ACD Agent Processing

**Project:** Programmatic Creative Testing System  
**Total Features:** 68  
**Status:** Ready for Agent Assignment

---

## Task Organization by Priority & Dependency

### Priority 1 - Foundation (Must Complete First)

#### Database Tasks (No Dependencies)

| Task ID | Feature | Agent Task Description | Acceptance Criteria | Estimated Effort |
|---------|---------|------------------------|---------------------|------------------|
| PCT-036 | Brand/Product Tables | Create Supabase migration for `pct_brands` and `pct_products` tables with proper relationships and indexes | Tables exist, FK constraints work, indexes on common queries | 1-2 hours |
| PCT-037 | USP/Angle Tables | Create Supabase migration for `pct_usps` and `pct_marketing_angles` tables | Tables exist, link to products, status fields work | 1-2 hours |
| PCT-038 | Hook Table | Create Supabase migration for `pct_hooks` table with all parameter tracking fields | Table exists, links to angles/frameworks, status/rating fields | 1-2 hours |
| PCT-064 | Hook Examples Table | Create `pct_hook_examples` table and seed with 100+ initial examples | Table exists, seeded with categorized examples | 2-3 hours |

#### UI Foundation Tasks (Depends on: Database)

| Task ID | Feature | Agent Task Description | Acceptance Criteria | Estimated Effort |
|---------|---------|------------------------|---------------------|------------------|
| PCT-041 | Main Dashboard Layout | Create PCT module navigation in ACD dashboard with brand/product selector | Navigation works, selector populates from DB | 3-4 hours |
| PCT-042 | Context Input Wizard | Build step-by-step onboarding: Brand → Product → VoC | Wizard flow completes, data saves to DB | 4-6 hours |

#### Context Input Tasks (Depends on: Database + UI)

| Task ID | Feature | Agent Task Description | Acceptance Criteria | Estimated Effort |
|---------|---------|------------------------|---------------------|------------------|
| PCT-001 | Brand Profile | Create brand profile form with name, description, voice tone selector | Form validates, saves to `pct_brands`, multi-brand switching works | 3-4 hours |
| PCT-002 | Product Catalog | Create product entry form linked to brand | Form validates, saves to `pct_products`, images upload | 3-4 hours |
| PCT-003 | VoC Gold Nuggets | Create manual gold nugget entry with source tracking | Entry form works, pain/desire categorization, saves to DB | 2-3 hours |

---

### Priority 1 - Core Generation (Depends on: Foundation)

#### Parameter System Tasks

| Task ID | Feature | Agent Task Description | Acceptance Criteria | Estimated Effort |
|---------|---------|------------------------|---------------------|------------------|
| PCT-006 | Messaging Frameworks | Create messaging framework selector with 8+ pre-built options (punchy, bold, desire, etc.) | Dropdown with options, examples preview, custom creation | 2-3 hours |
| PCT-007 | Awareness Selector | Create visual awareness funnel (5 levels) with descriptions | Visual display, level selection, multi-select for batch | 2-3 hours |
| PCT-008 | Sophistication Selector | Create market sophistication selector (5 levels) with strategies | Level selector with guidance text, industry defaults | 2-3 hours |

#### USP/Angle Generation Tasks

| Task ID | Feature | Agent Task Description | Acceptance Criteria | Estimated Effort |
|---------|---------|------------------------|---------------------|------------------|
| PCT-004 | USP Management | Create USP management UI with manual entry and AI generation button | Manual entry works, AI generates 3-5 USPs from context, saves to DB | 4-6 hours |
| PCT-005 | Angle Generation | Create marketing angle generator from selected USP | Generate 5-10 angles per USP, categorization dropdown, approval workflow | 4-6 hours |

#### Hook Generation Tasks

| Task ID | Feature | Agent Task Description | Acceptance Criteria | Estimated Effort |
|---------|---------|------------------------|---------------------|------------------|
| PCT-009 | Single Hook Generation | Create hook generation with parameter preview | Generates from USP+angle+params, shows source, regenerate button | 3-4 hours |
| PCT-010 | Batch Hook Generation | Add batch generation (10, 25, 50, 100) with progress | Batch selector, progress indicator, matrix support | 3-4 hours |
| PCT-011 | Hook Review UI | Create card-based hook review with approve/reject | Card display, toggle per hook, inline editing | 4-6 hours |
| PCT-063 | Hook Examples Integration | Inject relevant example hooks into AI prompts during generation | Examples pulled by framework, 5-10 per generation, improves output | 2-3 hours |

---

### Priority 2 - Static Ads (Depends on: Core Generation)

#### Integration Tasks

| Task ID | Feature | Agent Task Description | Acceptance Criteria | Estimated Effort |
|---------|---------|------------------------|---------------------|------------------|
| PCT-032 | AI API Integration | Configure Claude/OpenAI API with key management and model selection | API key storage, model selector, error handling, retry logic | 3-4 hours |
| PCT-033 | Image API Integration | Integrate Templated.io API for image generation | API connection, text overlay works, batch support | 4-6 hours |
| PCT-055 | Templated.io Deep Integration | Sync templates, auto-fit text sizing, batch rendering | Template sync, auto-fit verified, batch queue works | 4-6 hours |

#### Template Tasks

| Task ID | Feature | Agent Task Description | Acceptance Criteria | Estimated Effort |
|---------|---------|------------------------|---------------------|------------------|
| PCT-014 | Template Upload | Create template upload interface with preview | Image upload, preview display, library organization | 3-4 hours |
| PCT-015 | Text Zone Definition | Create drag-and-drop text zone tool | Zone definition works, font config per zone, preview with sample | 6-8 hours |
| PCT-016 | Ad Size Management | Add standard sizes (1080x1080, etc.) and custom sizes | Size library, custom definition, multi-size generation | 2-3 hours |
| PCT-039 | Template DB Tables | Create `pct_templates` and `pct_generated_ads` tables | Tables exist, zone config JSONB, image URL storage | 1-2 hours |
| PCT-068 | Image Masking Tool | Create product image masking for template creation | Upload images, mask text areas, define placeholders | 6-8 hours |

#### Image Generation Tasks

| Task ID | Feature | Agent Task Description | Acceptance Criteria | Estimated Effort |
|---------|---------|------------------------|---------------------|------------------|
| PCT-017 | Hook-to-Template Application | Apply selected hooks to templates with auto-fit | Hooks render on templates, text sizing auto-adjusts | 3-4 hours |
| PCT-018 | Batch Image Generation | Generate all hook × template combinations | Matrix generation, progress indicator, ZIP download | 4-6 hours |
| PCT-019 | Image Review Gallery | Create gallery view with approve/reject per image | Gallery display, approval toggle, side-by-side compare | 3-4 hours |

#### Additional Hook Features

| Task ID | Feature | Agent Task Description | Acceptance Criteria | Estimated Effort |
|---------|---------|------------------------|---------------------|------------------|
| PCT-012 | Hook Filtering | Add filter by USP, angle, framework; sort options | Filter sidebar, sort dropdown, bulk select | 2-3 hours |
| PCT-013 | Hook Library | Persistent hook storage with search and export | DB storage, search works, CSV/JSON export | 2-3 hours |
| PCT-047 | API Key Management | Secure API key storage with connection testing | Keys encrypted, test buttons, rotation support | 2-3 hours |
| PCT-050 | Performing Hooks Feedback | Feed winning hooks back to example database | Winner detection, auto-add to examples, track improvements | 3-4 hours |
| PCT-053 | Psychological Triggers | Add trigger selector (curiosity, fear, etc.) | Trigger options, inject into prompts, track performance | 2-3 hours |
| PCT-054 | Copywriter Styles | Add style reference selector (Ogilvy, Schwartz, etc.) | Style options, prompt templates, preview tone | 2-3 hours |

---

### Priority 3 - Deployment (Depends on: Static Ads)

#### Meta Integration Tasks

| Task ID | Feature | Agent Task Description | Acceptance Criteria | Estimated Effort |
|---------|---------|------------------------|---------------------|------------------|
| PCT-020 | Meta OAuth | Implement Meta Business OAuth (via WaitlistLab bridge) | OAuth flow works, ad account selection, permissions verified | 6-8 hours |
| PCT-021 | Campaign Browser | Create campaign/ad set browser and selector | List campaigns, list ad sets, target selection | 4-6 hours |
| PCT-034 | Meta Marketing API | Full Meta API integration for CRUD and performance | Campaign ops, ad creation, insights retrieval | 8-12 hours |
| PCT-040 | Meta Mirror Tables | Create Campaign, AdSet, Ad mirror tables | Tables exist, Meta IDs stored, sync timestamps | 2-3 hours |
| PCT-060 | WaitlistLab Bridge | Create shared Meta API service using WaitlistLab OAuth | Service interface, shared tokens, unified campaigns | 6-8 hours |

#### Ad Push Tasks

| Task ID | Feature | Agent Task Description | Acceptance Criteria | Estimated Effort |
|---------|---------|------------------------|---------------------|------------------|
| PCT-022 | Ad Push with Rate Limiting | Batch ad creation with queue and rate limiting | Batch push works, rate limit respected, queue management | 4-6 hours |
| PCT-023 | Ad Status Sync | Pull and display ad status from Meta | Status pull, review status display, live preview link | 3-4 hours |
| PCT-056 | Ad Creation Queue | Detailed queue with progress for batch deployments | One-by-one creation, configurable rate, retry on failure | 4-6 hours |
| PCT-045 | Deployment Manager UI | Campaign tree view with ad queue and push controls | Tree view, status display, push buttons | 4-6 hours |

---

### Priority 3 - Analytics (Depends on: Deployment)

#### Performance Tasks

| Task ID | Feature | Agent Task Description | Acceptance Criteria | Estimated Effort |
|---------|---------|------------------------|---------------------|------------------|
| PCT-024 | Performance Import | Import metrics from Meta (CTR, CPC, ROAS) | Metrics fetch, link to ads, scheduled refresh | 4-6 hours |
| PCT-025 | Winner Identification | Algorithm to identify top performers with thresholds | Winner algorithm, configurable threshold, tagging | 3-4 hours |
| PCT-026 | Insights Dashboard | Display top USPs, angles, frameworks with charts | Charts render, top performers highlighted | 6-8 hours |
| PCT-046 | Analytics View UI | Full analytics and insights view | Performance charts, winner highlights, correlations | 6-8 hours |
| PCT-059 | Parameter Correlation | Correlate USP/angle/framework to performance | Correlation analysis, visual display, insights | 4-6 hours |

#### Iteration Tasks

| Task ID | Feature | Agent Task Description | Acceptance Criteria | Estimated Effort |
|---------|---------|------------------------|---------------------|------------------|
| PCT-027 | Create More Like Winner | Button to generate variations of winning ads | Copies winning params, generates new hooks | 3-4 hours |
| PCT-028 | Winning Angle Expansion | Generate more hooks for winning angles | Angle identification, new hook generation | 3-4 hours |
| PCT-057 | New Images for Winners | Generate new image variations for winning hooks | Select winners, new templates, A/B setup | 3-4 hours |
| PCT-058 | New Hooks for Angles | Fresh hooks for same winning angles | Maintain tracking, fresh generation | 3-4 hours |
| PCT-048 | Parameter Presets | Save and apply favorite parameter combinations | Save presets, quick-apply, team sharing | 2-3 hours |

---

### Priority 4 - Video (Depends on: Analytics)

#### Script Generation Tasks

| Task ID | Feature | Agent Task Description | Acceptance Criteria | Estimated Effort |
|---------|---------|------------------------|---------------------|------------------|
| PCT-029 | Video Script Generation | Generate full scripts from winning hooks | Script from hook, structure (hook→lid→body→CTA), duration targeting | 4-6 hours |
| PCT-030 | Script Editor | Section-by-section editing with word count | Section editing, word count, reading time, Docs export | 4-6 hours |
| PCT-031 | Advanced Script Params | Add psychological trigger, emotion, copywriter style for scripts | Parameter selectors, inject into prompts | 2-3 hours |
| PCT-066 | Narrator Styles | Add narrator/spokesperson style selector | Brand spokesperson, expert, testimonial options | 2-3 hours |
| PCT-067 | Ad Inspiration Reference | Upload/link reference ads for structure analysis | Reference upload, AI analysis, pattern following | 4-6 hours |

#### Video Production Tasks

| Task ID | Feature | Agent Task Description | Acceptance Criteria | Estimated Effort |
|---------|---------|------------------------|---------------------|------------------|
| PCT-051 | Mini VSSL Generation | Text-based video ads with AI voiceover | Text-on-screen format, voiceover integration | 6-8 hours |
| PCT-052 | B-Roll Matching (Icon) | Upload B-roll, AI matches to script segments | B-roll upload, script segmentation, auto-matching | 8-12 hours |
| PCT-061 | Remotion Integration | Connect Remotion for video rendering | Render service connection, template-based generation, batch queue | 8-12 hours |

---

### Priority 4 - VoC & Automation (Can Parallel with Other P4)

| Task ID | Feature | Agent Task Description | Acceptance Criteria | Estimated Effort |
|---------|---------|------------------------|---------------------|------------------|
| PCT-049 | Voice Mining Framework | AI agents scan Reddit, forums, Amazon for insights | Source scanning, auto-extraction, categorization | 12-16 hours |
| PCT-065 | Gold Nugget Extraction | AI-powered quote extraction from raw reviews | Quote extraction, pain/desire categorization, source tracking | 4-6 hours |
| PCT-035 | Webhook Endpoints | Create incoming/outgoing webhook endpoints | Incoming triggers, outgoing notifications, auth | 4-6 hours |
| PCT-062 | Make.com Compatibility | Webhook layer compatible with Make.com scenarios | Make.com compatible, logging, auth | 3-4 hours |
| PCT-043 | Hook Generation Workspace UI | Full workspace with parameter sidebar and actions | Parameter sidebar, generated hooks area, toolbar | 6-8 hours |
| PCT-044 | Creative Studio UI | Template + hook combination preview | Combination view, multiple sizes, batch selection | 6-8 hours |

---

## Dependency Graph

```
[Database Tables] ─────────────────────────────────────────────┐
       │                                                        │
       ▼                                                        │
[UI Foundation] ──────────────────────────────────┐            │
       │                                           │            │
       ▼                                           │            │
[Context Input] ────────┐                         │            │
       │                │                         │            │
       ▼                ▼                         │            │
[Parameters] ───► [USP/Angle Gen] ──► [Hook Gen] │            │
                                           │      │            │
                                           ▼      ▼            │
                              [AI Integration] ◄──┘            │
                                           │                    │
                                           ▼                    │
                         [Template Management] ◄────────────────┘
                                           │
                                           ▼
                              [Image Generation]
                                           │
                                           ▼
                         [Meta Integration / Bridge]
                                           │
                                           ▼
                                   [Ad Push Queue]
                                           │
                                           ▼
                              [Performance Import]
                                           │
                                           ▼
                              [Analytics Dashboard]
                                           │
                                           ▼
                              [Iteration Workflows]
                                           │
                                           ▼
                              [Video Script Gen]
                                           │
                                           ▼
                              [Video Production]
```

---

## Sprint Planning Suggestion

### Sprint 1 (Week 1-2): Database + UI Foundation
- PCT-036, PCT-037, PCT-038, PCT-064 (Database)
- PCT-041, PCT-042 (UI Foundation)
- PCT-001, PCT-002, PCT-003 (Context Input)

### Sprint 2 (Week 3-4): Parameters + Generation
- PCT-006, PCT-007, PCT-008 (Parameters)
- PCT-004, PCT-005 (USP/Angle)
- PCT-009, PCT-010, PCT-011, PCT-063 (Hooks)
- PCT-032 (AI Integration)

### Sprint 3 (Week 5-6): Static Ads
- PCT-033, PCT-055 (Image API)
- PCT-014, PCT-015, PCT-016, PCT-039 (Templates)
- PCT-017, PCT-018, PCT-019 (Image Generation)

### Sprint 4 (Week 7-8): Deployment
- PCT-020, PCT-060 (Meta OAuth/Bridge)
- PCT-021, PCT-034, PCT-040 (Campaign Management)
- PCT-022, PCT-023, PCT-056, PCT-045 (Ad Push)

### Sprint 5 (Week 9-10): Analytics
- PCT-024, PCT-025, PCT-026, PCT-046, PCT-059 (Analytics)
- PCT-027, PCT-028, PCT-057, PCT-058 (Iteration)

### Sprint 6 (Week 11-12): Video + Polish
- PCT-029, PCT-030, PCT-031, PCT-066, PCT-067 (Scripts)
- PCT-051, PCT-052, PCT-061 (Video Production)
- PCT-049, PCT-065 (VoC Automation)

---

## Agent Assignment Notes

Each task should be assigned to an agent with:
1. **Clear context**: Reference PRD section and feature list entry
2. **Dependencies met**: Verify prerequisite tasks complete
3. **Test criteria**: Specific acceptance tests to verify
4. **Time box**: Estimated effort as guide
5. **Rollback plan**: How to revert if task fails

---

*Document ready for ACD agent task assignment.*
