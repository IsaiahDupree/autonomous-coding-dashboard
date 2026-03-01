/**
 * Authentication Enhancements Service
 * ====================================
 *
 * PCT-WC-171 through PCT-WC-180: Advanced auth features
 *
 * Handles:
 * - Magic link authentication (PCT-WC-171)
 * - Multi-factor authentication (PCT-WC-172)
 * - OAuth account linking (PCT-WC-173)
 * - Role-based access control (PCT-WC-174)
 * - API key management (PCT-WC-175)
 * - Admin impersonation (PCT-WC-176)
 * - Password strength requirements (PCT-WC-177)
 * - Account lockout policy (PCT-WC-178)
 * - Session management UI (PCT-WC-179)
 * - Auth event webhooks (PCT-WC-180)
 */

import { PrismaClient } from '@prisma/client';
import { EventEmitter } from 'events';
import crypto from 'crypto';
import { authenticator } from 'otplib';

const prisma = new PrismaClient();

// ============================================
// PCT-WC-171: Magic Link Authentication
// ============================================

export interface MagicLinkToken {
  token: string;
  email: string;
  expiresAt: Date;
  used: boolean;
}

class MagicLinkService {
  private tokens: Map<string, MagicLinkToken> = new Map();

  generateMagicLink(email: string, baseUrl: string): string {
    const token = crypto.randomBytes(32).toString('hex');

    this.tokens.set(token, {
      token,
      email,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      used: false,
    });

    return `${baseUrl}/auth/magic-link?token=${token}`;
  }

  verifyMagicLink(token: string): { valid: boolean; email?: string; error?: string } {
    const magicLink = this.tokens.get(token);

    if (!magicLink) {
      return { valid: false, error: 'Invalid token' };
    }

    if (magicLink.used) {
      return { valid: false, error: 'Token already used' };
    }

    if (new Date() > magicLink.expiresAt) {
      return { valid: false, error: 'Token expired' };
    }

    magicLink.used = true;
    return { valid: true, email: magicLink.email };
  }
}

// ============================================
// PCT-WC-172: Multi-Factor Authentication
// ============================================

export interface MFASetup {
  userId: string;
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface MFAStatus {
  enabled: boolean;
  method?: 'totp' | 'sms';
  backupCodesRemaining?: number;
}

class MFAService extends EventEmitter {
  private secrets: Map<string, string> = new Map();
  private backupCodes: Map<string, Set<string>> = new Map();

  async setupTOTP(userId: string, appName = 'PCT'): Promise<MFASetup> {
    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(userId, appName, secret);

    // Generate backup codes
    const backupCodes = Array.from({ length: 10 }, () =>
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );

    this.secrets.set(userId, secret);
    this.backupCodes.set(userId, new Set(backupCodes));

    return {
      userId,
      secret,
      qrCode: otpauthUrl, // In real implementation, convert to QR code image
      backupCodes,
    };
  }

  verifyTOTP(userId: string, token: string): boolean {
    const secret = this.secrets.get(userId);
    if (!secret) return false;

    return authenticator.verify({ token, secret });
  }

  useBackupCode(userId: string, code: string): boolean {
    const codes = this.backupCodes.get(userId);
    if (!codes || !codes.has(code)) return false;

    codes.delete(code);
    this.emit('mfa:backup_code_used', { userId, codesRemaining: codes.size });
    return true;
  }

  async disableMFA(userId: string): Promise<void> {
    this.secrets.delete(userId);
    this.backupCodes.delete(userId);
    this.emit('mfa:disabled', { userId });
  }

  getMFAStatus(userId: string): MFAStatus {
    const enabled = this.secrets.has(userId);
    const backupCodesRemaining = this.backupCodes.get(userId)?.size;

    return {
      enabled,
      method: enabled ? 'totp' : undefined,
      backupCodesRemaining,
    };
  }
}

// ============================================
// PCT-WC-173: OAuth Account Linking
// ============================================

export interface LinkedAccount {
  provider: 'google' | 'github' | 'facebook';
  providerId: string;
  email: string;
  linkedAt: Date;
}

class OAuthLinkingService extends EventEmitter {
  private linkedAccounts: Map<string, LinkedAccount[]> = new Map();

