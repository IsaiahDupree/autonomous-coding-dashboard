/**
 * I18N-003: Date/Number/Currency Formatting
 *
 * Per-locale formatting rules for dates, numbers, and currencies,
 * including timezone handling and relative date formatting.
 */

import {
  FormatOptions,
  DateFormatStyle,
  NumberFormatStyle,
} from './types';

export interface RelativeTimeInput {
  value: number;
  unit: 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';
}

export class I18nFormatter {
  private defaultLocale: string;
  private defaultTimezone: string;

  constructor(defaultLocale: string = 'en-US', defaultTimezone: string = 'UTC') {
    this.defaultLocale = defaultLocale;
    this.defaultTimezone = defaultTimezone;
  }

  /**
   * Format a date according to the given style and locale.
   */
  formatDate(date: Date, options?: Partial<FormatOptions>): string {
    const locale = options?.locale ?? this.defaultLocale;
    const timezone = options?.timezone ?? this.defaultTimezone;
    const style = options?.dateStyle ?? 'medium';

    if (style === 'relative') {
      return this.formatRelativeDate(date, locale);
    }

    if (style === 'custom' && options?.customDatePattern) {
      return this.formatCustomDate(date, options.customDatePattern, locale, timezone);
    }

    const intlOptions = this.getDateIntlOptions(style, timezone);
    return new Intl.DateTimeFormat(locale, intlOptions).format(date);
  }

