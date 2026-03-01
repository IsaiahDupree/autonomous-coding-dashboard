/**
 * Query Optimization Service
 * Provides optimized database queries and connection pooling
 */

import { PrismaClient } from '@prisma/client';

// Prisma with connection pooling
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Configure connection pool
// This is configured in DATABASE_URL, e.g.:
// postgresql://user:password@localhost:5432/db?connection_limit=20&pool_timeout=30

class QueryOptimizer {
  /**
   * Batch load related data to avoid N+1 queries
   */
  async loadBrandsWithProducts(userId: string) {
    // Instead of:
    // const brands = await prisma.pctBrand.findMany({ where: { createdBy: userId } });
    // for (const brand of brands) {
    //   brand.products = await prisma.pctProduct.findMany({ where: { brandId: brand.id } });
    // }

    // Use include to load in single query:
    return await prisma.pctBrand.findMany({
      where: { createdBy: userId },
      include: {
        products: {
          select: {
            id: true,
            name: true,
            description: true,
            createdAt: true,
            _count: {
              select: {
                usps: true,
                hooks: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Optimized product query with all related data
   */
  async loadProductWithFullData(productId: string) {
    return await prisma.pctProduct.findUnique({
      where: { id: productId },
      include: {
        brand: {
          select: {
            id: true,
            name: true,
            voice: true,
            toneStyle: true,
          },
        },
        voiceOfCustomer: {
          select: {
            id: true,
            content: true,
            source: true,
            painPoint: true,
            desireLevel: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 100,
        },
        usps: {
          where: { approved: true },
          include: {
            angles: {
              where: { approved: true },
              include: {
                hooks: {
                  where: { approved: true },
                  orderBy: { performanceScore: 'desc' },
                  take: 50,
                },
                _count: {
                  select: { hooks: true },
                },
              },
              orderBy: { createdAt: 'desc' },
            },
            _count: {
              select: { angles: true },
            },
          },
          orderBy: { score: 'desc' },
        },
        _count: {
          select: {
            usps: true,
            hooks: true,
            voiceOfCustomer: true,
          },
        },
      },
    });
  }

  /**
   * Paginated query with cursor-based pagination (more efficient than offset)
   */
  async paginateHooks(
    angleId: string,
    cursor?: string,
    pageSize: number = 20
  ) {
    return await prisma.pctHook.findMany({
      where: { angleId },
      take: pageSize + 1, // Fetch one extra to check if there's a next page
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1, // Skip the cursor
      }),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        text: true,
        framework: true,
        awarenessLevel: true,
        sophisticationLevel: true,
        approved: true,
        performanceScore: true,
        createdAt: true,
      },
    });
  }

  /**
   * Aggregation queries
   */
  async getProductStats(productId: string) {
    const [uspCount, approvedUspCount, hookCount, approvedHookCount, vocCount] = await Promise.all([
      prisma.pctUsp.count({ where: { productId } }),
      prisma.pctUsp.count({ where: { productId, approved: true } }),
      prisma.pctHook.count({
        where: {
          angle: {
            usp: {
              productId,
            },
          },
        },
      }),
      prisma.pctHook.count({
        where: {
          approved: true,
          angle: {
            usp: {
              productId,
            },
          },
        },
      }),
      prisma.pctVoiceOfCustomer.count({ where: { productId } }),
    ]);

    return {
      uspCount,
      approvedUspCount,
      hookCount,
      approvedHookCount,
      vocCount,
      approvalRate: uspCount > 0 ? (approvedUspCount / uspCount) * 100 : 0,
    };
  }

  /**
   * Batch operations (more efficient than individual inserts)
   */
  async batchCreateHooks(hooks: any[]) {
    return await prisma.pctHook.createMany({
      data: hooks,
      skipDuplicates: true,
    });
  }

  /**
   * Transaction for atomic operations
   */
  async deleteProductWithData(productId: string) {
    return await prisma.$transaction(async (tx) => {
      // Delete in reverse dependency order
      const usps = await tx.pctUsp.findMany({
        where: { productId },
        select: {
          id: true,
          angles: {
            select: { id: true },
          },
        },
      });

      // Delete hooks
      for (const usp of usps) {
        for (const angle of usp.angles) {
          await tx.pctHook.deleteMany({ where: { angleId: angle.id } });
        }
      }

      // Delete angles
      for (const usp of usps) {
        await tx.pctMarketingAngle.deleteMany({ where: { uspId: usp.id } });
      }

      // Delete USPs
      await tx.pctUsp.deleteMany({ where: { productId } });

      // Delete VoC
      await tx.pctVoiceOfCustomer.deleteMany({ where: { productId } });

      // Delete product
      await tx.pctProduct.delete({ where: { id: productId } });
    });
  }

  /**
   * Raw query for complex operations
   */
  async getTopPerformingHooks(limit: number = 10) {
    return await prisma.$queryRaw`
      SELECT
        h.id,
        h.text,
        h."performanceScore",
        h."createdAt",
        p.name as product_name,
        b.name as brand_name
      FROM "PctHook" h
      INNER JOIN "PctMarketingAngle" a ON h."angleId" = a.id
      INNER JOIN "PctUsp" u ON a."uspId" = u.id
      INNER JOIN "PctProduct" p ON u."productId" = p.id
      INNER JOIN "PctBrand" b ON p."brandId" = b.id
      WHERE h.approved = true
        AND h."performanceScore" IS NOT NULL
      ORDER BY h."performanceScore" DESC
      LIMIT ${limit}
    `;
  }

  /**
   * Query with proper indexing for full-text search
   */
  async searchHooks(query: string, productId?: string) {
    const where: any = {
      OR: [
        { text: { contains: query, mode: 'insensitive' } },
        { framework: { contains: query, mode: 'insensitive' } },
      ],
    };

    if (productId) {
      where.angle = {
        usp: {
          productId,
        },
      };
    }

    return await prisma.pctHook.findMany({
      where,
      take: 50,
      orderBy: { performanceScore: 'desc' },
      select: {
        id: true,
        text: true,
        framework: true,
        approved: true,
        performanceScore: true,
        angle: {
          select: {
            usp: {
              select: {
                text: true,
                product: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }
}

export const queryOptimizer = new QueryOptimizer();
export { prisma };
