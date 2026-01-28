# Advanced Environment Variable Configuration

This document describes the enhanced, highly configurable environment variable system.

## Overview

The enhanced configuration system supports:
- ✅ Customizable variable names
- ✅ Default values
- ✅ Type conversion (string, number, boolean, JSON)
- ✅ Validation rules (patterns, ranges, allowed values)
- ✅ Multiple fallback sources (env vars, files, commands)
- ✅ Environment-specific overrides (dev, staging, prod)
- ✅ JSON config file support
- ✅ Required vs optional variables
- ✅ Comprehensive error messages

## Configuration Methods

### Method 1: Environment Variables (Simplest)

Set configuration via environment variables:

```bash
# Customize variable names
ENV_VAR_CONFIG_CLAUDE_OAUTH_TOKEN=MY_CLAUDE_TOKEN
ENV_VAR_CONFIG_BACKEND_PORT=API_PORT

# Set actual values
MY_CLAUDE_TOKEN=sk-ant-oat01-...
API_PORT=3434
```

### Method 2: JSON Config File (Most Flexible)

Create `env-config.json` in the project root:

```json
{
  "claudeOAuthToken": {
    "envVarName": "MY_CLAUDE_TOKEN",
    "required": false,
    "type": "string",
    "fallbackVars": ["ANTHROPIC_API_KEY"],
    "description": "Claude OAuth token"
  },
  "backendPort": {
    "envVarName": "API_PORT",
    "type": "number",
    "defaultValue": 3434,
    "min": 1024,
    "max": 65535,
    "envOverrides": {
      "development": 3434,
      "staging": 3435,
      "production": 80
    }
  },
  "databaseUrl": {
    "envVarName": "POSTGRES_URL",
    "type": "string",
    "pattern": "^postgresql://",
    "fallbackFile": ".secrets/db_url.txt"
  }
}
```

## Configuration Options

### Basic Options

| Option | Type | Description |
|--------|------|-------------|
| `envVarName` | string | The actual environment variable name to use |
| `configVarName` | string | Config variable name (ENV_VAR_CONFIG_*) |
| `defaultValue` | any | Default value if not set |
| `required` | boolean | Whether variable is required (default: false) |
| `type` | string | Type conversion: 'string', 'number', 'boolean', 'json' |
| `description` | string | Description for documentation |

### Validation Options

| Option | Type | Description |
|--------|------|-------------|
| `validator` | function | Custom validation function `(value) => boolean` |
| `allowedValues` | array | Allowed values (for enums) |
| `min` | number | Minimum value (for numbers) |
| `max` | number | Maximum value (for numbers) |
| `pattern` | RegExp | Pattern to match (for strings) |

### Fallback Options

| Option | Type | Description |
|--------|------|-------------|
| `fallbackVars` | string[] | Alternative env var names to try |
| `fallbackFile` | string | File path to read value from |
| `fallbackCommand` | string | Command to run to get value |

### Environment-Specific Overrides

| Option | Type | Description |
|--------|------|-------------|
| `envOverrides` | object | Override values per environment: `{ development: value, staging: value, production: value, test: value }` |

## Examples

### Example 1: Custom Variable Names with Defaults

```json
{
  "backendPort": {
    "envVarName": "API_PORT",
    "type": "number",
    "defaultValue": 3434,
    "min": 1024,
    "max": 65535
  }
}
```

### Example 2: Multiple Fallback Sources

```json
{
  "claudeOAuthToken": {
    "envVarName": "CLAUDE_TOKEN",
    "fallbackVars": ["ANTHROPIC_API_KEY", "CLAUDE_API_KEY"],
    "fallbackFile": ".secrets/claude_token.txt",
    "fallbackCommand": "cat ~/.claude/token"
  }
}
```

### Example 3: Environment-Specific Values

