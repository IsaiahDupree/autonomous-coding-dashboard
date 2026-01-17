#!/bin/bash
# Fix Supabase database schema by creating a clean database

set -e

echo "🔧 Fixing Supabase Database Schema"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if we can connect to Supabase
DB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"

echo ""
echo "1. Checking database connection..."
if docker exec supabase_db_MediaPoster psql -U postgres -c "SELECT 1" > /dev/null 2>&1; then
    echo "   ✅ Connected to Supabase database"
else
    echo "   ❌ Cannot connect to database"
    echo "   Make sure Supabase is running: supabase start"
    exit 1
fi

echo ""
echo "2. Creating clean schema..."

# Create a new schema for our app to avoid conflicts
docker exec -i supabase_db_MediaPoster psql -U postgres << 'SQL'
-- Create app schema
CREATE SCHEMA IF NOT EXISTS app;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create organizations table in app schema
CREATE TABLE IF NOT EXISTS app.organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  plan VARCHAR(50) DEFAULT 'free',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create default organization
INSERT INTO app.organizations (name, slug, plan)
VALUES ('Default Organization', 'default', 'free')
ON CONFLICT (slug) DO NOTHING;

-- Create projects table in app schema
CREATE TABLE IF NOT EXISTS app.projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES app.organizations(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'draft',
  touch_level VARCHAR(20) DEFAULT 'medium',
  profit_potential VARCHAR(20) DEFAULT 'medium',
  difficulty VARCHAR(20) DEFAULT 'medium',
  automation_mode VARCHAR(50) DEFAULT 'hybrid',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grant permissions
GRANT USAGE ON SCHEMA app TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA app TO postgres;

SELECT 'Schema created successfully!' as status;
SQL

echo ""
echo "✅ Database schema fixed!"
echo ""
echo "Next: Update DATABASE_URL to use app schema:"
echo "  DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres?schema=app"

