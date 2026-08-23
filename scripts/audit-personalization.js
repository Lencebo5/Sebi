/**
 * Personalization coverage + synergy audit over the final 1,609 corpus.
 *
 * Run:  npx tsc -p tsconfig.test.json && node scripts/audit-personalization.js
 * Flags: --sweep     compare candidate synergy configurations globally
 *        --top       print per-profile top-10 most frequently surfaced messages
 *
 * Everything runs through the REAL production selector (orderFeed) from the
 * compiled test build. The synergy weights are swept by mutating the
 * exported SYNERGY_WEIGHTS object — no code duplication, no forked scorer.
 */
const path = require('path');
const Module = require('module');

const BUILD = path.resolve('.test-build');
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...args) {
  if (typeof request === 'string' && request.startsWith('@/')) {
    return origResolve.call(this, path.resolve(BUILD, request.slice(2)), ...args);
  }
  return origResolve.call(this, request, ...args);
};

const { AFFIRMATIONS } = require(path.join(BUILD, 'content/affirmations.js'));
const { orderFeed, SYNERGY_WEIGHTS, SIGNAL_WEIGHTS } = require(path.join(BUILD, 'services/personalization.js'));

const ITEMS = AFFIRMATIONS;
const N = ITEMS.length;

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const GOALS = ['confidence', 'motivation', 'self_love', 'calm', 'work_success', 'money', 'relationships', 'healthy_habits'];
const CHALLENGES = ['worry_overthinking', 'focus_attention', 'emotional_overwhelm', 'low_energy_motivation', 'self_criticism', 'loneliness_disconnection', 'stress_overload', 'difficult_period'];
const CONTEXTS = ['student_early_career', 'career_business', 'relationship', 'family_children', 'major_change', 'focus_on_self'];

const hasTag = (a, tag) => a.personalization.needTags.includes(tag);
const hasCtx = (a, ctx) => a.personalization.lifeContextAffinity.includes(ctx);
const pct = (x) => `${(x * 100).toFixed(1)}%`;

// ═════════════════════════════════════════════════════════════════════════
// 1. COVERAGE AUDIT — metadata reality, independent of any scoring.
// ═════════════════════════════════════════════════════════════════════════
function coverage() {
  console.log(`\n════ 1. CORPUS COVERAGE (${N} messages) ════`);

  console.log('\nGoals (category counts):');
  for (const g of GOALS) {
    const c = ITEMS.filter((a) => a.category === g).length;
    console.log(`  ${g.padEnd(24)} ${String(c).padStart(4)}  ${pct(c / N)}`);
  }
  console.log('\nChallenges (needTag counts):');
  for (const t of CHALLENGES) {
    const c = ITEMS.filter((a) => hasTag(a, t)).length;
    console.log(`  ${t.padEnd(24)} ${String(c).padStart(4)}  ${pct(c / N)}`);
  }
  console.log('\nLife contexts (affinity counts):');
  for (const x of CONTEXTS) {
    const c = ITEMS.filter((a) => hasCtx(a, x)).length;
    console.log(`  ${x.padEnd(24)} ${String(c).padStart(4)}  ${pct(c / N)}`);
  }

  const cells = [];

  console.log('\nGoal × challenge (messages inside the goal category carrying the tag):');
  for (const g of GOALS) {
    const row = CHALLENGES.map((t) => {
      const c = ITEMS.filter((a) => a.category === g && hasTag(a, t)).length;
      cells.push({ kind: 'goal×challenge', key: `${g}+${t}`, count: c });
      return String(c).padStart(4);
    });
    console.log(`  ${g.padEnd(14)} ${row.join(' ')}`);
  }
  console.log(`  ${''.padEnd(14)} ${CHALLENGES.map((t) => t.slice(0, 4)).map((s) => s.padStart(4)).join(' ')}`);

  console.log('\nGoal × context:');
  for (const g of GOALS) {
    const row = CONTEXTS.map((x) => {
      const c = ITEMS.filter((a) => a.category === g && hasCtx(a, x)).length;
      cells.push({ kind: 'goal×context', key: `${g}+${x}`, count: c });
      return String(c).padStart(4);
    });
    console.log(`  ${g.padEnd(14)} ${row.join(' ')}`);
  }
  console.log(`  ${''.padEnd(14)} ${CONTEXTS.map((x) => x.slice(0, 4)).map((s) => s.padStart(4)).join(' ')}`);

  console.log('\nChallenge × context:');
  for (const t of CHALLENGES) {
    const row = CONTEXTS.map((x) => {
      const c = ITEMS.filter((a) => hasTag(a, t) && hasCtx(a, x)).length;
      cells.push({ kind: 'challenge×context', key: `${t}+${x}`, count: c });
      return String(c).padStart(4);
    });
    console.log(`  ${t.padEnd(24)} ${row.join(' ')}`);
  }

  let tripleZero = 0, tripleLow = 0;
  const worstTriples = [];
  for (const g of GOALS) for (const t of CHALLENGES) for (const x of CONTEXTS) {
    const c = ITEMS.filter((a) => a.category === g && hasTag(a, t) && hasCtx(a, x)).length;
    if (c === 0) tripleZero++;
    else if (c < 4) tripleLow++;
    if (c < 2) worstTriples.push(`${g}+${t}+${x}:${c}`);
  }
  console.log(`\nTriple (goal+challenge+context) over all ${GOALS.length * CHALLENGES.length * CONTEXTS.length} combos: ${tripleZero} zero, ${tripleLow} low(<4)`);

  const zero = cells.filter((c) => c.count === 0);
  const low = cells.filter((c) => c.count > 0 && c.count < 8);
  const counts = cells.map((c) => c.count);
  const mean = counts.reduce((s, c) => s + c, 0) / counts.length;
  const sd = Math.sqrt(counts.map((c) => (c - mean) ** 2).reduce((s, v) => s + v, 0) / counts.length);
  const high = cells.filter((c) => c.count > mean + 2 * sd).sort((a, b) => b.count - a.count);

  console.log(`\nFlags: ${zero.length} ZERO pairs, ${low.length} LOW (<8) pairs, ${high.length} unusually high (>${(mean + 2 * sd).toFixed(0)})`);
  if (zero.length) console.log('  ZERO: ' + zero.map((c) => c.key).join(', '));
  if (low.length) console.log('  LOW:  ' + low.map((c) => `${c.key}(${c.count})`).join(', '));
  if (high.length) console.log('  HIGH: ' + high.map((c) => `${c.key}(${c.count})`).join(', '));
  return { zero, low, high };
}

