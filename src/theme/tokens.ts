import type { AppTheme } from '@/theme/themes';

/** Spacing scale (px) — 4 8 12 16 20 24 32 40 48 64 per the design spec. */
export const spacing = {
  xs: 4,
  sm: 8,
  smd: 12,
  md: 16,
  mlg: 20,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

/** Border radii: 12 toast · 14 cards · 16 buttons · 22 modal · pill chips. */
export const radius = {
  toast: 12,
  card: 14,
  button: 16,
  modal: 22,
  pill: 999,
} as const;

/** Font family names as registered in the root layout. */
export const fonts = {
  serif: 'Literata_400Regular',
  serifMedium: 'Literata_500Medium',
  serifItalic: 'Literata_400Regular_Italic',
  sans: 'SchibstedGrotesk_400Regular',
  sansMedium: 'SchibstedGrotesk_500Medium',
  sansSemiBold: 'SchibstedGrotesk_600SemiBold',
} as const;

export const type = {
  /** Screen titles on tab screens (Literata). */
  title: { fontFamily: fonts.serif, fontSize: 28, lineHeight: 36 },
  /** Titles on pushed sub-screens (Literata). */
  subScreenTitle: { fontFamily: fonts.serif, fontSize: 26, lineHeight: 34 },
  /** Primary UI text. */
  body: { fontFamily: fonts.sans, fontSize: 15.5, lineHeight: 22 },
  /** Secondary text. */
  caption: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 19 },
  /** Uppercase context label (category above the affirmation). */
  contextLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 11.5,
    letterSpacing: 2.4,
    textTransform: 'uppercase' as const,
  },
  /** Uppercase eyebrow (paywall, onboarding preview). */
  eyebrow: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 11,
    letterSpacing: 2.6,
    textTransform: 'uppercase' as const,
  },
} as const;

/**
 * Affirmation font size adapts to text length so short thoughts breathe and
 * long ones never touch the edges: ≤18 chars → 36 · ≤55 → 30 · ≤100 → 26 ·
 * longer → 23. Line height is 1.4, max width 340.
 */
export function affirmationFontSize(text: string): number {
  const length = text.length;
  if (length <= 18) return 36;
  if (length <= 55) return 30;
  if (length <= 100) return 26;
  return 23;
}

export const AFFIRMATION_LINE_HEIGHT = 1.4;
export const AFFIRMATION_MAX_WIDTH = 340;

/** Height reserved for the floating tab bar (content scrolls under it). */
export const TAB_BAR_CONTENT_INSET = 88;

/** `ink` is always an opaque hex in THEMES, so plain hex → rgba is enough. */
export function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

export interface ThemeTokens {
  /** Main text color. */
  ink: string;
  /** Secondary text — ink 55%. */
  sub: string;
  /** Tertiary text and inactive icons — ink 38%. */
  faint: string;
  /** Hairline separators — ink 13%. */
  line: string;
  /** Ghost fills (icon buttons, badges) — ink 6%. */
  ghost: string;
  /** Stronger outline for unselected chips — ink 28%. */
  outline: string;
  /** Flat surface (sheets, toggles' thumb) — theme `a`. */
  surface: string;
  /** Translucent tab-bar tint — `a` at 72% (+ blur). */
  barBg: string;
  /** Solid CTA background. */
  ctaBg: string;
  /** Text on the solid CTA. */
  ctaFg: string;
}

/** Derive the full token set from a theme's three anchor colors. */
export function tokensFor(theme: AppTheme): ThemeTokens {
  return {
    ink: theme.ink,
    sub: withAlpha(theme.ink, 0.55),
    faint: withAlpha(theme.ink, 0.38),
    line: withAlpha(theme.ink, 0.13),
    ghost: withAlpha(theme.ink, 0.06),
    outline: withAlpha(theme.ink, 0.28),
    surface: theme.a,
    barBg: withAlpha(theme.a, 0.72),
    ctaBg: theme.ink,
    ctaFg: theme.dark ? theme.b : theme.a,
  };
}
