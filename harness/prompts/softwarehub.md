# SoftwareHub Development Prompt

You are working on **SoftwareHub**, a course and software distribution platform cloned from Portal28 Academy.

## Project Overview

SoftwareHub combines educational courses with downloadable software packages and hosted cloud platforms. Users can:
- Purchase and access courses (inherited from Portal28)
- Download licensed local agents (macOS Safari automation tools)
- Access hosted cloud versions of the same tools
- Manage licenses and device activations

## CRITICAL: What's Inherited vs What to Build

### ✅ INHERITED (Already Working - Don't Rebuild)
- Course management and viewing (Mux video)
- Magic link authentication (Supabase Auth)
- Stripe payments and entitlements for courses
- Admin dashboard basics
- Email system (Resend)
- 33 existing database migrations

### 🔨 NEW TO BUILD (Focus Here)
1. **Database** - 8 new tables (packages, releases, licenses, activations, entitlements, activity, status, downloads)
2. **Package System** - CRUD for software packages with versioning
3. **License System** - Key generation (XXXX-XXXX-XXXX-XXXX), JWT activation tokens, device management
4. **Activity Feed** - Releases, status changes, announcements
5. **Status System** - Health monitoring for packages
6. **Cloud SSO** - Token-based SSO for cloud apps
7. **Download System** - Signed URLs, download tracking

## Tech Stack
- **Framework:** Next.js 14 (App Router)
- **Database:** Supabase (PostgreSQL + RLS)
- **Payments:** Stripe
- **Video:** Mux (inherited)
- **Email:** Resend (inherited)
- **Storage:** Cloudflare R2 (for binaries)
- **Styling:** Tailwind CSS + shadcn/ui

## Development Guidelines

1. **Database First** - Create migrations in `supabase/migrations/` before implementing features
2. **RLS Policies** - ALWAYS add Row Level Security for new tables
3. **API Validation** - Use Zod for ALL input validation
4. **Test Coverage** - Write tests for license and package APIs
5. **Follow Patterns** - Match existing Portal28 code patterns in `app/api/` and `components/`

## Feature Phases (120 features total)

| Phase | Features | Focus |
|-------|----------|-------|
| 1 | 1-10 | Database migrations (8 tables + functions) |
| 2 | 11-20 | Package APIs (list, detail, admin CRUD) |
| 3 | 21-27 | Admin UI for packages and releases |
| 4 | 28-30 | Stripe integration for package purchases |
| 5 | 31-40 | Licensing core (key gen, activation, validation) |
| 6 | 41-44 | License admin APIs and UI |
| 7 | 45-48 | User license management UI |
| 8 | 49-53 | Downloads system |
| 9 | 54-59 | Activity feed |
| 10 | 60-64 | Status monitoring |
| 11 | 65-69 | User dashboard and products |
| 12 | 70-73 | Cloud SSO |
| 13 | 74-77 | Email notifications |
| 14 | 78-80 | Admin analytics |
| 15 | 81-87 | Testing |
| 16 | 88-92 | Advanced features |
| 17 | 93-95 | Package-course integration |
| 18 | 96-99 | Polish |
| 19 | 100-103 | Deployment |
| 104-115 | Inherited | Already working from Portal28 |
| 116-120 | Docs | Documentation |

## Key Documentation

- `docs/PRD.md` - Product overview
- `docs/PRD_DETAILED.md` - Full technical spec
- `docs/DATABASE_SCHEMA.sql` - Complete SQL for all new tables
- `feature_list.json` - 120 features with acceptance criteria
- `CLAUDE.md` - Agent instructions

## License Key Format
```
XXXX-XXXX-XXXX-XXXX
Characters: ABCDEFGHJKLMNPQRSTUVWXYZ23456789 (no confusing chars)
```

## Activation Token (JWT)
```json
{
  "lid": "license_id",
  "pid": "package_id",
  "did": "device_id_hash",
  "uid": "user_id",
  "exp": 1237159890
}
```
- 30-day expiry, signed with HS256

## Session Goals

Each session should:
1. Check `feature_list.json` for next incomplete feature (lowest priority number with `passes: false`)
2. Read acceptance criteria carefully
3. Check `file_hint` if provided for where to create/edit
4. Implement the feature completely
5. Write tests if feature is in Phase 15
6. Update `feature_list.json` with `"passes": true`
7. Commit with descriptive message

## Running the Project

```bash
npm run db:start    # Start local Supabase
npm run dev         # Start Next.js on port 2828
```

## Database Migrations

```bash
# Create new migration
npm run db:migration:new <name>

# Apply migrations
npm run db:reset    # Reset and apply all
```

Focus on **Phase 1-5 first** to get the core licensing system working.
