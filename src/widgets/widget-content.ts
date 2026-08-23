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

/**
 * The message currently on the home screen stays stable across
 * regenerations within its period — unless it is no longer valid (content
 * migration) or no longer entitled (premium lapsed).
 */
function preservedCurrentSlot(
  mirror: WidgetQueueMirror | null,
  isPremium: boolean,
  now: Date,
): WidgetQueueSlot | null {
  if (!mirror || !Array.isArray(mirror.slots)) return null;
  const date = isoDate(now);
  const period = periodForHour(now.getHours());
  const slot = mirror.slots.find((s) => s.date === date && s.period === period);
  if (!slot) return null;
  const affirmation = getAffirmation(slot.id);
  if (!affirmation || affirmation.text !== slot.text) return null;
  if (!isPremium && affirmation.premium) return null;
  if (affirmation.charCount > SMALL_SAFE_CHARS) return null;
  return slot;
}

/**
 * Build the queue payload for the native widget, or return null when the
 * stored queue is still fresh and regeneration was not forced.
 *
 * Forced regeneration (personalization change, premium change, onboarding
 * completion) always rebuilds; unforced calls (app open) rebuild only when
 * the queue is missing, low, old, from another content version, or from a
 * different entitlement state.
 */
export async function buildWidgetQueuePayload(
  options: { force?: boolean } = {},
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
  if (fresh && !options.force) return null;

  const preserved = preservedCurrentSlot(mirror, isPremium, now);
  const seed = preserved
    ? [...recent.filter((id) => id !== preserved.id), preserved.id]
    : recent;

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
