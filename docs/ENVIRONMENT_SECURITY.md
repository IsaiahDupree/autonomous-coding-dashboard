# Environment Variable Security (PCT-WC-037)

## Overview

This document outlines best practices for handling environment variables and secrets to ensure they don't leak into client bundles or get committed to version control.

## Current Security Status

### ✅ Implemented Protections

1. **Gitignore Configuration**: `.env` files are properly ignored in `.gitignore`
2. **Client-Safe Prefix Convention**: Only variables with specific prefixes can be exposed to client code
3. **Secret Scanning Utility**: Automated scanning for potential secrets in code
4. **Environment Example File**: `.env.example` provides template without real secrets

### ⚠️ Known Issues

1. **Historical .env Commits**: The `backend/.env` file was previously committed to git history (commits found from Feb 2026)
   - **Impact**: Low (if production secrets have been rotated)
   - **Recommendation**: Rotate any secrets that were in the committed file

## Safe Environment Variable Practices

### Client-Side Variables

Only environment variables with these prefixes should be used in client-side code:

- `NEXT_PUBLIC_*` (Next.js convention)
- `VITE_*` (Vite convention)
- `PUBLIC_*` (General public prefix)
- `REACT_APP_*` (Create React App convention)

**Example:**
```typescript
// ✅ SAFE - Will be bundled into client code
const apiUrl = process.env.NEXT_PUBLIC_API_URL;

// ❌ UNSAFE - Should never be in client code
const dbUrl = process.env.DATABASE_URL;
const secret = process.env.JWT_SECRET;
```

### Server-Side Variables

All sensitive secrets should only be accessed in server-side code:

- Database URLs
- API keys
- JWT secrets
- OAuth tokens
- Encryption keys

**Example:**
```typescript
// ✅ SAFE - Only in server-side code (API routes, server components)
import { getEnvValue } from './config/env-config';

const dbUrl = getEnvValue('DATABASE_URL');
const jwtSecret = getEnvValue('JWT_SECRET');
```

## Environment File Structure

### `.env` (Never commit this!)

Contains actual secrets for local development:

```bash
DATABASE_URL=postgresql://user:actual_password@localhost:5433/db
JWT_SECRET=actual_secret_key_here
ANTHROPIC_API_KEY=sk-ant-actual-key-here
```

### `.env.example` (Safe to commit)

Contains example values without real secrets:

```bash
DATABASE_URL=postgresql://user:password@localhost:5433/db_name
JWT_SECRET=your_jwt_secret_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

### `.gitignore` (Must include)

```gitignore
# Environment files
.env
.env.local
.env.*.local
backend/.env
backend/.env.supabase
```

## Security Scanning

### Manual Scan

Run the environment security scanner:

```bash
cd backend
npm run security:env
```

This will check for:
- Hardcoded API keys
- Sensitive environment variables in client code
- Proper .gitignore configuration
- Existence of .env.example

### Automated Checks

Environment security checks are included in:
- Pre-commit hooks (if configured)
- CI/CD pipeline tests
- Security test suite

## Fixing Historical .env Commits

If you need to remove .env from git history (destructive operation):

```bash
# ⚠️ CAUTION: This rewrites git history
# Make sure all team members are aware and can re-clone

# 1. Remove file from git tracking (keep local copy)
git rm --cached backend/.env

# 2. Commit the removal
git commit -m "Remove .env from git tracking"

# 3. (Optional) Remove from git history using BFG Repo-Cleaner
# Download from: https://rtyley.github.io/bfg-repo-cleaner/
java -jar bfg.jar --delete-files .env

# 4. Force push (coordinate with team!)
git push --force
```

**Note**: If the repository is public or secrets have been exposed, you MUST:
1. Rotate ALL secrets that were in the committed file
2. Treat them as compromised
3. Monitor for unauthorized access

## Environment Security Checklist

- [ ] `.env` is in `.gitignore`
- [ ] `.env.example` exists with placeholder values
- [ ] No hardcoded secrets in code
- [ ] Client code only uses prefixed environment variables
- [ ] Production secrets are rotated regularly
- [ ] CI/CD uses secure secret management (GitHub Secrets, AWS Secrets Manager, etc.)
- [ ] `.env` file has restricted permissions (chmod 600)

## Production Deployment

For production, never use `.env` files. Instead:

1. **Use Platform Secret Management**:
   - Vercel: Environment Variables UI
   - AWS: Secrets Manager or Parameter Store
   - Heroku: Config Vars
   - Docker: Secrets or Environment Variables

2. **Use Managed Services**:
   - Supabase: Auto-configured environment variables
   - Netlify: Environment variables UI

3. **Implement Secret Rotation**:
   - Rotate secrets every 90 days
   - Automate rotation where possible
   - Track rotation in security logs

## Testing

Environment security is tested in:

- `backend/src/__tests__/env-security.test.ts`
- `backend/src/__tests__/pct-security.test.ts`

Run tests:
```bash
cd backend
npm test
```

## Related Documentation

- [Backend Configuration](../backend/README.md)
- [Security Best Practices](./SECURITY.md)
- [PCT Security Implementation](./PCT_SECURITY.md)

## Compliance

This implementation satisfies:
- **PCT-WC-037**: Environment variable security
  - ✅ No secrets in client bundles
  - ✅ No .env in git (going forward)
