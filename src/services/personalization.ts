import type { Affirmation, PersonalizationProfile } from '@/models/types';

/**
 * Personalization scoring and feed ordering, implementing
 * docs/sebi_personalization_scoring_v1.md.
 *
 * Principles:
 * - the user's answers are SIGNALS (boosts), never hard filters — most
 *   neutral messages stay eligible for everyone;
 * - the winner is not simply the highest score: the top ~30 candidates form
 *   a pool and one is drawn weighted-randomly, so the feed stays personal
 *   without becoming predictable;
 * - sequencing rules keep the feed diverse (no near repeats, no monotone
 *   category/style/length runs, no stacked heavy hard-days messages).
 *
 * This module is pure (no React/React Native imports) so it can be unit
 * tested with plain Node.
 */

export type DayPeriod = 'morning' | 'day' | 'evening' | 'night';

export function periodForHour(hour: number): DayPeriod {
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 17) return 'day';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}

export interface ScoringContext {
  profile: PersonalizationProfile;
  period: DayPeriod;
}

// ── Signal weights (scoring doc §Suggested score) ──
const GOAL_BOOST = 7;
const CHALLENGE_BOOST = 8; // per matching needTag — strongest signal
const LIFE_CONTEXT_BOOST = 3;
const AGE_BOOST = 2; // deliberately small; age is never a filter
const STYLE_BOOST = 3;
const TIME_OF_DAY_BOOST = 3;
const CONTEXTUAL_CATEGORY_BOOST = 2;

// ── Sequencing penalties (scoring doc §Feed diversity rules) ──
const RECENT_PENALTY = -100;
const SUBCATEGORY_BLOCK = -1000; // never the same subcategory twice in a row
const SUBCATEGORY_REPEAT_PENALTY = -8; // same subcategory two picks back
const CATEGORY_RUN_PENALTY = -5; // discourage a 3rd same-category in a row
const CATEGORY_RUN_BLOCK = -1000; // never allow a 4th same-category in a row
const STYLE_TYPE_REPEAT_PENALTY = -2; // mix direct / ja / perspective
const LENGTH_REPEAT_PENALTY = -1; // mix short / medium / long
const HARD_DAYS_STACK_PENALTY = -6; // no back-to-back heavy hard-days

/**
 * Static per-message score from the profile and time of day. Does not
 * depend on what was shown before — sequencing is layered on top.
 */
export function baseScore(a: Affirmation, ctx: ScoringContext): number {
  const { profile, period } = ctx;
  const p = a.personalization;
  let score = 0;

  if (profile.goals.includes(a.category)) score += GOAL_BOOST;

  for (const challenge of profile.currentChallenges) {
    if (p.needTags.includes(challenge)) score += CHALLENGE_BOOST;
  }

  if (p.lifeContextAffinity.some((c) => profile.lifeContexts.includes(c))) {
    score += LIFE_CONTEXT_BOOST;
  }

  if (profile.ageRange && p.ageAffinity.includes(profile.ageRange)) score += AGE_BOOST;

  // "mixed" applies no style boost — normal diversity.
  if (profile.deliveryStyle !== 'mixed' && p.deliveryStyles.includes(profile.deliveryStyle)) {
    score += STYLE_BOOST;
  }

  if (period !== 'day' && a.timeOfDay.includes(period)) score += TIME_OF_DAY_BOOST;

  // Contextual categories when the moment strongly calls for them.
  if (a.category === 'morning' && period === 'morning') score += CONTEXTUAL_CATEGORY_BOOST;
  if (a.category === 'bedtime' && (period === 'evening' || period === 'night')) {
    score += CONTEXTUAL_CATEGORY_BOOST;
  }

  score += toneGuardrails(a, profile);
  return score;
}

/**
 * Tone safety for vulnerable states. Topical preference per challenge is
 * already carried by the corpus needTags (+8 above); these rules only steer
 * INTENSITY — a difficult period or an energy dip must not produce a feed
 * of aggressive productivity pushes.
 */
function toneGuardrails(a: Affirmation, profile: PersonalizationProfile): number {
  const challenges = profile.currentChallenges;
  const intensity = a.personalization.emotionalIntensity;
  const wantsMotivational = profile.deliveryStyle === 'motivational';
  let score = 0;

  if (challenges.includes('difficult_period')) {
    if (a.category === 'hard_days') score += 3;
    if (a.category === 'calm' || a.category === 'self_love') score += 2;
    if (
      a.personalization.deliveryStyles.includes('gentle') ||
      a.personalization.deliveryStyles.includes('grounded')
    ) {
      score += 2;
    }
    if (intensity === 'gentle') score += 2;
    // Suppress activating messages unless the user explicitly asked for
    // motivational delivery (scoring doc §difficult_period).
    if (intensity === 'activating' && !wantsMotivational) score -= 4;
  }

  if (challenges.includes('low_energy_motivation')) {
    if (intensity === 'gentle') score += 2;
    if (intensity === 'activating' && !wantsMotivational) score -= 3;
  }

  return score;
}

/** What the sequencer knows about the messages already emitted. */
interface SequenceState {
  /** ids shown recently (persisted history + picks made in this ordering). */
  recent: Set<string>;
  /** Up to the last 3 picks, most recent first. */
  lastPicks: Affirmation[];
}