  async linkAccount(userId: string, account: Omit<LinkedAccount, 'linkedAt'>): Promise<void> {
    const accounts = this.linkedAccounts.get(userId) || [];

    // Check for conflicts
    const existing = accounts.find(a => a.provider === account.provider);
    if (existing) {
      throw new Error(`${account.provider} account already linked`);
    }

    accounts.push({ ...account, linkedAt: new Date() });
    this.linkedAccounts.set(userId, accounts);

    this.emit('oauth:linked', { userId, provider: account.provider });
  }

  async unlinkAccount(userId: string, provider: string): Promise<void> {
    const accounts = this.linkedAccounts.get(userId) || [];
    const filtered = accounts.filter(a => a.provider !== provider);

    if (filtered.length === accounts.length) {
      throw new Error('Account not found');
    }

    this.linkedAccounts.set(userId, filtered);
    this.emit('oauth:unlinked', { userId, provider });
  }

  getLinkedAccounts(userId: string): LinkedAccount[] {
    return this.linkedAccounts.get(userId) || [];
  }
}

// ============================================
// PCT-WC-174: Role-Based Access Control
// ============================================

export type Role = 'admin' | 'user' | 'viewer' | 'editor';
export type Permission =
  | 'read:all'
  | 'write:all'
  | 'delete:all'
  | 'manage:users'
  | 'manage:settings'
  | 'impersonate:users';

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: ['read:all', 'write:all', 'delete:all', 'manage:users', 'manage:settings', 'impersonate:users'],
  editor: ['read:all', 'write:all'],
  user: ['read:all'],
  viewer: ['read:all'],
};

class RBACService {
  private userRoles: Map<string, Set<Role>> = new Map();

  assignRole(userId: string, role: Role): void {
    const roles = this.userRoles.get(userId) || new Set();
    roles.add(role);
    this.userRoles.set(userId, roles);
  }

  removeRole(userId: string, role: Role): void {
    const roles = this.userRoles.get(userId);
    if (roles) {
      roles.delete(role);
    }
  }

  getUserRoles(userId: string): Role[] {
    return Array.from(this.userRoles.get(userId) || []);
  }

  hasPermission(userId: string, permission: Permission): boolean {
    const roles = this.userRoles.get(userId) || new Set();

    for (const role of roles) {
      if (ROLE_PERMISSIONS[role]?.includes(permission)) {
        return true;
      }
    }

    return false;
  }

  hasAnyPermission(userId: string, permissions: Permission[]): boolean {
    return permissions.some(p => this.hasPermission(userId, p));
  }

  hasAllPermissions(userId: string, permissions: Permission[]): boolean {
    return permissions.every(p => this.hasPermission(userId, p));
  }
}

// ============================================
// PCT-WC-175: API Key Management
// ============================================

export interface APIKey {
  id: string;
  userId: string;
  name: string;
  key: string;
  createdAt: Date;
  lastUsedAt?: Date;
  expiresAt?: Date;
  rateLimit: number; // requests per hour
  scopes: string[];
}

class APIKeyService extends EventEmitter {
  private keys: Map<string, APIKey> = new Map();
  private usage: Map<string, { count: number; resetAt: Date }> = new Map();

