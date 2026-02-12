/**
 * Content Factory AI Generation Service
 *
 * Handles script generation via Claude API and provides mock stubs
 * for Nano Banana (image) and Veo 3.1 (video) generation.
 *
 * Real image/video generation will go through Remotion API when available.
 */

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

const MODEL = 'claude-sonnet-4-20250514';

// ============================================
// Types
// ============================================

export interface DossierContext {
  name: string;
  benefits: string[];
  painPoints: string[];
  proofTypes: string[];
  targetAudience?: string;
  category?: string;
  niche?: string;
  price?: number;
  tiktokShopUrl?: string;
  affiliateLink?: string;
}

export interface ScriptResult {
  awarenessLevel: number;
  hook: string;
  body: string;
  cta: string;
  fullScript: string;
  wordCount: number;
  estimatedDurationSeconds: number;
  promptUsed: string;
}

export interface ImageGenerationResult {
  prompt: string;
  imageUrl: string;
  thumbnailUrl: string;
}

export interface VideoGenerationResult {
  prompt: string;
  videoUrl: string;
  thumbnailUrl: string;
}

export interface CaptionResult {
  caption: string;
  hashtags: string[];
}

// ============================================
// Awareness Level Descriptions (Eugene Schwartz)
// ============================================

const AWARENESS_LEVELS: Record<number, { name: string; style: string; promptTemplate: string }> = {
  1: {
    name: 'Unaware',
    style: 'POV/meme/relatable scenario',
    promptTemplate: `Write a 15-second TikTok script for {product}.
Target: People who don't know they have this problem yet.
Style: POV/meme/relatable scenario
Structure:
- Hook: Relatable situation (no product mention)
- Build: Escalate the scenario
- Reveal: Subtle solution hint
- CTA: "Link in bio" or soft curiosity driver
Tone: Casual, authentic, not salesy

Product pain points: {painPoints}
Benefits: {benefits}
Category: {category}`,
  },
  2: {
    name: 'Problem Aware',
    style: 'Pain point focused',
    promptTemplate: `Write a 15-second TikTok script for {product}.
Target: People who know the problem but not solutions.
Structure:
- Hook: Call out the specific pain point
- Agitate: "Here's what's actually causing this..."
- Tease: Hint at solution category
- CTA: "Here's what I found that works"
Tone: Empathetic, understanding, knowledgeable

Product pain points: {painPoints}
Benefits: {benefits}
Category: {category}`,
  },
  3: {
    name: 'Solution Aware',
    style: 'Comparison/recommendation',
    promptTemplate: `Write a 15-second TikTok script for {product}.
Target: People who know solutions exist, comparing options.
Structure:
- Hook: "3 ways to fix {mainPainPoint}..."
- Compare: Quick comparison (this one is simplest/fastest)
- Proof: Quick result or testimonial
- CTA: "This is the one I use - link in bio"
Tone: Helpful, comparison-style, honest

Product pain points: {painPoints}
Benefits: {benefits}
Category: {category}
Proof types: {proofTypes}`,
  },
  4: {
    name: 'Product Aware',
    style: 'Review/honest take',
    promptTemplate: `Write a 15-second TikTok script for {product}.
Target: People who know this product but haven't bought.
Structure:
- Hook: "I tried {product} so you don't have to..."
- Review: Honest pros/cons
- Result: Show actual result
- CTA: "If you've been curious - link in bio"
Tone: Honest, reviewer-style, trustworthy

Product benefits: {benefits}
Price: {price}
Category: {category}`,
  },
  5: {
    name: 'Most Aware',
    style: 'Urgency/direct offer',
    promptTemplate: `Write a 15-second TikTok script for {product}.
Target: People ready to buy, just need a push.
Structure:
- Hook: "If you've been on the fence about {product}..."
- Urgency: Limited time/stock/deal
- Reassurance: Risk reversal or guarantee
- CTA: Direct "Get it now - link in bio"
Tone: Urgent but not pushy, confident

Product benefits: {benefits}
Price: {price}
{discountInfo}
Category: {category}`,
  },
};

// ============================================
// Script Generation (Real Claude API)
// ============================================

function buildScriptPrompt(dossier: DossierContext, level: number, sophistication: number): string {
  const template = AWARENESS_LEVELS[level];
  if (!template) throw new Error(`Invalid awareness level: ${level}`);

  const mainPainPoint = dossier.painPoints[0] || 'this common problem';
  const discountInfo = dossier.price && dossier.price > 0
    ? `Current price: $${dossier.price}`
    : '';

  let prompt = template.promptTemplate
    .replace(/{product}/g, dossier.name)
    .replace(/{painPoints}/g, dossier.painPoints.join(', ') || 'Not specified')
    .replace(/{benefits}/g, dossier.benefits.join(', ') || 'Not specified')
    .replace(/{category}/g, dossier.category || 'general')
    .replace(/{proofTypes}/g, dossier.proofTypes.join(', ') || 'demo, review')
    .replace(/{price}/g, dossier.price ? `$${dossier.price}` : 'Not specified')
    .replace(/{discountInfo}/g, discountInfo)
    .replace(/{mainPainPoint}/g, mainPainPoint);

  prompt += `\n\nMarket Sophistication Level: ${sophistication}/5`;
  if (dossier.targetAudience) {
    prompt += `\nTarget Audience: ${dossier.targetAudience}`;
  }

  prompt += `\n\nReturn ONLY a JSON object with these fields:
{
  "hook": "The attention-grabbing first line",
  "body": "The main content section",
  "cta": "The call to action"
}`;

  return prompt;
}

export async function generateScript(
  dossier: DossierContext,
  awarenessLevel: number,
  marketSophistication: number = 3
): Promise<ScriptResult> {
  const prompt = buildScriptPrompt(dossier, awarenessLevel, marketSophistication);

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Failed to parse script response');

  const parsed = JSON.parse(jsonMatch[0]);
  const fullScript = `HOOK:\n${parsed.hook}\n\nBODY:\n${parsed.body}\n\nCTA:\n${parsed.cta}`;
  const wordCount = fullScript.replace(/\[.*?\]/g, '').split(/\s+/).filter(Boolean).length;
  const estimatedDurationSeconds = Math.round(wordCount / 2.5); // ~150 wpm speaking rate

  return {
    awarenessLevel,
    hook: parsed.hook,
    body: parsed.body,
    cta: parsed.cta,
    fullScript,
    wordCount,
    estimatedDurationSeconds,
    promptUsed: prompt,
  };
}

