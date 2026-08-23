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
// Exported as one object so the global audit (scripts/
// audit-personalization.js) can sweep candidates; production treats it as
// const. `goal: 8` (originally 7) is the one individual-weight change from
// the v2 synergy audit: at 7, a profile whose goal×challenge metadata
// intersection is EMPTY had the chosen goal rank strictly below every
// generic challenge-tagged message, making the selected goal invisible in
// the early feed (measured 0% in the first 60 picks for such profiles).
// A tie at 8 lets goal content interleave while challenges stay the
// strongest signal overall (they stack per tag and cover more corpus).
export const SIGNAL_WEIGHTS = {
  goal: 8,
  challengePerTag: 8, // per matching needTag — strongest signal
  lifeContext: 3,
};
const AGE_BOOST = 2; // deliberately small; age is never a filter
const STYLE_BOOST = 3;
const TIME_OF_DAY_BOOST = 3;
const CONTEXTUAL_CATEGORY_BOOST = 2;

/**
 * ── Multi-signal synergy ──
 * Purely additive weights reward a strong single signal as much as a
 * message sitting at the intersection of several independently selected
 * signals. These GENERAL bonuses apply whenever one message matches two or
 * three distinct signal TYPES (goal category / challenge needTag / life
 * context) — no category combination is ever special-cased, so the same
 * rule serves every profile.
 *
 * Values were tuned globally by scripts/audit-personalization.js across a
 * 35-profile matrix (goal × challenge × context, 3,000 real-selector
 * draws each): the smallest weights that make chosen intent clearly
 * perceptible (goal+challenge intersections surface materially) without
 * collapsing diversity or discovery. Exported as an object so the audit
 * can sweep candidate configurations; production code treats it as const.
 */
export const SYNERGY_WEIGHTS = {
  goalChallenge: 4,
  goalContext: 2,
  challengeContext: 2,
  allThree: 2,
};

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

  const matchesGoal = profile.goals.includes(a.category);
  if (matchesGoal) score += SIGNAL_WEIGHTS.goal;

  let matchesChallenge = false;
  for (const challenge of profile.currentChallenges) {
    if (p.needTags.includes(challenge)) {
      score += SIGNAL_WEIGHTS.challengePerTag;
      matchesChallenge = true;
    }
  }

  const matchesContext = p.lifeContextAffinity.some((c) => profile.lifeContexts.includes(c));
  if (matchesContext) score += SIGNAL_WEIGHTS.lifeContext;

  // Intersection bonuses: matching several signal TYPES at once outranks a
  // generic single-signal match (each type counts once, however many tags
  // matched within it).
  if (matchesGoal && matchesChallenge) score += SYNERGY_WEIGHTS.goalChallenge;
  if (matchesGoal && matchesContext) score += SYNERGY_WEIGHTS.goalContext;
  if (matchesChallenge && matchesContext) score += SYNERGY_WEIGHTS.challengeContext;
  if (matchesGoal && matchesChallenge && matchesContext) score += SYNERGY_WEIGHTS.allThree;

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
   * How many items to order via personalized selection. Defaults to the
   * WHOLE pool — personalization never switches off partway through a
   * feed, no matter how long the user keeps browsing. Set to 1 for a
   * single draw (pickOne).
   */
  personalizedCount?: number;
  /** Injectable for deterministic tests. */
  rng?: () => number;
}

/** How many top candidates form the weighted-random pool (spec: ~20–35). */
const POOL_SIZE = 30;
/** How many best-by-base candidates get sequence-adjusted per pick. */
const CANDIDATE_WINDOW = 120;
/** Scores at or below this are hard-blocked by a diversity rule (-1000s). */
const HARD_BLOCK_THRESHOLD = -500;
/**
 * The candidate window must contain at least this many candidates that are
 * NOT hard-blocked. Without this, a profile whose top-of-score-distribution
 * is flooded by ONE category (e.g. a strong challenge over a large tag
 * pool) leaves every windowed candidate carrying the category-run block,
 * and the -1000 "never a 4th in a row" rule gets bypassed — measured up to
 * 91% single-category early feeds before this guardrail. Scanning a little
 * deeper always finds legal alternatives; cost stays bounded.
 */
const MIN_UNBLOCKED_CANDIDATES = POOL_SIZE;
const CANDIDATE_SCAN_CAP = CANDIDATE_WINDOW * 4;

/**
 * Order a pool of eligible messages into a feed: repeated weighted-random
 * draws from the top of the score distribution, honoring the diversity
 * rules pick by pick — for EVERY position, first to last. Ordering the
 * full 1,460-message corpus costs a few milliseconds once per feed build
 * (base scores are computed once; each pick only re-adjusts a bounded
 * candidate window), so there is no "generic tail".
 */
export function orderFeed(
  items: Affirmation[],
  profile: PersonalizationProfile,
  options: OrderOptions,
): Affirmation[] {
  const rng = options.rng ?? Math.random;
  const ctx: ScoringContext = { profile, period: options.period };
  const count = Math.min(items.length, options.personalizedCount ?? items.length);

  let scored = items
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
    // Compact away already-picked entries now and then so scanning stays
    // cheap even when ordering the whole corpus.
    if (picked.size > 0 && i % 100 === 0) {
      scored = scored.filter((entry) => !picked.has(entry.item.id));
    }
    const candidates: { item: Affirmation; score: number }[] = [];
    let unblocked = 0;
    for (const entry of scored) {
      if (picked.has(entry.item.id)) continue;
      const score = entry.base + sequencePenalty(entry.item, state, profile);
      candidates.push({ item: entry.item, score });
      if (score > HARD_BLOCK_THRESHOLD) unblocked++;
      if (candidates.length >= CANDIDATE_WINDOW && unblocked >= MIN_UNBLOCKED_CANDIDATES) break;
      if (candidates.length >= CANDIDATE_SCAN_CAP) break;
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

  // Remainder — only reached when personalizedCount < pool size (single
  // draws): best base scores first, recently seen items last.
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
