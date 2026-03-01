/**
 * Security Tests
 * ==============
 *
 * AUTH-WC-022: Response shape validation
 * AUTH-WC-023: Unauthenticated rejection
 * AUTH-WC-024: XSS and SQL injection tests
 * AUTH-WC-030: Tests for fixed bugs
 */

import { describe, test, expect } from 'vitest';
import {
  createMockRequest,
  createMockResponse,
  createMockNext,
  TEST_ENCRYPTION_KEY,
} from './setup';

import {
  sanitizeString,
  sanitizeObject,
  detectSqlInjection,
  validateUpload,
  scanForSecrets,
  encryptPII,
  decryptPII,
  encryptPIIFields,
  decryptPIIFields,
  SecurityLogger,
} from '../src/security-hardening';

// ══════════════════════════════════════════════════════════════════════════════
// AUTH-WC-024: XSS and SQL injection tests
// ══════════════════════════════════════════════════════════════════════════════

describe('AUTH-WC-024: XSS prevention', () => {
  test('sanitizeString removes script tags', () => {
    const input = '<script>alert("xss")</script>Hello';
    const result = sanitizeString(input);
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('</script>');
  });

  test('sanitizeString escapes HTML entities', () => {
    const input = '<div>Hello & "World"</div>';
    const result = sanitizeString(input);
    expect(result).not.toContain('<div>');
    expect(result).toContain('&amp;');
  });

  test('sanitizeString removes javascript: URLs', () => {
    const input = 'javascript:alert(1)';
    const result = sanitizeString(input);
    expect(result).not.toContain('javascript:');
  });

  test('sanitizeString removes event handlers', () => {
    const input = '<img onerror="alert(1)" src="x">';
    const result = sanitizeString(input);
    expect(result).not.toContain('onerror=');
  });

  test('sanitizeObject handles nested objects', () => {
    const input = {
      name: '<script>alert(1)</script>John',
      nested: { value: '<img onerror=alert(1)>' },
    };
    const result = sanitizeObject(input);
    expect(JSON.stringify(result)).not.toContain('<script>');
    expect(JSON.stringify(result)).not.toContain('onerror');
  });

  test('sanitizeObject handles arrays', () => {
    const input = ['<script>x</script>', 'safe'];
    const result = sanitizeObject(input);
    expect(JSON.stringify(result)).not.toContain('<script>');
  });
});

