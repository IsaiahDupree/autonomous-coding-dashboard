/**
 * Authentication Service (CF-WC-171 through CF-WC-180)
 *
 * Handles:
 * - Magic link authentication
 * - Multi-factor authentication (MFA)
 * - OAuth account linking
 * - Role-based access control (RBAC)
 * - API key management
 * - Admin impersonation
 * - Password strength requirements
 * - Account lockout policy
 * - Session management UI
 * - Auth event webhooks
 */

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ============================================
// Types
// ============================================

export interface User {
  id: string;
  email: string;
  role: 'user' | 'admin' | 'superadmin';
  mfaEnabled: boolean;
  isLocked: boolean;
}

export interface MagicLinkRequest {
  email: string;
  redirectUrl?: string;
}

export interface MFASetup {
  userId: string;
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface APIKey {
  id: string;
  name: string;
  key: string;
  userId: string;
  scopes: string[];
  expiresAt?: Date;
  lastUsedAt?: Date;
}

export interface Session {
  id: string;
  userId: string;
  deviceInfo: {
    browser: string;
    os: string;
    ip: string;
  };
  createdAt: Date;
  expiresAt: Date;
  isActive: boolean;
}

export interface AuthEvent {
  type:
    | 'login'
    | 'logout'
    | 'mfa_enabled'
    | 'mfa_disabled'
    | 'password_changed'
    | 'account_locked'
    | 'account_unlocked'
    | 'api_key_created'
    | 'api_key_revoked';
  userId: string;
  metadata?: Record<string, any>;
}

// ============================================
// Magic Link Authentication (CF-WC-171)
// ============================================

/**
 * Send magic link to user's email
 */
export async function sendMagicLink(
  request: MagicLinkRequest
): Promise<{ success: boolean; expiresAt: Date }> {
  const { email, redirectUrl = '/dashboard' } = request;

  // Generate secure token
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

  // Store token
  await prisma.cf_magic_links.create({
    data: {
      email,
      token,
      redirectUrl,
      expiresAt,
      used: false,
    },
  });

  // Send email (integrate with email service)
  const magicLink = `https://yourdomain.com/auth/magic-link?token=${token}`;
  await sendEmail(email, 'Your Login Link', `Click here to log in: ${magicLink}`);

  // Track event
  await trackAuthEvent({
    type: 'login',
    userId: email, // User ID or email
    metadata: { method: 'magic_link' },
  });

  return { success: true, expiresAt };
}

/**
 * Verify magic link token
 */
export async function verifyMagicLink(token: string): Promise<{
  valid: boolean;
  email?: string;
  redirectUrl?: string;
}> {
  const magicLink = await prisma.cf_magic_links.findFirst({
    where: {
      token,
      used: false,
      expiresAt: { gt: new Date() },
    },
  });

  if (!magicLink) {
    return { valid: false };
  }

  // Mark as used
  await prisma.cf_magic_links.update({
    where: { id: magicLink.id },
    data: { used: true, usedAt: new Date() },
  });

  return {
    valid: true,
    email: magicLink.email,
    redirectUrl: magicLink.redirectUrl || undefined,
  };
}

// ============================================
// Multi-Factor Authentication (CF-WC-172)
// ============================================

/**
 * Setup MFA for user
 */
export async function setupMFA(userId: string): Promise<MFASetup> {
  // Generate secret
  const secret = crypto.randomBytes(20).toString('hex');

  // Generate backup codes
  const backupCodes = Array.from({ length: 10 }, () =>
    crypto.randomBytes(4).toString('hex')
  );

  // Hash backup codes before storing
  const hashedCodes = await Promise.all(
    backupCodes.map((code) => bcrypt.hash(code, 10))
  );

  // Store MFA settings
  await prisma.cf_user_mfa.upsert({
    where: { userId },
    update: {
      secret,
      backupCodes: hashedCodes,
      enabled: false, // User must verify first
    },
    create: {
      userId,
      secret,
      backupCodes: hashedCodes,
      enabled: false,
    },
  });

  // Generate QR code URL (for authenticator apps)
  const qrCode = generateQRCode(userId, secret);

  return {
    userId,
    secret,
    qrCode,
    backupCodes, // Return unhashed codes to user (only shown once)
  };
}

/**
 * Enable MFA after verification
 */
export async function enableMFA(
  userId: string,
  verificationCode: string
): Promise<{ success: boolean }> {
  const mfa = await prisma.cf_user_mfa.findUnique({
    where: { userId },
  });

  if (!mfa) {
    return { success: false };
  }

  // Verify code
  const valid = verifyTOTP(mfa.secret, verificationCode);

  if (!valid) {
    return { success: false };
  }

  // Enable MFA
  await prisma.cf_user_mfa.update({
    where: { userId },
    data: { enabled: true },
  });

  // Track event
  await trackAuthEvent({
    type: 'mfa_enabled',
    userId,
  });

  return { success: true };
}

/**
 * Verify MFA code
 */
export async function verifyMFA(
  userId: string,
  code: string
): Promise<{ valid: boolean }> {
  const mfa = await prisma.cf_user_mfa.findUnique({
    where: { userId, enabled: true },
  });

  if (!mfa) {
    return { valid: false };
  }

  // Try TOTP code
  if (verifyTOTP(mfa.secret, code)) {
    return { valid: true };
  }

  // Try backup code
  for (const hashedCode of mfa.backupCodes) {
    if (await bcrypt.compare(code, hashedCode)) {
      // Remove used backup code
      const updatedCodes = mfa.backupCodes.filter((c) => c !== hashedCode);
      await prisma.cf_user_mfa.update({
        where: { userId },
        data: { backupCodes: updatedCodes },
      });
      return { valid: true };
    }
  }

  return { valid: false };
}

/**
 * Disable MFA
 */
export async function disableMFA(userId: string): Promise<void> {
  await prisma.cf_user_mfa.update({
    where: { userId },
    data: { enabled: false },
  });

  await trackAuthEvent({
    type: 'mfa_disabled',
    userId,
  });
}

// ============================================
// OAuth Account Linking (CF-WC-173)
// ============================================

/**
 * Link OAuth account to user
 */
export async function linkOAuthAccount(
  userId: string,
  provider: 'google' | 'github' | 'tiktok' | 'instagram',
  oauthId: string,
  accessToken: string,
  refreshToken?: string
): Promise<{ success: boolean }> {
  // Check if OAuth account already linked
  const existing = await prisma.cf_oauth_accounts.findFirst({
    where: {
      provider,
      oauthId,
    },
  });

  if (existing && existing.userId !== userId) {
    // Account already linked to different user
    return { success: false };
  }

  await prisma.cf_oauth_accounts.upsert({
    where: {
      userId_provider: {
        userId,
        provider,
      },
    },
    update: {
      oauthId,
      accessToken,
      refreshToken,
      lastSyncedAt: new Date(),
    },
    create: {
      userId,
      provider,
      oauthId,
      accessToken,
      refreshToken,
    },
  });

  return { success: true };
}

/**
 * Unlink OAuth account
 */
export async function unlinkOAuthAccount(
  userId: string,
  provider: string
): Promise<void> {
  await prisma.cf_oauth_accounts.delete({
    where: {
      userId_provider: {
        userId,
        provider,
      },
    },
  });
}

/**
 * Get linked OAuth accounts
 */
export async function getLinkedAccounts(userId: string): Promise<
  Array<{
    provider: string;
    linkedAt: Date;
    lastSynced?: Date;
  }>
> {
  const accounts = await prisma.cf_oauth_accounts.findMany({
    where: { userId },
    select: {
      provider: true,
      createdAt: true,
      lastSyncedAt: true,
    },
  });

  return accounts.map((a) => ({
    provider: a.provider,
    linkedAt: a.createdAt,
    lastSynced: a.lastSyncedAt || undefined,
  }));
}

// ============================================
// Role-Based Access Control (CF-WC-174)
// ============================================

/**
 * Check if user has permission
 */
export async function hasPermission(
  userId: string,
  permission: string
): Promise<boolean> {
  const user = await prisma.cf_users.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user) return false;

