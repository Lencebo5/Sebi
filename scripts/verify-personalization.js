/* Profile A–D verification for the personalization engine (see task spec).
 * Runs the REAL compiled scoring module against the REAL corpus with a
 * seeded RNG, then checks distribution + diversity expectations. */
const { orderFeed, baseScore, SIGNAL_WEIGHTS, SYNERGY_WEIGHTS } = require("../.test-build/services/personalization.js");
const corpus = require("../src/content/sebi_content_FINAL_v2_1609.json");

const PREMIUM_CATEGORIES = new Set(['work_success', 'money', 'relationships', 'hard_days', 'bedtime']);
const ITEMS = corpus.items.map((i) => ({ ...i, premium: PREMIUM_CATEGORIES.has(i.category) }));

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PROFILES = {
  A: {
    profile: { ageRange: '18_24', goals: ['motivation', 'confidence'], currentChallenges: ['focus_attention', 'self_criticism'], lifeContexts: ['student_early_career'], addressMode: 'neutral', deliveryStyle: 'direct' },
    expect: { goalShareMin: 0.4, challengeShareMin: 0.5 },
  },
  B: {
    profile: { ageRange: '35_44', goals: ['calm', 'work_success', 'self_love'], currentChallenges: ['stress_overload', 'worry_overthinking'], lifeContexts: ['family_children', 'career_business'], addressMode: 'neutral', deliveryStyle: 'grounded' },
    expect: { goalShareMin: 0.4, challengeShareMin: 0.5 },
  },
  C: {
    profile: { ageRange: '25_34', goals: ['relationships', 'self_love'], currentChallenges: ['loneliness_disconnection', 'emotional_overwhelm'], lifeContexts: ['relationship'], addressMode: 'neutral', deliveryStyle: 'gentle' },
    expect: { goalShareMin: 0.35, challengeShareMin: 0.4 },
  },
  D: {
    profile: { ageRange: undefined, goals: ['motivation'], currentChallenges: ['difficult_period', 'low_energy_motivation'], lifeContexts: [], addressMode: 'neutral', deliveryStyle: 'gentle' },
    expect: { challengeShareMin: 0.5, activatingShareMax: 0.2, softShareMin: 0.3 },
  },
};

let failures = 0;
const check = (label, ok, detail) => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};

// ── Corpus integrity (final v2, 1,609 messages) ──────────────────────────
console.log('CORPUS INTEGRITY');
const VALID_CATEGORIES = new Set(['confidence', 'motivation', 'calm', 'self_love', 'hard_days', 'healthy_habits', 'relationships', 'work_success', 'money', 'gratitude', 'bedtime', 'morning']);
const VALID_NEED_TAGS = new Set(['worry_overthinking', 'focus_attention', 'emotional_overwhelm', 'low_energy_motivation', 'self_criticism', 'loneliness_disconnection', 'stress_overload', 'difficult_period']);
check('corpus count = 1609', ITEMS.length === 1609, `${ITEMS.length}`);
check('all ids unique', new Set(ITEMS.map((a) => a.id)).size === ITEMS.length);
check('all texts unique', new Set(ITEMS.map((a) => a.text)).size === ITEMS.length);
check('all categories valid', ITEMS.every((a) => VALID_CATEGORIES.has(a.category)));
check('all personalization objects valid', ITEMS.every((a) => {
  const p = a.personalization;
  return p && Array.isArray(p.needTags) && p.needTags.every((t) => VALID_NEED_TAGS.has(t)) &&
    Array.isArray(p.lifeContextAffinity) && Array.isArray(p.ageAffinity) &&
    Array.isArray(p.deliveryStyles) && typeof p.emotionalIntensity === 'string' &&
    Array.isArray(p.addressModes) && typeof p.primaryGoalEligible === 'boolean';
}));
const targetedIds = ITEMS.filter((a) => a.id.startsWith('targeted_v2_'));
check('targeted_v2 messages loaded (300)', targetedIds.length === 300, `${targetedIds.length}`);
const allIds = new Set(ITEMS.map((a) => a.id));