// ═════════════════════════════════════════════════════════════════════════
// 2. REPRESENTATIVE PROFILE MATRIX — every goal with several different
//    challenges and contexts, plus the mandated examples.
// ═════════════════════════════════════════════════════════════════════════
function buildMatrix() {
  const mandated = [
    ['work_success', 'self_criticism', 'career_business'],
    ['work_success', 'stress_overload', 'career_business'],
    ['confidence', 'self_criticism', 'student_early_career'],
    ['motivation', 'low_energy_motivation', 'student_early_career'],
    ['calm', 'worry_overthinking', 'family_children'],
    ['calm', 'emotional_overwhelm', 'major_change'],
    ['relationships', 'loneliness_disconnection', 'relationship'],
    ['relationships', 'emotional_overwhelm', 'family_children'],
    ['self_love', 'difficult_period', 'major_change'],
    ['healthy_habits', 'low_energy_motivation', 'focus_on_self'],
    ['money', 'worry_overthinking', 'career_business'],
  ];
  const seen = new Set(mandated.map((p) => p.join('|')));
  const matrix = [...mandated];
  // Systematic expansion: 3 extra combos per goal, rotating challenges and
  // contexts so each challenge/context recurs across different goals.
  GOALS.forEach((g, i) => {
    for (let j = 0; j < 3; j++) {
      const t = CHALLENGES[(i * 3 + j) % CHALLENGES.length];
      const x = CONTEXTS[(i * 5 + j * 2) % CONTEXTS.length];
      const key = [g, t, x].join('|');
      if (!seen.has(key)) { seen.add(key); matrix.push([g, t, x]); }
    }
  });
  return matrix.map(([g, t, x]) => ({
    key: `${g} + ${t} + ${x}`,
    profile: { goals: [g], currentChallenges: [t], lifeContexts: [x], addressMode: 'neutral', deliveryStyle: 'mixed' },
  }));
}

// ═════════════════════════════════════════════════════════════════════════
// 3. MEASUREMENT — ≥3,000 real-selector selections per profile (6 × 500).
//
// Two windows matter:
//  - EARLY (first 60 picks): what a person actually reads in the first days
//    — this is where personalization is or is not FELT. Over long no-repeat
//    sequences every eligible message eventually appears, so long-window
//    shares converge to corpus-count ceilings regardless of ranking.
//  - FULL (500 picks): long-run composition, ceilings and diversity.
// ═════════════════════════════════════════════════════════════════════════
const SEQ = 500;
const EARLY = 60;
const SEEDS = [11, 22, 33, 44, 55, 66];

