# Lead Form Management - Meta Lead Forms Reliability System

## Project Overview
Build a reliable lead form creation and management system for Meta ads that eliminates common API failures through preflight validation, proper error handling, and form reuse patterns. This is an extension to the WaitlistLab Ads Autopilot.

## Reference Documents
- PRD: `/Users/isaiahdupree/Documents/Software/WaitlistLabapp/PRD_LEAD_FORM_MANAGEMENT.md`
- Feature List: `/Users/isaiahdupree/Documents/Software/WaitlistLabapp/feature_list_lead_forms.json`
- Architecture: `/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/docs/UNIFIED_PLATFORM_ARCHITECTURE.md`

## Core Principle: Reuse Over Clone

> **Key Insight**: Meta lead forms are designed to be reused across many ads/campaigns. The most reliable approach is to maintain "golden forms" and reference them by `leadgen_form_id`.

### When to Reuse (Recommended)
- Same offer/landing page
- Same questions
- Same legal content
- Different creatives/audiences

### When to Create New Form
- Different localization
- Different intent mode (Volume vs Higher Intent)
- Radically different question schema
- A/B testing form variations

## System Architecture

```
PREFLIGHT VALIDATION (Run before ANY lead ad creation)
├── Check Page has accepted Lead Ads Terms
├── Validate Privacy Policy URL accessible (200 OK)
├── Verify Campaign Objective = OUTCOME_LEADS
└── Check Page has leadgen_forms create permission

FORM TEMPLATE SYSTEM
├── Create templates locally (our source of truth)
├── Sync to Meta only when needed
├── Track meta_form_id when synced
└── Reuse forms across multiple ads

FORM CREATION PIPELINE
├── Step 0: Run preflight checks
├── Step 1: Check if template has meta_form_id
├── Step 2: If no, construct payload (POST-allowed fields only)
├── Step 3: POST to /{page_id}/leadgen_forms
├── Step 4: Store meta_form_id, use in ads

ERROR HANDLING
├── Parse error_subcode from Meta response
├── Lookup known resolutions
├── Auto-fix where possible
├── Log all attempts for debugging

ASSET READINESS
├── Poll video asset status before ad creation
├── Wait until READY status
├── Fail early if processing errors
└── Timeout after 5 minutes
```

## Common Failure Modes (And Fixes)

| error_subcode | Meaning | Auto-Fix | Manual Fix |
|---------------|---------|----------|------------|
| 1487390 | Legal content missing | Add privacy_policy | - |
| 100 | Invalid parameter | Check payload | Review fields |
| 200 | Permissions error | - | Accept Terms |
| 294 | Page not published | - | Publish Page |
| 368 | Temporarily blocked | Retry | Check account |

## Database Schema

### Primary Tables
- `lead_form_templates` - Our source of truth for forms
- `lead_form_usage` - Track which ads use which forms
- `lead_form_creation_log` - All API attempts with payloads
- `preflight_checks` - Validation results

## Key Implementation Details

### Preflight Check Function
```typescript
async function preflightLeadFormCheck(params: {
  pageId: string;
  privacyPolicyUrl: string;
  objective: string;
}): Promise<PreflightResult> {
  const errors = [];
  
  // 1. Check Page Lead Ads Terms
  const termsAccepted = await checkPageLeadTerms(params.pageId);
  if (!termsAccepted) {
    errors.push({
      code: 'LEAD_TERMS_NOT_ACCEPTED',
      remediation: 'Go to Meta Business Settings > Lead Access > Accept Terms'
    });
  }
  
  // 2. Validate Privacy Policy URL
  const privacyValid = await validateUrl(params.privacyPolicyUrl);
  if (!privacyValid.accessible) {
    errors.push({
      code: 'PRIVACY_POLICY_INVALID',
      remediation: 'Ensure URL returns 200 and is publicly accessible'
    });
  }
  
  // 3. Check objective
  if (params.objective !== 'OUTCOME_LEADS') {
    errors.push({
      code: 'OBJECTIVE_MISMATCH',
      remediation: 'Create campaign with OUTCOME_LEADS objective'
    });
  }
  
  return { canProceed: errors.length === 0, errors };
}
```

### Form Payload Construction (POST-allowed fields only)
```typescript
// ONLY include these fields when POSTing to Meta
const formPayload = {
  name: template.name,
  locale: template.locale,
  questions: template.questions, // [{type: "EMAIL"}, {type: "FULL_NAME"}]
  privacy_policy: {
    url: template.privacyPolicyUrl,
    link_text: "Privacy Policy"
  },
  follow_up_action_url: template.thankYouButtonUrl,
  thank_you_page: {
    title: template.thankYouTitle,
    body: template.thankYouBody,
    button_text: template.thankYouButtonText
  }
};

// DO NOT include: id, status, created_time, page (read-only fields)
```

## Current Focus: MVP Features

### Phase 1: Core Validation (P0)
1. lead_form_templates table migration (LF-001)
2. Preflight validation system (LF-002 to LF-004)
3. Form creation via Page edge (LF-005)
4. Error handling with subcodes (LF-006 to LF-009)

### Phase 2: Asset Readiness (P1)
1. Video asset status polling (LF-010)
2. Integration with ad creation flow (LF-011)

### Phase 3: UI & Tracking (P2)
1. Form template list/editor UI (LF-012 to LF-014)
2. Usage tracking (LF-015)
3. Success rate dashboard (LF-016)

## Integration with WaitlistLab Ads Autopilot

This system integrates with the existing Ads Autopilot:

```typescript
// In Ads Autopilot ad creation flow
async function createLeadAd(params: CreateLeadAdParams) {
  // 1. Run preflight FIRST
  const preflight = await leadFormManager.runPreflight({
    pageId: params.pageId,
    privacyPolicyUrl: params.offer.privacyUrl,
    objective: params.campaign.objective
  });
  
  if (!preflight.canProceed) {
    throw new PreflightError(preflight.errors);
  }
  
  // 2. Get or create form
  const formId = await leadFormManager.getOrCreateForm(params.formTemplate);
  
  // 3. Wait for assets
  await leadFormManager.waitForAssetsReady(params.videoAssets);
  
  // 4. Create ad with form
  return metaAPI.createAd({
    ...params,
    leadgenFormId: formId
  });
}
```

## Technical Stack
- Backend: Extends WaitlistLab codebase
- Meta API: Marketing API v18+
- Database: Supabase (shared with WaitlistLab)

## Success Metrics
- >99% form creation success rate
- 100% preflight catch rate for preventable errors
- <30 seconds from template to live form
- >5 ads per form (reuse ratio)

## Instructions for Development
1. Read the full PRD before starting
2. ALWAYS run preflight before any lead form/ad creation
3. NEVER clone forms - reuse by leadgen_form_id
4. Log ALL API attempts with full payloads
5. Parse error_subcodes for specific handling
6. Wait for video assets to be READY before ad creation
