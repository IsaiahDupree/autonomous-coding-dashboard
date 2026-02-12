/**
 * AI Generation Service for Programmatic Creative Testing
 * Uses Claude API to generate USPs, marketing angles, and hooks
 */

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

const MODEL = 'claude-sonnet-4-20250514';

interface ProductContext {
  name: string;
  description?: string;
  features?: string[];
  benefits?: string[];
  targetAudience?: string;
  pricePoint?: string;
  brandName?: string;
  brandVoice?: string;
  brandValues?: string;
}

interface VocEntry {
  content: string;
  source?: string;
  sentiment?: string;
}

interface HookGenerationParams {
  usp: string;
  angle: string;
  messagingFramework: string;
  awarenessLevel: number;
  marketSophistication: number;
  product: ProductContext;
  batchSize: number;
}

const FRAMEWORK_DESCRIPTIONS: Record<string, string> = {
  punchy: 'Short, impactful statements. Max 5-8 words. Punchy and memorable.',
  bold_statements: 'Provocative, attention-grabbing claims that challenge assumptions.',
  desire_future_states: 'Paint aspirational outcomes. Show what life looks like after using the product.',
  question_based: 'Engage through curiosity. Ask questions that make the reader think.',
  problem_agitation: 'Focus on pain points. Agitate the problem to create urgency.',
  social_proof: 'Testimonial-style. Sound like a real person sharing their experience.',
  urgency_scarcity: 'Create FOMO. Urgency, limited availability, time-sensitive.',
  educational: 'How-to style. Position as teaching or revealing information.',
};

const AWARENESS_DESCRIPTIONS: Record<number, string> = {
  1: 'UNAWARE - They do not know they have a problem. Lead with education about the problem itself.',
  2: 'PROBLEM AWARE - They know the problem but not the solutions. Agitate the problem and introduce the solution category.',
  3: 'SOLUTION AWARE - They know solutions exist but not your product. Differentiate your specific solution.',
  4: 'PRODUCT AWARE - They know your product but are not convinced. Overcome objections and build trust.',
  5: 'MOST AWARE - They are ready to buy. Lead with direct offers, deals, and urgency.',
};

const SOPHISTICATION_DESCRIPTIONS: Record<number, string> = {
  1: 'Level 1 - New category. Simply state what the product does. Be direct and clear.',
  2: 'Level 2 - Competition emerging. Make bigger/better claims. Emphasize superiority.',
  3: 'Level 3 - Crowded market. Focus on unique mechanism or method. What makes this different?',
  4: 'Level 4 - Skeptical market. Lead with proof, specificity, and concrete details.',
  5: 'Level 5 - Exhausted market. Focus on identification and tribe-building. "For people who..."',
};

export async function generateUSPs(
  product: ProductContext,
  vocEntries: VocEntry[]
): Promise<string[]> {
  const vocContext = vocEntries.length > 0
    ? `\n\nVoice of Customer data:\n${vocEntries.map(v => `- "${v.content}" (${v.source || 'unknown'}, ${v.sentiment || 'neutral'})`).join('\n')}`
    : '';

  const prompt = `You are an expert direct response copywriter specializing in identifying Unique Selling Propositions (USPs).

Analyze the following product and customer data to identify 5-8 compelling USPs.

Product: ${product.name}
Description: ${product.description || 'Not provided'}
Features: ${product.features?.join(', ') || 'Not provided'}
Benefits: ${product.benefits?.join(', ') || 'Not provided'}
Target Audience: ${product.targetAudience || 'Not provided'}
Price Point: ${product.pricePoint || 'Not provided'}
Brand: ${product.brandName || 'Not provided'}${vocContext}

Rules:
- Each USP should be a single, clear statement (5-15 words)
- Focus on what makes this product UNIQUE, not generic benefits
- Draw from actual customer language when possible
- Each USP should be independently testable as an ad angle

Return ONLY a JSON array of USP strings, nothing else.
Example: ["Impossible to overdo", "Works even with shaky hands", "Buildable coverage"]`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('Failed to parse USP response');
  return JSON.parse(jsonMatch[0]);
}

export async function generateAngles(
  usp: string,
  product: ProductContext,
  count: number = 8
): Promise<Array<{ content: string; category: string }>> {
  const prompt = `You are an expert direct response copywriter. Generate ${count} marketing angles from the following USP.

USP: "${usp}"
Product: ${product.name}
Description: ${product.description || 'Not provided'}
Target Audience: ${product.targetAudience || 'Not provided'}
Brand Voice: ${product.brandVoice || 'Not specified'}

Marketing angles are specific slices or interpretations of the USP that can be tested as independent ad concepts. Each angle should approach the USP from a different direction.

Categories:
- "emotional" - Appeals to feelings, aspirations, fears
- "functional" - Focuses on practical benefits, features, how it works
- "social_proof" - Leverages social validation, what others think/do

Rules:
- Each angle should be 5-20 words
- Each angle should be a distinct perspective on the USP
- Vary the categories across angles
- Make them concrete enough to generate ad copy from

Return ONLY a JSON array of objects with "content" and "category" fields.
Example: [{"content": "Beautiful even when applied blind", "category": "functional"}, {"content": "The confidence of flawless skin without trying", "category": "emotional"}]`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('Failed to parse angles response');
  return JSON.parse(jsonMatch[0]);
}

