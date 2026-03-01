/**
 * GDPR API Routes
 */

import { Router, Request, Response } from 'express';
import { gdprService } from '../services/gdpr-service';
import { validateSession } from '../middleware/session-middleware';

const router = Router();

// All GDPR routes require authentication
router.use(validateSession);

/**
 * GET /api/gdpr/export
 * Export all user data
 */
router.get('/export', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: { message: 'Unauthorized' } });
      return;
    }

    const format = (req.query.format as 'json' | 'csv') || 'json';
    const { data, filePath } = await gdprService.exportUserData(userId, format);

    res.json({
      data: {
        message: 'Data export successful',
        export: data,
        downloadPath: filePath,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

/**
 * POST /api/gdpr/delete
 * Request account deletion
 */
router.post('/delete', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: { message: 'Unauthorized' } });
      return;
    }

    const { reason } = req.body;

    const result = await gdprService.deleteUserData(userId, reason);

    res.json({
      data: {
        message: 'Account deletion successful',
        ...result,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

/**
 * GET /api/gdpr/consent
 * Get consent status
 */
router.get('/consent', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: { message: 'Unauthorized' } });
      return;
    }

    const consents = await gdprService.getConsentStatus(userId);

    res.json({ data: consents });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

/**
 * POST /api/gdpr/consent
 * Grant consent
 */
router.post('/consent', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: { message: 'Unauthorized' } });
      return;
    }

    const { consentType } = req.body;

    if (!consentType) {
      res.status(400).json({ error: { message: 'Consent type is required' } });
      return;
    }

    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';

    const consent = await gdprService.grantConsent(
      userId,
      consentType,
      ipAddress,
      userAgent
    );

    res.json({ data: consent });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

/**
 * DELETE /api/gdpr/consent/:type
 * Revoke consent
 */
router.delete('/consent/:type', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: { message: 'Unauthorized' } });
      return;
    }

    const consentType = req.params.type as any;
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';

    const consent = await gdprService.revokeConsent(
      userId,
      consentType,
      ipAddress,
      userAgent
    );

    res.json({ data: consent });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

/**
 * POST /api/gdpr/anonymize
 * Anonymize user data (alternative to deletion)
 */
router.post('/anonymize', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: { message: 'Unauthorized' } });
      return;
    }

    await gdprService.anonymizeUserData(userId);

    res.json({
      data: {
        message: 'User data anonymized successfully',
        success: true,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

export default router;
