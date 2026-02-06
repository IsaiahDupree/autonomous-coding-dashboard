# Implementation Decision Document
# Programmatic Creative Testing (PCT) System

**Date:** January 2025  
**Status:** Decision Required  
**Author:** ACD System Analysis

---

## 1. Decision Context

The Programmatic Creative Testing system needs to be implemented. Four architectural options have been identified in the Extended PRD. This document provides a detailed analysis to support the final implementation decision.

---

## 2. Options Summary

| Option | Description | Recommendation |
|--------|-------------|----------------|
| A | Standalone Remotion Suite Extension | ⚠️ Partial Fit |
| B | New Standalone Instance | ✅ Good for MVP |
| C | WaitlistLab Meta Connectivity Integration | ✅ Recommended |
| D | Hybrid ACD-Integrated Approach | ✅✅ Best Option |

---

## 3. Detailed Analysis

### Option A: Remotion Suite Extension

**Architecture:**
```
Existing Remotion Suite
    └── Add PCT Module
        └── Video Generation (existing)
        └── Static Ad Generation (new)
        └── Hook Generation (new)
```

**Pros:**
- Leverages existing video rendering infrastructure
- Shared component library (React, styling)
- Established CI/CD pipeline
- Team familiarity with codebase

**Cons:**
- Remotion optimized for video composition, not static images
- Core PCT workflow (hooks, static ads) doesn't need video rendering
- May add unnecessary complexity to Remotion codebase
- Different primary use case (video creation vs ad testing)

**Technical Fit Analysis:**
| Capability | Remotion Has | PCT Needs | Match |
|------------|--------------|-----------|-------|
| Video rendering | ✅ | ✅ (Phase 5 only) | Partial |
| Static image generation | ❌ | ✅ | No |
| AI text generation | ❌ | ✅ | No |
| Meta API integration | ❌ | ✅ | No |
| Template management | Partial | ✅ | Partial |

**Verdict:** Only suitable for Phase 5 (video scaling). Not recommended for core system.

---

### Option B: New Standalone Instance

**Architecture:**
```
New PCT Application (Standalone)
    ├── Frontend (React/Next.js)
    ├── Backend (Node.js/Express or Python)
    ├── Database (PostgreSQL/Supabase)
    ├── AI Service Layer
    └── External Integrations
        ├── Meta Marketing API
        ├── Templated.io
        └── OpenAI/Anthropic
```

**Pros:**
- Clean architecture without legacy constraints
- Technology choices optimized for PCT requirements
- Independent scaling and deployment
- No risk of breaking existing systems

**Cons:**
- Duplicated infrastructure (auth, database, hosting)
- No shared state with ACD dashboard
- Additional maintenance burden
- Separate user accounts/sessions

**Cost Estimate:**
| Component | Monthly Cost |
|-----------|--------------|
| Hosting (Vercel/Railway) | $20-50 |
| Database (Supabase) | $25+ |
| AI API costs | Variable |
| **Total Infrastructure** | **$45-75+** |

**Verdict:** Good for rapid MVP if integration complexity is a concern.

---

### Option C: WaitlistLab Meta Connectivity Integration

**Architecture:**
```
WaitlistLab Application
    ├── Existing Meta OAuth Layer ← Reuse
    ├── Existing Campaign Management ← Extend
    └── New PCT Module
        ├── Context Management
        ├── USP/Angle/Hook Generation
        ├── Ad Creation Workflow
        └── Performance Sync
```

**Pros:**
- Existing Meta OAuth and API infrastructure ready
- Shared ad account management already built
- User base familiar with Meta workflows
- Campaign management UI exists

**Cons:**
- WaitlistLab's primary purpose (waitlist/signup) differs from PCT
- May require significant refactoring of existing code
- Tighter coupling could introduce bugs in stable system
- Different user journey expectations

**Technical Synergies:**
| WaitlistLab Feature | PCT Benefit |
|---------------------|-------------|
| Meta OAuth | Direct reuse |
| Campaign browser | Extend for ad sets |
| Ad account selector | Direct reuse |
| Performance API | Direct reuse |
| User auth | Direct reuse |

**Verdict:** Best option for Meta API operations. Strong synergy.

---

### Option D: Hybrid ACD-Integrated Approach (RECOMMENDED)

**Architecture:**
```
┌─────────────────────────────────────────────────────────────────┐
│                    ACD Dashboard (Primary Host)                  │
├─────────────────────────────────────────────────────────────────┤
│  Existing Modules          │  NEW: PCT Module                   │
│  ├── Project Manager       │  ├── Context Manager               │
│  ├── Feature Tracking      │  ├── USP/Angle Manager             │
│  ├── Agent Harness         │  ├── Hook Generation Engine        │
│  └── Metrics Dashboard     │  ├── Template Studio               │
│                            │  ├── Ad Creator                    │
│                            │  └── Performance Analytics         │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
┌─────────────────────────┐  ┌─────────────────────────┐
│    Shared Supabase DB   │  │   External Services     │
│  ├── ACD tables         │  │  ├── OpenAI/Anthropic   │
│  └── PCT tables (new)   │  │  ├── Templated.io      │
└─────────────────────────┘  │  └── WaitlistLab Meta   │
                              │       API Bridge         │
                              └─────────────────────────┘
```

