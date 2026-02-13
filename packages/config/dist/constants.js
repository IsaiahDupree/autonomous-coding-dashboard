"use strict";
// ---------------------------------------------------------------------------
// Rate Limits
// ---------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.READINESS_CHECK_PATH = exports.HEALTH_CHECK_PATH = exports.MAX_URL_LENGTH = exports.MAX_DESCRIPTION_LENGTH = exports.MAX_NAME_LENGTH = exports.MAX_CONCURRENT_JOBS = exports.JOB_TIMEOUT_MS = exports.RETRY_MAX_DELAY_MS = exports.RETRY_BASE_DELAY_MS = exports.MAX_RETRIES = exports.MAX_PAGE_SIZE = exports.DEFAULT_PAGE_SIZE = exports.ALLOWED_VIDEO_TYPES = exports.ALLOWED_IMAGE_TYPES = exports.MAX_VIDEO_SIZE_BYTES = exports.MAX_IMAGE_SIZE_BYTES = exports.MAX_FILE_SIZE_BYTES = exports.TOKEN_REFRESH_THRESHOLD_S = exports.SESSION_TTL_S = exports.LONG_CACHE_TTL_S = exports.SHORT_CACHE_TTL_S = exports.DEFAULT_CACHE_TTL_S = exports.RATE_LIMIT_PUBLIC_MAX = exports.RATE_LIMIT_WEBHOOK_MAX = exports.RATE_LIMIT_AUTH_MAX = exports.RATE_LIMIT_MAX_REQUESTS = exports.RATE_LIMIT_WINDOW_MS = void 0;
/** Default rate-limit window in milliseconds (1 minute). */
exports.RATE_LIMIT_WINDOW_MS = 60_000;
/** Default maximum requests per rate-limit window. */
exports.RATE_LIMIT_MAX_REQUESTS = 100;
/** Strict rate limit for auth endpoints (per window). */
exports.RATE_LIMIT_AUTH_MAX = 10;
/** Rate limit for webhook endpoints (per window). */
exports.RATE_LIMIT_WEBHOOK_MAX = 200;
/** Rate limit for public/unauthenticated endpoints (per window). */
exports.RATE_LIMIT_PUBLIC_MAX = 30;
// ---------------------------------------------------------------------------
// Cache / TTL
// ---------------------------------------------------------------------------
/** Default cache TTL in seconds (5 minutes). */
exports.DEFAULT_CACHE_TTL_S = 300;
/** Short-lived cache TTL in seconds (30 seconds). */
exports.SHORT_CACHE_TTL_S = 30;
/** Long-lived cache TTL in seconds (1 hour). */
exports.LONG_CACHE_TTL_S = 3_600;
/** Session TTL in seconds (7 days). */
exports.SESSION_TTL_S = 604_800;
/** Token refresh threshold in seconds (5 minutes before expiry). */
exports.TOKEN_REFRESH_THRESHOLD_S = 300;
// ---------------------------------------------------------------------------
// File Uploads
// ---------------------------------------------------------------------------
/** Maximum file upload size in bytes (50 MB). */
exports.MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
/** Maximum image upload size in bytes (10 MB). */
exports.MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
/** Maximum video upload size in bytes (500 MB). */
exports.MAX_VIDEO_SIZE_BYTES = 500 * 1024 * 1024;
/** Allowed image MIME types. */
exports.ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
];
/** Allowed video MIME types. */
exports.ALLOWED_VIDEO_TYPES = [
    'video/mp4',
    'video/quicktime',
    'video/webm',
];
// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------
/** Default page size for paginated queries. */
exports.DEFAULT_PAGE_SIZE = 25;
/** Maximum page size a client may request. */
exports.MAX_PAGE_SIZE = 100;
// ---------------------------------------------------------------------------
// Retry / Backoff
// ---------------------------------------------------------------------------
/** Default maximum retry attempts for transient failures. */
exports.MAX_RETRIES = 3;
/** Base delay between retries in milliseconds. */
exports.RETRY_BASE_DELAY_MS = 1_000;
/** Maximum delay between retries in milliseconds. */
exports.RETRY_MAX_DELAY_MS = 30_000;
// ---------------------------------------------------------------------------
// Queue / Job Processing
// ---------------------------------------------------------------------------
/** Default job timeout in milliseconds (5 minutes). */
exports.JOB_TIMEOUT_MS = 300_000;
/** Maximum concurrent jobs per worker. */
exports.MAX_CONCURRENT_JOBS = 5;
// ---------------------------------------------------------------------------
// Miscellaneous
// ---------------------------------------------------------------------------
/** Maximum length for user-supplied name fields. */
exports.MAX_NAME_LENGTH = 255;
/** Maximum length for description / bio fields. */
exports.MAX_DESCRIPTION_LENGTH = 2_000;
/** Maximum length for URL fields. */
exports.MAX_URL_LENGTH = 2_048;
/** Health-check endpoint path. */
exports.HEALTH_CHECK_PATH = '/healthz';
/** Readiness-check endpoint path. */
exports.READINESS_CHECK_PATH = '/readyz';
//# sourceMappingURL=constants.js.map