/**
 * Programmatic Creative Testing API Routes
 * Handles brands, products, VoC, USPs, marketing angles, and hooks
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { generateUSPs, generateAngles, generateHooks, generateVideoScript, rewriteScriptSection, extractPainPoints, extractBenefits, scoreUSP } from '../services/ai-generation';

const router = Router();
const prisma = new PrismaClient();

// ============================================
// BRANDS
// ============================================

router.get('/brands', async (req: Request, res: Response) => {
  try {
    const brands = await prisma.pctBrand.findMany({
      include: { products: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: brands });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

router.post('/brands', async (req: Request, res: Response) => {
  try {
    const { name, description, voice, values, toneStyle, logoUrl, colors } = req.body;
    if (!name) {
      res.status(400).json({ error: { message: 'Name is required' } });
      return;
    }
    const brand = await prisma.pctBrand.create({
      data: { name, description, voice, values, toneStyle, logoUrl: logoUrl || null, colors: colors || undefined },
    });
    res.status(201).json({ data: brand });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

router.get('/brands/:id', async (req: Request, res: Response) => {
  try {
    const brand = await prisma.pctBrand.findUnique({
      where: { id: req.params.id },
      include: {
        products: {
          include: {
            _count: { select: { usps: true, hooks: true, voiceOfCustomer: true } },
          },
        },
      },
    });
    if (!brand) {
      res.status(404).json({ error: { message: 'Brand not found' } });
      return;
    }
    res.json({ data: brand });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

router.put('/brands/:id', async (req: Request, res: Response) => {
  try {
    const { name, description, voice, values, toneStyle, logoUrl, colors } = req.body;
    const brand = await prisma.pctBrand.update({
      where: { id: req.params.id },
      data: { name, description, voice, values, toneStyle, logoUrl: logoUrl !== undefined ? logoUrl : undefined, colors: colors !== undefined ? colors : undefined },
    });
    res.json({ data: brand });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

router.delete('/brands/:id', async (req: Request, res: Response) => {
  try {
    await prisma.pctBrand.delete({ where: { id: req.params.id } });
    res.json({ data: { success: true } });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// ============================================
// PRODUCTS
// ============================================

router.get('/brands/:brandId/products', async (req: Request, res: Response) => {
  try {
    const products = await prisma.pctProduct.findMany({
      where: { brandId: req.params.brandId },
      include: {
        _count: { select: { usps: true, hooks: true, voiceOfCustomer: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: products });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

router.post('/brands/:brandId/products', async (req: Request, res: Response) => {
  try {
    const { name, description, features, benefits, targetAudience, pricePoint, category, imageUrl } = req.body;
    if (!name) {
      res.status(400).json({ error: { message: 'Name is required' } });
      return;
    }
    const product = await prisma.pctProduct.create({
      data: {
        brandId: req.params.brandId,
        name,
        description,
        features: features || [],
        benefits: benefits || [],
        targetAudience,
        pricePoint,
        category,
        imageUrl: imageUrl || null,
      },
    });
    res.status(201).json({ data: product });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

router.get('/products/:id', async (req: Request, res: Response) => {
  try {
    const product = await prisma.pctProduct.findUnique({
      where: { id: req.params.id },
      include: {
        brand: true,
        voiceOfCustomer: { orderBy: { createdAt: 'desc' } },
        usps: {
          include: { angles: true },
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { hooks: true } },
      },
    });
    if (!product) {
      res.status(404).json({ error: { message: 'Product not found' } });
      return;
    }
    res.json({ data: product });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

router.put('/products/:id', async (req: Request, res: Response) => {
  try {
    const { name, description, features, benefits, targetAudience, pricePoint, category } = req.body;
    const product = await prisma.pctProduct.update({
      where: { id: req.params.id },
      data: { name, description, features, benefits, targetAudience, pricePoint, category },
    });
    res.json({ data: product });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

router.delete('/products/:id', async (req: Request, res: Response) => {
  try {
    await prisma.pctProduct.delete({ where: { id: req.params.id } });
    res.json({ data: { success: true } });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// F1.2.6 - Bulk product import (CSV/JSON)
router.post('/brands/:brandId/products/bulk-import', async (req: Request, res: Response) => {
  try {
    const { products } = req.body;
    if (!Array.isArray(products) || products.length === 0) {
      res.status(400).json({ error: { message: 'products array is required' } });
      return;
    }

    const brand = await prisma.pctBrand.findUnique({ where: { id: req.params.brandId } });
    if (!brand) {
      res.status(404).json({ error: { message: 'Brand not found' } });
      return;
    }

    const created = await Promise.all(
      products.map((p: any) =>
        prisma.pctProduct.create({
          data: {
            brandId: req.params.brandId,
            name: p.name || 'Unnamed Product',
            description: p.description || null,
            features: Array.isArray(p.features) ? p.features : (p.features ? String(p.features).split('\n').filter(Boolean) : []),
            benefits: Array.isArray(p.benefits) ? p.benefits : (p.benefits ? String(p.benefits).split('\n').filter(Boolean) : []),
            targetAudience: p.targetAudience || p.target_audience || null,
            pricePoint: p.pricePoint || p.price_point || p.price || null,
            category: p.category || null,
          },
        })
      )
    );

    res.status(201).json({ data: { imported: created.length, products: created } });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// ============================================
// VOICE OF CUSTOMER
// ============================================

router.get('/products/:productId/voc', async (req: Request, res: Response) => {
  try {
    const entries = await prisma.pctVoiceOfCustomer.findMany({
      where: { productId: req.params.productId },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: entries });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

router.post('/products/:productId/voc', async (req: Request, res: Response) => {
  try {
    const { content, source, sourceType, sentiment, isGoldNugget } = req.body;
    if (!content) {
      res.status(400).json({ error: { message: 'Content is required' } });
      return;
    }
    const entry = await prisma.pctVoiceOfCustomer.create({
      data: {
        productId: req.params.productId,
        content,
        source,
        sourceType: sourceType || 'other',
        sentiment: sentiment || 'neutral',
        isGoldNugget: isGoldNugget || false,
      },
    });
    res.status(201).json({ data: entry });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// Bulk import VoC entries
router.post('/products/:productId/voc/bulk', async (req: Request, res: Response) => {
  try {
    const { entries } = req.body;
    if (!entries || !Array.isArray(entries)) {
      res.status(400).json({ error: { message: 'entries array is required' } });
      return;
    }

    const created = await Promise.all(
      entries.map((entry: any) =>
        prisma.pctVoiceOfCustomer.create({
          data: {
            productId: req.params.productId,
            content: entry.content,
            source: entry.source || null,
            sourceType: entry.sourceType || 'other',
            sentiment: entry.sentiment || 'neutral',
            isGoldNugget: entry.isGoldNugget || false,
          },
        })
      )
    );

    res.status(201).json({ data: created });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// AI extract pain points from VoC
router.post('/products/:productId/voc/extract-pain-points', async (req: Request, res: Response) => {
  try {
    const product = await prisma.pctProduct.findUnique({
      where: { id: req.params.productId },
      include: { brand: true, voiceOfCustomer: true },
    });
    if (!product) {
      res.status(404).json({ error: { message: 'Product not found' } });
      return;
    }
    if (product.voiceOfCustomer.length === 0) {
      res.status(400).json({ error: { message: 'No VoC entries to analyze' } });
      return;
    }

    const productContext = {
      name: product.name,
      description: product.description || undefined,
      brandName: product.brand.name,
    };

    const vocEntries = product.voiceOfCustomer.map(v => ({
      content: v.content,
      source: v.source || undefined,
      sentiment: v.sentiment,
    }));

    const painPoints = await extractPainPoints(vocEntries, productContext);
    res.json({ data: painPoints });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// AI extract benefits from VoC
router.post('/products/:productId/voc/extract-benefits', async (req: Request, res: Response) => {
  try {
    const product = await prisma.pctProduct.findUnique({
      where: { id: req.params.productId },
      include: { brand: true, voiceOfCustomer: true },
    });
    if (!product) {
      res.status(404).json({ error: { message: 'Product not found' } });
      return;
    }
    if (product.voiceOfCustomer.length === 0) {
      res.status(400).json({ error: { message: 'No VoC entries to analyze' } });
      return;
    }

    const productContext = {
      name: product.name,
      description: product.description || undefined,
      brandName: product.brand.name,
    };

    const vocEntries = product.voiceOfCustomer.map(v => ({
      content: v.content,
      source: v.source || undefined,
      sentiment: v.sentiment,
    }));

    const benefits = await extractBenefits(vocEntries, productContext);
    res.json({ data: benefits });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

router.delete('/voc/:id', async (req: Request, res: Response) => {
  try {
    await prisma.pctVoiceOfCustomer.delete({ where: { id: req.params.id } });
    res.json({ data: { success: true } });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// ============================================
// USPs
// ============================================

router.get('/products/:productId/usps', async (req: Request, res: Response) => {
  try {
    // F2.1.6: Support ?archived=true to get archived USPs
    const archived = req.query.archived === 'true';
    const usps = await prisma.pctUSP.findMany({
      where: {
        productId: req.params.productId,
        archivedAt: archived ? { not: null } : null,
      },
      include: {
        angles: true,
        _count: { select: { hooks: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: usps });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

router.post('/products/:productId/usps', async (req: Request, res: Response) => {
  try {
    const { content } = req.body;
    if (!content) {
      res.status(400).json({ error: { message: 'Content is required' } });
      return;
    }
    const usp = await prisma.pctUSP.create({
      data: {
        productId: req.params.productId,
        content,
        isAiGenerated: false,
      },
    });
    res.status(201).json({ data: usp });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

router.post('/products/:productId/usps/generate', async (req: Request, res: Response) => {
  try {
    const product = await prisma.pctProduct.findUnique({
      where: { id: req.params.productId },
      include: {
        brand: true,
        voiceOfCustomer: true,
      },
    });
    if (!product) {
      res.status(404).json({ error: { message: 'Product not found' } });
      return;
    }

    const productContext = {
      name: product.name,
      description: product.description || undefined,
      features: (product.features as string[]) || undefined,
      benefits: (product.benefits as string[]) || undefined,
      targetAudience: product.targetAudience || undefined,
      pricePoint: product.pricePoint || undefined,
      brandName: product.brand.name,
      brandVoice: product.brand.voice || undefined,
    };

    const vocEntries = product.voiceOfCustomer.map(v => ({
      content: v.content,
      source: v.source || undefined,
      sentiment: v.sentiment,
    }));

    const uspStrings = await generateUSPs(productContext, vocEntries);

    const createdUsps = await Promise.all(
      uspStrings.map(content =>
        prisma.pctUSP.create({
          data: {
            productId: req.params.productId,
            content,
            isAiGenerated: true,
          },
        })
      )
    );

    res.status(201).json({ data: createdUsps });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

router.put('/usps/:id', async (req: Request, res: Response) => {
  try {
    const { content, strengthScore } = req.body;
    const usp = await prisma.pctUSP.update({
      where: { id: req.params.id },
      data: { content, strengthScore },
    });
    res.json({ data: usp });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

router.delete('/usps/:id', async (req: Request, res: Response) => {
  try {
    await prisma.pctUSP.delete({ where: { id: req.params.id } });
    res.json({ data: { success: true } });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// F2.1.6: Archive a USP (soft delete for history)
router.post('/usps/:id/archive', async (req: Request, res: Response) => {
  try {
    const { note } = req.body;
    const usp = await prisma.pctUSP.update({
      where: { id: req.params.id },
      data: { archivedAt: new Date(), archiveNote: note || null },
    });
    res.json({ data: usp });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// F2.1.6: Restore an archived USP
router.post('/usps/:id/restore', async (req: Request, res: Response) => {
  try {
    const usp = await prisma.pctUSP.update({
      where: { id: req.params.id },
      data: { archivedAt: null, archiveNote: null },
    });
    res.json({ data: usp });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// ============================================
// F10.1.4: ACTIVITY LOG
// ============================================

// Get activity log (with optional filters)
router.get('/activity-log', async (req: Request, res: Response) => {
  try {
    const { userId, action, entityType, limit = '50', offset = '0' } = req.query;
    const where: any = {};
    if (userId) where.userId = String(userId);
    if (action) where.action = String(action);
    if (entityType) where.entityType = String(entityType);

    const [logs, total] = await Promise.all([
      prisma.pctActivityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Math.min(parseInt(String(limit)), 200),
        skip: parseInt(String(offset)),
      }),
      prisma.pctActivityLog.count({ where }),
    ]);
    res.json({ data: logs, total });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// Create an activity log entry
router.post('/activity-log', async (req: Request, res: Response) => {
  try {
    const { userId, userName, action, entityType, entityId, details } = req.body;
    if (!action) {
      res.status(400).json({ error: { message: 'action is required' } });
      return;
    }
    const log = await prisma.pctActivityLog.create({
      data: { userId, userName, action, entityType, entityId, details },
    });
    res.status(201).json({ data: log });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// ============================================
// F10.1.1/F10.1.2/F10.1.3: USER MANAGEMENT
// ============================================

// In-memory user registry (production would use proper DB + hashing)
const pctUserRegistry: Map<string, {
  id: string; email: string; name: string; role: string;
  workspaceId?: string; avatarUrl?: string; isActive: boolean;
  createdAt: string; lastLoginAt?: string;
}> = new Map();

// List users (F10.1.3: team management)
router.get('/users', async (req: Request, res: Response) => {
  const users = Array.from(pctUserRegistry.values()).map(u => ({ ...u, passwordHash: undefined }));
  res.json({ data: users });
});

// Create/register a user (F10.1.1)
router.post('/users', async (req: Request, res: Response) => {
  try {
    const { email, name, role = 'viewer', workspaceId, avatarUrl } = req.body;
    if (!email || !name) {
      res.status(400).json({ error: { message: 'email and name are required' } });
      return;
    }
    const existing = Array.from(pctUserRegistry.values()).find(u => u.email === email);
    if (existing) {
      res.status(409).json({ error: { message: 'User with this email already exists' } });
      return;
    }
    const VALID_ROLES = ['admin', 'editor', 'viewer'];
    if (!VALID_ROLES.includes(role)) {
      res.status(400).json({ error: { message: `role must be one of: ${VALID_ROLES.join(', ')}` } });
      return;
    }
    const id = `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const user = { id, email, name, role, workspaceId, avatarUrl, isActive: true, createdAt: new Date().toISOString() };
    pctUserRegistry.set(id, user);
    res.status(201).json({ data: user });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// Update a user (F10.1.2: change role)
router.put('/users/:id', async (req: Request, res: Response) => {
  const user = pctUserRegistry.get(req.params.id);
  if (!user) {
    res.status(404).json({ error: { message: 'User not found' } });
    return;
  }
  const { name, role, isActive, avatarUrl, workspaceId } = req.body;
  if (name) user.name = name;
  if (role) user.role = role;
  if (isActive !== undefined) user.isActive = isActive;
  if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
  if (workspaceId !== undefined) user.workspaceId = workspaceId;
  pctUserRegistry.set(req.params.id, user);
  res.json({ data: user });
});

// Delete a user
router.delete('/users/:id', async (req: Request, res: Response) => {
  if (!pctUserRegistry.has(req.params.id)) {
    res.status(404).json({ error: { message: 'User not found' } });
    return;
  }
  pctUserRegistry.delete(req.params.id);
  res.json({ data: { success: true } });
});

// List workspaces (F10.1.3)
const pctWorkspaceRegistry: Map<string, {
  id: string; name: string; slug: string; plan: string; ownerId?: string; createdAt: string;
}> = new Map();

router.get('/workspaces', async (req: Request, res: Response) => {
  res.json({ data: Array.from(pctWorkspaceRegistry.values()) });
});

router.post('/workspaces', async (req: Request, res: Response) => {
  try {
    const { name, plan = 'free', ownerId } = req.body;
    if (!name) {
      res.status(400).json({ error: { message: 'name is required' } });
      return;
    }
    const id = `ws_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const workspace = { id, name, slug, plan, ownerId, createdAt: new Date().toISOString() };
    pctWorkspaceRegistry.set(id, workspace);
    res.status(201).json({ data: workspace });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// AI score a USP for strength
router.post('/usps/:id/score', async (req: Request, res: Response) => {
  try {
    const usp = await prisma.pctUSP.findUnique({
      where: { id: req.params.id },
      include: { product: { include: { brand: true } } },
    });
    if (!usp) {
      res.status(404).json({ error: { message: 'USP not found' } });
      return;
    }

    const productContext = {
      name: usp.product.name,
      description: usp.product.description || undefined,
      targetAudience: usp.product.targetAudience || undefined,
      brandVoice: usp.product.brand.voice || undefined,
    };

    const scoreResult = await scoreUSP(usp.content, productContext);

    // Save the score to the USP
    const updated = await prisma.pctUSP.update({
      where: { id: req.params.id },
      data: { strengthScore: scoreResult.score },
    });

    res.json({ data: { ...updated, scoreDetails: scoreResult } });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// ============================================
// MARKETING ANGLES
// ============================================

router.get('/usps/:uspId/angles', async (req: Request, res: Response) => {
  try {
    const angles = await prisma.pctMarketingAngle.findMany({
      where: { uspId: req.params.uspId },
      include: { _count: { select: { hooks: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: angles });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

router.post('/usps/:uspId/angles', async (req: Request, res: Response) => {
  try {
    const { content, category } = req.body;
    if (!content) {
      res.status(400).json({ error: { message: 'Content is required' } });
      return;
    }
    const angle = await prisma.pctMarketingAngle.create({
      data: {
        uspId: req.params.uspId,
        content,
        category: category || 'functional',
      },
    });
    res.status(201).json({ data: angle });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

router.post('/usps/:uspId/angles/generate', async (req: Request, res: Response) => {
  try {
    const { count } = req.body;
    const usp = await prisma.pctUSP.findUnique({
      where: { id: req.params.uspId },
      include: {
        product: { include: { brand: true } },
      },
    });
    if (!usp) {
      res.status(404).json({ error: { message: 'USP not found' } });
      return;
    }

    const productContext = {
      name: usp.product.name,
      description: usp.product.description || undefined,
      targetAudience: usp.product.targetAudience || undefined,
      brandVoice: usp.product.brand.voice || undefined,
    };

    const angleData = await generateAngles(usp.content, productContext, count || 8);

    const createdAngles = await Promise.all(
      angleData.map(a =>
        prisma.pctMarketingAngle.create({
          data: {
            uspId: req.params.uspId,
            content: a.content,
            category: a.category as any,
          },
        })
      )
    );

    res.status(201).json({ data: createdAngles });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

router.put('/angles/:id', async (req: Request, res: Response) => {
  try {
    const { content, category, isApproved } = req.body;
    const angle = await prisma.pctMarketingAngle.update({
      where: { id: req.params.id },
      data: { content, category, isApproved },
    });
    res.json({ data: angle });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

router.delete('/angles/:id', async (req: Request, res: Response) => {
  try {
    await prisma.pctMarketingAngle.delete({ where: { id: req.params.id } });
    res.json({ data: { success: true } });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// ============================================
// HOOKS
// ============================================

// Matrix generation: generate hooks across multiple parameter combinations
router.post('/hooks/generate-matrix', async (req: Request, res: Response) => {
  try {
    const {
      productId,
      uspId,
      marketingAngleId,
      messagingFrameworks,
      awarenessLevels,
      marketSophistications,
      batchSizePerCombo,
    } = req.body;

    if (!productId || !messagingFrameworks?.length || !awarenessLevels?.length || !marketSophistications?.length) {
      res.status(400).json({
        error: { message: 'productId, messagingFrameworks[], awarenessLevels[], and marketSophistications[] are required' },
      });
      return;
    }

    const product = await prisma.pctProduct.findUnique({
      where: { id: productId },
      include: { brand: true },
    });
    if (!product) {
      res.status(404).json({ error: { message: 'Product not found' } });
      return;
    }

    let uspContent = '';
    let angleContent = '';
    if (uspId) {
      const usp = await prisma.pctUSP.findUnique({ where: { id: uspId } });
      if (usp) uspContent = usp.content;
    }
    if (marketingAngleId) {
      const angle = await prisma.pctMarketingAngle.findUnique({ where: { id: marketingAngleId } });
      if (angle) angleContent = angle.content;
    }

    const productContext = {
      name: product.name,
      description: product.description || undefined,
      features: (product.features as string[]) || undefined,
      benefits: (product.benefits as string[]) || undefined,
      targetAudience: product.targetAudience || undefined,
      pricePoint: product.pricePoint || undefined,
      brandName: product.brand.name,
      brandVoice: product.brand.voice || undefined,
    };

    const allHooks: any[] = [];
    const sizePerCombo = batchSizePerCombo || 5;

    // Generate hooks for each combination
    for (const framework of messagingFrameworks) {
      for (const awareness of awarenessLevels) {
        for (const sophistication of marketSophistications) {
          try {
            const hookStrings = await generateHooks({
              usp: uspContent || product.name,
              angle: angleContent || 'General product benefit',
              messagingFramework: framework,
              awarenessLevel: awareness,
              marketSophistication: sophistication,
              product: productContext,
              batchSize: sizePerCombo,
            });

            const created = await Promise.all(
              hookStrings.map(content =>
                prisma.pctHook.create({
                  data: {
                    productId,
                    uspId: uspId || null,
                    marketingAngleId: marketingAngleId || null,
                    content,
                    messagingFramework: framework as any,
                    awarenessLevel: awareness,
                    marketSophistication: sophistication,
                    isAiGenerated: true,
                  },
                })
              )
            );
            allHooks.push(...created);
          } catch (err) {
            // Continue with other combinations if one fails
            console.error(`Matrix generation failed for ${framework}/${awareness}/${sophistication}:`, err);
          }
        }
      }
    }

    res.status(201).json({ data: allHooks, totalCombinations: messagingFrameworks.length * awarenessLevels.length * marketSophistications.length });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

router.post('/hooks/generate', async (req: Request, res: Response) => {
  try {
    const {
      productId,
      uspId,
      marketingAngleId,
      messagingFramework,
      awarenessLevel,
      marketSophistication,
      batchSize,
      psychologicalTriggers,
      emotionTargets,
      copywriterStyle,
      toneModifier,
      maxWords,
      aiModel,
    } = req.body;

    if (!productId || !messagingFramework || !awarenessLevel || !marketSophistication) {
      res.status(400).json({
        error: { message: 'productId, messagingFramework, awarenessLevel, and marketSophistication are required' },
      });
      return;
    }

    const product = await prisma.pctProduct.findUnique({
      where: { id: productId },
      include: { brand: true },
    });
    if (!product) {
      res.status(404).json({ error: { message: 'Product not found' } });
      return;
    }

    let uspContent = '';
    let angleContent = '';

    if (uspId) {
      const usp = await prisma.pctUSP.findUnique({ where: { id: uspId } });
      if (usp) uspContent = usp.content;
    }

    if (marketingAngleId) {
      const angle = await prisma.pctMarketingAngle.findUnique({ where: { id: marketingAngleId } });
      if (angle) angleContent = angle.content;
    }

    const productContext = {
      name: product.name,
      description: product.description || undefined,
      features: (product.features as string[]) || undefined,
      benefits: (product.benefits as string[]) || undefined,
      targetAudience: product.targetAudience || undefined,
      pricePoint: product.pricePoint || undefined,
      brandName: product.brand.name,
      brandVoice: product.brand.voice || undefined,
    };

    const hookStrings = await generateHooks({
      usp: uspContent || product.name,
      angle: angleContent || 'General product benefit',
      messagingFramework,
      awarenessLevel,
      marketSophistication,
      product: productContext,
      batchSize: batchSize || 10,
      psychologicalTriggers,
      emotionTargets,
      copywriterStyle,
      toneModifier,
      maxWords,
      aiModel: aiModel || undefined,
    });

    const createdHooks = await Promise.all(
      hookStrings.map(content =>
        prisma.pctHook.create({
          data: {
            productId,
            uspId: uspId || null,
            marketingAngleId: marketingAngleId || null,
            content,
            messagingFramework: messagingFramework as any,
            awarenessLevel,
            marketSophistication,
            isAiGenerated: true,
          },
        })
      )
    );

    res.status(201).json({ data: createdHooks });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

router.get('/hooks', async (req: Request, res: Response) => {
  try {
    const {
      productId,
      uspId,
      marketingAngleId,
      messagingFramework,
      awarenessLevel,
      marketSophistication,
      status,
      search,
      sortBy,
      limit,
      offset,
    } = req.query;

    const where: any = {};
    if (productId) where.productId = productId;
    if (uspId) where.uspId = uspId;
    if (marketingAngleId) where.marketingAngleId = marketingAngleId;
    if (messagingFramework) where.messagingFramework = messagingFramework;
    if (awarenessLevel) where.awarenessLevel = parseInt(awarenessLevel as string);
    if (marketSophistication) where.marketSophistication = parseInt(marketSophistication as string);
    if (status) where.status = status;
    if (search) where.content = { contains: search as string, mode: 'insensitive' };

    let orderBy: any = { createdAt: 'desc' };
    if (sortBy === 'rating') orderBy = { rating: 'desc' };

    const hooks = await prisma.pctHook.findMany({
      where,
      include: {
        usp: { select: { id: true, content: true } },
        angle: { select: { id: true, content: true } },
        product: { select: { id: true, name: true } },
      },
      orderBy,
      take: parseInt((limit as string) || '50'),
      skip: parseInt((offset as string) || '0'),
    });

    const total = await prisma.pctHook.count({ where });

    res.json({ data: hooks, total });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// Get all unique tags across hooks
router.get('/hooks/tags', async (req: Request, res: Response) => {
  try {
    const hooks = await prisma.pctHook.findMany({
      select: { tags: true },
    });
    const tagSet = new Set<string>();
    for (const hook of hooks) {
      const tags = hook.tags as string[];
      if (Array.isArray(tags)) {
        for (const tag of tags) tagSet.add(tag);
      }
    }
    res.json({ data: Array.from(tagSet).sort() });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// Export hooks as CSV or JSON
router.get('/hooks/export', async (req: Request, res: Response) => {
  try {
    const { format, ...filters } = req.query;
    const where: any = {};
    if (filters.productId) where.productId = filters.productId;
    if (filters.status) where.status = filters.status;
    if (filters.messagingFramework) where.messagingFramework = filters.messagingFramework;
    if (filters.awarenessLevel) where.awarenessLevel = parseInt(filters.awarenessLevel as string);
    if (filters.marketSophistication) where.marketSophistication = parseInt(filters.marketSophistication as string);

    const hooks = await prisma.pctHook.findMany({
      where,
      include: {
        usp: { select: { content: true } },
        angle: { select: { content: true } },
        product: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (format === 'csv') {
      const header = 'content,status,rating,messagingFramework,awarenessLevel,marketSophistication,usp,angle,product,createdAt';
      const rows = hooks.map(h => {
        const escape = (s?: string | null) => s ? `"${s.replace(/"/g, '""')}"` : '';
        return [
          escape(h.content),
          h.status,
          h.rating ?? '',
          h.messagingFramework,
          h.awarenessLevel,
          h.marketSophistication,
          escape(h.usp?.content),
          escape(h.angle?.content),
          escape(h.product?.name),
          h.createdAt.toISOString(),
        ].join(',');
      });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=hooks-export.csv');
      res.send([header, ...rows].join('\n'));
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=hooks-export.json');
      res.json({ data: hooks });
    }
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// Generate variations of an existing hook ("More Like This")
router.post('/hooks/:id/variations', async (req: Request, res: Response) => {
  try {
    const { count } = req.body;
    const sourceHook = await prisma.pctHook.findUnique({
      where: { id: req.params.id },
      include: {
        product: { include: { brand: true } },
        usp: true,
        angle: true,
      },
    });
    if (!sourceHook) {
      res.status(404).json({ error: { message: 'Hook not found' } });
      return;
    }

    const productContext = {
      name: sourceHook.product.name,
      description: sourceHook.product.description || undefined,
      features: (sourceHook.product.features as string[]) || undefined,
      benefits: (sourceHook.product.benefits as string[]) || undefined,
      targetAudience: sourceHook.product.targetAudience || undefined,
      pricePoint: sourceHook.product.pricePoint || undefined,
      brandName: sourceHook.product.brand.name,
      brandVoice: sourceHook.product.brand.voice || undefined,
    };

    const hookStrings = await generateHooks({
      usp: sourceHook.usp?.content || sourceHook.product.name,
      angle: sourceHook.angle?.content || 'General product benefit',
      messagingFramework: sourceHook.messagingFramework,
      awarenessLevel: sourceHook.awarenessLevel,
      marketSophistication: sourceHook.marketSophistication,
      product: productContext,
      batchSize: count || 5,
      referenceHook: sourceHook.content,
    });

    const createdHooks = await Promise.all(
      hookStrings.map(content =>
        prisma.pctHook.create({
          data: {
            productId: sourceHook.productId,
            uspId: sourceHook.uspId,
            marketingAngleId: sourceHook.marketingAngleId,
            content,
            messagingFramework: sourceHook.messagingFramework as any,
            awarenessLevel: sourceHook.awarenessLevel,
            marketSophistication: sourceHook.marketSophistication,
            isAiGenerated: true,
          },
        })
      )
    );

    res.status(201).json({ data: createdHooks });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// Bulk update MUST come before :id route to avoid Express matching "bulk" as an id
router.patch('/hooks/bulk/update', async (req: Request, res: Response) => {
  try {
    const { ids, status, rating } = req.body;
    if (!ids || !Array.isArray(ids)) {
      res.status(400).json({ error: { message: 'ids array is required' } });
      return;
    }

    const data: any = {};
    if (status) data.status = status;
    if (rating !== undefined) data.rating = rating;

    await prisma.pctHook.updateMany({
      where: { id: { in: ids } },
      data,
    });

    res.json({ data: { success: true, updated: ids.length } });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

router.patch('/hooks/:id', async (req: Request, res: Response) => {
  try {
    const { content, status, rating } = req.body;
    const hook = await prisma.pctHook.update({
      where: { id: req.params.id },
      data: { content, status, rating },
    });
    res.json({ data: hook });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

router.delete('/hooks/:id', async (req: Request, res: Response) => {
  try {
    await prisma.pctHook.delete({ where: { id: req.params.id } });
    res.json({ data: { success: true } });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// ============================================
// TEMPLATES
// ============================================

router.get('/templates', async (req: Request, res: Response) => {
  try {
    const where: any = {};
    if (req.query.productId) where.productId = req.query.productId;
    if (req.query.isActive !== undefined) where.isActive = req.query.isActive === 'true';

    const templates = await prisma.pctTemplate.findMany({
      where,
      include: {
        _count: { select: { generatedAds: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: templates });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

router.post('/templates', async (req: Request, res: Response) => {
  try {
    const { name, imageUrl, width, height, textZones, category, productId } = req.body;
    if (!name || !imageUrl || !width || !height) {
      res.status(400).json({ error: { message: 'name, imageUrl, width, and height are required' } });
      return;
    }
    const template = await prisma.pctTemplate.create({
      data: {
        name,
        imageUrl,
        width,
        height,
        textZones: textZones || [],
        category: category || null,
        productId: productId || null,
      },
    });
    res.status(201).json({ data: template });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

router.get('/templates/:id', async (req: Request, res: Response) => {
  try {
    const template = await prisma.pctTemplate.findUnique({
      where: { id: req.params.id },
      include: {
        product: { select: { id: true, name: true } },
        _count: { select: { generatedAds: true } },
      },
    });
    if (!template) {
      res.status(404).json({ error: { message: 'Template not found' } });
      return;
    }
    res.json({ data: template });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

router.put('/templates/:id', async (req: Request, res: Response) => {
  try {
    const { name, textZones, isActive, category } = req.body;
    const template = await prisma.pctTemplate.update({
      where: { id: req.params.id },
      data: { name, textZones, isActive, category },
    });
    res.json({ data: template });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

router.post('/templates/:id/duplicate', async (req: Request, res: Response) => {
  try {
    const source = await prisma.pctTemplate.findUnique({ where: { id: req.params.id } });
    if (!source) {
      res.status(404).json({ error: { message: 'Template not found' } });
      return;
    }
    const duplicate = await prisma.pctTemplate.create({
      data: {
        name: `${source.name} (Copy)`,
        imageUrl: source.imageUrl,
        width: source.width,
        height: source.height,
        textZones: source.textZones as any,
        category: source.category,
        productId: source.productId,
      },
    });
    res.status(201).json({ data: duplicate });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

router.delete('/templates/:id', async (req: Request, res: Response) => {
  try {
    await prisma.pctTemplate.delete({ where: { id: req.params.id } });
    res.json({ data: { success: true } });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// ============================================
// GENERATED ADS
// ============================================

router.post('/generated-ads/batch', async (req: Request, res: Response) => {
  try {
    const { ads } = req.body;
    if (!ads || !Array.isArray(ads) || ads.length === 0) {
      res.status(400).json({ error: { message: 'ads array is required' } });
      return;
    }

    const createdAds = await Promise.all(
      ads.map((ad: { templateId: string; hookId: string; imageDataUrl: string; width: number; height: number }) =>
        prisma.pctGeneratedAd.create({
          data: {
            templateId: ad.templateId,
            hookId: ad.hookId,
            imageDataUrl: ad.imageDataUrl,
            width: ad.width,
            height: ad.height,
          },
        })
      )
    );

    res.status(201).json({ data: createdAds });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

router.get('/generated-ads', async (req: Request, res: Response) => {
  try {
    const { templateId, hookId, status, limit, offset } = req.query;
    const where: any = {};
    if (templateId) where.templateId = templateId;
    if (hookId) where.hookId = hookId;
    if (status) where.status = status;

    const ads = await prisma.pctGeneratedAd.findMany({
      where,
      include: {
        template: { select: { id: true, name: true, category: true } },
        hook: { select: { id: true, content: true, messagingFramework: true, awarenessLevel: true, marketSophistication: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt((limit as string) || '50'),
      skip: parseInt((offset as string) || '0'),
    });

    const total = await prisma.pctGeneratedAd.count({ where });
    res.json({ data: ads, total });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

router.patch('/generated-ads/bulk/update', async (req: Request, res: Response) => {
  try {
    const { ids, status } = req.body;
    if (!ids || !Array.isArray(ids)) {
      res.status(400).json({ error: { message: 'ids array is required' } });
      return;
    }
    await prisma.pctGeneratedAd.updateMany({
      where: { id: { in: ids } },
      data: { status },
    });
    res.json({ data: { success: true, updated: ids.length } });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

router.patch('/generated-ads/:id', async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const ad = await prisma.pctGeneratedAd.update({
      where: { id: req.params.id },
      data: { status },
    });
    res.json({ data: ad });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

router.delete('/generated-ads/:id', async (req: Request, res: Response) => {
  try {
    await prisma.pctGeneratedAd.delete({ where: { id: req.params.id } });
    res.json({ data: { success: true } });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// ============================================
// VIDEO SCRIPTS
// ============================================

router.post('/video-scripts/generate', async (req: Request, res: Response) => {
  try {
    const { hookId, productId, duration, narratorStyle, psychologicalTriggers, emotionArc } = req.body;
    if (!hookId || !productId) {
      res.status(400).json({ error: { message: 'hookId and productId are required' } });
      return;
    }

    const hook = await prisma.pctHook.findUnique({
      where: { id: hookId },
      include: {
        usp: true,
        angle: true,
      },
    });
    if (!hook) {
      res.status(404).json({ error: { message: 'Hook not found' } });
      return;
    }

    const product = await prisma.pctProduct.findUnique({
      where: { id: productId },
      include: { brand: true },
    });
    if (!product) {
      res.status(404).json({ error: { message: 'Product not found' } });
      return;
    }

    const productContext = {
      name: product.name,
      description: product.description || undefined,
      features: (product.features as string[]) || undefined,
      benefits: (product.benefits as string[]) || undefined,
      targetAudience: product.targetAudience || undefined,
      pricePoint: product.pricePoint || undefined,
      brandName: product.brand.name,
      brandVoice: product.brand.voice || undefined,
    };

    const durationMap: Record<string, '15s' | '30s' | '60s' | '90s'> = {
      fifteen_seconds: '15s',
      thirty_seconds: '30s',
      sixty_seconds: '60s',
      ninety_seconds: '90s',
    };

    const scriptResult = await generateVideoScript({
      hookContent: hook.content,
      usp: hook.usp?.content,
      angle: hook.angle?.content,
      product: productContext,
      duration: durationMap[duration] || '30s',
      narratorStyle,
      psychologicalTriggers: Array.isArray(psychologicalTriggers) ? psychologicalTriggers : undefined,
      emotionArc: emotionArc || undefined,
    });

    const script = await prisma.pctVideoScript.create({
      data: {
        hookId,
        productId,
        title: scriptResult.title,
        hook: scriptResult.hook,
        lid: scriptResult.lid,
        body: scriptResult.body,
        cta: scriptResult.cta,
        fullScript: scriptResult.fullScript,
        duration: duration || 'thirty_seconds',
        narratorStyle,
        wordCount: scriptResult.wordCount,
        isAiGenerated: true,
      },
    });

    res.status(201).json({ data: script });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

router.get('/video-scripts', async (req: Request, res: Response) => {
  try {
    const { productId, hookId, status, duration, limit, offset } = req.query;
    const where: any = {};
    if (productId) where.productId = productId;
    if (hookId) where.hookId = hookId;
    if (status) where.status = status;
    if (duration) where.duration = duration;

    const scripts = await prisma.pctVideoScript.findMany({
      where,
      include: {
        hookRef: {
          select: {
            id: true,
            content: true,
            messagingFramework: true,
            awarenessLevel: true,
            marketSophistication: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt((limit as string) || '50'),
      skip: parseInt((offset as string) || '0'),
    });

    const total = await prisma.pctVideoScript.count({ where });
    res.json({ data: scripts, total });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

router.get('/video-scripts/:id', async (req: Request, res: Response) => {
  try {
    const script = await prisma.pctVideoScript.findUnique({
      where: { id: req.params.id },
      include: {
        hookRef: {
          select: { id: true, content: true, messagingFramework: true },
        },
      },
    });
    if (!script) {
      res.status(404).json({ error: { message: 'Script not found' } });
      return;
    }
    res.json({ data: script });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

router.patch('/video-scripts/:id', async (req: Request, res: Response) => {
  try {
    const { title, hook, lid, body, cta, status } = req.body;
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (hook !== undefined) updateData.hook = hook;
    if (lid !== undefined) updateData.lid = lid;
    if (body !== undefined) updateData.body = body;
    if (cta !== undefined) updateData.cta = cta;
    if (status !== undefined) updateData.status = status;

    // Recalculate fullScript and wordCount if any section changed
    if (hook !== undefined || lid !== undefined || body !== undefined || cta !== undefined) {
      const existing = await prisma.pctVideoScript.findUnique({ where: { id: req.params.id } });
      if (existing) {
        const h = hook !== undefined ? hook : existing.hook;
        const l = lid !== undefined ? lid : existing.lid;
        const b = body !== undefined ? body : existing.body;
        const c = cta !== undefined ? cta : existing.cta;
        updateData.fullScript = `HOOK:\n${h}\n\nLID:\n${l}\n\nBODY:\n${b}\n\nCTA:\n${c}`;
        updateData.wordCount = updateData.fullScript.replace(/\[.*?\]/g, '').split(/\s+/).filter(Boolean).length;
      }
    }

    const script = await prisma.pctVideoScript.update({
      where: { id: req.params.id },
      data: updateData,
    });
    res.json({ data: script });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

router.delete('/video-scripts/:id', async (req: Request, res: Response) => {
  try {
    await prisma.pctVideoScript.delete({ where: { id: req.params.id } });
    res.json({ data: { success: true } });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// F6.2.4: AI rewrite suggestions for a specific script section
router.post('/video-scripts/:id/rewrite-section', async (req: Request, res: Response) => {
  try {
    const { section, count } = req.body;
    if (!section || !['hook', 'lid', 'body', 'cta'].includes(section)) {
      res.status(400).json({ error: { message: 'section must be one of: hook, lid, body, cta' } });
      return;
    }

    const script = await prisma.pctVideoScript.findUnique({
      where: { id: req.params.id },
      include: { hookRef: { include: { product: { include: { brand: true } } } } },
    });
    if (!script) {
      res.status(404).json({ error: { message: 'Script not found' } });
      return;
    }

    const productName = script.hookRef?.product?.name || 'Unknown Product';
    const brandVoice = script.hookRef?.product?.brand?.voice || undefined;

    const suggestions = await rewriteScriptSection({
      section: section as 'hook' | 'lid' | 'body' | 'cta',
      currentText: (script as any)[section] || '',
      fullScript: {
        hook: script.hook,
        lid: script.lid,
        body: script.body,
        cta: script.cta,
      },
      productName,
      brandVoice,
      count: count ? parseInt(count, 10) : 3,
    });

    res.json({ data: { suggestions } });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// ============================================
// META DEPLOYMENT - Module 7
// ============================================

// --- 7.1 Account Connection ---

// List all Meta accounts
router.get('/meta/accounts', async (req: Request, res: Response) => {
  try {
    const accounts = await prisma.pctMetaAccount.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: accounts });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// Connect a Meta account (OAuth token or manual token entry)
// In a full OAuth flow, this would receive an authorization code and exchange it
// For now, accepts a manual access token for testing
router.post('/meta/accounts', async (req: Request, res: Response) => {
  try {
    const { name, accessToken, adAccountId } = req.body;
    if (!name || !accessToken) {
      res.status(400).json({ error: { message: 'name and accessToken are required' } });
      return;
    }

    // Verify the token by calling Meta Graph API
    let businessName = null;
    let businessId = null;
    let adAccountName = null;
    let tokenExpiry = null;

    try {
      const meResp = await fetch(`https://graph.facebook.com/v19.0/me?access_token=${accessToken}&fields=id,name`);
      if (meResp.ok) {
        const meData = await meResp.json() as any;
        businessId = meData.id;
        businessName = meData.name;
      }

      if (adAccountId) {
        const adAccountIdNorm = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
        const adAccResp = await fetch(`https://graph.facebook.com/v19.0/${adAccountIdNorm}?access_token=${accessToken}&fields=id,name`);
        if (adAccResp.ok) {
          const adAccData = await adAccResp.json() as any;
          adAccountName = adAccData.name;
        }
      }

      // Get token expiry
      const debugResp = await fetch(`https://graph.facebook.com/v19.0/debug_token?input_token=${accessToken}&access_token=${accessToken}`);
      if (debugResp.ok) {
        const debugData = await debugResp.json() as any;
        if (debugData.data?.expires_at) {
          tokenExpiry = new Date(debugData.data.expires_at * 1000);
        }
      }
    } catch (verifyErr) {
      // Continue even if verification fails - token may still be valid
    }

    const account = await prisma.pctMetaAccount.create({
      data: {
        name,
        accessToken,
        accessTokenExpiry: tokenExpiry,
        adAccountId: adAccountId ? (adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`) : null,
        adAccountName,
        businessId,
        businessName,
      },
    });
    res.status(201).json({ data: account });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// Update Meta account (e.g. refresh token, change ad account)
router.put('/meta/accounts/:id', async (req: Request, res: Response) => {
  try {
    const { name, accessToken, adAccountId } = req.body;
    const account = await prisma.pctMetaAccount.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(accessToken && { accessToken }),
        ...(adAccountId !== undefined && { adAccountId: adAccountId ? (adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`) : null }),
      },
    });
    res.json({ data: account });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// Delete/disconnect Meta account
router.delete('/meta/accounts/:id', async (req: Request, res: Response) => {
  try {
    await prisma.pctMetaAccount.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ data: { success: true } });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// Verify account connection health
router.post('/meta/accounts/:id/verify', async (req: Request, res: Response) => {
  try {
    const account = await prisma.pctMetaAccount.findUnique({ where: { id: req.params.id } });
    if (!account) {
      res.status(404).json({ error: { message: 'Account not found' } });
      return;
    }

    const meResp = await fetch(`https://graph.facebook.com/v19.0/me?access_token=${account.accessToken}&fields=id,name`);
    if (!meResp.ok) {
      const errData = await meResp.json() as any;
      res.json({ data: { valid: false, error: errData.error?.message || 'Invalid token' } });
      return;
    }
    const meData = await meResp.json() as any;

    // Update last sync
    await prisma.pctMetaAccount.update({
      where: { id: req.params.id },
      data: {
        lastSyncAt: new Date(),
        businessId: meData.id,
        businessName: meData.name,
      },
    });

    res.json({ data: { valid: true, userId: meData.id, userName: meData.name } });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// --- 7.2 Campaign Management ---

// Sync campaigns from Meta API
router.post('/meta/accounts/:id/sync-campaigns', async (req: Request, res: Response) => {
  try {
    const account = await prisma.pctMetaAccount.findUnique({ where: { id: req.params.id } });
    if (!account || !account.adAccountId) {
      res.status(400).json({ error: { message: 'Account not found or no ad account configured' } });
      return;
    }

    const campaignResp = await fetch(
      `https://graph.facebook.com/v19.0/${account.adAccountId}/campaigns?access_token=${account.accessToken}&fields=id,name,objective,status,daily_budget,lifetime_budget&limit=50`
    );
    if (!campaignResp.ok) {
      const errData = await campaignResp.json() as any;
      res.status(400).json({ error: { message: errData.error?.message || 'Failed to fetch campaigns' } });
      return;
    }
    const campaignData = await campaignResp.json() as any;
    const campaigns = campaignData.data || [];

    // Upsert campaigns
    const upserted = [];
    for (const c of campaigns) {
      const campaign = await prisma.pctMetaCampaign.upsert({
        where: { metaCampaignId: c.id },
        update: {
          name: c.name,
          objective: c.objective,
          status: c.status,
          budgetCents: c.daily_budget ? Math.round(parseFloat(c.daily_budget)) : (c.lifetime_budget ? Math.round(parseFloat(c.lifetime_budget)) : null),
          budgetType: c.daily_budget ? 'daily' : (c.lifetime_budget ? 'lifetime' : null),
          syncedAt: new Date(),
        },
        create: {
          metaAccountId: account.id,
          metaCampaignId: c.id,
          name: c.name,
          objective: c.objective,
          status: c.status,
          budgetCents: c.daily_budget ? Math.round(parseFloat(c.daily_budget)) : (c.lifetime_budget ? Math.round(parseFloat(c.lifetime_budget)) : null),
          budgetType: c.daily_budget ? 'daily' : (c.lifetime_budget ? 'lifetime' : null),
        },
      });
      upserted.push(campaign);
    }

    await prisma.pctMetaAccount.update({
      where: { id: req.params.id },
      data: { lastSyncAt: new Date() },
    });

    res.json({ data: { synced: upserted.length, campaigns: upserted } });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// List campaigns (from local DB)
router.get('/meta/accounts/:id/campaigns', async (req: Request, res: Response) => {
  try {
    const campaigns = await prisma.pctMetaCampaign.findMany({
      where: { metaAccountId: req.params.id },
      include: { _count: { select: { adSets: true } } },
      orderBy: { syncedAt: 'desc' },
    });
    res.json({ data: campaigns });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// Sync ad sets for a campaign
router.post('/meta/campaigns/:campaignId/sync-adsets', async (req: Request, res: Response) => {
  try {
    const campaign = await prisma.pctMetaCampaign.findUnique({
      where: { id: req.params.campaignId },
      include: { metaAccount: true },
    });
    if (!campaign) {
      res.status(404).json({ error: { message: 'Campaign not found' } });
      return;
    }

    const adSetResp = await fetch(
      `https://graph.facebook.com/v19.0/${campaign.metaCampaignId}/adsets?access_token=${campaign.metaAccount.accessToken}&fields=id,name,status,daily_budget,lifetime_budget,targeting&limit=50`
    );
    if (!adSetResp.ok) {
      const errData = await adSetResp.json() as any;
      res.status(400).json({ error: { message: errData.error?.message || 'Failed to fetch ad sets' } });
      return;
    }
    const adSetData = await adSetResp.json() as any;
    const adSets = adSetData.data || [];

    const upserted = [];
    for (const a of adSets) {
      const adSet = await prisma.pctMetaAdSet.upsert({
        where: { metaAdSetId: a.id },
        update: {
          name: a.name,
          status: a.status,
          targeting: a.targeting || undefined,
          budgetCents: a.daily_budget ? Math.round(parseFloat(a.daily_budget)) : (a.lifetime_budget ? Math.round(parseFloat(a.lifetime_budget)) : null),
          budgetType: a.daily_budget ? 'daily' : (a.lifetime_budget ? 'lifetime' : null),
          syncedAt: new Date(),
        },
        create: {
          campaignId: campaign.id,
          metaAdSetId: a.id,
          name: a.name,
          status: a.status,
          targeting: a.targeting || undefined,
          budgetCents: a.daily_budget ? Math.round(parseFloat(a.daily_budget)) : (a.lifetime_budget ? Math.round(parseFloat(a.lifetime_budget)) : null),
          budgetType: a.daily_budget ? 'daily' : (a.lifetime_budget ? 'lifetime' : null),
        },
      });
      upserted.push(adSet);
    }

    res.json({ data: { synced: upserted.length, adSets: upserted } });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// List ad sets for a campaign
router.get('/meta/campaigns/:campaignId/adsets', async (req: Request, res: Response) => {
  try {
    const adSets = await prisma.pctMetaAdSet.findMany({
      where: { campaignId: req.params.campaignId },
      orderBy: { syncedAt: 'desc' },
    });
    res.json({ data: adSets });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// F7.2.3 - Create campaign via Meta API
router.post('/meta/accounts/:id/campaigns', async (req: Request, res: Response) => {
  try {
    const account = await prisma.pctMetaAccount.findUnique({ where: { id: req.params.id } });
    if (!account || !account.adAccountId) {
      res.status(400).json({ error: { message: 'Account not found or no ad account configured' } });
      return;
    }

    const { name, objective, status, dailyBudgetCents, lifetimeBudgetCents, specialAdCategories } = req.body;
    if (!name || !objective) {
      res.status(400).json({ error: { message: 'name and objective are required' } });
      return;
    }

    const body: Record<string, string> = {
      name,
      objective,
      status: status || 'PAUSED',
      access_token: account.accessToken,
      special_ad_categories: JSON.stringify(specialAdCategories || []),
    };
    if (dailyBudgetCents) body.daily_budget = String(dailyBudgetCents);
    if (lifetimeBudgetCents) body.lifetime_budget = String(lifetimeBudgetCents);

    const resp = await fetch(
      `https://graph.facebook.com/v19.0/${account.adAccountId}/campaigns`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    );
    const data = await resp.json() as any;
    if (!resp.ok) {
      res.status(400).json({ error: { message: data.error?.message || 'Failed to create campaign' } });
      return;
    }

    // Store locally
    const campaign = await prisma.pctMetaCampaign.create({
      data: {
        metaAccountId: account.id,
        metaCampaignId: data.id,
        name,
        objective,
        status: status || 'PAUSED',
        budgetCents: dailyBudgetCents || lifetimeBudgetCents || null,
        budgetType: dailyBudgetCents ? 'daily' : (lifetimeBudgetCents ? 'lifetime' : null),
        syncedAt: new Date(),
      },
    });

    res.status(201).json({ data: campaign });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// F7.2.4 - Create ad set via Meta API
router.post('/meta/campaigns/:campaignId/adsets', async (req: Request, res: Response) => {
  try {
    const campaign = await prisma.pctMetaCampaign.findUnique({
      where: { id: req.params.campaignId },
      include: { metaAccount: true },
    });
    if (!campaign) {
      res.status(404).json({ error: { message: 'Campaign not found' } });
      return;
    }
    const account = campaign.metaAccount;
    if (!account.adAccountId) {
      res.status(400).json({ error: { message: 'Account has no ad account configured' } });
      return;
    }

    const { name, status, dailyBudgetCents, lifetimeBudgetCents, billingEvent, optimizationGoal, targeting, bidAmountCents, startTime, endTime } = req.body;
    if (!name) {
      res.status(400).json({ error: { message: 'name is required' } });
      return;
    }

    const body: Record<string, any> = {
      name,
      campaign_id: campaign.metaCampaignId,
      status: status || 'PAUSED',
      billing_event: billingEvent || 'IMPRESSIONS',
      optimization_goal: optimizationGoal || 'REACH',
      targeting: targeting || { geo_locations: { countries: ['US'] } },
      access_token: account.accessToken,
    };
    if (dailyBudgetCents) body.daily_budget = String(dailyBudgetCents);
    if (lifetimeBudgetCents) { body.lifetime_budget = String(lifetimeBudgetCents); if (endTime) body.end_time = endTime; }
    if (bidAmountCents) body.bid_amount = String(bidAmountCents);
    if (startTime) body.start_time = startTime;

    const resp = await fetch(
      `https://graph.facebook.com/v19.0/${account.adAccountId}/adsets`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    );
    const data = await resp.json() as any;
    if (!resp.ok) {
      res.status(400).json({ error: { message: data.error?.message || 'Failed to create ad set' } });
      return;
    }

    // Store locally
    const adSet = await prisma.pctMetaAdSet.create({
      data: {
        campaignId: campaign.id,
        metaAdSetId: data.id,
        name,
        status: status || 'PAUSED',
        budgetCents: dailyBudgetCents || lifetimeBudgetCents || null,
        budgetType: dailyBudgetCents ? 'daily' : (lifetimeBudgetCents ? 'lifetime' : null),
        targeting: targeting || null,
        syncedAt: new Date(),
      },
    });

    res.status(201).json({ data: adSet });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// --- 7.3 Ad Push ---

// Deploy a batch of generated ads to a Meta ad set
// Rate limited: processes up to 5 per batch with 1.5s delay between calls
router.post('/meta/deploy', async (req: Request, res: Response) => {
  try {
    const { metaAccountId, adSetId, generatedAdIds, headline, bodyText, ctaText, destinationUrl } = req.body;
    if (!metaAccountId || !adSetId || !generatedAdIds || !Array.isArray(generatedAdIds) || generatedAdIds.length === 0) {
      res.status(400).json({ error: { message: 'metaAccountId, adSetId, and generatedAdIds are required' } });
      return;
    }
    if (!destinationUrl) {
      res.status(400).json({ error: { message: 'destinationUrl is required' } });
      return;
    }

    const account = await prisma.pctMetaAccount.findUnique({ where: { id: metaAccountId } });
    if (!account) {
      res.status(404).json({ error: { message: 'Meta account not found' } });
      return;
    }
    const adSet = await prisma.pctMetaAdSet.findUnique({ where: { id: adSetId } });
    if (!adSet) {
      res.status(404).json({ error: { message: 'Ad set not found' } });
      return;
    }

    // Create deployment records in pending state
    const deployments = await Promise.all(generatedAdIds.map(async (adId: string) => {
      // Check if already deployed
      const existing = await prisma.pctAdDeployment.findFirst({
        where: { generatedAdId: adId, metaAccountId, adSetId, status: { in: ['success', 'pushing', 'queued'] } },
      });
      if (existing) return existing;

      return prisma.pctAdDeployment.create({
        data: {
          generatedAdId: adId,
          metaAccountId,
          adSetId,
          headline: headline || null,
          bodyText: bodyText || null,
          ctaText: ctaText || 'SHOP_NOW',
          destinationUrl,
          status: 'queued',
        },
      });
    }));

    // Process deployments asynchronously (rate-limited)
    // Respond immediately with deployment IDs, client polls for status
    const deploymentIds = deployments.map((d: any) => d.id);

    // Fire-and-forget async processing
    processDeploymentQueue(deploymentIds, account, adSet.metaAdSetId).catch(console.error);

    res.json({
      data: {
        queued: deploymentIds.length,
        deploymentIds,
        message: 'Ads queued for deployment. Poll /meta/deployments for status.',
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// Internal async function to process deployment queue with rate limiting
async function processDeploymentQueue(deploymentIds: string[], account: any, metaAdSetId: string) {
  const RATE_LIMIT_DELAY = 1500; // 1.5s between calls (~40 calls/min, well under 200/hour limit)

  for (const deploymentId of deploymentIds) {
    try {
      // Mark as pushing
      await prisma.pctAdDeployment.update({
        where: { id: deploymentId },
        data: { status: 'pushing' },
      });

      const deployment = await prisma.pctAdDeployment.findUnique({
        where: { id: deploymentId },
        include: { generatedAd: true },
      });
      if (!deployment) continue;

      // In a full implementation, this would upload the image to Meta and create the ad
      // For now, we simulate the Meta API call structure
      const adAccountId = account.adAccountId;

      if (!adAccountId) {
        await prisma.pctAdDeployment.update({
          where: { id: deploymentId },
          data: { status: 'failed', errorMessage: 'No ad account configured for this Meta account' },
        });
        continue;
      }

      // Step 1: Upload image to Meta (base64 data URL -> Meta image hash)
      let imageHash: string | null = null;
      try {
        // Extract base64 from data URL
        const imageDataUrl = deployment.generatedAd.imageDataUrl;
        const base64Match = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (base64Match) {
          const mimeType = base64Match[1];
          const base64Data = base64Match[2];

          const formData = new FormData();
          formData.append('bytes', base64Data);
          formData.append('access_token', account.accessToken);

          const imgResp = await fetch(`https://graph.facebook.com/v19.0/${adAccountId}/adimages`, {
            method: 'POST',
            body: formData,
          });

          if (imgResp.ok) {
            const imgData = await imgResp.json() as any;
            // Meta returns image hash keyed by filename
            const hashes = imgData.images;
            if (hashes) {
              const firstKey = Object.keys(hashes)[0];
              imageHash = hashes[firstKey]?.hash;
            }
          }
        }
      } catch (imgErr) {
        // Image upload failed
      }

      if (!imageHash) {
        await prisma.pctAdDeployment.update({
          where: { id: deploymentId },
          data: { status: 'failed', errorMessage: 'Failed to upload image to Meta' },
        });
        await new Promise(r => setTimeout(r, RATE_LIMIT_DELAY));
        continue;
      }

      // Step 2: Create ad creative
      let creativeId: string | null = null;
      try {
        const creativeBody = {
          name: `PCT Ad ${deploymentId.slice(0, 8)}`,
          object_story_spec: {
            link_data: {
              image_hash: imageHash,
              link: deployment.destinationUrl,
              message: deployment.bodyText || '',
              name: deployment.headline || '',
              call_to_action: {
                type: deployment.ctaText || 'SHOP_NOW',
                value: { link: deployment.destinationUrl },
              },
            },
            page_id: account.businessId,
          },
        };

        const creativeResp = await fetch(
          `https://graph.facebook.com/v19.0/${adAccountId}/adcreatives?access_token=${account.accessToken}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(creativeBody),
          }
        );

        if (creativeResp.ok) {
          const creativeData = await creativeResp.json() as any;
          creativeId = creativeData.id;
        } else {
          const errData = await creativeResp.json() as any;
          throw new Error(errData.error?.message || 'Failed to create ad creative');
        }
      } catch (creativeErr: any) {
        await prisma.pctAdDeployment.update({
          where: { id: deploymentId },
          data: { status: 'failed', errorMessage: creativeErr.message },
        });
        await new Promise(r => setTimeout(r, RATE_LIMIT_DELAY));
        continue;
      }

      // Step 3: Create ad in ad set
      try {
        const adBody = {
          name: `PCT Ad ${deploymentId.slice(0, 8)}`,
          adset_id: metaAdSetId,
          creative: { creative_id: creativeId },
          status: 'ACTIVE',
        };

        const adResp = await fetch(
          `https://graph.facebook.com/v19.0/${adAccountId}/ads?access_token=${account.accessToken}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(adBody),
          }
        );

        if (adResp.ok) {
          const adData = await adResp.json() as any;
          await prisma.pctAdDeployment.update({
            where: { id: deploymentId },
            data: {
              status: 'success',
              metaAdId: adData.id,
              pushedAt: new Date(),
              reviewStatus: 'PENDING_REVIEW',
            },
          });
          // Update generated ad status to deployed
          await prisma.pctGeneratedAd.update({
            where: { id: deployment.generatedAdId },
            data: { status: 'deployed' },
          });
        } else {
          const errData = await adResp.json() as any;
          await prisma.pctAdDeployment.update({
            where: { id: deploymentId },
            data: { status: 'failed', errorMessage: errData.error?.message || 'Failed to create ad' },
          });
        }
      } catch (adErr: any) {
        await prisma.pctAdDeployment.update({
          where: { id: deploymentId },
          data: { status: 'failed', errorMessage: adErr.message },
        });
      }
    } catch (err: any) {
      await prisma.pctAdDeployment.update({
        where: { id: deploymentId },
        data: { status: 'failed', errorMessage: err.message },
      }).catch(() => {});
    }

    // Rate limit delay between pushes
    await new Promise(r => setTimeout(r, RATE_LIMIT_DELAY));
  }
}

// List deployments with filtering
router.get('/meta/deployments', async (req: Request, res: Response) => {
  try {
    const { status, metaAccountId, page = '0', limit = '20' } = req.query as any;
    const skip = parseInt(page) * parseInt(limit);

    const where: any = {};
    if (status) where.status = status;
    if (metaAccountId) where.metaAccountId = metaAccountId;

    const [deployments, total] = await Promise.all([
      prisma.pctAdDeployment.findMany({
        where,
        include: {
          generatedAd: {
            include: {
              hook: { select: { id: true, content: true } },
            },
          },
          adSet: { select: { id: true, name: true, metaAdSetId: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.pctAdDeployment.count({ where }),
    ]);

    res.json({ data: deployments, total, page: parseInt(page) });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// Get a single deployment
router.get('/meta/deployments/:id', async (req: Request, res: Response) => {
  try {
    const deployment = await prisma.pctAdDeployment.findUnique({
      where: { id: req.params.id },
      include: {
        generatedAd: { include: { hook: true } },
        adSet: true,
        metaAccount: { select: { id: true, name: true, adAccountId: true } },
      },
    });
    if (!deployment) {
      res.status(404).json({ error: { message: 'Deployment not found' } });
      return;
    }
    res.json({ data: deployment });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// --- 7.4 Ad Status Sync ---

// Sync status for all pending/success deployments from Meta
router.post('/meta/sync-status', async (req: Request, res: Response) => {
  try {
    const { metaAccountId } = req.body;
    const where: any = { status: { in: ['success', 'pushing'] } };
    if (metaAccountId) where.metaAccountId = metaAccountId;

    const deployments = await prisma.pctAdDeployment.findMany({
      where: { ...where, metaAdId: { not: null } },
      include: { metaAccount: true },
    });

    let updated = 0;
    for (const deployment of deployments) {
      try {
        const adResp = await fetch(
          `https://graph.facebook.com/v19.0/${deployment.metaAdId}?access_token=${deployment.metaAccount.accessToken}&fields=id,name,status,review_feedback,preview_shareable_link`
        );
        if (!adResp.ok) continue;
        const adData = await adResp.json() as any;

        let reviewStatus = adData.status;
        let rejectionReason = null;
        if (adData.review_feedback) {
          const feedback = adData.review_feedback;
          if (feedback.global) {
            rejectionReason = Object.values(feedback.global).join(', ');
          }
        }

        await prisma.pctAdDeployment.update({
          where: { id: deployment.id },
          data: {
            reviewStatus,
            rejectionReason,
            livePreviewUrl: adData.preview_shareable_link || null,
            status: adData.status === 'DISAPPROVED' ? 'rejected' : 'success',
          },
        });
        updated++;
      } catch (syncErr) {
        // Skip errors for individual ads
      }
      // Small delay between API calls
      await new Promise(r => setTimeout(r, 200));
    }

    res.json({ data: { synced: updated, total: deployments.length } });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// Get deployment stats for an account
router.get('/meta/stats', async (req: Request, res: Response) => {
  try {
    const { metaAccountId } = req.query as any;
    const where: any = {};
    if (metaAccountId) where.metaAccountId = metaAccountId;

    const [total, pending, queued, pushing, success, failed, rejected] = await Promise.all([
      prisma.pctAdDeployment.count({ where }),
      prisma.pctAdDeployment.count({ where: { ...where, status: 'pending' } }),
      prisma.pctAdDeployment.count({ where: { ...where, status: 'queued' } }),
      prisma.pctAdDeployment.count({ where: { ...where, status: 'pushing' } }),
      prisma.pctAdDeployment.count({ where: { ...where, status: 'success' } }),
      prisma.pctAdDeployment.count({ where: { ...where, status: 'failed' } }),
      prisma.pctAdDeployment.count({ where: { ...where, status: 'rejected' } }),
    ]);

    res.json({ data: { total, pending, queued, pushing, success, failed, rejected } });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// ============================================
// STATS / OVERVIEW
// ============================================

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const [brands, products, usps, angles, hooks, approvedHooks, rejectedHooks, templates, generatedAds, approvedAds, videoScripts, approvedScripts] = await Promise.all([
      prisma.pctBrand.count(),
      prisma.pctProduct.count(),
      prisma.pctUSP.count(),
      prisma.pctMarketingAngle.count(),
      prisma.pctHook.count(),
      prisma.pctHook.count({ where: { status: 'approved' } }),
      prisma.pctHook.count({ where: { status: 'rejected' } }),
      prisma.pctTemplate.count(),
      prisma.pctGeneratedAd.count(),
      prisma.pctGeneratedAd.count({ where: { status: 'approved' } }),
      prisma.pctVideoScript.count(),
      prisma.pctVideoScript.count({ where: { status: 'approved' } }),
    ]);
    res.json({
      data: {
        brands,
        products,
        usps,
        angles,
        totalHooks: hooks,
        approvedHooks,
        rejectedHooks,
        pendingHooks: hooks - approvedHooks - rejectedHooks,
        templates,
        generatedAds,
        approvedAds,
        videoScripts,
        approvedScripts,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// ============================================
// MODULE 8: ANALYTICS & ITERATION
// ============================================

// F8.1.1 - Import / upsert performance metrics for a deployment
router.post('/analytics/metrics', async (req: Request, res: Response) => {
  try {
    const { deploymentId, date, impressions, clicks, spend, reach, ctr, cpc, cpm, conversions, conversionValue, roas, frequency } = req.body;
    if (!deploymentId || !date) {
      res.status(400).json({ error: { message: 'deploymentId and date are required' } });
      return;
    }
    const metric = await prisma.pctPerformanceMetric.upsert({
      where: { deploymentId_date: { deploymentId, date: new Date(date) } },
      update: { impressions: impressions ?? 0, clicks: clicks ?? 0, spend: spend ?? 0, reach: reach ?? 0, ctr, cpc, cpm, conversions: conversions ?? 0, conversionValue, roas, frequency, syncedAt: new Date() },
      create: { deploymentId, date: new Date(date), impressions: impressions ?? 0, clicks: clicks ?? 0, spend: spend ?? 0, reach: reach ?? 0, ctr, cpc, cpm, conversions: conversions ?? 0, conversionValue, roas, frequency },
    });
    res.json({ data: metric });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// F8.1.1 - Bulk import performance metrics
router.post('/analytics/metrics/bulk', async (req: Request, res: Response) => {
  try {
    const { metrics } = req.body;
    if (!Array.isArray(metrics) || metrics.length === 0) {
      res.status(400).json({ error: { message: 'metrics array is required' } });
      return;
    }
    const results = await Promise.allSettled(
      metrics.map(m => prisma.pctPerformanceMetric.upsert({
        where: { deploymentId_date: { deploymentId: m.deploymentId, date: new Date(m.date) } },
        update: { impressions: m.impressions ?? 0, clicks: m.clicks ?? 0, spend: m.spend ?? 0, reach: m.reach ?? 0, ctr: m.ctr, cpc: m.cpc, cpm: m.cpm, conversions: m.conversions ?? 0, conversionValue: m.conversionValue, roas: m.roas, frequency: m.frequency, syncedAt: new Date() },
        create: { deploymentId: m.deploymentId, date: new Date(m.date), impressions: m.impressions ?? 0, clicks: m.clicks ?? 0, spend: m.spend ?? 0, reach: m.reach ?? 0, ctr: m.ctr, cpc: m.cpc, cpm: m.cpm, conversions: m.conversions ?? 0, conversionValue: m.conversionValue, roas: m.roas, frequency: m.frequency },
      }))
    );
    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    res.json({ data: { imported: succeeded, failed } });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// F8.1.2 - Get performance metrics for deployments with optional filters
router.get('/analytics/metrics', async (req: Request, res: Response) => {
  try {
    const { productId, deploymentId, dateFrom, dateTo } = req.query as any;
    const deploymentWhere: any = { status: 'success' };
    if (deploymentId) deploymentWhere.id = deploymentId;
    if (productId) {
      // Filter by product via generatedAd -> hook -> productId
      deploymentWhere.generatedAd = { hook: { productId } };
    }
    const metricWhere: any = { deployment: deploymentWhere };
    if (dateFrom || dateTo) {
      metricWhere.date = {};
      if (dateFrom) metricWhere.date.gte = new Date(dateFrom);
      if (dateTo) metricWhere.date.lte = new Date(dateTo);
    }
    const metrics = await prisma.pctPerformanceMetric.findMany({
      where: metricWhere,
      include: {
        deployment: {
          include: {
            generatedAd: {
              include: {
                hook: { include: { usp: true, angle: true } },
                template: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
      orderBy: { date: 'desc' },
    });
    res.json({ data: metrics });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// F8.1.2-F8.1.4 - Key metrics aggregated by parameter type for insights
router.get('/analytics/insights', async (req: Request, res: Response) => {
  try {
    const { productId, dateFrom, dateTo } = req.query as any;

    const deploymentWhere: any = { status: 'success' };
    if (productId) {
      deploymentWhere.generatedAd = { hook: { productId } };
    }
    const metricWhere: any = { deployment: deploymentWhere };
    if (dateFrom || dateTo) {
      metricWhere.date = {};
      if (dateFrom) metricWhere.date.gte = new Date(dateFrom);
      if (dateTo) metricWhere.date.lte = new Date(dateTo);
    }

    // Fetch all metrics with hook parameter data
    const metrics = await prisma.pctPerformanceMetric.findMany({
      where: metricWhere,
      include: {
        deployment: {
          include: {
            generatedAd: {
              include: {
                hook: { include: { usp: true, angle: true } },
                template: { select: { id: true, name: true, width: true, height: true } },
              },
            },
          },
        },
      },
    });

    // Aggregate by framework
    const byFramework: Record<string, { impressions: number; clicks: number; spend: number; conversions: number; count: number }> = {};
    const byAwareness: Record<number, { impressions: number; clicks: number; spend: number; conversions: number; count: number }> = {};
    const bySophistication: Record<number, { impressions: number; clicks: number; spend: number; conversions: number; count: number }> = {};
    const byUSP: Record<string, { content: string; impressions: number; clicks: number; spend: number; conversions: number; count: number }> = {};
    const byAngle: Record<string, { content: string; impressions: number; clicks: number; spend: number; conversions: number; count: number }> = {};
    const byTemplate: Record<string, { name: string; width: number; height: number; impressions: number; clicks: number; spend: number; conversions: number; count: number }> = {};

    for (const m of metrics) {
      const hook = m.deployment.generatedAd.hook;
      const template = m.deployment.generatedAd.template;

      // By framework
      const fw = hook.messagingFramework;
      if (!byFramework[fw]) byFramework[fw] = { impressions: 0, clicks: 0, spend: 0, conversions: 0, count: 0 };
      byFramework[fw].impressions += m.impressions;
      byFramework[fw].clicks += m.clicks;
      byFramework[fw].spend += m.spend;
      byFramework[fw].conversions += m.conversions;
      byFramework[fw].count++;

      // By awareness
      const aw = hook.awarenessLevel;
      if (!byAwareness[aw]) byAwareness[aw] = { impressions: 0, clicks: 0, spend: 0, conversions: 0, count: 0 };
      byAwareness[aw].impressions += m.impressions;
      byAwareness[aw].clicks += m.clicks;
      byAwareness[aw].spend += m.spend;
      byAwareness[aw].conversions += m.conversions;
      byAwareness[aw].count++;

      // By sophistication
      const so = hook.marketSophistication;
      if (!bySophistication[so]) bySophistication[so] = { impressions: 0, clicks: 0, spend: 0, conversions: 0, count: 0 };
      bySophistication[so].impressions += m.impressions;
      bySophistication[so].clicks += m.clicks;
      bySophistication[so].spend += m.spend;
      bySophistication[so].conversions += m.conversions;
      bySophistication[so].count++;

      // By USP
      if (hook.usp) {
        const uid = hook.usp.id;
        if (!byUSP[uid]) byUSP[uid] = { content: hook.usp.content, impressions: 0, clicks: 0, spend: 0, conversions: 0, count: 0 };
        byUSP[uid].impressions += m.impressions;
        byUSP[uid].clicks += m.clicks;
        byUSP[uid].spend += m.spend;
        byUSP[uid].conversions += m.conversions;
        byUSP[uid].count++;
      }

      // By angle
      if (hook.angle) {
        const aid = hook.angle.id;
        if (!byAngle[aid]) byAngle[aid] = { content: hook.angle.content, impressions: 0, clicks: 0, spend: 0, conversions: 0, count: 0 };
        byAngle[aid].impressions += m.impressions;
        byAngle[aid].clicks += m.clicks;
        byAngle[aid].spend += m.spend;
        byAngle[aid].conversions += m.conversions;
        byAngle[aid].count++;
      }

      // By template
      if (template) {
        const tid = template.id;
        if (!byTemplate[tid]) byTemplate[tid] = { name: template.name, width: template.width, height: template.height, impressions: 0, clicks: 0, spend: 0, conversions: 0, count: 0 };
        byTemplate[tid].impressions += m.impressions;
        byTemplate[tid].clicks += m.clicks;
        byTemplate[tid].spend += m.spend;
        byTemplate[tid].conversions += m.conversions;
        byTemplate[tid].count++;
      }
    }

    // Helper to compute CTR and CPC for aggregates
    const enrich = (obj: any) => {
      const ctr = obj.impressions > 0 ? (obj.clicks / obj.impressions) * 100 : null;
      const cpc = obj.clicks > 0 ? obj.spend / obj.clicks : null;
      const cvr = obj.clicks > 0 ? (obj.conversions / obj.clicks) * 100 : null;
      return { ...obj, ctr, cpc, cvr };
    };

    res.json({
      data: {
        totalMetrics: metrics.length,
        byFramework: Object.entries(byFramework).map(([k, v]) => ({ framework: k, ...enrich(v) })).sort((a, b) => b.impressions - a.impressions),
        byAwareness: Object.entries(byAwareness).map(([k, v]) => ({ level: Number(k), ...enrich(v) })).sort((a, b) => a.level - b.level),
        bySophistication: Object.entries(bySophistication).map(([k, v]) => ({ level: Number(k), ...enrich(v) })).sort((a, b) => a.level - b.level),
        topUSPs: Object.entries(byUSP).map(([k, v]) => ({ id: k, ...enrich(v) })).sort((a, b) => b.impressions - a.impressions).slice(0, 10),
        topAngles: Object.entries(byAngle).map(([k, v]) => ({ id: k, ...enrich(v) })).sort((a, b) => b.impressions - a.impressions).slice(0, 10),
        topTemplates: Object.entries(byTemplate).map(([k, v]) => ({ id: k, ...enrich(v) })).sort((a, b) => b.impressions - a.impressions).slice(0, 10),
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// F8.1.4 - Winner identification: get top performing hooks
router.get('/analytics/winners', async (req: Request, res: Response) => {
  try {
    const { productId, metric = 'ctr', limit = '10' } = req.query as any;

    const deploymentWhere: any = { status: 'success' };
    if (productId) {
      deploymentWhere.generatedAd = { hook: { productId } };
    }

    // Get all hooks that have been deployed with performance data
    const metricsData = await prisma.pctPerformanceMetric.findMany({
      where: { deployment: deploymentWhere },
      include: {
        deployment: {
          include: {
            generatedAd: {
              include: {
                hook: { include: { usp: true, angle: true } },
              },
            },
          },
        },
      },
    });

    // Group by hook
    const byHook: Record<string, { hook: any; impressions: number; clicks: number; spend: number; conversions: number; count: number }> = {};
    for (const m of metricsData) {
      const hook = m.deployment.generatedAd.hook;
      if (!byHook[hook.id]) byHook[hook.id] = { hook, impressions: 0, clicks: 0, spend: 0, conversions: 0, count: 0 };
      byHook[hook.id].impressions += m.impressions;
      byHook[hook.id].clicks += m.clicks;
      byHook[hook.id].spend += m.spend;
      byHook[hook.id].conversions += m.conversions;
      byHook[hook.id].count++;
    }

    const winners = Object.values(byHook).map(h => ({
      hook: { id: h.hook.id, content: h.hook.content, messagingFramework: h.hook.messagingFramework, awarenessLevel: h.hook.awarenessLevel, marketSophistication: h.hook.marketSophistication, usp: h.hook.usp, angle: h.hook.angle },
      impressions: h.impressions,
      clicks: h.clicks,
      spend: h.spend,
      conversions: h.conversions,
      ctr: h.impressions > 0 ? (h.clicks / h.impressions) * 100 : 0,
      cpc: h.clicks > 0 ? h.spend / h.clicks : 0,
      cvr: h.clicks > 0 ? (h.conversions / h.clicks) * 100 : 0,
      adCount: h.count,
    }));

    // Sort by requested metric
    const sortFn: Record<string, (a: any, b: any) => number> = {
      ctr: (a, b) => b.ctr - a.ctr,
      cpc: (a, b) => a.cpc - b.cpc, // lower is better
      cvr: (a, b) => b.cvr - a.cvr,
      impressions: (a, b) => b.impressions - a.impressions,
      clicks: (a, b) => b.clicks - a.clicks,
    };
    winners.sort(sortFn[metric] || sortFn.ctr);

    res.json({ data: winners.slice(0, parseInt(limit)) });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// F8.1.5 - Performance trends over time
router.get('/analytics/trends', async (req: Request, res: Response) => {
  try {
    const { productId, deploymentId, dateFrom, dateTo, groupBy = 'day' } = req.query as any;

    const deploymentWhere: any = { status: 'success' };
    if (deploymentId) deploymentWhere.id = deploymentId;
    if (productId) {
      deploymentWhere.generatedAd = { hook: { productId } };
    }
    const metricWhere: any = { deployment: deploymentWhere };
    if (dateFrom || dateTo) {
      metricWhere.date = {};
      if (dateFrom) metricWhere.date.gte = new Date(dateFrom);
      if (dateTo) metricWhere.date.lte = new Date(dateTo);
    }

    const metrics = await prisma.pctPerformanceMetric.findMany({
      where: metricWhere,
      orderBy: { date: 'asc' },
    });

    // Group by date
    const byDate: Record<string, { impressions: number; clicks: number; spend: number; conversions: number }> = {};
    for (const m of metrics) {
      const key = m.date.toISOString().split('T')[0];
      if (!byDate[key]) byDate[key] = { impressions: 0, clicks: 0, spend: 0, conversions: 0 };
      byDate[key].impressions += m.impressions;
      byDate[key].clicks += m.clicks;
      byDate[key].spend += m.spend;
      byDate[key].conversions += m.conversions;
    }

    const trends = Object.entries(byDate).map(([date, v]) => ({
      date,
      impressions: v.impressions,
      clicks: v.clicks,
      spend: v.spend,
      conversions: v.conversions,
      ctr: v.impressions > 0 ? (v.clicks / v.impressions) * 100 : 0,
      cpc: v.clicks > 0 ? v.spend / v.clicks : 0,
    }));

    res.json({ data: trends });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// F8.2.6 - Export insights as CSV
router.get('/analytics/export', async (req: Request, res: Response) => {
  try {
    const { productId, dateFrom, dateTo } = req.query as any;

    const deploymentWhere: any = { status: 'success' };
    if (productId) {
      deploymentWhere.generatedAd = { hook: { productId } };
    }
    const metricWhere: any = { deployment: deploymentWhere };
    if (dateFrom || dateTo) {
      metricWhere.date = {};
      if (dateFrom) metricWhere.date.gte = new Date(dateFrom);
      if (dateTo) metricWhere.date.lte = new Date(dateTo);
    }

    const metrics = await prisma.pctPerformanceMetric.findMany({
      where: metricWhere,
      include: {
        deployment: {
          include: {
            generatedAd: {
              include: {
                hook: { include: { usp: true, angle: true } },
                template: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    const rows = metrics.map(m => ({
      date: m.date.toISOString().split('T')[0],
      hookContent: m.deployment.generatedAd.hook.content,
      framework: m.deployment.generatedAd.hook.messagingFramework,
      awarenessLevel: m.deployment.generatedAd.hook.awarenessLevel,
      sophistication: m.deployment.generatedAd.hook.marketSophistication,
      usp: m.deployment.generatedAd.hook.usp?.content ?? '',
      angle: m.deployment.generatedAd.hook.angle?.content ?? '',
      template: m.deployment.generatedAd.template?.name ?? '',
      impressions: m.impressions,
      clicks: m.clicks,
      spend: m.spend.toFixed(2),
      ctr: m.ctr ? m.ctr.toFixed(4) : '',
      cpc: m.cpc ? m.cpc.toFixed(2) : '',
      cpm: m.cpm ? m.cpm.toFixed(2) : '',
      conversions: m.conversions,
      roas: m.roas ? m.roas.toFixed(2) : '',
    }));

    const headers = Object.keys(rows[0] || {});
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => JSON.stringify((r as any)[h] ?? '')).join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="pct-insights.csv"');
    res.send(csv);
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// F8.3 - Iteration: create more hooks like a winner
router.post('/analytics/iterate/hooks', async (req: Request, res: Response) => {
  try {
    const { hookId, count = 10, varyParameters = false } = req.body;
    if (!hookId) {
      res.status(400).json({ error: { message: 'hookId is required' } });
      return;
    }

    const sourceHook = await prisma.pctHook.findUnique({
      where: { id: hookId },
      include: { product: { include: { brand: true, voiceOfCustomer: { where: { isGoldNugget: true }, take: 5 } } }, usp: true, angle: true },
    });
    if (!sourceHook) {
      res.status(404).json({ error: { message: 'Hook not found' } });
      return;
    }

    // Generate variations using AI
    const product = sourceHook.product;
    const productContext = {
      name: product.name,
      description: product.description || '',
      features: Array.isArray(product.features) ? (product.features as string[]) : [],
      benefits: Array.isArray(product.benefits) ? (product.benefits as string[]) : [],
      targetAudience: product.targetAudience || '',
      brandVoice: product.brand.voice || '',
    };

    const generated = await generateHooks({
      product: productContext,
      usp: sourceHook.usp?.content || '',
      angle: sourceHook.angle?.content || '',
      messagingFramework: sourceHook.messagingFramework as any,
      awarenessLevel: sourceHook.awarenessLevel,
      marketSophistication: sourceHook.marketSophistication,
      batchSize: Number(count),
      referenceHook: sourceHook.content,
    });

    const created = await Promise.all(
      generated.map(content => prisma.pctHook.create({
        data: {
          productId: product.id,
          uspId: sourceHook.uspId,
          marketingAngleId: sourceHook.marketingAngleId,
          content,
          messagingFramework: sourceHook.messagingFramework,
          awarenessLevel: sourceHook.awarenessLevel,
          marketSophistication: sourceHook.marketSophistication,
          isAiGenerated: true,
          status: 'pending',
          tags: ['iteration', 'from-winner'],
        },
      }))
    );

    // Log iteration
    await prisma.pctIterationHistory.create({
      data: {
        productId: product.id,
        iterationType: 'new_hooks',
        sourceId: hookId,
        sourceType: 'hook',
        parameters: { messagingFramework: sourceHook.messagingFramework, awarenessLevel: sourceHook.awarenessLevel, marketSophistication: sourceHook.marketSophistication },
        generatedCount: created.length,
        notes: `Generated ${created.length} hooks from winning hook`,
      },
    });

    res.json({ data: { created: created.length, hooks: created } });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// F8.3.2 - Expand winning angle: generate more hooks for a specific angle
router.post('/analytics/iterate/angle', async (req: Request, res: Response) => {
  try {
    const { angleId, frameworks, awarenessLevels, sophisticationLevels, count = 20 } = req.body;
    if (!angleId) {
      res.status(400).json({ error: { message: 'angleId is required' } });
      return;
    }

    const angle = await prisma.pctMarketingAngle.findUnique({
      where: { id: angleId },
      include: { usp: { include: { product: { include: { brand: true, voiceOfCustomer: { where: { isGoldNugget: true }, take: 5 } } } } } },
    });
    if (!angle) {
      res.status(404).json({ error: { message: 'Angle not found' } });
      return;
    }

    const product = angle.usp.product;
    const productContext = {
      name: product.name,
      description: product.description || '',
      features: Array.isArray(product.features) ? (product.features as string[]) : [],
      benefits: Array.isArray(product.benefits) ? (product.benefits as string[]) : [],
      targetAudience: product.targetAudience || '',
      brandVoice: product.brand.voice || '',
    };

    const fws = frameworks || ['punchy', 'bold_statements', 'desire_future_states', 'question_based'];
    const als = awarenessLevels || [3, 4];
    const sols = sophisticationLevels || [3];

    const allCreated: any[] = [];

    for (const fw of fws) {
      for (const al of als) {
        for (const sol of sols) {
          const perCombo = Math.max(1, Math.floor(count / (fws.length * als.length * sols.length)));
          const generated = await generateHooks({
            product: productContext,
            usp: angle.usp.content,
            angle: angle.content,
            messagingFramework: fw as any,
            awarenessLevel: al,
            marketSophistication: sol,
            batchSize: perCombo,
          });
          const created = await Promise.all(
            generated.map(content => prisma.pctHook.create({
              data: {
                productId: product.id,
                uspId: angle.usp.id,
                marketingAngleId: angleId,
                content,
                messagingFramework: fw as any,
                awarenessLevel: al,
                marketSophistication: sol,
                isAiGenerated: true,
                status: 'pending',
                tags: ['iteration', 'angle-expansion'],
              },
            }))
          );
          allCreated.push(...created);
        }
      }
    }

    await prisma.pctIterationHistory.create({
      data: {
        productId: product.id,
        iterationType: 'expand_angle',
        sourceId: angleId,
        sourceType: 'angle',
        parameters: { frameworks: fws, awarenessLevels: als, sophisticationLevels: sols },
        generatedCount: allCreated.length,
        notes: `Expanded angle across ${fws.length} frameworks, ${als.length} awareness levels, ${sols.length} sophistication levels`,
      },
    });

    res.json({ data: { created: allCreated.length, hooks: allCreated } });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// F8.3.6 - Get iteration history
router.get('/analytics/iterations', async (req: Request, res: Response) => {
  try {
    const { productId } = req.query as any;
    const where: any = {};
    if (productId) where.productId = productId;

    const iterations = await prisma.pctIterationHistory.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ data: iterations });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// F8.3.4 - Get templates suitable for a winning hook and initiate batch generation
router.post('/analytics/winner-templates', async (req: Request, res: Response) => {
  try {
    const { hookId, productId } = req.body;
    if (!hookId) {
      res.status(400).json({ error: { message: 'hookId is required' } });
      return;
    }

    const hook = await prisma.pctHook.findUnique({ where: { id: hookId } });
    if (!hook) {
      res.status(404).json({ error: { message: 'Hook not found' } });
      return;
    }

    // Get templates for this product
    const templates = await prisma.pctTemplate.findMany({
      where: { isActive: true, ...(productId ? { productId } : {}) },
      orderBy: { createdAt: 'desc' },
    });

    // Check which templates have already been used with this hook
    const existingAds = await prisma.pctGeneratedAd.findMany({
      where: { hookId },
      select: { templateId: true },
    });
    const usedTemplateIds = new Set(existingAds.map(a => a.templateId));

    const templatesWithUsage = templates.map(t => ({
      ...t,
      alreadyUsed: usedTemplateIds.has(t.id),
    }));

    res.json({ data: { hook, templates: templatesWithUsage, usedCount: usedTemplateIds.size } });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// F8.3.5 - A/B test setup: create paired hooks for comparison
router.post('/analytics/ab-test', async (req: Request, res: Response) => {
  try {
    const { productId, hookAId, hookBId, testName, metaAccountId, adSetId } = req.body;
    if (!productId || !hookAId || !hookBId) {
      res.status(400).json({ error: { message: 'productId, hookAId, and hookBId are required' } });
      return;
    }

    const [hookA, hookB] = await Promise.all([
      prisma.pctHook.findUnique({ where: { id: hookAId } }),
      prisma.pctHook.findUnique({ where: { id: hookBId } }),
    ]);

    if (!hookA || !hookB) {
      res.status(404).json({ error: { message: 'One or both hooks not found' } });
      return;
    }

    // Record A/B test in iteration history
    const testRecord = await prisma.pctIterationHistory.create({
      data: {
        productId,
        iterationType: 'ab_test',
        sourceId: hookAId,
        sourceType: 'hook',
        parameters: {
          testName: testName || `A/B Test: ${hookA.content.substring(0, 30)} vs ${hookB.content.substring(0, 30)}`,
          hookAId,
          hookBId,
          hookAContent: hookA.content,
          hookBContent: hookB.content,
          metaAccountId: metaAccountId || null,
          adSetId: adSetId || null,
        },
        generatedCount: 2,
        notes: `A/B test comparing two hooks`,
      },
    });

    res.status(201).json({ data: { test: testRecord, hookA, hookB } });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// ============================================
// MODULE 9: WEBHOOK SYSTEM (F9.1.x)
// ============================================

// In-memory webhook registry (in production, persist to DB)
const webhookRegistry: Map<string, { id: string; url: string; events: string[]; secret: string; active: boolean; createdAt: string; lastTriggered?: string; successCount: number; failCount: number }> = new Map();

const WEBHOOK_EVENTS = [
  'hook.generated', 'hook.approved', 'hook.rejected',
  'ad.generated', 'ad.approved', 'ad.deployed',
  'deployment.success', 'deployment.failed',
  'script.generated', 'usp.generated',
];

// F9.1.1 - Incoming webhook receiver (receive data FROM external systems)
// External systems can POST to /api/pct/incoming/:id to trigger PCT actions
const incomingWebhookLog: Array<{ id: string; receivedAt: string; endpoint: string; payload: any; processed: boolean; result?: string }> = [];

router.post('/incoming/:id', async (req: Request, res: Response) => {
  try {
    const endpointId = req.params.id;
    const payload = req.body;
    const signature = req.headers['x-pct-signature'] as string | undefined;

    // Find if this endpoint ID matches a configured incoming webhook
    // In production, these would be persisted to DB; here we log and process
    const logEntry = {
      id: `inc_${Date.now()}`,
      receivedAt: new Date().toISOString(),
      endpoint: endpointId,
      payload,
      processed: false,
    };

    // Process based on known endpoint patterns
    let result = 'received';
    const action = payload?.action || payload?.type || payload?.event;

    if (action === 'import_voc' && payload?.productId && payload?.quotes) {
      // Incoming VoC from external source (e.g., Make.com automation)
      const quotes = Array.isArray(payload.quotes) ? payload.quotes : [payload.quotes];
      const created: any[] = [];
      for (const q of quotes) {
        const voc = await prisma.pctVoiceOfCustomer.create({
          data: {
            productId: payload.productId,
            content: typeof q === 'string' ? q : q.content,
            source: q.source || payload.source || 'webhook',
            sourceType: 'other',
            sentiment: q.sentiment || 'neutral',
            isGoldNugget: q.isGoldNugget || false,
          },
        });
        created.push(voc);
      }
      result = `imported ${created.length} VoC entries`;
      logEntry.processed = true;
    } else if (action === 'import_metrics' && payload?.deploymentId) {
      // Incoming performance metrics from external analytics
      const m = await prisma.pctPerformanceMetric.create({
        data: {
          deploymentId: payload.deploymentId,
          date: payload.date ? new Date(payload.date) : new Date(),
          impressions: payload.impressions || 0,
          clicks: payload.clicks || 0,
          spend: payload.spend || 0,
          reach: payload.reach || 0,
          ctr: payload.ctr || (payload.clicks && payload.impressions ? payload.clicks / payload.impressions : 0),
          cpc: payload.cpc || (payload.spend && payload.clicks ? payload.spend / payload.clicks : 0),
          cpm: payload.cpm || 0,
          conversions: payload.conversions || 0,
          conversionValue: payload.conversionValue || 0,
          roas: payload.roas || 0,
          frequency: payload.frequency || 0,
        },
      });
      result = `imported metrics for deployment ${payload.deploymentId}`;
      logEntry.processed = true;
    } else {
      // Unknown action - just log it
      result = `logged unrecognized action: ${action || 'none'}`;
      logEntry.processed = true;
    }

    (logEntry as any).result = result;
    incomingWebhookLog.unshift(logEntry);
    // Keep last 200 entries
    if (incomingWebhookLog.length > 200) incomingWebhookLog.splice(200);

    res.json({ data: { received: true, result, logId: logEntry.id } });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// F9.1.1 - List incoming webhook logs
router.get('/incoming/logs', async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;
  res.json({ data: incomingWebhookLog.slice(0, limit) });
});

// F9.1.1 - List outgoing webhook endpoints
router.get('/webhooks', async (req: Request, res: Response) => {
  res.json({ data: Array.from(webhookRegistry.values()), events: WEBHOOK_EVENTS });
});

// F9.1.2 - Create/register a webhook
router.post('/webhooks', async (req: Request, res: Response) => {
  try {
    const { url, events, secret } = req.body;
    if (!url || !Array.isArray(events) || events.length === 0) {
      res.status(400).json({ error: { message: 'url and events array are required' } });
      return;
    }

    const invalidEvents = events.filter((e: string) => !WEBHOOK_EVENTS.includes(e));
    if (invalidEvents.length > 0) {
      res.status(400).json({ error: { message: `Invalid events: ${invalidEvents.join(', ')}. Valid: ${WEBHOOK_EVENTS.join(', ')}` } });
      return;
    }

    const id = `wh_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const webhook = { id, url, events, secret: secret || '', active: true, createdAt: new Date().toISOString(), successCount: 0, failCount: 0 };
    webhookRegistry.set(id, webhook);

    res.status(201).json({ data: webhook });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// F9.1.3 - Update webhook
router.put('/webhooks/:id', async (req: Request, res: Response) => {
  try {
    const webhook = webhookRegistry.get(req.params.id);
    if (!webhook) {
      res.status(404).json({ error: { message: 'Webhook not found' } });
      return;
    }
    const { url, events, secret, active } = req.body;
    if (url) webhook.url = url;
    if (Array.isArray(events)) webhook.events = events;
    if (secret !== undefined) webhook.secret = secret;
    if (active !== undefined) webhook.active = active;
    webhookRegistry.set(req.params.id, webhook);
    res.json({ data: webhook });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// F9.1.4 - Delete webhook
router.delete('/webhooks/:id', async (req: Request, res: Response) => {
  if (!webhookRegistry.has(req.params.id)) {
    res.status(404).json({ error: { message: 'Webhook not found' } });
    return;
  }
  webhookRegistry.delete(req.params.id);
  res.json({ data: { success: true } });
});

// F9.1.x - Test webhook delivery
router.post('/webhooks/:id/test', async (req: Request, res: Response) => {
  try {
    const webhook = webhookRegistry.get(req.params.id);
    if (!webhook) {
      res.status(404).json({ error: { message: 'Webhook not found' } });
      return;
    }

    const payload = { event: 'webhook.test', data: { message: 'Test delivery', timestamp: new Date().toISOString() } };
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (webhook.secret) headers['X-PCT-Signature'] = `sha256=${webhook.secret}`;

    try {
      const resp = await fetch(webhook.url, { method: 'POST', headers, body: JSON.stringify(payload) });
      webhook.lastTriggered = new Date().toISOString();
      if (resp.ok) {
        webhook.successCount++;
        res.json({ data: { success: true, status: resp.status } });
      } else {
        webhook.failCount++;
        res.json({ data: { success: false, status: resp.status, error: `HTTP ${resp.status}` } });
      }
    } catch (fetchErr: any) {
      webhook.failCount++;
      res.json({ data: { success: false, error: fetchErr.message } });
    }
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// Helper: fire webhook events (used internally by other routes)
async function fireWebhookEvent(event: string, data: any) {
  const listeners = Array.from(webhookRegistry.values()).filter(w => w.active && w.events.includes(event));
  for (const webhook of listeners) {
    const payload = { event, data, timestamp: new Date().toISOString() };
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (webhook.secret) headers['X-PCT-Signature'] = `sha256=${webhook.secret}`;
    try {
      const resp = await fetch(webhook.url, { method: 'POST', headers, body: JSON.stringify(payload) });
      webhook.lastTriggered = new Date().toISOString();
      if (resp.ok) webhook.successCount++; else webhook.failCount++;
    } catch {
      webhook.failCount++;
    }
  }
}

// ============================================
// MODULE 9: SCHEDULING SYSTEM (F9.3.x)
// ============================================

// In-memory schedule registry (in production, use a proper job queue/cron)
const scheduleRegistry: Map<string, {
  id: string; type: 'hook_generation' | 'ad_deployment' | 'performance_sync';
  name: string; cronExpression: string; params: any; active: boolean;
  createdAt: string; lastRun?: string; nextRun?: string; runCount: number; lastResult?: string;
}> = new Map();

// F9.3.1/F9.3.4 - List scheduled jobs
router.get('/schedules', async (req: Request, res: Response) => {
  res.json({ data: Array.from(scheduleRegistry.values()) });
});

// F9.3.x - Create a scheduled job
router.post('/schedules', async (req: Request, res: Response) => {
  try {
    const { type, name, cronExpression, params } = req.body;
    const VALID_TYPES = ['hook_generation', 'ad_deployment', 'performance_sync'];
    if (!type || !VALID_TYPES.includes(type)) {
      res.status(400).json({ error: { message: `type must be one of: ${VALID_TYPES.join(', ')}` } });
      return;
    }
    if (!name || !cronExpression) {
      res.status(400).json({ error: { message: 'name and cronExpression are required' } });
      return;
    }

    const id = `sched_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const schedule = { id, type: type as any, name, cronExpression, params: params || {}, active: true, createdAt: new Date().toISOString(), runCount: 0 };
    scheduleRegistry.set(id, schedule);

    res.status(201).json({ data: schedule });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// F9.3.4 - Update/toggle scheduled job
router.put('/schedules/:id', async (req: Request, res: Response) => {
  try {
    const schedule = scheduleRegistry.get(req.params.id);
    if (!schedule) {
      res.status(404).json({ error: { message: 'Schedule not found' } });
      return;
    }
    const { name, cronExpression, params, active } = req.body;
    if (name) schedule.name = name;
    if (cronExpression) schedule.cronExpression = cronExpression;
    if (params) schedule.params = params;
    if (active !== undefined) schedule.active = active;
    scheduleRegistry.set(req.params.id, schedule);
    res.json({ data: schedule });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// F9.3.4 - Delete scheduled job
router.delete('/schedules/:id', async (req: Request, res: Response) => {
  if (!scheduleRegistry.has(req.params.id)) {
    res.status(404).json({ error: { message: 'Schedule not found' } });
    return;
  }
  scheduleRegistry.delete(req.params.id);
  res.json({ data: { success: true } });
});

// F9.3.x - Manually trigger a scheduled job
router.post('/schedules/:id/trigger', async (req: Request, res: Response) => {
  try {
    const schedule = scheduleRegistry.get(req.params.id);
    if (!schedule) {
      res.status(404).json({ error: { message: 'Schedule not found' } });
      return;
    }

    schedule.lastRun = new Date().toISOString();
    schedule.runCount++;
    schedule.lastResult = 'triggered_manually';
    scheduleRegistry.set(req.params.id, schedule);

    // Fire webhook event
    await fireWebhookEvent('schedule.triggered', { scheduleId: schedule.id, type: schedule.type, name: schedule.name });

    res.json({ data: { triggered: true, schedule } });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// ============================================
// USER MANAGEMENT (F10.1.1 - F10.1.3)
// ============================================

router.get('/users', async (req: Request, res: Response) => {
  try {
    const users = await prisma.pctUser.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, email: true, name: true, role: true, workspaceId: true, avatarUrl: true, isActive: true, lastLoginAt: true, createdAt: true },
    });
    res.json({ data: users });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

router.post('/users', async (req: Request, res: Response) => {
  try {
    const { email, name, role, workspaceId } = req.body;
    if (!email || !name) {
      res.status(400).json({ error: { message: 'email and name are required' } });
      return;
    }
    const existing = await prisma.pctUser.findUnique({ where: { email } });
    if (existing) {
      res.status(400).json({ error: { message: 'User with this email already exists' } });
      return;
    }
    const user = await prisma.pctUser.create({
      data: {
        email,
        name,
        passwordHash: '',
        role: role || 'viewer',
        workspaceId: workspaceId || null,
      },
      select: { id: true, email: true, name: true, role: true, workspaceId: true, avatarUrl: true, isActive: true, createdAt: true },
    });
    await prisma.pctActivityLog.create({
      data: { action: 'created_user', entityType: 'user', entityId: user.id, details: { email, name, role } },
    });
    res.status(201).json({ data: user });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

router.put('/users/:id', async (req: Request, res: Response) => {
  try {
    const { role, name, isActive } = req.body;
    const user = await prisma.pctUser.update({
      where: { id: req.params.id },
      data: {
        ...(role !== undefined ? { role } : {}),
        ...(name !== undefined ? { name } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
      select: { id: true, email: true, name: true, role: true, workspaceId: true, isActive: true },
    });
    await prisma.pctActivityLog.create({
      data: { action: 'updated_user', entityType: 'user', entityId: user.id, details: req.body },
    });
    res.json({ data: user });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

router.delete('/users/:id', async (req: Request, res: Response) => {
  try {
    await prisma.pctUser.delete({ where: { id: req.params.id } });
    res.json({ data: { success: true } });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// ============================================
// WORKSPACES (F10.1.3)
// ============================================

router.get('/workspaces', async (req: Request, res: Response) => {
  try {
    const workspaces = await prisma.pctWorkspace.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: workspaces });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

router.post('/workspaces', async (req: Request, res: Response) => {
  try {
    const { name, plan } = req.body;
    if (!name) {
      res.status(400).json({ error: { message: 'name is required' } });
      return;
    }
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now();
    const workspace = await prisma.pctWorkspace.create({
      data: { name, slug, plan: plan || 'free' },
    });
    await prisma.pctActivityLog.create({
      data: { action: 'created_workspace', entityType: 'workspace', entityId: workspace.id, details: { name, plan } },
    });
    res.status(201).json({ data: workspace });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// ============================================
// ACTIVITY LOG (F10.1.4)
// ============================================

router.get('/activity-log', async (req: Request, res: Response) => {
  try {
    const { limit = '50', offset = '0', action, entityType } = req.query as Record<string, string>;
    const where: any = {};
    if (action) where.action = action;
    if (entityType) where.entityType = entityType;

    const [entries, total] = await Promise.all([
      prisma.pctActivityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset),
      }),
      prisma.pctActivityLog.count({ where }),
    ]);
    res.json({ data: entries, total });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

router.post('/activity-log', async (req: Request, res: Response) => {
  try {
    const { action, entityType, entityId, details, userId, userName } = req.body;
    if (!action) {
      res.status(400).json({ error: { message: 'action is required' } });
      return;
    }
    const entry = await prisma.pctActivityLog.create({
      data: { action, entityType, entityId, details, userId, userName },
    });
    res.status(201).json({ data: entry });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

export default router;
