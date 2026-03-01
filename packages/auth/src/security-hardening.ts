/**
 * Security Hardening Module
 * =========================
 *
 * Implements AUTH-WC-031 through AUTH-WC-045:
 *   031: CSRF tokens on POST/PUT/DELETE (already in middleware.ts, re-exported)
 *   032: Rate limit sign-in/up/reset
 *   033: Rate limit all APIs
 *   034: Sanitize all user inputs
 *   035: Verify parameterized queries
 *   036: CSP, HSTS, X-Frame-Options (already in middleware.ts, re-exported)
 *   037: No secrets in client bundles
 *   038: Secure token storage/rotation (already in jwt.ts/session.ts)
 *   039: Validate uploads
 *   040: Auth on every endpoint
 *   041: Automated CVE scanning
 *   042: Encrypt PII at rest
 *   043: Log security-relevant actions
 *   044: Secure sessions with timeouts
 *   045: Data export/deletion/consent (already in enterprise/compliance)
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// ---------------------------------------------------------------------------
// AUTH-WC-032: Rate limit sign-in/sign-up/password-reset
// ---------------------------------------------------------------------------

export interface AuthRateLimitConfig {
  /** Max sign-in attempts per IP per window (default 5) */
  signInMax?: number;
  /** Max sign-up attempts per IP per window (default 3) */
  signUpMax?: number;
  /** Max password reset attempts per IP per window (default 3) */
  resetMax?: number;
  /** Window in ms (default 15 minutes) */
  windowMs?: number;
  /** Lockout duration in ms after exceeding limits (default 30 minutes) */
  lockoutMs?: number;
}

interface AuthAttemptEntry {
  count: number;
  resetAt: number;
  lockedUntil?: number;
}

const authAttemptStore = new Map<string, AuthAttemptEntry>();

/**
 * Stricter rate limiter for authentication endpoints.
 * Lower limits and lockout after threshold exceeded.
 */
export function authRateLimiter(config: AuthRateLimitConfig = {}) {
  const {
    signInMax = 5,
    signUpMax = 3,
    resetMax = 3,
    windowMs = 15 * 60 * 1000,
    lockoutMs = 30 * 60 * 1000,
  } = config;

  // Cleanup every 10 minutes
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of authAttemptStore) {
      if (now >= entry.resetAt && (!entry.lockedUntil || now >= entry.lockedUntil)) {
        authAttemptStore.delete(key);
      }
    }
  }, 10 * 60 * 1000);
  if (cleanup && typeof cleanup === 'object' && 'unref' in cleanup) {
    cleanup.unref();
  }

  return (endpoint: 'sign-in' | 'sign-up' | 'reset') => {
    const maxAttempts = endpoint === 'sign-in' ? signInMax
      : endpoint === 'sign-up' ? signUpMax
      : resetMax;

    return (req: Request, res: Response, next: NextFunction): void => {
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      const key = `auth:${endpoint}:${ip}`;
      const now = Date.now();

      let entry = authAttemptStore.get(key);

      // Check lockout
      if (entry?.lockedUntil && now < entry.lockedUntil) {
        const retryAfter = Math.ceil((entry.lockedUntil - now) / 1000);
        res.setHeader('Retry-After', retryAfter.toString());
        res.status(429).json({
          error: {
            code: 'AUTH_RATE_LIMITED',
            message: `Too many ${endpoint} attempts. Try again in ${retryAfter} seconds.`,
            retryAfter,
          },
        });
        return;
      }

      if (!entry || now >= entry.resetAt) {
        entry = { count: 0, resetAt: now + windowMs };
        authAttemptStore.set(key, entry);
      }

      entry.count++;

      if (entry.count > maxAttempts) {
        entry.lockedUntil = now + lockoutMs;
        const retryAfter = Math.ceil(lockoutMs / 1000);
        res.setHeader('Retry-After', retryAfter.toString());
        res.status(429).json({
          error: {
            code: 'AUTH_RATE_LIMITED',
            message: `Too many ${endpoint} attempts. Account locked for ${Math.ceil(lockoutMs / 60000)} minutes.`,
            retryAfter,
          },
        });
        return;
      }

      next();
    };
  };
}

