"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiVersionManager = void 0;
// ─── API Version Manager ─────────────────────────────────────────────────────
class ApiVersionManager {
    constructor(config) {
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
    resolveVersion(req) {
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
    isSupported(version) {
        return this.supported.has(version);
    }
    /**
     * Check if a version is deprecated.
     */
    isDeprecated(version) {
        const v = this.supported.get(version);
        return v?.deprecated ?? false;
    }
    /**
     * Get HTTP headers to include in the response for a given version.
     */
    getVersionHeaders(version) {
        const headers = {
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
    negotiate(requested) {
        if (!requested) {
            return this.defaultVersion;
        }
        if (this.isSupported(requested)) {
            return requested;
        }
        // Try to find the closest supported version
        const requestedNum = this.parseVersionNumber(requested);
        if (requestedNum !== null) {
            let bestMatch = null;
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
    getCurrentVersion() {
        return this.current;
    }
    /**
     * Get all supported versions.
     */
    getSupportedVersions() {
        return Array.from(this.supported.values());
    }
    /**
     * Get routes for a specific version.
     */
    getRoutes(version) {
        const v = this.supported.get(version);
        return v?.routes ?? [];
    }
    /**
     * Validate version format (v + integer).
     */
    isValidFormat(version) {
        return /^v\d+$/.test(version);
    }
    /**
     * Parse version number from "vN" format.
     */
    parseVersionNumber(version) {
        const match = version.match(/^v(\d+)$/);
        return match ? parseInt(match[1], 10) : null;
    }
    /**
     * Safely get a single header value.
     */
    getHeader(headers, name) {
        // Try exact case first
        const value = headers[name] ?? headers[name.toLowerCase()];
        if (Array.isArray(value))
            return value[0];
        return value;
    }
}
exports.ApiVersionManager = ApiVersionManager;
//# sourceMappingURL=versioning.js.map