function sequencePenalty(a: Affirmation, state: SequenceState, profile: PersonalizationProfile): number {
  let penalty = 0;
  if (state.recent.has(a.id)) penalty += RECENT_PENALTY;

  const [prev, prev2, prev3] = state.lastPicks;
  if (prev && prev.subcategory === a.subcategory) penalty += SUBCATEGORY_BLOCK;
  else if (prev2 && prev2.subcategory === a.subcategory) penalty += SUBCATEGORY_REPEAT_PENALTY;
  if (prev && prev2 && prev.category === a.category && prev2.category === a.category) {
    penalty +=
      prev3 && prev3.category === a.category ? CATEGORY_RUN_BLOCK : CATEGORY_RUN_PENALTY;
  }
  if (prev && prev.styleType === a.styleType) penalty += STYLE_TYPE_REPEAT_PENALTY;
  if (prev && prev.length === a.length) penalty += LENGTH_REPEAT_PENALTY;
  if (
    prev &&
    prev.category === 'hard_days' &&
    a.category === 'hard_days' &&
    !profile.currentChallenges.includes('difficult_period')
  ) {
    penalty += HARD_DAYS_STACK_PENALTY;
  }
  return penalty;
}

export interface OrderOptions {
  period: DayPeriod;
  /** Recently shown ids (bounded history) — pushed to the back of the feed. */
  recentIds?: string[];
  /** Extra ids to treat as already shown (e.g. within one notification batch). */
  exclude?: string[];
  /**
   * How many leading items to order via full personalized selection; the
   * rest of the pool follows sorted by base score. Sessions rarely consume
   * more than this, and it keeps ordering cheap.
   */
  personalizedCount?: number;
  /** Injectable for deterministic tests. */
  rng?: () => number;
}

/** How many top candidates form the weighted-random pool (spec: ~20–35). */
const POOL_SIZE = 30;
/** How many best-by-base candidates get sequence-adjusted per pick. */
const CANDIDATE_WINDOW = 120;
const DEFAULT_PERSONALIZED_COUNT = 80;

/**
 * Order a pool of eligible messages into a feed: repeated weighted-random
 * draws from the top of the score distribution, honoring the diversity
 * rules pick by pick.
 */
export function orderFeed(
  items: Affirmation[],
  profile: PersonalizationProfile,
  options: OrderOptions,
): Affirmation[] {
  const rng = options.rng ?? Math.random;
  const ctx: ScoringContext = { profile, period: options.period };
  const count = Math.min(items.length, options.personalizedCount ?? DEFAULT_PERSONALIZED_COUNT);

  const scored = items
    .map((item) => ({ item, base: baseScore(item, ctx) }))
    // Shuffle before the stable sort so equal scores tie-break randomly.
    .map((entry) => ({ ...entry, tiebreak: rng() }))
    .sort((a, b) => b.base - a.base || a.tiebreak - b.tiebreak);

  const state: SequenceState = {
    recent: new Set([...(options.recentIds ?? []), ...(options.exclude ?? [])]),
    lastPicks: [],
  };
  const picked = new Set<string>();
  const result: Affirmation[] = [];

  for (let i = 0; i < count; i++) {
    const candidates: { item: Affirmation; score: number }[] = [];
    for (const entry of scored) {
      if (picked.has(entry.item.id)) continue;
      candidates.push({
        item: entry.item,
        score: entry.base + sequencePenalty(entry.item, state, profile),
      });
      if (candidates.length >= CANDIDATE_WINDOW) break;
    }
    if (candidates.length === 0) break;

    candidates.sort((a, b) => b.score - a.score);
    const pool = candidates.slice(0, POOL_SIZE);
    const chosen = weightedPick(pool, rng);

    picked.add(chosen.id);
    result.push(chosen);
    state.recent.add(chosen.id);
    state.lastPicks = [chosen, ...state.lastPicks].slice(0, 3);
  }

  // Deep tail: everything not personally ordered, best base scores first,
  // recently seen items last.
  const freshTail: Affirmation[] = [];
  const staleTail: Affirmation[] = [];
  for (const entry of scored) {
    if (picked.has(entry.item.id)) continue;
    (state.recent.has(entry.item.id) ? staleTail : freshTail).push(entry.item);
  }
  return [...result, ...freshTail, ...staleTail];
}

/** One personalized draw (onboarding preview, notification bodies). */
export function pickOne(
  items: Affirmation[],
  profile: PersonalizationProfile,
  options: OrderOptions,
): Affirmation | undefined {
  return orderFeed(items, profile, { ...options, personalizedCount: 1 })[0];
}

function weightedPick(
  pool: { item: Affirmation; score: number }[],
  rng: () => number,
): Affirmation {
  const min = pool[pool.length - 1].score;
  const weights = pool.map((entry) => Math.max(entry.score - min + 1, 1));
  const total = weights.reduce((sum, w) => sum + w, 0);
  let roll = rng() * total;
  for (let i = 0; i < pool.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return pool[i].item;
  }
  return pool[pool.length - 1].item;
}
