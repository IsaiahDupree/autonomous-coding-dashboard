/**
 * MOB-004: Mobile Deep Linking
 *
 * URL scheme configuration, route mapping, parameter extraction,
 * and fallback URL handling for deep links.
 */

import {
  DeepLinkConfig,
  DeepLinkConfigSchema,
  DeepLinkRoute,
  ResolvedDeepLink,
} from './types';

export class DeepLinkManager {
  private config: DeepLinkConfig;

  constructor(config: DeepLinkConfig) {
    this.config = DeepLinkConfigSchema.parse(config);
  }

  /**
   * Resolve a URL to a matching deep link route and extract parameters.
   */
  resolve(url: string): ResolvedDeepLink {
    const parsed = this.parseUrl(url);
    if (!parsed) {
      return {
        matched: false,
        fallbackUrl: this.config.fallbackUrl,
      };
    }

    // Check if the URL matches any configured scheme
    const matchesScheme = this.matchesScheme(parsed);
    if (!matchesScheme) {
      return {
        matched: false,
        fallbackUrl: this.config.fallbackUrl,
      };
    }

    // Try to match a route
    for (const route of this.config.routes) {
      const params = this.matchRoute(parsed.path, route);
      if (params !== null) {
        return {
          matched: true,
          route,
          params,
        };
      }
    }

    return {
      matched: false,
      fallbackUrl: this.config.fallbackUrl,
    };
  }