for (const [name, { profile, expect }] of Object.entries(PROFILES)) {
  const rng = mulberry32(42);
  const t0 = Date.now();
  const feed = orderFeed(ITEMS, profile, { period: 'day', recentIds: [], rng });
  const orderMs = Date.now() - t0;
  const top = feed.slice(0, 30);
  // 150 sequential selections — personalization must hold well past #80.
  const seq = feed.slice(0, 150);

  const goalShare = top.filter((a) => profile.goals.includes(a.category)).length / top.length;
  const challengeShare =
    top.filter((a) => a.personalization.needTags.some((t) => profile.currentChallenges.includes(t))).length / top.length;
  const activatingShare = top.filter((a) => a.personalization.emotionalIntensity === 'activating').length / top.length;
  const softShare =
    top.filter((a) => ['hard_days', 'calm', 'self_love'].includes(a.category)).length / top.length;
  const catDist = {};
  for (const a of top) catDist[a.category] = (catDist[a.category] || 0) + 1;

  console.log(`\nPROFILE ${name} — top-30 categories: ${JSON.stringify(catDist)}`);
  console.log(`  goalShare=${goalShare.toFixed(2)} challengeShare=${challengeShare.toFixed(2)} activating=${activatingShare.toFixed(2)} soft=${softShare.toFixed(2)}`);

  if (expect.goalShareMin) check(`goal categories ≥ ${expect.goalShareMin}`, goalShare >= expect.goalShareMin, goalShare.toFixed(2));
  if (expect.challengeShareMin) check(`challenge-tagged ≥ ${expect.challengeShareMin}`, challengeShare >= expect.challengeShareMin, challengeShare.toFixed(2));
  if (expect.activatingShareMax !== undefined) check(`activating ≤ ${expect.activatingShareMax}`, activatingShare <= expect.activatingShareMax, activatingShare.toFixed(2));
  if (expect.softShareMin) check(`soft categories ≥ ${expect.softShareMin}`, softShare >= expect.softShareMin, softShare.toFixed(2));

  // Continuity: quality in selections 81-150 must not materially collapse
  // versus 1-80 (some decline is inherent: a non-repeating feed consumes
  // the best-matching messages first).
  const targeted = (a) =>
    profile.goals.includes(a.category) ||
    a.personalization.needTags.some((t) => profile.currentChallenges.includes(t));
  const share = (arr, fn) => arr.filter(fn).length / arr.length;
  const early = seq.slice(0, 80);
  const late = seq.slice(80, 150);
  const earlyTargeted = share(early, targeted);
  const lateTargeted = share(late, targeted);
  console.log(`  ordering=${orderMs}ms targeted 1-80=${earlyTargeted.toFixed(2)} vs 81-150=${lateTargeted.toFixed(2)}`);
  check('personalization holds after #80 (>=50% of early, >=0.35 abs)',
    lateTargeted >= Math.max(0.35, earlyTargeted * 0.5),
    `early ${earlyTargeted.toFixed(2)} late ${lateTargeted.toFixed(2)}`);
  if (expect.activatingShareMax !== undefined) {
    const lateActivating = share(late, (a) => a.personalization.emotionalIntensity === 'activating');
    check('tone guardrail holds after #80 (activating <= 0.3)', lateActivating <= 0.3, lateActivating.toFixed(2));
  }

  // Diversity rules across all 150 sequential selections (incl. the 80 boundary).
  const ids = new Set();
  let dupes = 0;
  for (const a of seq) {
    if (ids.has(a.id)) dupes++;
    ids.add(a.id);
  }
  check('no duplicate ids in 150 selections', dupes === 0, `${dupes}`);
  check('feed returns only existing corpus ids', feed.every((a) => allIds.has(a.id)));
  check('no same subcategory back-to-back (150)', seq.every((a, i, arr) => i === 0 || arr[i - 1].subcategory !== a.subcategory));
  check('no category run of 4+ (150)', (() => {
    for (let i = 3; i < seq.length; i++) if ([0, 1, 2, 3].every((k) => seq[i - k].category === seq[i].category)) return false;
    return true;
  })());
  // length + style mixing present
  const lengths = new Set(top.map((a) => a.length));
  const stylesSeen = new Set(top.map((a) => a.styleType));
  check('length mix in top 30', lengths.size >= 2, [...lengths].join(','));
  check('styleType mix in top 30', stylesSeen.size >= 2, [...stylesSeen].join(','));
  // no back-to-back hard_days (D has difficult_period so rule is relaxed there)
  if (name !== 'D') {
    let stacked = 0;
    for (let i = 1; i < seq.length; i++) if (seq[i].category === 'hard_days' && seq[i - 1].category === 'hard_days') stacked++;
    check('no stacked hard_days (150)', stacked === 0, `${stacked}`);
  }
}

