/**
 * Content Factory API Routes
 *
 * Handles product dossiers, AI content generation (images, videos, scripts),
 * content assembly, publishing, testing, and scoring.
 *
 * Route prefix: /api/cf
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  generateScript,
  generateAllScripts,
  generateBeforeImages,
  generateAfterImages,
  generateRevealVideo,
  generateCaptionAndHashtags,
  checkComplianceFlags,
  calculateContentScore,
  calculateStatisticalSignificance,
  pickWinner,
  generateContentBrief,
  generateMoreLikeWinner,
  generateHooksFromWinners,
  predictTrends,
  checkPlatformPolicy,
  getStorageConfig,
  startMetricsSync,
  stopMetricsSync,
  generateVeoVideo,
  generateNanoBananaImage,
  buildBrandedImagePrompt,
  generateVoiceover,
  getTrendingAudios,
  checkCopyrightStatus,
  publishToPlatform,
  promoteTikTokPost,
  fetchTikTokMetrics,
  fetchInstagramMetrics,
  renderWithRemotion,
  shareHookWithPCT,
  importTikTokShopProducts,
  addShoppingTags,
  syncShopifyProducts,
  syncCRMContacts,
  HOOK_LIBRARY,
  CAPTION_PRESETS,
  VEO_TEMPLATES,
  STOCK_FOOTAGE_LIBRARY,
  MUSIC_LIBRARY,
  VOICEOVER_VOICES,
  DossierContext,
  ScoringWeights,
} from '../services/cf-generation';

const router = Router();
const prisma = new PrismaClient();

// ============================================
// Helper: Convert Prisma dossier to DossierContext
// ============================================

function toDossierContext(dossier: any): DossierContext {
  return {
    name: dossier.name,
    benefits: Array.isArray(dossier.benefits) ? dossier.benefits : [],
    painPoints: Array.isArray(dossier.painPoints) ? dossier.painPoints : [],
    proofTypes: Array.isArray(dossier.proofTypes) ? dossier.proofTypes : [],
    targetAudience: dossier.targetAudience || undefined,
    category: dossier.category || undefined,
    niche: dossier.niche || undefined,
    price: dossier.price || undefined,
    tiktokShopUrl: dossier.tiktokShopUrl || undefined,
    affiliateLink: dossier.affiliateLink || undefined,
  };
}

// ============================================
// Helper: Generate slug from name
// ============================================

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ============================================
// DOSSIERS (CF-011, CF-012)
// ============================================

// GET /dossiers - List all with pagination and counts
router.get('/dossiers', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;

    const [dossiers, total] = await Promise.all([
      prisma.cfProductDossier.findMany({
        where,
        include: {
          _count: {
            select: {
              images: true,
              videos: true,
              scripts: true,
              assembledContent: true,
              angleTests: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.cfProductDossier.count({ where }),
    ]);

    res.json({
      data: dossiers,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// POST /dossiers - Create new dossier
router.post('/dossiers', async (req: Request, res: Response) => {
  try {
    const {
      name, tiktokShopUrl, affiliateLink, productPageUrl,
      price, discountPrice, benefits, painPoints, proofTypes,
      targetAudience, category, niche,
    } = req.body;

    if (!name) {
      res.status(400).json({ error: { message: 'Name is required' } });
      return;
    }

    // Auto-generate unique slug
    let baseSlug = slugify(name);
    let slug = baseSlug;
    let counter = 1;
    while (await prisma.cfProductDossier.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter++}`;
    }

    const dossier = await prisma.cfProductDossier.create({
      data: {
        name,
        slug,
        tiktokShopUrl,
        affiliateLink,
        productPageUrl,
        price: price ? parseFloat(price) : null,
        discountPrice: discountPrice ? parseFloat(discountPrice) : null,
        benefits: benefits || [],
        painPoints: painPoints || [],
        proofTypes: proofTypes || [],
        targetAudience,
        category,
        niche,
      },
    });

    res.status(201).json({ data: dossier });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// GET /dossiers/:id - Get dossier with all generated content
router.get('/dossiers/:id', async (req: Request, res: Response) => {
  try {
    const dossier = await prisma.cfProductDossier.findUnique({
      where: { id: req.params.id },
      include: {
        images: { orderBy: { createdAt: 'desc' } },
        videos: { orderBy: { createdAt: 'desc' } },
        scripts: { orderBy: { awarenessLevel: 'asc' } },
        assembledContent: {
          orderBy: { createdAt: 'desc' },
          include: {
            script: true,
            publishedContent: true,
          },
        },
        angleTests: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!dossier) {
      res.status(404).json({ error: { message: 'Dossier not found' } });
      return;
    }

    // Include compliance check
    const compliance = checkComplianceFlags(toDossierContext(dossier));

    res.json({ data: dossier, compliance });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// PUT /dossiers/:id - Update dossier
router.put('/dossiers/:id', async (req: Request, res: Response) => {
  try {
    const existing = await prisma.cfProductDossier.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      res.status(404).json({ error: { message: 'Dossier not found' } });
      return;
    }

    const {
      name, tiktokShopUrl, affiliateLink, productPageUrl,
      price, discountPrice, benefits, painPoints, proofTypes,
      targetAudience, category, niche, status,
    } = req.body;

    const data: any = {};
    if (name !== undefined) data.name = name;
    if (tiktokShopUrl !== undefined) data.tiktokShopUrl = tiktokShopUrl;
    if (affiliateLink !== undefined) data.affiliateLink = affiliateLink;
    if (productPageUrl !== undefined) data.productPageUrl = productPageUrl;
    if (price !== undefined) data.price = price ? parseFloat(price) : null;
    if (discountPrice !== undefined) data.discountPrice = discountPrice ? parseFloat(discountPrice) : null;
    if (benefits !== undefined) data.benefits = benefits;
    if (painPoints !== undefined) data.painPoints = painPoints;
    if (proofTypes !== undefined) data.proofTypes = proofTypes;
    if (targetAudience !== undefined) data.targetAudience = targetAudience;
    if (category !== undefined) data.category = category;
    if (niche !== undefined) data.niche = niche;
    if (status !== undefined) data.status = status;

    const dossier = await prisma.cfProductDossier.update({
      where: { id: req.params.id },
      data,
    });

    res.json({ data: dossier });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// DELETE /dossiers/:id
router.delete('/dossiers/:id', async (req: Request, res: Response) => {
  try {
    await prisma.cfProductDossier.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// ============================================
// GENERATION - Images (CF-014, CF-015, CF-016)
// ============================================

// POST /generate/images - Generate before/after images
router.post('/generate/images', async (req: Request, res: Response) => {
  try {
    const { dossierId, type = 'both', variants = 3 } = req.body;

    if (!dossierId) {
      res.status(400).json({ error: { message: 'dossierId is required' } });
      return;
    }

    const dossier = await prisma.cfProductDossier.findUnique({ where: { id: dossierId } });
    if (!dossier) {
      res.status(404).json({ error: { message: 'Dossier not found' } });
      return;
    }

    const ctx = toDossierContext(dossier);
    const created: any[] = [];

    // Generate before images
    if (type === 'before' || type === 'both') {
      const beforeResults = await generateBeforeImages(ctx, variants);
      for (let i = 0; i < beforeResults.length; i++) {
        const img = await prisma.cfGeneratedImage.create({
          data: {
            dossierId,
            type: 'before',
            variantNumber: i + 1,
            prompt: beforeResults[i].prompt,
            model: 'nano-banana',
            imageUrl: beforeResults[i].imageUrl,
            thumbnailUrl: beforeResults[i].thumbnailUrl,
            status: 'complete',
          },
        });
        created.push(img);
      }
    }

    // Generate after images
    if (type === 'after' || type === 'both') {
      const afterResults = await generateAfterImages(ctx, variants);
      for (let i = 0; i < afterResults.length; i++) {
        const img = await prisma.cfGeneratedImage.create({
          data: {
            dossierId,
            type: 'after',
            variantNumber: i + 1,
            prompt: afterResults[i].prompt,
            model: 'nano-banana',
            imageUrl: afterResults[i].imageUrl,
            thumbnailUrl: afterResults[i].thumbnailUrl,
            status: 'complete',
          },
        });
        created.push(img);
      }
    }

    res.status(201).json({ data: created, count: created.length });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// ============================================
// GENERATION - Videos (CF-018, CF-019)
// ============================================

// POST /generate/videos - Generate video clips
router.post('/generate/videos', async (req: Request, res: Response) => {
  try {
    const { dossierId, sourceImageId, type = 'before_after', durationSeconds = 8, aspectRatio = 'portrait' } = req.body;

    if (!dossierId) {
      res.status(400).json({ error: { message: 'dossierId is required' } });
      return;
    }

    const dossier = await prisma.cfProductDossier.findUnique({ where: { id: dossierId } });
    if (!dossier) {
      res.status(404).json({ error: { message: 'Dossier not found' } });
      return;
    }

    const ctx = toDossierContext(dossier);
    const result = await generateRevealVideo(ctx, sourceImageId);

    const video = await prisma.cfGeneratedVideo.create({
      data: {
        dossierId,
        sourceImageId: sourceImageId || null,
        type,
        prompt: result.prompt,
        model: 'veo-3.1',
        durationSeconds,
        aspectRatio,
        videoUrl: result.videoUrl,
        thumbnailUrl: result.thumbnailUrl,
        status: 'complete',
      },
    });

    res.status(201).json({ data: video });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// ============================================
// GENERATION - Scripts (CF-020 → CF-025)
// ============================================

// POST /generate/scripts - Generate scripts for awareness levels
router.post('/generate/scripts', async (req: Request, res: Response) => {
  try {
    const { dossierId, awarenessLevels = [1, 2, 3, 4, 5], marketSophistication = 3 } = req.body;

    if (!dossierId) {
      res.status(400).json({ error: { message: 'dossierId is required' } });
      return;
    }

    const dossier = await prisma.cfProductDossier.findUnique({ where: { id: dossierId } });
    if (!dossier) {
      res.status(404).json({ error: { message: 'Dossier not found' } });
      return;
    }

    const ctx = toDossierContext(dossier);
    const created: any[] = [];

    for (const level of awarenessLevels) {
      const result = await generateScript(ctx, level, marketSophistication);
      const script = await prisma.cfScript.create({
        data: {
          dossierId,
          awarenessLevel: result.awarenessLevel,
          marketSophistication,
          hook: result.hook,
          body: result.body,
          cta: result.cta,
          fullScript: result.fullScript,
          wordCount: result.wordCount,
          estimatedDurationSeconds: result.estimatedDurationSeconds,
          promptUsed: result.promptUsed,
          model: 'claude-sonnet-4',
        },
      });
      created.push(script);
    }

    res.status(201).json({ data: created, count: created.length });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// ============================================
// GENERATION - Full Pipeline (CF-026)
// ============================================

// POST /generate/all - Full content generation pipeline
router.post('/generate/all', async (req: Request, res: Response) => {
  try {
    const { dossierId, imageVariants = 3, marketSophistication = 3 } = req.body;

    if (!dossierId) {
      res.status(400).json({ error: { message: 'dossierId is required' } });
      return;
    }

    const dossier = await prisma.cfProductDossier.findUnique({ where: { id: dossierId } });
    if (!dossier) {
      res.status(404).json({ error: { message: 'Dossier not found' } });
      return;
    }

    const ctx = toDossierContext(dossier);
    const results: any = { images: [], videos: [], scripts: [] };

    // 1. Generate images (before + after)
    const beforeImages = await generateBeforeImages(ctx, imageVariants);
    const afterImages = await generateAfterImages(ctx, imageVariants);

    for (let i = 0; i < beforeImages.length; i++) {
      const img = await prisma.cfGeneratedImage.create({
        data: {
          dossierId,
          type: 'before',
          variantNumber: i + 1,
          prompt: beforeImages[i].prompt,
          imageUrl: beforeImages[i].imageUrl,
          thumbnailUrl: beforeImages[i].thumbnailUrl,
          status: 'complete',
        },
      });
      results.images.push(img);
    }

    for (let i = 0; i < afterImages.length; i++) {
      const img = await prisma.cfGeneratedImage.create({
        data: {
          dossierId,
          type: 'after',
          variantNumber: i + 1,
          prompt: afterImages[i].prompt,
          imageUrl: afterImages[i].imageUrl,
          thumbnailUrl: afterImages[i].thumbnailUrl,
          status: 'complete',
        },
      });
      results.images.push(img);
    }

    // 2. Generate video from first before image
    const videoResult = await generateRevealVideo(ctx);
    const video = await prisma.cfGeneratedVideo.create({
      data: {
        dossierId,
        type: 'before_after',
        prompt: videoResult.prompt,
        videoUrl: videoResult.videoUrl,
        thumbnailUrl: videoResult.thumbnailUrl,
        status: 'complete',
      },
    });
    results.videos.push(video);

    // 3. Generate all 5 awareness-level scripts
    for (let level = 1; level <= 5; level++) {
      const scriptResult = await generateScript(ctx, level, marketSophistication);
      const script = await prisma.cfScript.create({
        data: {
          dossierId,
          awarenessLevel: scriptResult.awarenessLevel,
          marketSophistication,
          hook: scriptResult.hook,
          body: scriptResult.body,
          cta: scriptResult.cta,
          fullScript: scriptResult.fullScript,
          wordCount: scriptResult.wordCount,
          estimatedDurationSeconds: scriptResult.estimatedDurationSeconds,
          promptUsed: scriptResult.promptUsed,
          model: 'claude-sonnet-4',
        },
      });
      results.scripts.push(script);
    }

    res.status(201).json({
      data: results,
      summary: {
        images: results.images.length,
        videos: results.videos.length,
        scripts: results.scripts.length,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// ============================================
// ASSEMBLY (CF-033, CF-034, CF-035, CF-036, CF-037)
// ============================================

// POST /assemble - Create assembled content
router.post('/assemble', async (req: Request, res: Response) => {
  try {
    const {
      dossierId, scriptId, videoIds = [], imageIds = [],
      title, targetPlatform = 'tiktok',
    } = req.body;

    if (!dossierId) {
      res.status(400).json({ error: { message: 'dossierId is required' } });
      return;
    }

    const dossier = await prisma.cfProductDossier.findUnique({ where: { id: dossierId } });
    if (!dossier) {
      res.status(404).json({ error: { message: 'Dossier not found' } });
      return;
    }

    const ctx = toDossierContext(dossier);

    // Get script for caption generation
    let caption = '';
    let hashtags: string[] = [];
    let scriptHook = '';

    if (scriptId) {
      const script = await prisma.cfScript.findUnique({ where: { id: scriptId } });
      if (script) {
        scriptHook = script.hook;
        // Generate caption and hashtags from script
        try {
          const captionResult = await generateCaptionAndHashtags(ctx, scriptHook, targetPlatform);
          caption = captionResult.caption;
          hashtags = captionResult.hashtags;
        } catch {
          caption = scriptHook;
          hashtags = [];
        }
      }
    }

    // Check compliance
    const compliance = checkComplianceFlags(ctx);

    const assembled = await prisma.cfAssembledContent.create({
      data: {
        dossierId,
        scriptId: scriptId || null,
        videoIds,
        imageIds,
        title: title || `${dossier.name} - Content`,
        caption,
        hashtags,
        targetPlatform,
        hasDisclosure: compliance.needsDisclosure,
        disclosureType: compliance.disclosureType as any,
        status: 'draft',
      },
      include: { script: true },
    });

    res.status(201).json({
      data: assembled,
      compliance,
    });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// GET /content/:id/preview - Preview assembled content
router.get('/content/:id/preview', async (req: Request, res: Response) => {
  try {
    const content = await prisma.cfAssembledContent.findUnique({
      where: { id: req.params.id },
      include: {
        dossier: true,
        script: true,
      },
    });

    if (!content) {
      res.status(404).json({ error: { message: 'Content not found' } });
      return;
    }

    // Fetch associated images and videos
    const imageIds = Array.isArray(content.imageIds) ? content.imageIds as string[] : [];
    const videoIds = Array.isArray(content.videoIds) ? content.videoIds as string[] : [];

    const [images, videos] = await Promise.all([
      imageIds.length > 0
        ? prisma.cfGeneratedImage.findMany({ where: { id: { in: imageIds } } })
        : [],
      videoIds.length > 0
        ? prisma.cfGeneratedVideo.findMany({ where: { id: { in: videoIds } } })
        : [],
    ]);

    res.json({
      data: {
        ...content,
        images,
        videos,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// ============================================
// PUBLISHING (CF-041, CF-044)
// ============================================

// POST /publish - Publish to platform (mock)
router.post('/publish', async (req: Request, res: Response) => {
  try {
    const { contentId, platform = 'tiktok' } = req.body;

    if (!contentId) {
      res.status(400).json({ error: { message: 'contentId is required' } });
      return;
    }

    const content = await prisma.cfAssembledContent.findUnique({
      where: { id: contentId },
    });

    if (!content) {
      res.status(404).json({ error: { message: 'Content not found' } });
      return;
    }

    // Mock: In production, this calls TikTok/Instagram API
    const mockPostId = `mock_${platform}_${Date.now()}`;
    const mockUrl = platform === 'tiktok'
      ? `https://www.tiktok.com/@user/video/${mockPostId}`
      : `https://www.instagram.com/reel/${mockPostId}`;

    const published = await prisma.cfPublishedContent.create({
      data: {
        contentId,
        platform,
        platformPostId: mockPostId,
        postUrl: mockUrl,
        status: 'published',
      },
    });

    // Update assembled content status
    await prisma.cfAssembledContent.update({
      where: { id: contentId },
      data: { status: 'published' },
    });

    res.status(201).json({ data: published });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// POST /promote - Start $5 promotion test (mock)
router.post('/promote', async (req: Request, res: Response) => {
  try {
    const { publishedId, budgetCents = 500, durationHours = 24 } = req.body;

    if (!publishedId) {
      res.status(400).json({ error: { message: 'publishedId is required' } });
      return;
    }

    const published = await prisma.cfPublishedContent.findUnique({
      where: { id: publishedId },
    });

    if (!published) {
      res.status(404).json({ error: { message: 'Published content not found' } });
      return;
    }

    const now = new Date();
    const endAt = new Date(now.getTime() + durationHours * 60 * 60 * 1000);

    const updated = await prisma.cfPublishedContent.update({
      where: { id: publishedId },
      data: {
        promoted: true,
        promoteBudgetCents: budgetCents,
        promoteStartAt: now,
        promoteEndAt: endAt,
        status: 'promoted',
      },
    });

    res.json({ data: updated });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// ============================================
// METRICS (CF-047)
// ============================================

// GET /metrics/:publishedId - Get performance metrics
router.get('/metrics/:publishedId', async (req: Request, res: Response) => {
  try {
    const metrics = await prisma.cfPerformanceMetric.findMany({
      where: { publishedId: req.params.publishedId },
      orderBy: { date: 'desc' },
    });

    // Calculate aggregate totals
    const totals = metrics.reduce(
      (acc, m) => ({
        views: acc.views + m.views,
        likes: acc.likes + m.likes,
        comments: acc.comments + m.comments,
        shares: acc.shares + m.shares,
        saves: acc.saves + m.saves,
        linkClicks: acc.linkClicks + m.linkClicks,
        purchases: acc.purchases + m.purchases,
        spendCents: acc.spendCents + m.spendCents,
        reach: acc.reach + m.reach,
      }),
      { views: 0, likes: 0, comments: 0, shares: 0, saves: 0, linkClicks: 0, purchases: 0, spendCents: 0, reach: 0 }
    );

    res.json({ data: metrics, totals });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// ============================================
// TESTING (CF-048 → CF-052)
// ============================================

// POST /tests - Create angle test
router.post('/tests', async (req: Request, res: Response) => {
  try {
    const {
      dossierId, name, hypothesis,
      awarenessLevel, hookType, visualStyle,
      budgetPerVariantCents = 500, variantIds = [],
    } = req.body;

    if (!dossierId || !name) {
      res.status(400).json({ error: { message: 'dossierId and name are required' } });
      return;
    }

    const totalBudgetCents = budgetPerVariantCents * (variantIds.length || 1);

    const test = await prisma.cfAngleTest.create({
      data: {
        dossierId,
        name,
        hypothesis,
        awarenessLevel,
        hookType,
        visualStyle,
        budgetPerVariantCents,
        totalBudgetCents,
        variantIds,
        status: 'draft',
      },
    });

    res.status(201).json({ data: test });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// GET /tests/:id - Get test results with scoring
router.get('/tests/:id', async (req: Request, res: Response) => {
  try {
    const test = await prisma.cfAngleTest.findUnique({
      where: { id: req.params.id },
      include: { dossier: true },
    });

    if (!test) {
      res.status(404).json({ error: { message: 'Test not found' } });
      return;
    }

    // Get scoring config
    const config = await prisma.cfScoringConfig.findFirst({
      where: { isDefault: true },
    });

    const defaultWeights: ScoringWeights = config || {
      holdRateWeight: 0.3,
      watchTimeWeight: 0.25,
      engagementWeight: 0.2,
      clickRateWeight: 0.15,
      conversionWeight: 0.1,
      minViewsForValid: 100,
      minSpendCentsForValid: 300,
    };

    // Get variant metrics if test has variants
    const vIds = Array.isArray(test.variantIds) ? test.variantIds as string[] : [];
    let variantData: any[] = [];

    if (vIds.length > 0) {
      const variants = await prisma.cfPublishedContent.findMany({
        where: { id: { in: vIds } },
        include: {
          metrics: true,
          content: { include: { script: true } },
        },
      });

      variantData = variants.map(v => {
        const latestMetrics = v.metrics[v.metrics.length - 1];
        const init = { views: 0, likes: 0, comments: 0, shares: 0, saves: 0, linkClicks: 0, purchases: 0, spendCents: 0, reach: 0, avgWatchPct: null as number | null };
        const totalMetrics = v.metrics.reduce(
          (acc, m) => ({
            views: acc.views + m.views,
            likes: acc.likes + m.likes,
            comments: acc.comments + m.comments,
            shares: acc.shares + m.shares,
            saves: acc.saves + m.saves,
            linkClicks: acc.linkClicks + m.linkClicks,
            purchases: acc.purchases + m.purchases,
            spendCents: acc.spendCents + m.spendCents,
            reach: acc.reach + m.reach,
            avgWatchPct: latestMetrics?.avgWatchPct || null,
          }),
          init,
        );

        const score = calculateContentScore(totalMetrics, defaultWeights);

        return {
          id: v.id,
          platform: v.platform,
          postUrl: v.postUrl,
          script: v.content?.script,
          metrics: totalMetrics,
          score,
        };
      });

      variantData.sort((a: any, b: any) => b.score - a.score);
    }

    res.json({
      data: test,
      variants: variantData,
      scoringConfig: defaultWeights,
    });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// POST /tests/:id/pick-winner - Score and pick winner
router.post('/tests/:id/pick-winner', async (req: Request, res: Response) => {
  try {
    const test = await prisma.cfAngleTest.findUnique({
      where: { id: req.params.id },
    });

    if (!test) {
      res.status(404).json({ error: { message: 'Test not found' } });
      return;
    }

    const config = await prisma.cfScoringConfig.findFirst({
      where: { isDefault: true },
    });

    const weights: ScoringWeights = config || {
      holdRateWeight: 0.3,
      watchTimeWeight: 0.25,
      engagementWeight: 0.2,
      clickRateWeight: 0.15,
      conversionWeight: 0.1,
      minViewsForValid: 100,
      minSpendCentsForValid: 300,
    };

    // Aggregate metrics per variant
    const vIds = Array.isArray(test.variantIds) ? test.variantIds as string[] : [];
    const variants = await prisma.cfPublishedContent.findMany({
      where: { id: { in: vIds } },
      include: { metrics: true },
    });

    const variantMetrics = variants.map(v => {
      const latest = v.metrics[v.metrics.length - 1];
      const init2 = { views: 0, likes: 0, comments: 0, shares: 0, saves: 0, linkClicks: 0, purchases: 0, spendCents: 0, reach: 0, avgWatchPct: null as number | null };
      const total = v.metrics.reduce(
        (acc, m) => ({
          views: acc.views + m.views,
          likes: acc.likes + m.likes,
          comments: acc.comments + m.comments,
          shares: acc.shares + m.shares,
          saves: acc.saves + m.saves,
          linkClicks: acc.linkClicks + m.linkClicks,
          purchases: acc.purchases + m.purchases,
          spendCents: acc.spendCents + m.spendCents,
          reach: acc.reach + m.reach,
          avgWatchPct: latest?.avgWatchPct || null,
        }),
        init2,
      );
      return { id: v.id, metrics: total };
    });

    const result = pickWinner(variantMetrics, weights);

    const updated = await prisma.cfAngleTest.update({
      where: { id: req.params.id },
      data: {
        winnerId: result.winnerId,
        winnerReason: result.reason,
        status: 'completed',
        completedAt: new Date(),
      },
    });

    res.json({ data: updated, scores: result.scores });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// ============================================
// STATS - Dashboard summary
// ============================================

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const [
      dossierCount,
      imageCount,
      videoCount,
      scriptCount,
      assembledCount,
      publishedCount,
      testCount,
    ] = await Promise.all([
      prisma.cfProductDossier.count(),
      prisma.cfGeneratedImage.count(),
      prisma.cfGeneratedVideo.count(),
      prisma.cfScript.count(),
      prisma.cfAssembledContent.count(),
      prisma.cfPublishedContent.count(),
      prisma.cfAngleTest.count(),
    ]);

    res.json({
      data: {
        dossiers: dossierCount,
        images: imageCount,
        videos: videoCount,
        scripts: scriptCount,
        assembled: assembledCount,
        published: publishedCount,
        tests: testCount,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// ============================================
// SCORING CONFIG
// ============================================

// GET /scoring-config - Get all scoring configs
router.get('/scoring-config', async (req: Request, res: Response) => {
  try {
    const configs = await prisma.cfScoringConfig.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: configs });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// POST /scoring-config - Create scoring config
router.post('/scoring-config', async (req: Request, res: Response) => {
  try {
    const {
      name, holdRateWeight, watchTimeWeight, engagementWeight,
      clickRateWeight, conversionWeight, minViewsForValid,
      minSpendCentsForValid, isDefault,
    } = req.body;

    if (!name) {
      res.status(400).json({ error: { message: 'Name is required' } });
      return;
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.cfScoringConfig.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const config = await prisma.cfScoringConfig.create({
      data: {
        name,
        holdRateWeight: holdRateWeight ?? 0.3,
        watchTimeWeight: watchTimeWeight ?? 0.25,
        engagementWeight: engagementWeight ?? 0.2,
        clickRateWeight: clickRateWeight ?? 0.15,
        conversionWeight: conversionWeight ?? 0.1,
        minViewsForValid: minViewsForValid ?? 100,
        minSpendCentsForValid: minSpendCentsForValid ?? 300,
        isDefault: isDefault ?? false,
      },
    });

    res.status(201).json({ data: config });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// ============================================
// HOOKS LIBRARY (CF-084, CF-085, CF-086)
// ============================================

router.get('/hooks', (req: Request, res: Response) => {
  const level = req.query.level ? parseInt(req.query.level as string) : undefined;
  const category = req.query.category as string;

  let hooks = [...HOOK_LIBRARY];
  if (level) hooks = hooks.filter(h => h.awarenessLevel === level);
  if (category) hooks = hooks.filter(h => h.category === category);

  hooks.sort((a, b) => b.avgPerformanceScore - a.avgPerformanceScore);

  const categories = [...new Set(HOOK_LIBRARY.map(h => h.category))];

  res.json({ data: hooks, categories });
});

// ============================================
// CAPTION PRESETS (CF-088)
// ============================================

router.get('/caption-presets', (req: Request, res: Response) => {
  const platform = req.query.platform as string;
  let presets = [...CAPTION_PRESETS];
  if (platform) presets = presets.filter(p => p.platform === platform);
  res.json({ data: presets });
});

// ============================================
// STATISTICAL SIGNIFICANCE (CF-095)
// ============================================

router.post('/stats/significance', (req: Request, res: Response) => {
  const { controlViews, controlConversions, variantViews, variantConversions } = req.body;
  const result = calculateStatisticalSignificance(
    controlViews || 0, controlConversions || 0,
    variantViews || 0, variantConversions || 0
  );
  res.json({ data: result });
});

// ============================================
// CONTENT BRIEF (CF-105)
// ============================================

router.post('/content-brief', async (req: Request, res: Response) => {
  try {
    const { dossierId } = req.body;
    if (!dossierId) {
      res.status(400).json({ error: { message: 'dossierId is required' } });
      return;
    }

    const dossier = await prisma.cfProductDossier.findUnique({ where: { id: dossierId } });
    if (!dossier) {
      res.status(404).json({ error: { message: 'Dossier not found' } });
      return;
    }

    const brief = await generateContentBrief(toDossierContext(dossier));
    res.json({ data: brief });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// ============================================
// POLICY CHECK (CF-108)
// ============================================

router.post('/policy-check', async (req: Request, res: Response) => {
  try {
    const { caption = '', hashtags = [], platform = 'tiktok', dossierId } = req.body;

    let dossierCtx: DossierContext = { name: '', benefits: [], painPoints: [], proofTypes: [] };
    if (dossierId) {
      const dossier = await prisma.cfProductDossier.findUnique({ where: { id: dossierId } });
      if (dossier) dossierCtx = toDossierContext(dossier);
    }

    const result = checkPlatformPolicy(caption, hashtags, platform, dossierCtx);
    res.json({ data: result });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// ============================================
// EXPORT PRESETS (CF-110, CF-111)
// ============================================

router.get('/export-presets', (req: Request, res: Response) => {
  const presets = [
    { id: 'tiktok-standard', platform: 'tiktok', name: 'TikTok Standard', resolution: '1080x1920', fps: 30, codec: 'h264', bitrate: '6M', aspectRatio: '9:16' },
    { id: 'tiktok-hd', platform: 'tiktok', name: 'TikTok HD', resolution: '1080x1920', fps: 60, codec: 'h265', bitrate: '10M', aspectRatio: '9:16' },
    { id: 'ig-reels', platform: 'instagram', name: 'IG Reels', resolution: '1080x1920', fps: 30, codec: 'h264', bitrate: '5M', aspectRatio: '9:16' },
    { id: 'ig-feed', platform: 'instagram', name: 'IG Feed', resolution: '1080x1080', fps: 30, codec: 'h264', bitrate: '5M', aspectRatio: '1:1' },
    { id: 'ig-story', platform: 'instagram', name: 'IG Story', resolution: '1080x1920', fps: 30, codec: 'h264', bitrate: '5M', aspectRatio: '9:16' },
    { id: 'fb-reels', platform: 'facebook', name: 'FB Reels', resolution: '1080x1920', fps: 30, codec: 'h264', bitrate: '5M', aspectRatio: '9:16' },
    { id: 'fb-feed', platform: 'facebook', name: 'FB Feed', resolution: '1280x720', fps: 30, codec: 'h264', bitrate: '4M', aspectRatio: '16:9' },
  ];

  const platform = req.query.platform as string;
  const filtered = platform ? presets.filter(p => p.platform === platform) : presets;

  res.json({ data: filtered });
});

// ============================================
// CF-055: More Like Winner Generation
// ============================================

router.post('/generate/more-like-winner', async (req: Request, res: Response) => {
  try {
    const { dossierId, winnerScriptId, count = 3 } = req.body;

    if (!dossierId || !winnerScriptId) {
      res.status(400).json({ error: { message: 'dossierId and winnerScriptId are required' } });
      return;
    }

    const [dossier, script] = await Promise.all([
      prisma.cfProductDossier.findUnique({ where: { id: dossierId } }),
      prisma.cfScript.findUnique({ where: { id: winnerScriptId } }),
    ]);

    if (!dossier || !script) {
      res.status(404).json({ error: { message: 'Dossier or script not found' } });
      return;
    }

    const ctx = toDossierContext(dossier);
    const results = await generateMoreLikeWinner(ctx, {
      hook: script.hook,
      body: script.body,
      cta: script.cta,
      awarenessLevel: script.awarenessLevel,
    }, count);

    // Save generated scripts
    const created = [];
    for (const r of results) {
      const saved = await prisma.cfScript.create({
        data: {
          dossierId,
          awarenessLevel: r.awarenessLevel,
          hook: r.hook,
          body: r.body,
          cta: r.cta,
          fullScript: r.fullScript,
          wordCount: r.wordCount,
          estimatedDurationSeconds: r.estimatedDurationSeconds,
          promptUsed: r.promptUsed,
          model: 'claude-sonnet-4',
        },
      });
      created.push(saved);
    }

    res.status(201).json({ data: created });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// ============================================
// CF-067: Veo Prompt Template Library
// ============================================

router.get('/veo-templates', (req: Request, res: Response) => {
  const category = req.query.category as string;
  let templates = [...VEO_TEMPLATES];
  if (category) templates = templates.filter(t => t.category === category);
  const categories = [...new Set(VEO_TEMPLATES.map(t => t.category))];
  res.json({ data: templates, categories });
});

// ============================================
// CF-086: AI Hook Generation from Winners
// ============================================

router.post('/generate/hooks', async (req: Request, res: Response) => {
  try {
    const { dossierId, winningHooks = [], targetLevel = 1, count = 5 } = req.body;

    if (!dossierId) {
      res.status(400).json({ error: { message: 'dossierId is required' } });
      return;
    }

    const dossier = await prisma.cfProductDossier.findUnique({ where: { id: dossierId } });
    if (!dossier) {
      res.status(404).json({ error: { message: 'Dossier not found' } });
      return;
    }

    const ctx = toDossierContext(dossier);
    const hooks = await generateHooksFromWinners(ctx, winningHooks, targetLevel, count);
    res.json({ data: hooks });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// ============================================
// CF-107: AI Trend Prediction
// ============================================

router.post('/predict-trends', async (req: Request, res: Response) => {
  try {
    const { category = 'general', niche = 'general' } = req.body;
    const trends = await predictTrends(category, niche);
    res.json({ data: trends });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// ============================================
// CF-056: Angle Performance Analytics
// ============================================

router.get('/analytics/angles', async (req: Request, res: Response) => {
  try {
    const tests = await prisma.cfAngleTest.findMany({
      where: { status: 'completed' },
      include: { dossier: true },
    });

    // Aggregate by awareness level
    const levelStats: Record<number, { total: number; winners: number; avgBudget: number }> = {};
    for (let i = 1; i <= 5; i++) {
      levelStats[i] = { total: 0, winners: 0, avgBudget: 0 };
    }

    tests.forEach(t => {
      if (t.awarenessLevel && levelStats[t.awarenessLevel]) {
        levelStats[t.awarenessLevel].total++;
        if (t.winnerId) levelStats[t.awarenessLevel].winners++;
      }
    });

    res.json({ data: { tests: tests.length, byLevel: levelStats } });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// ============================================
// CF-098: Content Attribution to Sales
// ============================================

router.get('/analytics/attribution', async (req: Request, res: Response) => {
  try {
    const published = await prisma.cfPublishedContent.findMany({
      include: { metrics: true, content: { include: { dossier: true } } },
    });

    const attribution = published.map(p => {
      const totalMetrics = p.metrics.reduce(
        (acc, m) => ({
          views: acc.views + m.views,
          clicks: acc.clicks + m.linkClicks,
          purchases: acc.purchases + m.purchases,
          revenue: acc.revenue + (m.purchases * ((p.content?.dossier?.price as number) || 0)),
          spend: acc.spend + m.spendCents / 100,
        }),
        { views: 0, clicks: 0, purchases: 0, revenue: 0, spend: 0 }
      );

      return {
        id: p.id,
        platform: p.platform,
        dossierName: p.content?.dossier?.name || 'Unknown',
        ...totalMetrics,
        roas: totalMetrics.spend > 0 ? totalMetrics.revenue / totalMetrics.spend : 0,
      };
    });

    res.json({ data: attribution });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// ============================================
// CF-099: Audience Insights
// ============================================

router.get('/analytics/audience', async (req: Request, res: Response) => {
  try {
    // Mock audience data - in production comes from platform APIs
    const insights = {
      topAgeGroups: ['18-24', '25-34', '35-44'],
      topGenders: ['female', 'male'],
      peakHours: [9, 12, 18, 21],
      topLocations: ['US', 'UK', 'CA'],
      engagementByDay: {
        Mon: 0.65, Tue: 0.72, Wed: 0.68, Thu: 0.75, Fri: 0.80, Sat: 0.85, Sun: 0.78,
      },
    };
    res.json({ data: insights });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// ============================================
// CF-117: Weekly Performance Report
// ============================================

router.get('/report/weekly', async (req: Request, res: Response) => {
  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [newContent, newPublished, newTests] = await Promise.all([
      prisma.cfAssembledContent.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.cfPublishedContent.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.cfAngleTest.count({ where: { createdAt: { gte: weekAgo } } }),
    ]);

    const completedTests = await prisma.cfAngleTest.count({
      where: { completedAt: { gte: weekAgo }, status: 'completed' },
    });

    res.json({
      data: {
        period: { from: weekAgo.toISOString(), to: new Date().toISOString() },
        contentCreated: newContent,
        contentPublished: newPublished,
        testsStarted: newTests,
        testsCompleted: completedTests,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// ============================================
// CF-118: ROI Dashboard
// ============================================

router.get('/analytics/roi', async (req: Request, res: Response) => {
  try {
    const published = await prisma.cfPublishedContent.findMany({
      include: {
        metrics: true,
        content: { include: { dossier: true } },
      },
    });

    let totalSpend = 0;
    let totalRevenue = 0;
    let totalPurchases = 0;
    let totalViews = 0;

    published.forEach(p => {
      const price = (p.content?.dossier?.price as number) || 0;
      p.metrics.forEach(m => {
        totalSpend += m.spendCents / 100;
        totalPurchases += m.purchases;
        totalRevenue += m.purchases * price;
        totalViews += m.views;
      });
    });

    res.json({
      data: {
        totalSpend,
        totalRevenue,
        totalPurchases,
        totalViews,
        roas: totalSpend > 0 ? totalRevenue / totalSpend : 0,
        cpa: totalPurchases > 0 ? totalSpend / totalPurchases : 0,
        cpm: totalViews > 0 ? (totalSpend / totalViews) * 1000 : 0,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// ============================================
// CF-120: Automatic Asset Cleanup
// ============================================

router.post('/assets/cleanup', async (req: Request, res: Response) => {
  try {
    const { olderThanDays = 90, dryRun = true } = req.body;
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

    // Find old unused images
    const oldImages = await prisma.cfGeneratedImage.findMany({
      where: { createdAt: { lt: cutoff } },
      select: { id: true, createdAt: true },
    });

    const oldVideos = await prisma.cfGeneratedVideo.findMany({
      where: { createdAt: { lt: cutoff } },
      select: { id: true, createdAt: true },
    });

    if (!dryRun) {
      // In production, also delete from R2/S3
      await prisma.cfGeneratedImage.deleteMany({ where: { createdAt: { lt: cutoff } } });
      await prisma.cfGeneratedVideo.deleteMany({ where: { createdAt: { lt: cutoff } } });
    }

    res.json({
      data: {
        dryRun,
        imagesFound: oldImages.length,
        videosFound: oldVideos.length,
        cutoffDate: cutoff.toISOString(),
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// ============================================
// CF-100: Content Calendar (mock)
// ============================================

router.get('/calendar', async (req: Request, res: Response) => {
  try {
    // Get published content with dates for calendar
    const published = await prisma.cfPublishedContent.findMany({
      include: {
        content: { select: { title: true, targetPlatform: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const events = published.map(p => ({
      id: p.id,
      title: p.content?.title || 'Untitled',
      platform: p.platform,
      date: p.createdAt,
      status: p.status,
      postUrl: p.postUrl,
    }));

    res.json({ data: events });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// ============================================
// CF-101: Content Approval Workflow
// ============================================

router.post('/content/:id/approve', async (req: Request, res: Response) => {
  try {
    const updated = await prisma.cfAssembledContent.update({
      where: { id: req.params.id },
      data: { status: 'approved' },
    });
    res.json({ data: updated });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

router.post('/content/:id/reject', async (req: Request, res: Response) => {
  try {
    const updated = await prisma.cfAssembledContent.update({
      where: { id: req.params.id },
      data: { status: 'rejected' },
    });
    res.json({ data: updated });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// ============================================
// CF-103/104: Video Template Library + Performance
// ============================================

router.get('/video-templates', (req: Request, res: Response) => {
  const templates = VEO_TEMPLATES.map(t => ({
    ...t,
    usageCount: Math.floor(Math.random() * 50),
    avgPerformance: Math.random() * 0.5 + 0.3,
  }));
  res.json({ data: templates });
});

// ============================================
// CF-063: Storage Configuration
// ============================================

router.get('/storage/config', (req: Request, res: Response) => {
  const config = getStorageConfig();
  res.json({ data: config });
});

// ============================================
// CF-065: Metrics Sync Control
// ============================================

router.post('/metrics/sync/start', (req: Request, res: Response) => {
  const { intervalMs = 3600000 } = req.body;
  startMetricsSync(intervalMs);
  res.json({ data: { status: 'started', intervalMs } });
});

router.post('/metrics/sync/stop', (req: Request, res: Response) => {
  stopMetricsSync();
  res.json({ data: { status: 'stopped' } });
});

// ============================================
// CF-066: Veo 3 Video Generation
// ============================================

router.post('/generate/veo', async (req: Request, res: Response) => {
  try {
    const { dossierId, prompt, aspectRatio = '9:16', durationSeconds = 8, sourceImageUrl } = req.body;
    if (!prompt) {
      res.status(400).json({ error: { message: 'prompt is required' } });
      return;
    }

    const result = await generateVeoVideo({
      prompt,
      aspectRatio,
      durationSeconds,
      model: 'veo-3.1',
      sourceImageUrl,
    });

    if (dossierId) {
      const video = await prisma.cfGeneratedVideo.create({
        data: {
          dossierId,
          type: 'veo',
          prompt: result.prompt,
          model: 'veo-3.1',
          durationSeconds,
          aspectRatio,
          videoUrl: result.videoUrl,
          thumbnailUrl: result.thumbnailUrl,
          status: 'complete',
        },
      });
      res.status(201).json({ data: video });
    } else {
      res.json({ data: result });
    }
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// ============================================
// CF-070/071: Nano Banana Image Generation
// ============================================

router.post('/generate/nano-banana', async (req: Request, res: Response) => {
  try {
    const { dossierId, prompt, width = 1080, height = 1920, style, type = 'hero' } = req.body;

    let finalPrompt = prompt;
    if (!finalPrompt && dossierId) {
      const dossier = await prisma.cfProductDossier.findUnique({ where: { id: dossierId } });
      if (dossier) {
        finalPrompt = buildBrandedImagePrompt(toDossierContext(dossier), type);
      }
    }

    if (!finalPrompt) {
      res.status(400).json({ error: { message: 'prompt or dossierId is required' } });
      return;
    }

    const result = await generateNanoBananaImage({
      prompt: finalPrompt,
      width,
      height,
      style,
    });

    if (dossierId) {
      const img = await prisma.cfGeneratedImage.create({
        data: {
          dossierId,
          type: type,
          variantNumber: 1,
          prompt: result.prompt,
          model: 'nano-banana',
          imageUrl: result.imageUrl,
          thumbnailUrl: result.thumbnailUrl,
          status: 'complete',
        },
      });
      res.status(201).json({ data: img });
    } else {
      res.json({ data: result });
    }
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// ============================================
// CF-089: Stock Footage Library
// ============================================

router.get('/stock-footage', (req: Request, res: Response) => {
  const category = req.query.category as string;
  const tag = req.query.tag as string;
  let clips = [...STOCK_FOOTAGE_LIBRARY];
  if (category) clips = clips.filter(c => c.category === category);
  if (tag) clips = clips.filter(c => c.tags.includes(tag));
  const categories = [...new Set(STOCK_FOOTAGE_LIBRARY.map(c => c.category))];
  res.json({ data: clips, categories });
});

// ============================================
// CF-090: Music Library
// ============================================

router.get('/music', (req: Request, res: Response) => {
  const mood = req.query.mood as string;
  const genre = req.query.genre as string;
  let tracks = [...MUSIC_LIBRARY];
  if (mood) tracks = tracks.filter(t => t.mood === mood);
  if (genre) tracks = tracks.filter(t => t.genre === genre);
  const moods = [...new Set(MUSIC_LIBRARY.map(t => t.mood))];
  const genres = [...new Set(MUSIC_LIBRARY.map(t => t.genre))];
  res.json({ data: tracks, moods, genres });
});

// ============================================
// CF-091: Trending Audios
// ============================================

router.get('/trending-audio', (req: Request, res: Response) => {
  const platform = (req.query.platform as string) || 'tiktok';
  const audios = getTrendingAudios(platform);
  res.json({ data: audios });
});

// ============================================
// CF-092/093: Voiceover Generation
// ============================================

router.get('/voiceover/voices', (req: Request, res: Response) => {
  res.json({ data: VOICEOVER_VOICES });
});

router.post('/voiceover/generate', async (req: Request, res: Response) => {
  try {
    const { text, voice = 'vo-female-1', speed = 1.0, pitch = 1.0 } = req.body;
    if (!text) {
      res.status(400).json({ error: { message: 'text is required' } });
      return;
    }
    const result = await generateVoiceover({ text, voice, speed, pitch });
    res.json({ data: result });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// ============================================
// CF-102: Team Collaboration (mock)
// ============================================

router.get('/team', (req: Request, res: Response) => {
  // Mock team data
  const team = [
    { id: 'u-1', name: 'Content Manager', email: 'manager@example.com', role: 'admin', active: true },
    { id: 'u-2', name: 'Creative Director', email: 'creative@example.com', role: 'editor', active: true },
    { id: 'u-3', name: 'Social Media Specialist', email: 'social@example.com', role: 'publisher', active: true },
  ];
  const roles = [
    { id: 'admin', name: 'Admin', permissions: ['create', 'edit', 'delete', 'publish', 'manage_team'] },
    { id: 'editor', name: 'Editor', permissions: ['create', 'edit', 'publish'] },
    { id: 'publisher', name: 'Publisher', permissions: ['publish'] },
    { id: 'viewer', name: 'Viewer', permissions: [] },
  ];
  res.json({ data: { team, roles } });
});

// ============================================
// CF-109: Copyright Verification
// ============================================

router.post('/copyright-check', (req: Request, res: Response) => {
  const { audioId, imageIds } = req.body;
  const result = checkCopyrightStatus(audioId, imageIds);
  res.json({ data: result });
});

// ============================================
// CF-039/040: Platform Publishing Integration
// ============================================

router.post('/publish/platform', async (req: Request, res: Response) => {
  try {
    const { contentId, platform = 'tiktok' } = req.body;

    if (!contentId) {
      res.status(400).json({ error: { message: 'contentId is required' } });
      return;
    }

    const content = await prisma.cfAssembledContent.findUnique({
      where: { id: contentId },
      include: { dossier: true },
    });

    if (!content) {
      res.status(404).json({ error: { message: 'Content not found' } });
      return;
    }

    const videoIds = Array.isArray(content.videoIds) ? content.videoIds as string[] : [];
    let videoUrl = '';
    if (videoIds.length > 0) {
      const video = await prisma.cfGeneratedVideo.findFirst({ where: { id: { in: videoIds } } });
      videoUrl = video?.videoUrl || '';
    }

    const result = await publishToPlatform({
      platform: platform as any,
      videoUrl,
      caption: content.caption || '',
      hashtags: Array.isArray(content.hashtags) ? content.hashtags as string[] : [],
      disclosureEnabled: content.hasDisclosure,
    });

    const published = await prisma.cfPublishedContent.create({
      data: {
        contentId,
        platform,
        platformPostId: result.postId,
        postUrl: result.postUrl,
        status: 'published',
      },
    });

    await prisma.cfAssembledContent.update({
      where: { id: contentId },
      data: { status: 'published' },
    });

    res.status(201).json({ data: published });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// ============================================
// CF-043: TikTok Promote API
// ============================================

router.post('/promote/tiktok', async (req: Request, res: Response) => {
  try {
    const { publishedId, budgetCents = 500, durationHours = 24, objective = 'views' } = req.body;

    if (!publishedId) {
      res.status(400).json({ error: { message: 'publishedId is required' } });
      return;
    }

    const published = await prisma.cfPublishedContent.findUnique({ where: { id: publishedId } });
    if (!published) {
      res.status(404).json({ error: { message: 'Published content not found' } });
      return;
    }

    const result = await promoteTikTokPost({
      postId: published.platformPostId,
      budgetCents,
      durationHours,
      objective,
    });

    const now = new Date();
    await prisma.cfPublishedContent.update({
      where: { id: publishedId },
      data: {
        promoted: true,
        promoteBudgetCents: budgetCents,
        promoteStartAt: now,
        promoteEndAt: new Date(now.getTime() + durationHours * 3600000),
        status: 'promoted',
      },
    });

    res.json({ data: result });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// ============================================
// CF-045/046/075: Platform Metrics Collection
// ============================================

router.post('/metrics/collect', async (req: Request, res: Response) => {
  try {
    const { publishedId } = req.body;

    if (!publishedId) {
      res.status(400).json({ error: { message: 'publishedId is required' } });
      return;
    }

    const published = await prisma.cfPublishedContent.findUnique({ where: { id: publishedId } });
    if (!published) {
      res.status(404).json({ error: { message: 'Published content not found' } });
      return;
    }

    const metrics = published.platform === 'instagram'
      ? await fetchInstagramMetrics(published.platformPostId)
      : await fetchTikTokMetrics(published.platformPostId);

    const saved = await prisma.cfPerformanceMetric.create({
      data: {
        publishedId,
        date: new Date(),
        views: metrics.views,
        likes: metrics.likes,
        comments: metrics.comments,
        shares: metrics.shares,
        saves: metrics.saves,
        reach: metrics.reach,
        avgWatchPct: metrics.avgWatchPct,
        linkClicks: metrics.linkClicks,
        purchases: metrics.purchases,
        spendCents: 0,
      },
    });

    res.json({ data: saved });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// ============================================
// CF-059: Remotion Integration
// ============================================

router.post('/render/remotion', async (req: Request, res: Response) => {
  try {
    const { compositionId = 'content-factory', inputProps = {}, fps = 30, codec = 'h264' } = req.body;

    const result = await renderWithRemotion({
      compositionId,
      inputProps,
      outputFormat: 'mp4',
      codec,
      fps,
    });

    res.json({ data: result });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// ============================================
// CF-060: PCT Hook Sharing
// ============================================

router.post('/hooks/share-pct', async (req: Request, res: Response) => {
  try {
    const { hook, awarenessLevel = 1, performanceScore = 0.5 } = req.body;
    if (!hook) {
      res.status(400).json({ error: { message: 'hook is required' } });
      return;
    }
    const result = await shareHookWithPCT(hook, awarenessLevel, performanceScore);
    res.json({ data: result });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// ============================================
// CF-073: TikTok Shop Import
// ============================================

router.post('/import/tiktok-shop', async (req: Request, res: Response) => {
  try {
    const { shopUrl } = req.body;
    if (!shopUrl) {
      res.status(400).json({ error: { message: 'shopUrl is required' } });
      return;
    }
    const products = await importTikTokShopProducts(shopUrl);
    res.json({ data: products });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// ============================================
// CF-077: Instagram Shopping Tags
// ============================================

router.post('/instagram/shopping-tags', async (req: Request, res: Response) => {
  try {
    const { postId, productIds = [] } = req.body;
    if (!postId) {
      res.status(400).json({ error: { message: 'postId is required' } });
      return;
    }
    const result = await addShoppingTags(postId, productIds);
    res.json({ data: result });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// ============================================
// CF-115: Shopify Sync
// ============================================

router.post('/sync/shopify', async (req: Request, res: Response) => {
  try {
    const { shopDomain, apiKey } = req.body;
    if (!shopDomain) {
      res.status(400).json({ error: { message: 'shopDomain is required' } });
      return;
    }
    const result = await syncShopifyProducts(shopDomain, apiKey || '');
    res.json({ data: result });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// ============================================
// CF-116: CRM Integration
// ============================================

router.post('/sync/crm', async (req: Request, res: Response) => {
  try {
    const { provider = 'hubspot', apiKey } = req.body;
    const result = await syncCRMContacts(provider, apiKey || '');
    res.json({ data: result });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// ============================================
// Integration Status
// ============================================

router.get('/integrations/status', (req: Request, res: Response) => {
  res.json({
    data: {
      tiktok: { connected: !!process.env.TIKTOK_API_KEY, configured: !!process.env.TIKTOK_API_KEY },
      instagram: { connected: !!process.env.INSTAGRAM_API_KEY, configured: !!process.env.INSTAGRAM_API_KEY },
      facebook: { connected: !!process.env.FACEBOOK_API_KEY, configured: !!process.env.FACEBOOK_API_KEY },
      remotion: { connected: !!process.env.REMOTION_ENDPOINT, configured: !!process.env.REMOTION_ENDPOINT },
      shopify: { connected: !!process.env.SHOPIFY_API_KEY, configured: !!process.env.SHOPIFY_API_KEY },
      veo: { connected: !!process.env.VEO_API_KEY, configured: !!process.env.VEO_API_KEY },
      nanoBanana: { connected: !!process.env.NANO_BANANA_API_KEY, configured: !!process.env.NANO_BANANA_API_KEY },
    },
  });
});

export default router;