  generateKey(
    userId: string,
    name: string,
    options: {
      expiresIn?: number; // days
      rateLimit?: number;
      scopes?: string[];
    } = {}
  ): APIKey {
    const id = `key_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const key = `pct_${crypto.randomBytes(32).toString('hex')}`;

    const apiKey: APIKey = {
      id,
      userId,
      name,
      key,
      createdAt: new Date(),
      expiresAt: options.expiresIn
        ? new Date(Date.now() + options.expiresIn * 24 * 60 * 60 * 1000)
        : undefined,
      rateLimit: options.rateLimit || 1000,
      scopes: options.scopes || [],
    };

    this.keys.set(key, apiKey);
    this.emit('api_key:created', { id, userId, name });

    return apiKey;
  }

  verifyKey(key: string): { valid: boolean; apiKey?: APIKey; error?: string } {
    const apiKey = this.keys.get(key);

    if (!apiKey) {
      return { valid: false, error: 'Invalid API key' };
    }

    if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
      return { valid: false, error: 'API key expired' };
    }

    // Check rate limit
    const usage = this.usage.get(key) || { count: 0, resetAt: new Date(Date.now() + 60 * 60 * 1000) };

    if (new Date() > usage.resetAt) {
      usage.count = 0;
      usage.resetAt = new Date(Date.now() + 60 * 60 * 1000);
    }

    if (usage.count >= apiKey.rateLimit) {
      return { valid: false, error: 'Rate limit exceeded' };
    }

    usage.count++;
    this.usage.set(key, usage);

    // Update last used
    apiKey.lastUsedAt = new Date();

    return { valid: true, apiKey };
  }

  revokeKey(keyId: string, userId: string): boolean {
    for (const [key, apiKey] of this.keys.entries()) {
      if (apiKey.id === keyId && apiKey.userId === userId) {
        this.keys.delete(key);
        this.emit('api_key:revoked', { id: keyId, userId });
        return true;
      }
    }
    return false;
  }

  getUserKeys(userId: string): Omit<APIKey, 'key'>[] {
    return Array.from(this.keys.values())
      .filter(k => k.userId === userId)
      .map(({ key, ...rest }) => rest);
  }
}

// ============================================
// PCT-WC-176: Admin Impersonation
// ============================================

export interface ImpersonationSession {
  adminUserId: string;
  targetUserId: string;
  startedAt: Date;
  expiresAt: Date;
}

class ImpersonationService extends EventEmitter {
  private sessions: Map<string, ImpersonationSession> = new Map();

  async startImpersonation(adminUserId: string, targetUserId: string): Promise<string> {
    const sessionId = crypto.randomBytes(16).toString('hex');

    const session: ImpersonationSession = {
      adminUserId,
      targetUserId,
      startedAt: new Date(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    };

    this.sessions.set(sessionId, session);

    // Log audit trail
    this.emit('impersonation:started', {
      adminUserId,
      targetUserId,
      sessionId,
    });

    return sessionId;
  }

  endImpersonation(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.sessions.delete(sessionId);
      this.emit('impersonation:ended', {
        adminUserId: session.adminUserId,
        targetUserId: session.targetUserId,
        sessionId,
      });
    }
  }

  getSession(sessionId: string): ImpersonationSession | undefined {
    const session = this.sessions.get(sessionId);
    if (session && new Date() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return undefined;
    }
    return session;
  }
}

// ============================================
// PCT-WC-177: Password Strength Requirements
// ============================================

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
}

export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
};

export function validatePassword(password: string, policy = DEFAULT_PASSWORD_POLICY): {
  valid: boolean;
  strength: 'weak' | 'medium' | 'strong';
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < policy.minLength) {
    errors.push(`Password must be at least ${policy.minLength} characters`);
  }

  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain uppercase letters');
  }

  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain lowercase letters');
  }

  if (policy.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain numbers');
  }

  if (policy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain special characters');
  }

  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  if (password.length >= 12 && errors.length === 0) strength = 'strong';
  else if (password.length >= 8 && errors.length <= 1) strength = 'medium';

  return {
    valid: errors.length === 0,
    strength,
    errors,
  };
}

// ============================================
// PCT-WC-178: Account Lockout Policy
// ============================================

export interface LockoutStatus {
  locked: boolean;
  attempts: number;
  lockedUntil?: Date;
}

class AccountLockoutService extends EventEmitter {
  private attempts: Map<string, number> = new Map();
  private lockouts: Map<string, Date> = new Map();
  private maxAttempts = 5;
  private lockoutDuration = 15 * 60 * 1000; // 15 minutes

  recordFailedAttempt(userId: string): LockoutStatus {
    const current = this.attempts.get(userId) || 0;
    const newAttempts = current + 1;

    this.attempts.set(userId, newAttempts);

    if (newAttempts >= this.maxAttempts) {
      const lockedUntil = new Date(Date.now() + this.lockoutDuration);
      this.lockouts.set(userId, lockedUntil);
      this.emit('account:locked', { userId, lockedUntil });

      return {
        locked: true,
        attempts: newAttempts,
        lockedUntil,
      };
    }

    return {
      locked: false,
      attempts: newAttempts,
    };
  }

  resetAttempts(userId: string): void {
    this.attempts.delete(userId);
    this.lockouts.delete(userId);
  }

  isLocked(userId: string): LockoutStatus {
    const lockedUntil = this.lockouts.get(userId);

    if (!lockedUntil) {
      return {
        locked: false,
        attempts: this.attempts.get(userId) || 0,
      };
    }

    if (new Date() > lockedUntil) {
      this.resetAttempts(userId);
      return { locked: false, attempts: 0 };
    }

    return {
      locked: true,
      attempts: this.attempts.get(userId) || 0,
      lockedUntil,
    };
  }

  unlock(userId: string): void {
    this.resetAttempts(userId);
    this.emit('account:unlocked', { userId });
  }
}

// ============================================
// PCT-WC-179: Session Management
// ============================================

export interface Session {
  id: string;
  userId: string;
  deviceInfo?: string;
  ipAddress?: string;
  createdAt: Date;
  lastActivityAt: Date;
  expiresAt: Date;
}

class SessionManagementService extends EventEmitter {
  private sessions: Map<string, Session> = new Map();

  createSession(userId: string, options: {
    deviceInfo?: string;
    ipAddress?: string;
    expiresIn?: number; // hours
  } = {}): string {
    const sessionId = crypto.randomBytes(32).toString('hex');

    const session: Session = {
      id: sessionId,
      userId,
      deviceInfo: options.deviceInfo,
      ipAddress: options.ipAddress,
      createdAt: new Date(),
      lastActivityAt: new Date(),
      expiresAt: new Date(Date.now() + (options.expiresIn || 24) * 60 * 60 * 1000),
    };

    this.sessions.set(sessionId, session);
    this.emit('session:created', { sessionId, userId });

    return sessionId;
  }

  getUserSessions(userId: string): Session[] {
    return Array.from(this.sessions.values()).filter(s => s.userId === userId);
  }

  revokeSession(sessionId: string, userId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (session && session.userId === userId) {
      this.sessions.delete(sessionId);
      this.emit('session:revoked', { sessionId, userId });
      return true;
    }
    return false;
  }

  revokeAllSessions(userId: string, exceptSessionId?: string): number {
    let count = 0;
    for (const [id, session] of this.sessions.entries()) {
      if (session.userId === userId && id !== exceptSessionId) {
        this.sessions.delete(id);
        count++;
      }
    }

    if (count > 0) {
      this.emit('sessions:bulk_revoked', { userId, count });
    }

    return count;
  }
}

// ============================================
// PCT-WC-180: Auth Event Webhooks
// ============================================

class AuthWebhookService extends EventEmitter {
  async notifySignUp(userId: string, email: string): Promise<void> {
    this.emit('auth:signup', { userId, email, timestamp: new Date() });
  }

  async notifySignIn(userId: string, ipAddress?: string): Promise<void> {
    this.emit('auth:signin', { userId, ipAddress, timestamp: new Date() });
  }

  async notifyPasswordChange(userId: string): Promise<void> {
    this.emit('auth:password_changed', { userId, timestamp: new Date() });
  }

  async notifyEmailChange(userId: string, oldEmail: string, newEmail: string): Promise<void> {
    this.emit('auth:email_changed', { userId, oldEmail, newEmail, timestamp: new Date() });
  }
}

// Singleton instances
let magicLinkService: MagicLinkService | null = null;
let mfaService: MFAService | null = null;
let oauthLinkingService: OAuthLinkingService | null = null;
let rbacService: RBACService | null = null;
let apiKeyService: APIKeyService | null = null;
let impersonationService: ImpersonationService | null = null;
let lockoutService: AccountLockoutService | null = null;
let sessionService: SessionManagementService | null = null;
let authWebhookService: AuthWebhookService | null = null;

export function getMagicLinkService(): MagicLinkService {
  if (!magicLinkService) magicLinkService = new MagicLinkService();
  return magicLinkService;
}

export function getMFAService(): MFAService {
  if (!mfaService) mfaService = new MFAService();
  return mfaService;
}

export function getOAuthLinkingService(): OAuthLinkingService {
  if (!oauthLinkingService) oauthLinkingService = new OAuthLinkingService();
  return oauthLinkingService;
}

export function getRBACService(): RBACService {
  if (!rbacService) rbacService = new RBACService();
  return rbacService;
}

export function getAPIKeyService(): APIKeyService {
  if (!apiKeyService) apiKeyService = new APIKeyService();
  return apiKeyService;
}

export function getImpersonationService(): ImpersonationService {
  if (!impersonationService) impersonationService = new ImpersonationService();
  return impersonationService;
}

export function getAccountLockoutService(): AccountLockoutService {
  if (!lockoutService) lockoutService = new AccountLockoutService();
  return lockoutService;
}

export function getSessionManagementService(): SessionManagementService {
  if (!sessionService) sessionService = new SessionManagementService();
  return sessionService;
}

export function getAuthWebhookService(): AuthWebhookService {
  if (!authWebhookService) authWebhookService = new AuthWebhookService();
  return authWebhookService;
}
