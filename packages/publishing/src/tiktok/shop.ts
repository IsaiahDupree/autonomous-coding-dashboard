/**
 * CF-TIKTOK-003: TikTok Shop Affiliate Service
 *
 * Provides access to TikTok Shop product catalog, affiliate link
 * creation, commission rates, and sales tracking.
 */

import type {
  TikTokShopProduct,
  TikTokAffiliateLink,
  TikTokCommissionRate,
  TikTokSalesData,
} from '../types';

const TIKTOK_SHOP_API_BASE = 'https://open-api.tiktokglobalshop.com';

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

export class TikTokShopService {
  private readonly accessToken: string;
  private readonly shopId: string;

  constructor(config: { accessToken: string; shopId: string }) {
    this.accessToken = config.accessToken;
    this.shopId = config.shopId;
  }

  /**
   * Lists products from the TikTok Shop catalog, with optional filters.
   */
  async getProducts(filters?: ProductFilters): Promise<TikTokShopProduct[]> {
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

    const response = await fetch(
      `${TIKTOK_SHOP_API_BASE}/api/products/search?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'x-tts-access-token': this.accessToken,
          'Content-Type': 'application/json',
        },
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`TikTok Shop getProducts failed (${response.status}): ${errorBody}`);
    }

    const data = (await response.json()) as { data: { products: TikTokShopProduct[] } };
    return data.data.products;
  }

  /**
   * Creates an affiliate link that associates a product with
   * a piece of content for commission tracking.
   */
  async createAffiliateLink(productId: string, content: { title: string; videoId?: string }): Promise<TikTokAffiliateLink> {
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

    const data = (await response.json()) as { data: TikTokAffiliateLink };
    return data.data;
  }

  /**
   * Returns the commission rate information for a specific product.
   */
  async getCommissionRates(productId: string): Promise<TikTokCommissionRate> {
    const response = await fetch(
      `${TIKTOK_SHOP_API_BASE}/api/affiliate/commission?shop_id=${this.shopId}&product_id=${productId}`,
      {
        method: 'GET',
        headers: {
          'x-tts-access-token': this.accessToken,
          'Content-Type': 'application/json',
        },
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`TikTok Shop getCommissionRates failed (${response.status}): ${errorBody}`);
    }

    const data = (await response.json()) as { data: TikTokCommissionRate };
    return data.data;
  }

  /**
   * Retrieves sales and commission data for a specific affiliate link
   * within a given date range.
   */
  async trackSales(affiliateLinkId: string, dateRange: DateRange): Promise<TikTokSalesData> {
    const params = new URLSearchParams({
      shop_id: this.shopId,
      affiliate_link_id: affiliateLinkId,
      start_date: dateRange.start,
      end_date: dateRange.end,
    });

    const response = await fetch(
      `${TIKTOK_SHOP_API_BASE}/api/affiliate/sales?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'x-tts-access-token': this.accessToken,
          'Content-Type': 'application/json',
        },
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`TikTok Shop trackSales failed (${response.status}): ${errorBody}`);
    }

    const data = (await response.json()) as { data: TikTokSalesData };
    return data.data;
  }
}
