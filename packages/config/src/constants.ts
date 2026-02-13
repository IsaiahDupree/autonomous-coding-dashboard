// ---------------------------------------------------------------------------
// Rate Limits
// ---------------------------------------------------------------------------

/** Default rate-limit window in milliseconds (1 minute). */
export const RATE_LIMIT_WINDOW_MS = 60_000;

/** Default maximum requests per rate-limit window. */
export const RATE_LIMIT_MAX_REQUESTS = 100;

/** Strict rate limit for auth endpoints (per window). */
export const RATE_LIMIT_AUTH_MAX = 10;

/** Rate limit for webhook endpoints (per window). */
export const RATE_LIMIT_WEBHOOK_MAX = 200;

/** Rate limit for public/unauthenticated endpoints (per window). */
export const RATE_LIMIT_PUBLIC_MAX = 30;

// ---------------------------------------------------------------------------
// Cache / TTL
// ---------------------------------------------------------------------------

/** Default cache TTL in seconds (5 minutes). */
export const DEFAULT_CACHE_TTL_S = 300;

/** Short-lived cache TTL in seconds (30 seconds). */
export const SHORT_CACHE_TTL_S = 30;

/** Long-lived cache TTL in seconds (1 hour). */
export const LONG_CACHE_TTL_S = 3_600;

/** Session TTL in seconds (7 days). */
export const SESSION_TTL_S = 604_800;

/** Token refresh threshold in seconds (5 minutes before expiry). */
export const TOKEN_REFRESH_THRESHOLD_S = 300;

// ---------------------------------------------------------------------------
// File Uploads
// ---------------------------------------------------------------------------

/** Maximum file upload size in bytes (50 MB). */
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

/** Maximum image upload size in bytes (10 MB). */
export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

/** Maximum video upload size in bytes (500 MB). */
export const MAX_VIDEO_SIZE_BYTES = 500 * 1024 * 1024;

/** Allowed image MIME types. */
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
] as const;

/** Allowed video MIME types. */
export const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
] as const;

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

/** Default page size for paginated queries. */
export const DEFAULT_PAGE_SIZE = 25;

/** Maximum page size a client may request. */
export const MAX_PAGE_SIZE = 100;

// ---------------------------------------------------------------------------
// Retry / Backoff
// ---------------------------------------------------------------------------

/** Default maximum retry attempts for transient failures. */
export const MAX_RETRIES = 3;

/** Base delay between retries in milliseconds. */
export const RETRY_BASE_DELAY_MS = 1_000;

/** Maximum delay between retries in milliseconds. */
export const RETRY_MAX_DELAY_MS = 30_000;

// ---------------------------------------------------------------------------
// Queue / Job Processing
// ---------------------------------------------------------------------------

/** Default job timeout in milliseconds (5 minutes). */
export const JOB_TIMEOUT_MS = 300_000;

/** Maximum concurrent jobs per worker. */
export const MAX_CONCURRENT_JOBS = 5;

// ---------------------------------------------------------------------------
// Miscellaneous
// ---------------------------------------------------------------------------

/** Maximum length for user-supplied name fields. */
export const MAX_NAME_LENGTH = 255;

/** Maximum length for description / bio fields. */
export const MAX_DESCRIPTION_LENGTH = 2_000;

/** Maximum length for URL fields. */
export const MAX_URL_LENGTH = 2_048;

/** Health-check endpoint path. */
export const HEALTH_CHECK_PATH = '/healthz';

/** Readiness-check endpoint path. */
export const READINESS_CHECK_PATH = '/readyz';
