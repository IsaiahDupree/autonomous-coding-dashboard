/**
 * Shared utility functions for the platform package.
 */

import * as crypto from 'crypto';

/**
 * Generate a UUID v4 using Node.js crypto module.
 */
export function v4Fallback(): string {
  return crypto.randomUUID();
}

/**
 * Calculate Levenshtein distance between two strings for fuzzy matching.
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Tokenize text into searchable terms (lowercased, split on non-alphanumeric).
 */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(t => t.length > 0);
}

/**
 * Simple text highlighting: wraps matched terms with tags.
 */
export function highlightText(
  text: string,
  queryTerms: string[],
  preTag: string = '<mark>',
  postTag: string = '</mark>'
): string {
  if (queryTerms.length === 0) return text;

  const escaped = queryTerms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = new RegExp(`(${escaped.join('|')})`, 'gi');
  return text.replace(pattern, `${preTag}$1${postTag}`);
}

/**
 * Deep clone an object via structured clone or JSON fallback.
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}