  const rolePermissions = ROLE_PERMISSIONS[user.role] || [];
  return rolePermissions.includes(permission) || rolePermissions.includes('*');
}

/**
 * Role-permission mapping
 */
const ROLE_PERMISSIONS: Record<string, string[]> = {
  user: [
    'dossiers:create',
    'dossiers:read:own',
    'dossiers:update:own',
    'dossiers:delete:own',
    'content:generate',
    'content:publish',
    'metrics:read:own',
  ],
  admin: [
    'dossiers:*',
    'content:*',
    'metrics:*',
    'users:read',
    'analytics:read',
    'feedback:manage',
  ],
  superadmin: ['*'], // All permissions
};

/**
 * Assign role to user
 */
export async function assignRole(
  userId: string,
  role: 'user' | 'admin' | 'superadmin'
): Promise<void> {
  await prisma.cf_users.update({
    where: { id: userId },
    data: { role },
  });
}

// ============================================
// API Key Management (CF-WC-175)
// ============================================

/**
 * Create API key
 */
export async function createAPIKey(
  userId: string,
  name: string,
  scopes: string[],
  expiresInDays?: number
): Promise<APIKey> {
  // Generate secure key
  const key = `cf_${crypto.randomBytes(32).toString('hex')}`;
  const hashedKey = await bcrypt.hash(key, 10);

  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
    : undefined;

  const apiKey = await prisma.cf_api_keys.create({
    data: {
      userId,
      name,
      keyHash: hashedKey,
      scopes,
      expiresAt,
    },
  });

  await trackAuthEvent({
    type: 'api_key_created',
    userId,
    metadata: { keyName: name },
  });

  return {
    id: apiKey.id,
    name: apiKey.name,
    key, // Return unhashed key (only shown once)
    userId: apiKey.userId,
    scopes: apiKey.scopes,
    expiresAt: apiKey.expiresAt || undefined,
    lastUsedAt: undefined,
  };
}