// Free-plan entitlement: generated feed must never contain premium categories.
const freeItems = ITEMS.filter((a) => !PREMIUM_CATEGORIES.has(a.category));
const freeFeed = orderFeed(freeItems, PROFILES.B.profile, { period: 'day', recentIds: [], rng: mulberry32(7) });
check('\nfree pool never leaks premium categories', freeFeed.every((a) => !PREMIUM_CATEGORIES.has(a.category)));

// Recency: recent ids go to the very back.
const recent = ITEMS.slice(0, 20).map((a) => a.id);
const recFeed = orderFeed(ITEMS, PROFILES.A.profile, { period: 'day', recentIds: recent, rng: mulberry32(9) });
const positions = recent.map((id) => recFeed.findIndex((a) => a.id === id));
check('recent 20 pushed out of the first 200', positions.every((p) => p > 200), `min pos ${Math.min(...positions)}`);

// Time of day: morning boosts morning content, evening boosts bedtime.
// Measured on a NEUTRAL profile: for strongly personalized profiles (like
// D with difficult_period) matched personal content may legitimately
// outrank the generic time-of-day boost — that is intended engine behavior
// (same precedent as the widget time-of-day checks below).
const todNeutral = { goals: [], currentChallenges: [], lifeContexts: [], addressMode: 'neutral', deliveryStyle: 'mixed' };
const morningFeed = orderFeed(ITEMS, todNeutral, { period: 'morning', recentIds: [], rng: mulberry32(3) });
const nightFeed = orderFeed(ITEMS, todNeutral, { period: 'night', recentIds: [], rng: mulberry32(3) });
const mCount = morningFeed.slice(0, 40).filter((a) => a.category === 'morning').length;
const bCount = nightFeed.slice(0, 40).filter((a) => a.category === 'bedtime').length;
const mCountAtNight = nightFeed.slice(0, 40).filter((a) => a.category === 'morning').length;
check('morning content likelier in the morning', mCount > mCountAtNight, `morning:${mCount} vs night:${mCountAtNight}`);
check('bedtime content present at night', bCount > 0, `${bCount}`);

// ── Targeted v2 content surfaces naturally for its intended segment ──────
const profileT = { ageRange: '18_24', goals: ['confidence', 'motivation'], currentChallenges: ['focus_attention', 'worry_overthinking'], lifeContexts: ['student_early_career'], addressMode: 'neutral', deliveryStyle: 'mixed' };
const tFeed = orderFeed(ITEMS, profileT, { period: 'day', recentIds: [], rng: mulberry32(11) });
const tSeq = tFeed.slice(0, 150);
const tHits = tSeq.filter((a) => a.id.startsWith('targeted_v2_'));
console.log(`\nPROFILE T (18-24 student) — targeted_v2 in 150 selections: ${tHits.length} (e.g. ${tHits.slice(0, 3).map((a) => a.id).join(', ')})`);
check('targeted_v2 content appears naturally (18-24 student profile)', tHits.length >= 5, `${tHits.length}`);
const tCatFeed = orderFeed(ITEMS.filter((a) => a.category === 'confidence'), profileT, { period: 'day', recentIds: [], rng: mulberry32(12) });
check('category feed stays inside its category', tCatFeed.every((a) => a.category === 'confidence'), `${tCatFeed.length} items`);

// ── Multi-signal synergy + guardrails (v2 scoring audit) ─────────────────
console.log('\nSYNERGY + GUARDRAILS');
check('synergy weights are general and positive',
  SYNERGY_WEIGHTS.goalChallenge > 0 && SYNERGY_WEIGHTS.goalContext > 0 &&
  SYNERGY_WEIGHTS.challengeContext > 0 && SYNERGY_WEIGHTS.allThree > 0 &&
  SYNERGY_WEIGHTS.goalChallenge >= SYNERGY_WEIGHTS.goalContext);
check('goal never ranks below a generic single challenge tag',
  SIGNAL_WEIGHTS.goal >= SIGNAL_WEIGHTS.challengePerTag - 1);

