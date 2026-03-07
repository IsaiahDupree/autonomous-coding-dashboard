import { describe, it } from 'node:test';
import assert from 'node:assert';
import { buildEmailTags, parseEmailTags } from '../lib/email-tags.js';
import { NEWSLETTER_FUNNEL_SEGMENTS } from '../segments/newsletter-funnel.js';
import { OUTBOUND_FUNNEL_SEGMENTS } from '../segments/outbound-funnel.js';

describe('Email Tags (Key Rule #1)', () => {
  it('builds tags with person_id, campaign_id, funnel', () => {
    const tags = buildEmailTags({ personId: 'p-123', campaignId: 'camp-1', funnel: 'newsletter' });
    assert.strictEqual(tags.person_id, 'p-123');
    assert.strictEqual(tags.campaign_id, 'camp-1');
    assert.strictEqual(tags.funnel, 'newsletter');
  });

  it('requires personId', () => {
    assert.throws(() => buildEmailTags({}), /personId is required/);
  });

  it('parses tags back correctly', () => {
    const parsed = parseEmailTags({ person_id: 'p-1', campaign_id: 'c-1', funnel: 'outbound' });
    assert.strictEqual(parsed.personId, 'p-1');
    assert.strictEqual(parsed.campaignId, 'c-1');
    assert.strictEqual(parsed.funnel, 'outbound');
  });
});

describe('Newsletter Funnel Segments', () => {
  it('has exactly 10 segments', () => {
    assert.strictEqual(NEWSLETTER_FUNNEL_SEGMENTS.length, 10);
  });

  it('all segments have required fields', () => {
    for (const seg of NEWSLETTER_FUNNEL_SEGMENTS) {
      assert.ok(seg.slug, `Missing slug`);
      assert.ok(seg.name, `Missing name for ${seg.slug}`);
      assert.strictEqual(seg.funnel, 'newsletter');
      assert.ok(seg.query_sql, `Missing query_sql for ${seg.slug}`);
      assert.ok(seg.automation_type, `Missing automation_type for ${seg.slug}`);
    }
  });

  it('has unique slugs', () => {
    const slugs = NEWSLETTER_FUNNEL_SEGMENTS.map((s) => s.slug);
    assert.strictEqual(new Set(slugs).size, slugs.length);
  });

  it('bounced_complained segment is suppress type', () => {
    const seg = NEWSLETTER_FUNNEL_SEGMENTS.find((s) => s.slug === 'bounced_complained');
    assert.ok(seg);
    assert.strictEqual(seg.automation_type, 'suppress');
  });
});

describe('Outbound Funnel Segments', () => {
  it('has exactly 10 segments', () => {
    assert.strictEqual(OUTBOUND_FUNNEL_SEGMENTS.length, 10);
  });

  it('all segments have required fields', () => {
    for (const seg of OUTBOUND_FUNNEL_SEGMENTS) {
      assert.ok(seg.slug, `Missing slug`);
      assert.ok(seg.name, `Missing name for ${seg.slug}`);
      assert.strictEqual(seg.funnel, 'outbound');
      assert.ok(seg.query_sql, `Missing query_sql for ${seg.slug}`);
      assert.ok(seg.automation_type, `Missing automation_type for ${seg.slug}`);
    }
  });

  it('has unique slugs', () => {
    const slugs = OUTBOUND_FUNNEL_SEGMENTS.map((s) => s.slug);
    assert.strictEqual(new Set(slugs).size, slugs.length);
  });

  it('replied_positive routes to human', () => {
    const seg = OUTBOUND_FUNNEL_SEGMENTS.find((s) => s.slug === 'replied_positive');
    assert.ok(seg);
    assert.strictEqual(seg.automation_config.action, 'route_to_human');
  });
});

describe('Click Tracker', () => {
  it('generateTrackingUrl creates valid URLs', async () => {
    // Set env for testing
    process.env.TRACKING_DOMAIN = 'https://track.example.com';
    const { generateTrackingUrl } = await import('../edge-functions/click-tracker/index.js');
    const url = generateTrackingUrl({
      destinationUrl: 'https://example.com/page',
      personId: 'p-123',
      campaignId: 'c-1',
      funnel: 'newsletter',
    });
    assert.ok(url.startsWith('https://track.example.com/t/click?'));
    assert.ok(url.includes('url='));
    assert.ok(url.includes('pid=p-123'));
  });
});

describe('Resend Webhook Handler', () => {
  it('verifyWebhookSignature rejects missing headers', async () => {
    process.env.RESEND_WEBHOOK_SECRET = 'whsec_dGVzdA==';
    const { verifyWebhookSignature } = await import('../edge-functions/resend-webhook/index.js');
    await assert.rejects(
      () => verifyWebhookSignature('{}', {}),
      /Missing Svix headers/
    );
  });
});

describe('Stripe Webhook Handler', () => {
  it('verifyStripeSignature rejects missing secret', async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    // Re-import to get fresh module
    const mod = await import('../edge-functions/stripe-webhook/index.js');
    assert.throws(
      () => mod.verifyStripeSignature('{}', 't=123,v1=abc'),
      /Missing STRIPE_WEBHOOK_SECRET/
    );
  });
});

describe('Meta Pixel + CAPI', () => {
  it('getMetaCookies returns fbp/fbc from server context', async () => {
    const { getMetaCookies } = await import('../client/meta-pixel.js');
    const cookies = getMetaCookies();
    // In Node (no document), should return empty
    assert.deepStrictEqual(cookies, {});
  });
});

describe('GDPClient', () => {
  it('creates client with personId and email', async () => {
    const { createGDPClient } = await import('../client/gdp-client.js');
    const client = createGDPClient({ personId: 'p-1', email: 'test@example.com' });
    assert.strictEqual(client.personId, 'p-1');
    assert.strictEqual(client.email, 'test@example.com');
  });

  it('identify updates personId', async () => {
    const { createGDPClient } = await import('../client/gdp-client.js');
    const client = createGDPClient({ personId: 'p-1', email: 'a@b.com' });
    client.identify({ personId: 'p-2', email: 'c@d.com' });
    assert.strictEqual(client.personId, 'p-2');
    assert.strictEqual(client.email, 'c@d.com');
  });
});