export async function generateAllScripts(
  dossier: DossierContext,
  marketSophistication: number = 3
): Promise<ScriptResult[]> {
  const results: ScriptResult[] = [];
  for (let level = 1; level <= 5; level++) {
    const script = await generateScript(dossier, level, marketSophistication);
    results.push(script);
  }
  return results;
}

// ============================================
// Caption & Hashtag Generation (Real Claude API)
// ============================================

export async function generateCaptionAndHashtags(
  dossier: DossierContext,
  scriptHook: string,
  platform: string = 'tiktok'
): Promise<CaptionResult> {
  const prompt = `You are a social media expert. Generate a caption and hashtags for a ${platform} post.

Product: ${dossier.name}
Category: ${dossier.category || 'general'}
Niche: ${dossier.niche || 'general'}
Video hook: "${scriptHook}"
${dossier.affiliateLink ? 'This is affiliate content - include appropriate disclosure.' : ''}

Generate:
1. A short, engaging caption (2-3 lines max) that complements the video
2. 10-15 relevant hashtags

Return ONLY a JSON object:
{
  "caption": "The caption text",
  "hashtags": ["hashtag1", "hashtag2", ...]
}`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Failed to parse caption response');

  return JSON.parse(jsonMatch[0]);
}

// ============================================
// Image Generation (Mock - Nano Banana via Remotion)
// ============================================

function buildBeforeImagePrompt(dossier: DossierContext): string {
  const painPoint = dossier.painPoints[0] || 'everyday struggle';
  return `Make a before version of ${dossier.category || 'product'} scene:
- Emphasize the problem: ${painPoint}
- Dull, natural lighting
- Slightly messy/cluttered environment
- Realistic phone photo aesthetic
- No brand logos visible
- Keep subject identity consistent for pairing`;
}

function buildAfterImagePrompt(dossier: DossierContext): string {
  const benefit = dossier.benefits[0] || 'improvement';
  return `Make an after version of the same scene:
- Same composition but improved
- Problem is solved: ${benefit}
- Brighter, cleaner lighting
- Organized/improved environment
- Product visible but not staged
- Realistic phone photo aesthetic
- Keep subject identity consistent with before image`;
}

export async function generateBeforeImages(
  dossier: DossierContext,
  variants: number = 3
): Promise<ImageGenerationResult[]> {
  const prompt = buildBeforeImagePrompt(dossier);
  const results: ImageGenerationResult[] = [];

  for (let i = 0; i < variants; i++) {
    // Mock: In production, this calls Remotion API -> Nano Banana
    results.push({
      prompt,
      imageUrl: `https://placehold.co/1080x1920/666/fff?text=Before+V${i + 1}+${encodeURIComponent(dossier.name)}`,
      thumbnailUrl: `https://placehold.co/270x480/666/fff?text=Before+V${i + 1}`,
    });
  }

  return results;
}

export async function generateAfterImages(
  dossier: DossierContext,
  variants: number = 3
): Promise<ImageGenerationResult[]> {
  const prompt = buildAfterImagePrompt(dossier);
  const results: ImageGenerationResult[] = [];

  for (let i = 0; i < variants; i++) {
    // Mock: In production, this calls Remotion API -> Nano Banana
    results.push({
      prompt,
      imageUrl: `https://placehold.co/1080x1920/4a9/fff?text=After+V${i + 1}+${encodeURIComponent(dossier.name)}`,
      thumbnailUrl: `https://placehold.co/270x480/4a9/fff?text=After+V${i + 1}`,
    });
  }

  return results;
}

// ============================================
// Video Generation (Mock - Veo 3.1 via Remotion)
// ============================================

function buildRevealVideoPrompt(dossier: DossierContext): string {
  const painPoint = dossier.painPoints[0] || 'the problem';
  const benefit = dossier.benefits[0] || 'the solution';
  return `Vertical 9:16, handheld phone footage, 8 seconds.
Start on the "before" scene showing ${painPoint}.
Quick whip-pan transition (0.5s).
Reveal "after" scene showing ${benefit}.
Subtle camera shake for authenticity.
Natural indoor lighting.
Ambient room sound.`;
}

export async function generateRevealVideo(
  dossier: DossierContext,
  sourceImageId?: string
): Promise<VideoGenerationResult> {
  const prompt = buildRevealVideoPrompt(dossier);

  // Mock: In production, this calls Remotion API -> Veo 3.1
  return {
    prompt,
    videoUrl: `https://placehold.co/1080x1920/333/fff?text=Video+${encodeURIComponent(dossier.name)}`,
    thumbnailUrl: `https://placehold.co/270x480/333/fff?text=Thumb+${encodeURIComponent(dossier.name)}`,
  };
}

// ============================================
// Compliance Helpers
// ============================================

