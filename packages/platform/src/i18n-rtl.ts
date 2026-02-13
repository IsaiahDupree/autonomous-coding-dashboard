/**
 * I18N-004: RTL Support Configuration
 *
 * Direction detection, layout mirroring rules, and CSS logical property helpers.
 */

import {
  TextDirection,
  RTLConfig,
  RTLConfigSchema,
  LayoutMirrorRule,
} from './types';

/** Default RTL locales based on script direction. */
const DEFAULT_RTL_LOCALES = ['ar', 'he', 'fa', 'ur', 'ps', 'sd', 'yi', 'dv', 'ha', 'ku', 'ks'];

/** Standard layout mirroring rules for physical-to-logical CSS properties. */
const STANDARD_MIRROR_RULES: LayoutMirrorRule[] = [
  { property: 'margin-left', ltrValue: 'margin-left', rtlValue: 'margin-right' },
  { property: 'margin-right', ltrValue: 'margin-right', rtlValue: 'margin-left' },
  { property: 'padding-left', ltrValue: 'padding-left', rtlValue: 'padding-right' },
  { property: 'padding-right', ltrValue: 'padding-right', rtlValue: 'padding-left' },
  { property: 'border-left', ltrValue: 'border-left', rtlValue: 'border-right' },
  { property: 'border-right', ltrValue: 'border-right', rtlValue: 'border-left' },
  { property: 'left', ltrValue: 'left', rtlValue: 'right' },
  { property: 'right', ltrValue: 'right', rtlValue: 'left' },
  { property: 'text-align: left', ltrValue: 'text-align: left', rtlValue: 'text-align: right' },
  { property: 'text-align: right', ltrValue: 'text-align: right', rtlValue: 'text-align: left' },
  { property: 'float: left', ltrValue: 'float: left', rtlValue: 'float: right' },
  { property: 'float: right', ltrValue: 'float: right', rtlValue: 'float: left' },
];

/** Mapping from physical CSS properties to logical equivalents. */
const PHYSICAL_TO_LOGICAL: Record<string, string> = {
  'margin-left': 'margin-inline-start',
  'margin-right': 'margin-inline-end',
  'padding-left': 'padding-inline-start',
  'padding-right': 'padding-inline-end',
  'border-left': 'border-inline-start',
  'border-right': 'border-inline-end',
  'left': 'inset-inline-start',
  'right': 'inset-inline-end',
  'border-left-width': 'border-inline-start-width',
  'border-right-width': 'border-inline-end-width',
  'border-left-color': 'border-inline-start-color',
  'border-right-color': 'border-inline-end-color',
  'border-left-style': 'border-inline-start-style',
  'border-right-style': 'border-inline-end-style',
  'border-top-left-radius': 'border-start-start-radius',
  'border-top-right-radius': 'border-start-end-radius',
  'border-bottom-left-radius': 'border-end-start-radius',
  'border-bottom-right-radius': 'border-end-end-radius',
};

export class RTLSupportManager {
  private config: RTLConfig;
  private customMirrorRules: LayoutMirrorRule[] = [];

  constructor(config?: Partial<RTLConfig>) {
    this.config = RTLConfigSchema.parse(config ?? {});
  }

  /**
   * Detect the text direction for a given locale.
   */
  getDirection(locale: string): TextDirection {
    const lang = locale.toLowerCase().split('-')[0];
    const rtlLocales = this.config.rtlLocales ?? DEFAULT_RTL_LOCALES;
    return rtlLocales.includes(lang) ? 'rtl' : 'ltr';
  }

  /**
   * Check if a locale is RTL.
   */
  isRTL(locale: string): boolean {
    return this.getDirection(locale) === 'rtl';
  }

  /**
   * Get the HTML dir attribute value for a locale.
   */
  getHTMLDir(locale: string): string {
    return this.getDirection(locale);
  }

  /**
   * Get all layout mirroring rules (standard + custom).
   */
  getMirrorRules(): LayoutMirrorRule[] {
    if (!this.config.mirrorLayout) return [];
    return [...STANDARD_MIRROR_RULES, ...this.customMirrorRules];
  }

  /**
   * Add a custom mirroring rule.
   */
  addMirrorRule(rule: LayoutMirrorRule): void {
    this.customMirrorRules.push(rule);
  }

  /**
   * Convert a physical CSS property to its logical equivalent.
   */
  toLogicalProperty(physicalProperty: string): string {
    if (!this.config.cssLogicalProperties) return physicalProperty;
    return PHYSICAL_TO_LOGICAL[physicalProperty] ?? physicalProperty;
  }

  /**
   * Convert all physical CSS properties in a style object to logical ones.
   */
  toLogicalProperties(styles: Record<string, string>): Record<string, string> {
    if (!this.config.cssLogicalProperties) return { ...styles };

    const result: Record<string, string> = {};
    for (const [property, value] of Object.entries(styles)) {
      const logicalProp = PHYSICAL_TO_LOGICAL[property];
      if (logicalProp) {
        result[logicalProp] = value;
      } else {
        result[property] = value;
      }
    }
    return result;
  }

  /**
   * Get a mirrored CSS property value for a given direction.
   * E.g., in RTL, 'left' becomes 'right'.
   */
  mirrorProperty(property: string, direction: TextDirection): string {
    if (direction === 'ltr') return property;

    const allRules = this.getMirrorRules();
    for (const rule of allRules) {
      if (rule.ltrValue === property) return rule.rtlValue;
    }
    return property;
  }

  /**
   * Generate CSS variables/styles for RTL-aware layout.
   */
  generateDirectionStyles(locale: string): Record<string, string> {
    const direction = this.getDirection(locale);
    const isRtl = direction === 'rtl';

    return {
      direction,
      'text-align': isRtl ? 'right' : 'left',
      '--direction': direction,
      '--start': isRtl ? 'right' : 'left',
      '--end': isRtl ? 'left' : 'right',
      '--dir-factor': isRtl ? '-1' : '1',
    };
  }

  /**
   * Transform a translate/transform value for RTL.
   * E.g., translateX(10px) becomes translateX(-10px) in RTL.
   */
  mirrorTransform(transform: string, locale: string): string {
    if (!this.isRTL(locale)) return transform;

    // Mirror translateX values
    return transform.replace(
      /translateX\(([^)]+)\)/g,
      (_, value: string) => {
        const trimmed = value.trim();
        if (trimmed.startsWith('-')) {
          return `translateX(${trimmed.slice(1)})`;
        } else {
          return `translateX(-${trimmed})`;
        }
      }
    );
  }

  /**
   * Determine if icons should be mirrored for a locale.
   */
  shouldMirrorIcons(locale: string): boolean {
    return this.config.mirrorIcons === true && this.isRTL(locale);
  }

  /**
   * Get the current RTL config.
   */
  getConfig(): RTLConfig {
    return { ...this.config };
  }

  /**
   * Update the RTL config.
   */
  updateConfig(updates: Partial<RTLConfig>): void {
    this.config = RTLConfigSchema.parse({ ...this.config, ...updates });
  }
}
