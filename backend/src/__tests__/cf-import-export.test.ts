/**
 * Content Factory Import/Export Integration Tests
 * Feature: CF-WC-009 - Integration tests for import/export
 *
 * Tests:
 * - CSV/JSON upload and parsing
 * - Field mapping
 * - Import validation
 * - Export formatting
 */

import { describe, it, expect, beforeEach } from 'vitest';

// ============================================
// MOCK DATA STRUCTURES
// ============================================

interface ProductDossier {
  id: string;
  productName: string;
  benefits: string[];
  painPoints: string[];
  tiktokShopLink?: string;
  category?: string;
}

interface TikTokShopProduct {
  id: string;
  title: string;
  description: string;
  price: number;
  images: string[];
  productUrl: string;
}

interface ExportPreset {
  id: string;
  name: string;
  fields: string[];
  format: 'csv' | 'json';
}

// ============================================
// IMPORT SERVICE MOCK
// ============================================

class ImportService {
  async parseCSV(csvContent: string): Promise<any[]> {
    const trimmed = csvContent.trim();
    if (trimmed === '') {
      throw new Error('Empty CSV file');
    }

    const lines = trimmed.split('\n');
    if (lines.length === 0) {
      throw new Error('Empty CSV file');
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const rows: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      rows.push(row);
    }

    return rows;
  }

  async parseJSON(jsonContent: string): Promise<any[]> {
    try {
      const data = JSON.parse(jsonContent);
      return Array.isArray(data) ? data : [data];
    } catch (error) {
      throw new Error('Invalid JSON format');
    }
  }

  async mapFields(
    data: any[],
    mapping: Record<string, string>
  ): Promise<ProductDossier[]> {
    return data.map((row, index) => {
      const mapped: any = {
        id: `imported-${index}`,
      };

      Object.entries(mapping).forEach(([targetField, sourceField]) => {
        mapped[targetField] = row[sourceField];
      });

      // Parse arrays from string
      if (typeof mapped.benefits === 'string') {
        mapped.benefits = mapped.benefits.split('|').map((s: string) => s.trim());
      }
      if (typeof mapped.painPoints === 'string') {
        mapped.painPoints = mapped.painPoints.split('|').map((s: string) => s.trim());
      }

      return mapped;
    });
  }

  async validateDossier(dossier: Partial<ProductDossier>): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    if (!dossier.productName || dossier.productName.trim() === '') {
      errors.push('Product name is required');
    }

    if (!dossier.benefits || !Array.isArray(dossier.benefits) || dossier.benefits.length === 0) {
      errors.push('At least one benefit is required');
    }

    if (!dossier.painPoints || !Array.isArray(dossier.painPoints) || dossier.painPoints.length === 0) {
      errors.push('At least one pain point is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  async importTikTokShopProducts(productIds: string[]): Promise<TikTokShopProduct[]> {
    // Simulate API call to TikTok Shop
    return productIds.map((id, index) => ({
      id,
      title: `Product ${index + 1}`,
      description: `Description for product ${id}`,
      price: 29.99 + index * 10,
      images: [`https://example.com/image-${id}.jpg`],
      productUrl: `https://tiktokshop.com/product/${id}`,
    }));
  }

  async convertTikTokProductToDossier(
    product: TikTokShopProduct,
    additionalData: Partial<ProductDossier>
  ): Promise<ProductDossier> {
    return {
      id: `dossier-${product.id}`,
      productName: product.title,
      benefits: additionalData.benefits || ['Benefit 1', 'Benefit 2'],
      painPoints: additionalData.painPoints || ['Pain 1', 'Pain 2'],
      tiktokShopLink: product.productUrl,
      category: additionalData.category,
    };
  }
}

// ============================================
// EXPORT SERVICE MOCK
// ============================================

class ExportService {
  async exportToCSV(dossiers: ProductDossier[], customHeaders?: string[]): Promise<string> {
    if (dossiers.length === 0) {
      throw new Error('No data to export');
    }

    const headers = customHeaders || ['id', 'productName', 'benefits', 'painPoints', 'tiktokShopLink', 'category'];
    const csvLines = [headers.join(',')];

    dossiers.forEach(dossier => {
      const row = headers.map(header => {
        const value = (dossier as any)[header];
        if (Array.isArray(value)) {
          return value.join('|');
        }
        return value || '';
      });
      csvLines.push(row.join(','));
    });

    return csvLines.join('\n');
  }

