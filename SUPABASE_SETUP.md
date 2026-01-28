# Supabase Local Setup Guide

## ✅ Supabase is Running

Your local Supabase instance is running on Docker with:
- **Database**: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
- **API**: Available via Supabase CLI
- **Studio**: http://localhost:54323

## 🔧 Schema Fix Applied

Created a clean `app` schema to avoid conflicts with existing `auth` schema:
- Organizations table in `app.organizations`
- Projects table in `app.projects`
- Default organization created automatically

## 📝 Configuration

Update your `.env` file:
```env
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres?schema=app
```

## 🚀 Using PRD-Based Autonomous Coding

### Setup a Project with PRD

```bash
# Create a project from a PRD file
./scripts/setup-prd-project.sh my-app path/to/PRD.md

# Or create with sample PRD
./scripts/setup-prd-project.sh my-app
```

### Run Autonomous Coding

```bash
# Run harness on a project directory
./scripts/run-autonomous-from-prd.sh test-projects/my-app 10
```

The harness will:
1. Read the PRD.md file
2. Run initializer to create feature_list.json
3. Run coding sessions to implement features
4. Update progress automatically

## 📊 Dashboard Status

The dashboard now shows:
- ✅ Better error messages (includes API error details)
- ✅ Project status from database
- ✅ Real-time harness monitoring
- ✅ Feature progress tracking

## 🐛 Troubleshooting

If you see API errors:
1. Check backend logs: `tail -f /tmp/backend.log`
2. Verify Supabase is running: `supabase status`
3. Check database connection: `docker exec supabase_db_MediaPoster psql -U postgres -c "SELECT 1"`

