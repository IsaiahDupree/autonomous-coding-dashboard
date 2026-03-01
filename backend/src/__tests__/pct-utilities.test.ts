/**
 * PCT Utility Functions Unit Tests
 * Feature: PCT-WC-005 - Unit tests for formatting and helpers
 *
 * Tests utility functions for:
 * - Date formatting
 * - Currency formatting
 * - String manipulation
 * - Edge cases
 */

import { describe, it, expect } from 'vitest';

// ============================================
// DATE UTILITIES
// ============================================

function formatDate(date: Date | string, format: 'short' | 'long' | 'iso' = 'short'): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  if (format === 'iso') {
    return d.toISOString();
  }

  if (format === 'long') {
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  // Short format: MM/DD/YYYY
  return d.toLocaleDateString('en-US');
}

function getRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)} week${Math.floor(diffDay / 7) > 1 ? 's' : ''} ago`;
  if (diffDay < 365) return `${Math.floor(diffDay / 30)} month${Math.floor(diffDay / 30) > 1 ? 's' : ''} ago`;
  return `${Math.floor(diffDay / 365)} year${Math.floor(diffDay / 365) > 1 ? 's' : ''} ago`;
}

function isValidDate(date: any): boolean {
  if (date instanceof Date) {
    return !isNaN(date.getTime());
  }
  if (typeof date === 'string') {
    const d = new Date(date);
    return !isNaN(d.getTime());
  }
  return false;
}

describe('Date Utilities', () => {
  describe('formatDate', () => {
    it('should format date in short format', () => {
      const date = new Date('2024-01-15');
      const result = formatDate(date, 'short');
      expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
    });

    it('should format date in long format', () => {
      const date = new Date('2024-01-15');
      const result = formatDate(date, 'long');
      expect(result).toContain('January');
      expect(result).toContain('2024');
    });

    it('should format date in ISO format', () => {
      const date = new Date('2024-01-15');
      const result = formatDate(date, 'iso');
      expect(result).toContain('2024-01-15');
      expect(result).toContain('T');
      expect(result).toContain('Z');
    });

    it('should handle string dates', () => {
      const result = formatDate('2024-01-15', 'short');
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });
  });

  describe('getRelativeTime', () => {
    it('should return "just now" for recent times', () => {
      const recent = new Date(Date.now() - 30 * 1000); // 30 seconds ago
      expect(getRelativeTime(recent)).toBe('just now');
    });

    it('should return minutes for times within an hour', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const result = getRelativeTime(fiveMinutesAgo);
      expect(result).toContain('minute');
      expect(result).toContain('ago');
    });

    it('should return hours for times within a day', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const result = getRelativeTime(twoHoursAgo);
      expect(result).toContain('hour');
      expect(result).toContain('ago');
    });

    it('should return days for times within a week', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const result = getRelativeTime(threeDaysAgo);
      expect(result).toContain('day');
      expect(result).toContain('ago');
    });

    it('should handle singular vs plural correctly', () => {
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
      expect(getRelativeTime(oneMinuteAgo)).toBe('1 minute ago');

      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
      expect(getRelativeTime(twoMinutesAgo)).toBe('2 minutes ago');
    });
  });

  describe('isValidDate', () => {
    it('should return true for valid Date objects', () => {
      expect(isValidDate(new Date())).toBe(true);
      expect(isValidDate(new Date('2024-01-15'))).toBe(true);
    });

    it('should return false for invalid Date objects', () => {
      expect(isValidDate(new Date('invalid'))).toBe(false);
    });

    it('should return true for valid date strings', () => {
      expect(isValidDate('2024-01-15')).toBe(true);
      expect(isValidDate('2024-01-15T10:30:00Z')).toBe(true);
    });

    it('should return false for invalid date strings', () => {
      expect(isValidDate('not-a-date')).toBe(false);
    });

    it('should return false for non-date values', () => {
      expect(isValidDate(123)).toBe(false);
      expect(isValidDate(null)).toBe(false);
      expect(isValidDate(undefined)).toBe(false);
      expect(isValidDate({})).toBe(false);
    });
  });
});

// ============================================
// CURRENCY UTILITIES
// ============================================

function formatCurrency(amount: number, currency: string = 'USD', locale: string = 'en-US'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
}

function parseCurrency(str: string): number | null {
  const cleaned = str.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return (value / total) * 100;
}

function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

describe('Currency Utilities', () => {
  describe('formatCurrency', () => {
    it('should format USD correctly', () => {
      const result = formatCurrency(1234.56, 'USD');
      expect(result).toContain('1,234.56');
      expect(result).toContain('$');
    });

    it('should format EUR correctly', () => {
      const result = formatCurrency(1234.56, 'EUR', 'en-EU');
      expect(result).toContain('1,234.56');
      expect(result).toContain('€');
    });

    it('should handle zero', () => {
      const result = formatCurrency(0);
      expect(result).toContain('0');
    });

    it('should handle negative amounts', () => {
      const result = formatCurrency(-50);
      expect(result).toContain('-');
      expect(result).toContain('50');
    });

    it('should handle large numbers', () => {
      const result = formatCurrency(1000000);
      expect(result).toContain('1,000,000');
    });
  });

  describe('parseCurrency', () => {
    it('should parse formatted currency strings', () => {
      expect(parseCurrency('$1,234.56')).toBe(1234.56);
      expect(parseCurrency('€1,234.56')).toBe(1234.56);
    });

    it('should parse plain numbers', () => {
      expect(parseCurrency('1234.56')).toBe(1234.56);
      expect(parseCurrency('1234')).toBe(1234);
    });

    it('should handle negative values', () => {
      expect(parseCurrency('-$50.00')).toBe(-50);
    });

    it('should return null for invalid strings', () => {
      expect(parseCurrency('not a number')).toBeNull();
      expect(parseCurrency('')).toBeNull();
    });
  });

  describe('calculatePercentage', () => {
    it('should calculate percentage correctly', () => {
      expect(calculatePercentage(25, 100)).toBe(25);
      expect(calculatePercentage(1, 4)).toBe(25);
    });

    it('should handle zero total', () => {
      expect(calculatePercentage(10, 0)).toBe(0);
    });

    it('should handle decimal results', () => {
      expect(calculatePercentage(1, 3)).toBeCloseTo(33.333, 2);
    });
  });

  describe('formatPercentage', () => {
    it('should format percentage with default decimals', () => {
      expect(formatPercentage(25)).toBe('25.0%');
      expect(formatPercentage(33.333)).toBe('33.3%');
    });

    it('should format percentage with custom decimals', () => {
      expect(formatPercentage(33.333, 2)).toBe('33.33%');
      expect(formatPercentage(33.333, 0)).toBe('33%');
    });
  });
});

// ============================================
// STRING UTILITIES
// ============================================

function truncate(str: string, maxLength: number, suffix: string = '...'): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - suffix.length) + suffix;
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function capitalizeFirst(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function capitalizeWords(str: string): string {
  return str.split(' ').map(capitalizeFirst).join(' ');
}

function sanitizeFilename(str: string): string {
  return str.replace(/[^a-z0-9._-]/gi, '_');
}

function extractEmails(str: string): string[] {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  return str.match(emailRegex) || [];
}

function extractUrls(str: string): string[] {
  const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
  return str.match(urlRegex) || [];
}

describe('String Utilities', () => {
  describe('truncate', () => {
    it('should truncate long strings', () => {
      const result = truncate('This is a very long string', 10);
      expect(result.length).toBe(10);
      expect(result).toContain('...');
    });

    it('should not truncate short strings', () => {
      const result = truncate('Short', 10);
      expect(result).toBe('Short');
    });

    it('should use custom suffix', () => {
      const result = truncate('Long string here', 10, '…');
      expect(result).toContain('…');
    });
  });

  describe('slugify', () => {
    it('should convert spaces to hyphens', () => {
      expect(slugify('Hello World')).toBe('hello-world');
    });

    it('should remove special characters', () => {
      expect(slugify('Hello @World!')).toBe('hello-world');
    });

    it('should handle multiple spaces', () => {
      expect(slugify('Hello    World')).toBe('hello-world');
    });

    it('should remove leading/trailing hyphens', () => {
      expect(slugify('  Hello World  ')).toBe('hello-world');
    });

    it('should handle underscores and hyphens', () => {
      expect(slugify('Hello_World-Test')).toBe('hello-world-test');
    });
  });

  describe('capitalizeFirst', () => {
    it('should capitalize first letter', () => {
      expect(capitalizeFirst('hello')).toBe('Hello');
    });

    it('should not change already capitalized strings', () => {
      expect(capitalizeFirst('Hello')).toBe('Hello');
    });

    it('should handle empty strings', () => {
      expect(capitalizeFirst('')).toBe('');
    });

    it('should handle single characters', () => {
      expect(capitalizeFirst('a')).toBe('A');
    });
  });

  describe('capitalizeWords', () => {
    it('should capitalize all words', () => {
      expect(capitalizeWords('hello world test')).toBe('Hello World Test');
    });

    it('should handle single words', () => {
      expect(capitalizeWords('hello')).toBe('Hello');
    });

    it('should handle multiple spaces', () => {
      expect(capitalizeWords('hello  world')).toBe('Hello  World');
    });
  });

  describe('sanitizeFilename', () => {
    it('should replace invalid characters with underscores', () => {
      expect(sanitizeFilename('my file?.txt')).toBe('my_file_.txt');
    });

    it('should preserve valid characters', () => {
      expect(sanitizeFilename('my-file_123.txt')).toBe('my-file_123.txt');
    });

    it('should handle special characters', () => {
      expect(sanitizeFilename('file@#$%.txt')).toBe('file____.txt');
    });
  });

  describe('extractEmails', () => {
    it('should extract email addresses', () => {
      const text = 'Contact us at info@example.com or support@test.co.uk';
      const emails = extractEmails(text);
      expect(emails).toContain('info@example.com');
      expect(emails).toContain('support@test.co.uk');
    });

    it('should return empty array when no emails found', () => {
      expect(extractEmails('No emails here')).toEqual([]);
    });

    it('should handle single email', () => {
      const emails = extractEmails('Email: test@example.com');
      expect(emails).toHaveLength(1);
      expect(emails[0]).toBe('test@example.com');
    });
  });

  describe('extractUrls', () => {
    it('should extract HTTP URLs', () => {
      const text = 'Visit http://example.com or https://test.com';
      const urls = extractUrls(text);
      expect(urls).toContain('http://example.com');
      expect(urls).toContain('https://test.com');
    });

    it('should extract URLs with paths', () => {
      const text = 'See https://example.com/path/to/page?param=value';
      const urls = extractUrls(text);
      expect(urls).toHaveLength(1);
      expect(urls[0]).toContain('/path/to/page');
    });

    it('should return empty array when no URLs found', () => {
      expect(extractUrls('No URLs here')).toEqual([]);
    });
  });
});

// ============================================
// ARRAY UTILITIES
// ============================================

function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

function unique<T>(array: T[]): T[] {
  return Array.from(new Set(array));
}

function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((acc, item) => {
    const groupKey = String(item[key]);
    if (!acc[groupKey]) acc[groupKey] = [];
    acc[groupKey].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

describe('Array Utilities', () => {
  describe('chunk', () => {
    it('should split array into chunks', () => {
      const result = chunk([1, 2, 3, 4, 5], 2);
      expect(result).toEqual([[1, 2], [3, 4], [5]]);
    });

    it('should handle exact divisions', () => {
      const result = chunk([1, 2, 3, 4], 2);
      expect(result).toEqual([[1, 2], [3, 4]]);
    });

    it('should handle chunk size larger than array', () => {
      const result = chunk([1, 2], 5);
      expect(result).toEqual([[1, 2]]);
    });

    it('should handle empty arrays', () => {
      const result = chunk([], 2);
      expect(result).toEqual([]);
    });
  });

  describe('unique', () => {
    it('should remove duplicates', () => {
      expect(unique([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3]);
    });

    it('should work with strings', () => {
      expect(unique(['a', 'b', 'a', 'c'])).toEqual(['a', 'b', 'c']);
    });

    it('should handle empty arrays', () => {
      expect(unique([])).toEqual([]);
    });
  });

  describe('shuffle', () => {
    it('should maintain array length', () => {
      const original = [1, 2, 3, 4, 5];
      const shuffled = shuffle(original);
      expect(shuffled.length).toBe(original.length);
    });

    it('should not modify original array', () => {
      const original = [1, 2, 3];
      const shuffled = shuffle(original);
      expect(original).toEqual([1, 2, 3]);
    });

    it('should contain all original elements', () => {
      const original = [1, 2, 3, 4, 5];
      const shuffled = shuffle(original);
      expect(shuffled.sort()).toEqual(original.sort());
    });
  });

  describe('groupBy', () => {
    it('should group objects by key', () => {
      const items = [
        { category: 'fruit', name: 'apple' },
        { category: 'fruit', name: 'banana' },
        { category: 'vegetable', name: 'carrot' },
      ];
      const grouped = groupBy(items, 'category');
      expect(grouped.fruit).toHaveLength(2);
      expect(grouped.vegetable).toHaveLength(1);
    });

    it('should handle empty arrays', () => {
      const grouped = groupBy([], 'key' as any);
      expect(grouped).toEqual({});
    });
  });
});

// ============================================
// OBJECT UTILITIES
// ============================================

function pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  keys.forEach(key => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
}

function omit<T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj };
  keys.forEach(key => {
    delete result[key];
  });
  return result;
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

describe('Object Utilities', () => {
  describe('pick', () => {
    it('should pick specified keys', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = pick(obj, ['a', 'c']);
      expect(result).toEqual({ a: 1, c: 3 });
    });

    it('should handle non-existent keys', () => {
      const obj = { a: 1, b: 2 };
      const result = pick(obj, ['a', 'z' as any]);
      expect(result).toEqual({ a: 1 });
    });
  });

  describe('omit', () => {
    it('should omit specified keys', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = omit(obj, ['b']);
      expect(result).toEqual({ a: 1, c: 3 });
    });
  });

  describe('deepClone', () => {
    it('should create a deep copy', () => {
      const original = { a: 1, nested: { b: 2 } };
      const cloned = deepClone(original);
      cloned.nested.b = 3;
      expect(original.nested.b).toBe(2);
    });
  });
});
