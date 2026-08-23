/**
 * Widget verification harness (run via `npm run verify:widget`).
 *
 * Exercises the REAL production code on both sides of the widget contract:
 *  1. the compiled TypeScript queue generator/orchestrator (.test-build),
 *  2. the SHIPPED native Java (SebiWidgetLogic/Provider/StorageModule),
 *     compiled with javac against recording stubs and fed a queue that the
 *     compiled TS engine actually generated — an end-to-end contract test.
 *  3. static checks over layouts, provider XML, config plugin, entry point
 *     and (when android/ exists after prebuild) the generated project.
 *
 * Gradle and a device/emulator are unavailable in this environment; the
 * javac compile of all shipped Java is the strongest available substitute.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const Module = require('module');

// Run via `npm run verify:widget`, so the working directory is the repo root.
const ROOT = path.resolve('.');
const BUILD = path.join(ROOT, '.test-build');
const NATIVE = path.join(ROOT, 'native', 'android', 'sebi-widget');

let failures = 0;
function check(name, ok, detail) {
  const status = ok ? 'PASS' : 'FAIL';
  if (!ok) failures++;
  console.log(`${status}  ${name}${!ok && detail ? ` :: ${detail}` : ''}`);
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Module aliasing: '@/x' -> .test-build/x, AsyncStorage -> in-memory stub.
// ---------------------------------------------------------------------------
const storageLog = { writes: [], failMode: false };
const memoryStore = new Map();
const asyncStorageStub = {
  async getItem(key) {
    if (storageLog.failMode) throw new Error('storage down');
    return memoryStore.has(key) ? memoryStore.get(key) : null;
  },
  async setItem(key, value) {
    if (storageLog.failMode) throw new Error('storage down');
    storageLog.writes.push(key);
    memoryStore.set(key, value);
  },
};

const origLoad = Module._load;
Module._load = function (request, ...args) {
  if (request === '@react-native-async-storage/async-storage') return asyncStorageStub;
  if (request.startsWith('@/')) {
    return origLoad.call(this, path.join(BUILD, request.slice(2)), ...args);
  }
  return origLoad.call(this, request, ...args);
};

const { AFFIRMATIONS, CONTENT_SCHEMA_VERSION } = require(path.join(BUILD, 'content/affirmations.js'));
const { periodForHour } = require(path.join(BUILD, 'services/personalization.js'));
const { lengthTier, SMALL_SAFE_CHARS } = require(path.join(BUILD, 'widgets/widget-select.js'));
const {
  generateWidgetQueue,
  isoDate,
  WIDGET_QUEUE_MIN_SLOTS,
  WIDGET_HISTORY_SIZE,
} = require(path.join(BUILD, 'widgets/widget-queue.js'));
const { buildWidgetQueuePayload } = require(path.join(BUILD, 'widgets/widget-content.js'));

const byId = new Map(AFFIRMATIONS.map((a) => [a.id, a]));
const NEUTRAL = { goals: [], currentChallenges: [], lifeContexts: [], addressMode: 'neutral', deliveryStyle: 'mixed' };
const VALID_PERIODS = new Set(['morning', 'day', 'evening', 'night']);
const VALID_LABELS = new Set(['ZA DANAS', 'DOBRO JUTRO', 'PRED SPAVANJE']);
const SLOT_KEYS = ['id', 'text', 'label', 'period', 'date', 'tier'];

console.log('WIDGET QUEUE GENERATION (real selector, compiled TS)');

// ---------------------------------------------------------------------------
// 1. Native fallbacks are verbatim Free corpus messages.
// ---------------------------------------------------------------------------
const logicSource = fs.readFileSync(path.join(NATIVE, 'java', 'SebiWidgetLogic.java'), 'utf8');
const fallbackBlock = logicSource.match(/FALLBACK_TEXTS\s*=\s*\{([\s\S]*?)\};/);
const fallbackTexts = fallbackBlock
  ? [...fallbackBlock[1].matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1].replace(/\\(.)/g, '$1'))
  : [];
check('native fallbacks: 5–10 bundled', fallbackTexts.length >= 5 && fallbackTexts.length <= 10, `${fallbackTexts.length}`);
for (const text of fallbackTexts) {
  const item = AFFIRMATIONS.find((a) => a.text === text);
  check(`native fallback is verbatim Free corpus text: "${text.slice(0, 30)}…"`, !!item && !item.premium, item ? item.id : 'NOT IN CORPUS');
}

// ---------------------------------------------------------------------------
// 2. Queue generation: entitlement, fit, no repeats, coverage, schema.
// ---------------------------------------------------------------------------
const NOW = new Date();
const freeGen = generateWidgetQueue(AFFIRMATIONS, NEUTRAL, false, [], NOW, mulberry32(41));
const slots = freeGen.slots;
check(`free queue has >= ${WIDGET_QUEUE_MIN_SLOTS} slots`, slots.length >= WIDGET_QUEUE_MIN_SLOTS, `${slots.length}`);
check('every slot is a real corpus message with verbatim text', slots.every((s) => byId.get(s.id) && byId.get(s.id).text === s.text));
check('free queue contains only Free (entitled) messages', slots.every((s) => !byId.get(s.id).premium));
check('every slot fits the small widget', slots.every((s) => s.text.length <= SMALL_SAFE_CHARS));
check('every slot has a valid period and padded ISO date', slots.every((s) => VALID_PERIODS.has(s.period) && /^\d{4}-\d{2}-\d{2}$/.test(s.date)));
check('every slot label is Serbian display text', slots.every((s) => VALID_LABELS.has(s.label)));
check('every slot tier matches lengthTier(charCount)', slots.every((s) => s.tier === lengthTier(byId.get(s.id).charCount)));
check('first slot covers the current date and period', slots[0].date === isoDate(NOW) && slots[0].period === periodForHour(NOW.getHours()));
const uniqueDates = new Set(slots.map((s) => s.date));
check('queue spans 8 consecutive days', uniqueDates.size === 8);
const ids = slots.map((s) => s.id);
const repeats = ids.some((id, i) => ids.slice(Math.max(0, i - WIDGET_HISTORY_SIZE), i).includes(id));
check(`no repeats within a ${WIDGET_HISTORY_SIZE}-slot window`, !repeats);
check('returned recent history capped at window size', freeGen.recentIds.length <= WIDGET_HISTORY_SIZE);
check('slot schema is exactly {id,text,label,period,date,tier}', slots.every((s) => {
  const keys = Object.keys(s).sort();
  return keys.length === 6 && SLOT_KEYS.slice().sort().every((k, i) => keys[i] === k);
}));
const payloadString = JSON.stringify(slots);
check('payload carries no personalization inputs', !/goals|currentChallenges|lifeContexts|addressMode|deliveryStyle|ageGroup|"age"/.test(payloadString));

const premiumGen = generateWidgetQueue(AFFIRMATIONS, NEUTRAL, true, [], NOW, mulberry32(42));
check('premium queue may include premium messages', premiumGen.slots.some((s) => byId.get(s.id).premium));
check('premium queue also honors the no-repeat window', (() => {
  const pids = premiumGen.slots.map((s) => s.id);
  return !pids.some((id, i) => pids.slice(Math.max(0, i - WIDGET_HISTORY_SIZE), i).includes(id));
})());

// ---------------------------------------------------------------------------
// 3. Orchestrator: staleness, forced regen, preservation, downgrade, errors.
// ---------------------------------------------------------------------------
console.log('\nWIDGET QUEUE ORCHESTRATOR (widget-content, stubbed AsyncStorage)');
(async () => {
  // Substantially different profiles (same as the personalization verifier).
  const PROFILE_A = { ageRange: '18_24', goals: ['motivation', 'confidence'], currentChallenges: ['focus_attention', 'self_criticism'], lifeContexts: ['student_early_career'], addressMode: 'neutral', deliveryStyle: 'direct' };
  const PROFILE_B = { ageRange: '35_44', goals: ['calm', 'work_success', 'self_love'], currentChallenges: ['stress_overload', 'worry_overthinking'], lifeContexts: ['family_children', 'career_business'], addressMode: 'neutral', deliveryStyle: 'grounded' };
  const setProfile = (profile) => memoryStore.set('danas.preferences.v1', JSON.stringify({ version: 2, profile }));
  const parse = (payload) => (payload ? JSON.parse(payload) : []);
  const currentMirrorId = () => JSON.parse(memoryStore.get('danas.widget-queue.v1')).slots[0].id;

  // A: first generation under Profile A -> current slot X.
  memoryStore.clear();
  storageLog.writes.length = 0;
  setProfile(PROFILE_A);
  const firstSlots = parse(await buildWidgetQueuePayload());
  check('A: empty storage -> payload generated', firstSlots.length >= WIDGET_QUEUE_MIN_SLOTS, `${firstSlots.length}`);
  const widgetKeys = new Set(['danas.widget-queue.v1', 'danas.widget-recent-ids.v1']);
  check('only widget-scoped storage keys written', storageLog.writes.every((k) => widgetKeys.has(k)), storageLog.writes.join(','));
  const X = firstSlots[0];

  // C: app open without personalization changes -> nothing moves.
  check('C: app open with fresh queue skips regeneration', (await buildWidgetQueuePayload()) === null);
  check('C: current slot remains unchanged after app open', currentMirrorId() === X.id);

  // B: explicit personalization change -> new current-period selection.
  setProfile(PROFILE_B);
  const bSlots = parse(await buildWidgetQueuePayload('personalization'));
  check('B: personalization change always regenerates', bSlots.length >= WIDGET_QUEUE_MIN_SLOTS);
  check('B: current slot re-picked for the SAME date/period', bSlots[0].date === X.date && bSlots[0].period === X.period);
  check('B: current message differs from X (eligible alternatives exist)', bSlots[0].id !== X.id, `${bSlots[0].id} vs ${X.id}`);
  // v2-shape storage: widget topics fall back to goals, so B's premium goal
  // categories (work_success, self_love) are legitimately eligible previews.
  const entitledForB = (id) => !byId.get(id).premium || PROFILE_B.goals.includes(byId.get(id).category);
  check('B: new current message is a valid entitled pick', !!byId.get(bSlots[0].id) && entitledForB(bSlots[0].id));
  const aIds = new Set(firstSlots.map((s) => s.id));
  const sharedWithA = bSlots.filter((s) => aIds.has(s.id)).length / bSlots.length;
  check('B: queue reflects the new profile (low overlap with A)', sharedWithA < 0.5, `${(sharedWithA * 100).toFixed(0)}% shared`);

  // D: maintenance regeneration (stale queue, same profile) -> preserved.
  const mirrorD = JSON.parse(memoryStore.get('danas.widget-queue.v1'));
  mirrorD.generatedAt = Date.now() - 4 * 24 * 60 * 60 * 1000;
  memoryStore.set('danas.widget-queue.v1', JSON.stringify(mirrorD));
  const dSlots = parse(await buildWidgetQueuePayload());
  check('D: stale-queue maintenance regenerates', dSlots.length >= WIDGET_QUEUE_MIN_SLOTS);
  check('D: maintenance preserves the current on-screen slot', dSlots[0].id === bSlots[0].id, `${dSlots[0]?.id} vs ${bSlots[0].id}`);

  // Entitlement change: rebuild, but the entitled current slot survives.
  memoryStore.set('danas.premium-cache.v1', JSON.stringify(true));
  const entSlots = parse(await buildWidgetQueuePayload('entitlement'));
  check('entitlement change regenerates', entSlots.length >= WIDGET_QUEUE_MIN_SLOTS);
  check('entitlement change preserves the entitled current slot', entSlots[0].id === dSlots[0].id);

  // Premium downgrade: a premium current slot from an UNSELECTED category
  // (not a goal/topic) must be re-picked as entitled content.
  const premiumItem = AFFIRMATIONS.find(
    (a) => a.premium && a.charCount <= SMALL_SAFE_CHARS && !PROFILE_B.goals.includes(a.category),
  );
  const mirror = JSON.parse(memoryStore.get('danas.widget-queue.v1'));
  mirror.isPremium = true;
  mirror.slots[0] = { ...mirror.slots[0], id: premiumItem.id, text: premiumItem.text, tier: lengthTier(premiumItem.charCount) };
  memoryStore.set('danas.widget-queue.v1', JSON.stringify(mirror));
  memoryStore.set('danas.premium-cache.v1', JSON.stringify(false));
  const downgradedSlots = parse(await buildWidgetQueuePayload());
  check('premium downgrade triggers regeneration', downgradedSlots.length >= WIDGET_QUEUE_MIN_SLOTS);
  check('downgrade re-picks the current slot as entitled content', downgradedSlots.length > 0 && downgradedSlots[0].id !== premiumItem.id && entitledForB(downgradedSlots[0].id), downgradedSlots[0]?.id);

  // Content-version change forces regeneration.
  const mirror2 = JSON.parse(memoryStore.get('danas.widget-queue.v1'));
  mirror2.contentVersion = CONTENT_SCHEMA_VERSION - 1;
  memoryStore.set('danas.widget-queue.v1', JSON.stringify(mirror2));
  const migrated = await buildWidgetQueuePayload();
  check('content-version change triggers regeneration', migrated !== null);

  // Storage failure: still produces a queue (never leaves the widget dry).
  storageLog.failMode = true;
  const resilient = await buildWidgetQueuePayload();
  storageLog.failMode = false;
  check('storage failure still yields a valid payload', resilient !== null && JSON.parse(resilient).length >= WIDGET_QUEUE_MIN_SLOTS);

  // Reason plumbing: the right call sites request the right reasons.
  const prefsCtx = fs.readFileSync(path.join(ROOT, 'src/state/PreferencesContext.tsx'), 'utf8');
  check("profile edits request a 'personalization' refresh", prefsCtx.includes("refreshSebiWidget(affectsContent ? 'personalization' : 'maintenance')") && prefsCtx.includes("refreshSebiWidget('personalization')"));
  check('addressMode-only edits never churn the current message', prefsCtx.includes("key !== 'addressMode'"));
  const subsCtx = fs.readFileSync(path.join(ROOT, 'src/state/SubscriptionContext.tsx'), 'utf8');
  check("premium changes request an 'entitlement' refresh", subsCtx.includes("refreshSebiWidget('entitlement')"));
  const refreshSrc = fs.readFileSync(path.join(ROOT, 'src/widgets/widget-refresh.ts'), 'utf8');
  check('refresh delivers the queue to native (setQueue -> immediate re-render)', refreshSrc.includes('storage.setQueue(payload)'));
  const layoutSrc = fs.readFileSync(path.join(ROOT, 'src/app/_layout.tsx'), 'utf8');
  check('app open uses the default maintenance reason', layoutSrc.includes('refreshSebiWidget()'));

  // ── Preferences v3 migration, topic surfaces, notification opt-in ──────
  console.log('\nPREFERENCES v3 MIGRATION + TOPIC SURFACES');
  const { migratePreferences } = require(path.join(BUILD, 'services/preferences-migrate.js'));
  const { effectiveTopics } = require(path.join(BUILD, 'services/topics.js'));
  const { shouldShowNotificationOptIn } = require(path.join(BUILD, 'services/notification-optin.js'));

  const v2Stored = {
    version: 2,
    onboardingCompleted: true,
    themeId: 'terracotta',
    notifications: { enabled: false, times: ['09:00'] },
    profile: { goals: ['work_success', 'calm'], currentChallenges: ['self_criticism'], lifeContexts: ['career_business'], addressMode: 'neutral', deliveryStyle: 'mixed' },
  };
  const m2 = migratePreferences(v2Stored);
  check('migration: v2 -> v3', m2.migrated === true && m2.prefs.version === 3);
  check('migration: feed topics derived from goals, not customized',
    JSON.stringify(m2.prefs.topics.feed.categoryIds) === JSON.stringify(['work_success', 'calm']) && m2.prefs.topics.feed.customized === false);
  check('migration: widget + notifications start in follow_feed',
    m2.prefs.topics.widget.mode === 'follow_feed' && m2.prefs.topics.notifications.mode === 'follow_feed');
  check('migration: profile/theme/notifications preserved',
    m2.prefs.profile.goals.length === 2 && m2.prefs.themeId === 'terracotta' && m2.prefs.notifications.times[0] === '09:00');
  check('migration: opt-in prompt still pending (reminders off)', m2.prefs.notificationOptInPromptSeen === false);
  const m2on = migratePreferences({ ...v2Stored, notifications: { enabled: true, times: ['09:00'] } });
  check('migration: reminders already on -> opt-in never shown',
    m2on.prefs.notificationOptInPromptSeen === true && shouldShowNotificationOptIn(m2on.prefs) === false);
  const m1 = migratePreferences({ onboardingCompleted: true, goals: ['work', 'calm'], themeId: 'x' });
  check('migration: v1 legacy renames goals and derives topics',
    m1.prefs.version === 3 && m1.prefs.topics.feed.categoryIds.includes('work_success') && m1.prefs.topics.feed.categoryIds.includes('calm'));
  const m3 = migratePreferences({ ...m2.prefs, topics: { ...m2.prefs.topics, feed: { categoryIds: ['work_success', 'nope', 'work_success'], customized: true } } });
  check('migration: v3 passthrough sanitizes ids, keeps customized flag',
    m3.migrated === false && JSON.stringify(m3.prefs.topics.feed.categoryIds) === JSON.stringify(['work_success']) && m3.prefs.topics.feed.customized === true);

  check('opt-in gate: exactly the post-first-message conditions',
    shouldShowNotificationOptIn(m2.prefs) === true &&
    shouldShowNotificationOptIn({ ...m2.prefs, notificationOptInPromptSeen: true }) === false &&
    shouldShowNotificationOptIn({ ...m2.prefs, onboardingCompleted: false }) === false &&
    shouldShowNotificationOptIn({ ...m2.prefs, notifications: { enabled: true, times: [] } }) === false);

  // Surface inheritance + Premium custom + downgrade preservation.
  const topicState = {
    feed: { categoryIds: ['calm', 'confidence'], customized: true },
    widget: { mode: 'custom', categoryIds: ['gratitude'] },
    notifications: { mode: 'follow_feed', categoryIds: [] },
  };
  check('widget custom (Premium) uses its own topics',
    JSON.stringify(effectiveTopics('widget', topicState, true)) === JSON.stringify(['gratitude']));
  check('widget custom while Free -> follows feed, custom picks preserved',
    JSON.stringify(effectiveTopics('widget', topicState, false)) === JSON.stringify(['calm', 'confidence']) &&
    topicState.widget.categoryIds[0] === 'gratitude');
  check('notifications follow_feed inherits feed topics',
    JSON.stringify(effectiveTopics('notification', topicState, true)) === JSON.stringify(['calm', 'confidence']));

  // Widget queue honors the Free premium-topic preview end to end.
  memoryStore.clear();
  memoryStore.set('danas.preferences.v1', JSON.stringify({
    version: 3,
    onboardingCompleted: true,
    themeId: 't',
    notifications: { enabled: false, times: [] },
    notificationOptInPromptSeen: true,
    profile: { goals: ['work_success'], currentChallenges: ['self_criticism'], lifeContexts: ['career_business'], addressMode: 'neutral', deliveryStyle: 'mixed' },
    topics: {
      feed: { categoryIds: ['work_success'], customized: false },
      widget: { mode: 'follow_feed', categoryIds: [] },
      notifications: { mode: 'follow_feed', categoryIds: [] },
    },
  }));
  memoryStore.set('danas.premium-cache.v1', JSON.stringify(false));
  const previewSlots = parse(await buildWidgetQueuePayload());
  check('widget queue (Free, work topic) includes work_success preview',
    previewSlots.some((s) => byId.get(s.id).category === 'work_success'));
  check('widget queue premium content limited to the selected topics',
    previewSlots.every((s) => !byId.get(s.id).premium || byId.get(s.id).category === 'work_success'));

  runStaticChecks();
  runNativeTests();

  console.log(`\nWIDGET: ${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECKS FAILED'}`);
  process.exitCode = failures === 0 ? 0 : 1;
})();

// ---------------------------------------------------------------------------
// 4. Static checks: layouts, provider XML, plugin, entry, prebuild output.
// ---------------------------------------------------------------------------
function runStaticChecks() {
  console.log('\nNATIVE STATIC CHECKS');
  const small = fs.readFileSync(path.join(NATIVE, 'res/layout/sebi_widget_small.xml'), 'utf8');
  const medium = fs.readFileSync(path.join(NATIVE, 'res/layout/sebi_widget_medium.xml'), 'utf8');
  for (const [name, rawXml] of [['small', small], ['medium', medium]]) {
    const xml = rawXml.replace(/<!--[\s\S]*?-->/g, '');
    const tags = [...xml.matchAll(/<\/?([A-Za-z.]+)[\s>]/g)].map((m) => m[1]);
    check(`${name} layout uses RemoteViews-safe views only`, tags.every((t) => ['LinearLayout', 'FrameLayout', 'TextView'].includes(t)), [...new Set(tags)].join(','));
    check(`${name} layout never ellipsizes or clamps lines`, !xml.includes('ellipsize') && !xml.includes('maxLines'));
    check(`${name} layout has label/quote/brand ids`, ['sebi_widget_root', 'sebi_widget_label', 'sebi_widget_quote', 'sebi_widget_brand'].every((id) => xml.includes(id)));
  }
  const initialQuote = small.match(/sebi_widget_quote[\s\S]*?android:text="([^"]+)"/);
  const initialItem = initialQuote && AFFIRMATIONS.find((a) => a.text === initialQuote[1]);
  check('initial layout bakes in a real Free fallback quote', !!initialItem && !initialItem.premium, initialQuote ? initialQuote[1] : 'missing');
  check('initial layout bakes in ZA DANAS + Sebi', small.includes('ZA DANAS') && small.includes('>') && small.includes('"Sebi"'));

  const info = fs.readFileSync(path.join(NATIVE, 'res/xml/sebi_widget_info.xml'), 'utf8');
  check('provider info: functional initial layout', info.includes('android:initialLayout="@layout/sebi_widget_small"'));
  check('provider info: home_screen category + resize + 4x2 target', info.includes('widgetCategory="home_screen"') && info.includes('resizeMode="horizontal"') && info.includes('targetCellWidth="4"') && info.includes('targetCellHeight="2"'));
  check('provider info: native schedule (30-min OS minimum)', info.includes('updatePeriodMillis="1800000"'));
  check('provider info: preview + description wired', info.includes('previewImage="@drawable/sebi_widget_preview"') && info.includes('description="@string/sebi_widget_description"'));

  const provider = fs.readFileSync(path.join(NATIVE, 'java', 'SebiWidgetProvider.java'), 'utf8');
  check('surfaces map per design 1f (native)', /morning[\s\S]{0,80}sebi_widget_bg_morning/.test(provider) && /"day"[\s\S]{0,80}sebi_widget_bg_linen/.test(provider) && /evening[\s\S]{0,80}sebi_widget_bg_paper/.test(provider) && provider.includes('sebi_widget_bg_night'));
  const javaSources = fs.readdirSync(path.join(NATIVE, 'java'))
    .map((f) => fs.readFileSync(path.join(NATIVE, 'java', f), 'utf8'))
    .join('\n')
    .replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, ''); // code only — comments may explain what is avoided
  check('native code never touches app storage (danas.* / AsyncStorage)', !javaSources.includes('danas.') && !javaSources.includes('AsyncStorage'));
  check('native code never decides entitlement', !/premium/i.test(javaSources));

  const plugin = fs.readFileSync(path.join(ROOT, 'plugins/withSebiWidget.js'), 'utf8');
  check('plugin declares exported receiver + APPWIDGET_UPDATE + provider meta', plugin.includes(".widget.SebiWidgetProvider") && plugin.includes("'android:exported': 'true'") && plugin.includes('APPWIDGET_UPDATE') && plugin.includes('@xml/sebi_widget_info'));
  check('plugin fails loudly if package anchor missing', plugin.includes('throw new Error') && plugin.includes('SebiWidgetPackage()'));

  const entry = fs.readFileSync(path.join(ROOT, 'index.ts'), 'utf8');
  check('entry is plain expo-router (no JS widget registration)', entry.includes("import 'expo-router/entry'") && !entry.includes('registerWidgetTaskHandler'));
  const pkg = fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8');
  check('react-native-android-widget and patch-package fully removed', !pkg.includes('react-native-android-widget') && !pkg.includes('patch-package') && !pkg.includes('postinstall'));

  // Prebuild output (present only after `expo prebuild`): final integration.
  const androidDir = path.join(ROOT, 'android');
  if (fs.existsSync(androidDir)) {
    const manifest = fs.readFileSync(path.join(androidDir, 'app/src/main/AndroidManifest.xml'), 'utf8');
    check('prebuilt manifest: Sebi receiver exported with provider meta', manifest.includes('.widget.SebiWidgetProvider') && /SebiWidgetProvider"[^>]*android:exported="true"/.test(manifest.replace(/\n/g, ' ')) && manifest.includes('@xml/sebi_widget_info'));
    check('prebuilt manifest: zero library leftovers', !manifest.includes('reactnativeandroidwidget') && !manifest.includes('.widget.Sebi"'));
    const mainApp = fs.readFileSync(path.join(androidDir, 'app/src/main/java/com/sebi/app/MainApplication.kt'), 'utf8');
    check('prebuilt MainApplication registers SebiWidgetPackage', mainApp.includes('add(com.sebi.app.widget.SebiWidgetPackage())'));
    const expected = [
      'app/src/main/java/com/sebi/app/widget/SebiWidgetProvider.java',
      'app/src/main/java/com/sebi/app/widget/SebiWidgetLogic.java',
      'app/src/main/java/com/sebi/app/widget/SebiWidgetStorageModule.java',
      'app/src/main/java/com/sebi/app/widget/SebiWidgetPackage.java',
      'app/src/main/res/layout/sebi_widget_small.xml',
      'app/src/main/res/layout/sebi_widget_medium.xml',
      'app/src/main/res/xml/sebi_widget_info.xml',
      'app/src/main/res/drawable-nodpi/sebi_widget_preview.png',
      'app/src/main/res/values/sebi_widget_strings.xml',
    ];
    check('prebuilt project contains all widget sources/resources', expected.every((f) => fs.existsSync(path.join(androidDir, f))));
  } else {
    console.log('INFO  android/ not present — prebuild checks skipped (run `npx expo prebuild -p android`)');
  }
}

// ---------------------------------------------------------------------------
// 5. Compile the SHIPPED Java with javac and run behavior tests against it.
// ---------------------------------------------------------------------------
function runNativeTests() {
  console.log('\nNATIVE BEHAVIOR TESTS (javac + JVM over shipped Java)');
  const outDir = path.join(BUILD, 'native-classes');
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  const stubDir = path.join(ROOT, 'scripts/native-test/stubs');
  const collect = (dir) => fs.readdirSync(dir, { recursive: true })
    .filter((f) => String(f).endsWith('.java'))
    .map((f) => path.join(dir, String(f)));
  const sources = [
    ...collect(stubDir),
    ...collect(path.join(NATIVE, 'java')),
    path.join(ROOT, 'scripts/native-test/SebiWidgetNativeTest.java'),
  ];

  try {
    execFileSync('javac', ['-encoding', 'UTF-8', '-d', outDir, ...sources], { stdio: 'pipe' });
    check('javac compiles ALL shipped native Java (logic/provider/module/package)', true);
  } catch (error) {
    check('javac compiles ALL shipped native Java (logic/provider/module/package)', false, String(error.stderr || error));
    return;
  }

  // Contract input: a REAL queue from the compiled TS engine + parity data.
  const expectations = slots.filter((_, i) => i % 5 === 0).slice(0, 6)
    .map((s) => ({ date: s.date, period: s.period, expectedId: s.id }));
  const input = {
    queueJson: JSON.stringify(slots),
    expectations,
    firstQueueId: slots[0].id,
    lastQueueId: slots[slots.length - 1].id,
    periodByHour: Array.from({ length: 24 }, (_, h) => ({ period: periodForHour(h) })),
    tierSamples: [1, 10, 45, 46, 62, 63, 76, 95, 96, 140].map((len) => ({ len: String(len), tier: lengthTier(len) })),
    fallbackTexts: fallbackTexts.map((text) => ({ text })),
  };
  const inputPath = path.join(BUILD, 'native-test-input.json');
  fs.writeFileSync(inputPath, JSON.stringify(input));

  let output;
  try {
    output = execFileSync('java', ['-cp', outDir, 'SebiWidgetNativeTest', inputPath], { stdio: 'pipe' }).toString();
  } catch (error) {
    output = String((error.stdout || '') + (error.stderr || ''));
    failures++;
  }
  for (const line of output.split('\n')) {
    if (line.startsWith('PASS ')) check(`[java] ${line.slice(5)}`, true);
    else if (line.startsWith('FAIL ')) check(`[java] ${line.slice(5)}`, false);
  }
  check('native test suite exit', output.includes('NATIVE_TESTS_PASSED'));
}
