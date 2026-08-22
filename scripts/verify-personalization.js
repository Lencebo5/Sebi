/* Profile A–D verification for the personalization engine (see task spec).
 * Runs the REAL compiled scoring module against the REAL corpus with a
 * seeded RNG, then checks distribution + diversity expectations. */
const { orderFeed } = require("../.test-build/services/personalization.js");
const corpus = require("../src/content/sebi_content_personalized_v1_1460.json");

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
const morningFeed = orderFeed(ITEMS, PROFILES.D.profile, { period: 'morning', recentIds: [], rng: mulberry32(3) });
const nightFeed = orderFeed(ITEMS, PROFILES.D.profile, { period: 'night', recentIds: [], rng: mulberry32(3) });
const mCount = morningFeed.slice(0, 40).filter((a) => a.category === 'morning').length;
const bCount = nightFeed.slice(0, 40).filter((a) => a.category === 'bedtime').length;
const mCountAtNight = nightFeed.slice(0, 40).filter((a) => a.category === 'morning').length;
check('morning content likelier in the morning', mCount > mCountAtNight, `morning:${mCount} vs night:${mCountAtNight}`);
check('bedtime content present at night', bCount > 0, `${bCount}`);

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECKS FAILED'}`);
process.exit(failures === 0 ? 0 : 1);