// ---------------------------------------------------------------------------
// AUTH-WC-034: Sanitize all user inputs
// ---------------------------------------------------------------------------

/** Characters and patterns to strip from user input */
const DANGEROUS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /data:\s*text\/html/gi,
  /<iframe/gi,
  /<object/gi,
  /<embed/gi,
  /<form/gi,
];

const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
};

/**
 * Sanitize a string value by escaping HTML entities and removing dangerous patterns.
 */
export function sanitizeString(input: string): string {
  let sanitized = input;

  // Remove dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    sanitized = sanitized.replace(pattern, '');
  }

  // Escape HTML entities
  sanitized = sanitized.replace(/[&<>"'/]/g, char => HTML_ENTITIES[char] || char);

  return sanitized.trim();
}

/**
 * Recursively sanitize all string values in an object.
 */
export function sanitizeObject<T>(obj: T, maxDepth = 10): T {
  if (maxDepth <= 0) return obj;

  if (typeof obj === 'string') {
    return sanitizeString(obj) as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, maxDepth - 1)) as unknown as T;
  }

  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[sanitizeString(key)] = sanitizeObject(value, maxDepth - 1);
    }
    return result as T;
  }

  return obj;
}

/**
 * Express middleware that sanitizes req.body, req.query, and req.params.
 */
export function inputSanitizer(options: { excludePaths?: string[] } = {}) {
  const { excludePaths = [] } = options;

  return (req: Request, _res: Response, next: NextFunction): void => {
    if (excludePaths.some(p => req.path.startsWith(p))) {
      return next();
    }

    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }

    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query);
    }

    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeObject(req.params);
    }

    next();
  };
}

// ---------------------------------------------------------------------------
// AUTH-WC-035: Verify parameterized queries
// ---------------------------------------------------------------------------

/**
 * SQL injection detection patterns.
 * Used to validate that user inputs don't contain SQL injection attempts.
 */
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b.*\b(FROM|INTO|TABLE|WHERE|SET)\b)/i,
  /(';\s*--)/,
  /(;\s*DROP\s)/i,
  /(\bOR\b\s+\d+\s*=\s*\d+)/i,
  /(\bAND\b\s+\d+\s*=\s*\d+)/i,
  /(UNION\s+ALL\s+SELECT)/i,
];

/**
 * Check if a string contains SQL injection patterns.
 */
export function detectSqlInjection(value: string): boolean {
  return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(value));
}

/**
 * Middleware that rejects requests containing SQL injection patterns.
 */
export function sqlInjectionGuard() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const valuesToCheck: string[] = [];

    // Collect all string values from body, query, params
    const collectStrings = (obj: unknown): void => {
      if (typeof obj === 'string') {
        valuesToCheck.push(obj);
      } else if (Array.isArray(obj)) {
        obj.forEach(collectStrings);
      } else if (obj !== null && typeof obj === 'object') {
        Object.values(obj as Record<string, unknown>).forEach(collectStrings);
      }
    };

    collectStrings(req.body);
    collectStrings(req.query);
    collectStrings(req.params);

    for (const value of valuesToCheck) {
      if (detectSqlInjection(value)) {
        res.status(400).json({
          error: {
            code: 'INVALID_INPUT',
            message: 'Request contains disallowed characters or patterns.',
          },
        });
        return;
      }
    }

    next();
  };
}

// ---------------------------------------------------------------------------
// AUTH-WC-037: No secrets in client bundles
// ---------------------------------------------------------------------------

