/** Spacing scale (px). */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 24,
} as const;

/** Font family names as registered in the root layout. */
export const fonts = {
  serif: 'Fraunces_500Medium',
  serifLight: 'Fraunces_400Regular',
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemiBold: 'Inter_600SemiBold',
} as const;

export const type = {
  hero: { fontFamily: fonts.serif, fontSize: 32, lineHeight: 44 },
  title: { fontFamily: fonts.serif, fontSize: 28, lineHeight: 36 },
  heading: { fontFamily: fonts.sansSemiBold, fontSize: 17, lineHeight: 24 },
  body: { fontFamily: fonts.sans, fontSize: 16, lineHeight: 24 },
  caption: { fontFamily: fonts.sansMedium, fontSize: 13, lineHeight: 18 },
  label: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 2.2,
    textTransform: 'uppercase' as const,
  },
} as const;
