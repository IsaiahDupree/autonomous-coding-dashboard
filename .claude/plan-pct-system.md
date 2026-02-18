# Implementation Plan: Programmatic Creative Testing System

## Current State Assessment

### Already Built (fully implemented code exists):

**Backend:**
- `backend/src/routes/pct.ts` - Complete REST API (1011 lines) with all CRUD operations for brands, products, VoC, USPs, angles, hooks, templates, generated ads, video scripts, and stats
- `backend/src/services/ai-generation.ts` - AI service using Claude API for USP generation, angle generation, hook generation, and video script generation
- `backend/prisma/schema.prisma` - Full data model with 9 PCT tables (all created in PostgreSQL)
- PCT route is mounted at `/api/pct` in `backend/src/index.ts:96`

**Frontend:**
- `dashboard/lib/creative-api.ts` - Complete API client with TypeScript interfaces and all API methods
- `dashboard/app/creative-testing/layout.tsx` - Sidebar navigation with 8 modules
- `dashboard/app/creative-testing/page.tsx` - Overview dashboard
- `dashboard/app/creative-testing/brands/page.tsx` - Brand list & creation
- `dashboard/app/creative-testing/brands/[id]/page.tsx` - Brand detail, products, VoC
- `dashboard/app/creative-testing/usps/page.tsx` - USP management & angle generation
- `dashboard/app/creative-testing/hooks/page.tsx` - Hook library with filtering
- `dashboard/app/creative-testing/hooks/generate/page.tsx` - Hook generator
- `dashboard/app/creative-testing/templates/page.tsx` - Template management
- `dashboard/app/creative-testing/ads/page.tsx` - Ad generation & gallery
- `dashboard/app/creative-testing/scripts/page.tsx` - Video script generation

**Infrastructure:**
- PostgreSQL running (Docker, port 5433) with all 9 PCT tables created
- Redis configured (port 6379)

### Not Currently Running:
- Backend server (port 3434) - needs to be started
- Next.js dashboard (port 3535) - needs to be started

## What Needs To Be Done

### Phase 1: Get the system running and verify end-to-end functionality

1. **Start the backend server** - Ensure `npm run dev` works in backend/
2. **Start the Next.js dashboard** - Ensure `npm run dev` works in dashboard/
3. **Verify API connectivity** - Test /api/pct/stats endpoint
4. **Verify frontend renders** - Load /creative-testing in browser
5. **Test the complete workflow end-to-end**:
   - Create a brand
   - Add a product
   - Add VoC gold nuggets
   - Generate USPs
   - Generate marketing angles
   - Generate hooks with parameter selection
   - Review hooks (approve/reject)
   - Create a template
   - Generate ads
   - Generate video scripts

### Phase 2: Fix any issues found during testing

Based on the code review, likely issues:
- CORS configuration between dashboard (3535) and backend (3434)
- Environment variables (ANTHROPIC_API_KEY for AI generation)
- Canvas rendering for ad generation (browser-side with HTML Canvas API)
- Prisma client generation may need `npx prisma generate`

### Phase 3: Implement missing P0 features from the feature list

Cross-referencing with FEATURES document, the following P0 items need verification:
- F1.1.1 ✅ Brand profile form
- F1.2.1 ✅ Product entry form
- F1.3.1 ✅ VoC gold nugget entry
- F2.1.2 ✅ Manual USP entry
- F2.2.1 ✅ Generate angles from USP
- F3.1.1 ✅ Messaging framework library
- F3.2.1 ✅ Awareness level selector
- F3.3.1 ✅ Sophistication level selector
- F4.1.1 ✅ Single hook generation
- F4.1.2 ✅ Batch hook generation
- F4.2.1-F4.2.4 ✅ Hook review interface
- F9.2.2 ✅ AI API integration (Claude)

All P0 features appear to be implemented in code.

### Phase 4: Enhancements and Polish

Items not yet implemented from the feature list:
- F1.1.2 Brand voice tone selector (visual selector - currently just text input)
- F1.1.3 Brand guidelines upload (logo, colors, fonts)
- F1.1.4 Multi-brand support with switching
- F1.3.2 Customer review import (CSV bulk import)
- F2.1.1 AI-powered USP generation (exists but should be verified)
- F3.1.2 Custom framework creation
- F3.2.3 Awareness-appropriate prompt injection (exists in backend)
- F4.2.5 Parameter filter sidebar (exists in hook library)
- F4.2.8 Export hooks to CSV/JSON
- F4.3.1-F4.3.6 Hook library features (partially implemented)
- F5.1.2 Text zone drag-and-drop (currently form-based)

## Recommended Approach

Start with Phase 1 (get it running), verify functionality through Phase 2, then let the user decide which Phase 3/4 features to prioritize.