/**
 * Verify API key
 */
export async function verifyAPIKey(key: string): Promise<{
  valid: boolean;
  userId?: string;
  scopes?: string[];
}> {
  // Extract key ID from key format: cf_<hash>
  const apiKeys = await prisma.cf_api_keys.findMany({
    where: {
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  });

  for (const apiKey of apiKeys) {
    if (await bcrypt.compare(key, apiKey.keyHash)) {
      // Update last used timestamp
      await prisma.cf_api_keys.update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() },
      });

      return {
        valid: true,
        userId: apiKey.userId,
        scopes: apiKey.scopes,
      };
    }
  }

  return { valid: false };
}

/**
 * Revoke API key
 */
export async function revokeAPIKey(keyId: string): Promise<void> {
  const apiKey = await prisma.cf_api_keys.update({
    where: { id: keyId },
    data: { revokedAt: new Date() },
  });

  await trackAuthEvent({
    type: 'api_key_revoked',
    userId: apiKey.userId,
    metadata: { keyId },
  });
}

/**
 * List user's API keys
 */
export async function listAPIKeys(userId: string): Promise<APIKey[]> {
  const keys = await prisma.cf_api_keys.findMany({
    where: {
      userId,
      revokedAt: null,
    },
    orderBy: { createdAt: 'desc' },
  });

  return keys.map((k) => ({
    id: k.id,
    name: k.name,
    key: '****', // Never return actual key
    userId: k.userId,
    scopes: k.scopes,
    expiresAt: k.expiresAt || undefined,
    lastUsedAt: k.lastUsedAt || undefined,
  }));
}

// ============================================
// Admin Impersonation (CF-WC-176)
// ============================================

/**
 * Start admin impersonation session
 */