  async exportToJSON(dossiers: ProductDossier[], pretty: boolean = false): Promise<string> {
    if (dossiers.length === 0) {
      throw new Error('No data to export');
    }

    return JSON.stringify(dossiers, null, pretty ? 2 : 0);
  }

  async exportWithPreset(dossiers: ProductDossier[], preset: ExportPreset): Promise<string> {
    const filteredDossiers = dossiers.map(d => {
      const filtered: any = {};
      preset.fields.forEach(field => {
        filtered[field] = (d as any)[field];
      });
      return filtered;
    });

    if (preset.format === 'csv') {
      return this.exportToCSV(filteredDossiers, preset.fields);
    } else {
      return this.exportToJSON(filteredDossiers, true);
    }
  }

  getAvailablePresets(): ExportPreset[] {
    return [
      {
        id: 'basic',
        name: 'Basic Dossier Export',
        fields: ['id', 'productName', 'category'],
        format: 'csv',
      },
      {
        id: 'full',
        name: 'Full Dossier Export',
        fields: ['id', 'productName', 'benefits', 'painPoints', 'tiktokShopLink', 'category'],
        format: 'json',
      },
    ];
  }
}

// ============================================
// TESTS
// ============================================

describe('CF Import/Export Integration', () => {
  let importService: ImportService;
  let exportService: ExportService;

  beforeEach(() => {
    importService = new ImportService();
    exportService = new ExportService();
  });

  // ============================================
  // UPLOAD TESTS
  // ============================================

  describe('Upload', () => {
    it('should parse valid CSV file', async () => {
      const csvContent = `productName,benefits,painPoints
Product A,Benefit 1|Benefit 2,Pain 1|Pain 2
Product B,Benefit 3|Benefit 4,Pain 3|Pain 4`;

      const rows = await importService.parseCSV(csvContent);

      expect(rows).toHaveLength(2);
      expect(rows[0].productName).toBe('Product A');
      expect(rows[1].productName).toBe('Product B');
    });

    it('should parse valid JSON file', async () => {
      const jsonContent = JSON.stringify([
        { productName: 'Product A', benefits: ['B1', 'B2'], painPoints: ['P1'] },
        { productName: 'Product B', benefits: ['B3'], painPoints: ['P2', 'P3'] },
      ]);

      const rows = await importService.parseJSON(jsonContent);

      expect(rows).toHaveLength(2);
      expect(rows[0].productName).toBe('Product A');
      expect(rows[0].benefits).toEqual(['B1', 'B2']);
    });

    it('should handle single object JSON', async () => {
      const jsonContent = JSON.stringify({
        productName: 'Product A',
        benefits: ['B1'],
        painPoints: ['P1'],
      });

      const rows = await importService.parseJSON(jsonContent);

      expect(rows).toHaveLength(1);
      expect(rows[0].productName).toBe('Product A');
    });

    it('should reject empty CSV', async () => {
      await expect(importService.parseCSV('')).rejects.toThrow('Empty CSV file');
    });

    it('should reject invalid JSON', async () => {
      await expect(importService.parseJSON('invalid json')).rejects.toThrow('Invalid JSON format');
    });
  });

  // ============================================
  // MAPPING TESTS
  // ============================================

  describe('Map', () => {
    it('should map CSV fields to dossier schema', async () => {
      const data = [
        {
          'Product Name': 'Product A',
          'Key Benefits': 'B1|B2',
          'Pain Points': 'P1|P2',
        },
      ];

      const mapping = {
        productName: 'Product Name',
        benefits: 'Key Benefits',
        painPoints: 'Pain Points',
      };

      const dossiers = await importService.mapFields(data, mapping);

      expect(dossiers).toHaveLength(1);
      expect(dossiers[0].productName).toBe('Product A');
      expect(dossiers[0].benefits).toEqual(['B1', 'B2']);
      expect(dossiers[0].painPoints).toEqual(['P1', 'P2']);
    });

    it('should handle missing optional fields', async () => {
      const data = [
        {
          name: 'Product A',
          benefits: 'B1',
          painPoints: 'P1',
        },
      ];

      const mapping = {
        productName: 'name',
        benefits: 'benefits',
        painPoints: 'painPoints',
      };

      const dossiers = await importService.mapFields(data, mapping);

      expect(dossiers).toHaveLength(1);
      expect(dossiers[0].productName).toBe('Product A');
      expect(dossiers[0].tiktokShopLink).toBeUndefined();
    });
  });

  // ============================================
  // IMPORT VALIDATION TESTS
  // ============================================

  describe('Import', () => {
    it('should validate required fields', async () => {
      const dossier: Partial<ProductDossier> = {
        productName: 'Product A',
        benefits: ['B1', 'B2'],
        painPoints: ['P1'],
      };

      const result = await importService.validateDossier(dossier);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject dossier without product name', async () => {
      const dossier: Partial<ProductDossier> = {
        productName: '',
        benefits: ['B1'],
        painPoints: ['P1'],
      };

      const result = await importService.validateDossier(dossier);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Product name is required');
    });

    it('should reject dossier without benefits', async () => {
      const dossier: Partial<ProductDossier> = {
        productName: 'Product A',
        benefits: [],
        painPoints: ['P1'],
      };

      const result = await importService.validateDossier(dossier);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('At least one benefit is required');
    });

    it('should reject dossier without pain points', async () => {
      const dossier: Partial<ProductDossier> = {
        productName: 'Product A',
        benefits: ['B1'],
        painPoints: [],
      };

      const result = await importService.validateDossier(dossier);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('At least one pain point is required');
    });

    it('should import TikTok Shop products', async () => {
      const productIds = ['prod-123', 'prod-456'];

      const products = await importService.importTikTokShopProducts(productIds);

      expect(products).toHaveLength(2);
      expect(products[0].id).toBe('prod-123');
      expect(products[0].productUrl).toContain('prod-123');
    });

    it('should convert TikTok product to dossier', async () => {
      const product: TikTokShopProduct = {
        id: 'prod-123',
        title: 'Amazing Widget',
        description: 'A great product',
        price: 29.99,
        images: ['img1.jpg'],
        productUrl: 'https://tiktokshop.com/product/prod-123',
      };

      const dossier = await importService.convertTikTokProductToDossier(product, {
        benefits: ['Solves problem X', 'Easy to use'],
        painPoints: ['Without it, you suffer Y'],
        category: 'gadgets',
      });

      expect(dossier.productName).toBe('Amazing Widget');
      expect(dossier.tiktokShopLink).toBe(product.productUrl);
      expect(dossier.benefits).toHaveLength(2);
      expect(dossier.category).toBe('gadgets');
    });
  });

  // ============================================
  // EXPORT TESTS
  // ============================================

  describe('Export', () => {
    const sampleDossiers: ProductDossier[] = [
      {
        id: 'd1',
        productName: 'Product A',
        benefits: ['B1', 'B2'],
        painPoints: ['P1', 'P2'],
        tiktokShopLink: 'https://tiktokshop.com/a',
        category: 'health',
      },
      {
        id: 'd2',
        productName: 'Product B',
        benefits: ['B3'],
        painPoints: ['P3'],
        category: 'tech',
      },
    ];

    it('should export to CSV format', async () => {
      const csv = await exportService.exportToCSV(sampleDossiers);

      expect(csv).toContain('id,productName,benefits,painPoints');
      expect(csv).toContain('Product A');
      expect(csv).toContain('B1|B2');
      expect(csv).toContain('P1|P2');
    });

    it('should export to JSON format', async () => {
      const json = await exportService.exportToJSON(sampleDossiers, true);
      const parsed = JSON.parse(json);

      expect(parsed).toHaveLength(2);
      expect(parsed[0].productName).toBe('Product A');
      expect(parsed[0].benefits).toEqual(['B1', 'B2']);
    });

    it('should export with preset (basic)', async () => {
      const presets = exportService.getAvailablePresets();
      const basicPreset = presets.find(p => p.id === 'basic')!;

      const result = await exportService.exportWithPreset(sampleDossiers, basicPreset);

      expect(result).toContain('id,productName,category');
      expect(result).toContain('Product A');
      expect(result).not.toContain('benefits'); // Not in basic preset
    });

    it('should export with preset (full)', async () => {
      const presets = exportService.getAvailablePresets();
      const fullPreset = presets.find(p => p.id === 'full')!;

      const result = await exportService.exportWithPreset(sampleDossiers, fullPreset);
      const parsed = JSON.parse(result);

      expect(parsed).toHaveLength(2);
      expect(parsed[0]).toHaveProperty('benefits');
      expect(parsed[0]).toHaveProperty('painPoints');
    });

    it('should reject export with no data', async () => {
      await expect(exportService.exportToCSV([])).rejects.toThrow('No data to export');
      await expect(exportService.exportToJSON([])).rejects.toThrow('No data to export');
    });

    it('should list available presets', () => {
      const presets = exportService.getAvailablePresets();

      expect(presets.length).toBeGreaterThan(0);
      expect(presets[0]).toHaveProperty('id');
      expect(presets[0]).toHaveProperty('name');
      expect(presets[0]).toHaveProperty('fields');
      expect(presets[0]).toHaveProperty('format');
    });
  });

  // ============================================
  // INTEGRATION WORKFLOW TESTS
  // ============================================

  describe('Full Import/Export Workflow', () => {
    it('should complete CSV import → validate → export cycle', async () => {
      // 1. Upload CSV
      const csvContent = `productName,benefits,painPoints,category
Product A,B1|B2,P1|P2,health
Product B,B3|B4,P3,tech`;

      const rows = await importService.parseCSV(csvContent);

      // 2. Map fields
      const mapping = {
        productName: 'productName',
        benefits: 'benefits',
        painPoints: 'painPoints',
        category: 'category',
      };

      const dossiers = await importService.mapFields(rows, mapping);

      // 3. Validate
      for (const dossier of dossiers) {
        const validation = await importService.validateDossier(dossier);
        expect(validation.valid).toBe(true);
      }

      // 4. Export
      const exportedCSV = await exportService.exportToCSV(dossiers);
      expect(exportedCSV).toContain('Product A');
      expect(exportedCSV).toContain('Product B');
    });

    it('should complete TikTok import → convert → export cycle', async () => {
      // 1. Import TikTok products
      const products = await importService.importTikTokShopProducts(['prod-1', 'prod-2']);

      // 2. Convert to dossiers
      const dossiers = await Promise.all(
        products.map(p =>
          importService.convertTikTokProductToDossier(p, {
            benefits: ['Great benefit'],
            painPoints: ['Solves pain'],
            category: 'imported',
          })
        )
      );

      // 3. Validate
      for (const dossier of dossiers) {
        const validation = await importService.validateDossier(dossier);
        expect(validation.valid).toBe(true);
      }

      // 4. Export
      const exportedJSON = await exportService.exportToJSON(dossiers);
      const parsed = JSON.parse(exportedJSON);
      expect(parsed).toHaveLength(2);
    });
  });
});
