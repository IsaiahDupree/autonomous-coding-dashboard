/**
 * TagNormalizer - Utility for normalizing tag strings.
 * Ensures consistent tag format: lowercase, trimmed, no special chars, max 50 chars.
 */
export declare class TagNormalizer {
    static readonly MAX_TAG_LENGTH = 50;
    /**
     * Normalize a single tag string.
     * - Converts to lowercase
     * - Trims whitespace
     * - Removes special characters (keeps alphanumeric, hyphens, underscores)
     * - Truncates to max length
     */
    static normalize(tag: string): string;
    /**
     * Normalize an array of tags, removing empty strings and duplicates.
     */
    static normalizeAll(tags: string[]): string[];
}
/**
 * TagStore - Interface for tag persistence.
 * Implement this to connect to your database.
 */
export interface TagStore {
    /** Get tags for an asset */
    getTags(assetId: string): Promise<string[]>;
    /** Set tags for an asset (replaces all existing tags) */
    setTags(assetId: string, tags: string[]): Promise<void>;
    /** Get all assets that have a specific tag */
    getAssetsByTag(tag: string): Promise<string[]>;
    /** Get all tags with their usage counts for an org */
    getTagCounts(orgId: string): Promise<Array<{
        tag: string;
        count: number;
    }>>;
}
/**
 * InMemoryTagStore - In-memory tag store for development and testing.
 */
export declare class InMemoryTagStore implements TagStore {
    /** Map of assetId -> tags */
    private assetTags;
    /** Map of assetId -> orgId (for scoping) */
    private assetOrgs;
    setAssetOrg(assetId: string, orgId: string): void;
    getTags(assetId: string): Promise<string[]>;
    setTags(assetId: string, tags: string[]): Promise<void>;
    getAssetsByTag(tag: string): Promise<string[]>;
    getTagCounts(orgId: string): Promise<Array<{
        tag: string;
        count: number;
    }>>;
}
/**
 * TagManager - Manages tags for assets with normalization, search, and suggestions.
 */
export declare class TagManager {
    private readonly store;
    constructor(store: TagStore);
    /**
     * Add tags to an asset. Tags are normalized and deduplicated.
     */
    addTags(assetId: string, tags: string[]): Promise<string[]>;
    /**
     * Remove specific tags from an asset.
     */
    removeTags(assetId: string, tags: string[]): Promise<string[]>;
    /**
     * Get all tags for a specific asset.
     */
    getAssetTags(assetId: string): Promise<string[]>;
    /**
     * Search for assets by tags.
     * @param tags - Tags to search for
     * @param matchAll - If true, assets must have ALL tags (AND). If false, any tag matches (OR).
     */
    searchByTags(tags: string[], matchAll?: boolean): Promise<string[]>;
    /**
     * Get the most popular tags for an organization.
     */
    getPopularTags(orgId: string, limit?: number): Promise<Array<{
        tag: string;
        count: number;
    }>>;
    /**
     * Auto-suggest tags based on filename and MIME type.
     * Extracts meaningful keywords from the filename and infers category from MIME type.
     */
    suggestTags(filename: string, mimeType: string): string[];
}
//# sourceMappingURL=tagger.d.ts.map