export async function startImpersonation(
  adminId: string,
  targetUserId: string,
  reason: string
): Promise<{ sessionToken: string }> {
  // Verify admin has permission
  if (!(await hasPermission(adminId, 'users:impersonate'))) {
    throw new Error('Permission denied');
  }

  // Create impersonation session
  const sessionToken = crypto.randomBytes(32).toString('hex');

  await prisma.cf_impersonation_sessions.create({
    data: {
      adminId,
      targetUserId,
      reason,
      sessionToken,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    },
  });

  // Audit log
  await prisma.cf_audit_trail.create({
    data: {
      tableName: 'impersonation',
      recordId: targetUserId,
      action: 'IMPERSONATE_START',
      userId: adminId,
      newData: { targetUserId, reason },
      timestamp: new Date(),
    },
  });

  return { sessionToken };
}

/**
 * End impersonation session
 */
export async function endImpersonation(sessionToken: string): Promise<void> {
  await prisma.cf_impersonation_sessions.update({
    where: { sessionToken },
    data: { endedAt: new Date() },
  });
}

// ============================================
// Password Strength (CF-WC-177)
// ============================================

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
  score: number;
} {
  const errors: string[] = [];
  let score = 0;

  // Length check
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  } else {
    score += 1;
    if (password.length >= 12) score += 1;
  }

  // Uppercase check
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  } else {
    score += 1;
  }

  // Lowercase check
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  } else {
    score += 1;
  }

  // Number check
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  } else {
    score += 1;
  }

  // Special character check
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  } else {
    score += 1;
  }

  // Common passwords check
  if (isCommonPassword(password)) {
    errors.push('Password is too common');
    score = Math.max(0, score - 2);
  }

  return {
    valid: errors.length === 0 && score >= 4,
    errors,
    score,
  };
}

/**
 * Check if password is in common passwords list
 */
function isCommonPassword(password: string): boolean {
  const commonPasswords = [
    'password',
    '123456',
    'password123',
    'qwerty',
    'letmein',
    'welcome',
    'admin',
    'user',
  ];
  return commonPasswords.includes(password.toLowerCase());
}

// ============================================
// Account Lockout (CF-WC-178)
// ============================================

/**
 * Track failed login attempt
 */
export async function trackFailedLogin(email: string): Promise<{
  locked: boolean;
  attemptsRemaining: number;
}> {
  const MAX_ATTEMPTS = 5;
  const LOCKOUT_DURATION_MINUTES = 30;

  // Get or create login attempts record
  const attempts = await prisma.cf_login_attempts.upsert({
    where: { email },
    update: {
      attempts: { increment: 1 },
      lastAttemptAt: new Date(),
    },
    create: {
      email,
      attempts: 1,
      lastAttemptAt: new Date(),
    },
  });

  if (attempts.attempts >= MAX_ATTEMPTS) {
    // Lock account
    const lockUntil = new Date();
    lockUntil.setMinutes(lockUntil.getMinutes() + LOCKOUT_DURATION_MINUTES);

    await prisma.cf_login_attempts.update({
      where: { email },
      data: { lockedUntil: lockUntil },
    });

    // Update user record
    await prisma.cf_users.update({
      where: { email },
      data: { isLocked: true },
    });

    await trackAuthEvent({
      type: 'account_locked',
      userId: email,
      metadata: { reason: 'max_login_attempts' },
    });

    return { locked: true, attemptsRemaining: 0 };
  }

  return {
    locked: false,
    attemptsRemaining: MAX_ATTEMPTS - attempts.attempts,
  };
}

/**
 * Reset login attempts after successful login
 */
export async function resetLoginAttempts(email: string): Promise<void> {
  await prisma.cf_login_attempts.deleteMany({
    where: { email },
  });
}

/**
 * Check if account is locked
 */
