/**
 * UI-001: Design Tokens
 *
 * Core design tokens for the ACD design system. All values are defined as
 * TypeScript `as const` objects so downstream consumers get literal types.
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// Color Palette
// ---------------------------------------------------------------------------

export const ColorPalette = {
  // Brand
  brand: {
    50: "#EEF2FF",
    100: "#E0E7FF",
    200: "#C7D2FE",
    300: "#A5B4FC",
    400: "#818CF8",
    500: "#6366F1",
    600: "#4F46E5",
    700: "#4338CA",
    800: "#3730A3",
    900: "#312E81",
    950: "#1E1B4B",
  },

  // Neutral / Gray
  neutral: {
    0: "#FFFFFF",
    50: "#F9FAFB",
    100: "#F3F4F6",
    200: "#E5E7EB",
    300: "#D1D5DB",
    400: "#9CA3AF",
    500: "#6B7280",
    600: "#4B5563",
    700: "#374151",
    800: "#1F2937",
    900: "#111827",
    950: "#030712",
  },

  // Semantic
  success: {
    50: "#F0FDF4",
    100: "#DCFCE7",
    200: "#BBF7D0",
    300: "#86EFAC",
    400: "#4ADE80",
    500: "#22C55E",
    600: "#16A34A",
    700: "#15803D",
    800: "#166534",
    900: "#14532D",
  },
  warning: {
    50: "#FFFBEB",
    100: "#FEF3C7",
    200: "#FDE68A",
    300: "#FCD34D",
    400: "#FBBF24",
    500: "#F59E0B",
    600: "#D97706",
    700: "#B45309",
    800: "#92400E",
    900: "#78350F",
  },
  error: {
    50: "#FEF2F2",
    100: "#FEE2E2",
    200: "#FECACA",
    300: "#FCA5A5",
    400: "#F87171",
    500: "#EF4444",
    600: "#DC2626",
    700: "#B91C1C",
    800: "#991B1B",
    900: "#7F1D1D",
  },
  info: {
    50: "#EFF6FF",
    100: "#DBEAFE",
    200: "#BFDBFE",
    300: "#93C5FD",
    400: "#60A5FA",
    500: "#3B82F6",
    600: "#2563EB",
    700: "#1D4ED8",
    800: "#1E40AF",
    900: "#1E3A8A",
  },
} as const;

export type ColorPalette = typeof ColorPalette;
export type ColorCategory = keyof ColorPalette;

// ---------------------------------------------------------------------------
// Spacing Scale (px values)
// ---------------------------------------------------------------------------

export const SpacingScale = {
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  11: 44,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
  28: 112,
  32: 128,
  36: 144,
  40: 160,
  44: 176,
  48: 192,
  52: 208,
  56: 224,
  60: 240,
  64: 256,
  72: 288,
  80: 320,
  96: 384,
} as const;

export type SpacingScale = typeof SpacingScale;
export type SpacingKey = keyof SpacingScale;

// ---------------------------------------------------------------------------
// Typography Scale
// ---------------------------------------------------------------------------

export const TypographyScale = {
  fontFamilies: {
    sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', 'SF Mono', Menlo, monospace",
    display: "'Cal Sans', 'Inter', sans-serif",
  },
  fontSizes: {
    xs: "0.75rem",    // 12px
    sm: "0.875rem",   // 14px
    base: "1rem",     // 16px
    lg: "1.125rem",   // 18px
    xl: "1.25rem",    // 20px
    "2xl": "1.5rem",  // 24px
    "3xl": "1.875rem",// 30px
    "4xl": "2.25rem", // 36px
    "5xl": "3rem",    // 48px
    "6xl": "3.75rem", // 60px
  },
  fontWeights: {
    thin: 100,
    extralight: 200,
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
    black: 900,
  },
  lineHeights: {
    none: 1,
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },
  letterSpacings: {
    tighter: "-0.05em",
    tight: "-0.025em",
    normal: "0em",
    wide: "0.025em",
    wider: "0.05em",
    widest: "0.1em",
  },
} as const;

export type TypographyScale = typeof TypographyScale;

// ---------------------------------------------------------------------------
// Border Radii
// ---------------------------------------------------------------------------

export const BorderRadii = {
  none: "0px",
  sm: "2px",
  default: "4px",
  md: "6px",
  lg: "8px",
  xl: "12px",
  "2xl": "16px",
  "3xl": "24px",
  full: "9999px",
} as const;

export type BorderRadii = typeof BorderRadii;
export type BorderRadiusKey = keyof BorderRadii;

// ---------------------------------------------------------------------------
// Shadows
// ---------------------------------------------------------------------------

export const Shadows = {
  none: "none",
  xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  sm: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
  md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
  "2xl": "0 25px 50px -12px rgb(0 0 0 / 0.25)",
  inner: "inset 0 2px 4px 0 rgb(0 0 0 / 0.05)",
  focus: "0 0 0 3px rgb(99 102 241 / 0.5)",
} as const;

export type Shadows = typeof Shadows;
export type ShadowKey = keyof Shadows;

// ---------------------------------------------------------------------------
// Breakpoints
// ---------------------------------------------------------------------------

export const Breakpoints = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

export type Breakpoints = typeof Breakpoints;
export type BreakpointKey = keyof Breakpoints;

// ---------------------------------------------------------------------------
// Z-Index Scale
// ---------------------------------------------------------------------------

export const ZIndex = {
  hide: -1,
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  fixed: 1200,
  modalBackdrop: 1300,
  modal: 1400,
  popover: 1500,
  tooltip: 1600,
  toast: 1700,
} as const;

export type ZIndex = typeof ZIndex;

// ---------------------------------------------------------------------------
// Transition / Animation tokens
// ---------------------------------------------------------------------------

export const Transitions = {
  durations: {
    instant: "0ms",
    fast: "100ms",
    normal: "200ms",
    slow: "300ms",
    slower: "500ms",
  },
  easings: {
    default: "cubic-bezier(0.4, 0, 0.2, 1)",
    in: "cubic-bezier(0.4, 0, 1, 1)",
    out: "cubic-bezier(0, 0, 0.2, 1)",
    inOut: "cubic-bezier(0.4, 0, 0.2, 1)",
    bounce: "cubic-bezier(0.68, -0.55, 0.27, 1.55)",
  },
} as const;

export type Transitions = typeof Transitions;

// ---------------------------------------------------------------------------
// Zod schema for token validation (useful for theme overrides)
// ---------------------------------------------------------------------------

export const DesignTokenOverrideSchema = z.object({
  colorOverrides: z.record(z.string(), z.string()).optional(),
  spacingMultiplier: z.number().positive().optional(),
  fontFamily: z.object({
    sans: z.string().optional(),
    mono: z.string().optional(),
    display: z.string().optional(),
  }).optional(),
  borderRadius: z.enum(["none", "sm", "default", "md", "lg", "xl", "2xl", "3xl", "full"]).optional(),
  darkMode: z.boolean().optional(),
}).strict();

export type DesignTokenOverride = z.infer<typeof DesignTokenOverrideSchema>;

// ---------------------------------------------------------------------------
// Aggregate tokens export
// ---------------------------------------------------------------------------

export const DesignTokens = {
  colors: ColorPalette,
  spacing: SpacingScale,
  typography: TypographyScale,
  radii: BorderRadii,
  shadows: Shadows,
  breakpoints: Breakpoints,
  zIndex: ZIndex,
  transitions: Transitions,
} as const;

export type DesignTokens = typeof DesignTokens;
