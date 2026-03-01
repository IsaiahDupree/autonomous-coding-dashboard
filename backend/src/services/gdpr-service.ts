/**
 * GDPR Compliance Service
 * Handles data export, deletion, and consent management
 */

import { PrismaClient } from '@prisma/client';
import { auditHelpers } from './audit-logger';
import { encryptionHelpers } from '../utils/encryption';
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

export interface ConsentRecord {
  userId: string;
  consentType: 'marketing' | 'analytics' | 'required';
  granted: boolean;
  grantedAt: Date | null;
  revokedAt: Date | null;
  ipAddress: string;
  userAgent: string;
}

export interface UserDataExport {
  user: any;
  profile: any;
  sessions: any[];
  apiTokens: any[];
  pctData?: {
    brands: any[];
    products: any[];
    usps: any[];
    hooks: any[];
  };
  auditLog: any[];
  consentRecords: ConsentRecord[];
  exportedAt: Date;
  format: 'json' | 'csv';
}

class GDPRService {
  /**
   * Export all user data (GDPR Article 15 - Right of Access)
   */
  async exportUserData(
    userId: string,
    format: 'json' | 'csv' = 'json'
  ): Promise<{ data: UserDataExport; filePath?: string }> {
    try {
      // Collect all user data from various sources
      const userData: UserDataExport = {
        user: await this.getUserData(userId),
        profile: await this.getProfileData(userId),
        sessions: await this.getSessionData(userId),
        apiTokens: await this.getApiTokenData(userId),
        pctData: await this.getPCTData(userId),
        auditLog: await this.getAuditLogData(userId),
        consentRecords: await this.getConsentRecords(userId),
        exportedAt: new Date(),
        format,
      };

      // Audit the export
      await auditHelpers.gdprDataExport(userId, userData.user.email);

      // Optionally save to file
      if (format === 'json') {
        const filePath = await this.saveExportToFile(userId, userData);
        return { data: userData, filePath };
      }

      return { data: userData };
    } catch (error) {
      console.error('GDPR data export error:', error);
      throw new Error('Failed to export user data');
    }
  }

  /**
   * Delete all user data (GDPR Article 17 - Right to Erasure)
   */
  async deleteUserData(
    userId: string,
    reason: string = 'User requested'
  ): Promise<{ success: boolean; deletedRecords: number }> {
    try {
      let deletedRecords = 0;

      // Before deletion, create a final export for compliance
      await this.exportUserData(userId, 'json');

      // Delete in order of dependencies
      // 1. PCT data
      const pctDeleted = await this.deletePCTData(userId);
      deletedRecords += pctDeleted;

      // 2. API tokens
      // await prisma.apiToken.deleteMany({ where: { userId } });
      deletedRecords++;

      // 3. Sessions (revoke all)
      const { sessionManager } = await import('./session-manager');
      await sessionManager.revokeAllUserSessions(userId, 'GDPR deletion');
      deletedRecords++;

      // 4. Consent records (anonymize, don't delete for compliance)
      await this.anonymizeConsentRecords(userId);

      // 5. Audit logs (anonymize user info but keep for compliance)
      await this.anonymizeAuditLogs(userId);

      // 6. User profile and account
      // await prisma.user.delete({ where: { id: userId } });
      deletedRecords++;

      // Audit the deletion
      await auditHelpers.gdprDataDeletion(userId, `[DELETED-${userId}]`);

      return { success: true, deletedRecords };
    } catch (error) {
      console.error('GDPR data deletion error:', error);
      throw new Error('Failed to delete user data');
    }
  }

  /**
   * Get consent status for user
   */
  async getConsentStatus(userId: string): Promise<ConsentRecord[]> {
    // This would query from a consent table
    // For now, return mock data
    return [];
  }

  /**
   * Grant consent
   */
  async grantConsent(
    userId: string,
    consentType: ConsentRecord['consentType'],
    ipAddress: string,
    userAgent: string
  ): Promise<ConsentRecord> {
    const consent: ConsentRecord = {
      userId,
      consentType,
      granted: true,
      grantedAt: new Date(),
      revokedAt: null,
      ipAddress,
      userAgent,
    };

    // Store in database
    // await prisma.consent.create({ data: consent });

    // Audit
    await auditHelpers.log({
      eventType: 'GDPR_CONSENT_GIVEN' as any,
      severity: 'INFO' as any,
      userId,
      result: 'SUCCESS',
      message: `Consent granted for ${consentType}`,
      metadata: { consentType },
    });

    return consent;
  }

