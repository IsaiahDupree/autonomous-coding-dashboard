/**
 * PCT Environment Validator
 * PCT-WC-102: Structured env with validation
 */

class PCTEnvValidator {
  constructor() {
    this.required = [
      'NODE_ENV',
      'PORT',
      'APP_URL',
      'DATABASE_URL',
      'JWT_SECRET',
      'SESSION_SECRET',
    ];

    this.schema = {
      NODE_ENV: { type: 'enum', values: ['development', 'staging', 'production'] },
      PORT: { type: 'number', min: 1000, max: 65535 },
      APP_URL: { type: 'url' },
      DATABASE_URL: { type: 'string', pattern: /^postgresql:\/\// },
      DATABASE_POOL_MIN: { type: 'number', min: 1, default: 2 },
      DATABASE_POOL_MAX: { type: 'number', min: 1, default: 10 },
      REDIS_URL: { type: 'string', optional: true },
      JWT_SECRET: { type: 'string', minLength: 32 },
      SESSION_SECRET: { type: 'string', minLength: 32 },
      LOG_LEVEL: { type: 'enum', values: ['error', 'warn', 'info', 'debug'], default: 'info' },
      RATE_LIMIT_WINDOW_MS: { type: 'number', default: 900000 },
      RATE_LIMIT_MAX_REQUESTS: { type: 'number', default: 100 },
    };
  }

  /**
   * Validate environment variables
   */
  validate() {
    const errors = [];

    // Check required variables
    this.required.forEach((key) => {
      if (!process.env[key]) {
        errors.push(`Missing required environment variable: ${key}`);
      }
    });

    // Validate types and constraints
    Object.entries(this.schema).forEach(([key, rules]) => {
      const value = process.env[key];

      // Skip if optional and not provided
      if (rules.optional && !value) return;

      // Apply default if not provided
      if (!value && rules.default !== undefined) {
        process.env[key] = String(rules.default);
        return;
      }

      // Type validation
      if (value) {
        switch (rules.type) {
          case 'number':
            const num = Number(value);
            if (isNaN(num)) {
              errors.push(`${key} must be a number`);
            } else if (rules.min !== undefined && num < rules.min) {
              errors.push(`${key} must be >= ${rules.min}`);
            } else if (rules.max !== undefined && num > rules.max) {
              errors.push(`${key} must be <= ${rules.max}`);
            }
            break;

          case 'enum':
            if (!rules.values.includes(value)) {
              errors.push(`${key} must be one of: ${rules.values.join(', ')}`);
            }
            break;

          case 'url':
            try {
              new URL(value);
            } catch {
              errors.push(`${key} must be a valid URL`);
            }
            break;

          case 'string':
            if (rules.pattern && !rules.pattern.test(value)) {
              errors.push(`${key} does not match required pattern`);
            }
            if (rules.minLength && value.length < rules.minLength) {
              errors.push(`${key} must be at least ${rules.minLength} characters`);
            }
            break;
        }
      }
    });

    if (errors.length > 0) {
      console.error('[Env Validation] Errors found:');
      errors.forEach((err) => console.error(`  - ${err}`));
      throw new Error('Environment validation failed');
    }

    console.log('[Env Validation] All environment variables validated successfully');
    return true;
  }

  /**
   * Get environment info
   */
  getInfo() {
    return {
      nodeEnv: process.env.NODE_ENV,
      port: process.env.PORT,
      appUrl: process.env.APP_URL,
      hasDatabase: !!process.env.DATABASE_URL,
      hasRedis: !!process.env.REDIS_URL,
      hasSentry: !!process.env.SENTRY_DSN,
      logLevel: process.env.LOG_LEVEL || 'info',
    };
  }
}

// Export for use in Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = new PCTEnvValidator();
}

// Also make available globally
if (typeof window !== 'undefined') {
  window.PCTEnvValidator = PCTEnvValidator;
}
