/**
 * Advanced Integrations Service (CF-WC-141 through CF-WC-155)
 *
 * Handles integrations with third-party services:
 * - Stripe billing (CF-WC-141)
 * - Supabase Edge Functions (CF-WC-142)
 * - File upload to Supabase Storage (CF-WC-143)
 * - Real-time subscriptions (CF-WC-144)
 * - OpenAI/Claude AI integration (CF-WC-145)
 * - Social OAuth providers (CF-WC-146)
 * - CSV/Excel data import (CF-WC-147)
 * - PDF report generation (CF-WC-148)
 * - Slack/Discord notifications (CF-WC-149)
 * - Calendar integration (CF-WC-150)
 * - Email template system (CF-WC-151)
 * - Webhook incoming handler (CF-WC-152)
 * - S3/Storage CDN for assets (CF-WC-153)
 * - Search with Supabase FTS (CF-WC-154)
 * - Cron/scheduled jobs (CF-WC-155)
 */

import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { parse } from 'csv-parse/sync';
import PDFDocument from 'pdfkit';

const prisma = new PrismaClient();

// ============================================
// Stripe Billing Integration (CF-WC-141)
// ============================================

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20.acacia',
});

/**
 * Create Stripe customer
 */
export async function createStripeCustomer(
  userId: string,
  email: string
): Promise<{ customerId: string }> {
  const customer = await stripe.customers.create({
    email,
    metadata: { userId },
  });

  await prisma.cf_stripe_customers.create({
    data: {
      userId,
      customerId: customer.id,
      email,
    },
  });

  return { customerId: customer.id };
}

/**
 * Create subscription
 */
export async function createSubscription(
  userId: string,
  priceId: string
): Promise<{ subscriptionId: string; clientSecret: string }> {
  const customerRecord = await prisma.cf_stripe_customers.findUnique({
    where: { userId },
  });

  if (!customerRecord) {
    throw new Error('Customer not found');
  }

  const subscription = await stripe.subscriptions.create({
    customer: customerRecord.customerId,
    items: [{ price: priceId }],
    payment_behavior: 'default_incomplete',
    payment_settings: { save_default_payment_method: 'on_subscription' },
    expand: ['latest_invoice.payment_intent'],
  });

  const invoice = subscription.latest_invoice as Stripe.Invoice;
  const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent;

  await prisma.cf_subscriptions.create({
    data: {
      userId,
      subscriptionId: subscription.id,
      priceId,
      status: subscription.status,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    },
  });

  return {
    subscriptionId: subscription.id,
    clientSecret: paymentIntent.client_secret!,
  };
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(
  subscriptionId: string
): Promise<void> {
  await stripe.subscriptions.cancel(subscriptionId);

  await prisma.cf_subscriptions.update({
    where: { subscriptionId },
    data: { status: 'canceled', canceledAt: new Date() },
  });
}

// ============================================
// Supabase Edge Functions (CF-WC-142)
// ============================================

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

/**
 * Invoke Supabase Edge Function
 */
export async function invokeEdgeFunction<T>(
  functionName: string,
  payload: any
): Promise<{ data: T; error?: string }> {
  const { data, error } = await supabase.functions.invoke(functionName, {
    body: payload,
  });

  if (error) {
    return { data: null as any, error: error.message };
  }

  return { data };
}

// ============================================
// File Upload to Supabase Storage (CF-WC-143)
// ============================================

/**
 * Upload file to Supabase Storage
 */
export async function uploadFile(
  file: Buffer,
  fileName: string,
  bucket: string = 'content-factory'
): Promise<{ url: string; path: string }> {
  // Validate file size (max 50MB)
  if (file.length > 50 * 1024 * 1024) {
    throw new Error('File too large (max 50MB)');
  }

  // Generate unique path
  const timestamp = Date.now();
  const path = `uploads/${timestamp}-${fileName}`;

  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: getContentType(fileName),
    upsert: false,
  });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);

  return {
    url: urlData.publicUrl,
    path,
  };
}

/**
 * Delete file from storage
 */
export async function deleteFile(
  path: string,
  bucket: string = 'content-factory'
): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove([path]);

  if (error) {
    throw new Error(`Delete failed: ${error.message}`);
  }
}

// ============================================
// Real-Time Subscriptions (CF-WC-144)
// ============================================

/**
 * Subscribe to real-time changes
 */
export function subscribeToTable(
  table: string,
  callback: (payload: any) => void
): () => void {
  const channel = supabase
    .channel(`${table}-changes`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table,
      },
      callback
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel);
  };
}

// ============================================
// OpenAI/Claude AI Integration (CF-WC-145)
// ============================================

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

/**
 * Generate content using Claude
 */
export async function generateWithClaude(
  prompt: string,
  systemPrompt?: string
): Promise<{ content: string; usage: any }> {
  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const content = message.content[0].type === 'text' ? message.content[0].text : '';

  return {
    content,
    usage: message.usage,
  };
}

// ============================================
// Social OAuth Providers (CF-WC-146)
// ============================================

