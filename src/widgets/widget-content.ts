import { AFFIRMATIONS, getAffirmation } from '@/content/affirmations';
import type { PersonalizationProfile, Preferences } from '@/models/types';
import { periodForHour, type DayPeriod } from '@/services/personalization';
import { readJson, StorageKeys, writeJson } from '@/services/storage';
import {
  eligibleWidgetPool,
  selectWidgetAffirmation,
  widgetLabel,
  widgetSurface,
  type WidgetDisplay,
} from '@/widgets/widget-select';

/**
 * Headless widget content service. Runs in the widget task (no React tree,
 * no app context) and reads persisted state directly.
 *
 * Widget viewing is passive: this service keeps its OWN small impression
 * history (`widgetRecentIds`, last 20) and NEVER touches the app's recent
 * history, favorites, streak or feed state.
 *
 * Selection is period-stable: one message per local time period (morning /
 * day / evening / night — ~3–4 changes per day). Repeated Android update
 * ticks inside the same period re-render the same message.
 */

const WIDGET_HISTORY_SIZE = 20;

interface WidgetState {
  dateKey: string;
  period: DayPeriod;
  id: string;
}

const DEFAULT_PROFILE: PersonalizationProfile = {
  goals: [],
  currentChallenges: [],
  lifeContexts: [],
  addressMode: 'neutral',
  deliveryStyle: 'mixed',
};

function dateKeyOf(now: Date): string {
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

async function readProfile(): Promise<PersonalizationProfile> {
  const prefs = await readJson<Partial<Preferences> | null>(StorageKeys.preferences, null);
  if (prefs && prefs.version === 2 && prefs.profile) {
    return { ...DEFAULT_PROFILE, ...prefs.profile };
  }
  // Pre-onboarding / legacy storage: neutral profile, still personalized by
  // time of day and fully eligible Free content.
  return DEFAULT_PROFILE;
}

export async function getWidgetDisplay(now: Date = new Date()): Promise<WidgetDisplay> {
  const period = periodForHour(now.getHours());
  const surface = widgetSurface(period);

  try {
    const [profile, isPremium, recent, state] = await Promise.all([
      readProfile(),
      readJson<boolean>(StorageKeys.premiumCache, false),
      readJson<string[]>(StorageKeys.widgetRecentIds, []),
      readJson<WidgetState | null>(StorageKeys.widgetState, null),
    ]);

    // Same day + same period → keep the current message (never show a
    // removed/invalid id after a content migration).
    if (state && state.dateKey === dateKeyOf(now) && state.period === period) {
      const existing = getAffirmation(state.id);
      if (existing && (isPremium || !existing.premium)) {
        return { affirmation: existing, label: widgetLabel(existing), surface };
      }
    }

    const picked = selectWidgetAffirmation(AFFIRMATIONS, profile, period, recent, isPremium);
    if (!picked) return fallbackDisplay(surface);

    const nextRecent = [...recent.filter((id) => id !== picked.id), picked.id].slice(
      -WIDGET_HISTORY_SIZE,
    );
    void writeJson(StorageKeys.widgetRecentIds, nextRecent);
    void writeJson(StorageKeys.widgetState, {
      dateKey: dateKeyOf(now),
      period,
      id: picked.id,
    } satisfies WidgetState);

    return { affirmation: picked, label: widgetLabel(picked), surface };
  } catch {
    // Storage hiccup — still show a valid Sebi message, never a blank box.
    return fallbackDisplay(surface);
  }
}

function fallbackDisplay(surface: WidgetDisplay['surface']): WidgetDisplay {
  const safe = eligibleWidgetPool(AFFIRMATIONS, false)[0];
  return { affirmation: safe, label: widgetLabel(safe), surface };
}