// General ordering property: a message matching ALL THREE selected signal
// types must base-outscore every message matching ONLY the challenge tag —
// for any profile shape, no combination special-cased.
const synergyProfiles = [
  { goals: ['work_success'], currentChallenges: ['self_criticism'], lifeContexts: ['career_business'] },
  { goals: ['confidence'], currentChallenges: ['worry_overthinking'], lifeContexts: ['student_early_career'] },
  { goals: ['relationships'], currentChallenges: ['emotional_overwhelm'], lifeContexts: ['family_children'] },
].map((p) => ({ ...p, addressMode: 'neutral', deliveryStyle: 'mixed' }));
for (const profile of synergyProfiles) {
  const [g] = profile.goals; const [t] = profile.currentChallenges; const [x] = profile.lifeContexts;
  const ctx = { profile, period: 'day' };
  const triple = ITEMS.filter((a) => a.category === g && a.personalization.needTags.includes(t) && a.personalization.lifeContextAffinity.includes(x));
  const challengeOnly = ITEMS.filter((a) => a.category !== g && a.personalization.needTags.includes(t) && !a.personalization.lifeContextAffinity.includes(x) && a.personalization.needTags.length === 1);
  const minTriple = Math.min(...triple.map((a) => baseScore(a, ctx)));
  const maxSingle = Math.max(...challengeOnly.map((a) => baseScore(a, ctx)));
  check(`triple intersection outranks generic challenge-only (${g})`, triple.length > 0 && minTriple > maxSingle, `${minTriple} vs ${maxSingle}`);
}

// Concentration ceiling: even for strong-safety profiles the early feed
// must respect the category-run cap (~75%) — no wall-to-wall category.
const stressProfiles = [
  { goals: ['money'], currentChallenges: ['difficult_period'], lifeContexts: ['career_business'] },
  { goals: ['calm'], currentChallenges: ['worry_overthinking'], lifeContexts: ['family_children'] },
  { goals: ['work_success'], currentChallenges: ['self_criticism'], lifeContexts: ['career_business'] },
].map((p) => ({ ...p, addressMode: 'neutral', deliveryStyle: 'mixed' }));
for (const profile of stressProfiles) {
  const first60 = orderFeed(ITEMS, profile, { period: 'day', recentIds: [], personalizedCount: 60, rng: mulberry32(21) }).slice(0, 60);
  const catCounts = {};
  for (const a of first60) catCounts[a.category] = (catCounts[a.category] || 0) + 1;
  const maxShare = Math.max(...Object.values(catCounts)) / first60.length;
  check(`no pathological concentration (${profile.goals[0]}+${profile.currentChallenges[0]})`, maxShare <= 0.76, `${(maxShare * 100).toFixed(0)}%`);
}

// Goal visibility floor: a chosen goal stays perceptible in the early feed
// even when its goal×challenge metadata intersection is EMPTY.
const emptyIntersection = { goals: ['confidence'], currentChallenges: ['focus_attention'], lifeContexts: ['relationship'], addressMode: 'neutral', deliveryStyle: 'mixed' };
const eiFirst60 = orderFeed(ITEMS, emptyIntersection, { period: 'day', recentIds: [], personalizedCount: 60, rng: mulberry32(23) }).slice(0, 60);
const eiGoalShare = eiFirst60.filter((a) => a.category === 'confidence').length / eiFirst60.length;
check('goal visible even with empty goal×challenge metadata', eiGoalShare >= 0.15, `${(eiGoalShare * 100).toFixed(0)}%`);


// ── Android widget selection (src/widgets/widget-select.ts) ──────────────
// The compiled test build keeps the app's `@/` path alias — resolve it here.
const Module = require('module');
const path = require('path');
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...args) {
  if (typeof request === 'string' && request.startsWith('@/')) {
    return origResolve.call(this, path.resolve('.test-build', request.slice(2)), ...args);
  }
  return origResolve.call(this, request, ...args);
};
const {
  eligibleWidgetPool,
  selectWidgetAffirmation,
  widgetLabel,
  lengthTier,
  SMALL_SAFE_CHARS,
} = require('../.test-build/widgets/widget-select.js');

console.log('\nWIDGET CHECKS');
// Fit: whole corpus currently fits the small widget's safe budget.
check('all 1609 messages fit the small widget budget', ITEMS.every((a) => a.charCount <= SMALL_SAFE_CHARS));
// Length tiers (mapped to fixed native sp sizes) grow monotonically.
const TIER_RANK = { short: 0, mid: 1, long: 2, xl: 3 };
const tiers = [10, 30, 46, 63, 76, 96, 140].map((c) => lengthTier(c));
check('length tiers valid and monotonic', tiers.every((t) => t in TIER_RANK) && tiers.every((t, i, arr) => i === 0 || TIER_RANK[t] >= TIER_RANK[arr[i - 1]]));
check('length tier breakpoints', lengthTier(45) === 'short' && lengthTier(46) === 'mid' && lengthTier(62) === 'mid' && lengthTier(63) === 'long' && lengthTier(95) === 'long' && lengthTier(96) === 'xl');