/**
 * Initialize OAuth flow
 */
export function getOAuthUrl(
  provider: 'google' | 'github',
  redirectUri: string
): string {
  const configs = {
    google: {
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      scope: 'openid email profile',
    },
    github: {
      authUrl: 'https://github.com/login/oauth/authorize',
      clientId: process.env.GITHUB_CLIENT_ID || '',
      scope: 'user:email',
    },
  };

  const config = configs[provider];
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: config.scope,
  });

  return `${config.authUrl}?${params.toString()}`;
}

// ============================================
// CSV/Excel Data Import (CF-WC-147)
// ============================================

/**
 * Import dossiers from CSV
 */
export async function importDossiersFromCSV(
  csvContent: string
): Promise<{ imported: number; errors: string[] }> {
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
  });

  let imported = 0;
  const errors: string[] = [];

  for (const record of records) {
    try {
      await prisma.cf_product_dossiers.create({
        data: {
          slug: slugify(record.name),
          name: record.name,
          benefits: record.benefits?.split('|') || [],
          painPoints: record.painPoints?.split('|') || [],
          category: record.category,
          price: parseFloat(record.price) || 0,
          status: 'draft',
        },
      });
      imported++;
    } catch (error) {
      errors.push(`Failed to import ${record.name}: ${(error as Error).message}`);
    }
  }

  return { imported, errors };
}

// ============================================
// PDF Report Generation (CF-WC-148)
// ============================================

/**
 * Generate PDF report
 */
export async function generatePDFReport(data: {
  title: string;
  sections: Array<{ heading: string; content: string }>;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Title
    doc.fontSize(20).text(data.title, { align: 'center' });
    doc.moveDown();

    // Sections
    data.sections.forEach((section) => {
      doc.fontSize(16).text(section.heading);
      doc.fontSize(12).text(section.content);
      doc.moveDown();
    });

    doc.end();
  });
}

// ============================================
// Slack/Discord Notifications (CF-WC-149)
// ============================================

/**
 * Send Slack notification
 */
export async function sendSlackNotification(
  webhookUrl: string,
  message: {
    text: string;
    blocks?: any[];
  }
): Promise<void> {
  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  });
}

/**
 * Send Discord notification
 */
export async function sendDiscordNotification(
  webhookUrl: string,
  message: {
    content: string;
    embeds?: any[];
  }
): Promise<void> {
  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  });
}

// ============================================
// Calendar Integration (CF-WC-150)
// ============================================

/**
 * Create calendar event (Google Calendar)
 */
export async function createCalendarEvent(
  accessToken: string,
  event: {
    summary: string;
    description?: string;
    start: Date;
    end: Date;
  }
): Promise<{ eventId: string; url: string }> {
  const response = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: event.summary,
        description: event.description,
        start: { dateTime: event.start.toISOString() },
        end: { dateTime: event.end.toISOString() },
      }),
    }
  );

  const data = await response.json();

  return {
    eventId: data.id,
    url: data.htmlLink,
  };
}

// ============================================
// Email Template System (CF-WC-151)
// ============================================

/**
 * Render email template
 */
export function renderEmailTemplate(
  templateName: string,
  variables: Record<string, string>
): string {
  const templates: Record<string, string> = {
    welcome: `
      <h1>Welcome to Content Factory!</h1>
      <p>Hi {{name}},</p>
      <p>Thanks for signing up. Get started by creating your first product dossier.</p>
      <a href="{{dashboardUrl}}">Go to Dashboard</a>
    `,
    content_published: `
      <h1>Content Published!</h1>
      <p>Your content "{{contentName}}" has been published to {{platform}}.</p>
      <p><a href="{{contentUrl}}">View on {{platform}}</a></p>
    `,
    winner_identified: `
      <h1>Winner Identified!</h1>
      <p>Your content "{{contentName}}" is performing exceptionally well!</p>
      <p>Score: {{score}} | Views: {{views}} | Engagement: {{engagement}}%</p>
    `,
  };

  let template = templates[templateName] || '';

  // Replace variables
  Object.entries(variables).forEach(([key, value]) => {
    template = template.replace(new RegExp(`{{${key}}}`, 'g'), value);
  });

  return template;
}

/**
 * Send templated email
 */
export async function sendTemplatedEmail(
  to: string,
  templateName: string,
  variables: Record<string, string>
): Promise<void> {
  const html = renderEmailTemplate(templateName, variables);

  // TODO: Integrate with SendGrid, AWS SES, etc.
  console.log(`Sending email to ${to}:`, html);
}

// ============================================
// Webhook Incoming Handler (CF-WC-152)
// ============================================

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const crypto = require('crypto');
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return signature === expectedSignature;
}

/**
 * Handle incoming webhook
 */
