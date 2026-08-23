/* Widget task-handler verification: runs the REAL compiled handler in Node
 * with stubbed native modules and asserts every action path produces a
 * visible render — production or the dependency-free fallback, never
 * nothing. Also statically checks the entry point. */
const Module = require('module');
const path = require('path');
const fs = require('fs');

const BUILD = path.resolve('.test-build');

// ── module stubs ─────────────────────────────────────────────────────────
const memoryStore = new Map();
const asyncStorageState = { failReads: false };
const asyncStorageStub = {
  getItem: async (key) => {
    if (asyncStorageState.failReads) throw new Error('storage unavailable');
    return memoryStore.has(key) ? memoryStore.get(key) : null;
  },
  setItem: async (key, value) => {
    memoryStore.set(key, value);
  },
  removeItem: async (key) => {
    memoryStore.delete(key);
  },
};

function FlexWidget() { return null; }
function TextWidget() { return null; }
const widgetLibStub = { FlexWidget, TextWidget };

const flags = { breakContent: false };

const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === '@react-native-async-storage/async-storage') return asyncStorageStub;
  if (request === 'react-native-android-widget') return widgetLibStub;
  if (flags.breakContent && request.includes('widgets/widget-content')) {
    return { getWidgetDisplay: async () => { throw new Error('boom: simulated content failure'); } };
  }
  if (typeof request === 'string' && request.startsWith('@/')) {
    request = path.join(BUILD, request.slice(2));
  }
  return origLoad.call(this, request, parent, isMain);
};

function freshHandler() {
  for (const key of Object.keys(require.cache)) {
    if (key.startsWith(BUILD)) delete require.cache[key];
  }
  return require(path.join(BUILD, 'widgets/widget-task-handler.js')).widgetTaskHandler;
}

// ── helpers ──────────────────────────────────────────────────────────────
let failures = 0;
const check = (label, ok, detail) => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};

const info = (id, width, height) => ({
  widgetName: 'Sebi',
  widgetId: id,
  width,
  height,
  screenInfo: { density: 2.75, densityDpi: 440, screenWidthDp: 393, screenHeightDp: 852 },
});

async function invoke(handler, widgetAction, widgetInfo) {
  const rendered = [];
  await handler({ widgetAction, widgetInfo, renderWidget: (el) => rendered.push(el) });
  return rendered;
}

const corpus = require('../src/content/sebi_content_FINAL_v2_1609.json');
const corpusTexts = new Set(corpus.items.map((i) => i.text));

(async () => {
  console.log('WIDGET TASK HANDLER');

  // 1) Success path: ADDED / UPDATE / RESIZED each render exactly once.
  memoryStore.clear();
  memoryStore.set(
    'danas.preferences.v1',
    JSON.stringify({
      version: 2,
      onboardingCompleted: true,
      profile: { goals: ['motivation'], currentChallenges: ['self_criticism'], lifeContexts: [], addressMode: 'neutral', deliveryStyle: 'mixed' },
      themeId: 'linen',
      notifications: { enabled: false, times: [] },
    }),
  );
  let handler = freshHandler();
  for (const action of ['WIDGET_ADDED', 'WIDGET_UPDATE', 'WIDGET_RESIZED']) {
    const rendered = await invoke(handler, action, info(1, 320, 158));
    check(`${action} renders exactly once`, rendered.length === 1);
    const el = rendered[0];
    check(`${action} renders production SebiWidget`, el?.type?.name === 'SebiWidget', el?.type?.name);
    check(`${action} text is a real corpus message`, corpusTexts.has(el?.props?.text));
  }

  // 2) Layout selection by reported size (+ zero-size safety).
  let small = (await invoke(handler, 'WIDGET_UPDATE', info(2, 150, 150)))[0];
  let medium = (await invoke(handler, 'WIDGET_UPDATE', info(3, 320, 158)))[0];
  let zero = (await invoke(handler, 'WIDGET_UPDATE', info(4, 0, 0)))[0];
  check('width 150dp → small layout', small?.props?.layout === 'small');
  check('width 320dp → medium layout', medium?.props?.layout === 'medium');
  check('width 0 still renders (medium)', zero?.props?.layout === 'medium');

  // 3) Missing profile (pre-onboarding, empty storage) → still renders.
  memoryStore.clear();
  handler = freshHandler();
  const noProfile = (await invoke(handler, 'WIDGET_ADDED', info(5, 320, 158)))[0];
  check('empty storage renders production widget', noProfile?.type?.name === 'SebiWidget');
  check('empty-storage text is a real corpus message', corpusTexts.has(noProfile?.props?.text));

  // 4) Storage reads throwing → internal fallback still yields a render.
  asyncStorageState.failReads = true;
  handler = freshHandler();
  const broken = (await invoke(handler, 'WIDGET_UPDATE', info(6, 320, 158)))[0];
  check('storage failure still renders', broken?.type?.name === 'SebiWidget');
  check('storage-failure text is a real corpus message', corpusTexts.has(broken?.props?.text));
  asyncStorageState.failReads = false;

  // 5) Whole content service throwing → dependency-free fallback renders.
  flags.breakContent = true;
  handler = freshHandler();
  const fb = (await invoke(handler, 'WIDGET_UPDATE', info(7, 150, 150)))[0];
  check('content-service crash renders SebiWidgetFallback', fb?.type?.name === 'SebiWidgetFallback', fb?.type?.name);
  check('fallback keeps requested layout', fb?.props?.layout === 'small');
  flags.breakContent = false;

  // 6) DELETED does not render.
  handler = freshHandler();
  const deleted = await invoke(handler, 'WIDGET_DELETED', info(8, 320, 158));
  check('WIDGET_DELETED renders nothing', deleted.length === 0);

  // 7) Widget history never touches app recent history keys.
  memoryStore.clear();
  handler = freshHandler();
  await invoke(handler, 'WIDGET_ADDED', info(9, 320, 158));
  check('widget writes only widget-scoped keys', ![...memoryStore.keys()].some((k) => k === 'danas.recent-ids.v1' || k === 'danas.favorites.v1'));
  check('widget history persisted', [...memoryStore.keys()].some((k) => k === 'danas.widget-recent-ids.v1'));

  // 8) Entry point static checks.
  const entry = fs.readFileSync('index.ts', 'utf8');
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  check("package.json main is index.ts", pkg.main === 'index.ts');
  check('entry imports expo-router/entry first', entry.indexOf("import 'expo-router/entry'") >= 0 && entry.indexOf("import 'expo-router/entry'") < entry.indexOf('registerWidgetTaskHandler'));
  check('entry registers the widget task handler', entry.includes('registerWidgetTaskHandler(widgetTaskHandler)'));
  check('entry has no silent catch', !/catch\s*(\(\s*\w*\s*\))?\s*\{\s*\}/.test(entry) && entry.includes("console.error('[SEBI_WIDGET]"));

  console.log(`\nWIDGET HANDLER: ${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECKS FAILED'}`);
  process.exitCode = failures === 0 ? 0 : 1;
})();
