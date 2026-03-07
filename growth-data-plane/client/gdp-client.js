import { identifyPerson, trackEvent } from './posthog-identity.js';
import { trackWithDedup, getMetaCookies } from './meta-pixel.js';

export class GDPClient {
  constructor({ personId, email, appBaseUrl }) {
    this.personId = personId;
    this.email = email;
    this.appBaseUrl = appBaseUrl || process.env.APP_BASE_URL || '';
  }

  identify({ personId, email, name, source }) {
    this.personId = personId || this.personId;
    this.email = email || this.email;
    identifyPerson(this.personId, { email: this.email, name, source });
  }

  async trackConversion(eventName, params = {}) {
    const { fbp, fbc } = getMetaCookies();
    const sourceUrl = typeof window !== 'undefined' ? window.location.href : '';

    trackEvent(`gdp_${eventName}`, { person_id: this.personId, ...params });

    await trackWithDedup(eventName, {
      email: this.email,
      personId: this.personId,
      sourceUrl,
      fbp,
      fbc,
      params,
    });
  }

  trackPageView(pagePath) {
    trackEvent('$pageview', { page: pagePath, person_id: this.personId });
  }

  async trackLead(params = {}) {
    await this.trackConversion('Lead', params);
  }

  async trackSignup(params = {}) {
    await this.trackConversion('CompleteRegistration', params);
  }

  async trackActivation(params = {}) {
    await this.trackConversion('StartTrial', params);
  }

  async trackPurchase({ value, currency = 'USD', ...params } = {}) {
    await this.trackConversion('Purchase', { value, currency, ...params });
  }

  async trackBooking(params = {}) {
    await this.trackConversion('Schedule', params);
  }
}

export function createGDPClient(opts) {
  return new GDPClient(opts);
}
