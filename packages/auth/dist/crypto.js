"use strict";
/**
 * Cryptographic Utilities
 * =======================
 *
 * Shared helpers for password hashing, API key management, AES encryption,
 * SHA-256 hashing (Meta CAPI compatible), and HMAC signing / verification
 * for webhook payloads.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPassword = hashPassword;
exports.verifyPassword = verifyPassword;
exports.encryptApiKey = encryptApiKey;
exports.decryptApiKey = decryptApiKey;
exports.generateApiKey = generateApiKey;
exports.hashForMeta = hashForMeta;
exports.generateHmac = generateHmac;
exports.verifyHmac = verifyHmac;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
/** Default bcrypt salt rounds. */
const BCRYPT_SALT_ROUNDS = 12;
/** AES-256-GCM algorithm identifier. */
const AES_ALGORITHM = 'aes-256-gcm';
/** IV length in bytes for AES-256-GCM. */
const AES_IV_LENGTH = 16;
/** Auth tag length in bytes for AES-256-GCM. */
const AES_AUTH_TAG_LENGTH = 16;
/** Default HMAC algorithm. */
const HMAC_ALGORITHM = 'sha256';
/** Default API key prefix when none is supplied. */
const DEFAULT_API_KEY_PREFIX = 'acd';
// ---------------------------------------------------------------------------
// Password hashing
// ---------------------------------------------------------------------------
/**
 * Hash a plaintext password using bcrypt.
 *
 * @param password - The plaintext password
 * @param rounds   - bcrypt cost factor (default `12`)
 * @returns The bcrypt hash string
 */
async function hashPassword(password, rounds = BCRYPT_SALT_ROUNDS) {
    if (!password) {
        throw new Error('[acd/auth] Password is required for hashing.');
    }
    return bcryptjs_1.default.hash(password, rounds);
}
/**
 * Compare a plaintext password against a bcrypt hash.
 *
 * @param password - The plaintext password
 * @param hash     - The bcrypt hash to compare against
 * @returns `true` if the password matches
 */
async function verifyPassword(password, hash) {
    if (!password || !hash) {
        return false;
    }
    return bcryptjs_1.default.compare(password, hash);
}
// ---------------------------------------------------------------------------
// AES encryption (for API keys & secrets at rest)
// ---------------------------------------------------------------------------
/**
 * Encrypt a plaintext value using AES-256-GCM.
 *
 * The encryption key must be exactly 32 bytes (256 bits). If you have a
 * passphrase, derive a key with `crypto.scryptSync(passphrase, salt, 32)`.
 *
 * Output format: `<hex-iv>:<hex-authTag>:<hex-ciphertext>`
 *
 * @param plaintext     - The value to encrypt
 * @param encryptionKey - 32-byte key (hex string or Buffer)
 * @returns Encrypted string in the format `iv:tag:ciphertext`
 */
function encryptApiKey(plaintext, encryptionKey) {
    if (!plaintext) {
        throw new Error('[acd/auth] Plaintext value is required for encryption.');
    }
    if (!encryptionKey) {
        throw new Error('[acd/auth] Encryption key is required.');
    }
    // Derive a consistent 32-byte key from the provided string
    const keyBuffer = deriveKeyBuffer(encryptionKey);
    const iv = crypto_1.default.randomBytes(AES_IV_LENGTH);
    const cipher = crypto_1.default.createCipheriv(AES_ALGORITHM, keyBuffer, iv, {
        authTagLength: AES_AUTH_TAG_LENGTH,
    });
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}
/**
 * Decrypt a value that was encrypted with `encryptApiKey`.
 *
 * @param encrypted     - The encrypted string in `iv:tag:ciphertext` format
 * @param encryptionKey - The same key used for encryption
 * @returns The decrypted plaintext
 */