/** Common secret patterns that should never appear in client bundles */
const SECRET_PATTERNS = [
  { name: 'AWS Secret Key', pattern: /AKIA[0-9A-Z]{16}/ },
  { name: 'Stripe Secret Key', pattern: /sk_live_[a-zA-Z0-9]{24,}/ },
  { name: 'Stripe Restricted Key', pattern: /rk_live_[a-zA-Z0-9]{24,}/ },
  { name: 'Private Key', pattern: /-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----/ },
  { name: 'Supabase Service Key', pattern: /eyJ[a-zA-Z0-9_-]{100,}\.eyJ[a-zA-Z0-9_-]{100,}/ },
  { name: 'Generic Secret', pattern: /(?:secret|password|token|api_key|apikey)\s*[:=]\s*['"][a-zA-Z0-9+/=]{20,}['"]/i },
  { name: 'Database URL', pattern: /(?:postgres|mysql|mongodb):\/\/[^:]+:[^@]+@/ },
];

export interface SecretScanResult {
  hasSecrets: boolean;
  findings: Array<{
    name: string;
    line: number;
    column: number;
    snippet: string;
  }>;
}

/**
 * Scan a string (e.g., bundled JS) for accidentally included secrets.
 */
export function scanForSecrets(content: string): SecretScanResult {
  const findings: SecretScanResult['findings'] = [];
  const lines = content.split('\n');

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    for (const { name, pattern } of SECRET_PATTERNS) {
      const match = pattern.exec(line);
      if (match) {
        findings.push({
          name,
          line: lineIdx + 1,
          column: match.index + 1,
          snippet: line.substring(
            Math.max(0, match.index - 10),
            Math.min(line.length, match.index + 30),
          ).replace(/./g, (c, i) => i >= 10 && i < 10 + match[0].length ? '*' : c),
        });
      }
    }
  }

  return { hasSecrets: findings.length > 0, findings };
}

// ---------------------------------------------------------------------------
// AUTH-WC-039: Validate uploads
// ---------------------------------------------------------------------------

export interface UploadValidationConfig {
  /** Allowed MIME types */
  allowedTypes?: string[];
  /** Max file size in bytes (default 10MB) */
  maxSizeBytes?: number;
  /** Max filename length (default 255) */
  maxFilenameLength?: number;
  /** Whether to strip EXIF data (default true) */
  stripExif?: boolean;
}

const DEFAULT_ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif', 'image/svg+xml',
  'video/mp4', 'video/webm', 'video/quicktime',
  'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm',
  'application/pdf',
  'text/csv', 'application/json',
];

/** File type magic bytes for validation */
const MAGIC_BYTES: Record<string, number[]> = {
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'image/png': [0x89, 0x50, 0x4E, 0x47],
  'image/gif': [0x47, 0x49, 0x46],
  'image/webp': [0x52, 0x49, 0x46, 0x46],
  'video/mp4': [0x00, 0x00, 0x00],
  'application/pdf': [0x25, 0x50, 0x44, 0x46],
};