export async function isAccountLocked(email: string): Promise<boolean> {
  const attempts = await prisma.cf_login_attempts.findUnique({
    where: { email },
  });

  if (!attempts || !attempts.lockedUntil) {
    return false;
  }

  // Check if lock has expired
  if (attempts.lockedUntil < new Date()) {
    // Unlock account
    await prisma.cf_login_attempts.delete({
      where: { email },
    });

    await prisma.cf_users.update({
      where: { email },
      data: { isLocked: false },
    });

    await trackAuthEvent({
      type: 'account_unlocked',
      userId: email,
      metadata: { reason: 'lockout_expired' },
    });

    return false;
  }

  return true;
}

// ============================================
// Session Management (CF-WC-179)
// ============================================

/**
 * List user's active sessions
 */
export async function getUserSessions(userId: string): Promise<Session[]> {
  const sessions = await prisma.cf_sessions.findMany({
    where: {
      userId,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  return sessions.map((s) => ({
    id: s.id,
    userId: s.userId,
    deviceInfo: s.deviceInfo as Session['deviceInfo'],
    createdAt: s.createdAt,
    expiresAt: s.expiresAt,
    isActive: s.lastActivityAt && s.lastActivityAt > new Date(Date.now() - 30 * 60 * 1000),
  }));
}

/**
 * Revoke session
 */
export async function revokeSession(sessionId: string): Promise<void> {
  await prisma.cf_sessions.delete({
    where: { id: sessionId },
  });
}

/**
 * Revoke all sessions except current
 */
export async function revokeAllSessions(
  userId: string,
  exceptSessionId?: string
): Promise<number> {
  const result = await prisma.cf_sessions.deleteMany({
    where: {
      userId,
      ...(exceptSessionId && { id: { not: exceptSessionId } }),
    },
  });

  return result.count;
}

// ============================================
// Auth Event Webhooks (CF-WC-180)
// ============================================

/**
 * Track authentication event
 */
async function trackAuthEvent(event: AuthEvent): Promise<void> {
  await prisma.cf_auth_events.create({
    data: {
      type: event.type,
      userId: event.userId,
      metadata: event.metadata || {},
      timestamp: new Date(),
    },
  });

  // Trigger webhooks
  await triggerAuthWebhooks(event);
}

/**
 * Trigger registered webhooks for auth events
 */
async function triggerAuthWebhooks(event: AuthEvent): Promise<void> {
  const webhooks = await prisma.cf_webhooks.findMany({
    where: {
      enabled: true,
      events: { has: `auth.${event.type}` },
    },
  });

  for (const webhook of webhooks) {
    // Send webhook (async, don't wait)
    fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': generateWebhookSignature(event, webhook.secret),
      },
      body: JSON.stringify({
        event: `auth.${event.type}`,
        timestamp: new Date().toISOString(),
        data: event,
      }),
    }).catch((error) => {
      console.error(`Webhook failed: ${webhook.url}`, error);
    });
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Generate QR code for TOTP
 */
function generateQRCode(userId: string, secret: string): string {
  const issuer = 'ContentFactory';
  const otpAuthUrl = `otpauth://totp/${issuer}:${userId}?secret=${secret}&issuer=${issuer}`;
  return `https://chart.googleapis.com/chart?chs=200x200&chld=M|0&cht=qr&chl=${encodeURIComponent(otpAuthUrl)}`;
}

/**
 * Verify TOTP code (simplified - use actual TOTP library in production)
 */
function verifyTOTP(secret: string, code: string): boolean {
  // In production, use a library like `otplib` or `speakeasy`
  // This is a placeholder
  return code.length === 6 && /^\d{6}$/.test(code);
}

/**
 * Send email (placeholder - integrate with email service)
 */
async function sendEmail(
  to: string,
  subject: string,
  body: string
): Promise<void> {
  console.log(`Sending email to ${to}: ${subject}`);
  // TODO: Integrate with SendGrid, AWS SES, etc.
}

/**
 * Generate webhook signature
 */
function generateWebhookSignature(
  event: AuthEvent,
  secret: string
): string {
  const payload = JSON.stringify(event);
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}
