# SoftwareHub Products Suite - Software Packaging & Course Delivery

## Project Overview
Package 11 software products into SoftwareHub (Portal28 clone) for licensing, course delivery, and sale. Products range from 0% to 100% complete and need to be finished, packaged with Electron GUIs, integrated with licensing, and paired with video courses.

## Reference Documents
- Developer Handoff: `/Users/isaiahdupree/Documents/Software/WaitlistLabapp/waitlist-lab/docs/DEVELOPER_HANDOFF.md`
- Feature List: `/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/docs/feature_list_softwarehub_products.json`
- PRDs Location: `/Users/isaiahdupree/Documents/Software/WaitlistLabapp/waitlist-lab/docs/PRDs/`
- SoftwareHub PRD: `/Users/isaiahdupree/Documents/Software/SoftwareHub/docs/PRD.md`

## Product Inventory

### Ready for Packaging (100% Complete)
| Product | Codebase | PRD | Pricing |
|---------|----------|-----|---------|
| **Watermark Remover** | `/Safari Automation/` (BlankLogo) | `PRD_WATERMARK_REMOVER.md` | $49/$99/$249 one-time |
| **EverReach CRM** | `/Safari Automation/packages/crm-core/` | (in master inventory) | $29/$79 monthly |

### Near Complete (80-95%)
| Product | Status | Codebase | PRD |
|---------|--------|----------|-----|
| **Auto Comment** | 95% | `/Safari Automation/packages/unified-comments/` | `PRD_AUTO_COMMENT.md` |
| **TTS Studio** | 85% | `/Software/TTS/` | `PRD_TTS_STUDIO.md` |
| **Auto DM** | 80% | `/Safari Automation/packages/unified-dm/` | `PRD_AUTO_DM.md` |

### Not Started (0%)
| Product | PRD | Estimated Effort |
|---------|-----|------------------|
| **KaloData Scraper** | `PRD_KALODATA_SCRAPER.md` | 4-6 weeks |
| **Competitor Research** | `PRD_COMPETITOR_RESEARCH.md` | 6-8 weeks |

## Development Priority Order

### Phase 1: Quick Wins (Weeks 1-2)
```
WR-001 → WR-005: Package Watermark Remover
CRM-001 → CRM-005: Host EverReach CRM
LIC-001 → LIC-003: Core licensing system
COURSE-001 → COURSE-003: Course delivery basics
```

### Phase 2: High-Value Products (Weeks 3-6)
```
AC-001 → AC-007: Finish and package Auto Comment
TTS-001 → TTS-008: Build UI and package TTS Studio
DM-001 → DM-010: Finish and package Auto DM
```

### Phase 3: New Development (Weeks 7-12)
```
KD-001 → KD-009: Build KaloData Scraper from PRD
CR-001 → CR-009: Build Competitor Research from PRD
```

### Phase 4: Polish & Extras
```
COURSE-004, COURSE-005: Certificates, Q&A
PKG-001 → PKG-004: Build pipeline, auto-update
MKT-001 → MKT-003: Bundles, coupons, affiliates
```

## Packaging Workflow (Per Product)

```
1. FINISH CORE FUNCTIONALITY
   ├── Complete remaining features
   ├── End-to-end testing
   └── Edge case handling

2. BUILD GUI (if CLI-only)
   ├── Electron app shell
   ├── React frontend
   ├── IPC to backend (Python/Node)
   └── License activation UI

3. INTEGRATE LICENSING
   ├── License key input on first launch
   ├── Validate against SoftwareHub API
   ├── Feature gating by tier
   └── Subscription check (if applicable)

4. CREATE COURSE CONTENT
   ├── Record video lessons (2-4 hours)
   ├── Upload to Mux via SoftwareHub
   ├── Create course structure
   └── Write documentation

5. ADD TO SOFTWAREHUB
   ├── Create product in database
   ├── Set up Stripe products/prices
   ├── Configure download links
   └── Create landing page
```

