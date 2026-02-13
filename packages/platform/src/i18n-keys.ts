/**
 * I18N-001: Translation Key Management
 *
 * Namespaced translation keys, fallback locale support, plural forms,
 * and interpolation.
 */

import {
  TranslationKey,
  TranslationBundle,
  TranslationBundleSchema,
  TranslationValue,
  I18nConfig,
  I18nConfigSchema,
  PluralForm,
} from './types';

export interface AddTranslationInput {
  locale: string;
  namespace: string;
  key: string;
  value: TranslationValue;
}

/**
 * Determines the CLDR plural category for a given count and locale.
 * Simplified implementation supporting common plural rules.
 */
function getPluralForm(count: number, locale: string): PluralForm {
  const lang = locale.split('-')[0];

  // English-like: one or other
  if (['en', 'de', 'nl', 'sv', 'da', 'no', 'nb', 'nn', 'it', 'es', 'pt', 'fr'].includes(lang)) {
    if (count === 0) return 'zero';
    if (count === 1) return 'one';
    return 'other';
  }

  // Arabic: complex plural rules
  if (lang === 'ar') {
    if (count === 0) return 'zero';
    if (count === 1) return 'one';
    if (count === 2) return 'two';
    const mod100 = count % 100;
    if (mod100 >= 3 && mod100 <= 10) return 'few';
    if (mod100 >= 11 && mod100 <= 99) return 'many';
    return 'other';
  }

  // Polish-like
  if (['pl', 'cs', 'sk', 'hr', 'sr', 'bs', 'uk', 'ru'].includes(lang)) {
    if (count === 1) return 'one';
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return 'few';
    if (mod10 === 0 || (mod10 >= 5 && mod10 <= 9) || (mod100 >= 11 && mod100 <= 14)) return 'many';
    return 'other';
  }

  // Default
  if (count === 0) return 'zero';
  if (count === 1) return 'one';
  return 'other';
}

export class TranslationKeyManager {
  private config: I18nConfig;
  // Map<locale, Map<namespace, Map<key, TranslationValue>>>
  private translations: Map<string, Map<string, Map<string, TranslationValue>>> = new Map();
  private registeredKeys: Map<string, TranslationKey> = new Map(); // "namespace:key" -> TranslationKey

  constructor(config: I18nConfig) {
    this.config = I18nConfigSchema.parse(config);
  }

  /**
   * Register a translation key with its default value and metadata.
   */
  registerKey(key: TranslationKey): void {
    const fullKey = `${key.namespace}:${key.key}`;
    this.registeredKeys.set(fullKey, key);

    // Set default value for default locale if not already set
    this.setTranslation(this.config.defaultLocale, key.namespace, key.key, key.defaultValue);
  }

  /**
   * Set a translation value for a specific locale/namespace/key.
   */
  setTranslation(locale: string, namespace: string, key: string, value: TranslationValue): void {
    if (!this.translations.has(locale)) {
      this.translations.set(locale, new Map());
    }
    const localeMap = this.translations.get(locale)!;

    if (!localeMap.has(namespace)) {
      localeMap.set(namespace, new Map());
    }
    localeMap.get(namespace)!.set(key, value);
  }

  /**
   * Add a complete translation bundle for a locale/namespace.
   */
  addBundle(bundle: TranslationBundle): void {
    const validated = TranslationBundleSchema.parse(bundle);
    for (const [key, value] of Object.entries(validated.translations)) {
      this.setTranslation(validated.locale, validated.namespace, key, value);
    }
  }

  /**
   * Translate a key with optional interpolation variables and plural count.
   */
  translate(
    namespace: string,
    key: string,
    vars?: Record<string, string | number>,
    count?: number,
    locale?: string
  ): string {
    const resolvedLocale = locale ?? this.config.defaultLocale;
    let value = this.getRawValue(resolvedLocale, namespace, key);

    // Fallback to fallback locale
    if (value === undefined && resolvedLocale !== this.config.fallbackLocale) {
      value = this.getRawValue(this.config.fallbackLocale, namespace, key);
    }

    // Fallback to default locale
    if (value === undefined && resolvedLocale !== this.config.defaultLocale) {
      value = this.getRawValue(this.config.defaultLocale, namespace, key);
    }

    if (value === undefined) {
      return `[${namespace}:${key}]`;
    }

    let result: string;

    if (typeof value === 'string') {
      result = value;
    } else {
      // Plural form lookup
      const pluralForm = count !== undefined
        ? getPluralForm(count, resolvedLocale)
        : 'other';

      result = value[pluralForm] ?? value['other'] ?? Object.values(value)[0] ?? `[${namespace}:${key}]`;
    }

    // Interpolation
    if (vars) {
      const prefix = this.config.interpolation?.prefix ?? '{{';
      const suffix = this.config.interpolation?.suffix ?? '}}';

      for (const [varName, varValue] of Object.entries(vars)) {
        const placeholder = `${prefix}${varName}${suffix}`;
        result = result.split(placeholder).join(String(varValue));
      }
    }

    // Replace {{count}} if count is provided
    if (count !== undefined) {
      const prefix = this.config.interpolation?.prefix ?? '{{';
      const suffix = this.config.interpolation?.suffix ?? '}}';
      result = result.split(`${prefix}count${suffix}`).join(String(count));
    }

    return result;
  }

  /**
   * Shorthand for translate.
   */
  t(namespace: string, key: string, vars?: Record<string, string | number>, count?: number, locale?: string): string {
    return this.translate(namespace, key, vars, count, locale);
  }

  /**
   * Check if a translation exists for the given locale.
   */
  hasTranslation(locale: string, namespace: string, key: string): boolean {
    return this.getRawValue(locale, namespace, key) !== undefined;
  }

  /**
   * Get all translations for a given locale and namespace.
   */
  getBundle(locale: string, namespace: string): Record<string, TranslationValue> {
    const nsMap = this.translations.get(locale)?.get(namespace);
    if (!nsMap) return {};
    return Object.fromEntries(nsMap.entries());
  }

  /**
   * Get all registered keys.
   */
  getRegisteredKeys(): TranslationKey[] {
    return Array.from(this.registeredKeys.values());
  }

  /**
   * Get missing translations for a locale (keys registered but not translated).
   */
  getMissingTranslations(locale: string): Array<{ namespace: string; key: string }> {
    const missing: Array<{ namespace: string; key: string }> = [];

    for (const [, registeredKey] of this.registeredKeys) {
      if (!this.hasTranslation(locale, registeredKey.namespace, registeredKey.key)) {
        missing.push({ namespace: registeredKey.namespace, key: registeredKey.key });
      }
    }

    return missing;
  }

  /**
   * Get the current config.
   */
  getConfig(): I18nConfig {
    return { ...this.config };
  }

  /**
   * Get supported locales.
   */
  getSupportedLocales(): string[] {
    return [...this.config.supportedLocales];
  }

  private getRawValue(locale: string, namespace: string, key: string): TranslationValue | undefined {
    return this.translations.get(locale)?.get(namespace)?.get(key);
  }
}
