# Deployment Guide

**Last Updated:** 2026-03-01
**Platforms Supported:** Cloud (AWS, GCP, Azure), Docker, Kubernetes, Vercel, Railway

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Environment Setup](#environment-setup)
4. [Database Setup](#database-setup)
5. [Local Development](#local-development)
6. [Docker Deployment](#docker-deployment)
7. [Production Deployment](#production-deployment)
8. [Platform-Specific Guides](#platform-specific-guides)
9. [Post-Deployment](#post-deployment)
10. [Monitoring & Logging](#monitoring--logging)
11. [Scaling](#scaling)
12. [Rollback Procedures](#rollback-procedures)
13. [Troubleshooting](#troubleshooting)

---

## Overview

This guide covers deployment of the Autonomous Coding Dashboard platform, which includes three integrated systems:

1. **ACD (Autonomous Coding Dashboard)** - Agent harness system
2. **PCT (Programmatic Creative Testing)** - Facebook ad creative testing
3. **CF (Content Factory)** - Content production pipeline

All systems share:
- Backend API (Express.js)
- PostgreSQL database
- Redis cache/queue
- Frontend dashboards

---

## Prerequisites

### Required Software

```bash
# Node.js (v18 or higher)
node --version  # should be >= 18.0.0

# PostgreSQL (v14 or higher)
psql --version  # should be >= 14.0

# Redis (v7 or higher)
redis-cli --version  # should be >= 7.0

# Git
git --version

# Optional: Docker & Docker Compose
docker --version
docker-compose --version
```

### Required Accounts & API Keys

1. **Anthropic Claude API**
   - Sign up at: https://console.anthropic.com
   - Get API key from dashboard
   - Recommended: Claude Sonnet 4.6 for best performance

2. **Meta Marketing API** (for PCT system)
   - Create app at: https://developers.facebook.com
   - Get App ID and App Secret
   - Request Marketing API access
   - Generate long-lived user access token

3. **Email Service** (optional)
   - Resend: https://resend.com
   - OR SendGrid: https://sendgrid.com

4. **Database** (if using managed service)
   - Supabase: https://supabase.com
   - OR Railway: https://railway.app
   - OR Neon: https://neon.tech

5. **Redis** (if using managed service)
   - Upstash: https://upstash.com
   - OR Redis Cloud: https://redis.com/cloud

---

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/IsaiahDupree/autonomous-coding-dashboard.git
cd autonomous-coding-dashboard
```

### 2. Install Dependencies

```bash
# Root dependencies
npm install

# Backend dependencies
cd backend
npm install
cd ..

# Install packages (if using monorepo structure)
npm install --workspaces
```

### 3. Configure Environment Variables

#### Root `.env`

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Application
NODE_ENV=development
PORT=3000

# Backend API
API_URL=http://localhost:4000
API_PORT=4000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/acd_dev

# Redis
REDIS_URL=redis://localhost:6379

# Session
SESSION_SECRET=your-session-secret-min-32-chars

# CORS (comma-separated origins)
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

#### Backend `.env`

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/acd_dev
DIRECT_URL=postgresql://user:password@localhost:5432/acd_dev

# Redis
REDIS_URL=redis://localhost:6379

# JWT Authentication
JWT_SECRET=your-jwt-secret-min-32-chars
JWT_EXPIRY=7d

# Session
SESSION_SECRET=your-session-secret-min-32-chars
SESSION_COOKIE_DOMAIN=localhost

# Anthropic API
ANTHROPIC_API_KEY=sk-ant-api03-...
ANTHROPIC_MODEL=claude-sonnet-4-6

# Meta Marketing API (for PCT)
META_APP_ID=your-meta-app-id
META_APP_SECRET=your-meta-app-secret
META_ACCESS_TOKEN=long-lived-user-access-token

# Email (optional)
RESEND_API_KEY=re_...
# OR
SENDGRID_API_KEY=SG....

# File Upload (optional)
SUPABASE_URL=https://....supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Monitoring (optional)
SENTRY_DSN=https://...@sentry.io/...
LOGFLARE_SOURCE_TOKEN=...

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## Database Setup

### Local PostgreSQL Setup

#### Install PostgreSQL

**macOS (Homebrew)**:
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Ubuntu/Debian**:
```bash
sudo apt update
sudo apt install postgresql-14 postgresql-contrib
sudo systemctl start postgresql
```

**Windows**:
Download from https://www.postgresql.org/download/windows/

#### Create Database

```bash
# Connect to PostgreSQL
psql postgres

# Create user
CREATE USER acd_user WITH PASSWORD 'your-password';

# Create databases
CREATE DATABASE acd_dev OWNER acd_user;
CREATE DATABASE acd_test OWNER acd_user;
CREATE DATABASE acd_prod OWNER acd_user;

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE acd_dev TO acd_user;
GRANT ALL PRIVILEGES ON DATABASE acd_test TO acd_user;
GRANT ALL PRIVILEGES ON DATABASE acd_prod TO acd_user;

# Enable UUID extension
\c acd_dev
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
\c acd_test
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
\c acd_prod
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\q
```

### Run Migrations

```bash
cd backend

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Seed database (optional)
npx prisma db seed

cd ..
```

### Verify Database Setup

```bash
cd backend
npx prisma studio
```

This opens a web UI at http://localhost:5555 to browse your database.

---

## Local Development

### Start Development Servers

#### Option 1: Using Init Script

```bash
./init.sh
```

This starts:
- Frontend dev server (port 3000)
- Backend API server (port 4000)
- Redis (port 6379)
- PostgreSQL (port 5432)

#### Option 2: Manual Start

**Terminal 1: Backend**
```bash
cd backend
npm run dev
```

**Terminal 2: Frontend**
```bash
npm run dev
```

**Terminal 3: Redis**
```bash
redis-server
```

**Terminal 4: Worker (for background jobs)**
```bash
cd backend
npm run worker
```

### Access Applications

- **ACD Dashboard**: http://localhost:3000
- **PCT System**: http://localhost:3000/pct.html
- **Control Panel**: http://localhost:3000/control.html
- **Queue Management**: http://localhost:3000/queue.html
- **Backend API**: http://localhost:4000
- **API Health**: http://localhost:4000/api/health
- **Prisma Studio**: http://localhost:5555

---

## Docker Deployment

### Using Docker Compose (Recommended for Development)

#### 1. Build Images

```bash
docker-compose build
```

#### 2. Start Services

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

#### 3. Run Migrations

```bash
docker-compose exec backend npx prisma migrate deploy
```

#### 4. Seed Database (Optional)

```bash
docker-compose exec backend npx prisma db seed
```

### Docker Compose Services

The `docker-compose.yml` includes:

```yaml
services:
  postgres:
    image: postgres:14-alpine
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  backend:
    build: ./backend
    ports:
      - "4000:4000"
    depends_on:
      - postgres
      - redis
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}

  frontend:
    build: .
    ports:
      - "3000:3000"
    depends_on:
      - backend

  worker:
    build: ./backend
    command: npm run worker
    depends_on:
      - postgres
      - redis
```

### Individual Docker Containers

#### Build Backend

```bash
cd backend
docker build -t acd-backend .
```

#### Run Backend

```bash
docker run -d \
  --name acd-backend \
  -p 4000:4000 \
  -e DATABASE_URL=postgresql://... \
  -e REDIS_URL=redis://... \
  -e ANTHROPIC_API_KEY=sk-ant-... \
  acd-backend
```

---

## Production Deployment

### Pre-Deployment Checklist

- [ ] Environment variables configured for production
- [ ] Database migrations tested
- [ ] SSL certificates obtained
- [ ] Domain names configured
- [ ] API keys and secrets rotated
- [ ] Monitoring and logging configured
- [ ] Backup strategy in place
- [ ] Load testing completed
- [ ] Security audit passed

### Build for Production

```bash
# Backend build
cd backend
npm run build

# Frontend build (if using build step)
npm run build
```

### Database Migration

```bash
# Production migration
cd backend
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

### Environment Variables

**Production `.env` changes**:

```env
NODE_ENV=production
PORT=443

# Use managed database
DATABASE_URL=postgresql://user:password@prod-db.aws.com:5432/acd_prod

# Use managed Redis
REDIS_URL=redis://:password@prod-redis.aws.com:6379

# Production domains
CORS_ORIGINS=https://acd.yourdomain.com,https://pct.yourdomain.com

# Session security
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_HTTPONLY=true
SESSION_COOKIE_SAMESITE=strict

# Enable monitoring
SENTRY_DSN=https://...@sentry.io/...
```

### Start Production Server

```bash
# Backend
cd backend
NODE_ENV=production npm start

# Worker
NODE_ENV=production npm run worker

# Use PM2 for process management (recommended)
npm install -g pm2

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### PM2 Ecosystem Config

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'acd-backend',
      script: 'backend/dist/index.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      }
    },
    {
      name: 'acd-worker',
      script: 'backend/dist/worker.js',
      instances: 2,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
```

---

## Platform-Specific Guides

### Vercel Deployment

#### 1. Install Vercel CLI

```bash
npm i -g vercel
```

#### 2. Configure `vercel.json`

```json
{
  "version": 2,
  "builds": [
    {
      "src": "backend/dist/index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "backend/dist/index.js"
    },
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

#### 3. Deploy

```bash
vercel --prod
```

#### 4. Set Environment Variables

```bash
vercel env add DATABASE_URL production
vercel env add REDIS_URL production
vercel env add ANTHROPIC_API_KEY production
```

### Railway Deployment

#### 1. Install Railway CLI

```bash
npm i -g @railway/cli
```

#### 2. Login & Initialize

```bash
railway login
railway init
```

#### 3. Add Services

```bash
# Add PostgreSQL
railway add --plugin postgresql

# Add Redis
railway add --plugin redis
```

#### 4. Deploy

```bash
railway up
```

#### 5. Set Variables

```bash
railway variables set ANTHROPIC_API_KEY=sk-ant-...
railway variables set META_APP_ID=...
```

### AWS Deployment

#### Architecture Overview

```
┌──────────────────────────────────────────────────┐
│              Application Load Balancer            │
│                  (HTTPS/SSL)                     │
└──────────────────┬───────────────────────────────┘
                   │
       ┌───────────┴───────────┐
       │                       │
┌──────▼──────┐       ┌───────▼────────┐
│   ECS/EC2   │       │   ECS/EC2      │
│  Frontend   │       │   Backend      │
│  (Static)   │       │   (Node.js)    │
└─────────────┘       └────────┬───────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
         ┌────▼───┐      ┌────▼───┐      ┌────▼───┐
         │  RDS   │      │ ElastiCache │  │   S3   │
         │ (Postgres) │  │  (Redis)    │  │ (Files)│
         └────────┘      └────────┘      └────────┘
```

#### 1. Setup RDS (PostgreSQL)

```bash
# Using AWS CLI
aws rds create-db-instance \
  --db-instance-identifier acd-postgres \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --engine-version 14.7 \
  --master-username admin \
  --master-user-password YourPassword123 \
  --allocated-storage 20 \
  --vpc-security-group-ids sg-... \
  --db-subnet-group-name your-subnet-group
```

#### 2. Setup ElastiCache (Redis)

```bash
aws elasticache create-cache-cluster \
  --cache-cluster-id acd-redis \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --num-cache-nodes 1 \
  --security-group-ids sg-...
```

#### 3. Deploy with ECS

Create `task-definition.json`:

```json
{
  "family": "acd-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "your-account.dkr.ecr.region.amazonaws.com/acd-backend:latest",
      "portMappings": [
        {
          "containerPort": 4000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:..."
        }
      ]
    }
  ]
}
```

Register task definition:

```bash
aws ecs register-task-definition --cli-input-json file://task-definition.json
```

#### 4. Deploy with Elastic Beanstalk (Alternative)

```bash
# Initialize EB
eb init -p node.js-18 acd-platform

# Create environment
eb create acd-production

# Deploy
eb deploy
```

### Google Cloud Platform

#### 1. Setup Cloud SQL (PostgreSQL)

```bash
gcloud sql instances create acd-postgres \
  --database-version=POSTGRES_14 \
  --tier=db-f1-micro \
  --region=us-central1
```

#### 2. Setup Memorystore (Redis)

```bash
gcloud redis instances create acd-redis \
  --size=1 \
  --region=us-central1 \
  --redis-version=redis_7_0
```

#### 3. Deploy to Cloud Run

```bash
# Build and push container
gcloud builds submit --tag gcr.io/PROJECT_ID/acd-backend

# Deploy
gcloud run deploy acd-backend \
  --image gcr.io/PROJECT_ID/acd-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

### Azure

#### 1. Setup PostgreSQL

```bash
az postgres server create \
  --resource-group acd-rg \
  --name acd-postgres \
  --location eastus \
  --admin-user admin \
  --admin-password YourPassword123 \
  --sku-name B_Gen5_1
```

#### 2. Setup Redis Cache

```bash
az redis create \
  --resource-group acd-rg \
  --name acd-redis \
  --location eastus \
  --sku Basic \
  --vm-size c0
```

#### 3. Deploy to App Service

```bash
# Create App Service
az webapp create \
  --resource-group acd-rg \
  --plan acd-plan \
  --name acd-backend \
  --runtime "NODE|18-lts"

# Deploy
az webapp deployment source config-zip \
  --resource-group acd-rg \
  --name acd-backend \
  --src backend.zip
```

---

## Post-Deployment

### Verify Deployment

#### 1. Health Checks

```bash
# API health
curl https://your-domain.com/api/health

# Database connection
curl https://your-domain.com/api/db/test

# Redis connection
curl https://your-domain.com/api/cache/test
```

#### 2. Smoke Tests

```bash
# Run automated smoke tests
npm run test:smoke
```

#### 3. Manual Testing

- [ ] Homepage loads
- [ ] Login works
- [ ] Dashboard displays data
- [ ] API endpoints respond
- [ ] Database queries work
- [ ] File uploads work
- [ ] Email sending works
- [ ] Background jobs process

### Setup SSL/TLS

#### Using Let's Encrypt (Certbot)

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d acd.yourdomain.com

# Auto-renewal
sudo certbot renew --dry-run
```

#### Configure Nginx

`/etc/nginx/sites-available/acd`:

```nginx
server {
    listen 443 ssl http2;
    server_name acd.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/acd.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/acd.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name acd.yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

Enable and restart:

```bash
sudo ln -s /etc/nginx/sites-available/acd /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Database Backups

#### Automated Backups (cron)

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * pg_dump -h localhost -U acd_user acd_prod | gzip > /backups/acd-$(date +\%Y\%m\%d).sql.gz

# Cleanup old backups (keep 30 days)
0 3 * * * find /backups -name "acd-*.sql.gz" -mtime +30 -delete
```

#### Manual Backup

```bash
pg_dump -h localhost -U acd_user acd_prod > acd_backup.sql
```

#### Restore from Backup

```bash
psql -h localhost -U acd_user acd_prod < acd_backup.sql
```

---

## Monitoring & Logging

### Application Monitoring

#### Setup Sentry

```bash
npm install --save @sentry/node
```

`backend/src/index.ts`:

```typescript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0
});
```

#### Setup Logging

```bash
npm install --save winston
```

`backend/src/utils/logger.ts`:

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

export default logger;
```

### Infrastructure Monitoring

#### PM2 Monitoring

```bash
# Start monitoring
pm2 monit

# View logs
pm2 logs

# Metrics
pm2 describe acd-backend
```

#### System Metrics

```bash
# Install htop
sudo apt-get install htop

# Monitor system resources
htop
```

### Log Aggregation

#### Using Logflare

```bash
npm install --save @logflare/logger-node
```

#### Using Datadog

```bash
npm install --save dd-trace
```

### Uptime Monitoring

Use external services:
- UptimeRobot: https://uptimerobot.com
- Pingdom: https://www.pingdom.com
- Better Uptime: https://betteruptime.com

Configure checks for:
- `https://your-domain.com/api/health`
- Dashboard availability
- Database connectivity

---

## Scaling

### Horizontal Scaling

#### Load Balancer Setup

```nginx
upstream backend {
    least_conn;
    server backend1.example.com:4000 weight=10 max_fails=3 fail_timeout=30s;
    server backend2.example.com:4000 weight=10 max_fails=3 fail_timeout=30s;
    server backend3.example.com:4000 weight=5 max_fails=3 fail_timeout=30s;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### Database Read Replicas

```typescript
// Prisma read replica config
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    }
  }
});

const prismaReadReplica = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_READ_REPLICA_URL
    }
  }
});

// Use read replica for queries
const users = await prismaReadReplica.user.findMany();

// Use primary for writes
await prisma.user.create({ data: {...} });
```

#### Redis Cluster

```typescript
import Redis from 'ioredis';

const redis = new Redis.Cluster([
  { host: 'redis1.example.com', port: 6379 },
  { host: 'redis2.example.com', port: 6379 },
  { host: 'redis3.example.com', port: 6379 }
]);
```

### Vertical Scaling

#### Increase Node.js Memory

```bash
# Start with 4GB heap
NODE_OPTIONS="--max-old-space-size=4096" node dist/index.js
```

#### Optimize Database

```sql
-- Add indexes
CREATE INDEX idx_features_status ON features(status);
CREATE INDEX idx_sessions_target ON harness_sessions(targetId);

-- Analyze tables
ANALYZE features;
ANALYZE harness_sessions;

-- Update statistics
VACUUM ANALYZE;
```

---

## Rollback Procedures

### Application Rollback

#### PM2 Rollback

```bash
# List deployments
pm2 list

# Rollback to previous version
pm2 reload ecosystem.config.js --update-env

# Or restart with previous code
git checkout previous-commit
npm run build
pm2 restart all
```

#### Docker Rollback

```bash
# List images
docker images

# Rollback to previous image
docker-compose down
docker-compose up -d --force-recreate --no-deps backend
```

### Database Rollback

#### Prisma Migration Rollback

```bash
# View migration history
npx prisma migrate status

# Rollback last migration (not recommended in production)
# Better approach: Create a new migration that reverts changes
npx prisma migrate dev --name revert-problematic-change
```

#### Manual Database Rollback

```bash
# Restore from backup
psql -h localhost -U acd_user acd_prod < acd_backup_before_deploy.sql
```

---

## Troubleshooting

### Common Issues

#### Database Connection Issues

**Problem**: `Error: connect ECONNREFUSED`

**Solution**:
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check connection string
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL
```

#### Redis Connection Issues

**Problem**: `Error: Redis connection to localhost:6379 failed`

**Solution**:
```bash
# Check Redis is running
redis-cli ping

# Should return: PONG

# Restart Redis
sudo systemctl restart redis
```

#### Port Already in Use

**Problem**: `Error: listen EADDRINUSE: address already in use :::4000`

**Solution**:
```bash
# Find process using port
lsof -i :4000

# Kill process
kill -9 <PID>

# Or use different port
PORT=4001 npm start
```

#### Out of Memory

**Problem**: `JavaScript heap out of memory`

**Solution**:
```bash
# Increase Node.js memory
NODE_OPTIONS="--max-old-space-size=4096" npm start

# Or in PM2
pm2 start ecosystem.config.js --node-args="--max-old-space-size=4096"
```

#### Migration Failures

**Problem**: Migration fails midway

**Solution**:
```bash
# Reset database (development only!)
npx prisma migrate reset

# Production: Manually fix in database, then mark migration as applied
npx prisma migrate resolve --applied "migration-name"
```

### Debug Mode

Enable debug logging:

```bash
# Backend
DEBUG=* npm start

# Or specific namespaces
DEBUG=app:*,prisma:* npm start
```

### Health Check Endpoints

Test all systems:

```bash
# Overall health
curl http://localhost:4000/api/health

# Database
curl http://localhost:4000/api/health/db

# Redis
curl http://localhost:4000/api/health/redis

# External services
curl http://localhost:4000/api/health/external
```

---

## Security Checklist

- [ ] Environment variables secured
- [ ] Database connections use SSL
- [ ] API rate limiting enabled
- [ ] CORS properly configured
- [ ] Helmet.js middleware enabled
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (Prisma ORM)
- [ ] XSS prevention
- [ ] CSRF protection enabled
- [ ] Secrets rotated regularly
- [ ] Dependency vulnerabilities checked (`npm audit`)
- [ ] SSL/TLS certificates valid
- [ ] Firewall rules configured
- [ ] Database backups automated
- [ ] Logs sanitized (no sensitive data)

---

## Performance Optimization

### Frontend

- [ ] Minify JS/CSS
- [ ] Enable gzip compression
- [ ] Use CDN for static assets
- [ ] Implement lazy loading
- [ ] Optimize images
- [ ] Enable HTTP/2
- [ ] Use browser caching

### Backend

- [ ] Enable Redis caching
- [ ] Use database connection pooling
- [ ] Add database indexes
- [ ] Implement query optimization
- [ ] Use background jobs for heavy tasks
- [ ] Enable response compression
- [ ] Implement rate limiting

### Database

- [ ] Regular VACUUM operations
- [ ] Index optimization
- [ ] Query plan analysis
- [ ] Connection pool tuning
- [ ] Read replicas for scaling

---

## Support & Resources

- **Documentation**: [/docs](/docs)
- **API Reference**: [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
- **Database Schema**: [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)
- **Security Guide**: [ENVIRONMENT_SECURITY.md](ENVIRONMENT_SECURITY.md)
- **GitHub Issues**: https://github.com/IsaiahDupree/autonomous-coding-dashboard/issues

---

**Last Updated:** 2026-03-01
**Deployment Version:** 1.0.0
