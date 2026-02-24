# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it responsibly:

1. **Do NOT** open a public GitHub issue
2. Email security concerns to the repository owner
3. Include steps to reproduce, impact assessment, and any suggested fixes

We aim to acknowledge reports within 48 hours and provide a fix within 7 days for critical issues.

## Security Standards

This project enforces the following security standards:

### Secrets Management
- All API keys, tokens, and credentials stored in environment variables only
- `.env` files are gitignored — never committed to version control
- Secrets referenced via `process.env` or `os.environ`, never hardcoded

### Network Security
- All local services bind to `127.0.0.1` (loopback only)
- Authentication required on all API endpoints (Bearer token or API key)
- No permissive CORS — origins explicitly allowlisted

### Supply Chain
- Dependabot enabled for automated dependency updates
- Dependency review blocks PRs introducing known vulnerabilities
- CodeQL scanning on all pushes to main

### Runtime
- Least-privilege OAuth scopes — read-only where possible
- Approval gates for destructive operations (paid ads, bulk messaging, deployments)
- File operations restricted to workspace directories only

## Supported Versions

Only the latest version on the `main`/`master` branch is actively maintained.
