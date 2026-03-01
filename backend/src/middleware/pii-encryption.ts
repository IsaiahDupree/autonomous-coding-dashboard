/**
 * Middleware for automatic PII encryption/decryption
 */

import { Request, Response, NextFunction } from 'express';
import { encryptionHelpers, PII_FIELDS } from '../utils/encryption';

/**
 * Encrypts PII fields before sending to database
 * Use this as Prisma middleware
 */
export function createPrismaEncryptionMiddleware() {
  return async (params: any, next: any) => {
    const { model, action } = params;

    // Encrypt on create and update
    if (['create', 'update', 'upsert'].includes(action)) {
      if (model && PII_FIELDS[model as keyof typeof PII_FIELDS]) {
        const fields = PII_FIELDS[model as keyof typeof PII_FIELDS];

        if (params.args?.data) {
          params.args.data = encryptionHelpers.encryptFields(
            params.args.data,
            fields as string[]
          );
        }
      }
    }

    const result = await next(params);

    // Decrypt on read
    if (['findUnique', 'findFirst', 'findMany'].includes(action)) {
      if (model && PII_FIELDS[model as keyof typeof PII_FIELDS]) {
        const fields = PII_FIELDS[model as keyof typeof PII_FIELDS];

        if (Array.isArray(result)) {
          return result.map((item) =>
            encryptionHelpers.decryptFields(item, fields as string[])
          );
        } else if (result) {
          return encryptionHelpers.decryptFields(result, fields as string[]);
        }
      }
    }

    return result;
  };
}

/**
 * Express middleware to sanitize PII from logs
 */
export function sanitizePiiFromLogs(req: Request, res: Response, next: NextFunction) {
  // Store original JSON method
  const originalJson = res.json.bind(res);

  // Override res.json to sanitize before sending
  res.json = function (body: any) {
    // Don't log sensitive fields
    if (body?.data) {
      const sanitized = { ...body };
      if (Array.isArray(sanitized.data)) {
        sanitized.data = sanitized.data.map(sanitizeObject);
      } else if (typeof sanitized.data === 'object') {
        sanitized.data = sanitizeObject(sanitized.data);
      }

      // Log sanitized version only
      console.log('[Response]', {
        path: req.path,
        method: req.method,
        status: res.statusCode,
        data: sanitized,
      });
    }

    return originalJson(body);
  };

  next();
}

function sanitizeObject(obj: any): any {
  const sanitized = { ...obj };
  const piiFields = ['email', 'name', 'password', 'token', 'accessToken'];

  for (const field of piiFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}

/**
 * Audit log for PII access
 * Logs when PII is accessed for compliance
 */
export function auditPiiAccess(req: Request, res: Response, next: NextFunction) {
  const isPiiRoute = req.path.includes('/users') ||
                     req.path.includes('/profile') ||
                     req.path.includes('/api-tokens');

  if (isPiiRoute && ['GET', 'PUT', 'PATCH'].includes(req.method)) {
    console.log('[PII Access]', {
      timestamp: new Date().toISOString(),
      userId: (req as any).user?.id || 'anonymous',
      ip: req.ip,
      path: req.path,
      method: req.method,
      userAgent: req.get('user-agent'),
    });
  }

  next();
}