  /**
   * Format a date as a relative time string (e.g., "3 hours ago", "in 2 days").
   */
  formatRelativeDate(date: Date, locale?: string): string {
    const resolvedLocale = locale ?? this.defaultLocale;
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const absDiffMs = Math.abs(diffMs);

    const seconds = Math.floor(absDiffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    let unit: Intl.RelativeTimeFormatUnit;
    let value: number;

    if (years > 0) { unit = 'year'; value = years; }
    else if (months > 0) { unit = 'month'; value = months; }
    else if (weeks > 0) { unit = 'week'; value = weeks; }
    else if (days > 0) { unit = 'day'; value = days; }
    else if (hours > 0) { unit = 'hour'; value = hours; }
    else if (minutes > 0) { unit = 'minute'; value = minutes; }
    else { unit = 'second'; value = seconds; }

    const signedValue = diffMs < 0 ? -value : value;

    try {
      const rtf = new Intl.RelativeTimeFormat(resolvedLocale, { numeric: 'auto' });
      return rtf.format(signedValue, unit);
    } catch {
      // Fallback if Intl.RelativeTimeFormat not available
      const absValue = Math.abs(signedValue);
      const unitStr = absValue === 1 ? unit : `${unit}s`;
      return signedValue < 0 ? `${absValue} ${unitStr} ago` : `in ${absValue} ${unitStr}`;
    }
  }

  /**
   * Format a relative time with explicit value and unit.
   */
  formatRelativeTime(input: RelativeTimeInput, locale?: string): string {
    const resolvedLocale = locale ?? this.defaultLocale;
    try {
      const rtf = new Intl.RelativeTimeFormat(resolvedLocale, { numeric: 'auto' });
      return rtf.format(input.value, input.unit);
    } catch {
      const absValue = Math.abs(input.value);
      const unitStr = absValue === 1 ? input.unit : `${input.unit}s`;
      return input.value < 0 ? `${absValue} ${unitStr} ago` : `in ${absValue} ${unitStr}`;
    }
  }

  /**
   * Format a number according to the given style and locale.
   */
  formatNumber(value: number, options?: Partial<FormatOptions>): string {
    const locale = options?.locale ?? this.defaultLocale;
    const style = options?.numberStyle ?? 'decimal';

    const intlOptions = this.getNumberIntlOptions(style, options);
    return new Intl.NumberFormat(locale, intlOptions).format(value);
  }

  /**
   * Format a currency amount.
   */
  formatCurrency(amount: number, currency: string, options?: Partial<FormatOptions>): string {
    const locale = options?.locale ?? this.defaultLocale;
    const display = options?.currencyDisplay ?? 'symbol';

    const intlOptions: Intl.NumberFormatOptions = {
      style: 'currency',
      currency,
      currencyDisplay: display,
      minimumFractionDigits: options?.minimumFractionDigits,
      maximumFractionDigits: options?.maximumFractionDigits,
    };

    return new Intl.NumberFormat(locale, intlOptions).format(amount);
  }

  /**
   * Format a percentage.
   */
  formatPercent(value: number, options?: Partial<FormatOptions>): string {
    const locale = options?.locale ?? this.defaultLocale;

    const intlOptions: Intl.NumberFormatOptions = {
      style: 'percent',
      minimumFractionDigits: options?.minimumFractionDigits ?? 0,
      maximumFractionDigits: options?.maximumFractionDigits ?? 2,
    };

    return new Intl.NumberFormat(locale, intlOptions).format(value);
  }

  /**
   * Format a compact number (e.g., 1.2K, 3.4M).
   */
  formatCompact(value: number, options?: Partial<FormatOptions>): string {
    const locale = options?.locale ?? this.defaultLocale;

    const intlOptions: Intl.NumberFormatOptions = {
      notation: 'compact',
      compactDisplay: 'short',
      maximumFractionDigits: options?.maximumFractionDigits ?? 1,
    };

    return new Intl.NumberFormat(locale, intlOptions).format(value);
  }

  /**
   * Parse a locale-formatted number string back to a number.
   */
  parseNumber(text: string, locale?: string): number | null {
    const resolvedLocale = locale ?? this.defaultLocale;

    // Determine the group and decimal separators for the locale
    const parts = new Intl.NumberFormat(resolvedLocale).formatToParts(12345.6);
    const groupSep = parts.find(p => p.type === 'group')?.value ?? ',';
    const decimalSep = parts.find(p => p.type === 'decimal')?.value ?? '.';

    let cleaned = text.replace(new RegExp(`[${this.escapeRegex(groupSep)}]`, 'g'), '');
    cleaned = cleaned.replace(new RegExp(`[${this.escapeRegex(decimalSep)}]`, 'g'), '.');
    cleaned = cleaned.replace(/[^\d.\-]/g, '');

    const result = parseFloat(cleaned);
    return isNaN(result) ? null : result;
  }

  /**
   * Get a list of timezone names.
   */
  getTimezoneNames(locale?: string): string[] {
    // Return common IANA timezone names
    return [
      'UTC', 'America/New_York', 'America/Chicago', 'America/Denver',
      'America/Los_Angeles', 'America/Sao_Paulo', 'Europe/London',
      'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow', 'Asia/Dubai',
      'Asia/Kolkata', 'Asia/Shanghai', 'Asia/Tokyo', 'Asia/Seoul',
      'Australia/Sydney', 'Pacific/Auckland',
    ];
  }

  /**
   * Format a date/time with timezone display.
   */
  formatDateTimeWithTimezone(date: Date, timezone: string, locale?: string): string {
    const resolvedLocale = locale ?? this.defaultLocale;
    return new Intl.DateTimeFormat(resolvedLocale, {
      dateStyle: 'medium',
      timeStyle: 'long',
      timeZone: timezone,
    }).format(date);
  }

  /**
   * Set the default locale.
   */
  setDefaultLocale(locale: string): void {
    this.defaultLocale = locale;
  }

  /**
   * Set the default timezone.
   */
  setDefaultTimezone(timezone: string): void {
    this.defaultTimezone = timezone;
  }

  /**
   * Get the current default locale.
   */
  getDefaultLocale(): string {
    return this.defaultLocale;
  }

  /**
   * Get the current default timezone.
   */
  getDefaultTimezone(): string {
    return this.defaultTimezone;
  }

  private getDateIntlOptions(
    style: DateFormatStyle,
    timezone: string
  ): Intl.DateTimeFormatOptions {
    const base: Intl.DateTimeFormatOptions = { timeZone: timezone };

    switch (style) {
      case 'short':
        return { ...base, dateStyle: 'short' };
      case 'medium':
        return { ...base, dateStyle: 'medium' };
      case 'long':
        return { ...base, dateStyle: 'long' };
      case 'full':
        return { ...base, dateStyle: 'full' };
      default:
        return { ...base, dateStyle: 'medium' };
    }
  }

  private getNumberIntlOptions(
    style: NumberFormatStyle,
    options?: Partial<FormatOptions>
  ): Intl.NumberFormatOptions {
    const base: Intl.NumberFormatOptions = {
      minimumFractionDigits: options?.minimumFractionDigits,
      maximumFractionDigits: options?.maximumFractionDigits,
      useGrouping: options?.useGrouping,
    };

    switch (style) {
      case 'decimal':
        return { ...base, style: 'decimal' };
      case 'percent':
        return { ...base, style: 'percent' };
      case 'currency':
        return {
          ...base,
          style: 'currency',
          currency: options?.currency ?? 'USD',
          currencyDisplay: options?.currencyDisplay ?? 'symbol',
        };
      case 'compact':
        return { ...base, notation: 'compact', compactDisplay: 'short' };
      case 'scientific':
        return { ...base, notation: 'scientific' };
      case 'unit':
        return { ...base, style: 'decimal' }; // unit style requires specific unit
      default:
        return { ...base, style: 'decimal' };
    }
  }

  private formatCustomDate(
    date: Date,
    pattern: string,
    locale: string,
    timezone: string
  ): string {
    // Basic pattern replacement: YYYY, MM, DD, HH, mm, ss
    const parts = new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: timezone,
    }).formatToParts(date);

    const partMap: Record<string, string> = {};
    for (const part of parts) {
      partMap[part.type] = part.value;
    }

    return pattern
      .replace('YYYY', partMap['year'] ?? '')
      .replace('MM', partMap['month'] ?? '')
      .replace('DD', partMap['day'] ?? '')
      .replace('HH', partMap['hour'] ?? '')
      .replace('mm', partMap['minute'] ?? '')
      .replace('ss', partMap['second'] ?? '');
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
