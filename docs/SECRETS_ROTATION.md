# Secrets Rotation Procedure

**Last Updated:** 2026-03-01
**Rotation Frequency:** Quarterly (every 90 days)
**Zero-Downtime:** Yes

---

## Table of Contents

1. [Overview](#overview)
2. [Secrets Inventory](#secrets-inventory)
3. [Rotation Schedule](#rotation-schedule)
4. [Rotation Procedures](#rotation-procedures)
5. [Automation](#automation)
6. [Audit Trail](#audit-trail)
7. [Emergency Rotation](#emergency-rotation)
8. [Best Practices](#best-practices)

---

## Overview

This document outlines the procedure for rotating cryptographic secrets, API keys, and credentials in the Autonomous Coding Dashboard platform. Regular rotation minimizes the impact of potential credential compromises.

### Principles

1. **Zero Downtime**: Rotation should not cause service interruption
2. **Dual Running**: Old and new secrets run concurrently during transition
3. **Automated**: Prefer automated rotation over manual processes
4. **Audited**: All rotations logged with timestamp and initiator
5. **Tested**: Rotation procedures tested in staging before production

---

## Secrets Inventory

### Critical Secrets (Rotate Quarterly)

| Secret | Type | Location | Auto-Rotate | Priority |
|--------|------|----------|-------------|----------|
| `JWT_SECRET` | Signing key | Backend env | No | High |
| `SESSION_SECRET` | Cookie signing | Backend env | No | High |
| `DATABASE_URL` | Password | Backend env | Partial | High |
| `ANTHROPIC_API_KEY` | API key | Backend env | No | High |
| `META_APP_SECRET` | App secret | Backend env | No | High |
| `ENCRYPTION_KEY` | Encryption | Backend env | No | Critical |

### Standard Secrets (Rotate Semi-Annually)

| Secret | Type | Location | Auto-Rotate | Priority |
|--------|------|----------|-------------|----------|
| `REDIS_PASSWORD` | Password | Backend env | Partial | Medium |
| `RESEND_API_KEY` | API key | Backend env | Yes | Medium |
| `SENTRY_DSN` | API key | Backend env | No | Low |
| `SLACK_WEBHOOK_URL` | Webhook | Backend env | No | Low |
| `GITHUB_TOKEN` | PAT | Backend env | Yes | Medium |

### Service Accounts (Rotate Annually)

| Account | Purpose | Managed By | Auto-Rotate |
|---------|---------|------------|-------------|
| `supabase_service_role` | Database admin | Supabase | No |
| `meta_system_user` | Meta API | Meta | No |
| `github_actions` | CI/CD | GitHub | Yes |

---

## Rotation Schedule

### Quarterly Rotations (Every 90 Days)

```
Q1: January 15
Q2: April 15
Q3: July 15
Q4: October 15
```

### Rotation Timeline (Zero-Downtime Process)

```
Day 0: Generate new secret
Day 0: Deploy new secret alongside old (dual running)
Day 1-7: Monitor for issues
Day 7: Remove old secret
Day 7: Verify rotation complete
```

---

## Rotation Procedures

### 1. JWT_SECRET Rotation

**Purpose**: Signs JWT tokens for user authentication

**Dual-Running Strategy**: Both old and new secrets verify tokens during transition

#### Step 1: Generate New Secret

```bash
# Generate cryptographically secure secret (minimum 32 bytes)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Output: new_jwt_secret_here
```

#### Step 2: Update Environment

Edit `backend/.env`:

```env
# Old secret (keep for verification)
JWT_SECRET=old_secret_here

# New secret (for signing new tokens)
JWT_SECRET_NEW=new_jwt_secret_here
```

#### Step 3: Update Code (Dual Running)

```typescript
// backend/src/auth.ts
const JWT_SECRETS = [
  process.env.JWT_SECRET_NEW,  // Primary (for signing)
  process.env.JWT_SECRET       // Fallback (for verification only)
].filter(Boolean);

// Sign with new secret
export function signToken(payload: any) {
  return jwt.sign(payload, JWT_SECRETS[0], {
    expiresIn: '7d'
  });
}

// Verify with either secret
export function verifyToken(token: string) {
  let lastError;

  for (const secret of JWT_SECRETS) {
    try {
      return jwt.verify(token, secret);
    } catch (error) {
      lastError = error;
      continue;
    }
  }

  throw lastError;
}
```

#### Step 4: Deploy

```bash
# Build backend
cd backend
npm run build

# Deploy with PM2
pm2 reload ecosystem.config.js --update-env

# Or with Docker
docker-compose up -d --no-deps --build backend
```

#### Step 5: Monitor (7 days)

```bash
# Check token verification success rate
curl https://api.yourdomain.com/api/metrics/auth | jq '.token_verification_success_rate'

# Monitor error logs
pm2 logs backend | grep "JWT"
```

#### Step 6: Remove Old Secret (After 7 Days)

Edit `backend/.env`:

```env
# Remove JWT_SECRET, rename JWT_SECRET_NEW
JWT_SECRET=new_jwt_secret_here
```

Update code:

```typescript
// backend/src/auth.ts
const JWT_SECRET = process.env.JWT_SECRET;

export function signToken(payload: any) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string) {
  return jwt.verify(token, JWT_SECRET);
}
```

Redeploy:

```bash
pm2 reload ecosystem.config.js --update-env
```

#### Step 7: Audit

```bash
# Log rotation
echo "$(date): JWT_SECRET rotated by $(whoami)" >> /var/log/secrets-rotation.log
```

---

### 2. SESSION_SECRET Rotation

**Purpose**: Signs session cookies

**Dual-Running Strategy**: Both secrets validate cookies during transition

#### Procedure

```typescript
// backend/src/index.ts
import session from 'express-session';

app.use(session({
  secret: [
    process.env.SESSION_SECRET_NEW,  // Primary
    process.env.SESSION_SECRET       // Fallback
  ].filter(Boolean),
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  }
}));
```

Follow same steps as JWT_SECRET rotation.

---

### 3. DATABASE_URL Rotation

**Purpose**: PostgreSQL connection credentials

**Strategy**: Update password, rotate connection strings

#### Step 1: Create New Password

```sql
-- Connect as admin
psql postgres

-- Create new password for user
ALTER USER acd_user WITH PASSWORD 'new_secure_password_here';
```

#### Step 2: Test New Connection

```bash
# Test new connection string
DATABASE_URL="postgresql://acd_user:new_password@localhost:5432/acd_prod" \
  npx prisma db execute --stdin <<< "SELECT 1"
```

#### Step 3: Update Environment (Dual Running)

```env
# Primary connection
DATABASE_URL=postgresql://acd_user:new_password@localhost:5432/acd_prod

# Fallback (for connection pool draining)
DATABASE_URL_OLD=postgresql://acd_user:old_password@localhost:5432/acd_prod
```

#### Step 4: Deploy with Rolling Update

```bash
# Update instances one at a time
pm2 reload backend-0 --update-env
sleep 30
pm2 reload backend-1 --update-env
sleep 30
pm2 reload backend-2 --update-env
```

#### Step 5: Remove Old Password (After 24 Hours)

```env
DATABASE_URL=postgresql://acd_user:new_password@localhost:5432/acd_prod
```

Redeploy and verify no connection errors.

---

### 4. ANTHROPIC_API_KEY Rotation

**Purpose**: Claude API access

**Strategy**: Generate new key, update in 2 stages

#### Step 1: Generate New Key

1. Visit https://console.anthropic.com/settings/keys
2. Click "Create Key"
3. Name: `acd-production-2026-Q1`
4. Copy key immediately

#### Step 2: Update Environment

```env
ANTHROPIC_API_KEY=new_key_here
ANTHROPIC_API_KEY_BACKUP=old_key_here  # Keep for 7 days
```

#### Step 3: Update Code (Dual Running)

```typescript
// backend/src/services/anthropic.ts
import Anthropic from '@anthropic-ai/sdk';

const clients = [
  new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }),
  process.env.ANTHROPIC_API_KEY_BACKUP &&
    new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY_BACKUP })
].filter(Boolean);

export async function generateText(prompt: string) {
  for (const client of clients) {
    try {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }]
      });
      return response.content[0].text;
    } catch (error) {
      if (error.status === 401) {
        // Invalid key, try next
        continue;
      }
      throw error;
    }
  }
  throw new Error('All Anthropic API keys invalid');
}
```

#### Step 4: Deploy and Monitor

```bash
pm2 reload backend --update-env

# Monitor API calls
tail -f /var/log/backend.log | grep "Anthropic API"
```

#### Step 5: Revoke Old Key (After 7 Days)

1. Visit https://console.anthropic.com/settings/keys
2. Find old key
3. Click "Revoke"
4. Remove `ANTHROPIC_API_KEY_BACKUP` from environment

---

### 5. META_APP_SECRET Rotation

**Purpose**: Meta Marketing API app verification

**Strategy**: Update app secret in Meta dashboard

#### Step 1: Generate New Secret

1. Visit https://developers.facebook.com/apps/
2. Select your app
3. Settings → Basic
4. Click "Reset App Secret"
5. Confirm and copy new secret

#### Step 2: Update Environment

```env
META_APP_SECRET=new_secret_here
META_APP_SECRET_OLD=old_secret_here
```

#### Step 3: Update Verification Code

```typescript
// backend/src/routes/meta-webhooks.ts
import crypto from 'crypto';

function verifySignature(payload: string, signature: string): boolean {
  const secrets = [
    process.env.META_APP_SECRET,
    process.env.META_APP_SECRET_OLD
  ].filter(Boolean);

  for (const secret of secrets) {
    const expected = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    if (signature === `sha256=${expected}`) {
      return true;
    }
  }

  return false;
}
```

#### Step 4: Deploy

```bash
pm2 reload backend --update-env
```

#### Step 5: Remove Old Secret (After 24 Hours)

Remove `META_APP_SECRET_OLD` from environment and redeploy.

---

### 6. ENCRYPTION_KEY Rotation

**Purpose**: Encrypts sensitive data at rest

**Strategy**: Re-encrypt all data with new key

⚠️ **CRITICAL**: This requires database migration

#### Step 1: Generate New Key

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Step 2: Create Migration Script

```typescript
// backend/prisma/migrations/rotate-encryption-key.ts
import { PrismaClient } from '@prisma/client';
import { encrypt, decrypt } from '../src/utils/encryption';

const prisma = new PrismaClient();

const OLD_KEY = process.env.ENCRYPTION_KEY;
const NEW_KEY = process.env.ENCRYPTION_KEY_NEW;

async function rotateEncryptionKey() {
  // Get all encrypted fields
  const users = await prisma.user.findMany();

  for (const user of users) {
    if (user.encryptedField) {
      // Decrypt with old key
      const decrypted = decrypt(user.encryptedField, OLD_KEY);

      // Re-encrypt with new key
      const reencrypted = encrypt(decrypted, NEW_KEY);

      // Update
      await prisma.user.update({
        where: { id: user.id },
        data: { encryptedField: reencrypted }
      });
    }
  }

  console.log(`Rotated encryption for ${users.length} users`);
}

rotateEncryptionKey()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

#### Step 3: Run Migration (Maintenance Window)

```bash
# Backup database first!
pg_dump acd_prod > backup_before_rotation.sql

# Set both keys
export ENCRYPTION_KEY=old_key
export ENCRYPTION_KEY_NEW=new_key

# Run migration
ts-node backend/prisma/migrations/rotate-encryption-key.ts

# Verify
# Check sample records are still decryptable
```

#### Step 4: Update Environment

```env
ENCRYPTION_KEY=new_key_here
```

#### Step 5: Deploy

```bash
pm2 reload backend --update-env
```

---

## Automation

### Rotation Reminder Script

```bash
#!/bin/bash
# scripts/rotation-reminder.sh

# Check last rotation date
LAST_ROTATION=$(cat /var/log/last-rotation-date.txt 2>/dev/null || echo "1970-01-01")
CURRENT_DATE=$(date +%Y-%m-%d)
DAYS_SINCE=$((( $(date -d "$CURRENT_DATE" +%s) - $(date -d "$LAST_ROTATION" +%s) ) / 86400))

if [ $DAYS_SINCE -gt 90 ]; then
  # Send reminder
  curl -X POST $SLACK_WEBHOOK_URL \
    -H 'Content-Type: application/json' \
    -d "{\"text\":\"⚠️ Secrets rotation overdue! Last rotation: $LAST_ROTATION ($DAYS_SINCE days ago)\"}"
fi
```

### Automated Key Generation

```javascript
// scripts/generate-secrets.js
const crypto = require('crypto');
const fs = require('fs');

function generateSecrets() {
  const secrets = {
    JWT_SECRET: crypto.randomBytes(64).toString('hex'),
    SESSION_SECRET: crypto.randomBytes(64).toString('hex'),
    ENCRYPTION_KEY: crypto.randomBytes(32).toString('hex')
  };

  const timestamp = new Date().toISOString();
  const output = `# Generated: ${timestamp}\n` +
    Object.entries(secrets)
      .map(([key, value]) => `${key}_NEW=${value}`)
      .join('\n');

  fs.writeFileSync('.env.rotation', output);
  console.log('✓ New secrets generated in .env.rotation');
  console.log('⚠️ Review and manually add to .env');
}

generateSecrets();
```

### Rotation Audit Logger

```typescript
// backend/src/utils/rotation-audit.ts
import { prisma } from '../db';

export async function logRotation(secretType: string, initiatedBy: string) {
  await prisma.auditLog.create({
    data: {
      action: 'SECRET_ROTATION',
      entityType: 'secret',
      entityId: secretType,
      userId: initiatedBy,
      metadata: {
        secretType,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
      }
    }
  });
}
```

---

## Audit Trail

### Rotation Log Format

```
/var/log/secrets-rotation.log
```

Example entries:

```
2026-01-15 10:00:00 UTC | JWT_SECRET | ROTATED | user@example.com | prod | SUCCESS
2026-01-15 10:05:00 UTC | SESSION_SECRET | ROTATED | user@example.com | prod | SUCCESS
2026-01-15 10:10:00 UTC | DATABASE_URL | ROTATED | user@example.com | prod | SUCCESS
2026-04-15 09:00:00 UTC | ANTHROPIC_API_KEY | ROTATED | user@example.com | prod | SUCCESS
```

### Query Audit Log

```typescript
// Get rotation history
const rotations = await prisma.auditLog.findMany({
  where: {
    action: 'SECRET_ROTATION'
  },
  orderBy: {
    createdAt: 'desc'
  },
  take: 100
});

// Check last rotation for specific secret
const lastRotation = await prisma.auditLog.findFirst({
  where: {
    action: 'SECRET_ROTATION',
    entityId: 'JWT_SECRET'
  },
  orderBy: {
    createdAt: 'desc'
  }
});
```

---

## Emergency Rotation

### When to Rotate Immediately

1. **Credential Compromise**
   - Secret exposed in logs
   - Secret committed to public repository
   - Unauthorized access detected

2. **Security Incident**
   - Data breach
   - Insider threat
   - Third-party compromise

3. **Compliance Requirement**
   - Audit finding
   - Regulatory mandate

### Emergency Procedure

```bash
# 1. Generate new secret immediately
NEW_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")

# 2. Update environment (no dual running)
echo "JWT_SECRET=$NEW_SECRET" >> backend/.env

# 3. Force restart all instances
pm2 restart all --update-env

# 4. Revoke old credentials
# - API keys: Revoke in provider dashboard
# - Database passwords: ALTER USER ... WITH PASSWORD '...'

# 5. Monitor for issues
pm2 logs | grep ERROR

# 6. Notify team
curl -X POST $SLACK_WEBHOOK_URL \
  -d "{\"text\":\"🚨 EMERGENCY: JWT_SECRET rotated due to suspected compromise\"}"

# 7. Document incident
echo "$(date): EMERGENCY rotation - JWT_SECRET - Reason: [...]" >> /var/log/incidents.log
```

---

## Best Practices

### 1. Use Secret Management Tools

- **HashiCorp Vault**: Enterprise secret management
- **AWS Secrets Manager**: AWS-native solution
- **Azure Key Vault**: Azure-native solution
- **Google Secret Manager**: GCP-native solution

```typescript
// Example: AWS Secrets Manager
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

async function getSecret(secretName: string) {
  const client = new SecretsManagerClient({ region: 'us-east-1' });

  const response = await client.send(
    new GetSecretValueCommand({ SecretId: secretName })
  );

  return JSON.parse(response.SecretString);
}

// Use in app
const secrets = await getSecret('acd-production-secrets');
const JWT_SECRET = secrets.JWT_SECRET;
```

### 2. Never Commit Secrets

```bash
# Add to .gitignore
.env
.env.local
.env.production
.env.rotation
*.key
*.pem
secrets.json
```

### 3. Minimum Secret Length

- Passwords: 16+ characters
- API Keys: 32+ characters
- Encryption Keys: 32+ bytes (256-bit)
- JWT Secrets: 64+ bytes (512-bit)

### 4. Use Different Secrets Per Environment

```
.env.development
.env.staging
.env.production
```

Never reuse production secrets in other environments.

### 5. Secure Secret Storage

```bash
# Encrypt secrets at rest
gpg --symmetric .env.production

# Decrypt when needed
gpg --decrypt .env.production.gpg > .env.production
```

---

## Checklist

### Pre-Rotation

- [ ] Schedule rotation during low-traffic period
- [ ] Notify team of upcoming rotation
- [ ] Backup database
- [ ] Test rotation in staging
- [ ] Prepare rollback plan

### During Rotation

- [ ] Generate new secret
- [ ] Update environment variables
- [ ] Deploy with dual-running
- [ ] Monitor error logs
- [ ] Verify functionality
- [ ] Document rotation

### Post-Rotation

- [ ] Monitor for 7 days
- [ ] Remove old secret
- [ ] Revoke old credentials
- [ ] Update rotation log
- [ ] Update secret inventory
- [ ] Schedule next rotation

---

## Resources

- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [HashiCorp Vault](https://www.vaultproject.io/)
- [AWS Secrets Manager](https://aws.amazon.com/secrets-manager/)
- [NIST Key Management](https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final)

---

**Last Updated:** 2026-03-01
**Next Scheduled Rotation:** 2026-04-15
