import type { Affirmation, PersonalizationProfile } from '@/models/types';
import { pickOne, type DayPeriod } from '@/services/personalization';

/**
 * Pure widget content selection — no storage, no React, no native modules —
 * so the verification script can exercise it directly. The queue generator
 * (widget-queue.ts) wires it into precomputed slots for the native widget;
 * time-of-day surfaces are decided natively (SebiWidgetProvider).
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

export type LengthTier = 'short' | 'mid' | 'long' | 'xl';

/**
 * Deterministic length tier (design §6/16): the native widget maps this to
 * fixed sp sizes (small 17/16/15/14.5, medium 20/19/18/17) — never clipped,
 * never ellipsized. Breakpoints mirror SebiWidgetLogic.tierForLength.
 */
export function lengthTier(charCount: number): LengthTier {
  if (charCount <= 45) return 'short';
  if (charCount <= 62) return 'mid';
  if (charCount <= 95) return 'long';
  return 'xl';
}
