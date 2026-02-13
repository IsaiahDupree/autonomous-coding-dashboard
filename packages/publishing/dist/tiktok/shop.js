"use strict";
/**
 * CF-TIKTOK-003: TikTok Shop Affiliate Service
 *
 * Provides access to TikTok Shop product catalog, affiliate link
 * creation, commission rates, and sales tracking.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TikTokShopService = void 0;
const TIKTOK_SHOP_API_BASE = 'https://open-api.tiktokglobalshop.com';
class TikTokShopService {
    constructor(config) {
        this.accessToken = config.accessToken;
        this.shopId = config.shopId;
    }
    /**
     * Lists products from the TikTok Shop catalog, with optional filters.
     */
    async getProducts(filters) {
        const params = new URLSearchParams({
            shop_id: this.shopId,
            page_number: String(filters?.page ?? 1),
            page_size: String(filters?.pageSize ?? 20),
        });
        if (filters?.status) {
            params.set('status', filters.status);
        }
        if (filters?.search) {
            params.set('search', filters.search);
        }
        const response = await fetch(`${TIKTOK_SHOP_API_BASE}/api/products/search?${params.toString()}`, {
            method: 'GET',
            headers: {
                'x-tts-access-token': this.accessToken,
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`TikTok Shop getProducts failed (${response.status}): ${errorBody}`);
        }
        const data = (await response.json());
        return data.data.products;
    }
    /**
     * Creates an affiliate link that associates a product with
     * a piece of content for commission tracking.
     */
    async createAffiliateLink(productId, content) {
        const response = await fetch(`${TIKTOK_SHOP_API_BASE}/api/affiliate/links`, {
            method: 'POST',
            headers: {
                'x-tts-access-token': this.accessToken,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                shop_id: this.shopId,
                product_id: productId,
                content_title: content.title,
                video_id: content.videoId,
            }),
        });
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`TikTok Shop createAffiliateLink failed (${response.status}): ${errorBody}`);
        }
        const data = (await response.json());
        return data.data;
    }
    /**
     * Returns the commission rate information for a specific product.
     */
    async getCommissionRates(productId) {
        const response = await fetch(`${TIKTOK_SHOP_API_BASE}/api/affiliate/commission?shop_id=${this.shopId}&product_id=${productId}`, {
            method: 'GET',
            headers: {
                'x-tts-access-token': this.accessToken,
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`TikTok Shop getCommissionRates failed (${response.status}): ${errorBody}`);
        }
        const data = (await response.json());
        return data.data;
    }
    /**
     * Retrieves sales and commission data for a specific affiliate link
     * within a given date range.
     */
    async trackSales(affiliateLinkId, dateRange) {
        const params = new URLSearchParams({
            shop_id: this.shopId,
            affiliate_link_id: affiliateLinkId,
            start_date: dateRange.start,
            end_date: dateRange.end,
        });
        const response = await fetch(`${TIKTOK_SHOP_API_BASE}/api/affiliate/sales?${params.toString()}`, {
            method: 'GET',
            headers: {
                'x-tts-access-token': this.accessToken,
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`TikTok Shop trackSales failed (${response.status}): ${errorBody}`);
        }
        const data = (await response.json());
        return data.data;
    }
}
exports.TikTokShopService = TikTokShopService;
//# sourceMappingURL=shop.js.map