export function checkComplianceFlags(dossier: DossierContext): {
  needsDisclosure: boolean;
  disclosureType: string | null;
  warnings: string[];
  beforeAfterChecks: { flag: string; severity: 'pass' | 'warn' | 'fail'; message: string }[];
  ftcChecks: { flag: string; severity: 'pass' | 'warn' | 'fail'; message: string }[];
} {
  const warnings: string[] = [];
  let needsDisclosure = false;
  let disclosureType: string | null = null;
  const beforeAfterChecks: { flag: string; severity: 'pass' | 'warn' | 'fail'; message: string }[] = [];
  const ftcChecks: { flag: string; severity: 'pass' | 'warn' | 'fail'; message: string }[] = [];

  // === FTC Disclosure Checks (CF-062) ===
  if (dossier.affiliateLink) {
    needsDisclosure = true;
    disclosureType = 'affiliate';
    warnings.push('Affiliate link detected - FTC disclosure required');
    ftcChecks.push({
      flag: 'affiliate_link',
      severity: 'warn',
      message: 'Affiliate link present - clear and conspicuous disclosure required per FTC guidelines',
    });
  } else {
    ftcChecks.push({
      flag: 'affiliate_link',
      severity: 'pass',
      message: 'No affiliate links detected',
    });
  }

  if (dossier.tiktokShopUrl) {
    needsDisclosure = true;
    disclosureType = disclosureType || 'paid_partnership';
    warnings.push('TikTok Shop URL detected - commercial content disclosure required');
    ftcChecks.push({
      flag: 'tiktok_shop',
      severity: 'warn',
      message: 'TikTok Shop URL present - toggle commercial content disclosure ON',
    });
  }

  if (!needsDisclosure) {
    ftcChecks.push({
      flag: 'no_disclosure_needed',
      severity: 'pass',
      message: 'No material connection detected - no mandatory disclosure',
    });
  }

  // === Before/After Content Guidelines (CF-061) ===
  const allText = [...dossier.benefits, ...dossier.painPoints].join(' ').toLowerCase();

  // Health/beauty claim detection
  const healthKeywords = [
    'weight loss', 'cure', 'miracle', 'guaranteed results', 'instant',
    'anti-aging', 'wrinkle removal', 'fat burning', 'detox', 'cleanse',
  ];
  const foundHealthClaims: string[] = [];
  for (const keyword of healthKeywords) {
    if (allText.includes(keyword)) {
      foundHealthClaims.push(keyword);
      warnings.push(`Potential health claim detected: "${keyword}" - add "results may vary" disclaimer`);
    }
  }

  if (foundHealthClaims.length > 0) {
    beforeAfterChecks.push({
      flag: 'health_claims',
      severity: 'warn',
      message: `Health/beauty claims detected: ${foundHealthClaims.join(', ')}. Must include "results may vary" disclaimer.`,
    });
  } else {
    beforeAfterChecks.push({
      flag: 'health_claims',
      severity: 'pass',
      message: 'No flagged health/beauty claims in product data',
    });
  }

  // Exaggerated transformation detection
  const exaggeratedTerms = [
    '100%', 'completely transform', 'never again', 'permanent',
    'eliminate forever', 'overnight results', 'magic',
  ];
  const foundExaggerated: string[] = [];
  for (const term of exaggeratedTerms) {
    if (allText.includes(term)) {
      foundExaggerated.push(term);
    }
  }

  if (foundExaggerated.length > 0) {
    beforeAfterChecks.push({
      flag: 'exaggerated_claims',
      severity: 'warn',
      message: `Potentially exaggerated transformation claims: ${foundExaggerated.join(', ')}. Keep before/after realistic.`,
    });
    warnings.push(`Exaggerated claims detected: ${foundExaggerated.join(', ')}`);
  } else {
    beforeAfterChecks.push({
      flag: 'exaggerated_claims',
      severity: 'pass',
      message: 'No exaggerated transformation claims detected',
    });
  }

  // Category-specific checks
  if (dossier.category === 'beauty' || dossier.category === 'health' || dossier.category === 'fitness') {
    beforeAfterChecks.push({
      flag: 'category_risk',
      severity: 'warn',
      message: `${dossier.category} category content requires extra care with before/after claims. Add "results may vary".`,
    });
    if (!warnings.some(w => w.includes('results may vary'))) {
      warnings.push(`${dossier.category} category - recommend "results may vary" disclaimer`);
    }
  }

  return { needsDisclosure, disclosureType, warnings, beforeAfterChecks, ftcChecks };
}

// ============================================
// Scoring Algorithm (from PRD)
// ============================================

export interface ScoringWeights {
  holdRateWeight: number;
  watchTimeWeight: number;
  engagementWeight: number;
  clickRateWeight: number;
  conversionWeight: number;
  minViewsForValid: number;
  minSpendCentsForValid: number;
}

export interface ContentMetrics {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  avgWatchPct: number | null;
  linkClicks: number;
  purchases: number;
  spendCents: number;
  reach: number;
}

export function calculateContentScore(metrics: ContentMetrics, config: ScoringWeights): number {
  const holdRate = metrics.reach > 0 ? metrics.views / metrics.reach : 0;
  const avgWatchPct = (metrics.avgWatchPct || 0) / 100;
  const engagementRate = metrics.views > 0
    ? (metrics.likes + metrics.comments + metrics.shares + metrics.saves) / metrics.views
    : 0;
  const clickRate = metrics.views > 0 ? metrics.linkClicks / metrics.views : 0;
  const conversionRate = metrics.linkClicks > 0
    ? metrics.purchases / metrics.linkClicks
    : 0;

  return (
    holdRate * config.holdRateWeight +
    avgWatchPct * config.watchTimeWeight +
    engagementRate * config.engagementWeight +
    clickRate * config.clickRateWeight +
    conversionRate * config.conversionWeight
  );
}

export function pickWinner(
  variants: Array<{ id: string; metrics: ContentMetrics }>,
  config: ScoringWeights
): { winnerId: string | null; reason: string; scores: Array<{ id: string; score: number }> } {
  const validVariants = variants.filter(
    v => v.metrics.views >= config.minViewsForValid &&
         v.metrics.spendCents >= config.minSpendCentsForValid
  );

  if (validVariants.length === 0) {
    return { winnerId: null, reason: 'Insufficient data for all variants', scores: [] };
  }

  const scored = validVariants.map(v => ({
    id: v.id,
    score: calculateContentScore(v.metrics, config),
  }));

  scored.sort((a, b) => b.score - a.score);

  return {
    winnerId: scored[0].id,
    reason: `Highest composite score: ${scored[0].score.toFixed(4)}`,
    scores: scored,
  };
}

// ============================================
// CF-084: Pattern Interrupt Hook Library
// ============================================

export interface HookTemplate {
  id: string;
  category: string;
  template: string;
  awarenessLevel: number;
  example: string;
  avgPerformanceScore: number;
}

