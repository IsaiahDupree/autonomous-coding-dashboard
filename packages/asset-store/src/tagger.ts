// ─── AST-003: Asset Tagging and Search ──────────────────────────────────────

/**
 * TagNormalizer - Utility for normalizing tag strings.
 * Ensures consistent tag format: lowercase, trimmed, no special chars, max 50 chars.
 */
export class TagNormalizer {
  static readonly MAX_TAG_LENGTH = 50;

  /**
   * Normalize a single tag string.
   * - Converts to lowercase
   * - Trims whitespace
   * - Removes special characters (keeps alphanumeric, hyphens, underscores)
   * - Truncates to max length
   */
  static normalize(tag: string): string {
    return tag
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\-_\s]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, TagNormalizer.MAX_TAG_LENGTH);
  }

  /**
   * Normalize an array of tags, removing empty strings and duplicates.
   */
  static normalizeAll(tags: string[]): string[] {
    const normalized = tags
      .map((tag) => TagNormalizer.normalize(tag))
      .filter((tag) => tag.length > 0);
    return [...new Set(normalized)];
  }
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
  getTagCounts(orgId: string): Promise<Array<{ tag: string; count: number }>>;
}

/**
 * InMemoryTagStore - In-memory tag store for development and testing.
 */
export class InMemoryTagStore implements TagStore {
  /** Map of assetId -> tags */
  private assetTags: Map<string, string[]> = new Map();
  /** Map of assetId -> orgId (for scoping) */
  private assetOrgs: Map<string, string> = new Map();

  setAssetOrg(assetId: string, orgId: string): void {
    this.assetOrgs.set(assetId, orgId);
  }

  async getTags(assetId: string): Promise<string[]> {
    return this.assetTags.get(assetId) || [];
  }

  async setTags(assetId: string, tags: string[]): Promise<void> {
    this.assetTags.set(assetId, [...tags]);
  }

  async getAssetsByTag(tag: string): Promise<string[]> {
    const results: string[] = [];
    for (const [assetId, tags] of this.assetTags) {
      if (tags.includes(tag)) {
        results.push(assetId);
      }
    }
    return results;
  }

  async getTagCounts(orgId: string): Promise<Array<{ tag: string; count: number }>> {
    const tagCounts = new Map<string, number>();
    for (const [assetId, tags] of this.assetTags) {
      const assetOrg = this.assetOrgs.get(assetId);
      if (assetOrg !== orgId) continue;
      for (const tag of tags) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
    }
    return Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }
}

/**
 * TagManager - Manages tags for assets with normalization, search, and suggestions.
 */
export class TagManager {
  private readonly store: TagStore;

  constructor(store: TagStore) {
    this.store = store;
  }

  /**
   * Add tags to an asset. Tags are normalized and deduplicated.
   */
  async addTags(assetId: string, tags: string[]): Promise<string[]> {
    const normalizedNew = TagNormalizer.normalizeAll(tags);
    const existing = await this.store.getTags(assetId);
    const merged = [...new Set([...existing, ...normalizedNew])];
    await this.store.setTags(assetId, merged);
    return merged;
  }

  /**
   * Remove specific tags from an asset.
   */
  async removeTags(assetId: string, tags: string[]): Promise<string[]> {
    const normalizedRemove = TagNormalizer.normalizeAll(tags);
    const existing = await this.store.getTags(assetId);
    const remaining = existing.filter((tag) => !normalizedRemove.includes(tag));
    await this.store.setTags(assetId, remaining);
    return remaining;
  }

  /**
   * Get all tags for a specific asset.
   */
  async getAssetTags(assetId: string): Promise<string[]> {
    return this.store.getTags(assetId);
  }

  /**
   * Search for assets by tags.
   * @param tags - Tags to search for
   * @param matchAll - If true, assets must have ALL tags (AND). If false, any tag matches (OR).
   */
  async searchByTags(tags: string[], matchAll: boolean = false): Promise<string[]> {
    const normalizedTags = TagNormalizer.normalizeAll(tags);
    if (normalizedTags.length === 0) return [];

    if (matchAll) {
      // AND: asset must have all specified tags
      const assetSets = await Promise.all(
        normalizedTags.map((tag) => this.store.getAssetsByTag(tag))
      );
      if (assetSets.length === 0) return [];
      // Intersection of all sets
      let result = new Set(assetSets[0]);
      for (let i = 1; i < assetSets.length; i++) {
        const currentSet = new Set(assetSets[i]);
        result = new Set([...result].filter((id) => currentSet.has(id)));
      }
      return [...result];
    } else {
      // OR: asset must have at least one of the specified tags
      const allAssets = await Promise.all(
        normalizedTags.map((tag) => this.store.getAssetsByTag(tag))
      );
      return [...new Set(allAssets.flat())];
    }
  }

  /**
   * Get the most popular tags for an organization.
   */
  async getPopularTags(orgId: string, limit: number = 20): Promise<Array<{ tag: string; count: number }>> {
    const tagCounts = await this.store.getTagCounts(orgId);
    return tagCounts.slice(0, limit);
  }

  /**
   * Auto-suggest tags based on filename and MIME type.
   * Extracts meaningful keywords from the filename and infers category from MIME type.
   */
  suggestTags(filename: string, mimeType: string): string[] {
    const suggestions: string[] = [];

    // Extract tags from MIME type
    const [mimeCategory] = mimeType.split("/");
    if (mimeCategory) {
      suggestions.push(mimeCategory);
    }

    // Add specific format tags
    const ext = filename.split(".").pop()?.toLowerCase();
    if (ext) {
      suggestions.push(ext);
    }

    // Common MIME-based tags
    const mimeTagMap: Record<string, string[]> = {
      "image/jpeg": ["photo", "jpeg"],
      "image/png": ["image", "png"],
      "image/gif": ["animation", "gif"],
      "image/svg+xml": ["vector", "svg"],
      "image/webp": ["image", "webp"],
      "video/mp4": ["video", "mp4"],
      "video/webm": ["video", "webm"],
      "audio/mpeg": ["audio", "mp3"],
      "audio/wav": ["audio", "wav"],
      "application/pdf": ["document", "pdf"],
      "font/ttf": ["font", "ttf"],
      "font/woff": ["font", "woff"],
      "font/woff2": ["font", "woff2"],
      "application/json": ["data", "json"],
    };

    if (mimeTagMap[mimeType]) {
      suggestions.push(...mimeTagMap[mimeType]);
    }

    // Extract keywords from filename (remove extension, split on common separators)
    const nameWithoutExt = filename.replace(/\.[^.]+$/, "");
    const words = nameWithoutExt
      .replace(/[_\-\.]/g, " ")
      .replace(/([a-z])([A-Z])/g, "$1 $2") // camelCase split
      .split(/\s+/)
      .filter((w) => w.length > 2) // Skip very short words
      .map((w) => w.toLowerCase());

    suggestions.push(...words);

    return TagNormalizer.normalizeAll(suggestions);
  }
}
