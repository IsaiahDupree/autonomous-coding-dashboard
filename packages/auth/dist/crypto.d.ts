/**
 * Cryptographic Utilities
 * =======================
 *
 * Shared helpers for password hashing, API key management, AES encryption,
 * SHA-256 hashing (Meta CAPI compatible), and HMAC signing / verification
 * for webhook payloads.
 */
/**
 * Hash a plaintext password using bcrypt.
 *
 * @param password - The plaintext password
 * @param rounds   - bcrypt cost factor (default `12`)
 * @returns The bcrypt hash string
 */
export declare function hashPassword(password: string, rounds?: number): Promise<string>;
/**
 * Compare a plaintext password against a bcrypt hash.
 *
 * @param password - The plaintext password
 * @param hash     - The bcrypt hash to compare against
 * @returns `true` if the password matches
 */
export declare function verifyPassword(password: string, hash: string): Promise<boolean>;
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
export declare function encryptApiKey(plaintext: string, encryptionKey: string): string;
/**
 * Decrypt a value that was encrypted with `encryptApiKey`.
 *
 * @param encrypted     - The encrypted string in `iv:tag:ciphertext` format
 * @param encryptionKey - The same key used for encryption
 * @returns The decrypted plaintext
 */
export declare function decryptApiKey(encrypted: string, encryptionKey: string): string;
/**
 * Result of generating an API key.
 */
export interface GeneratedApiKey {
    /** The full plaintext API key (show to user once, then discard). */
    key: string;
    /** SHA-256 hash of the key for storage and lookup. */
    hash: string;
    /** Last 4 characters of the key for display purposes. */
    last4: string;
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
export declare function generateApiKey(prefix?: string): GeneratedApiKey;
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
export declare function hashForMeta(value: string): string;
/**
 * Generate an HMAC signature for a webhook payload.
 *
 * @param payload   - The raw payload string (typically JSON body)
 * @param secret    - The shared secret between sender and receiver
 * @param algorithm - Hash algorithm (default `"sha256"`)
 * @returns Hex-encoded HMAC signature
 */
export declare function generateHmac(payload: string, secret: string, algorithm?: string): string;
/**
 * Verify an HMAC signature using a timing-safe comparison.
 *
 * @param payload   - The raw payload string
 * @param signature - The HMAC signature to verify
 * @param secret    - The shared secret
 * @param algorithm - Hash algorithm (default `"sha256"`)
 * @returns `true` if the signature is valid
 */
export declare function verifyHmac(payload: string, signature: string, secret: string, algorithm?: string): boolean;
//# sourceMappingURL=crypto.d.ts.map