## License Key Format

```
PRODUCT-XXXX-XXXX-XXXX-XXXX

Examples:
BLANKLOGO-A1B2-C3D4-E5F6-G7H8
AUTOCOMMENT-X9Y8-Z7W6-V5U4-T3S2
TTSSTUDIO-M3N4-O5P6-Q7R8-S9T0
KALODATA-J1K2-L3M4-N5O6-P7Q8
```

## Database Schema (SoftwareHub)

```sql
-- Products
products (
  id UUID PRIMARY KEY,
  name TEXT,
  slug TEXT UNIQUE,
  type TEXT, -- 'desktop_app', 'saas', 'course'
  status TEXT, -- 'draft', 'published'
  features JSONB,
  pricing JSONB
)

-- Licenses  
licenses (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  product_id UUID REFERENCES products(id),
  license_key TEXT UNIQUE,
  type TEXT, -- 'personal', 'pro', 'team', 'lifetime'
  status TEXT, -- 'active', 'expired', 'revoked'
  expires_at TIMESTAMPTZ
)

-- Courses
courses (
  id UUID PRIMARY KEY,
  product_id UUID REFERENCES products(id),
  title TEXT,
  modules JSONB
)

course_progress (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  course_id UUID REFERENCES courses(id),
  completed_lessons TEXT[]
)
```

## Tech Stack

### Desktop Apps (Electron)
- **Framework**: Electron 28+
- **Frontend**: React 18 + Vite
- **Styling**: TailwindCSS + shadcn/ui
- **Backend**: Python (TTS, Watermark) or Node.js
- **IPC**: electron-store, child_process

### SaaS Products (Web)
- **Framework**: Next.js 14
- **Database**: Supabase (Postgres)
- **Auth**: Supabase Auth (shared with SoftwareHub)

### Course Platform (SoftwareHub)
- **Video**: Mux for HLS streaming
- **Payments**: Stripe
- **Email**: Resend

## API Endpoints (Licensing)

```typescript
// Validate license key
POST /api/license/validate
Body: { licenseKey: string, productSlug: string }
Returns: { valid: boolean, tier: string, expiresAt: string }

// Activate license (on first use)
POST /api/license/activate
Body: { licenseKey: string, machineId?: string }
Returns: { activated: boolean, downloadUrl: string }

// Check subscription status
GET /api/license/status
Headers: { Authorization: "Bearer <token>" }
Returns: { licenses: [...], subscriptions: [...] }
```

## Success Metrics

| Metric | Target | Timeframe |
|--------|--------|-----------|
| Products packaged | 5 | Month 2 |
| Courses live | 5 | Month 2 |
| Paid users | 100 | Month 3 |
| MRR | $10,000 | Month 4 |
| Course completion rate | 60% | Ongoing |

## Instructions for Development

1. **Read PRDs before starting** - Each product has detailed specs
2. **Work in priority order** - Quick wins first, then high-value, then new
3. **Test licensing thoroughly** - Users must be able to activate and use
4. **Record courses after product stable** - Don't record too early
5. **Use SoftwareHub components** - Leverage existing UI and auth
6. **Follow license key format** - PRODUCT-XXXX-XXXX-XXXX-XXXX

## Feature IDs Reference

| Product | Feature IDs |
|---------|-------------|
| Watermark Remover | WR-001 to WR-005 |
| Auto Comment | AC-001 to AC-007 |
| Auto DM | DM-001 to DM-010 |
| TTS Studio | TTS-001 to TTS-008 |
| KaloData Scraper | KD-001 to KD-009 |
| Competitor Research | CR-001 to CR-009 |
| EverReach CRM | CRM-001 to CRM-005 |
| Sora Video | SORA-001 to SORA-003 |
| Licensing | LIC-001 to LIC-006 |
| Course Delivery | COURSE-001 to COURSE-005 |
| Packaging | PKG-001 to PKG-004 |
| Marketing | MKT-001 to MKT-003 |
