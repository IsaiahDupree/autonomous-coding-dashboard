/**
 * Programmatic Creative Testing API Routes
 * Handles brands, products, VoC, USPs, marketing angles, and hooks
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { generateUSPs, generateAngles, generateHooks, generateVideoScript } from '../services/ai-generation';

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
    const { name, description, voice, values, toneStyle } = req.body;
    if (!name) {
      res.status(400).json({ error: { message: 'Name is required' } });
      return;
    }
    const brand = await prisma.pctBrand.create({
      data: { name, description, voice, values, toneStyle },
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
    const { name, description, voice, values, toneStyle } = req.body;
    const brand = await prisma.pctBrand.update({
      where: { id: req.params.id },
      data: { name, description, voice, values, toneStyle },
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
    const { name, description, features, benefits, targetAudience, pricePoint, category } = req.body;
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
    const usps = await prisma.pctUSP.findMany({
      where: { productId: req.params.productId },
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
    const { hookId, productId, duration, narratorStyle } = req.body;
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

export default router;