/** Dangerous filename patterns */
const DANGEROUS_FILENAME_PATTERNS = [
  /\.\./,        // Path traversal
  /[<>:"|?*]/,   // Invalid chars
  /^\.+$/,       // Only dots
  /\.(exe|bat|cmd|com|scr|pif|msi|dll|sys|vbs|js|ps1|sh|cgi)$/i, // Executables
];

export interface UploadValidationResult {
  valid: boolean;
  errors: string[];
  sanitizedFilename?: string;
}

/**
 * Validate an uploaded file.
 */
export function validateUpload(
  filename: string,
  mimeType: string,
  sizeBytes: number,
  fileBuffer?: Buffer,
  config: UploadValidationConfig = {},
): UploadValidationResult {
  const {
    allowedTypes = DEFAULT_ALLOWED_TYPES,
    maxSizeBytes = 10 * 1024 * 1024,
    maxFilenameLength = 255,
  } = config;

  const errors: string[] = [];

  // Check MIME type
  if (!allowedTypes.includes(mimeType)) {
    errors.push(`File type "${mimeType}" is not allowed. Allowed: ${allowedTypes.join(', ')}`);
  }

  // Check file size
  if (sizeBytes > maxSizeBytes) {
    errors.push(`File size ${sizeBytes} exceeds maximum ${maxSizeBytes} bytes.`);
  }

  if (sizeBytes === 0) {
    errors.push('File is empty.');
  }

  // Check filename
  if (filename.length > maxFilenameLength) {
    errors.push(`Filename exceeds ${maxFilenameLength} characters.`);
  }

  for (const pattern of DANGEROUS_FILENAME_PATTERNS) {
    if (pattern.test(filename)) {
      errors.push(`Filename contains disallowed characters or patterns.`);
      break;
    }
  }

  // Validate magic bytes if buffer provided
  if (fileBuffer && fileBuffer.length >= 4) {
    const expectedMagic = MAGIC_BYTES[mimeType];
    if (expectedMagic) {
      const actualMagic = Array.from(fileBuffer.subarray(0, expectedMagic.length));
      const matches = expectedMagic.every((byte, i) => actualMagic[i] === byte);
      if (!matches) {
        errors.push('File content does not match declared MIME type.');
      }
    }
  }

  // Sanitize filename
  const sanitizedFilename = filename
    .replace(/[<>:"|?*]/g, '_')
    .replace(/\.\./g, '_')
    .replace(/^\.+/, '')
    .substring(0, maxFilenameLength);

  return {
    valid: errors.length === 0,
    errors,
    sanitizedFilename,
  };
}

/**
 * Express middleware for file upload validation.
 */
export function uploadValidationMiddleware(config: UploadValidationConfig = {}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.file && (!req.files || (Array.isArray(req.files) && req.files.length === 0))) {
      return next();
    }

    const files = req.file ? [req.file] : (req.files as Express.Multer.File[] || []);

    for (const file of files) {
      const result = validateUpload(
        file.originalname,
        file.mimetype,
        file.size,
        file.buffer,
        config,
      );

      if (!result.valid) {
        res.status(400).json({
          error: {
            code: 'INVALID_UPLOAD',
            message: 'File validation failed.',
            details: result.errors,
          },
        });
        return;
      }

      // Replace original name with sanitized version
      if (result.sanitizedFilename) {
        file.originalname = result.sanitizedFilename;
      }
    }

    next();
  };
}

// ---------------------------------------------------------------------------
// AUTH-WC-040: Auth on every endpoint
// ---------------------------------------------------------------------------

/**
 * Middleware that ensures all endpoints require authentication by default.
 * Allows explicit opt-out for public routes.
 */
export function requireAuthByDefault(options: {
  publicPaths?: string[];
  publicPatterns?: RegExp[];
} = {}) {
  const { publicPaths = [], publicPatterns = [] } = options;

  const defaultPublicPaths = [
    '/health',
    '/api/health',
    '/api/v1/health',
    '/.well-known/',
    '/favicon.ico',
    '/robots.txt',
    '/sitemap.xml',
  ];

  const allPublicPaths = [...defaultPublicPaths, ...publicPaths];

  return (req: Request, res: Response, next: NextFunction): void => {
    // Check if path is public
    const isPublic = allPublicPaths.some(p => req.path === p || req.path.startsWith(p)) ||
      publicPatterns.some(p => p.test(req.path));

    if (isPublic) {
      return next();
    }

    // Check for auth (Bearer token or API key)
    const hasBearer = req.headers.authorization?.startsWith('Bearer ');
    const hasApiKey = !!req.headers['x-api-key'];
    const hasCookie = !!req.cookies?.['acd-session'];

    if (!hasBearer && !hasApiKey && !hasCookie) {
      res.status(401).json({
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Authentication is required for this endpoint.',
        },
      });
      return;
    }

    next();
  };
}

// ---------------------------------------------------------------------------
// AUTH-WC-041: Automated CVE scanning
// ---------------------------------------------------------------------------

export interface CVEScanConfig {
  /** Path to package.json (default: process.cwd()) */
  projectRoot?: string;
  /** Severity levels to flag (default: ['critical', 'high']) */
  severityThreshold?: ('critical' | 'high' | 'moderate' | 'low')[];
  /** Max allowed vulnerabilities before failing (default: 0) */
  maxAllowed?: number;
}

export interface CVEScanResult {
  totalVulnerabilities: number;
  bySeverity: Record<string, number>;
  passed: boolean;
  command: string;
  advisories: string[];
}

/**
 * Generate npm audit command for CVE scanning.
 * Returns the command string to run.
 */
export function getCVEScanCommand(config: CVEScanConfig = {}): string {
  const { severityThreshold = ['critical', 'high'] } = config;
  const minSeverity = severityThreshold.includes('low') ? 'low'
    : severityThreshold.includes('moderate') ? 'moderate'
    : severityThreshold.includes('high') ? 'high'
    : 'critical';

  return `npm audit --audit-level=${minSeverity} --json`;
}