function measure(entry) {
  const { profile } = entry;
  const [g] = profile.goals;
  const [t] = profile.currentChallenges;
  const [x] = profile.lifeContexts;
  const seqs = SEEDS.map((s) =>
    orderFeed(ITEMS, profile, { period: 'day', recentIds: [], personalizedCount: SEQ, rng: mulberry32(s) }).slice(0, SEQ));
  const all = seqs.flat();
  const early = seqs.flatMap((seq) => seq.slice(0, EARLY));
  const share = (set, fn) => set.filter(fn).length / set.length;
  const isGc = (a) => a.category === g && hasTag(a, t);
  // Mean rank of goal+challenge intersection content (lower = felt sooner).
  const gcRanks = seqs.flatMap((seq) => seq.map((a, i) => (isGc(a) ? i : -1)).filter((i) => i >= 0));
  const catCount = {};
  for (const a of all) catCount[a.category] = (catCount[a.category] || 0) + 1;
  const topCats = Object.entries(catCount).sort((a, b) => b[1] - a[1]).slice(0, 4)
    .map(([c, n]) => `${c} ${pct(n / all.length)}`);
  return {
    goal: share(early, (a) => a.category === g),
    chal: share(early, (a) => hasTag(a, t)),
    ctx: share(early, (a) => hasCtx(a, x)),
    gc: share(early, isGc),
    gx: share(early, (a) => a.category === g && hasCtx(a, x)),
    cx: share(early, (a) => hasTag(a, t) && hasCtx(a, x)),
    triple: share(early, (a) => a.category === g && hasTag(a, t) && hasCtx(a, x)),
    discovery: share(early, (a) => a.category !== g && !hasTag(a, t) && !hasCtx(a, x)),
    gcMeanRank: gcRanks.length ? gcRanks.reduce((s, r) => s + r, 0) / gcRanks.length : SEQ,
    goalFull: share(all, (a) => a.category === g),
    gcFull: share(all, isGc),
    maxCat: Math.max(...Object.values(catCount)) / all.length,
    maxCatEarly: Math.max(...Object.entries(early.reduce((m, a) => ((m[a.category] = (m[a.category] || 0) + 1), m), {})).map(([, n]) => n)) / early.length,
    uniqueCats50: new Set(seqs[0].slice(0, 50).map((a) => a.category)).size,
    targeted: share(all, (a) => a.id.startsWith('targeted_v2_')),
    topCats,
  };
}

function topMessages(entry) {
  const freq = {};
  for (let s = 100; s < 125; s++) {
    const feed = orderFeed(ITEMS, entry.profile, { period: 'day', recentIds: [], personalizedCount: 20, rng: mulberry32(s) }).slice(0, 20);
    for (const a of feed) freq[a.id] = (freq[a.id] || 0) + 1;
  }
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([id, n]) => `${id}(${n}/25)`);
}

function aggregate(results) {
  const avg = (k) => results.reduce((s, r) => s + r[k], 0) / results.length;
  return {
    goal: avg('goal'), chal: avg('chal'), ctx: avg('ctx'),
    gc: avg('gc'), gx: avg('gx'), cx: avg('cx'), triple: avg('triple'),
    discovery: avg('discovery'), gcMeanRank: avg('gcMeanRank'),
    goalFull: avg('goalFull'), gcFull: avg('gcFull'), maxCat: avg('maxCat'),
    maxCatEarlyWorst: Math.max(...results.map((r) => r.maxCatEarly)),
    goalWorst: Math.min(...results.map((r) => r.goal)),
    uniqueCats50: avg('uniqueCats50'), targeted: avg('targeted'),
  };
}

function fmtAgg(a) {
  return `EARLY60: goal ${pct(a.goal)} (worst ${pct(a.goalWorst)})  chal ${pct(a.chal)}  ctx ${pct(a.ctx)}  g+c ${pct(a.gc)}  g+x ${pct(a.gx)}  c+x ${pct(a.cx)}  triple ${pct(a.triple)}  disc ${pct(a.discovery)}\n  FULL500: goal ${pct(a.goalFull)}  g+c ${pct(a.gcFull)}  gcMeanRank ${a.gcMeanRank.toFixed(0)}  maxCat avg ${pct(a.maxCat)} earlyWorst ${pct(a.maxCatEarlyWorst)}  cats/50 ${a.uniqueCats50.toFixed(1)}`;
}

// ═════════════════════════════════════════════════════════════════════════
// 4. RUN
// ═════════════════════════════════════════════════════════════════════════
const flags = new Set(process.argv.slice(2));
coverage();

