import type { Affirmation, PersonalizationProfile } from '@/models/types';
import { pickOne, type DayPeriod } from '@/services/personalization';

/**
 * Pure widget content selection — no storage, no React, no native modules —
 * so the verification script can exercise it directly. The headless service
 * (widget-content.ts) wires it to persisted state.
 *
 * The widget reuses the production personalization engine unchanged (same
 * goals / challenges / life-context / age / delivery-style / time-of-day
 * signals as "Za danas"); the only widget-specific inputs are its own
 * separate impression history and a fit constraint for the small surface.
 */

/** Messages safely renderable in the 2×2 widget at the 16/15/14 tiers. */
export const SMALL_SAFE_CHARS = 78;
/** Messages safely renderable in the 4×2 widget at the 19.5–17 tiers. */
export const MEDIUM_SAFE_CHARS = 125;

export type WidgetSurface = 'morning' | 'linen' | 'paper' | 'night';

export interface WidgetDisplay {
  affirmation: Affirmation;
  /** Serbian display label — never an internal category id. */
  label: string;
  surface: WidgetSurface;
}

/** Free/premium eligibility mirrors the app's category-level model. */
export function eligibleWidgetPool(
  items: Affirmation[],
  isPremium: boolean,
  maxChars: number = SMALL_SAFE_CHARS,
): Affirmation[] {
  const entitled = isPremium ? items : items.filter((a) => !a.premium);
  const fitting = entitled.filter((a) => a.charCount <= maxChars);
  if (fitting.length > 0) return fitting;
  // Fail gracefully if a future corpus outgrows the widget: fall back to
  // the loosest fit rather than truncating or going blank.
  const medium = entitled.filter((a) => a.charCount <= MEDIUM_SAFE_CHARS);
  return medium.length > 0 ? medium : entitled;
}

/** One personalized widget draw, honoring the widget-only recent history. */
export function selectWidgetAffirmation(
  items: Affirmation[],
  profile: PersonalizationProfile,
  period: DayPeriod,
  widgetRecentIds: string[],
  isPremium: boolean,
  rng?: () => number,
): Affirmation | undefined {
  const pool = eligibleWidgetPool(items, isPremium);
  return (
    pickOne(pool, profile, { period, exclude: widgetRecentIds, rng }) ??
    // History may exclude everything in a tiny pool — retry without it.
    pickOne(pool, profile, { period, rng })
  );
}

/**
 * Context label per the design: the safe default is ZA DANAS; specific
 * time labels appear only when the selected message really is that content.
 */
export function widgetLabel(affirmation: Affirmation): string {
  if (affirmation.category === 'morning') return 'DOBRO JUTRO';
  if (affirmation.category === 'bedtime') return 'PRED SPAVANJE';
  return 'ZA DANAS';
}

/** Time-of-day surface treatment (design ref 1f): a state, not a widget. */
export function widgetSurface(period: DayPeriod): WidgetSurface {
  if (period === 'morning') return 'morning';
  if (period === 'day') return 'linen';
  if (period === 'evening') return 'paper';
  return 'night';
}

/**
 * Deterministic typography tiers from message length (design §6/16):
 * never clip, never ellipsize, never shrink below readable.
 */
export function affirmationTier(
  charCount: number,
  layout: 'small' | 'medium',
): { fontSize: number; lineHeight: number } {
  if (layout === 'small') {
    const fontSize = charCount <= 45 ? 16 : charCount <= 62 ? 15 : 14;
    return { fontSize, lineHeight: Math.round(fontSize * 1.38) };
  }
  const fontSize = charCount <= 45 ? 20 : charCount <= 62 ? 19 : charCount <= 95 ? 18 : 17;
  return { fontSize, lineHeight: Math.round(fontSize * 1.36) };
}
