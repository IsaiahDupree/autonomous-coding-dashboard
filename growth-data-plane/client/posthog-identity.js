const POSTHOG_API_KEY = process.env.POSTHOG_API_KEY;
const POSTHOG_HOST = process.env.POSTHOG_HOST || 'https://app.posthog.com';

export function initPostHog() {
  if (typeof window === 'undefined') return null;
  if (!POSTHOG_API_KEY) {
    console.warn('[GDP] Missing POSTHOG_API_KEY — PostHog disabled');
    return null;
  }
  if (window.posthog) return window.posthog;
  console.warn('[GDP] PostHog not loaded — include posthog-js script first');
  return null;
}

export function identifyPerson(personId, { email, name, source } = {}) {
  const ph = initPostHog();
  if (!ph) return;

  ph.identify(personId, {
    ...(email ? { email } : {}),
    ...(name ? { name } : {}),
    ...(source ? { source } : {}),
    gdp_person_id: personId,
  });
}

export function trackEvent(eventName, properties = {}) {
  const ph = initPostHog();
  if (!ph) return;
  ph.capture(eventName, properties);
}

export function resetIdentity() {
  const ph = initPostHog();
  if (!ph) return;
  ph.reset();
}

// Server-side PostHog identify (for backend use)
export async function serverIdentify(personId, { email, distinctId }) {
  if (!POSTHOG_API_KEY) return;

  const body = {
    api_key: POSTHOG_API_KEY,
    distinct_id: distinctId || personId,
    properties: {
      $set: {
        email,
        gdp_person_id: personId,
      },
    },
    ...(distinctId && distinctId !== personId
      ? { $anon_distinct_id: distinctId }
      : {}),
  };

  await fetch(`${POSTHOG_HOST}/capture/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: POSTHOG_API_KEY,
      event: '$identify',
      ...body,
    }),
  });
}