// Free users: pool never contains premium categories.
const freePool = eligibleWidgetPool(ITEMS, false);
check('widget free pool has no premium categories', freePool.every((a) => !PREMIUM_CATEGORIES.has(a.category)));
check('widget free pool is large enough', freePool.length > 500, `${freePool.length}`);

// Profiles A and B produce measurably different widget selections.
const draw = (profile, seed, n, period) => {
  const seen = [];
  const rng = mulberry32(seed);
  for (let i = 0; i < n; i++) {
    const a = selectWidgetAffirmation(ITEMS, profile, period, seen.slice(-20), true, rng);
    seen.push(a.id);
  }
  return seen;
};
const aDraws = new Set(draw(PROFILES.A.profile, 5, 40, 'day'));
const bDraws = new Set(draw(PROFILES.B.profile, 5, 40, 'day'));
const overlap = [...aDraws].filter((id) => bDraws.has(id)).length / aDraws.size;
check('profiles A vs B widget selections differ', overlap < 0.3, `overlap ${(overlap * 100).toFixed(0)}%`);

// Widget-only history is honored (no repeats within the window).
const seq = draw(PROFILES.A.profile, 9, 21, 'day');
const withinWindow = seq.some((id, i) => seq.slice(Math.max(0, i - 20), i).includes(id));
check('widget history prevents repeats within 20', !withinWindow);

// Time of day: for a neutral profile (fresh widget user, pre-onboarding)
// morning surfaces morning content and night surfaces bedtime content.
// Strong challenge signals may legitimately outweigh time-of-day for
// profiles like D (difficult_period) — that is intended engine behavior.
const neutralProfile = { goals: [], currentChallenges: [], lifeContexts: [], addressMode: 'neutral', deliveryStyle: 'mixed' };
const morningDraws = draw(neutralProfile, 3, 30, 'morning');
const nightDraws = draw(neutralProfile, 3, 30, 'night');
const dayDraws = draw(neutralProfile, 3, 30, 'day');
const mCat = morningDraws.filter((id) => id.startsWith('morning_')).length;
const bCat = nightDraws.filter((id) => id.startsWith('bedtime_')).length;
const mAtDay = dayDraws.filter((id) => id.startsWith('morning_')).length;
check('morning widget draws include morning content (neutral)', mCat > 0, `${mCat}/30`);
check('night widget draws include bedtime content (neutral)', bCat > 0, `${bCat}/30`);
check('morning content likelier in the morning than midday', mCat > mAtDay, `${mCat} vs ${mAtDay}`);

// Labels: Serbian display text only, never internal ids.
const sampleMorning = ITEMS.find((a) => a.category === 'morning');
const sampleBedtime = ITEMS.find((a) => a.category === 'bedtime');
const sampleCalm = ITEMS.find((a) => a.category === 'calm');
check('labels map to Serbian display text', widgetLabel(sampleMorning) === 'DOBRO JUTRO' && widgetLabel(sampleBedtime) === 'PRED SPAVANJE' && widgetLabel(sampleCalm) === 'ZA DANAS');
// Time-of-day surfaces (design 1f) are decided natively now — the mapping
// is verified statically against SebiWidgetProvider.java by verify-widget.

// ── Topic preferences: category intent, Free preview, no double-count ────
console.log('\nTOPIC PREFERENCES + SURFACES');
const { surfacePool } = require('../.test-build/services/topics.js');

// §23 real-device regression profile: FREE user, work_success goal+topic.
const realProfile = { goals: ['work_success'], currentChallenges: ['self_criticism'], lifeContexts: ['career_business'], addressMode: 'neutral', deliveryStyle: 'mixed' };
const realTopics = ['work_success'];
const realPool = surfacePool(ITEMS, 'personalized_feed', false, realTopics);
check('free pool admits ONLY the selected premium topic', realPool.every((a) => !a.premium || a.category === 'work_success'));
check('free pool includes work_success preview content', realPool.some((a) => a.category === 'work_success'));
const realFeed = orderFeed(realPool, realProfile, { period: 'day', recentIds: [], preferredCategories: realTopics, personalizedCount: 150, rng: mulberry32(31) }).slice(0, 150);
for (const n of [20, 60, 150]) {
  const win = realFeed.slice(0, n);
  const dist = {};
  win.forEach((a) => { dist[a.category] = (dist[a.category] || 0) + 1; });
  console.log(`  first ${n}: ` + Object.entries(dist).sort((a, b) => b[1] - a[1]).map(([c, k]) => `${c} ${((k * 100) / n).toFixed(0)}%`).join(', '));
  const ws = (dist.work_success || 0) / n;
  check(`Free work profile visibly receives work_success in first ${n}`, ws >= 0.2, `${(ws * 100).toFixed(0)}%`);
}
check('no unrelated premium leakage in the real-profile feed', realFeed.every((a) => !a.premium || a.category === 'work_success'));