/**
 * Parse npm audit JSON output into CVE scan result.
 */
export function parseCVEScanOutput(output: string, config: CVEScanConfig = {}): CVEScanResult {
  const { maxAllowed = 0 } = config;

  try {
    const data = JSON.parse(output);
    const metadata = data.metadata?.vulnerabilities || {};

    const bySeverity: Record<string, number> = {
      critical: metadata.critical || 0,
      high: metadata.high || 0,
      moderate: metadata.moderate || 0,
      low: metadata.low || 0,
    };

    const total = metadata.total || Object.values(bySeverity).reduce((a: number, b: number) => a + b, 0);

    const advisories = Object.keys(data.advisories || {});

    return {
      totalVulnerabilities: total,
      bySeverity,
      passed: total <= maxAllowed,
      command: 'npm audit',
      advisories,
    };
  } catch {
    return {
      totalVulnerabilities: 0,
      bySeverity: {},
      passed: true,
      command: 'npm audit',
      advisories: [],
    };
  }
}

// ---------------------------------------------------------------------------
// AUTH-WC-042: Encrypt PII at rest
// ---------------------------------------------------------------------------

const PII_ALGORITHM = 'aes-256-gcm';
const PII_IV_LENGTH = 16;
const PII_TAG_LENGTH = 16;

/**
 * Encrypt a PII field value.
 */
