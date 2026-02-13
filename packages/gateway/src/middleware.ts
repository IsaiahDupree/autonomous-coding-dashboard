import { GatewayConfig } from './types';
import { ApiKeyManager } from './api-keys';
import { GatewayRateLimiter } from './rate-limiter';
import { RequestLogger } from './logger';
import { ApiVersionManager } from './versioning';

// ─── Express-compatible types ────────────────────────────────────────────────
// We define minimal interfaces to avoid requiring express as a hard dependency.

export interface MiddlewareRequest {
  method: string;
  url?: string;
  path?: string;
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
  socket?: { remoteAddress?: string };
  query?: Record<string, string | string[] | undefined>;
  /** Attached by apiKeyMiddleware after successful validation */
  apiKey?: {
    id: string;
    ownerId: string;
    orgId: string;
    scopes: string[];
    product: string | null;
  };
  /** Attached by versionMiddleware */
  apiVersion?: string;
}

export interface MiddlewareResponse {
  statusCode: number;
  getHeader?(name: string): string | number | string[] | undefined;
  setHeader(name: string, value: string | number): void;
  status(code: number): MiddlewareResponse;
  json(body: unknown): void;
  end?(data?: string): void;
}

export type NextFunction = (err?: unknown) => void;

export type Middleware = (
  req: MiddlewareRequest,
  res: MiddlewareResponse,
  next: NextFunction
) => void;

// ─── API Key Middleware ──────────────────────────────────────────────────────

/**
 * Express middleware that extracts and validates the API key from the X-API-Key header.
 * On success, attaches key metadata to req.apiKey.
 * On failure, responds with 401 Unauthorized.
 */
export function apiKeyMiddleware(manager: ApiKeyManager): Middleware {
  return async (req: MiddlewareRequest, res: MiddlewareResponse, next: NextFunction) => {
    const rawKey = getHeader(req.headers, 'x-api-key');

    if (!rawKey) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing API key. Provide it via the X-API-Key header.',
      });
      return;
    }

    try {
      const record = await manager.validateKey(rawKey);

      if (!record) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid or expired API key.',
        });
        return;
      }

      // Attach key info to request
      req.apiKey = {
        id: record.id,
        ownerId: record.ownerId,
        orgId: record.orgId,
        scopes: record.scopes,
        product: record.product,
      };

      next();
    } catch (err) {
      next(err);
    }
  };
}

// ─── Rate Limit Middleware ───────────────────────────────────────────────────

/**
 * Express middleware that applies per-consumer rate limiting.
 * Uses the API key ID (if available), falling back to IP address.
 * Sets X-RateLimit-* headers on the response.
 * Returns 429 Too Many Requests when limit is exceeded.
 */
export function rateLimitMiddleware(limiter: GatewayRateLimiter): Middleware {
  return (req: MiddlewareRequest, res: MiddlewareResponse, next: NextFunction) => {
    // Determine the rate limit key: prefer API key ID, then IP
    const key = req.apiKey?.id ?? req.ip ?? req.socket?.remoteAddress ?? 'unknown';

    const { allowed, info } = limiter.consume(key);

    // Set rate limit headers
    const headers = limiter.getRateLimitHeaders(info);
    for (const [name, value] of Object.entries(headers)) {
      res.setHeader(name, value);
    }

    if (!allowed) {
      res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please retry after the reset time.',
        retryAfter: Math.ceil((info.resetAt.getTime() - Date.now()) / 1000),
      });
      return;
    }

    next();
  };
}

// ─── Logging Middleware ──────────────────────────────────────────────────────

/**
 * Express middleware that logs request/response details.
 * Captures timing, status code, and metadata from earlier middleware.
 */
export function loggingMiddleware(logger: RequestLogger): Middleware {
  return (req: MiddlewareRequest, res: MiddlewareResponse, next: NextFunction) => {
    const startTime = Date.now();

    // Hook into response finish to capture final status and timing
    const originalEnd = res.end;

    if (originalEnd) {
      res.end = function (this: MiddlewareResponse, data?: string) {
        const responseTimeMs = Date.now() - startTime;

        logger.log(req, res, responseTimeMs, {
          apiKeyId: req.apiKey?.id,
          userId: req.apiKey?.ownerId,
          orgId: req.apiKey?.orgId,
          product: req.apiKey?.product ?? undefined,
        });

        return originalEnd.call(this, data);
      };
    }

    next();
  };
}

// ─── Version Middleware ──────────────────────────────────────────────────────

/**
 * Express middleware that resolves the API version from the request.
 * Sets the resolved version on req.apiVersion and adds version headers to the response.
 * Returns 400 if an unsupported version is requested.
 */
export function versionMiddleware(versioner: ApiVersionManager): Middleware {
  return (req: MiddlewareRequest, res: MiddlewareResponse, next: NextFunction) => {
    const { version } = versioner.resolveVersion(req);
    const negotiated = versioner.negotiate(version);

    if (!versioner.isSupported(negotiated)) {
      res.status(400).json({
        error: 'Bad Request',
        message: `API version "${version}" is not supported.`,
        supportedVersions: versioner.getSupportedVersions().map((v) => v.version),
      });
      return;
    }

    // Attach version to request
    req.apiVersion = negotiated;

    // Set version headers on response
    const headers = versioner.getVersionHeaders(negotiated);
    for (const [name, value] of Object.entries(headers)) {
      res.setHeader(name, value);
    }

    // Warn about deprecation
    if (versioner.isDeprecated(negotiated)) {
      res.setHeader('Warning', `299 - "API version ${negotiated} is deprecated"`);
    }

    next();
  };
}

// ─── Combined Gateway Middleware ─────────────────────────────────────────────

/**
 * Creates a full gateway middleware chain from a GatewayConfig.
 * Returns an array of middleware functions to be applied in order:
 * 1. API Key validation
 * 2. Rate limiting
 * 3. Request logging
 * 4. API version resolution
 */
export function createGatewayMiddleware(config: GatewayConfig): {
  middlewares: Middleware[];
  apiKeyManager: ApiKeyManager;
  rateLimiter: GatewayRateLimiter;
  requestLogger: RequestLogger;
  versionManager: ApiVersionManager;
} {
  const apiKeyManager = new ApiKeyManager({
    hashAlgorithm: config.apiKeys.hashAlgorithm,
    prefix: config.apiKeys.prefix,
  });

  const rateLimiter = new GatewayRateLimiter(config.rateLimit);

  const requestLogger = new RequestLogger({
    enabled: config.logging.enabled,
    includeHeaders: config.logging.includeHeaders,
    excludePaths: config.logging.excludePaths,
    sensitiveHeaders: config.logging.sensitiveHeaders,
  });

  const versionManager = new ApiVersionManager({
    current: config.versioning.current,
    supported: config.versioning.supported,
    headerName: config.versioning.headerName,
  });

  const middlewares: Middleware[] = [
    apiKeyMiddleware(apiKeyManager),
    rateLimitMiddleware(rateLimiter),
    loggingMiddleware(requestLogger),
    versionMiddleware(versionManager),
  ];

  return {
    middlewares,
    apiKeyManager,
    rateLimiter,
    requestLogger,
    versionManager,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getHeader(
  headers: Record<string, string | string[] | undefined>,
  name: string
): string | undefined {
  const value = headers[name] ?? headers[name.toLowerCase()];
  if (Array.isArray(value)) return value[0];
  return value;
}
