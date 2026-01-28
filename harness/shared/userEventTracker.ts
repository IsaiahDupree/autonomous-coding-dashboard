/**
 * User Event Tracker - Client-Side SDK
 * =====================================
 * 
 * Lightweight client-side event tracking library for web applications.
 * Drop this into any target web app for sophisticated user analytics.
 * 
 * Usage:
 * ```typescript
 * import { tracker } from '@acd/user-event-tracker';
 * 
 * // Initialize
 * tracker.init({ projectId: 'my-project' });
 * 
 * // Identify user
 * tracker.identify('user-123', { email: 'user@example.com', plan: 'pro' });
 * 
 * // Track events
 * tracker.track('button_clicked', { buttonId: 'signup-cta' });
 * tracker.trackPageView();
 * tracker.trackConversion('purchase', 99.99, { orderId: 'ORD-123' });
 * ```
 */

// ==================== Types ====================

export interface TrackerConfig {
  projectId: string;
  apiEndpoint?: string;
  debug?: boolean;
  autoTrack?: {
    pageViews?: boolean;
    clicks?: boolean;
    scrollDepth?: boolean;
    forms?: boolean;
    errors?: boolean;
    performance?: boolean;
    outboundLinks?: boolean;
  };
  sessionTimeout?: number;
  batchSize?: number;
  flushInterval?: number;
  respectDoNotTrack?: boolean;
  maskSelectors?: string[];
  excludePaths?: RegExp[];
}

export interface UserTraits {
  email?: string;
  name?: string;
  plan?: string;
  [key: string]: any;
}

export interface EventProperties {
  [key: string]: string | number | boolean | null | undefined | object;
}

interface QueuedEvent {
  type: string;
  name: string;
  properties: EventProperties;
  timestamp: string;
  userId?: string;
  anonymousId: string;
  sessionId: string;
  pageUrl: string;
  pageTitle: string;
  referrer: string;
}

// ==================== Utilities ====================

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getStorageItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function setStorageItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Silent fail for privacy modes
  }
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? match[2] : null;
}

