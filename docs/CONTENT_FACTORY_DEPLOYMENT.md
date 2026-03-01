# Content Factory Deployment Guide

This guide covers deploying Content Factory to production environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Infrastructure Setup](#infrastructure-setup)
3. [Database Setup](#database-setup)
4. [Backend Deployment](#backend-deployment)
5. [Frontend Deployment](#frontend-deployment)
6. [Third-Party Integrations](#third-party-integrations)
7. [Environment Configuration](#environment-configuration)
8. [Monitoring & Logging](#monitoring--logging)
9. [CI/CD Pipeline](#cicd-pipeline)
10. [Rollback Procedures](#rollback-procedures)
11. [Production Checklist](#production-checklist)

---

## Prerequisites

### Required Accounts & Services

- [ ] **Supabase** account (database + auth)
- [ ] **Remotion API** account (AI generation)
- [ ] **TikTok Developer** account
- [ ] **Instagram/Facebook Developer** account
- [ ] **Vercel** or similar hosting (Next.js deployment)
- [ ] **Sentry** account (error tracking)
- [ ] **GitHub** repository with CI/CD

### Required Tools

```bash
# Node.js 18+
node --version  # Should be v18.0.0 or higher

# pnpm (recommended) or npm
pnpm --version

# Supabase CLI
npm install -g supabase

# Vercel CLI (if using Vercel)
npm install -g vercel

# PostgreSQL client (for manual DB access)
psql --version
```

---

## Infrastructure Setup

### 1. Supabase Project

```bash
# Create new Supabase project via dashboard
# https://app.supabase.com/new

# Or via CLI
supabase init
supabase login
supabase link --project-ref <your-project-ref>
```

**Save these values:**
- Project URL: `https://xxxxx.supabase.co`
- Anon key: `eyJhbGc...`
- Service role key: `eyJhbGc...` (keep secret!)
- Database password

### 2. Remotion API Setup

```bash
# Sign up at https://remotion.dev
# Create API key in dashboard
# Enable Nano Banana and Veo 3.1 models
```

**Save these values:**
- API URL: `https://api.remotion.dev`
- API Key: `rmtn_...`

### 3. TikTok Developer App

1. Go to https://developers.tiktok.com
2. Create new app
3. Configure scopes:
   - `user.info.basic`
   - `video.upload`
   - `video.publish`
   - `video.insights`
4. Set redirect URI: `https://yourdomain.com/api/auth/tiktok/callback`

**Save these values:**
- Client Key
- Client Secret

### 4. Instagram/Facebook App

1. Go to https://developers.facebook.com
2. Create new app
3. Add Instagram Basic Display
4. Configure redirect URI: `https://yourdomain.com/api/auth/instagram/callback`

**Save these values:**
- App ID
- App Secret

---

## Database Setup

### 1. Run Migrations

```bash
cd backend

# Generate Prisma client
npx prisma generate

# Push schema to Supabase
npx prisma db push

# Or use migrations for version control
npx prisma migrate deploy
```

### 2. Seed Initial Data

```bash
# Run seed script
npx prisma db seed

# Or manually insert default config
psql $DATABASE_URL <<EOF
INSERT INTO cf_scoring_config (name, weights, active) VALUES
('Default', '{"engagement": 0.4, "ctr": 0.3, "conversions": 0.3}', true);
EOF
```

### 3. Set Up Row-Level Security (RLS)

```sql
-- Enable RLS on all tables
ALTER TABLE cf_product_dossiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE cf_generated_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE cf_generated_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cf_scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cf_assembled_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE cf_published_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE cf_performance_metrics ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view all content
CREATE POLICY "Authenticated users can view dossiers"
  ON cf_product_dossiers
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Service role can do anything
CREATE POLICY "Service role full access"
  ON cf_product_dossiers
  FOR ALL
  TO service_role
  USING (true);

-- Repeat for other tables...
```

### 4. Create Database Indexes

```bash
# Run index creation script
psql $DATABASE_URL < backend/prisma/indexes.sql
```

### 5. Set Up Automated Backups

**Supabase (automatic):**
- Daily backups enabled by default
- Point-in-time recovery available on Pro plan

**Manual backup script:**

```bash
#!/bin/bash
# backup-db.sh

BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="cf_backup_$DATE.dump"

pg_dump $DATABASE_URL -F c -f "$BACKUP_DIR/$FILENAME"

# Upload to S3
aws s3 cp "$BACKUP_DIR/$FILENAME" "s3://your-backup-bucket/content-factory/"

# Clean up old backups (keep last 30 days)
find $BACKUP_DIR -name "cf_backup_*.dump" -mtime +30 -delete
```

---

## Backend Deployment

### Option 1: Vercel (Serverless)

```bash
cd backend

# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod

# Set environment variables
vercel env add DATABASE_URL production
vercel env add DIRECT_URL production
vercel env add REMOTION_API_KEY production
# ... add all env vars
```

**vercel.json:**

```json
{
  "version": 2,
  "builds": [
    {
      "src": "src/index.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "src/index.ts"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### Option 2: Docker (VPS/Cloud)

**Dockerfile:**

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production

# Generate Prisma client
RUN npx prisma generate

# Copy source
COPY . .

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node healthcheck.js || exit 1

# Start server
CMD ["npm", "start"]
```

**Build and deploy:**

```bash
# Build image
docker build -t content-factory-backend:latest .

# Run locally
docker run -p 3000:3000 \
  --env-file .env.production \
  content-factory-backend:latest

# Push to registry
docker tag content-factory-backend:latest your-registry/content-factory-backend:latest
docker push your-registry/content-factory-backend:latest

# Deploy to server
ssh production-server << 'EOF'
  docker pull your-registry/content-factory-backend:latest
  docker stop content-factory-backend || true
  docker rm content-factory-backend || true
  docker run -d \
    --name content-factory-backend \
    --restart unless-stopped \
    -p 3000:3000 \
    --env-file /etc/content-factory/.env \
    your-registry/content-factory-backend:latest
EOF
```

### Option 3: Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create project
railway init

# Deploy
railway up

# Set environment variables
railway variables set DATABASE_URL=$DATABASE_URL
railway variables set REMOTION_API_KEY=$REMOTION_API_KEY
```

---

## Frontend Deployment

### Next.js on Vercel

```bash
cd dashboard

# Deploy to Vercel
vercel --prod

# Configure environment variables in Vercel dashboard
# NEXT_PUBLIC_SUPABASE_URL
# NEXT_PUBLIC_SUPABASE_ANON_KEY
# NEXT_PUBLIC_API_URL
```

**next.config.js:**

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      'cdn.remotion.dev',
      'supabase.co',
      'tiktok.com'
    ],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
};

module.exports = nextConfig;
```

### Custom Domain

```bash
# Add custom domain in Vercel dashboard
# Or via CLI
vercel domains add yourdomain.com
vercel alias set your-deployment.vercel.app yourdomain.com
```

### CDN Configuration

**For assets (images/videos):**

Use Cloudflare, Cloudinary, or AWS CloudFront:

```bash
# Example: Cloudflare setup
# 1. Add site to Cloudflare
# 2. Update DNS records
# 3. Enable caching rules for /assets/*
```

---

## Third-Party Integrations

### Remotion API

```bash
# Test connection
curl -H "Authorization: Bearer $REMOTION_API_KEY" \
  https://api.remotion.dev/api/health

# Expected response:
# {"status": "ok"}
```

### TikTok OAuth

**Configuration in TikTok Developer Portal:**

1. Redirect URI: `https://yourdomain.com/api/auth/tiktok/callback`
2. Scopes: `user.info.basic`, `video.upload`, `video.publish`
3. Approved for production use

**Test OAuth flow:**

```bash
# Visit this URL in browser
https://yourdomain.com/api/auth/tiktok/login

# Should redirect to TikTok, then back to your app
```

### Instagram API

**Configuration in Facebook Developer Portal:**

1. Add Instagram Basic Display product
2. Set redirect URI: `https://yourdomain.com/api/auth/instagram/callback`
3. Submit for app review if needed

---

## Environment Configuration

### Production Environment Variables

**Backend (.env.production):**

```bash
# Database
DATABASE_URL="postgresql://user:password@host:5432/dbname?pgbouncer=true"
DIRECT_URL="postgresql://user:password@host:5432/dbname"

# Remotion API
REMOTION_API_URL="https://api.remotion.dev"
REMOTION_API_KEY="rmtn_prod_xxxxx"
NANO_BANANA_ENABLED=true
VEO_3_ENABLED=true

# TikTok API
TIKTOK_CLIENT_KEY="aw1234567890"
TIKTOK_CLIENT_SECRET="xxxxxxxxxxxx"
TIKTOK_REDIRECT_URI="https://yourdomain.com/api/auth/tiktok/callback"

# Instagram API
INSTAGRAM_APP_ID="123456789"
INSTAGRAM_APP_SECRET="xxxxxxxxxxxx"
INSTAGRAM_REDIRECT_URI="https://yourdomain.com/api/auth/instagram/callback"

# Supabase
SUPABASE_URL="https://xxxxx.supabase.co"
SUPABASE_ANON_KEY="eyJhbGc..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGc..."

# Security
JWT_SECRET="your-super-secret-jwt-key-change-this"
CORS_ORIGIN="https://yourdomain.com"

# Feature Flags
ENABLE_VOICE_CLONING=false
ENABLE_AUTO_PUBLISH=false
ENABLE_SMART_BIDDING=false

# Monitoring
SENTRY_DSN="https://xxxxx@sentry.io/xxxxx"
LOG_LEVEL="info"

# Rate Limiting
RATE_LIMIT_MAX=1000
RATE_LIMIT_WINDOW_MS=3600000

# Node Environment
NODE_ENV="production"
PORT=3000
```

**Frontend (.env.production):**

```bash
NEXT_PUBLIC_SUPABASE_URL="https://xxxxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGc..."
NEXT_PUBLIC_API_URL="https://api.yourdomain.com/api/cf"
NEXT_PUBLIC_SENTRY_DSN="https://xxxxx@sentry.io/xxxxx"
```

### Secrets Management

**Using Vercel:**

```bash
vercel env add DATABASE_URL production
vercel env add REMOTION_API_KEY production
```

**Using GitHub Secrets (for CI/CD):**

```bash
# Add to repository secrets in GitHub settings
# Settings → Secrets and variables → Actions → New repository secret
```

**Using HashiCorp Vault:**

```bash
# Store secrets
vault kv put secret/content-factory \
  database_url=$DATABASE_URL \
  remotion_api_key=$REMOTION_API_KEY

# Retrieve in app
vault kv get -field=database_url secret/content-factory
```

---

## Monitoring & Logging

### Sentry Setup

```bash
# Install Sentry
npm install @sentry/node @sentry/tracing

# Initialize in backend
# src/index.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

### Application Logs

**Using Winston:**

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}
```

### Health Check Endpoint

```typescript
// src/routes/health.ts
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/health', async (req, res) => {
  try {
    // Check database
    await prisma.$queryRaw`SELECT 1`;

    // Check Remotion API
    const remotionHealth = await fetch(
      `${process.env.REMOTION_API_URL}/api/health`,
      { headers: { Authorization: `Bearer ${process.env.REMOTION_API_KEY}` } }
    );

    if (!remotionHealth.ok) {
      throw new Error('Remotion API unhealthy');
    }

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        database: 'ok',
        remotion: 'ok',
      },
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      error: error.message,
    });
  }
});

export default router;
```

### Uptime Monitoring

**Using UptimeRobot or Pingdom:**

- Monitor: `https://api.yourdomain.com/health`
- Interval: 5 minutes
- Alert on: Status code !== 200

---

## CI/CD Pipeline

### GitHub Actions

**.github/workflows/deploy.yml:**

```yaml
name: Deploy Content Factory

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Run linter
        run: npm run lint

  deploy-backend:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
          working-directory: ./backend

  deploy-frontend:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_FRONTEND_PROJECT_ID }}
          vercel-args: '--prod'
          working-directory: ./dashboard
```

### Database Migrations in CI/CD

```yaml
- name: Run database migrations
  run: |
    npx prisma migrate deploy
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

---

## Rollback Procedures

### Backend Rollback

**Vercel:**

```bash
# List deployments
vercel ls

# Roll back to previous deployment
vercel rollback <deployment-url>
```

**Docker:**

```bash
# Tag current version
docker tag content-factory-backend:latest content-factory-backend:rollback

# Pull previous version
docker pull your-registry/content-factory-backend:v1.2.3

# Restart with previous version
docker stop content-factory-backend
docker run -d \
  --name content-factory-backend \
  your-registry/content-factory-backend:v1.2.3
```

### Database Rollback

```bash
# Rollback last migration
npx prisma migrate resolve --rolled-back <migration-name>

# Or restore from backup
pg_restore -h host -U user -d dbname cf_backup_20260301.dump
```

### Frontend Rollback

**Vercel:**

```bash
vercel rollback <deployment-url>
```

---

## Production Checklist

### Pre-Deployment

- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database migrations tested
- [ ] Third-party API keys valid
- [ ] SSL certificates configured
- [ ] Domain DNS configured
- [ ] CDN configured for assets
- [ ] Error tracking (Sentry) set up
- [ ] Monitoring/health checks configured
- [ ] Backup strategy in place
- [ ] Rollback procedure documented

### Post-Deployment

- [ ] Verify health check endpoint
- [ ] Test OAuth flows (TikTok, Instagram)
- [ ] Test Remotion API integration
- [ ] Create test dossier and generate content
- [ ] Verify publishing to TikTok
- [ ] Check metrics collection
- [ ] Monitor error rates in Sentry
- [ ] Verify database backups
- [ ] Test rollback procedure

### Performance Testing

```bash
# Load test with Apache Bench
ab -n 1000 -c 10 https://api.yourdomain.com/api/cf/dossiers

# Or use k6
k6 run load-test.js
```

**load-test.js:**

```javascript
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  vus: 10,
  duration: '30s',
};

export default function () {
  let res = http.get('https://api.yourdomain.com/api/cf/dossiers');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
}
```

---

## Troubleshooting

### Common Issues

**Issue: Database connection timeout**

```bash
# Check connection string
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Check connection pooling (PgBouncer)
# Ensure DATABASE_URL uses ?pgbouncer=true
# Use DIRECT_URL for migrations
```

**Issue: Remotion API 401 Unauthorized**

```bash
# Verify API key
curl -H "Authorization: Bearer $REMOTION_API_KEY" \
  https://api.remotion.dev/api/health

# Check key expiration in Remotion dashboard
```

**Issue: TikTok OAuth fails**

1. Verify redirect URI matches exactly in TikTok Developer Portal
2. Check scopes are approved
3. Ensure app is approved for production

**Issue: Out of memory errors**

```bash
# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=4096" npm start

# Or in Dockerfile
ENV NODE_OPTIONS="--max-old-space-size=4096"
```

---

## Security Hardening

### HTTPS Only

```javascript
// Redirect HTTP to HTTPS
app.use((req, res, next) => {
  if (req.headers['x-forwarded-proto'] !== 'https' && process.env.NODE_ENV === 'production') {
    return res.redirect(`https://${req.headers.host}${req.url}`);
  }
  next();
});
```

### Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

### CORS Configuration

```typescript
import cors from 'cors';

app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true,
}));
```

---

## Support

- **Deployment Issues**: deployment@yourdomain.com
- **Infrastructure**: devops@yourdomain.com
- **Documentation**: See `/docs` directory

---

## Changelog

### v1.0.0 (2026-03-01)
- Initial production deployment
- Supabase + Vercel infrastructure
- Remotion API integration
- TikTok/Instagram publishing