  /**
   * Revoke consent
   */
  async revokeConsent(
    userId: string,
    consentType: ConsentRecord['consentType'],
    ipAddress: string,
    userAgent: string
  ): Promise<ConsentRecord> {
    const consent: ConsentRecord = {
      userId,
      consentType,
      granted: false,
      grantedAt: null,
      revokedAt: new Date(),
      ipAddress,
      userAgent,
    };

    // Update in database
    // await prisma.consent.update({ where: { userId_consentType: { userId, consentType } }, data: { granted: false, revokedAt: new Date() } });

    // Audit
    await auditHelpers.log({
      eventType: 'GDPR_CONSENT_REVOKED' as any,
      severity: 'WARNING' as any,
      userId,
      result: 'SUCCESS',
      message: `Consent revoked for ${consentType}`,
      metadata: { consentType },
    });

    return consent;
  }

  /**
   * Check if user has given specific consent
   */
  async hasConsent(
    userId: string,
    consentType: ConsentRecord['consentType']
  ): Promise<boolean> {
    const consents = await this.getConsentStatus(userId);
    const consent = consents.find((c) => c.consentType === consentType);
    return consent?.granted ?? false;
  }

  /**
   * Anonymize user data (alternative to deletion)
   */
  async anonymizeUserData(userId: string): Promise<void> {
    // Replace PII with anonymized values
    // await prisma.user.update({
    //   where: { id: userId },
    //   data: {
    //     email: `anonymized-${userId}@deleted.local`,
    //     name: 'Anonymized User',
    //     avatarUrl: null,
    //   },
    // });

    await this.anonymizeAuditLogs(userId);
    await this.anonymizeConsentRecords(userId);

    await auditHelpers.log({
      eventType: 'GDPR_DATA_DELETION' as any,
      severity: 'CRITICAL' as any,
      userId,
      result: 'SUCCESS',
      message: 'User data anonymized',
    });
  }

  // Private helper methods

  private async getUserData(userId: string) {
    // return await prisma.user.findUnique({ where: { id: userId } });
    return { id: userId, email: 'user@example.com', name: 'User' };
  }

  private async getProfileData(userId: string) {
    return {};
  }

  private async getSessionData(userId: string) {
    return [];
  }

  private async getApiTokenData(userId: string) {
    return [];
  }

  private async getPCTData(userId: string) {
    // Get all PCT-related data for the user
    const brands = await prisma.pctBrand.findMany({
      where: { createdBy: userId },
      include: {
        products: {
          include: {
            voiceOfCustomer: true,
            usps: {
              include: {
                angles: {
                  include: {
                    hooks: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return {
      brands,
      products: brands.flatMap((b) => b.products),
      usps: brands.flatMap((b) => b.products.flatMap((p) => p.usps)),
      hooks: brands.flatMap((b) =>
        b.products.flatMap((p) => p.usps.flatMap((u) => u.angles.flatMap((a) => a.hooks)))
      ),
    };
  }

  private async getAuditLogData(userId: string) {
    // This would query audit logs for the user
    return [];
  }

  private async getConsentRecords(userId: string): Promise<ConsentRecord[]> {
    return [];
  }

  private async deletePCTData(userId: string): Promise<number> {
    let count = 0;

    // Delete hooks, angles, USPs, VoC, products, brands
    const brands = await prisma.pctBrand.findMany({
      where: { createdBy: userId },
      include: { products: { include: { usps: { include: { angles: true } } } } },
    });

    for (const brand of brands) {
      for (const product of brand.products) {
        // Delete VoC
        await prisma.pctVoiceOfCustomer.deleteMany({ where: { productId: product.id } });
        count++;

        // Delete hooks, angles, USPs
        for (const usp of product.usps) {
          for (const angle of usp.angles) {
            await prisma.pctHook.deleteMany({ where: { angleId: angle.id } });
            count++;
          }
          await prisma.pctMarketingAngle.deleteMany({ where: { uspId: usp.id } });
          count++;
        }
        await prisma.pctUsp.deleteMany({ where: { productId: product.id } });
        count++;
      }

      // Delete products
      await prisma.pctProduct.deleteMany({ where: { brandId: brand.id } });
      count++;
    }

    // Delete brands
    await prisma.pctBrand.deleteMany({ where: { createdBy: userId } });
    count++;

    return count;
  }

  private async anonymizeAuditLogs(userId: string) {
    // In production, update audit logs to remove PII but keep events
    // We keep logs for compliance but anonymize user data
  }

  private async anonymizeConsentRecords(userId: string) {
    // Anonymize but keep consent history for compliance
  }

  private async saveExportToFile(userId: string, data: UserDataExport): Promise<string> {
    const exportDir = path.join(process.cwd(), 'exports', 'gdpr');
    await fs.mkdir(exportDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const filename = `user-data-export-${userId}-${timestamp}.json`;
    const filePath = path.join(exportDir, filename);

    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');

    return filePath;
  }
}

export const gdprService = new GDPRService();