export const HOOK_LIBRARY: HookTemplate[] = [
  // Level 1: Unaware - POV/Meme hooks
  { id: 'h-001', category: 'pov', template: 'POV: You just realized {painPoint}', awarenessLevel: 1, example: 'POV: You just realized your skin has been dry this whole time', avgPerformanceScore: 0.72 },
  { id: 'h-002', category: 'relatable', template: 'Nobody talks about {painPoint} enough', awarenessLevel: 1, example: 'Nobody talks about adult acne enough', avgPerformanceScore: 0.68 },
  { id: 'h-003', category: 'storytime', template: 'Story time: How I discovered {insight}', awarenessLevel: 1, example: 'Story time: How I discovered my skincare was wrong', avgPerformanceScore: 0.65 },
  { id: 'h-004', category: 'controversial', template: 'Hot take: {contrarian_opinion}', awarenessLevel: 1, example: 'Hot take: Most serums are a waste of money', avgPerformanceScore: 0.78 },
  // Level 2: Problem Aware
  { id: 'h-005', category: 'question', template: 'Are you still dealing with {painPoint}?', awarenessLevel: 2, example: 'Are you still dealing with dry flaky skin?', avgPerformanceScore: 0.61 },
  { id: 'h-006', category: 'list', template: '3 signs {painPoint} is worse than you think', awarenessLevel: 2, example: '3 signs your skin barrier is damaged', avgPerformanceScore: 0.70 },
  { id: 'h-007', category: 'mistake', template: 'The #1 mistake people make with {topic}', awarenessLevel: 2, example: 'The #1 mistake people make with moisturizer', avgPerformanceScore: 0.74 },
  // Level 3: Solution Aware
  { id: 'h-008', category: 'comparison', template: 'I tried every {solution_type} so you don\'t have to', awarenessLevel: 3, example: 'I tried every moisturizer so you don\'t have to', avgPerformanceScore: 0.69 },
  { id: 'h-009', category: 'ranking', template: 'Ranking {solution_type} from worst to best', awarenessLevel: 3, example: 'Ranking face serums from worst to best', avgPerformanceScore: 0.73 },
  { id: 'h-010', category: 'hack', template: 'The {solution_type} hack nobody told you about', awarenessLevel: 3, example: 'The skincare hack nobody told you about', avgPerformanceScore: 0.67 },
  // Level 4: Product Aware
  { id: 'h-011', category: 'honest_review', template: 'My honest {product} review after {timeframe}', awarenessLevel: 4, example: 'My honest GlowSerum review after 30 days', avgPerformanceScore: 0.63 },
  { id: 'h-012', category: 'results', template: 'Here\'s what happened after {timeframe} of using {product}', awarenessLevel: 4, example: "Here's what happened after 2 weeks of using GlowSerum", avgPerformanceScore: 0.71 },
  // Level 5: Most Aware
  { id: 'h-013', category: 'urgency', template: 'Last chance to get {product} at this price', awarenessLevel: 5, example: 'Last chance to get GlowSerum at 40% off', avgPerformanceScore: 0.58 },
  { id: 'h-014', category: 'social_proof', template: 'Why {number} people switched to {product} this month', awarenessLevel: 5, example: 'Why 50,000 people switched to GlowSerum this month', avgPerformanceScore: 0.66 },
];

// ============================================
// CF-095: Statistical Significance Calculator
// ============================================

export function calculateStatisticalSignificance(
  controlViews: number,
  controlConversions: number,
  variantViews: number,
  variantConversions: number
): { significant: boolean; confidence: number; pValue: number; uplift: number } {
  const controlRate = controlViews > 0 ? controlConversions / controlViews : 0;
  const variantRate = variantViews > 0 ? variantConversions / variantViews : 0;

  if (controlViews === 0 || variantViews === 0) {
    return { significant: false, confidence: 0, pValue: 1, uplift: 0 };
  }

  const pooledRate = (controlConversions + variantConversions) / (controlViews + variantViews);
  const se = Math.sqrt(pooledRate * (1 - pooledRate) * (1 / controlViews + 1 / variantViews));

  if (se === 0) {
    return { significant: false, confidence: 0, pValue: 1, uplift: 0 };
  }

  const z = Math.abs(variantRate - controlRate) / se;

  // Approximate p-value from z-score (two-tailed)
  const pValue = Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
  const confidence = Math.min((1 - pValue * 2) * 100, 99.9);
  const uplift = controlRate > 0 ? ((variantRate - controlRate) / controlRate) * 100 : 0;

  return {
    significant: confidence >= 95,
    confidence: Math.max(0, confidence),
    pValue: Math.max(0, pValue),
    uplift,
  };
}

// ============================================
// CF-105: AI Content Brief Generator
// ============================================

export async function generateContentBrief(dossier: DossierContext): Promise<{
  brief: string;
  suggestedAngles: string[];
  targetHooks: string[];
  visualDirection: string;
}> {
  const prompt = `Generate a content brief for creating TikTok content about "${dossier.name}".

Product details:
- Category: ${dossier.category || 'general'}
- Benefits: ${dossier.benefits.join(', ') || 'Not specified'}
- Pain points: ${dossier.painPoints.join(', ') || 'Not specified'}
- Target audience: ${dossier.targetAudience || 'General'}
- Price: ${dossier.price ? '$' + dossier.price : 'Not specified'}

Create a comprehensive content brief including:
1. Overall content strategy (2-3 sentences)
2. 5 suggested content angles
3. 5 hook ideas (pattern interrupts)
4. Visual direction recommendation

Return ONLY a JSON object:
{
  "brief": "Strategy summary...",
  "suggestedAngles": ["angle1", "angle2", ...],
  "targetHooks": ["hook1", "hook2", ...],
  "visualDirection": "Visual style recommendation..."
}`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Failed to parse brief response');
  return JSON.parse(jsonMatch[0]);
}

// ============================================
// CF-108: Platform Content Policy Checker
// ============================================

export interface PolicyCheckResult {
  platform: string;
  checks: Array<{
    rule: string;
    status: 'pass' | 'warn' | 'fail';
    message: string;
  }>;
  overallStatus: 'pass' | 'warn' | 'fail';
}

export function checkPlatformPolicy(
  caption: string,
  hashtags: string[],
  platform: string,
  dossier: DossierContext
): PolicyCheckResult {
  const checks: PolicyCheckResult['checks'] = [];
  const lowerCaption = caption.toLowerCase();
  const allText = `${caption} ${hashtags.join(' ')}`.toLowerCase();

  // Platform-specific length limits
  const captionLimits: Record<string, number> = { tiktok: 2200, instagram: 2200, facebook: 63206 };
  const hashtagLimits: Record<string, number> = { tiktok: 30, instagram: 30, facebook: 30 };

  if (caption.length > (captionLimits[platform] || 2200)) {
    checks.push({ rule: 'caption_length', status: 'fail', message: `Caption exceeds ${platform} limit of ${captionLimits[platform]} characters` });
  } else {
    checks.push({ rule: 'caption_length', status: 'pass', message: `Caption length OK (${caption.length}/${captionLimits[platform] || 2200})` });
  }

  if (hashtags.length > (hashtagLimits[platform] || 30)) {
    checks.push({ rule: 'hashtag_count', status: 'warn', message: `Too many hashtags (${hashtags.length}/${hashtagLimits[platform] || 30})` });
  } else {
    checks.push({ rule: 'hashtag_count', status: 'pass', message: `Hashtag count OK (${hashtags.length}/${hashtagLimits[platform] || 30})` });
  }

  // Banned/restricted content terms
  const bannedTerms = ['gambling', 'drugs', 'weapons', 'tobacco', 'vaping', 'alcohol abuse'];
  const foundBanned = bannedTerms.filter(t => allText.includes(t));
  if (foundBanned.length > 0) {
    checks.push({ rule: 'banned_content', status: 'fail', message: `Restricted content terms: ${foundBanned.join(', ')}` });
  } else {
    checks.push({ rule: 'banned_content', status: 'pass', message: 'No restricted content terms detected' });
  }

  // Health claims
  const healthTerms = ['cure', 'treat', 'prevent disease', 'guaranteed weight loss', 'miracle', 'FDA approved'];
  const foundHealth = healthTerms.filter(t => lowerCaption.includes(t));
  if (foundHealth.length > 0) {
    checks.push({ rule: 'health_claims', status: 'fail', message: `Unsubstantiated health claims: ${foundHealth.join(', ')}` });
  } else {
    checks.push({ rule: 'health_claims', status: 'pass', message: 'No problematic health claims' });
  }

  // Disclosure check
  if (dossier.affiliateLink || dossier.tiktokShopUrl) {
    const hasDisclosure = lowerCaption.includes('#ad') || lowerCaption.includes('#sponsored') ||
      lowerCaption.includes('#paidpartnership') || lowerCaption.includes('paid partnership') ||
      lowerCaption.includes('#affiliate');
    if (!hasDisclosure) {
      checks.push({ rule: 'disclosure', status: 'warn', message: 'Commercial content should include disclosure (#ad, #sponsored, etc.)' });
    } else {
      checks.push({ rule: 'disclosure', status: 'pass', message: 'Commercial content disclosure present' });
    }
  }

  // TikTok-specific checks
  if (platform === 'tiktok') {
    const bannedHashtags = ['#fyp', '#foryoupage']; // over-used, reduce reach
    const foundOverused = hashtags.filter(h => bannedHashtags.includes('#' + h.toLowerCase()));
    if (foundOverused.length > 0) {
      checks.push({ rule: 'tiktok_overused_tags', status: 'warn', message: `Overused hashtags may reduce reach: ${foundOverused.join(', ')}` });
    }
  }

  const overallStatus = checks.some(c => c.status === 'fail') ? 'fail'
    : checks.some(c => c.status === 'warn') ? 'warn' : 'pass';

  return { platform, checks, overallStatus };
}

