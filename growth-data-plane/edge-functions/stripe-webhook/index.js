import crypto from 'node:crypto';
import { supabase, upsertPerson, linkIdentity, insertEvent } from '../../lib/supabase.js';

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

export function verifyStripeSignature(payload, sigHeader) {
  if (!STRIPE_WEBHOOK_SECRET) throw new Error('Missing STRIPE_WEBHOOK_SECRET');

  const parts = sigHeader.split(',').reduce((acc, part) => {
    const [key, value] = part.split('=');
    acc[key] = value;
    return acc;
  }, {});

  const timestamp = parts.t;
  const signature = parts.v1;

  if (!timestamp || !signature) throw new Error('Invalid Stripe signature header');

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp, 10)) > 300) {
    throw new Error('Stripe webhook timestamp too old');
  }

  const signedPayload = `${timestamp}.${payload}`;
  const expected = crypto
    .createHmac('sha256', STRIPE_WEBHOOK_SECRET)
    .update(signedPayload)
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
    throw new Error('Invalid Stripe webhook signature');
  }
}

async function resolvePersonFromStripeCustomer(customerId, customerEmail) {
  const { data: link } = await supabase
    .from('gdp_identity_link')
    .select('person_id')
    .eq('provider', 'stripe')
    .eq('external_id', customerId)
    .single();

  if (link) return link.person_id;

  if (customerEmail) {
    const personId = await upsertPerson({ email: customerEmail, source: 'stripe' });
    await linkIdentity(personId, 'stripe', customerId);
    return personId;
  }

  return null;
}

export async function handleStripeWebhook(event) {
  const { type, data } = event;
  const obj = data.object;

  const handledTypes = [
    'checkout.session.completed',
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
    'invoice.paid',
    'invoice.payment_failed',
  ];

  if (!handledTypes.includes(type)) {
    return { status: 'ignored', type };
  }

  const customerId = obj.customer;
  const customerEmail = obj.customer_email || obj.customer_details?.email || obj.receipt_email;
  const personId = await resolvePersonFromStripeCustomer(customerId, customerEmail);

  if (!personId) {
    return { status: 'skipped', reason: 'no person resolved', type };
  }

  if (type.startsWith('customer.subscription.')) {
    const { error } = await supabase.from('gdp_subscription').upsert(
      {
        person_id: personId,
        stripe_customer_id: customerId,
        stripe_subscription_id: obj.id,
        status: obj.status,
        plan_id: obj.items?.data?.[0]?.price?.id || null,
        current_period_start: obj.current_period_start
          ? new Date(obj.current_period_start * 1000).toISOString()
          : null,
        current_period_end: obj.current_period_end
          ? new Date(obj.current_period_end * 1000).toISOString()
          : null,
        cancel_at: obj.cancel_at ? new Date(obj.cancel_at * 1000).toISOString() : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'stripe_subscription_id' }
    );
    if (error) console.error('Subscription upsert error:', error);
  }

  await insertEvent({
    personId,
    source: 'stripe',
    eventType: type,
    properties: {
      stripe_customer_id: customerId,
      stripe_subscription_id: obj.id || null,
      status: obj.status,
      amount: obj.amount_total || obj.amount_paid || null,
      currency: obj.currency || null,
    },
  });

  return { status: 'processed', type, person_id: personId };
}

export async function handler(req) {
  if (req.method !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const sigHeader = req.headers['stripe-signature'];
    if (!sigHeader) throw new Error('Missing stripe-signature header');

    verifyStripeSignature(rawBody, sigHeader);
    const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const result = await handleStripeWebhook(event);
    return { statusCode: 200, body: JSON.stringify(result) };
  } catch (err) {
    console.error('Stripe webhook error:', err.message);
    return { statusCode: err.message.includes('signature') ? 401 : 500, body: err.message };
  }
}
