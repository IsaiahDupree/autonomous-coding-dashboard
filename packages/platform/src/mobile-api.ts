/**
 * MOB-001: Mobile API Optimization
 *
 * Field selection, pagination, compressed responses, and device-aware
 * API request/response processing.
 */

import {
  MobileApiRequest,
  MobileApiRequestSchema,
  MobileApiResponse,
  FieldSelection,
  Pagination,
  PaginationSchema,
} from './types';

export interface DataSource {
  entity: string;
  getData(offset: number, limit: number): unknown[];
  getTotal(): number;
}

export class MobileApiOptimizer {
  private dataSources: Map<string, DataSource> = new Map();

  /**
   * Register a data source for an endpoint.
   */
  registerDataSource(endpoint: string, source: DataSource): void {
    this.dataSources.set(endpoint, source);
  }

  /**
   * Process a mobile API request with field selection, pagination, and compression hints.
   */
  processRequest(input: MobileApiRequest): MobileApiResponse {
    const request = MobileApiRequestSchema.parse(input);
    const startTime = Date.now();

    const source = this.dataSources.get(request.endpoint);
    if (!source) {
      throw new Error(`No data source registered for endpoint "${request.endpoint}"`);
    }

    const pagination = request.pagination ?? { limit: 20, sortOrder: 'desc' };
    const offset = pagination.offset ?? 0;
    const limit = pagination.limit ?? 20;

    // Fetch data with pagination
    let data = source.getData(offset, limit);
    const total = source.getTotal();

    // Apply field selection
    if (request.fields) {
      data = this.applyFieldSelection(data, request.fields);
    }

    const hasMore = offset + limit < total;
    const nextCursor = hasMore ? this.encodeCursor(offset + limit) : undefined;

    const took = Date.now() - startTime;

    return {
      data,
      pagination: {
        nextCursor,
        hasMore,
        total,
      },
      meta: {
        took,
        compressed: request.acceptEncoding !== 'identity',
        fieldSelection: !!request.fields,
      },
    };
  }

  /**
   * Apply field selection to filter data objects.
   */
  applyFieldSelection(data: unknown[], fields: FieldSelection): unknown[] {
    return data.map(item => {
      if (typeof item !== 'object' || item === null) return item;
      const obj = item as Record<string, unknown>;

      if (fields.include && fields.include.length > 0) {
        const filtered: Record<string, unknown> = {};
        for (const field of fields.include) {
          if (field in obj) {
            filtered[field] = obj[field];
          }
        }
        return filtered;
      }

      if (fields.exclude && fields.exclude.length > 0) {
        const filtered: Record<string, unknown> = { ...obj };
        for (const field of fields.exclude) {
          delete filtered[field];
        }
        return filtered;
      }

      return obj;
    });
  }

  /**
   * Parse pagination from cursor-based or offset-based params.
   */
  parsePagination(params: Record<string, string | undefined>): Pagination {
    const cursor = params['cursor'];
    let offset = 0;

    if (cursor) {
      offset = this.decodeCursor(cursor);
    } else if (params['offset']) {
      offset = parseInt(params['offset'], 10) || 0;
    }

    const limit = params['limit'] ? parseInt(params['limit'], 10) : 20;
    const sortBy = params['sort_by'];
    const sortOrder = params['sort_order'] === 'asc' ? 'asc' as const : 'desc' as const;

    return PaginationSchema.parse({ offset, limit, sortBy, sortOrder });
  }

  /**
   * Estimate response size and recommend compression.
   */
  estimateResponseSize(data: unknown): {
    estimatedBytes: number;
    shouldCompress: boolean;
    recommendedEncoding: 'gzip' | 'br' | 'identity';
  } {
    const json = JSON.stringify(data);
    const bytes = Buffer.byteLength(json, 'utf-8');

    return {
      estimatedBytes: bytes,
      shouldCompress: bytes > 1024,
      recommendedEncoding: bytes > 1024 ? 'gzip' : 'identity',
    };
  }

  /**
   * Optimize a response based on device network type.
   */
  optimizeForNetwork(
    data: unknown[],
    networkType?: 'wifi' | '4g' | '3g' | '2g' | 'offline'
  ): { data: unknown[]; reduced: boolean; originalCount: number } {
    const originalCount = data.length;

    switch (networkType) {
      case '2g':
        // Severely limit data for 2G
        return { data: data.slice(0, 5), reduced: true, originalCount };
      case '3g':
        // Limit data for 3G
        return { data: data.slice(0, 10), reduced: true, originalCount };
      case 'offline':
        // Return empty, client should use cached data
        return { data: [], reduced: true, originalCount };
      default:
        return { data, reduced: false, originalCount };
    }
  }

  /**
   * Encode an offset as an opaque cursor string.
   */
  private encodeCursor(offset: number): string {
    return Buffer.from(`offset:${offset}`).toString('base64');
  }

  /**
   * Decode a cursor string back to an offset.
   */
  private decodeCursor(cursor: string): number {
    try {
      const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
      const match = decoded.match(/^offset:(\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    } catch {
      return 0;
    }
  }
}