// ============================================
// CF-088: Caption Style Presets
// ============================================

export interface CaptionPreset {
  id: string;
  name: string;
  description: string;
  platform: string;
  style: string;
  maxLength: number;
  includeEmoji: boolean;
  hashtagPosition: 'inline' | 'end' | 'comment';
  example: string;
}

// ============================================
// CF-055: 'More Like Winner' Generation
// ============================================

export async function generateMoreLikeWinner(
  dossier: DossierContext,
  winnerScript: { hook: string; body: string; cta: string; awarenessLevel: number },
  count: number = 3
): Promise<ScriptResult[]> {
  const prompt = `You are creating TikTok scripts. A winning script was found for "${dossier.name}":

Winning Hook: "${winnerScript.hook}"
Winning Body: "${winnerScript.body}"
Winning CTA: "${winnerScript.cta}"
Awareness Level: ${winnerScript.awarenessLevel} (${AWARENESS_LEVELS[winnerScript.awarenessLevel]?.name || 'Unknown'})

Generate ${count} NEW script variations that:
1. Keep the same awareness level and tone
2. Use similar patterns but different angles
3. Test different hooks while maintaining the winning approach
4. Vary the CTA slightly for testing

Return ONLY a JSON array:
[
  {"hook": "...", "body": "...", "cta": "..."},
  ...
]`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('Failed to parse more-like-winner response');

  const parsed = JSON.parse(jsonMatch[0]);
  return parsed.map((p: any) => {
    const fullScript = `HOOK:\n${p.hook}\n\nBODY:\n${p.body}\n\nCTA:\n${p.cta}`;
    const wordCount = fullScript.replace(/\[.*?\]/g, '').split(/\s+/).filter(Boolean).length;
    return {
      awarenessLevel: winnerScript.awarenessLevel,
      hook: p.hook,
      body: p.body,
      cta: p.cta,
      fullScript,
      wordCount,
      estimatedDurationSeconds: Math.round(wordCount / 2.5),
      promptUsed: prompt,
    };
  });
}

// ============================================
// CF-086: AI Hook Generation from Winning Patterns
// ============================================

export async function generateHooksFromWinners(
  dossier: DossierContext,
  winningHooks: string[],
  targetLevel: number,
  count: number = 5
): Promise<{ hook: string; style: string }[]> {
  const prompt = `Analyze these winning TikTok hooks and generate ${count} new hooks in the same style for "${dossier.name}":

Winning hooks:
${winningHooks.map((h, i) => `${i + 1}. "${h}"`).join('\n')}

Target awareness level: ${targetLevel} (${AWARENESS_LEVELS[targetLevel]?.name || 'Unknown'})
Product category: ${dossier.category || 'general'}
Pain points: ${dossier.painPoints.join(', ') || 'general'}

Return ONLY a JSON array:
[{"hook": "...", "style": "pov|question|story|comparison|urgency"}]`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('Failed to parse hook generation response');
  return JSON.parse(jsonMatch[0]);
}

// ============================================
// CF-067: Veo Prompt Template Library
// ============================================

export interface VeoPromptTemplate {
  id: string;
  name: string;
  category: string;
  template: string;
  aspectRatio: string;
  duration: number;
}

export const VEO_TEMPLATES: VeoPromptTemplate[] = [
  { id: 'veo-ba-reveal', name: 'Before/After Reveal', category: 'transformation', template: 'Vertical 9:16, handheld phone footage, {duration}s. Start on before scene showing {painPoint}. Quick whip-pan transition. Reveal after scene showing {benefit}. Subtle camera shake for authenticity.', aspectRatio: '9:16', duration: 8 },
  { id: 'veo-product-demo', name: 'Product Demo', category: 'demo', template: 'Vertical 9:16, close-up footage, {duration}s. Hands demonstrating {product} usage. Clean background. Soft natural lighting. Focus on texture and application.', aspectRatio: '9:16', duration: 15 },
  { id: 'veo-unboxing', name: 'Unboxing', category: 'unboxing', template: 'Vertical 9:16, POV handheld, {duration}s. Opening package of {product}. Slow reveal of contents. React to quality. Natural room lighting.', aspectRatio: '9:16', duration: 12 },
  { id: 'veo-routine', name: 'Routine Clip', category: 'routine', template: 'Vertical 9:16, aesthetic footage, {duration}s. Morning/evening routine featuring {product}. Calm, organized space. Warm lighting. ASMR-style sounds.', aspectRatio: '9:16', duration: 15 },
  { id: 'veo-testimonial', name: 'Testimonial Setup', category: 'testimonial', template: 'Vertical 9:16, talking head, {duration}s. Person speaking directly to camera about {product}. Natural indoor lighting. Authentic feel. Moderate background blur.', aspectRatio: '9:16', duration: 15 },
  { id: 'veo-ba-side', name: 'Side-by-Side Compare', category: 'comparison', template: 'Vertical 9:16, split screen effect, {duration}s. Left shows before ({painPoint}), right shows after ({benefit}). Clean transition between sides.', aspectRatio: '9:16', duration: 10 },
];

