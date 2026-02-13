import { ApiVersion } from './types';

// ─── Version Manager Config ──────────────────────────────────────────────────

export interface VersionManagerConfig {
  current: string;
  supported: ApiVersion[];
  headerName?: string;
  defaultVersion?: string;
}

// ─── Minimal Request Interface for Version Extraction ────────────────────────

export interface VersionableRequest {
  headers: Record<string, string | string[] | undefined>;
  url?: string;
  path?: string;
  query?: Record<string, string | string[] | undefined>;
}

// ─── Version Parse Result ────────────────────────────────────────────────────

export interface VersionParseResult {
  version: string;
  source: 'header' | 'path' | 'query' | 'default';
}

// ─── API Version Manager ─────────────────────────────────────────────────────

export class ApiVersionManager {
  private readonly current: string;
  private readonly supported: Map<string, ApiVersion>;
  private readonly headerName: string;
  private readonly defaultVersion: string;

  constructor(config: VersionManagerConfig) {
    this.current = config.current;
    this.headerName = config.headerName ?? 'X-API-Version';
    this.defaultVersion = config.defaultVersion ?? config.current;
    this.supported = new Map();

    for (const version of config.supported) {
      this.supported.set(version.version, version);
    }
  }

  /**
   * Resolve the API version from a request.
   * Checks in order: header, URL path, query parameter, then falls back to default.
   */
  resolveVersion(req: VersionableRequest): VersionParseResult {
    // 1. Check header
    const headerValue = this.getHeader(req.headers, this.headerName);
    if (headerValue && this.isValidFormat(headerValue)) {
      return { version: headerValue, source: 'header' };
    }

    // 2. Check URL path (e.g., /v1/users)
    const path = req.path ?? req.url ?? '';
    const pathMatch = path.match(/^\/(v\d+)(\/|$)/);
    if (pathMatch) {
      return { version: pathMatch[1], source: 'path' };
    }

    // 3. Check query parameter
    const queryVersion = req.query?.version;
    const queryValue = Array.isArray(queryVersion) ? queryVersion[0] : queryVersion;
    if (queryValue && this.isValidFormat(queryValue)) {
      return { version: queryValue, source: 'query' };
    }

    // 4. Fall back to default
    return { version: this.defaultVersion, source: 'default' };
  }

  /**
   * Check if a version is currently supported.
   */
  isSupported(version: string): boolean {
    return this.supported.has(version);
  }

  /**
   * Check if a version is deprecated.
   */
  isDeprecated(version: string): boolean {
    const v = this.supported.get(version);
    return v?.deprecated ?? false;
  }

  /**
   * Get HTTP headers to include in the response for a given version.
   */
  getVersionHeaders(version: string): Record<string, string> {
    const headers: Record<string, string> = {
      'X-API-Version': version,
    };

    const v = this.supported.get(version);
    if (v?.deprecated) {
      headers['Deprecation'] = 'true';
      if (v.sunsetDate) {
        headers['Sunset'] = v.sunsetDate.toUTCString();
      }
    }

    return headers;
  }

  /**
   * Negotiate the best version to use.
   * If the requested version is supported, use it. Otherwise, fall back to default.
   */
  negotiate(requested: string | undefined): string {
    if (!requested) {
      return this.defaultVersion;
    }

    if (this.isSupported(requested)) {
      return requested;
    }

    // Try to find the closest supported version
    const requestedNum = this.parseVersionNumber(requested);
    if (requestedNum !== null) {
      let bestMatch: string | null = null;
      let bestNum = -1;

      for (const [ver] of this.supported) {
        const num = this.parseVersionNumber(ver);
        if (num !== null && num <= requestedNum && num > bestNum) {
          bestNum = num;
          bestMatch = ver;
        }
      }

      if (bestMatch) {
        return bestMatch;
      }
    }

    return this.defaultVersion;
  }

  /**
   * Get the current version.
   */
  getCurrentVersion(): string {
    return this.current;
  }

  /**
   * Get all supported versions.
   */
  getSupportedVersions(): ApiVersion[] {
    return Array.from(this.supported.values());
  }

  /**
   * Get routes for a specific version.
   */
  getRoutes(version: string): string[] {
    const v = this.supported.get(version);
    return v?.routes ?? [];
  }

  /**
   * Validate version format (v + integer).
   */
  private isValidFormat(version: string): boolean {
    return /^v\d+$/.test(version);
  }

  /**
   * Parse version number from "vN" format.
   */
  private parseVersionNumber(version: string): number | null {
    const match = version.match(/^v(\d+)$/);
    return match ? parseInt(match[1], 10) : null;
  }

  /**
   * Safely get a single header value.
   */
  private getHeader(
    headers: Record<string, string | string[] | undefined>,
    name: string
  ): string | undefined {
    // Try exact case first
    const value = headers[name] ?? headers[name.toLowerCase()];
    if (Array.isArray(value)) return value[0];
    return value;
  }
}