  /**
   * Generate a deep link URL for a given route and parameters.
   */
  generateLink(routeId: string, params?: Record<string, string | number | boolean>): string {
    const route = this.config.routes.find(r => r.id === routeId);
    if (!route) {
      throw new Error(`Route "${routeId}" not found`);
    }

    const scheme = this.config.schemes[0];
    let path = route.pattern;

    // Replace route parameters
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        path = path.replace(`:${key}`, String(value));
      }
    }

    // Build URL
    const host = scheme.host ?? '';
    const prefix = scheme.pathPrefix ?? '';
    return `${scheme.scheme}://${host}${prefix}${path}`;
  }

  /**
   * Generate a universal link (https) for a route.
   */
  generateUniversalLink(routeId: string, params?: Record<string, string | number | boolean>): string {
    if (!this.config.universalLinkDomain) {
      throw new Error('Universal link domain not configured');
    }

    const route = this.config.routes.find(r => r.id === routeId);
    if (!route) {
      throw new Error(`Route "${routeId}" not found`);
    }

    let path = route.pattern;
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        path = path.replace(`:${key}`, String(value));
      }
    }

    return `https://${this.config.universalLinkDomain}${path}`;
  }

  /**
   * Get the fallback URL for a specific platform.
   */
  getFallbackUrl(platform?: 'ios' | 'android'): string {
    if (platform === 'ios' && this.config.iosFallbackUrl) {
      return this.config.iosFallbackUrl;
    }
    if (platform === 'android' && this.config.androidFallbackUrl) {
      return this.config.androidFallbackUrl;
    }
    return this.config.fallbackUrl;
  }

  /**
   * Check if a route requires authentication.
   */
  requiresAuth(routeId: string): boolean {
    const route = this.config.routes.find(r => r.id === routeId);
    return route?.requiresAuth ?? false;
  }

  /**
   * Get all configured routes.
   */
  getRoutes(): DeepLinkRoute[] {
    return [...this.config.routes];
  }

  /**
   * Add a new route to the configuration.
   */
  addRoute(route: DeepLinkRoute): void {
    if (this.config.routes.some(r => r.id === route.id)) {
      throw new Error(`Route "${route.id}" already exists`);
    }
    this.config.routes.push(route);
  }

  /**
   * Remove a route by ID.
   */
  removeRoute(routeId: string): boolean {
    const index = this.config.routes.findIndex(r => r.id === routeId);
    if (index < 0) return false;
    this.config.routes.splice(index, 1);
    return true;
  }

  /**
   * Validate that all required params are present for a route.
   */
  validateParams(
    routeId: string,
    params: Record<string, unknown>
  ): { valid: boolean; missing: string[]; invalid: string[] } {
    const route = this.config.routes.find(r => r.id === routeId);
    if (!route) {
      throw new Error(`Route "${routeId}" not found`);
    }

    const missing: string[] = [];
    const invalid: string[] = [];

    if (route.params) {
      for (const [name, paramDef] of Object.entries(route.params)) {
        const value = params[name];

        if (value === undefined || value === null) {
          if (paramDef.required) {
            missing.push(name);
          }
          continue;
        }

        // Type check
        switch (paramDef.type) {
          case 'string':
            if (typeof value !== 'string') invalid.push(name);
            break;
          case 'number':
            if (typeof value !== 'number' && isNaN(Number(value))) invalid.push(name);
            break;
          case 'boolean':
            if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') invalid.push(name);
            break;
        }
      }
    }

    return { valid: missing.length === 0 && invalid.length === 0, missing, invalid };
  }

  /**
   * Get the current configuration.
   */
  getConfig(): DeepLinkConfig {
    return { ...this.config, routes: [...this.config.routes] };
  }

  /**
   * Parse a URL into its components.
   */
  private parseUrl(url: string): { scheme: string; host: string; path: string; query: Record<string, string> } | null {
    try {
      // Handle custom schemes (myapp://...)
      const schemeMatch = url.match(/^([a-zA-Z][a-zA-Z0-9+.\-]*):\/\/(.*)/);
      if (!schemeMatch) return null;

      const scheme = schemeMatch[1];
      const rest = schemeMatch[2];

      // Split host and path
      const pathStart = rest.indexOf('/');
      const host = pathStart >= 0 ? rest.substring(0, pathStart) : rest;
      const pathAndQuery = pathStart >= 0 ? rest.substring(pathStart) : '/';

      // Split path and query
      const queryStart = pathAndQuery.indexOf('?');
      const path = queryStart >= 0 ? pathAndQuery.substring(0, queryStart) : pathAndQuery;
      const queryString = queryStart >= 0 ? pathAndQuery.substring(queryStart + 1) : '';

      const query: Record<string, string> = {};
      if (queryString) {
        for (const pair of queryString.split('&')) {
          const [key, value] = pair.split('=');
          if (key) {
            query[decodeURIComponent(key)] = value ? decodeURIComponent(value) : '';
          }
        }
      }

      return { scheme, host, path, query };
    } catch {
      return null;
    }
  }

  /**
   * Check if a parsed URL matches any configured scheme.
   */
  private matchesScheme(parsed: { scheme: string; host: string }): boolean {
    return this.config.schemes.some(s => {
      if (s.scheme !== parsed.scheme) return false;
      if (s.host && s.host !== parsed.host) return false;
      return true;
    });
  }

  /**
   * Match a URL path against a route pattern, extracting parameters.
   * Pattern format: /users/:id/posts/:postId
   */
  private matchRoute(
    path: string,
    route: DeepLinkRoute
  ): Record<string, string | number | boolean> | null {
    const patternParts = route.pattern.split('/').filter(Boolean);
    const pathParts = path.split('/').filter(Boolean);

    if (patternParts.length !== pathParts.length) return null;

    const params: Record<string, string | number | boolean> = {};

    for (let i = 0; i < patternParts.length; i++) {
      const pattern = patternParts[i];
      const value = pathParts[i];

      if (pattern.startsWith(':')) {
        const paramName = pattern.substring(1);
        const paramDef = route.params?.[paramName];

        if (paramDef) {
          switch (paramDef.type) {
            case 'number': {
              const num = Number(value);
              if (isNaN(num)) return null;
              params[paramName] = num;
              break;
            }
            case 'boolean':
              params[paramName] = value === 'true';
              break;
            default:
              params[paramName] = value;
          }
        } else {
          params[paramName] = value;
        }
      } else if (pattern !== value) {
        return null;
      }
    }

    return params;
  }
}