// ============================================
// CF-107: AI Trend Prediction
// ============================================

export async function predictTrends(
  category: string,
  niche: string
): Promise<{ trends: string[]; recommendations: string[]; timing: string }> {
  const prompt = `As a social media trend analyst, predict upcoming content trends for:
Category: ${category || 'general'}
Niche: ${niche || 'general'}

Provide:
1. 5 trending content formats/styles
2. 3 recommended content themes
3. Best posting timing advice

Return ONLY a JSON object:
{
  "trends": ["trend1", "trend2", ...],
  "recommendations": ["rec1", "rec2", ...],
  "timing": "timing advice"
}`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Failed to parse trend prediction');
  return JSON.parse(jsonMatch[0]);
}

export const CAPTION_PRESETS: CaptionPreset[] = [
  { id: 'tiktok-casual', name: 'TikTok Casual', description: 'Short, casual with emoji', platform: 'tiktok', style: 'casual', maxLength: 150, includeEmoji: true, hashtagPosition: 'end', example: 'wait for it... the results are insane' },
  { id: 'tiktok-story', name: 'TikTok Story', description: 'Mini story format', platform: 'tiktok', style: 'narrative', maxLength: 300, includeEmoji: true, hashtagPosition: 'end', example: 'I was THIS close to giving up on my skin when I found...' },
  { id: 'tiktok-listicle', name: 'TikTok Listicle', description: 'Numbered list format', platform: 'tiktok', style: 'list', maxLength: 200, includeEmoji: true, hashtagPosition: 'end', example: '3 things I wish I knew sooner about skincare:' },
  { id: 'ig-clean', name: 'IG Clean', description: 'Professional, spaced format', platform: 'instagram', style: 'professional', maxLength: 500, includeEmoji: false, hashtagPosition: 'comment', example: 'Real results, no filter.\n\nAfter 30 days of consistent use...' },
  { id: 'ig-engage', name: 'IG Engagement', description: 'Question-driven for comments', platform: 'instagram', style: 'engaging', maxLength: 400, includeEmoji: true, hashtagPosition: 'end', example: 'Drop a heart if you struggle with this too! What helped you?' },
  { id: 'fb-share', name: 'FB Shareable', description: 'Story format for sharing', platform: 'facebook', style: 'shareable', maxLength: 600, includeEmoji: false, hashtagPosition: 'end', example: 'I can\'t believe I waited this long to try this. If you\'re on the fence...' },
];

// ============================================
// CF-063: R2/S3 Storage Configuration
// ============================================

export interface StorageConfig {
  provider: 'r2' | 's3' | 'local';
  bucket: string;
  region: string;
  endpoint?: string;
  publicUrlBase?: string;
}

export function getStorageConfig(): StorageConfig {
  return {
    provider: (process.env.STORAGE_PROVIDER as any) || 'local',
    bucket: process.env.STORAGE_BUCKET || 'cf-assets',
    region: process.env.STORAGE_REGION || 'auto',
    endpoint: process.env.STORAGE_ENDPOINT || undefined,
    publicUrlBase: process.env.STORAGE_PUBLIC_URL || '/assets',
  };
}

export async function uploadAsset(buffer: Buffer, key: string, contentType: string): Promise<string> {
  const config = getStorageConfig();
  // Mock: In production, upload to R2/S3
  // For now, return a mock URL
  return `${config.publicUrlBase}/${key}`;
}

// ============================================
// CF-065: Scheduled Metrics Sync
// ============================================

export interface MetricsSyncJob {
  id: string;
  publishedId: string;
  platform: string;
  lastSyncAt: Date | null;
  nextSyncAt: Date;
  status: 'pending' | 'running' | 'complete' | 'error';
}

// Mock cron scheduler - in production, use node-cron or Bull
let syncInterval: NodeJS.Timeout | null = null;

export function startMetricsSync(intervalMs: number = 3600000): void {
  if (syncInterval) clearInterval(syncInterval);
  syncInterval = setInterval(() => {
    console.log('[CF] Running scheduled metrics sync...');
    // In production: fetch metrics from TikTok/IG APIs and update DB
  }, intervalMs);
  console.log(`[CF] Metrics sync scheduled every ${intervalMs / 1000}s`);
}

export function stopMetricsSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    console.log('[CF] Metrics sync stopped');
  }
}

// ============================================
// CF-066: Veo 3 API Integration (Mock)
// ============================================

export interface VeoGenerationRequest {
  prompt: string;
  aspectRatio: '9:16' | '16:9' | '1:1';
  durationSeconds: number;
  model: string;
  sourceImageUrl?: string;
}

export async function generateVeoVideo(request: VeoGenerationRequest): Promise<VideoGenerationResult> {
  // Mock: In production, call Google Veo 3.1 API
  console.log(`[CF] Veo generation: ${request.prompt.substring(0, 50)}...`);
  const mockId = Date.now().toString(36);
  return {
    prompt: request.prompt,
    videoUrl: `https://placehold.co/1080x1920/333/fff?text=Veo+${mockId}`,
    thumbnailUrl: `https://placehold.co/270x480/333/fff?text=Thumb+${mockId}`,
  };
}

// ============================================
// CF-070: Nano Banana API Integration (Mock)
// ============================================

export interface NanoBananaRequest {
  prompt: string;
  width: number;
  height: number;
  style?: string;
  referenceImageUrl?: string;
}

export async function generateNanoBananaImage(request: NanoBananaRequest): Promise<ImageGenerationResult> {
  // Mock: In production, call Nano Banana API via Remotion
  console.log(`[CF] Nano Banana generation: ${request.prompt.substring(0, 50)}...`);
  const mockId = Date.now().toString(36);
  return {
    prompt: request.prompt,
    imageUrl: `https://placehold.co/${request.width}x${request.height}/4a9/fff?text=NB+${mockId}`,
    thumbnailUrl: `https://placehold.co/270x480/4a9/fff?text=NB+Thumb`,
  };
}

// ============================================
// CF-071: Product Image Generation with Branding
// ============================================

