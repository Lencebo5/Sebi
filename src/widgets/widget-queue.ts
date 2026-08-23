import type { Affirmation, PersonalizationProfile } from '@/models/types';
import { periodForHour, type DayPeriod } from '@/services/personalization';
import { selectWidgetAffirmation, widgetLabel, lengthTier, type LengthTier } from '@/widgets/widget-select';

/**
 * Pure widget queue generator. The TypeScript personalization engine remains
 * the single source of truth for what the widget shows: it precomputes ~8
 * days × 4 periods of future messages here, and the native Android provider
 * only rotates through the finished list (see SebiWidgetLogic.java).
 *
 * Privacy contract: a slot carries ONLY the resulting message and its
 * presentation metadata — never the profile that produced it (no goals,
 * challenges, age or life context ever reach SharedPreferences).
 */

export interface WidgetQueueSlot {
  id: string;
  text: string;
  /** Serbian display label — never an internal category id. */
  label: string;
  period: DayPeriod;
  /** Device-local calendar date, YYYY-MM-DD (matches the native provider). */
  date: string;
  /** Length tier the native layer maps to deterministic sp sizes. */
  tier: LengthTier;
}

/** Days of future slots per generation (8 × 4 periods ≥ 29 slots). */
export const WIDGET_QUEUE_DAYS = 8;
/** Contract minimum the verification script asserts (~7 days × 4/day). */
export const WIDGET_QUEUE_MIN_SLOTS = 28;
/** Rolling no-repeat window, matching the widget's impression history. */
export const WIDGET_HISTORY_SIZE = 20;

const PERIOD_ORDER: DayPeriod[] = ['morning', 'day', 'evening', 'night'];

export function isoDate(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Generate the full queue, starting at the period containing `now` so the
 * widget always has a slot for the current moment. Selection reuses the
 * production personalization engine unchanged via selectWidgetAffirmation;
 * a rolling recent window (seeded with the widget's persisted impression
 * history) prevents repeats within WIDGET_HISTORY_SIZE slots.
 */
export function generateWidgetQueue(
  items: Affirmation[],
  profile: PersonalizationProfile,
  isPremium: boolean,
  seedRecentIds: string[],
  now: Date,
  rng?: () => number,
): { slots: WidgetQueueSlot[]; recentIds: string[] } {
  const slots: WidgetQueueSlot[] = [];
  let recent = [...seedRecentIds];
  const startRank = PERIOD_ORDER.indexOf(periodForHour(now.getHours()));

  for (let day = 0; day < WIDGET_QUEUE_DAYS; day++) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + day);
    for (let rank = 0; rank < PERIOD_ORDER.length; rank++) {
      if (day === 0 && rank < startRank) continue;
      const period = PERIOD_ORDER[rank];
      const picked = selectWidgetAffirmation(
        items,
        profile,
        period,
        recent.slice(-WIDGET_HISTORY_SIZE),
        isPremium,
        rng,
      );
      if (!picked) continue;
      slots.push({
        id: picked.id,
        text: picked.text,
        label: widgetLabel(picked),
        period,
        date: isoDate(date),
        tier: lengthTier(picked.charCount),
      });
      recent = [...recent.filter((id) => id !== picked.id), picked.id];
    }
  }

  return { slots, recentIds: recent.slice(-WIDGET_HISTORY_SIZE) };
}
