import crypto from 'node:crypto';

const META_PIXEL_ID = process.env.META_PIXEL_ID;
const META_CAPI_ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN;
const META_TEST_EVENT_CODE = process.env.META_TEST_EVENT_CODE;

export function trackPixelEvent(eventName, params = {}) {
  if (typeof window === 'undefined' || !window.fbq) {
    console.warn('[GDP] Meta Pixel (fbq) not loaded');
    return null;
  }

  const eventId = crypto.randomUUID();
  window.fbq('track', eventName, params, { eventID: eventId });
  return eventId;
}

export async function sendCAPIEvent({
  eventName,
  eventId,
  email,
  personId,
  sourceUrl,
  fbp,
  fbc,
  userData = {},
}) {
  if (!META_PIXEL_ID || !META_CAPI_ACCESS_TOKEN) {
    console.warn('[GDP] Missing META_PIXEL_ID or META_CAPI_ACCESS_TOKEN — CAPI disabled');
    return null;
  }

  const hashedEmail = email
    ? crypto.createHash('sha256').update(email.trim().toLowerCase()).digest('hex')
    : undefined;

  const eventData = {
    event_name: eventName,
    event_time: Math.floor(Date.now() / 1000),
    event_id: eventId || crypto.randomUUID(),
    event_source_url: sourceUrl,
    action_source: 'website',
    user_data: {
      em: hashedEmail ? [hashedEmail] : undefined,
      external_id: personId ? [crypto.createHash('sha256').update(personId).digest('hex')] : undefined,
      fbp: fbp || undefined,
      fbc: fbc || undefined,
      ...userData,
    },
  };

  const url = `https://graph.facebook.com/v19.0/${META_PIXEL_ID}/events`;
  const body = {
    data: [eventData],
    access_token: META_CAPI_ACCESS_TOKEN,
    ...(META_TEST_EVENT_CODE ? { test_event_code: META_TEST_EVENT_CODE } : {}),
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[GDP] Meta CAPI error:', errorText);
    return null;
  }

  return eventData.event_id;
}

export async function trackWithDedup(eventName, { email, personId, sourceUrl, fbp, fbc, params = {} } = {}) {
  const eventId = trackPixelEvent(eventName, params);

  await sendCAPIEvent({
    eventName,
    eventId: eventId || crypto.randomUUID(),
    email,
    personId,
    sourceUrl,
    fbp,
    fbc,
  });

  return eventId;
}

export function getMetaCookies() {
  if (typeof document === 'undefined') return {};
  const cookies = document.cookie.split(';').reduce((acc, c) => {
    const [key, val] = c.trim().split('=');
    acc[key] = val;
    return acc;
  }, {});
  return {
    fbp: cookies._fbp || null,
    fbc: cookies._fbc || null,
  };
}