export function buildBrandedImagePrompt(dossier: DossierContext, type: 'hero' | 'lifestyle' | 'detail'): string {
  const prompts: Record<string, string> = {
    hero: `Product hero shot of ${dossier.name}. Clean white background. Professional studio lighting. Product centered. High resolution. Brand-consistent styling. Category: ${dossier.category || 'general'}.`,
    lifestyle: `Lifestyle photo featuring ${dossier.name} in natural use. ${dossier.targetAudience || 'Person'} using the product. Warm natural lighting. Authentic feel. Instagram-worthy composition.`,
    detail: `Close-up detail shot of ${dossier.name}. Macro lens feel. Texture and quality visible. Clean background with subtle gradient. Studio lighting with soft shadows.`,
  };
  return prompts[type] || prompts.hero;
}

// ============================================
// CF-089: B-Roll Stock Footage
// ============================================

export interface StockFootageClip {
  id: string;
  name: string;
  category: string;
  url: string;
  thumbnailUrl: string;
  durationSeconds: number;
  tags: string[];
}

export const STOCK_FOOTAGE_LIBRARY: StockFootageClip[] = [
  { id: 'sf-001', name: 'Hands opening package', category: 'unboxing', url: '#', thumbnailUrl: 'https://placehold.co/200x356/555/fff?text=Unboxing', durationSeconds: 3, tags: ['unboxing', 'hands', 'package'] },
  { id: 'sf-002', name: 'Close-up product application', category: 'demo', url: '#', thumbnailUrl: 'https://placehold.co/200x356/555/fff?text=Demo', durationSeconds: 4, tags: ['demo', 'application', 'close-up'] },
  { id: 'sf-003', name: 'Before/after transition wipe', category: 'transition', url: '#', thumbnailUrl: 'https://placehold.co/200x356/555/fff?text=Transition', durationSeconds: 1, tags: ['transition', 'wipe', 'before-after'] },
  { id: 'sf-004', name: 'Satisfied reaction shot', category: 'reaction', url: '#', thumbnailUrl: 'https://placehold.co/200x356/555/fff?text=Reaction', durationSeconds: 2, tags: ['reaction', 'happy', 'satisfied'] },
  { id: 'sf-005', name: 'Morning routine montage', category: 'lifestyle', url: '#', thumbnailUrl: 'https://placehold.co/200x356/555/fff?text=Routine', durationSeconds: 5, tags: ['routine', 'morning', 'lifestyle'] },
  { id: 'sf-006', name: 'Product on counter', category: 'product', url: '#', thumbnailUrl: 'https://placehold.co/200x356/555/fff?text=Product', durationSeconds: 3, tags: ['product', 'still', 'counter'] },
];

// ============================================
// CF-090: Royalty-Free Music Library
// ============================================

export interface MusicTrack {
  id: string;
  name: string;
  artist: string;
  genre: string;
  mood: string;
  bpm: number;
  durationSeconds: number;
  previewUrl: string;
  license: string;
}

export const MUSIC_LIBRARY: MusicTrack[] = [
  { id: 'mt-001', name: 'Upbeat Energy', artist: 'CF Library', genre: 'pop', mood: 'energetic', bpm: 128, durationSeconds: 30, previewUrl: '#', license: 'royalty-free' },
  { id: 'mt-002', name: 'Calm Morning', artist: 'CF Library', genre: 'ambient', mood: 'calm', bpm: 80, durationSeconds: 30, previewUrl: '#', license: 'royalty-free' },
  { id: 'mt-003', name: 'Motivational Rise', artist: 'CF Library', genre: 'cinematic', mood: 'inspiring', bpm: 100, durationSeconds: 30, previewUrl: '#', license: 'royalty-free' },
  { id: 'mt-004', name: 'Trendy Bounce', artist: 'CF Library', genre: 'electronic', mood: 'fun', bpm: 140, durationSeconds: 30, previewUrl: '#', license: 'royalty-free' },
  { id: 'mt-005', name: 'Lo-Fi Chill', artist: 'CF Library', genre: 'lo-fi', mood: 'chill', bpm: 85, durationSeconds: 30, previewUrl: '#', license: 'royalty-free' },
];

// ============================================
// CF-091: Trending Audio Detection
// ============================================

export interface TrendingAudio {
  id: string;
  name: string;
  platform: string;
  usageCount: number;
  growthRate: number;
  category: string;
}

export function getTrendingAudios(platform: string = 'tiktok'): TrendingAudio[] {
  // Mock: In production, fetch from platform APIs
  return [
    { id: 'ta-001', name: 'Original Sound - viral_creator', platform, usageCount: 2500000, growthRate: 45, category: 'viral' },
    { id: 'ta-002', name: 'Oh No - Kreepa', platform, usageCount: 1800000, growthRate: 12, category: 'before-after' },
    { id: 'ta-003', name: 'Aesthetic ambient', platform, usageCount: 950000, growthRate: 28, category: 'routine' },
    { id: 'ta-004', name: 'Motivation speech clip', platform, usageCount: 750000, growthRate: 35, category: 'testimonial' },
    { id: 'ta-005', name: 'ASMR tapping', platform, usageCount: 500000, growthRate: 20, category: 'product-demo' },
  ];
}

// ============================================
// CF-092: AI Voiceover Generation (Mock)
// ============================================

export interface VoiceoverRequest {
  text: string;
  voice: string;
  speed: number;
  pitch: number;
}

export interface VoiceoverResult {
  audioUrl: string;
  durationSeconds: number;
  voice: string;
}

export const VOICEOVER_VOICES = [
  { id: 'vo-female-1', name: 'Sarah', gender: 'female', accent: 'American', style: 'friendly' },
  { id: 'vo-female-2', name: 'Emma', gender: 'female', accent: 'British', style: 'professional' },
  { id: 'vo-male-1', name: 'James', gender: 'male', accent: 'American', style: 'authoritative' },
  { id: 'vo-male-2', name: 'Alex', gender: 'male', accent: 'American', style: 'casual' },
];

export async function generateVoiceover(request: VoiceoverRequest): Promise<VoiceoverResult> {
  // Mock: In production, call ElevenLabs or similar API
  const wordCount = request.text.split(/\s+/).length;
  const duration = Math.round(wordCount / (request.speed * 2.5));
  return {
    audioUrl: `#voiceover-mock-${Date.now()}`,
    durationSeconds: duration,
    voice: request.voice,
  };
}

// ============================================
// CF-109: Copyright & Music Rights Verification
// ============================================

export interface CopyrightCheckResult {
  clean: boolean;
  issues: Array<{
    type: 'music' | 'image' | 'text';
    severity: 'clear' | 'review' | 'blocked';
    description: string;
  }>;
}

// ============================================
// CF-039/040/074/076/078: Platform Publishing
// ============================================