interface VideoScriptParams {
  hookContent: string;
  usp?: string;
  angle?: string;
  product: ProductContext;
  duration: '15s' | '30s' | '60s' | '90s';
  narratorStyle?: string;
}

interface VideoScriptResult {
  title: string;
  hook: string;
  lid: string;
  body: string;
  cta: string;
  fullScript: string;
  wordCount: number;
}

const DURATION_GUIDELINES: Record<string, { words: string; hookWords: string; bodyWords: string }> = {
  '15s': { words: '35-45', hookWords: '8-12', bodyWords: '15-20' },
  '30s': { words: '70-90', hookWords: '10-15', bodyWords: '35-50' },
  '60s': { words: '140-170', hookWords: '10-20', bodyWords: '80-110' },
  '90s': { words: '200-250', hookWords: '10-20', bodyWords: '130-170' },
};

export async function generateVideoScript(params: VideoScriptParams): Promise<VideoScriptResult> {
  const durationGuide = DURATION_GUIDELINES[params.duration] || DURATION_GUIDELINES['30s'];
  const narratorDesc = params.narratorStyle
    ? `Write in the voice of a ${params.narratorStyle} narrator.`
    : 'Write in a conversational, engaging tone.';

  const prompt = `You are an expert video ad scriptwriter creating Facebook/Instagram video ad scripts.

CONTEXT:
Product: ${params.product.name}
Description: ${params.product.description || 'Not provided'}
Brand Voice: ${params.product.brandVoice || 'Not specified'}
Target Audience: ${params.product.targetAudience || 'Not specified'}
${params.usp ? `USP: "${params.usp}"` : ''}
${params.angle ? `Marketing Angle: "${params.angle}"` : ''}

WINNING HOOK (use this as the opening):
"${params.hookContent}"

TARGET DURATION: ${params.duration} (approximately ${durationGuide.words} total words)
${narratorDesc}

SCRIPT STRUCTURE:
1. **HOOK** (first 3 seconds): The attention-grabbing opening. Use or adapt the winning hook above. ${durationGuide.hookWords} words.
2. **LID** (next 3-5 seconds): Bridge from the hook to the main message. Create curiosity or establish relevance. 10-20 words.
3. **BODY** (main content): Deliver the core message, benefits, proof, or story. ${durationGuide.bodyWords} words.
4. **CTA** (final 3-5 seconds): Clear call to action. 8-15 words.

RULES:
- Every sentence should earn its place - no filler
- Write for SPOKEN delivery (short sentences, conversational)
- Include [visual direction] notes in brackets where helpful
- The hook must stop the scroll in the first 3 seconds
- The CTA should create urgency or clear next step

Return ONLY a JSON object with these fields:
{
  "title": "Short descriptive title for this script",
  "hook": "The hook section text",
  "lid": "The lid section text",
  "body": "The body section text",
  "cta": "The CTA section text"
}`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Failed to parse video script response');

  const parsed = JSON.parse(jsonMatch[0]);
  const fullScript = `HOOK:\n${parsed.hook}\n\nLID:\n${parsed.lid}\n\nBODY:\n${parsed.body}\n\nCTA:\n${parsed.cta}`;
  const wordCount = fullScript.replace(/\[.*?\]/g, '').split(/\s+/).filter(Boolean).length;

  return {
    title: parsed.title,
    hook: parsed.hook,
    lid: parsed.lid,
    body: parsed.body,
    cta: parsed.cta,
    fullScript,
    wordCount,
  };
}

export async function generateHooks(params: HookGenerationParams): Promise<string[]> {
  const frameworkDesc = FRAMEWORK_DESCRIPTIONS[params.messagingFramework] || params.messagingFramework;
  const awarenessDesc = AWARENESS_DESCRIPTIONS[params.awarenessLevel] || `Level ${params.awarenessLevel}`;
  const sophisticationDesc = SOPHISTICATION_DESCRIPTIONS[params.marketSophistication] || `Level ${params.marketSophistication}`;

  const prompt = `You are an expert direct response copywriter creating ad hooks for Facebook ads.

CONTEXT:
Product: ${params.product.name}
Description: ${params.product.description || 'Not provided'}
Brand Voice: ${params.product.brandVoice || 'Not specified'}

PARAMETERS:
USP: "${params.usp}"
Marketing Angle: "${params.angle}"
Messaging Framework: ${frameworkDesc}
Customer Awareness: ${awarenessDesc}
Market Sophistication: ${sophisticationDesc}

TASK:
Generate exactly ${params.batchSize} unique ad hooks that:
1. Are based on the given USP and marketing angle
2. Follow the ${params.messagingFramework} messaging framework style
3. Are appropriate for the ${awarenessDesc.split(' - ')[0]} awareness level
4. Match the market sophistication strategy
5. Are short enough for ad headlines (typically 5-15 words)
6. Are attention-grabbing and scroll-stopping
7. Each hook should be distinct - do not repeat the same idea

Return ONLY a JSON array of hook strings, nothing else.`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('Failed to parse hooks response');
  return JSON.parse(jsonMatch[0]);
}
