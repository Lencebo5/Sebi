import { AFFIRMATIONS, CONTENT_SCHEMA_VERSION, getAffirmation } from '@/content/affirmations';
import type { PersonalizationProfile, Preferences } from '@/models/types';
import { periodForHour } from '@/services/personalization';
import { readJson, StorageKeys, writeJson } from '@/services/storage';
import {
  generateWidgetQueue,
  isoDate,
  WIDGET_QUEUE_MIN_SLOTS,
  type WidgetQueueSlot,
} from '@/widgets/widget-queue';
import { SMALL_SAFE_CHARS } from '@/widgets/widget-select';

/**
 * Widget queue orchestrator: reads persisted app state (profile, premium
 * entitlement, widget impression history), decides whether the queue needs
 * regenerating, and produces the JSON payload the native bridge stores in
 * SharedPreferences.
 *
 * Only widget-scoped keys are ever written (widgetRecentIds, widgetQueue) —
 * the widget never mutates app recents, favorites, streak or feed state.
 */

/**
 * Why a queue rebuild was requested — decides both whether a fresh queue is
 * rebuilt at all and whether the currently shown slot survives:
 *
 * - 'personalization': the user explicitly changed content-affecting profile
 *   fields (goals, challenges, life contexts, age range, delivery style).
 *   Always rebuilds with the NEW profile and INVALIDATES the current-period
 *   slot so the home screen reflects the change immediately.
 * - 'entitlement': premium state changed. Always rebuilds; the current slot
 *   is preserved while still entitled (a lapsed premium slot is re-picked).
 * - 'maintenance': app open / background upkeep. Rebuilds only when the
 *   stored queue is missing, low, old, from another content version or
 *   entitlement state — and always preserves the current slot. Unrelated
 *   settings (theme, notifications) never reach the widget at all.
 */
export type WidgetRefreshReason = 'personalization' | 'entitlement' | 'maintenance';

/** JS-side mirror of the last delivered queue, for staleness checks. */
export interface WidgetQueueMirror {
  version: 1;
  generatedAt: number;
  contentVersion: number;
  isPremium: boolean;
  slots: WidgetQueueSlot[];
}

/** Regenerate when the queue is older than this even if slots remain. */
const REGEN_MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000;
/** Regenerate when fewer future slots than this remain (~2 days). */
const REGEN_MIN_FUTURE_SLOTS = 8;

const PERIOD_RANK: Record<string, number> = { morning: 0, day: 1, evening: 2, night: 3 };

const DEFAULT_PROFILE: PersonalizationProfile = {
  goals: [],
  currentChallenges: [],
  lifeContexts: [],
  addressMode: 'neutral',
  deliveryStyle: 'mixed',
};

async function readProfile(): Promise<PersonalizationProfile> {
  const prefs = await readJson<Partial<Preferences> | null>(StorageKeys.preferences, null);
  if (prefs && prefs.version === 2 && prefs.profile) {
    return { ...DEFAULT_PROFILE, ...prefs.profile };
  }
  // Pre-onboarding / legacy storage: neutral profile, still personalized by
  // time of day and fully eligible Free content.
  return DEFAULT_PROFILE;
}

function slotKey(date: string, period: string): string {
  return `${date}#${PERIOD_RANK[period] ?? -1}`;
}

function futureSlotCount(slots: WidgetQueueSlot[], now: Date): number {
  const nowKey = slotKey(isoDate(now), periodForHour(now.getHours()));
  return slots.filter((slot) => slotKey(slot.date, slot.period) >= nowKey).length;
}

/** The slot the widget is showing right now, straight from the mirror. */
function currentMirrorSlot(mirror: WidgetQueueMirror | null, now: Date): WidgetQueueSlot | null {
  if (!mirror || !Array.isArray(mirror.slots)) return null;
  const date = isoDate(now);
  const period = periodForHour(now.getHours());
  return mirror.slots.find((s) => s.date === date && s.period === period) ?? null;
}

/** Still a valid, entitled, small-safe corpus message? */
function isPreservable(slot: WidgetQueueSlot, isPremium: boolean): boolean {
  const affirmation = getAffirmation(slot.id);
  if (!affirmation || affirmation.text !== slot.text) return false;
  if (!isPremium && affirmation.premium) return false;
  return affirmation.charCount <= SMALL_SAFE_CHARS;
}

/**
 * Build the queue payload for the native widget, or return null when the
 * stored queue is still fresh and the reason was routine maintenance.
 * See WidgetRefreshReason for the preserve/invalidate semantics.
 */
export async function buildWidgetQueuePayload(
  reason: WidgetRefreshReason = 'maintenance',
  now: Date = new Date(),
): Promise<string | null> {
  const [profile, isPremium, recent, mirror] = await Promise.all([
    readProfile(),
    readJson<boolean>(StorageKeys.premiumCache, false),
    readJson<string[]>(StorageKeys.widgetRecentIds, []),
    readJson<WidgetQueueMirror | null>(StorageKeys.widgetQueue, null),
  ]);

  const fresh =
    mirror != null &&
    mirror.version === 1 &&
    Array.isArray(mirror.slots) &&
    mirror.contentVersion === CONTENT_SCHEMA_VERSION &&
    mirror.isPremium === isPremium &&
    now.getTime() - mirror.generatedAt < REGEN_MAX_AGE_MS &&
    futureSlotCount(mirror.slots, now) >= REGEN_MIN_FUTURE_SLOTS;
  if (fresh && reason === 'maintenance') return null;

  const current = currentMirrorSlot(mirror, now);
  const preserved =
    reason !== 'personalization' && current && isPreservable(current, isPremium) ? current : null;
  // Either way the on-screen id goes into the exclusion seed: preserved so
  // the generator does not duplicate it, invalidated (personalization
  // change) so the fresh current-period pick DIFFERS from it whenever an
  // eligible alternative exists.
  const seed = current ? [...recent.filter((id) => id !== current.id), current.id] : recent;

  const generated = generateWidgetQueue(AFFIRMATIONS, profile, isPremium, seed, now);
  let slots = generated.slots;
  if (preserved) {
    slots = [
      preserved,
      ...slots.filter((s) => !(s.date === preserved.date && s.period === preserved.period)),
    ];
  }
  if (slots.length < WIDGET_QUEUE_MIN_SLOTS) {
    // Should be impossible (the Free pool alone is hundreds of messages) —
    // keep whatever the native side already has rather than degrading it.
    console.error(`[SEBI_WIDGET] queue generation underflow: ${slots.length} slots`);
    if (slots.length === 0) return null;
  }

  const nextMirror: WidgetQueueMirror = {
    version: 1,
    generatedAt: now.getTime(),
    contentVersion: CONTENT_SCHEMA_VERSION,
    isPremium,
    slots,
  };
  await writeJson(StorageKeys.widgetQueue, nextMirror);
  await writeJson(StorageKeys.widgetRecentIds, generated.recentIds);

  return JSON.stringify(slots);
}