export interface PlatformPublishRequest {
  platform: 'tiktok' | 'instagram' | 'facebook';
  videoUrl: string;
  caption: string;
  hashtags: string[];
  disclosureEnabled?: boolean;
  scheduledAt?: Date;
}

export interface PlatformPublishResult {
  success: boolean;
  postId: string;
  postUrl: string;
  platform: string;
}

export async function publishToPlatform(request: PlatformPublishRequest): Promise<PlatformPublishResult> {
  // Mock: In production, call TikTok/Instagram/Facebook APIs
  const mockId = `mock_${request.platform}_${Date.now()}`;
  const urlMap: Record<string, string> = {
    tiktok: `https://www.tiktok.com/@user/video/${mockId}`,
    instagram: `https://www.instagram.com/reel/${mockId}`,
    facebook: `https://www.facebook.com/reel/${mockId}`,
  };

  console.log(`[CF] Publishing to ${request.platform}: ${request.caption.substring(0, 50)}...`);

  return {
    success: true,
    postId: mockId,
    postUrl: urlMap[request.platform] || urlMap.tiktok,
    platform: request.platform,
  };
}

// ============================================
// CF-043: TikTok Promote API
// ============================================

export interface PromoteRequest {
  postId: string;
  budgetCents: number;
  durationHours: number;
  targetAudience?: string;
  objective?: 'views' | 'engagement' | 'traffic';
}

export interface PromoteResult {
  promotionId: string;
  status: 'active' | 'pending' | 'completed';
  budgetCents: number;
  estimatedReach: number;
}

export async function promoteTikTokPost(request: PromoteRequest): Promise<PromoteResult> {
  // Mock: In production, call TikTok Promote API
  return {
    promotionId: `promo_${Date.now()}`,
    status: 'active',
    budgetCents: request.budgetCents,
    estimatedReach: Math.round(request.budgetCents * 20),
  };
}

// ============================================
// CF-045/046/075: Platform Metrics Collection
// ============================================

export interface PlatformMetrics {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reach: number;
  avgWatchPct: number;
  linkClicks: number;
  purchases: number;
}

export async function fetchTikTokMetrics(postId: string): Promise<PlatformMetrics> {
  // Mock: In production, call TikTok Analytics API
  return {
    views: Math.floor(Math.random() * 10000),
    likes: Math.floor(Math.random() * 500),
    comments: Math.floor(Math.random() * 50),
    shares: Math.floor(Math.random() * 100),
    saves: Math.floor(Math.random() * 200),
    reach: Math.floor(Math.random() * 15000),
    avgWatchPct: Math.floor(Math.random() * 40 + 30),
    linkClicks: Math.floor(Math.random() * 50),
    purchases: Math.floor(Math.random() * 5),
  };
}

export async function fetchInstagramMetrics(postId: string): Promise<PlatformMetrics> {
  // Mock: In production, call Instagram Graph API
  return {
    views: Math.floor(Math.random() * 8000),
    likes: Math.floor(Math.random() * 400),
    comments: Math.floor(Math.random() * 30),
    shares: Math.floor(Math.random() * 80),
    saves: Math.floor(Math.random() * 150),
    reach: Math.floor(Math.random() * 12000),
    avgWatchPct: Math.floor(Math.random() * 35 + 25),
    linkClicks: Math.floor(Math.random() * 30),
    purchases: Math.floor(Math.random() * 3),
  };
}

// ============================================
// CF-059: Remotion Integration
// ============================================

export interface RemotionRenderRequest {
  compositionId: string;
  inputProps: Record<string, any>;
  outputFormat: 'mp4' | 'webm';
  codec: string;
  fps: number;
}

export async function renderWithRemotion(request: RemotionRenderRequest): Promise<{ renderUrl: string; renderId: string }> {
  // Mock: In production, call Remotion Lambda or server
  return {
    renderUrl: `https://placehold.co/1080x1920/222/fff?text=Remotion+Render`,
    renderId: `render_${Date.now()}`,
  };
}

// ============================================
// CF-060: PCT Integration (hook sharing)
// ============================================

export interface PCTHookShare {
  hookId: string;
  hookText: string;
  awarenessLevel: number;
  performance: number;
  sharedAt: Date;
}

export async function shareHookWithPCT(hook: string, level: number, score: number): Promise<PCTHookShare> {
  // Mock: In production, call PCT API
  return {
    hookId: `pct_${Date.now()}`,
    hookText: hook,
    awarenessLevel: level,
    performance: score,
    sharedAt: new Date(),
  };
}

// ============================================
// CF-073: TikTok Shop Product Data Import
// ============================================

export interface TikTokShopProduct {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  shopUrl: string;
  category: string;
}

export async function importTikTokShopProducts(shopUrl: string): Promise<TikTokShopProduct[]> {
  // Mock: In production, scrape or use TikTok Shop API
  return [
    { id: 'tts-1', name: 'Sample Product', price: 29.99, imageUrl: '#', shopUrl, category: 'beauty' },
  ];
}

// ============================================
// CF-077: Instagram Shopping Tags
// ============================================

export async function addShoppingTags(postId: string, productIds: string[]): Promise<{ tagged: boolean }> {
  // Mock: In production, call Instagram Shopping API
  return { tagged: true };
}

// ============================================
// CF-115: Shopify Product Sync
// ============================================

export async function syncShopifyProducts(shopDomain: string, apiKey: string): Promise<{ products: Array<{ id: string; name: string; price: number }> }> {
  // Mock: In production, call Shopify Admin API
  return {
    products: [
      { id: 'shopify-1', name: 'Synced Product', price: 24.99 },
    ],
  };
}

// ============================================
// CF-116: CRM Integration
// ============================================

export async function syncCRMContacts(provider: string, apiKey: string): Promise<{ contacts: number; synced: boolean }> {
  // Mock: In production, call CRM API (HubSpot, Salesforce, etc.)
  return { contacts: 0, synced: true };
}

export function checkCopyrightStatus(audioId?: string, imageIds?: string[]): CopyrightCheckResult {
  // Mock: In production, check against content ID databases
  const issues: CopyrightCheckResult['issues'] = [];

  if (audioId && !audioId.startsWith('mt-')) {
    issues.push({
      type: 'music',
      severity: 'review',
      description: 'External audio source - verify licensing before commercial use',
    });
  }

  return {
    clean: issues.length === 0 || issues.every(i => i.severity === 'clear'),
    issues: issues.length > 0 ? issues : [{ type: 'music', severity: 'clear', description: 'All assets verified - clear for commercial use' }],
  };
}
