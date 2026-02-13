/** Default rate-limit window in milliseconds (1 minute). */
export declare const RATE_LIMIT_WINDOW_MS = 60000;
/** Default maximum requests per rate-limit window. */
export declare const RATE_LIMIT_MAX_REQUESTS = 100;
/** Strict rate limit for auth endpoints (per window). */
export declare const RATE_LIMIT_AUTH_MAX = 10;
/** Rate limit for webhook endpoints (per window). */
export declare const RATE_LIMIT_WEBHOOK_MAX = 200;
/** Rate limit for public/unauthenticated endpoints (per window). */
export declare const RATE_LIMIT_PUBLIC_MAX = 30;
/** Default cache TTL in seconds (5 minutes). */
export declare const DEFAULT_CACHE_TTL_S = 300;
/** Short-lived cache TTL in seconds (30 seconds). */
export declare const SHORT_CACHE_TTL_S = 30;
/** Long-lived cache TTL in seconds (1 hour). */
export declare const LONG_CACHE_TTL_S = 3600;
/** Session TTL in seconds (7 days). */
export declare const SESSION_TTL_S = 604800;
/** Token refresh threshold in seconds (5 minutes before expiry). */
export declare const TOKEN_REFRESH_THRESHOLD_S = 300;
/** Maximum file upload size in bytes (50 MB). */
export declare const MAX_FILE_SIZE_BYTES: number;
/** Maximum image upload size in bytes (10 MB). */
export declare const MAX_IMAGE_SIZE_BYTES: number;
/** Maximum video upload size in bytes (500 MB). */
export declare const MAX_VIDEO_SIZE_BYTES: number;
/** Allowed image MIME types. */
export declare const ALLOWED_IMAGE_TYPES: readonly ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
/** Allowed video MIME types. */
export declare const ALLOWED_VIDEO_TYPES: readonly ["video/mp4", "video/quicktime", "video/webm"];
/** Default page size for paginated queries. */
export declare const DEFAULT_PAGE_SIZE = 25;
/** Maximum page size a client may request. */
export declare const MAX_PAGE_SIZE = 100;
/** Default maximum retry attempts for transient failures. */
export declare const MAX_RETRIES = 3;
/** Base delay between retries in milliseconds. */
export declare const RETRY_BASE_DELAY_MS = 1000;
/** Maximum delay between retries in milliseconds. */
export declare const RETRY_MAX_DELAY_MS = 30000;
/** Default job timeout in milliseconds (5 minutes). */
export declare const JOB_TIMEOUT_MS = 300000;
/** Maximum concurrent jobs per worker. */
export declare const MAX_CONCURRENT_JOBS = 5;
/** Maximum length for user-supplied name fields. */
export declare const MAX_NAME_LENGTH = 255;
/** Maximum length for description / bio fields. */
export declare const MAX_DESCRIPTION_LENGTH = 2000;
/** Maximum length for URL fields. */
export declare const MAX_URL_LENGTH = 2048;
/** Health-check endpoint path. */
export declare const HEALTH_CHECK_PATH = "/healthz";
/** Readiness-check endpoint path. */
export declare const READINESS_CHECK_PATH = "/readyz";
//# sourceMappingURL=constants.d.ts.map