const matrix = buildMatrix();
console.log(`\n════ 2. PROFILE MATRIX (${matrix.length} profiles, ${SEQ}×${SEEDS.length} selections each) ════`);

const NO_SYNERGY = { goalChallenge: 0, goalContext: 0, challengeContext: 0, allThree: 0 };
const SYN_SMALL = { goalChallenge: 3, goalContext: 1, challengeContext: 1, allThree: 2 };
const SYN_SUGGESTED = { goalChallenge: 4, goalContext: 2, challengeContext: 2, allThree: 2 };
const SYN_LARGE = { goalChallenge: 6, goalContext: 3, challengeContext: 3, allThree: 3 };

const CONFIGS = [
  ['S0 BEFORE: goal7, no synergy', { goal: 7 }, NO_SYNERGY],
  ['S1 goal7 + synergy 4/2/2/2', { goal: 7 }, SYN_SUGGESTED],
  ['S2 goal8, no synergy', { goal: 8 }, NO_SYNERGY],
  ['S3 goal8 + synergy 3/1/1/2', { goal: 8 }, SYN_SMALL],
  ['S4 goal8 + synergy 4/2/2/2', { goal: 8 }, SYN_SUGGESTED],
  ['S5 goal9 + synergy 4/2/2/2', { goal: 9 }, SYN_SUGGESTED],
  ['S6 goal8 + synergy 6/3/3/3', { goal: 8 }, SYN_LARGE],
];

const shippedSynergy = { ...SYNERGY_WEIGHTS };
const shippedSignals = { ...SIGNAL_WEIGHTS };
const byConfig = new Map();

if (flags.has('--sweep')) {
  console.log('\n════ 3. GLOBAL CONFIG SWEEP (aggregates across the whole matrix) ════');
  for (const [name, sig, syn] of CONFIGS) {
    Object.assign(SIGNAL_WEIGHTS, shippedSignals, sig);
    Object.assign(SYNERGY_WEIGHTS, syn);
    const results = matrix.map(measure);
    byConfig.set(name, { results, agg: aggregate(results) });
    console.log(`\n${name}\n  ${fmtAgg(byConfig.get(name).agg)}`);
  }

  console.log('\n════ 4. BEFORE (S0) vs SHIPPED per profile ════');
  Object.assign(SIGNAL_WEIGHTS, shippedSignals);
  Object.assign(SYNERGY_WEIGHTS, shippedSynergy);
  const before = byConfig.get('S0 BEFORE: goal7, no synergy').results;
  const after = matrix.map(measure);
  console.log(`shipped = goal ${shippedSignals.goal}, synergy ${JSON.stringify(shippedSynergy)}`);
  matrix.forEach((entry, i) => {
    const b = before[i], a = after[i];
    console.log(`  ${entry.key.padEnd(58)} goal ${pct(b.goal)}→${pct(a.goal)}  g+c ${pct(b.gc)}→${pct(a.gc)}  triple ${pct(b.triple)}→${pct(a.triple)}  disc ${pct(b.discovery)}→${pct(a.discovery)}  rank ${b.gcMeanRank.toFixed(0)}→${a.gcMeanRank.toFixed(0)}  maxCat ${pct(b.maxCatEarly)}→${pct(a.maxCatEarly)}`);
  });
  console.log(`\nAGGREGATE before: ${fmtAgg(aggregate(before))}`);
  console.log(`AGGREGATE after:  ${fmtAgg(aggregate(after))}`);
} else {
  Object.assign(SIGNAL_WEIGHTS, shippedSignals);
  Object.assign(SYNERGY_WEIGHTS, shippedSynergy);
  const results = matrix.map(measure);
  matrix.forEach((entry, i) => {
    const r = results[i];
    console.log(`\n${entry.key}`);
    console.log(`  goal ${pct(r.goal)}  chal ${pct(r.chal)}  ctx ${pct(r.ctx)}  g+c ${pct(r.gc)}  g+x ${pct(r.gx)}  c+x ${pct(r.cx)}  triple ${pct(r.triple)}`);
    console.log(`  discovery ${pct(r.discovery)}  maxCat ${pct(r.maxCat)}  cats-in-50 ${r.uniqueCats50}  targeted ${pct(r.targeted)}`);
    console.log(`  top categories: ${r.topCats.join(', ')}`);
    if (flags.has('--top')) console.log(`  top messages: ${topMessages(entry).join(' ')}`);
  });
  console.log(`\nAGGREGATE: ${fmtAgg(aggregate(results))}`);
}
