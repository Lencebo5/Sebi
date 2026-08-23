import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * TEMPORARY widget render diagnostics — remove once the invisible-widget
 * root cause is confirmed.
 *
 * The widget on-device renders through a native headless pipeline that we
 * cannot exercise in CI, and every release build takes ~15 min. Instead of
 * one rebuild per isolation step, the task handler renders a numbered test
 * STAGE (0 = the minimal white/black widget, then one feature at a time in
 * the agreed order, up to the production widget). The current stage is
 * persisted here and advanced from a temporary Settings row, which also
 * triggers an immediate widget refresh — so a single build can walk the
 * whole isolation ladder.
 */

export const WIDGET_DEBUG = true;

const STAGE_KEY = 'danas.widget-debug-stage.v1';

export const WIDGET_STAGE_COUNT = 11; // 0..10, where 10 = production widget

export const WIDGET_STAGE_LABELS: string[] = [
  '0 minimalni (belo/crno)',
  '1 + puna Linen boja',
  '2 + tekst misli (sistemski font)',
  '3 + label i brend (pune boje)',
  '4 + padding/raspored',
  '5 + radius 24',
  '6 + Literata font',
  '7 + Schibsted font',
  '8 + gradijent pozadine',
  '9 + rgba boje/letterSpacing/tačka',
  '10 produkcioni (personalizacija + veličine)',
];

export async function getWidgetStage(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(STAGE_KEY);
    const parsed = raw == null ? 0 : Number(raw);
    return Number.isInteger(parsed) && parsed >= 0 && parsed < WIDGET_STAGE_COUNT ? parsed : 0;
  } catch {
    return 0;
  }
}

export async function advanceWidgetStage(): Promise<number> {
  const next = ((await getWidgetStage()) + 1) % WIDGET_STAGE_COUNT;
  try {
    await AsyncStorage.setItem(STAGE_KEY, String(next));
  } catch {
    // best effort
  }
  return next;
}