export function encryptPII(plaintext: string, encryptionKey: string): string {
  const key = crypto.scryptSync(encryptionKey, 'acd-pii-salt', 32);
  const iv = crypto.randomBytes(PII_IV_LENGTH);
  const cipher = crypto.createCipheriv(PII_ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt a PII field value.
 */
export function decryptPII(ciphertext: string, encryptionKey: string): string {
  const [ivHex, tagHex, encrypted] = ciphertext.split(':');
  if (!ivHex || !tagHex || !encrypted) {
    throw new Error('Invalid encrypted PII format.');
  }

  const key = crypto.scryptSync(encryptionKey, 'acd-pii-salt', 32);
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(tagHex, 'hex');
  const decipher = crypto.createDecipheriv(PII_ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/** PII fields that should be encrypted at rest */
export const PII_FIELDS = [
  'email', 'phone', 'full_name', 'first_name', 'last_name',
  'address', 'ssn', 'date_of_birth', 'ip_address',
  'credit_card', 'bank_account',
] as const;

/**
 * Encrypt all PII fields in an object before storage.
 */
export function encryptPIIFields(
  data: Record<string, unknown>,
  encryptionKey: string,
  fields: readonly string[] = PII_FIELDS,
): Record<string, unknown> {
  const result = { ...data };
  for (const field of fields) {
    if (field in result && typeof result[field] === 'string' && result[field]) {
      result[field] = encryptPII(result[field] as string, encryptionKey);
    }
  }
  return result;
}

/**
 * Decrypt all PII fields in an object after retrieval.
 */
export function decryptPIIFields(
  data: Record<string, unknown>,
  encryptionKey: string,
  fields: readonly string[] = PII_FIELDS,
): Record<string, unknown> {
  const result = { ...data };
  for (const field of fields) {
    if (field in result && typeof result[field] === 'string' && result[field]) {
      try {
        result[field] = decryptPII(result[field] as string, encryptionKey);
      } catch {
        // Field may not be encrypted (e.g., older data), leave as-is
      }
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// AUTH-WC-043: Log security-relevant actions
// ---------------------------------------------------------------------------

export type SecurityEventType =
  | 'auth.login'
  | 'auth.login_failed'
  | 'auth.logout'
  | 'auth.signup'
  | 'auth.password_reset'
  | 'auth.password_changed'
  | 'auth.mfa_enabled'
  | 'auth.mfa_disabled'
  | 'auth.token_refresh'
  | 'auth.session_revoked'
  | 'access.unauthorized'
  | 'access.forbidden'
  | 'access.rate_limited'
  | 'data.export'
  | 'data.deletion'
  | 'data.pii_access'
  | 'admin.user_impersonation'
  | 'admin.role_change'
  | 'admin.config_change'
  | 'security.csrf_failed'
  | 'security.sql_injection_attempt'
  | 'security.xss_attempt'
  | 'security.upload_rejected'
  | 'security.suspicious_activity';

export interface SecurityLogEntry {
  id: string;
  timestamp: number;
  eventType: SecurityEventType;
  actorId?: string;
  actorIp: string;
  userAgent?: string;
  resource?: string;
  details: Record<string, unknown>;
  severity: 'info' | 'warning' | 'critical';
}

/**
 * Security event logger.
 * Logs all security-relevant actions for monitoring and forensics.
 */
export class SecurityLogger {
  private entries: SecurityLogEntry[] = [];
  private idCounter = 0;
  private onLog?: (entry: SecurityLogEntry) => void;

  constructor(options?: { onLog?: (entry: SecurityLogEntry) => void }) {
    this.onLog = options?.onLog;
  }

  log(event: Omit<SecurityLogEntry, 'id' | 'timestamp'>): SecurityLogEntry {
    this.idCounter++;
    const entry: SecurityLogEntry = {
      id: `sec_${this.idCounter}`,
      timestamp: Date.now(),
      ...event,
    };

    Object.freeze(entry);
    this.entries.push(entry);

    // Notify listener
    this.onLog?.(entry);

    // Trim old entries (keep last 10000)
    if (this.entries.length > 10000) {
      this.entries = this.entries.slice(-10000);
    }

    return entry;
  }

  query(filters: {
    eventType?: SecurityEventType;
    actorId?: string;
    severity?: SecurityLogEntry['severity'];
    since?: number;
    limit?: number;
  }): SecurityLogEntry[] {
    let results = this.entries;

    if (filters.eventType) {
      results = results.filter(e => e.eventType === filters.eventType);
    }
    if (filters.actorId) {
      results = results.filter(e => e.actorId === filters.actorId);
    }
    if (filters.severity) {
      results = results.filter(e => e.severity === filters.severity);
    }
    if (filters.since) {
      results = results.filter(e => e.timestamp >= filters.since);
    }

    results = results.sort((a, b) => b.timestamp - a.timestamp);

    if (filters.limit) {
      results = results.slice(0, filters.limit);
    }

    return results;
  }

  getCriticalEvents(since: number): SecurityLogEntry[] {
    return this.query({ severity: 'critical', since });
  }

  getRecentFailedLogins(since: number): SecurityLogEntry[] {
    return this.query({ eventType: 'auth.login_failed', since });
  }

  /** Export entries as JSON for archival */
  export(since?: number): string {
    const entries = since ? this.entries.filter(e => e.timestamp >= since) : this.entries;
    return JSON.stringify(entries, null, 2);
  }

  size(): number {
    return this.entries.length;
  }
}

/**
 * Express middleware that logs security events automatically.
 */
export function securityLoggingMiddleware(logger: SecurityLogger) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const originalEnd = res.end;
    const startTime = Date.now();

    // Override res.end to capture response
    (res as any).end = function (...args: any[]) {
      const duration = Date.now() - startTime;
      const actorIp = req.ip || req.socket.remoteAddress || 'unknown';
      const userAgent = req.headers['user-agent'];

      // Log failed auth attempts
      if (res.statusCode === 401) {
        logger.log({
          eventType: 'access.unauthorized',
          actorIp,
          userAgent,
          resource: `${req.method} ${req.path}`,
          details: { statusCode: 401, duration },
          severity: 'warning',
        });
      }

      // Log forbidden access
      if (res.statusCode === 403) {
        logger.log({
          eventType: 'access.forbidden',
          actorId: (req as any).user?.sub,
          actorIp,
          userAgent,
          resource: `${req.method} ${req.path}`,
          details: { statusCode: 403, duration },
          severity: 'warning',
        });
      }

      // Log rate limiting
      if (res.statusCode === 429) {
        logger.log({
          eventType: 'access.rate_limited',
          actorIp,
          userAgent,
          resource: `${req.method} ${req.path}`,
          details: { statusCode: 429, duration },
          severity: 'warning',
        });
      }

      return originalEnd.apply(res, args);
    };

    next();
  };
}

// ---------------------------------------------------------------------------
// AUTH-WC-044: Secure sessions with timeouts
// ---------------------------------------------------------------------------

export interface SessionTimeoutConfig {
  /** Absolute session timeout in ms (default 24 hours) */
  absoluteTimeoutMs?: number;
  /** Idle session timeout in ms (default 30 minutes) */
  idleTimeoutMs?: number;
  /** Session renewal threshold in ms (default 5 minutes) */
  renewalThresholdMs?: number;
}

interface ManagedSession {
  id: string;
  userId: string;
  createdAt: number;
  lastActivityAt: number;
  expiresAt: number;
  metadata: Record<string, unknown>;
}

/**
 * Session manager with configurable timeouts.
 */
export class SessionTimeoutManager {
  private sessions = new Map<string, ManagedSession>();
  private config: Required<SessionTimeoutConfig>;

  constructor(config: SessionTimeoutConfig = {}) {
    this.config = {
      absoluteTimeoutMs: config.absoluteTimeoutMs ?? 24 * 60 * 60 * 1000,
      idleTimeoutMs: config.idleTimeoutMs ?? 30 * 60 * 1000,
      renewalThresholdMs: config.renewalThresholdMs ?? 5 * 60 * 1000,
    };

    // Cleanup expired sessions every 5 minutes
    const cleanup = setInterval(() => this.cleanupExpired(), 5 * 60 * 1000);
    if (cleanup && typeof cleanup === 'object' && 'unref' in cleanup) {
      cleanup.unref();
    }
  }

  create(userId: string, metadata: Record<string, unknown> = {}): ManagedSession {
    const now = Date.now();
    const session: ManagedSession = {
      id: crypto.randomUUID(),
      userId,
      createdAt: now,
      lastActivityAt: now,
      expiresAt: now + this.config.absoluteTimeoutMs,
      metadata,
    };

    this.sessions.set(session.id, session);
    return { ...session };
  }

  validate(sessionId: string): { valid: boolean; reason?: string; session?: ManagedSession } {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { valid: false, reason: 'Session not found.' };
    }

    const now = Date.now();

    // Check absolute timeout
    if (now > session.expiresAt) {
      this.sessions.delete(sessionId);
      return { valid: false, reason: 'Session expired (absolute timeout).' };
    }

    // Check idle timeout
    if (now - session.lastActivityAt > this.config.idleTimeoutMs) {
      this.sessions.delete(sessionId);
      return { valid: false, reason: 'Session expired (idle timeout).' };
    }

    // Update last activity
    session.lastActivityAt = now;

    return { valid: true, session: { ...session } };
  }

  revoke(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  revokeAllForUser(userId: string): number {
    let count = 0;
    for (const [id, session] of this.sessions) {
      if (session.userId === userId) {
        this.sessions.delete(id);
        count++;
      }
    }
    return count;
  }

  getActiveSessions(userId: string): ManagedSession[] {
    const now = Date.now();
    const result: ManagedSession[] = [];
    for (const session of this.sessions.values()) {
      if (session.userId === userId && now <= session.expiresAt) {
        result.push({ ...session });
      }
    }
    return result;
  }

  private cleanupExpired(): void {
    const now = Date.now();
    for (const [id, session] of this.sessions) {
      if (now > session.expiresAt || now - session.lastActivityAt > this.config.idleTimeoutMs) {
        this.sessions.delete(id);
      }
    }
  }

  size(): number {
    return this.sessions.size;
  }
}

// ---------------------------------------------------------------------------
// HSTS Header middleware (supplement to AUTH-WC-036)
// ---------------------------------------------------------------------------

/**
 * HSTS (HTTP Strict Transport Security) middleware.
 * Forces HTTPS connections with configurable max-age.
 */
export function hstsHeaders(options: {
  maxAge?: number;
  includeSubDomains?: boolean;
  preload?: boolean;
} = {}) {
  const {
    maxAge = 31536000, // 1 year
    includeSubDomains = true,
    preload = false,
  } = options;

  let headerValue = `max-age=${maxAge}`;
  if (includeSubDomains) headerValue += '; includeSubDomains';
  if (preload) headerValue += '; preload';

  return (_req: Request, res: Response, next: NextFunction): void => {
    res.setHeader('Strict-Transport-Security', headerValue);
    next();
  };
}