```json
{
  "databaseUrl": {
    "envVarName": "DATABASE_URL",
    "envOverrides": {
      "development": "postgresql://localhost:5432/dev_db",
      "staging": "postgresql://staging-db:5432/staging_db",
      "production": "postgresql://prod-db:5432/prod_db"
    }
  }
}
```

### Example 4: Validation with Pattern

```json
{
  "databaseUrl": {
    "envVarName": "DATABASE_URL",
    "type": "string",
    "pattern": "^postgresql://",
    "required": true,
    "description": "PostgreSQL connection string"
  }
}
```

### Example 5: Enum Values

```json
{
  "nodeEnv": {
    "envVarName": "NODE_ENV",
    "type": "string",
    "allowedValues": ["development", "staging", "production", "test"],
    "defaultValue": "development"
  }
}
```

### Example 6: Number with Range

```json
{
  "backendPort": {
    "envVarName": "PORT",
    "type": "number",
    "min": 1024,
    "max": 65535,
    "defaultValue": 3434
  }
}
```

### Example 7: Boolean Type

```json
{
  "enableDebug": {
    "envVarName": "DEBUG",
    "type": "boolean",
    "defaultValue": false,
    "envOverrides": {
      "development": true,
      "production": false
    }
  }
}
```

### Example 8: JSON Type

```json
{
  "appConfig": {
    "envVarName": "APP_CONFIG",
    "type": "json",
    "defaultValue": "{\"feature\": true}",
    "description": "Application configuration as JSON"
  }
}
```

## Usage in Code

### Basic Usage

```typescript
import { getEnvValue, getClaudeApiKey } from './config/env-config';

// Get value with all features (type conversion, validation, fallbacks)
const port = getEnvValue('backendPort'); // Returns number

// Get Claude API key (tries OAuth token first, then API key)
const apiKey = getClaudeApiKey();

// Get with backward-compatible API
const url = getEnv('databaseUrl', 'default-value');
```

### Validation

```typescript
import { validateEnvConfig } from './config/env-config';

const validation = validateEnvConfig();
if (!validation.valid) {
  console.error('Environment configuration errors:');
  validation.errors.forEach(error => console.error(`  - ${error}`));
}
```

### Get All Definitions

```typescript
import { getAllEnvVarDefinitions } from './config/env-config';

const definitions = getAllEnvVarDefinitions();
console.log(definitions.backendPort.description);
```

## Config File Locations

The system looks for `env-config.json` in these locations (in order):
1. `backend/env-config.json`
2. `env-config.json` (project root)
3. `process.cwd()/env-config.json`

## Priority Order

When resolving values, the system uses this priority:
1. Environment variable (primary name)
2. Fallback environment variables (in order)
3. Fallback file
4. Fallback command
5. Environment-specific override (based on NODE_ENV)
6. Default value
7. Error if required

## Error Handling

The system provides detailed error messages:

```typescript
try {
  const port = getEnvValue('backendPort');
} catch (error) {
  // Error message includes:
  // - Variable name
  // - Validation failures
  // - Required status
  // - Description
  console.error(error.message);
}
```

## Migration from Basic Config

If you're using the basic `ENV_VAR_CONFIG_*` approach, it still works! The enhanced system is backward compatible.

To migrate to JSON config:
1. Create `env-config.json`
2. Copy your `ENV_VAR_CONFIG_*` values to the JSON format
3. Add additional features as needed

## Best Practices

1. **Use JSON config for complex setups** - Easier to manage multiple environments
2. **Set defaults** - Makes development easier
3. **Use validation** - Catch configuration errors early
4. **Document with descriptions** - Helps team members understand variables
5. **Use environment overrides** - Different values per environment
6. **Validate on startup** - Call `validateEnvConfig()` at app start

## See Also

- [ENV_CONFIG.md](./ENV_CONFIG.md) - Basic configuration guide
- [env-config.example.json](./env-config.example.json) - Example config file
- [Backend Configuration](./backend/src/config/env-config.ts) - Source code

