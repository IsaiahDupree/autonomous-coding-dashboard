import crypto from 'node:crypto';
import { supabase, insertEvent, getPersonByIdentity } from '../../lib/supabase.js';

const TRACKING_DOMAIN = process.env.TRACKING_DOMAIN || process.env.APP_BASE_URL;

export function generateTrackingUrl({ destinationUrl, personId, campaignId, funnel, linkId }) {
  const params = new URLSearchParams({
    url: destinationUrl,
    pid: personId || '',
    cid: campaignId || '',
    fn: funnel || '',
    lid: linkId || crypto.randomUUID(),
  });
  return `${TRACKING_DOMAIN}/t/click?${params.toString()}`;
}

export async function handleClickRedirect(req) {
  const url = new URL(req.url, `https://${req.headers?.host || 'localhost'}`);
  const destinationUrl = url.searchParams.get('url');
  const personId = url.searchParams.get('pid') || null;
  const campaignId = url.searchParams.get('cid') || null;
  const funnel = url.searchParams.get('fn') || null;
  const linkId = url.searchParams.get('lid') || null;

  if (!destinationUrl) {
    return { statusCode: 400, body: 'Missing url parameter' };
  }

  let safeUrl;
  try {
    safeUrl = new URL(destinationUrl);
    if (!['http:', 'https:'].includes(safeUrl.protocol)) {
      return { statusCode: 400, body: 'Invalid URL protocol' };
    }
  } catch {
    return { statusCode: 400, body: 'Invalid destination URL' };
  }

  const eventId = crypto.randomUUID();

  if (personId) {
    await insertEvent({
      personId,
      source: 'click_tracker',
      eventType: 'link.clicked',
      properties: {
        destination_url: destinationUrl,
        campaign_id: campaignId,
        funnel,
        link_id: linkId,
        event_id: eventId,
        referrer: req.headers?.referer || null,
        user_agent: req.headers?.['user-agent'] || null,
      },
    });
  }

  const cookieValue = personId || '';
  const setCookie = cookieValue
    ? `gdp_pid=${cookieValue}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`
    : null;

  return {
    statusCode: 302,
    headers: {
      Location: safeUrl.toString(),
      ...(setCookie ? { 'Set-Cookie': setCookie } : {}),
      'Cache-Control': 'no-store',
    },
    body: '',
  };
}

export async function handler(req) {
  if (req.method !== 'GET') {
    return { statusCode: 405, body: 'Method not allowed' };
  }
  return handleClickRedirect(req);
}