function decryptApiKey(encrypted, encryptionKey) {
    if (!encrypted) {
        throw new Error('[acd/auth] Encrypted value is required for decryption.');
    }
    if (!encryptionKey) {
        throw new Error('[acd/auth] Encryption key is required.');
    }
    const parts = encrypted.split(':');
    if (parts.length !== 3) {
        throw new Error('[acd/auth] Invalid encrypted format. Expected iv:authTag:ciphertext.');
    }
    const [ivHex, authTagHex, ciphertext] = parts;
    const keyBuffer = deriveKeyBuffer(encryptionKey);
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto_1.default.createDecipheriv(AES_ALGORITHM, keyBuffer, iv, {
        authTagLength: AES_AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}
/**
 * Generate a cryptographically random API key with an optional prefix.
 *
 * The key has the form `<prefix>_<random-base64url>` (e.g. `acd_aBcD...`).
 * The returned `hash` is a SHA-256 hex digest suitable for database storage.
 *
 * @param prefix - Key prefix (default `"acd"`)
 * @returns Object containing `key`, `hash`, and `last4`
 */
function generateApiKey(prefix = DEFAULT_API_KEY_PREFIX) {
    const randomBytes = crypto_1.default.randomBytes(32);
    const key = `${prefix}_${randomBytes.toString('base64url')}`;
    const hash = crypto_1.default.createHash('sha256').update(key).digest('hex');
    const last4 = key.slice(-4);
    return { key, hash, last4 };
}
// ---------------------------------------------------------------------------
// SHA-256 hashing (Meta CAPI compatible)
// ---------------------------------------------------------------------------
/**
 * Hash a value with SHA-256 and return a lowercase hex string.
 *
 * Meta Conversions API (CAPI) requires user data parameters (email, phone,
 * etc.) to be SHA-256 hashed, lowercased, and trimmed before sending.
 * This helper handles that normalization.
 *
 * @param value - The plaintext value to hash
 * @returns Lowercase hex SHA-256 digest
 */
function hashForMeta(value) {
    if (!value) {
        throw new Error('[acd/auth] Value is required for Meta CAPI hashing.');
    }
    const normalized = value.trim().toLowerCase();
    return crypto_1.default.createHash('sha256').update(normalized).digest('hex');
}
// ---------------------------------------------------------------------------
// HMAC signing & verification (webhooks)
// ---------------------------------------------------------------------------
/**
 * Generate an HMAC signature for a webhook payload.
 *
 * @param payload   - The raw payload string (typically JSON body)
 * @param secret    - The shared secret between sender and receiver
 * @param algorithm - Hash algorithm (default `"sha256"`)
 * @returns Hex-encoded HMAC signature
 */
function generateHmac(payload, secret, algorithm = HMAC_ALGORITHM) {
    if (!payload) {
        throw new Error('[acd/auth] Payload is required to generate HMAC.');
    }
    if (!secret) {
        throw new Error('[acd/auth] Secret is required to generate HMAC.');
    }
    return crypto_1.default.createHmac(algorithm, secret).update(payload, 'utf8').digest('hex');
}
/**
 * Verify an HMAC signature using a timing-safe comparison.
 *
 * @param payload   - The raw payload string
 * @param signature - The HMAC signature to verify
 * @param secret    - The shared secret
 * @param algorithm - Hash algorithm (default `"sha256"`)
 * @returns `true` if the signature is valid
 */
function verifyHmac(payload, signature, secret, algorithm = HMAC_ALGORITHM) {
    if (!payload || !signature || !secret) {
        return false;
    }
    const expected = generateHmac(payload, secret, algorithm);
    // Timing-safe comparison to prevent timing attacks
    const sigBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expected, 'hex');
    if (sigBuffer.length !== expectedBuffer.length) {
        return false;
    }
    return crypto_1.default.timingSafeEqual(sigBuffer, expectedBuffer);
}
// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------
/**
 * Derive a 32-byte key buffer from a string.
 * If the string is a valid 64-char hex string, decode it directly.
 * Otherwise, use SHA-256 to derive a deterministic 32-byte key.
 */
function deriveKeyBuffer(key) {
    // If key is 64 hex chars, treat as raw 32-byte hex key
    if (/^[0-9a-fA-F]{64}$/.test(key)) {
        return Buffer.from(key, 'hex');
    }
    // Otherwise derive a 32-byte key via SHA-256
    return crypto_1.default.createHash('sha256').update(key).digest();
}
//# sourceMappingURL=crypto.js.map