export async function handleIncomingWebhook(
  provider: string,
  event: string,
  payload: any
): Promise<{ processed: boolean }> {
  // Store webhook event
  await prisma.cf_webhook_events.create({
    data: {
      provider,
      event,
      payload,
      processedAt: null,
    },
  });

  // Process based on provider
  switch (provider) {
    case 'stripe':
      await handleStripeWebhook(event, payload);
      break;
    case 'tiktok':
      await handleTikTokWebhook(event, payload);
      break;
    default:
      console.log(`Unknown webhook provider: ${provider}`);
  }

  return { processed: true };
}

async function handleStripeWebhook(event: string, payload: any): Promise<void> {
  if (event === 'customer.subscription.updated') {
    await prisma.cf_subscriptions.update({
      where: { subscriptionId: payload.id },
      data: { status: payload.status },
    });
  }
}

async function handleTikTokWebhook(event: string, payload: any): Promise<void> {
  // Handle TikTok events (video published, metrics updated, etc.)
  console.log('TikTok webhook:', event, payload);
}

// ============================================
// S3/Storage CDN for Assets (CF-WC-153)
// ============================================

/**
 * Upload to S3 with CDN
 */
export async function uploadToS3CDN(
  file: Buffer,
  key: string,
  contentType: string
): Promise<{ url: string; cdnUrl: string }> {
  // Use Supabase Storage (which has CDN built-in)
  const { url, path } = await uploadFile(file, key);

  return {
    url,
    cdnUrl: url, // Supabase Storage URLs are CDN-backed
  };
}

// ============================================
// Search with Supabase FTS (CF-WC-154)
// ============================================

/**
 * Full-text search across dossiers
 */
export async function searchDossiers(
  query: string,
  limit: number = 20
): Promise<any[]> {
  // Use the search_vector column created in migration 005
  const results = await prisma.$queryRaw`
    SELECT
      id,
      name,
      category,
      niche,
      ts_rank(search_vector, plainto_tsquery('english', ${query})) AS rank
    FROM cf_product_dossiers
    WHERE search_vector @@ plainto_tsquery('english', ${query})
      AND deleted_at IS NULL
    ORDER BY rank DESC
    LIMIT ${limit}
  `;

  return results as any[];
}

/**
 * Search scripts
 */
export async function searchScripts(
  query: string,
  limit: number = 20
): Promise<any[]> {
  const results = await prisma.$queryRaw`
    SELECT
      id,
      dossier_id,
      awareness_level,
      hook,
      ts_rank(search_vector, plainto_tsquery('english', ${query})) AS rank
    FROM cf_scripts
    WHERE search_vector @@ plainto_tsquery('english', ${query})
    ORDER BY rank DESC
    LIMIT ${limit}
  `;

  return results as any[];
}

// ============================================
// Cron/Scheduled Jobs (CF-WC-155)
// ============================================

/**
 * Schedule periodic job
 */
export async function scheduleJob(
  name: string,
  schedule: string, // cron format
  handler: () => Promise<void>
): Promise<void> {
  // Store job definition
  await prisma.cf_scheduled_jobs.create({
    data: {
      name,
      schedule,
      enabled: true,
      lastRunAt: null,
      nextRunAt: calculateNextRun(schedule),
    },
  });

  // In production, use a proper job scheduler like:
  // - Supabase pg_cron extension
  // - GitHub Actions scheduled workflows
  // - AWS EventBridge
  // - Vercel Cron Jobs
}

/**
 * Run scheduled jobs (called by cron)
 */
export async function runScheduledJobs(): Promise<void> {
  const now = new Date();

  const jobs = await prisma.cf_scheduled_jobs.findMany({
    where: {
      enabled: true,
      nextRunAt: { lte: now },
    },
  });

  for (const job of jobs) {
    console.log(`Running job: ${job.name}`);

    try {
      // Execute job based on name
      await executeJob(job.name);

      // Update last run
      await prisma.cf_scheduled_jobs.update({
        where: { id: job.id },
        data: {
          lastRunAt: now,
          nextRunAt: calculateNextRun(job.schedule),
        },
      });
    } catch (error) {
      console.error(`Job ${job.name} failed:`, error);
    }
  }
}

async function executeJob(jobName: string): Promise<void> {
  switch (jobName) {
    case 'metrics_sync':
      // Sync metrics from platforms
      break;
    case 'retention_cleanup':
      // Run data retention cleanup
      const { applyRetentionPolicies } = await import('./data-retention');
      await applyRetentionPolicies();
      break;
    case 'refresh_materialized_views':
      await prisma.$executeRaw`REFRESH MATERIALIZED VIEW CONCURRENTLY cf_dossier_stats`;
      break;
    default:
      console.log(`Unknown job: ${jobName}`);
  }
}

function calculateNextRun(cronSchedule: string): Date {
  // Simple cron parser (in production, use a library like node-cron)
  const now = new Date();
  now.setHours(now.getHours() + 1); // Default: 1 hour from now
  return now;
}

// ============================================
// Helper Functions
// ============================================

function getContentType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  const types: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    mp4: 'video/mp4',
    pdf: 'application/pdf',
    csv: 'text/csv',
  };
  return types[ext || ''] || 'application/octet-stream';
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