**Pros:**
- Leverages existing ACD infrastructure (auth, DB, hosting, UI)
- Shared Supabase database enables cross-module analytics
- Consistent user experience within ACD ecosystem
- WaitlistLab provides Meta API without tight coupling
- Remotion available for Phase 5 video rendering
- Single deployment pipeline

**Cons:**
- Adds complexity to ACD codebase
- Requires coordination across multiple systems
- PCT failures could impact ACD dashboard (mitigated with feature flags)

**Integration Points:**
| System | Integration Method | Data Shared |
|--------|-------------------|-------------|
| ACD Dashboard | Native module | User auth, projects |
| Supabase | Direct connection | All PCT data |
| WaitlistLab | API bridge/service | Meta OAuth tokens, campaigns |
| Remotion | API call (Phase 5) | Video render jobs |
| OpenAI/Anthropic | Direct API | None |
| Templated.io | Direct API | None |

**Implementation Phases:**
```
Phase 1 (Weeks 1-4): Core in ACD
├── Database schema migration
├── Context management UI
├── USP/Angle generation
└── Hook generation engine

Phase 2 (Weeks 5-6): Static Ads
├── Templated.io integration
├── Template management UI
└── Batch image generation

Phase 3 (Weeks 7-8): Deployment
├── WaitlistLab Meta API bridge
├── Campaign/AdSet browser
└── Ad push with rate limiting

Phase 4 (Weeks 9-10): Analytics
├── Performance data import
├── Winner identification
└── Iteration workflows

Phase 5 (Weeks 11-12): Video
├── Script generation
├── Remotion integration
└── B-roll/voiceover assembly
```

**Verdict:** ✅✅ BEST OPTION - Maximizes infrastructure reuse while maintaining clean architecture.

---

## 4. Decision Matrix

| Criteria | Weight | Option A | Option B | Option C | Option D |
|----------|--------|----------|----------|----------|----------|
| Infrastructure reuse | 20% | 3 | 1 | 4 | 5 |
| Development speed | 20% | 2 | 4 | 3 | 4 |
| Meta API capability | 25% | 1 | 3 | 5 | 5 |
| Maintenance burden | 15% | 3 | 2 | 3 | 4 |
| Scalability | 10% | 4 | 4 | 3 | 4 |
| User experience | 10% | 2 | 3 | 3 | 5 |
| **Weighted Score** | 100% | **2.3** | **2.8** | **3.7** | **4.5** |

---

## 5. Recommendation

**Proceed with Option D: Hybrid ACD-Integrated Approach**

### Rationale:
1. **Maximum Reuse**: Leverages ACD dashboard, Supabase, WaitlistLab Meta, and Remotion
2. **Unified Experience**: Users stay within ACD ecosystem
3. **Shared Data**: Cross-module analytics possible (e.g., agent performance on PCT tasks)
4. **Incremental Delivery**: Can launch core features (hooks, static ads) before full deployment integration
5. **Future-Proof**: Architecture supports expansion to other ad platforms

### Key Dependencies:
- [ ] ACD dashboard deployed and stable
- [ ] Supabase connection established
- [ ] WaitlistLab Meta API accessible (create service bridge)
- [ ] Templated.io API key obtained
- [ ] AI API keys configured (OpenAI/Anthropic)

### Risk Mitigation:
| Risk | Mitigation |
|------|------------|
| ACD instability | Feature flags to disable PCT module |
| WaitlistLab API changes | Abstraction layer with fallback |
| Meta rate limits | Queue management with backoff |
| AI API costs | Budget alerts, usage caps |

---

## 6. Next Steps

1. **Confirm Decision** - Review with stakeholders
2. **Create ACD Project Entry** - Add PCT to project list with 68 features
3. **Database Migration** - Run PCT schema on Supabase
4. **WaitlistLab Bridge** - Design Meta API service interface
5. **Begin Phase 1** - Context management and hook generation

---

## 7. Appendix: Technical Specifications

### Database Tables Required
```
pct_brands
pct_products
pct_voice_of_customer
pct_usps
pct_marketing_angles
pct_messaging_frameworks
pct_hooks
pct_hook_examples
pct_templates
pct_generated_ads
pct_scripts
pct_performance_metrics
```

### API Endpoints Required
```
POST   /api/pct/brands
POST   /api/pct/products
POST   /api/pct/voc
POST   /api/pct/usps/generate
POST   /api/pct/angles/generate
POST   /api/pct/hooks/generate
POST   /api/pct/ads/generate
POST   /api/pct/ads/deploy
GET    /api/pct/performance
POST   /api/pct/scripts/generate
```

### External API Integrations
```
Anthropic/OpenAI: Text generation
Templated.io: Image rendering
Meta Marketing API: Ad deployment (via WaitlistLab)
```

---

*Document prepared for implementation planning. Proceed upon stakeholder approval.*
