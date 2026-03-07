import crypto from 'node:crypto';
import { supabase, upsertPerson, insertEvent, getPersonByIdentity } from '../../lib/supabase.js';

const RESEND_WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET;

export async function verifyWebhookSignature(payload, headers) {
  if (!RESEND_WEBHOOK_SECRET) throw new Error('Missing RESEND_WEBHOOK_SECRET');

  const svixId = headers['svix-id'];
  const svixTimestamp = headers['svix-timestamp'];
  const svixSignature = headers['svix-signature'];

  if (!svixId || !svixTimestamp || !svixSignature) {
    throw new Error('Missing Svix headers');
  }

  const timestampSeconds = parseInt(svixTimestamp, 10);
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestampSeconds) > 300) {
    throw new Error('Webhook timestamp too old');
  }

  const signedContent = `${svixId}.${svixTimestamp}.${payload}`;
  const secretBytes = Buffer.from(RESEND_WEBHOOK_SECRET.replace('whsec_', ''), 'base64');
  const expected = crypto.createHmac('sha256', secretBytes).update(signedContent).digest('base64');

  const signatures = svixSignature.split(' ');
  const valid = signatures.some((sig) => {
    const sigValue = sig.split(',')[1] || sig;
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sigValue));
  });

  if (!valid) throw new Error('Invalid webhook signature');
}

export async function handleResendWebhook(body) {
  const { type, data } = body;

  const eventTypeMap = {
    'email.sent': 'email.sent',
    'email.delivered': 'email.delivered',
    'email.delivery_delayed': 'email.delivery_delayed',
    'email.complained': 'email.complained',
    'email.bounced': 'email.bounced',
    'email.opened': 'email.opened',
    'email.clicked': 'email.clicked',
  };

  const eventType = eventTypeMap[type];
  if (!eventType) return { status: 'ignored', type };

  const resendId = data.email_id || data.id;
  const toEmail = data.to?.[0] || data.email;
  const tags = data.tags || {};
  const personIdTag = tags.person_id;
  const campaignId = tags.campaign_id;
  const funnel = tags.funnel;

  let personId = personIdTag || null;

  if (!personId && toEmail) {
    const { data: person } = await supabase
      .from('gdp_person')
      .select('id')
      .eq('email', toEmail)
      .single();
    personId = person?.id || null;
  }

  if (!personId && toEmail) {
    personId = await upsertPerson({ email: toEmail, source: 'resend' });
  }

  if (resendId && personId) {
    await supabase
      .from('gdp_email_message')
      .upsert(
        {
          resend_id: resendId,
          person_id: personId,
          to_email: toEmail,
          campaign_id: campaignId,
          funnel,
          tags,
        },
        { onConflict: 'resend_id' }
      );
  }

  const { error: eventError } = await supabase.from('gdp_email_event').insert({
    resend_id: resendId,
    person_id: personId,
    event_type: eventType.replace('email.', ''),
    payload: data,
    timestamp: data.created_at || new Date().toISOString(),
  });
  if (eventError) console.error('Email event insert error:', eventError);

  await insertEvent({
    personId,
    source: 'resend',
    eventType,
    properties: {
      resend_id: resendId,
      campaign_id: campaignId,
      funnel,
      to_email: toEmail,
      ...(data.click?.url ? { click_url: data.click.url } : {}),
    },
  });

  return { status: 'processed', type: eventType, person_id: personId };
}

export async function handler(req) {
  if (req.method !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    await verifyWebhookSignature(rawBody, req.headers);
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const result = await handleResendWebhook(body);
    return { statusCode: 200, body: JSON.stringify(result) };
  } catch (err) {
    console.error('Resend webhook error:', err.message);
    return { statusCode: err.message.includes('signature') ? 401 : 500, body: err.message };
  }
}
