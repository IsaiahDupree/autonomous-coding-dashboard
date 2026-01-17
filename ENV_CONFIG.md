# Environment Variable Configuration

This document describes how to configure environment variable names used throughout the autonomous coding dashboard.

## Overview

The system uses a centralized configuration system that allows you to customize which environment variable names are used for different purposes. This makes it easy to:

- Use different naming conventions
- Support multiple environments
- Override defaults without changing code

## Default Environment Variable Names

By default, the system uses these environment variable names:

| Purpose | Default Name | Description |
|---------|-------------|-------------|
| Claude OAuth Token | `CLAUDE_CODE_OAUTH_TOKEN` | Primary OAuth token for Claude API |
| Claude API Key | `ANTHROPIC_API_KEY` | Alternative API key for Claude API |
| Database URL | `DATABASE_URL` | PostgreSQL connection string |
| Redis URL | `REDIS_URL` | Redis connection string |
| Backend Port | `PORT` | Backend server port (default: 3434) |
| Dashboard Port | `DASHBOARD_PORT` | Dashboard server port (default: 3535) |
| Agent Service URL | `AGENT_SERVICE_URL` | Python agent service URL |
| Node Environment | `NODE_ENV` | Node.js environment (development/production) |

## Customizing Environment Variable Names

You can override any environment variable name by setting a configuration variable in your `.env` file:

### Format

```
ENV_VAR_CONFIG_<PURPOSE>=<custom_name>
```

### Examples

```bash
# Use custom names for Claude authentication
ENV_VAR_CONFIG_CLAUDE_OAUTH_TOKEN=MY_CLAUDE_TOKEN
ENV_VAR_CONFIG_CLAUDE_API_KEY=MY_CLAUDE_KEY

# Use custom database URL variable
ENV_VAR_CONFIG_DATABASE_URL=POSTGRES_CONNECTION_STRING

# Use custom port variables
ENV_VAR_CONFIG_BACKEND_PORT=API_PORT
ENV_VAR_CONFIG_DASHBOARD_PORT=UI_PORT
```

## Configuration Variables

| Config Variable | Overrides | Example |
|----------------|-----------|---------|
| `ENV_VAR_CONFIG_CLAUDE_OAUTH_TOKEN` | OAuth token env var name | `MY_CLAUDE_TOKEN` |
| `ENV_VAR_CONFIG_CLAUDE_API_KEY` | API key env var name | `MY_CLAUDE_KEY` |
| `ENV_VAR_CONFIG_DATABASE_URL` | Database URL env var name | `POSTGRES_URL` |
| `ENV_VAR_CONFIG_REDIS_URL` | Redis URL env var name | `REDIS_CONNECTION` |
| `ENV_VAR_CONFIG_BACKEND_PORT` | Backend port env var name | `API_PORT` |
| `ENV_VAR_CONFIG_DASHBOARD_PORT` | Dashboard port env var name | `UI_PORT` |
| `ENV_VAR_CONFIG_AGENT_SERVICE_URL` | Agent service URL env var name | `PYTHON_SERVICE_URL` |
| `ENV_VAR_CONFIG_NODE_ENV` | Node environment env var name | `ENVIRONMENT` |

## Usage Examples

### Example 1: Custom Claude Token Names

If your organization uses different naming conventions:

```bash
# .env file
ENV_VAR_CONFIG_CLAUDE_OAUTH_TOKEN=CLAUDE_OAUTH_TOKEN
ENV_VAR_CONFIG_CLAUDE_API_KEY=CLAUDE_API_KEY

# Then set your actual values
CLAUDE_OAUTH_TOKEN=sk-ant-oat01-...
CLAUDE_API_KEY=sk-ant-api03-...
```

### Example 2: Multiple Environments

For different environments, you can use different variable names:

```bash
# Development .env
ENV_VAR_CONFIG_DATABASE_URL=DEV_DATABASE_URL
DEV_DATABASE_URL=postgresql://localhost:5432/dev_db

# Production .env
ENV_VAR_CONFIG_DATABASE_URL=PROD_DATABASE_URL
PROD_DATABASE_URL=postgresql://prod-server:5432/prod_db
```

### Example 3: Docker/Container Environments

For containerized deployments:

```bash
# docker-compose.yml
environment:
  - ENV_VAR_CONFIG_CLAUDE_OAUTH_TOKEN=CLAUDE_TOKEN
  - CLAUDE_TOKEN=${CLAUDE_TOKEN}
  - ENV_VAR_CONFIG_DATABASE_URL=DB_URL
  - DB_URL=${DATABASE_URL}
```

## Implementation Details

The configuration system is implemented in `backend/src/config/env-config.ts`:

- **Default values**: Defined in `DEFAULT_ENV_NAMES`
- **Override mechanism**: Checks for `ENV_VAR_CONFIG_*` environment variables
- **Helper functions**: 
  - `getClaudeApiKey()`: Gets the configured API key/token
  - `isOAuthToken()`: Checks if using OAuth token
  - `getEnv(name, defaultValue)`: Gets any configured env var value
  - `getEnvConfig()`: Gets all configured env var names

## Backward Compatibility

The system maintains full backward compatibility:

- If no configuration variables are set, defaults are used
- Existing `.env` files continue to work without changes
- All code uses the configuration system transparently

## Migration Guide

To migrate to custom environment variable names:

1. **Add configuration variables** to your `.env` file:
   ```bash
   ENV_VAR_CONFIG_CLAUDE_OAUTH_TOKEN=MY_CUSTOM_TOKEN_NAME
   ```

2. **Set your actual values** using the new names:
   ```bash
   MY_CUSTOM_TOKEN_NAME=sk-ant-oat01-...
   ```

3. **Restart services** to pick up the new configuration

4. **Verify** that the system is using the correct variables by checking logs

## Troubleshooting

### Issue: Environment variables not being read

**Solution**: Make sure your `.env` file is in the correct location:
- Root `.env` file
- `backend/.env` file
- Both are loaded automatically

### Issue: Custom names not working

**Solution**: Check that:
1. Configuration variable is set: `ENV_VAR_CONFIG_*`
2. Actual value is set using the custom name
3. Services have been restarted after changes

### Issue: Multiple .env files

**Solution**: The system loads from multiple locations in order:
1. Root `.env`
2. `backend/.env`
3. Environment variables (highest priority)

## See Also

- [PORT_CONFIGURATION.md](./PORT_CONFIGURATION.md) - Port configuration details
- [QUICK_START.md](./QUICK_START.md) - Quick start guide
- [Backend Configuration](./backend/src/config/env-config.ts) - Source code