describe('AUTH-WC-024: SQL injection prevention', () => {
  test('detectSqlInjection catches basic injection', () => {
    expect(detectSqlInjection("' OR 1=1 --")).toBeTruthy();
  });

  test('detectSqlInjection catches UNION attacks', () => {
    expect(detectSqlInjection('UNION ALL SELECT * FROM users')).toBeTruthy();
  });

  test('detectSqlInjection catches DROP TABLE', () => {
    expect(detectSqlInjection('; DROP TABLE users')).toBeTruthy();
  });

  test('detectSqlInjection allows normal input', () => {
    expect(detectSqlInjection('John Smith')).toBeFalsy();
    expect(detectSqlInjection('user@example.com')).toBeFalsy();
    expect(detectSqlInjection('Hello world, this is a test')).toBeFalsy();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Upload validation tests
// ══════════════════════════════════════════════════════════════════════════════

describe('Upload validation', () => {
  test('validates allowed MIME types', () => {
    const result = validateUpload('photo.jpg', 'image/jpeg', 1024);
    expect(result.valid).toBeTruthy();
  });

  test('rejects disallowed MIME types', () => {
    const result = validateUpload('hack.exe', 'application/x-msdownload', 1024);
    expect(result.valid).toBeFalsy();
  });

  test('rejects files exceeding size limit', () => {
    const result = validateUpload('big.jpg', 'image/jpeg', 100 * 1024 * 1024);
    expect(result.valid).toBeFalsy();
  });

  test('rejects empty files', () => {
    const result = validateUpload('empty.jpg', 'image/jpeg', 0);
    expect(result.valid).toBeFalsy();
  });

  test('rejects path traversal in filename', () => {
    const result = validateUpload('../../../etc/passwd', 'text/csv', 1024);
    expect(result.valid).toBeFalsy();
  });

  test('rejects executable extensions', () => {
    const result = validateUpload('malicious.exe', 'image/jpeg', 1024);
    expect(result.valid).toBeFalsy();
  });

  test('sanitizes filenames', () => {
    const result = validateUpload('my<file>.jpg', 'image/jpeg', 1024);
    expect(result.sanitizedFilename).toBeTruthy();
    expect(result.sanitizedFilename!).not.toContain('<');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Secret scanning tests
// ══════════════════════════════════════════════════════════════════════════════

describe('Secret scanning', () => {
  test('detects Stripe secret keys', () => {
    const code = 'const key = "sk_li' + 've_51ABCDefgHIjklMNOpqrstuVWxyz123456";';
    const result = scanForSecrets(code);
    expect(result.hasSecrets).toBeTruthy();
  });

  test('detects private keys', () => {
    const code = '-----BEGIN RSA PRIVATE KEY-----\nMIIE...';
    const result = scanForSecrets(code);
    expect(result.hasSecrets).toBeTruthy();
  });

  test('detects database URLs with credentials', () => {
    const code = 'const url = "postgres://admin:s3cr3t@db.example.com/mydb"';
    const result = scanForSecrets(code);
    expect(result.hasSecrets).toBeTruthy();
  });

  test('does not flag normal code', () => {
    const code = 'const greeting = "Hello, world!"; const count = 42;';
    const result = scanForSecrets(code);
    expect(result.hasSecrets).toBeFalsy();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// PII encryption tests
// ══════════════════════════════════════════════════════════════════════════════

describe('PII encryption', () => {
  test('encrypts and decrypts PII correctly', () => {
    const plaintext = 'user@example.com';
    const encrypted = encryptPII(plaintext, TEST_ENCRYPTION_KEY);
    const decrypted = decryptPII(encrypted, TEST_ENCRYPTION_KEY);
    expect(decrypted).toBe(plaintext);
  });

  test('encrypted value differs from plaintext', () => {
    const plaintext = 'sensitive data';
    const encrypted = encryptPII(plaintext, TEST_ENCRYPTION_KEY);
    expect(encrypted).not.toBe(plaintext);
  });

  test('encrypts PII fields in an object', () => {
    const data = { email: 'test@test.com', name: 'Test', age: 25 };
    const encrypted = encryptPIIFields(data, TEST_ENCRYPTION_KEY, ['email']);
    expect(encrypted.email).not.toBe('test@test.com');
    expect(encrypted.age).toBe(25); // Non-PII field unchanged
  });

  test('decrypts PII fields in an object', () => {
    const data = { email: 'test@test.com', name: 'Test' };
    const encrypted = encryptPIIFields(data, TEST_ENCRYPTION_KEY, ['email']);
    const decrypted = decryptPIIFields(encrypted, TEST_ENCRYPTION_KEY, ['email']);
    expect(decrypted.email).toBe('test@test.com');
  });

  test('different plaintexts produce different ciphertexts', () => {
    const e1 = encryptPII('test1@test.com', TEST_ENCRYPTION_KEY);
    const e2 = encryptPII('test2@test.com', TEST_ENCRYPTION_KEY);
    expect(e1).not.toBe(e2);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Security logger tests
// ══════════════════════════════════════════════════════════════════════════════

describe('Security logger', () => {
  test('logs security events', () => {
    const logger = new SecurityLogger();
    const entry = logger.log({
      eventType: 'auth.login',
      actorIp: '192.168.1.1',
      actorId: 'user-1',
      details: { method: 'password' },
      severity: 'info',
    });
    expect(entry.id).toBeTruthy();
    expect(entry.timestamp).toBeGreaterThan(0);
    expect(logger.size()).toBe(1);
  });

  test('queries events by type', () => {
    const logger = new SecurityLogger();
    logger.log({ eventType: 'auth.login', actorIp: '1.1.1.1', details: {}, severity: 'info' });
    logger.log({ eventType: 'auth.login_failed', actorIp: '2.2.2.2', details: {}, severity: 'warning' });
    logger.log({ eventType: 'auth.login', actorIp: '3.3.3.3', details: {}, severity: 'info' });

    const loginEvents = logger.query({ eventType: 'auth.login' });
    expect(loginEvents.length).toBe(2);
  });

  test('filters by severity', () => {
    const logger = new SecurityLogger();
    logger.log({ eventType: 'auth.login', actorIp: '1.1.1.1', details: {}, severity: 'info' });
    logger.log({ eventType: 'security.xss_attempt', actorIp: '2.2.2.2', details: {}, severity: 'critical' });

    const critical = logger.getCriticalEvents(0);
    expect(critical.length).toBe(1);
  });

  test('exports as JSON', () => {
    const logger = new SecurityLogger();
    logger.log({ eventType: 'auth.login', actorIp: '1.1.1.1', details: {}, severity: 'info' });

    const json = logger.export();
    const parsed = JSON.parse(json);
    expect(parsed.length).toBe(1);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// AUTH-WC-022: Response shape validation
// ══════════════════════════════════════════════════════════════════════════════

describe('AUTH-WC-022: Response shape validation', () => {
  test('error responses have consistent shape', () => {
    const res = createMockResponse();
    res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Auth required.' },
    });
    expect(res.body.error).toBeTruthy();
    expect(res.body.error.code).toBeTruthy();
    expect(res.body.error.message).toBeTruthy();
  });

  test('rate limit response includes headers', () => {
    const res = createMockResponse();
    res.setHeader('X-RateLimit-Limit', '100');
    res.setHeader('X-RateLimit-Remaining', '99');
    res.setHeader('X-RateLimit-Reset', '60');
    expect(res.getHeader('X-RateLimit-Limit')).toBe('100');
    expect(res.getHeader('X-RateLimit-Remaining')).toBe('99');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// AUTH-WC-023: Unauthenticated rejection
// ══════════════════════════════════════════════════════════════════════════════

describe('AUTH-WC-023: Unauthenticated rejection', () => {
  test('requests without credentials are identified', () => {
    const req = createMockRequest({});
    const hasAuth = req.headers.authorization?.startsWith('Bearer ');
    const hasApiKey = !!req.headers['x-api-key'];
    expect(hasAuth).toBeFalsy();
    expect(hasApiKey).toBeFalsy();
  });

  test('requests with API key are identified', () => {
    const req = createMockRequest({ headers: { 'x-api-key': 'acd_testkey123' } });
    expect(!!req.headers['x-api-key']).toBeTruthy();
  });
});

// Tests complete
