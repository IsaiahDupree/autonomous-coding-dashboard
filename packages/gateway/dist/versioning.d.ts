import { ApiVersion } from './types';
export interface VersionManagerConfig {
    current: string;
    supported: ApiVersion[];
    headerName?: string;
    defaultVersion?: string;
}
export interface VersionableRequest {
    headers: Record<string, string | string[] | undefined>;
    url?: string;
    path?: string;
    query?: Record<string, string | string[] | undefined>;
}
export interface VersionParseResult {
    version: string;
    source: 'header' | 'path' | 'query' | 'default';
}
export declare class ApiVersionManager {
    private readonly current;
    private readonly supported;
    private readonly headerName;
    private readonly defaultVersion;
    constructor(config: VersionManagerConfig);
    /**
     * Resolve the API version from a request.
     * Checks in order: header, URL path, query parameter, then falls back to default.
     */
    resolveVersion(req: VersionableRequest): VersionParseResult;
    /**
     * Check if a version is currently supported.
     */
    isSupported(version: string): boolean;
    /**
     * Check if a version is deprecated.
     */
    isDeprecated(version: string): boolean;
    /**
     * Get HTTP headers to include in the response for a given version.
     */
    getVersionHeaders(version: string): Record<string, string>;
    /**
     * Negotiate the best version to use.
     * If the requested version is supported, use it. Otherwise, fall back to default.
     */
    negotiate(requested: string | undefined): string;
    /**
     * Get the current version.
     */
    getCurrentVersion(): string;
    /**
     * Get all supported versions.
     */
    getSupportedVersions(): ApiVersion[];
    /**
     * Get routes for a specific version.
     */
    getRoutes(version: string): string[];
    /**
     * Validate version format (v + integer).
     */
    private isValidFormat;
    /**
     * Parse version number from "vN" format.
     */
    private parseVersionNumber;
    /**
     * Safely get a single header value.
     */
    private getHeader;
}
//# sourceMappingURL=versioning.d.ts.map