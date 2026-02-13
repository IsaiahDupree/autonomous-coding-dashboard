"use strict";
// ─── AST-003: Asset Tagging and Search ──────────────────────────────────────
Object.defineProperty(exports, "__esModule", { value: true });
exports.TagManager = exports.InMemoryTagStore = exports.TagNormalizer = void 0;
/**
 * TagNormalizer - Utility for normalizing tag strings.
 * Ensures consistent tag format: lowercase, trimmed, no special chars, max 50 chars.
 */
class TagNormalizer {
    /**
     * Normalize a single tag string.
     * - Converts to lowercase
     * - Trims whitespace
     * - Removes special characters (keeps alphanumeric, hyphens, underscores)
     * - Truncates to max length
     */
    static normalize(tag) {
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
    static normalizeAll(tags) {
        const normalized = tags
            .map((tag) => TagNormalizer.normalize(tag))
            .filter((tag) => tag.length > 0);
        return [...new Set(normalized)];
    }
}
exports.TagNormalizer = TagNormalizer;
TagNormalizer.MAX_TAG_LENGTH = 50;
/**
 * InMemoryTagStore - In-memory tag store for development and testing.
 */
class InMemoryTagStore {
    constructor() {
        /** Map of assetId -> tags */
        this.assetTags = new Map();
        /** Map of assetId -> orgId (for scoping) */
        this.assetOrgs = new Map();
    }
    setAssetOrg(assetId, orgId) {
        this.assetOrgs.set(assetId, orgId);
    }
    async getTags(assetId) {
        return this.assetTags.get(assetId) || [];
    }
    async setTags(assetId, tags) {
        this.assetTags.set(assetId, [...tags]);
    }
    async getAssetsByTag(tag) {
        const results = [];
        for (const [assetId, tags] of this.assetTags) {
            if (tags.includes(tag)) {
                results.push(assetId);
            }
        }
        return results;
    }
    async getTagCounts(orgId) {
        const tagCounts = new Map();
        for (const [assetId, tags] of this.assetTags) {
            const assetOrg = this.assetOrgs.get(assetId);
            if (assetOrg !== orgId)
                continue;
            for (const tag of tags) {
                tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
            }
        }
        return Array.from(tagCounts.entries())
            .map(([tag, count]) => ({ tag, count }))
            .sort((a, b) => b.count - a.count);
    }
}
exports.InMemoryTagStore = InMemoryTagStore;
/**
 * TagManager - Manages tags for assets with normalization, search, and suggestions.
 */
class TagManager {
    constructor(store) {
        this.store = store;
    }
    /**
     * Add tags to an asset. Tags are normalized and deduplicated.
     */
    async addTags(assetId, tags) {
        const normalizedNew = TagNormalizer.normalizeAll(tags);
        const existing = await this.store.getTags(assetId);
        const merged = [...new Set([...existing, ...normalizedNew])];
        await this.store.setTags(assetId, merged);
        return merged;
    }
    /**
     * Remove specific tags from an asset.
     */
    async removeTags(assetId, tags) {
        const normalizedRemove = TagNormalizer.normalizeAll(tags);
        const existing = await this.store.getTags(assetId);
        const remaining = existing.filter((tag) => !normalizedRemove.includes(tag));
        await this.store.setTags(assetId, remaining);
        return remaining;
    }
    /**
     * Get all tags for a specific asset.
     */
    async getAssetTags(assetId) {
        return this.store.getTags(assetId);
    }
    /**
     * Search for assets by tags.
     * @param tags - Tags to search for
     * @param matchAll - If true, assets must have ALL tags (AND). If false, any tag matches (OR).
     */
    async searchByTags(tags, matchAll = false) {
        const normalizedTags = TagNormalizer.normalizeAll(tags);
        if (normalizedTags.length === 0)
            return [];
        if (matchAll) {
            // AND: asset must have all specified tags
            const assetSets = await Promise.all(normalizedTags.map((tag) => this.store.getAssetsByTag(tag)));
            if (assetSets.length === 0)
                return [];
            // Intersection of all sets
            let result = new Set(assetSets[0]);
            for (let i = 1; i < assetSets.length; i++) {
                const currentSet = new Set(assetSets[i]);
                result = new Set([...result].filter((id) => currentSet.has(id)));
            }
            return [...result];
        }
        else {
            // OR: asset must have at least one of the specified tags
            const allAssets = await Promise.all(normalizedTags.map((tag) => this.store.getAssetsByTag(tag)));
            return [...new Set(allAssets.flat())];
        }
    }
    /**
     * Get the most popular tags for an organization.
     */
    async getPopularTags(orgId, limit = 20) {
        const tagCounts = await this.store.getTagCounts(orgId);
        return tagCounts.slice(0, limit);
    }
    /**
     * Auto-suggest tags based on filename and MIME type.
     * Extracts meaningful keywords from the filename and infers category from MIME type.
     */
    suggestTags(filename, mimeType) {
        const suggestions = [];
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
        const mimeTagMap = {
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
exports.TagManager = TagManager;
//# sourceMappingURL=tagger.js.map