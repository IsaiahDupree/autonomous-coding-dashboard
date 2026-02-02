# ACD Environment Setup

## Database Configuration

The ACD uses a **dedicated PostgreSQL database** separate from any target project databases.

### Connection Details

| Setting | Value |
|---------|-------|
| Host | `127.0.0.1` |
| Port | `5433` |
| Database | `acd_database` |
| User | `acd_user` |
| Password | `acd_secure_pass_2026` |

### Connection String

```
postgresql://acd_user:acd_secure_pass_2026@127.0.0.1:5433/acd_database
```

## Environment Files

Environment variables are stored in multiple locations for redundancy:

### 1. Root `.env` (Project Root)
```
/autonomous-coding-dashboard/.env
```
Contains all configuration including Claude OAuth token.

### 2. Backend `.env`
```
/autonomous-coding-dashboard/backend/.env
```
Contains database, Redis, and server configuration.

### 3. Backend `.env.example`
```
/autonomous-coding-dashboard/backend/.env.example
```
Template for new setups.

## Starting Services

### Start Database & Redis
```bash
cd /Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard
docker compose up -d postgres redis
```

### Run Migrations
```bash
cd backend
npx prisma db push
```

### Start Backend
```bash
cd backend
npm run dev
```

### Start Agent Orchestrator
```bash
cd backend
python -m uvicorn services.agent_orchestrator:app --port 8000
```

### Start Multi-Repo Queue
```bash
cd harness
node run-queue.js --loop
```

## Ports Reference

| Service | Port |
|---------|------|
| PostgreSQL (ACD) | 5433 |
| Redis | 6379 |
| Backend API | 3434 |
| Agent Orchestrator | 8000 |
| MediaPoster Supabase | 54322 |

## Troubleshooting

### Database Connection Issues
1. Ensure Docker container is running: `docker ps | grep acd_postgres`
2. Check port 5433 is available: `lsof -i :5433`
3. Verify credentials in `.env` files match `docker-compose.yml`

### Permission Issues
The `init.sql` script grants all necessary permissions on container startup.