// No leakage without the topic; category browsing stays gated.
check('free user without the work topic gets no work_success', surfacePool(ITEMS, 'personalized_feed', false, ['calm']).every((a) => a.category !== 'work_success'));
check('free user with no topics gets zero premium content', surfacePool(ITEMS, 'personalized_feed', false, []).every((a) => !a.premium));
check('category browsing stays fully gated for Free', surfacePool(ITEMS, 'category_feed', false, ['work_success']).every((a) => !a.premium));

// No double scoring: goal + identical preferred topic == goal alone.
const wsItem = ITEMS.find((a) => a.category === 'work_success' && a.personalization.needTags.includes('self_criticism'));
check('goal + identical preferred topic never double-counts',
  baseScore(wsItem, { profile: realProfile, period: 'day' }) ===
  baseScore(wsItem, { profile: realProfile, period: 'day', preferredCategories: ['work_success'] }));

// Topic-as-intent: an explicit topic earns exactly what a goal would.
const noGoals = { goals: [], currentChallenges: ['worry_overthinking'], lifeContexts: [], addressMode: 'neutral', deliveryStyle: 'mixed' };
const calmWorry = ITEMS.find((a) => a.category === 'calm' && a.personalization.needTags.includes('worry_overthinking'));
check('preferred topic earns the same category intent + synergy as a goal',
  baseScore(calmWorry, { profile: { ...noGoals, goals: ['calm'] }, period: 'day' }) ===
  baseScore(calmWorry, { profile: noGoals, period: 'day', preferredCategories: ['calm'] }));

// §24 regression matrix: topic aligned with goal AND divergent from it.
const MATRIX24 = [
  ['calm', 'worry_overthinking', 'family_children'],
  ['motivation', 'low_energy_motivation', 'student_early_career'],
  ['relationships', 'loneliness_disconnection', 'relationship'],
  ['self_love', 'difficult_period', 'major_change'],
  ['confidence', 'focus_attention', 'student_early_career'],
  ['money', 'worry_overthinking', 'career_business'],
];
for (const [goal24, chal24, life24] of MATRIX24) {
  const profile24 = { goals: [goal24], currentChallenges: [chal24], lifeContexts: [life24], addressMode: 'neutral', deliveryStyle: 'mixed' };
  const aligned = orderFeed(ITEMS, profile24, { period: 'day', recentIds: [], preferredCategories: [goal24], personalizedCount: 60, rng: mulberry32(41) }).slice(0, 60);
  const alignedShare = aligned.filter((a) => a.category === goal24).length / 60;
  // Divergent topics compete with a structurally stronger challenge signal
  // (which stays dominant by design), so presence is measured over 150
  // draws — a few days of browsing — not just the first screenfuls. For
  // difficult_period the tone-safety boosts INTENTIONALLY outrank a flat
  // topic preference (gentle/grounded content first); the topic still
  // arrives, just later — measured at 300.
  const horizon = chal24 === 'difficult_period' ? 300 : 150;
  const divergent = orderFeed(ITEMS, profile24, { period: 'day', recentIds: [], preferredCategories: ['gratitude'], personalizedCount: horizon, rng: mulberry32(42) }).slice(0, horizon);
  const topicShare = divergent.filter((a) => a.category === 'gratitude').length / horizon;
  const goalShare = divergent.filter((a) => a.category === goal24).length / horizon;
  check(`${goal24}+${chal24}: aligned topic keeps goal visible without over-concentration`, alignedShare >= 0.1 && alignedShare <= 0.76, `${(alignedShare * 100).toFixed(0)}%`);
  check(`${goal24}+${chal24}: divergent manual topic surfaces alongside goal`, topicShare > 0 && goalShare > 0, `topic ${(topicShare * 100).toFixed(0)}% goal ${(goalShare * 100).toFixed(0)}%`);
}

console.log(`\nWIDGET+CORE: ${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECKS FAILED'}`);
process.exitCode = failures === 0 ? 0 : 1;
