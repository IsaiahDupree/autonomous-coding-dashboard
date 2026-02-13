/**
 * UI-001: Design Tokens
 *
 * Core design tokens for the ACD design system. All values are defined as
 * TypeScript `as const` objects so downstream consumers get literal types.
 */
import { z } from "zod";
export declare const ColorPalette: {
    readonly brand: {
        readonly 50: "#EEF2FF";
        readonly 100: "#E0E7FF";
        readonly 200: "#C7D2FE";
        readonly 300: "#A5B4FC";
        readonly 400: "#818CF8";
        readonly 500: "#6366F1";
        readonly 600: "#4F46E5";
        readonly 700: "#4338CA";
        readonly 800: "#3730A3";
        readonly 900: "#312E81";
        readonly 950: "#1E1B4B";
    };
    readonly neutral: {
        readonly 0: "#FFFFFF";
        readonly 50: "#F9FAFB";
        readonly 100: "#F3F4F6";
        readonly 200: "#E5E7EB";
        readonly 300: "#D1D5DB";
        readonly 400: "#9CA3AF";
        readonly 500: "#6B7280";
        readonly 600: "#4B5563";
        readonly 700: "#374151";
        readonly 800: "#1F2937";
        readonly 900: "#111827";
        readonly 950: "#030712";
    };
    readonly success: {
        readonly 50: "#F0FDF4";
        readonly 100: "#DCFCE7";
        readonly 200: "#BBF7D0";
        readonly 300: "#86EFAC";
        readonly 400: "#4ADE80";
        readonly 500: "#22C55E";
        readonly 600: "#16A34A";
        readonly 700: "#15803D";
        readonly 800: "#166534";
        readonly 900: "#14532D";
    };
    readonly warning: {
        readonly 50: "#FFFBEB";
        readonly 100: "#FEF3C7";
        readonly 200: "#FDE68A";
        readonly 300: "#FCD34D";
        readonly 400: "#FBBF24";
        readonly 500: "#F59E0B";
        readonly 600: "#D97706";
        readonly 700: "#B45309";
        readonly 800: "#92400E";
        readonly 900: "#78350F";
    };
    readonly error: {
        readonly 50: "#FEF2F2";
        readonly 100: "#FEE2E2";
        readonly 200: "#FECACA";
        readonly 300: "#FCA5A5";
        readonly 400: "#F87171";
        readonly 500: "#EF4444";
        readonly 600: "#DC2626";
        readonly 700: "#B91C1C";
        readonly 800: "#991B1B";
        readonly 900: "#7F1D1D";
    };
    readonly info: {
        readonly 50: "#EFF6FF";
        readonly 100: "#DBEAFE";
        readonly 200: "#BFDBFE";
        readonly 300: "#93C5FD";
        readonly 400: "#60A5FA";
        readonly 500: "#3B82F6";
        readonly 600: "#2563EB";
        readonly 700: "#1D4ED8";
        readonly 800: "#1E40AF";
        readonly 900: "#1E3A8A";
    };
};
export type ColorPalette = typeof ColorPalette;
export type ColorCategory = keyof ColorPalette;
export declare const SpacingScale: {
    readonly 0: 0;
    readonly 0.5: 2;
    readonly 1: 4;
    readonly 1.5: 6;
    readonly 2: 8;
    readonly 2.5: 10;
    readonly 3: 12;
    readonly 3.5: 14;
    readonly 4: 16;
    readonly 5: 20;
    readonly 6: 24;
    readonly 7: 28;
    readonly 8: 32;
    readonly 9: 36;
    readonly 10: 40;
    readonly 11: 44;
    readonly 12: 48;
    readonly 14: 56;
    readonly 16: 64;
    readonly 20: 80;
    readonly 24: 96;
    readonly 28: 112;
    readonly 32: 128;
    readonly 36: 144;
    readonly 40: 160;
    readonly 44: 176;
    readonly 48: 192;
    readonly 52: 208;
    readonly 56: 224;
    readonly 60: 240;
    readonly 64: 256;
    readonly 72: 288;
    readonly 80: 320;
    readonly 96: 384;
};
export type SpacingScale = typeof SpacingScale;
export type SpacingKey = keyof SpacingScale;
export declare const TypographyScale: {
    readonly fontFamilies: {
        readonly sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        readonly mono: "'JetBrains Mono', 'Fira Code', 'SF Mono', Menlo, monospace";
        readonly display: "'Cal Sans', 'Inter', sans-serif";
    };
    readonly fontSizes: {
        readonly xs: "0.75rem";
        readonly sm: "0.875rem";
        readonly base: "1rem";
        readonly lg: "1.125rem";
        readonly xl: "1.25rem";
        readonly "2xl": "1.5rem";
        readonly "3xl": "1.875rem";
        readonly "4xl": "2.25rem";
        readonly "5xl": "3rem";
        readonly "6xl": "3.75rem";
    };
    readonly fontWeights: {
        readonly thin: 100;
        readonly extralight: 200;
        readonly light: 300;
        readonly normal: 400;
        readonly medium: 500;
        readonly semibold: 600;
        readonly bold: 700;
        readonly extrabold: 800;
        readonly black: 900;
    };
    readonly lineHeights: {
        readonly none: 1;
        readonly tight: 1.25;
        readonly snug: 1.375;
        readonly normal: 1.5;
        readonly relaxed: 1.625;
        readonly loose: 2;
    };
    readonly letterSpacings: {
        readonly tighter: "-0.05em";
        readonly tight: "-0.025em";
        readonly normal: "0em";
        readonly wide: "0.025em";
        readonly wider: "0.05em";
        readonly widest: "0.1em";
    };
};
export type TypographyScale = typeof TypographyScale;
export declare const BorderRadii: {
    readonly none: "0px";
    readonly sm: "2px";
    readonly default: "4px";
    readonly md: "6px";
    readonly lg: "8px";
    readonly xl: "12px";
    readonly "2xl": "16px";
    readonly "3xl": "24px";
    readonly full: "9999px";
};
export type BorderRadii = typeof BorderRadii;
export type BorderRadiusKey = keyof BorderRadii;
export declare const Shadows: {
    readonly none: "none";
    readonly xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)";
    readonly sm: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)";
    readonly md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)";
    readonly lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)";
    readonly xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)";
    readonly "2xl": "0 25px 50px -12px rgb(0 0 0 / 0.25)";
    readonly inner: "inset 0 2px 4px 0 rgb(0 0 0 / 0.05)";
    readonly focus: "0 0 0 3px rgb(99 102 241 / 0.5)";
};
export type Shadows = typeof Shadows;
export type ShadowKey = keyof Shadows;
export declare const Breakpoints: {
    readonly xs: 0;
    readonly sm: 640;
    readonly md: 768;
    readonly lg: 1024;
    readonly xl: 1280;
    readonly "2xl": 1536;
};
export type Breakpoints = typeof Breakpoints;
export type BreakpointKey = keyof Breakpoints;
export declare const ZIndex: {
    readonly hide: -1;
    readonly base: 0;
    readonly dropdown: 1000;
    readonly sticky: 1100;
    readonly fixed: 1200;
    readonly modalBackdrop: 1300;
    readonly modal: 1400;
    readonly popover: 1500;
    readonly tooltip: 1600;
    readonly toast: 1700;
};
export type ZIndex = typeof ZIndex;
export declare const Transitions: {
    readonly durations: {
        readonly instant: "0ms";
        readonly fast: "100ms";
        readonly normal: "200ms";
        readonly slow: "300ms";
        readonly slower: "500ms";
    };
    readonly easings: {
        readonly default: "cubic-bezier(0.4, 0, 0.2, 1)";
        readonly in: "cubic-bezier(0.4, 0, 1, 1)";
        readonly out: "cubic-bezier(0, 0, 0.2, 1)";
        readonly inOut: "cubic-bezier(0.4, 0, 0.2, 1)";
        readonly bounce: "cubic-bezier(0.68, -0.55, 0.27, 1.55)";
    };
};
export type Transitions = typeof Transitions;
export declare const DesignTokenOverrideSchema: z.ZodObject<{
    colorOverrides: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    spacingMultiplier: z.ZodOptional<z.ZodNumber>;
    fontFamily: z.ZodOptional<z.ZodObject<{
        sans: z.ZodOptional<z.ZodString>;
        mono: z.ZodOptional<z.ZodString>;
        display: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        sans?: string | undefined;
        mono?: string | undefined;
        display?: string | undefined;
    }, {
        sans?: string | undefined;
        mono?: string | undefined;
        display?: string | undefined;
    }>>;
    borderRadius: z.ZodOptional<z.ZodEnum<["none", "sm", "default", "md", "lg", "xl", "2xl", "3xl", "full"]>>;
    darkMode: z.ZodOptional<z.ZodBoolean>;
}, "strict", z.ZodTypeAny, {
    borderRadius?: "sm" | "md" | "lg" | "default" | "none" | "xl" | "2xl" | "3xl" | "full" | undefined;
    colorOverrides?: Record<string, string> | undefined;
    spacingMultiplier?: number | undefined;
    fontFamily?: {
        sans?: string | undefined;
        mono?: string | undefined;
        display?: string | undefined;
    } | undefined;
    darkMode?: boolean | undefined;
}, {
    borderRadius?: "sm" | "md" | "lg" | "default" | "none" | "xl" | "2xl" | "3xl" | "full" | undefined;
    colorOverrides?: Record<string, string> | undefined;
    spacingMultiplier?: number | undefined;
    fontFamily?: {
        sans?: string | undefined;
        mono?: string | undefined;
        display?: string | undefined;
    } | undefined;
    darkMode?: boolean | undefined;
}>;
export type DesignTokenOverride = z.infer<typeof DesignTokenOverrideSchema>;
export declare const DesignTokens: {
    readonly colors: {
        readonly brand: {
            readonly 50: "#EEF2FF";
            readonly 100: "#E0E7FF";
            readonly 200: "#C7D2FE";
            readonly 300: "#A5B4FC";
            readonly 400: "#818CF8";
            readonly 500: "#6366F1";
            readonly 600: "#4F46E5";
            readonly 700: "#4338CA";
            readonly 800: "#3730A3";
            readonly 900: "#312E81";
            readonly 950: "#1E1B4B";
        };
        readonly neutral: {
            readonly 0: "#FFFFFF";
            readonly 50: "#F9FAFB";
            readonly 100: "#F3F4F6";
            readonly 200: "#E5E7EB";
            readonly 300: "#D1D5DB";
            readonly 400: "#9CA3AF";
            readonly 500: "#6B7280";
            readonly 600: "#4B5563";
            readonly 700: "#374151";
            readonly 800: "#1F2937";
            readonly 900: "#111827";
            readonly 950: "#030712";
        };
        readonly success: {
            readonly 50: "#F0FDF4";
            readonly 100: "#DCFCE7";
            readonly 200: "#BBF7D0";
            readonly 300: "#86EFAC";
            readonly 400: "#4ADE80";
            readonly 500: "#22C55E";
            readonly 600: "#16A34A";
            readonly 700: "#15803D";
            readonly 800: "#166534";
            readonly 900: "#14532D";
        };
        readonly warning: {
            readonly 50: "#FFFBEB";
            readonly 100: "#FEF3C7";
            readonly 200: "#FDE68A";
            readonly 300: "#FCD34D";
            readonly 400: "#FBBF24";
            readonly 500: "#F59E0B";
            readonly 600: "#D97706";
            readonly 700: "#B45309";
            readonly 800: "#92400E";
            readonly 900: "#78350F";
        };
        readonly error: {
            readonly 50: "#FEF2F2";
            readonly 100: "#FEE2E2";
            readonly 200: "#FECACA";
            readonly 300: "#FCA5A5";
            readonly 400: "#F87171";
            readonly 500: "#EF4444";
            readonly 600: "#DC2626";
            readonly 700: "#B91C1C";
            readonly 800: "#991B1B";
            readonly 900: "#7F1D1D";
        };
        readonly info: {
            readonly 50: "#EFF6FF";
            readonly 100: "#DBEAFE";
            readonly 200: "#BFDBFE";
            readonly 300: "#93C5FD";
            readonly 400: "#60A5FA";
            readonly 500: "#3B82F6";
            readonly 600: "#2563EB";
            readonly 700: "#1D4ED8";
            readonly 800: "#1E40AF";
            readonly 900: "#1E3A8A";
        };
    };
    readonly spacing: {
        readonly 0: 0;
        readonly 0.5: 2;
        readonly 1: 4;
        readonly 1.5: 6;
        readonly 2: 8;
        readonly 2.5: 10;
        readonly 3: 12;
        readonly 3.5: 14;
        readonly 4: 16;
        readonly 5: 20;
        readonly 6: 24;
        readonly 7: 28;
        readonly 8: 32;
        readonly 9: 36;
        readonly 10: 40;
        readonly 11: 44;
        readonly 12: 48;
        readonly 14: 56;
        readonly 16: 64;
        readonly 20: 80;
        readonly 24: 96;
        readonly 28: 112;
        readonly 32: 128;
        readonly 36: 144;
        readonly 40: 160;
        readonly 44: 176;
        readonly 48: 192;
        readonly 52: 208;
        readonly 56: 224;
        readonly 60: 240;
        readonly 64: 256;
        readonly 72: 288;
        readonly 80: 320;
        readonly 96: 384;
    };
    readonly typography: {
        readonly fontFamilies: {
            readonly sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
            readonly mono: "'JetBrains Mono', 'Fira Code', 'SF Mono', Menlo, monospace";
            readonly display: "'Cal Sans', 'Inter', sans-serif";
        };
        readonly fontSizes: {
            readonly xs: "0.75rem";
            readonly sm: "0.875rem";
            readonly base: "1rem";
            readonly lg: "1.125rem";
            readonly xl: "1.25rem";
            readonly "2xl": "1.5rem";
            readonly "3xl": "1.875rem";
            readonly "4xl": "2.25rem";
            readonly "5xl": "3rem";
            readonly "6xl": "3.75rem";
        };
        readonly fontWeights: {
            readonly thin: 100;
            readonly extralight: 200;
            readonly light: 300;
            readonly normal: 400;
            readonly medium: 500;
            readonly semibold: 600;
            readonly bold: 700;
            readonly extrabold: 800;
            readonly black: 900;
        };
        readonly lineHeights: {
            readonly none: 1;
            readonly tight: 1.25;
            readonly snug: 1.375;
            readonly normal: 1.5;
            readonly relaxed: 1.625;
            readonly loose: 2;
        };
        readonly letterSpacings: {
            readonly tighter: "-0.05em";
            readonly tight: "-0.025em";
            readonly normal: "0em";
            readonly wide: "0.025em";
            readonly wider: "0.05em";
            readonly widest: "0.1em";
        };
    };
    readonly radii: {
        readonly none: "0px";
        readonly sm: "2px";
        readonly default: "4px";
        readonly md: "6px";
        readonly lg: "8px";
        readonly xl: "12px";
        readonly "2xl": "16px";
        readonly "3xl": "24px";
        readonly full: "9999px";
    };
    readonly shadows: {
        readonly none: "none";
        readonly xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)";
        readonly sm: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)";
        readonly md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)";
        readonly lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)";
        readonly xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)";
        readonly "2xl": "0 25px 50px -12px rgb(0 0 0 / 0.25)";
        readonly inner: "inset 0 2px 4px 0 rgb(0 0 0 / 0.05)";
        readonly focus: "0 0 0 3px rgb(99 102 241 / 0.5)";
    };
    readonly breakpoints: {
        readonly xs: 0;
        readonly sm: 640;
        readonly md: 768;
        readonly lg: 1024;
        readonly xl: 1280;
        readonly "2xl": 1536;
    };
    readonly zIndex: {
        readonly hide: -1;
        readonly base: 0;
        readonly dropdown: 1000;
        readonly sticky: 1100;
        readonly fixed: 1200;
        readonly modalBackdrop: 1300;
        readonly modal: 1400;
        readonly popover: 1500;
        readonly tooltip: 1600;
        readonly toast: 1700;
    };
    readonly transitions: {
        readonly durations: {
            readonly instant: "0ms";
            readonly fast: "100ms";
            readonly normal: "200ms";
            readonly slow: "300ms";
            readonly slower: "500ms";
        };
        readonly easings: {
            readonly default: "cubic-bezier(0.4, 0, 0.2, 1)";
            readonly in: "cubic-bezier(0.4, 0, 1, 1)";
            readonly out: "cubic-bezier(0, 0, 0.2, 1)";
            readonly inOut: "cubic-bezier(0.4, 0, 0.2, 1)";
            readonly bounce: "cubic-bezier(0.68, -0.55, 0.27, 1.55)";
        };
    };
};
export type DesignTokens = typeof DesignTokens;
//# sourceMappingURL=tokens.d.ts.map