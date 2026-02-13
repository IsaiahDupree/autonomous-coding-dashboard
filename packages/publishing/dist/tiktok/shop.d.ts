/**
 * CF-TIKTOK-003: TikTok Shop Affiliate Service
 *
 * Provides access to TikTok Shop product catalog, affiliate link
 * creation, commission rates, and sales tracking.
 */
import type { TikTokShopProduct, TikTokAffiliateLink, TikTokCommissionRate, TikTokSalesData } from '../types';
export interface ProductFilters {
    status?: string;
    search?: string;
    page?: number;
    pageSize?: number;
}
export interface DateRange {
    start: string;
    end: string;
}
export declare class TikTokShopService {
    private readonly accessToken;
    private readonly shopId;
    constructor(config: {
        accessToken: string;
        shopId: string;
    });
    /**
     * Lists products from the TikTok Shop catalog, with optional filters.
     */
    getProducts(filters?: ProductFilters): Promise<TikTokShopProduct[]>;
    /**
     * Creates an affiliate link that associates a product with
     * a piece of content for commission tracking.
     */
    createAffiliateLink(productId: string, content: {
        title: string;
        videoId?: string;
    }): Promise<TikTokAffiliateLink>;
    /**
     * Returns the commission rate information for a specific product.
     */
    getCommissionRates(productId: string): Promise<TikTokCommissionRate>;
    /**
     * Retrieves sales and commission data for a specific affiliate link
     * within a given date range.
     */
    trackSales(affiliateLinkId: string, dateRange: DateRange): Promise<TikTokSalesData>;
}
//# sourceMappingURL=shop.d.ts.map