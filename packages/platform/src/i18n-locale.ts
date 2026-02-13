/**
 * I18N-002: Locale Detection
 *
 * Multi-strategy locale detection: browser locale, user preference,
 * URL-based, cookie-based, and header-based detection.
 */

import {
  LocaleDetectionResult,
  LocaleDetectionConfig,
  LocaleDetectionConfigSchema,
  LocaleSource,
} from './types';

export interface LocaleDetectionContext {
  /** Accept-Language header value (e.g., "en-US,en;q=0.9,fr;q=0.8") */
  acceptLanguageHeader?: string;
  /** Cookie string (full document.cookie style) */
  cookies?: string;
  /** Current URL path (e.g., "/fr/about") */
  urlPath?: string;
  /** URL query parameters */
  urlParams?: Record<string, string>;
  /** Stored user preference locale */
  userPreferenceLocale?: string;
  /** Browser navigator.language value */
  browserLocale?: string;
  /** List of supported locales to match against */
  supportedLocales: string[];
  /** Default locale to fall back to */
  defaultLocale: string;
}

export class LocaleDetector {
  private config: LocaleDetectionConfig;

  constructor(config?: Partial<LocaleDetectionConfig>) {
    this.config = LocaleDetectionConfigSchema.parse({
      order: config?.order ?? ['user_preference', 'cookie', 'url', 'browser', 'header', 'default'],
      cookieName: config?.cookieName,
      urlParam: config?.urlParam,
      urlPathPrefix: config?.urlPathPrefix,
      headerName: config?.headerName,
    });
  }

  /**
   * Detect the best locale from the given context, trying each detection
   * strategy in configured priority order.
   */
  detect(context: LocaleDetectionContext): LocaleDetectionResult {
    for (const source of this.config.order) {
      const result = this.detectFromSource(source, context);
      if (result) {
        return result;
      }
    }

    return {
      locale: context.defaultLocale,
      source: 'default',
      confidence: 0.1,
    };
  }

  /**
   * Get all detected locales across all strategies, sorted by confidence.
   */
  detectAll(context: LocaleDetectionContext): LocaleDetectionResult[] {
    const results: LocaleDetectionResult[] = [];

    for (const source of this.config.order) {
      const result = this.detectFromSource(source, context);
      if (result) {
        results.push(result);
      }
    }

    // Always include default
    if (!results.some(r => r.source === 'default')) {
      results.push({
        locale: context.defaultLocale,
        source: 'default',
        confidence: 0.1,
      });
    }

    return results.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Attempt locale detection from a specific source.
   */
  private detectFromSource(
    source: LocaleSource,
    context: LocaleDetectionContext
  ): LocaleDetectionResult | null {
    switch (source) {
      case 'user_preference':
        return this.detectFromUserPreference(context);
      case 'cookie':
        return this.detectFromCookie(context);
      case 'url':
        return this.detectFromUrl(context);
      case 'browser':
        return this.detectFromBrowser(context);
      case 'header':
        return this.detectFromHeader(context);
      case 'default':
        return {
          locale: context.defaultLocale,
          source: 'default',
          confidence: 0.1,
        };
      default:
        return null;
    }
  }

  /**
   * Detect from explicit user preference.
   */
  private detectFromUserPreference(context: LocaleDetectionContext): LocaleDetectionResult | null {
    if (!context.userPreferenceLocale) return null;
    const matched = this.matchLocale(context.userPreferenceLocale, context.supportedLocales);
    if (!matched) return null;
    return { locale: matched, source: 'user_preference', confidence: 1.0 };
  }

  /**
   * Detect from cookies.
   */
  private detectFromCookie(context: LocaleDetectionContext): LocaleDetectionResult | null {
    if (!context.cookies) return null;

    const cookieName = this.config.cookieName ?? 'locale';
    const cookieValue = this.parseCookieValue(context.cookies, cookieName);
    if (!cookieValue) return null;

    const matched = this.matchLocale(cookieValue, context.supportedLocales);
    if (!matched) return null;
    return { locale: matched, source: 'cookie', confidence: 0.9 };
  }

  /**
   * Detect from URL (path prefix or query parameter).
   */
  private detectFromUrl(context: LocaleDetectionContext): LocaleDetectionResult | null {
    // Check URL path prefix (e.g., /fr/about)
    if (this.config.urlPathPrefix && context.urlPath) {
      const pathSegments = context.urlPath.split('/').filter(Boolean);
      if (pathSegments.length > 0) {
        const matched = this.matchLocale(pathSegments[0], context.supportedLocales);
        if (matched) {
          return { locale: matched, source: 'url', confidence: 0.95 };
        }
      }
    }

    // Check URL query parameter
    if (context.urlParams) {
      const paramName = this.config.urlParam ?? 'lang';
      const paramValue = context.urlParams[paramName];
      if (paramValue) {
        const matched = this.matchLocale(paramValue, context.supportedLocales);
        if (matched) {
          return { locale: matched, source: 'url', confidence: 0.85 };
        }
      }
    }

    return null;
  }

  /**
   * Detect from browser navigator.language.
   */
  private detectFromBrowser(context: LocaleDetectionContext): LocaleDetectionResult | null {
    if (!context.browserLocale) return null;
    const matched = this.matchLocale(context.browserLocale, context.supportedLocales);
    if (!matched) return null;
    return { locale: matched, source: 'browser', confidence: 0.7 };
  }

  /**
   * Detect from Accept-Language header.
   */
  private detectFromHeader(context: LocaleDetectionContext): LocaleDetectionResult | null {
    if (!context.acceptLanguageHeader) return null;

    const parsed = this.parseAcceptLanguage(context.acceptLanguageHeader);
    for (const { locale, quality } of parsed) {
      const matched = this.matchLocale(locale, context.supportedLocales);
      if (matched) {
        return { locale: matched, source: 'header', confidence: quality * 0.8 };
      }
    }

    return null;
  }

  /**
   * Match a requested locale against supported locales.
   * Tries exact match, then language-only match.
   */
  private matchLocale(requested: string, supported: string[]): string | null {
    const normalized = requested.toLowerCase().replace('_', '-');

    // Exact match
    for (const locale of supported) {
      if (locale.toLowerCase() === normalized) return locale;
    }

    // Language-only match (e.g., "en" matches "en-US")
    const requestedLang = normalized.split('-')[0];
    for (const locale of supported) {
      if (locale.toLowerCase().split('-')[0] === requestedLang) return locale;
    }

    return null;
  }

  /**
   * Parse Accept-Language header into sorted locale/quality pairs.
   */
  private parseAcceptLanguage(header: string): Array<{ locale: string; quality: number }> {
    return header
      .split(',')
      .map(part => {
        const [locale, qualityStr] = part.trim().split(';q=');
        const quality = qualityStr ? parseFloat(qualityStr) : 1.0;
        return { locale: locale.trim(), quality: isNaN(quality) ? 0 : quality };
      })
      .filter(p => p.locale.length > 0)
      .sort((a, b) => b.quality - a.quality);
  }

  /**
   * Parse a cookie value from a cookie string.
   */
  private parseCookieValue(cookieString: string, name: string): string | null {
    const cookies = cookieString.split(';');
    for (const cookie of cookies) {
      const [key, value] = cookie.trim().split('=');
      if (key === name && value) {
        return decodeURIComponent(value);
      }
    }
    return null;
  }

  /**
   * Get the current detection config.
   */
  getConfig(): LocaleDetectionConfig {
    return { ...this.config };
  }
}