function setCookie(name: string, value: string, days: number): void {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`;
}

function getDeviceType(): 'desktop' | 'tablet' | 'mobile' {
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return 'tablet';
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) return 'mobile';
  return 'desktop';
}

function getUTMParams(): Record<string, string> {
  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(key => {
    const value = params.get(key);
    if (value) utm[key.replace('utm_', '')] = value;
  });
  return utm;
}

// ==================== Core Tracker ====================

class UserEventTracker {
  private config: TrackerConfig | null = null;
  private userId: string | null = null;
  private anonymousId: string;
  private sessionId: string;
  private userTraits: UserTraits = {};
  private eventQueue: QueuedEvent[] = [];
  private flushTimer: number | null = null;
  private initialized = false;
  private sessionStart: number;
  private lastActivity: number;
  private scrollDepth = 0;
  private formStartTimes: Map<string, number> = new Map();

  constructor() {
    this.anonymousId = this.getOrCreateAnonymousId();
    this.sessionId = this.getOrCreateSessionId();
    this.sessionStart = Date.now();
    this.lastActivity = Date.now();
  }

  // ==================== Initialization ====================

  init(config: TrackerConfig): void {
    if (this.initialized) {
      if (config.debug) console.log('[Tracker] Already initialized');
      return;
    }

    this.config = {
      debug: false,
      sessionTimeout: 30,
      batchSize: 10,
      flushInterval: 5000,
      respectDoNotTrack: true,
      autoTrack: {
        pageViews: true,
        clicks: true,
        scrollDepth: true,
        forms: true,
        errors: true,
        performance: true,
        outboundLinks: true,
      },
      ...config,
    };

    // Check Do Not Track
    if (this.config.respectDoNotTrack && navigator.doNotTrack === '1') {
      if (this.config.debug) console.log('[Tracker] Respecting Do Not Track');
      return;
    }

    this.initialized = true;
    this.setupAutoTracking();
    this.startFlushTimer();
    this.trackSessionStart();

    if (this.config.debug) {
      console.log('[Tracker] Initialized with config:', this.config);
    }
  }

  // ==================== User Identification ====================

  identify(userId: string, traits?: UserTraits): void {
    this.userId = userId;
    this.userTraits = { ...this.userTraits, ...traits };
    
    // Store for persistence
    setStorageItem('_acd_uid', userId);
    if (traits) {
      setStorageItem('_acd_traits', JSON.stringify(traits));
    }

    this.track('$identify', { userId, ...traits });
    this.log('Identified user:', userId, traits);
  }

  alias(newId: string, previousId?: string): void {
    const previous = previousId || this.anonymousId;
    this.track('$alias', { newId, previousId: previous });
    this.userId = newId;
  }

  reset(): void {
    this.userId = null;
    this.userTraits = {};
    this.anonymousId = generateId();
    setStorageItem('_acd_anon', this.anonymousId);
    localStorage.removeItem('_acd_uid');
    localStorage.removeItem('_acd_traits');
    this.track('$reset', {});
  }

  // ==================== Event Tracking ====================

  track(eventName: string, properties: EventProperties = {}): void {
    if (!this.initialized) {
      this.log('Tracker not initialized, queueing event:', eventName);
    }

    this.updateActivity();

    const event: QueuedEvent = {
      type: 'track',
      name: eventName,
      properties: {
        ...properties,
        ...this.getAutoProperties(),
      },
      timestamp: new Date().toISOString(),
      userId: this.userId || undefined,
      anonymousId: this.anonymousId,
      sessionId: this.sessionId,
      pageUrl: window.location.href,
      pageTitle: document.title,
      referrer: document.referrer,
    };

    this.eventQueue.push(event);
    this.log('Tracked:', eventName, properties);

    if (this.eventQueue.length >= (this.config?.batchSize || 10)) {
      this.flush();
    }
  }

  // ==================== Convenience Methods ====================

  trackPageView(properties: EventProperties = {}): void {
    this.track('$pageview', {
      path: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
      title: document.title,
      referrer: document.referrer,
      ...properties,
    });
  }

  trackClick(element: HTMLElement, properties: EventProperties = {}): void {
    const masked = this.shouldMask(element);
    
    this.track('$click', {
      element: element.tagName.toLowerCase(),
      elementId: element.id || undefined,
      elementClass: element.className || undefined,
      elementText: masked ? '[masked]' : this.truncate(element.textContent || '', 100),
      href: (element as HTMLAnchorElement).href || undefined,
      ...properties,
    });
  }

  trackFormSubmit(formId: string, properties: EventProperties = {}): void {
    const startTime = this.formStartTimes.get(formId);
    const duration = startTime ? Date.now() - startTime : undefined;

    this.track('$form_submit', {
      formId,
      duration,
      ...properties,
    });

    this.formStartTimes.delete(formId);
  }

  trackFormStart(formId: string): void {
    this.formStartTimes.set(formId, Date.now());
    this.track('$form_start', { formId });
  }

  trackConversion(name: string, value?: number, properties: EventProperties = {}): void {
    this.track('$conversion', {
      conversionName: name,
      value,
      currency: properties.currency || 'USD',
      ...properties,
    });
  }

  trackError(error: Error | string, properties: EventProperties = {}): void {
    const errorObj = typeof error === 'string' ? { message: error } : {
      message: error.message,
      stack: error.stack,
      name: error.name,
    };

    this.track('$error', {
      ...errorObj,
      ...properties,
    });
  }

  trackPerformance(metric: string, value: number, rating?: string): void {
    this.track('$performance', {
      metric,
      value,
      rating: rating || this.getPerformanceRating(metric, value),
    });
  }

  trackFeatureFlag(flagKey: string, variant: string): void {
    this.track('$feature_flag', { flagKey, variant });
  }

  trackExperiment(experimentId: string, variant: string, experimentName?: string): void {
    this.track('$experiment', {
      experimentId,
      experimentName,
      variant,
    });
  }

  trackScrollDepth(depth: number): void {
    if (depth > this.scrollDepth) {
      this.scrollDepth = depth;
      this.track('$scroll_depth', { depth, maxDepth: this.scrollDepth });
    }
  }

  trackOutboundLink(url: string, element?: HTMLAnchorElement): void {
    this.track('$outbound_link', {
      url,
      text: element?.textContent?.trim() || undefined,
    });
  }

  // ==================== Auto Tracking Setup ====================

  private setupAutoTracking(): void {
    if (!this.config?.autoTrack) return;

    const { autoTrack } = this.config;

    // Page Views (SPA support)
    if (autoTrack.pageViews) {
      this.trackPageView();

      // Listen for pushState/replaceState
      const originalPushState = history.pushState;
      const originalReplaceState = history.replaceState;
      
      history.pushState = (...args) => {
        originalPushState.apply(history, args);
        setTimeout(() => this.trackPageView(), 0);
      };
      
      history.replaceState = (...args) => {
        originalReplaceState.apply(history, args);
        setTimeout(() => this.trackPageView(), 0);
      };

      window.addEventListener('popstate', () => this.trackPageView());
    }

    // Click Tracking
    if (autoTrack.clicks) {
      document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (this.isTrackableClick(target)) {
          this.trackClick(target);
        }
      }, { passive: true });
    }

    // Scroll Depth
    if (autoTrack.scrollDepth) {
      let ticking = false;
      window.addEventListener('scroll', () => {
        if (!ticking) {
          requestAnimationFrame(() => {
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const depth = Math.round((scrollTop / docHeight) * 100);
            
            // Track at 25%, 50%, 75%, 100%
            const thresholds = [25, 50, 75, 100];
            for (const threshold of thresholds) {
              if (depth >= threshold && this.scrollDepth < threshold) {
                this.trackScrollDepth(threshold);
                break;
              }
            }
            ticking = false;
          });
          ticking = true;
        }
      }, { passive: true });
    }

    // Form Tracking
    if (autoTrack.forms) {
      document.addEventListener('focusin', (e) => {
        const target = e.target as HTMLElement;
        const form = target.closest('form');
        if (form) {
          const formId = form.id || form.name || 'anonymous_form';
          if (!this.formStartTimes.has(formId)) {
            this.trackFormStart(formId);
          }
        }
      }, { passive: true });

      document.addEventListener('submit', (e) => {
        const form = e.target as HTMLFormElement;
        const formId = form.id || form.name || 'anonymous_form';
        this.trackFormSubmit(formId);
      }, { passive: true });
    }

    // Error Tracking
    if (autoTrack.errors) {
      window.addEventListener('error', (e) => {
        this.trackError(e.error || e.message, {
          filename: e.filename,
          lineno: e.lineno,
          colno: e.colno,
        });
      });

      window.addEventListener('unhandledrejection', (e) => {
        this.trackError(`Unhandled Promise Rejection: ${e.reason}`, {
          type: 'unhandledrejection',
        });
      });
    }

    // Performance Tracking (Core Web Vitals)
    if (autoTrack.performance) {
      this.trackCoreWebVitals();
    }

    // Outbound Links
    if (autoTrack.outboundLinks) {
      document.addEventListener('click', (e) => {
        const target = (e.target as HTMLElement).closest('a') as HTMLAnchorElement;
        if (target && this.isOutboundLink(target.href)) {
          this.trackOutboundLink(target.href, target);
        }
      }, { passive: true });
    }

    // Session end tracking
    window.addEventListener('beforeunload', () => {
      this.track('$session_end', {
        duration: Date.now() - this.sessionStart,
        pageViews: this.getSessionPageViews(),
        scrollDepth: this.scrollDepth,
      });
      this.flush();
    });

    // Visibility change for engagement
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.track('$page_hide', {});
      } else {
        this.track('$page_show', {});
        this.checkSessionTimeout();
      }
    });
  }

  private trackCoreWebVitals(): void {
    // Use PerformanceObserver for Core Web Vitals
    if ('PerformanceObserver' in window) {
      // LCP
      try {
        const lcpObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          this.trackPerformance('LCP', lastEntry.startTime);
        });
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
      } catch { /* Not supported */ }

      // FID
      try {
        const fidObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          const firstEntry = entries[0] as any;
          this.trackPerformance('FID', firstEntry.processingStart - firstEntry.startTime);
        });
        fidObserver.observe({ type: 'first-input', buffered: true });
      } catch { /* Not supported */ }

      // CLS
      try {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries() as any[]) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          }
        });
        clsObserver.observe({ type: 'layout-shift', buffered: true });
        
        // Report CLS on page hide
        document.addEventListener('visibilitychange', () => {
          if (document.hidden) {
            this.trackPerformance('CLS', clsValue);
          }
        }, { once: true });
      } catch { /* Not supported */ }

      // FCP
      try {
        const paintObserver = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if (entry.name === 'first-contentful-paint') {
              this.trackPerformance('FCP', entry.startTime);
            }
          }
        });
        paintObserver.observe({ type: 'paint', buffered: true });
      } catch { /* Not supported */ }

      // TTFB
      try {
        const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navEntry) {
          this.trackPerformance('TTFB', navEntry.responseStart - navEntry.requestStart);
        }
      } catch { /* Not supported */ }
    }
  }

  // ==================== Helper Methods ====================

  private getOrCreateAnonymousId(): string {
    let id = getStorageItem('_acd_anon') || getCookie('_acd_anon');
    if (!id) {
      id = `anon_${generateId()}`;
      setStorageItem('_acd_anon', id);
      setCookie('_acd_anon', id, 365);
    }
    return id;
  }

  private getOrCreateSessionId(): string {
    const stored = getStorageItem('_acd_session');
    const lastActivity = parseInt(getStorageItem('_acd_last') || '0', 10);
    const timeout = (this.config?.sessionTimeout || 30) * 60 * 1000;

    if (stored && Date.now() - lastActivity < timeout) {
      return stored;
    }

    const id = `sess_${generateId()}`;
    setStorageItem('_acd_session', id);
    return id;
  }

  private checkSessionTimeout(): void {
    const timeout = (this.config?.sessionTimeout || 30) * 60 * 1000;
    if (Date.now() - this.lastActivity > timeout) {
      // Start new session
      this.sessionId = `sess_${generateId()}`;
      setStorageItem('_acd_session', this.sessionId);
      this.sessionStart = Date.now();
      this.scrollDepth = 0;
      this.trackSessionStart();
    }
  }

  private updateActivity(): void {
    this.lastActivity = Date.now();
    setStorageItem('_acd_last', this.lastActivity.toString());
  }

  private trackSessionStart(): void {
    this.track('$session_start', {
      utm: getUTMParams(),
      referrer: document.referrer,
      landingPage: window.location.href,
      deviceType: getDeviceType(),
      screenWidth: screen.width,
      screenHeight: screen.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  }

  private getAutoProperties(): Record<string, any> {
    return {
      $device_type: getDeviceType(),
      $browser: this.getBrowser(),
      $os: this.getOS(),
      $screen_width: screen.width,
      $screen_height: screen.height,
      $viewport_width: window.innerWidth,
      $viewport_height: window.innerHeight,
      $lib_version: '1.0.0',
    };
  }

  private getBrowser(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Edg')) return 'Edge';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Opera')) return 'Opera';
    return 'Unknown';
  }

  private getOS(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
    return 'Unknown';
  }

  private isTrackableClick(element: HTMLElement): boolean {
    // Track buttons, links, and elements with data-track attribute
    const trackable = ['A', 'BUTTON', 'INPUT'];
    return (
      trackable.includes(element.tagName) ||
      element.hasAttribute('data-track') ||
      element.closest('[data-track]') !== null ||
      element.getAttribute('role') === 'button'
    );
  }

  private isOutboundLink(href: string): boolean {
    try {
      const url = new URL(href);
      return url.hostname !== window.location.hostname;
    } catch {
      return false;
    }
  }

  private shouldMask(element: HTMLElement): boolean {
    if (!this.config?.maskSelectors) return false;
    return this.config.maskSelectors.some(selector => element.matches(selector));
  }

  private truncate(str: string, length: number): string {
    return str.length > length ? str.substring(0, length) + '...' : str;
  }

  private getPerformanceRating(metric: string, value: number): string {
    const thresholds: Record<string, [number, number]> = {
      LCP: [2500, 4000],
      FID: [100, 300],
      CLS: [0.1, 0.25],
      TTFB: [800, 1800],
      FCP: [1800, 3000],
      INP: [200, 500],
    };

    const [good, poor] = thresholds[metric] || [1000, 3000];
    if (value <= good) return 'good';
    if (value <= poor) return 'needs-improvement';
    return 'poor';
  }

  private getSessionPageViews(): number {
    return this.eventQueue.filter(e => e.name === '$pageview').length;
  }

  // ==================== Flush & Send ====================

  private startFlushTimer(): void {
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.flushTimer = window.setInterval(() => {
      this.flush();
    }, this.config?.flushInterval || 5000);
  }

  async flush(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const batch = [...this.eventQueue];
    this.eventQueue = [];

    try {
      if (this.config?.apiEndpoint) {
        await fetch(this.config.apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: this.config.projectId,
            events: batch,
          }),
          keepalive: true,
        });
      }
      this.log('Flushed', batch.length, 'events');
    } catch (error) {
      this.log('Flush error:', error);
      // Re-add failed events
      this.eventQueue.unshift(...batch);
    }
  }

  private log(...args: any[]): void {
    if (this.config?.debug) {
      console.log('[Tracker]', ...args);
    }
  }

  // ==================== Public API ====================

  getAnonymousId(): string {
    return this.anonymousId;
  }

  getUserId(): string | null {
    return this.userId;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

// ==================== Export Singleton ====================

export const tracker = new UserEventTracker();

// Also export class for custom instances
export { UserEventTracker };

// Default export
export default tracker;
