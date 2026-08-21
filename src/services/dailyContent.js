"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTodayPool = getTodayPool;
exports.buildFeed = buildFeed;
exports.buildCategoryFeed = buildCategoryFeed;
exports.buildTodayFeed = buildTodayFeed;
exports.pushRecent = pushRecent;
exports.randomAffirmation = randomAffirmation;
const appConfig_1 = require("@/constants/appConfig");
const affirmations_1 = require("@/content/affirmations");
const categories_1 = require("@/content/categories");
/**
 * Content selection: builds feeds that avoid the recently shown
 * affirmations and lean toward the user's onboarding goals.
 */
/** Pool for the personalized "Za danas" feed. */
function getTodayPool(goals, isPremium) {
    const accessible = affirmations_1.AFFIRMATIONS.filter((a) => isPremium || !(0, categories_1.getCategory)(a.category).premium);
    const goalSet = new Set(goals);
    const preferred = accessible.filter((a) => goalSet.has(a.category));
    const rest = accessible.filter((a) => !goalSet.has(a.category));
    // Weight goals ~2:1 by listing preferred items twice before shuffling,
    // then de-duplicating in feed order.
    return [...preferred, ...preferred, ...rest];
}
/** Deterministic-ish shuffle seeded per session; plain Fisher–Yates. */
function shuffle(items) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}
/**
 * Order a pool into a feed: recently shown items go last, duplicates are
 * removed, the rest is shuffled.
 */
function buildFeed(pool, recentIds) {
    const recent = new Set(recentIds.slice(-appConfig_1.RECENT_HISTORY_SIZE));
    const seen = new Set();
    const fresh = [];
    const stale = [];
    for (const item of shuffle(pool)) {
        if (seen.has(item.id))
            continue;
        seen.add(item.id);
        (recent.has(item.id) ? stale : fresh).push(item);
    }
    // Only push recent items to the back when there are enough alternatives.
    if (fresh.length === 0)
        return [...stale];
    return [...fresh, ...stale];
}
function buildCategoryFeed(category, recentIds) {
    return buildFeed((0, affirmations_1.getAffirmationsByCategory)(category), recentIds);
}
function buildTodayFeed(goals, isPremium, recentIds) {
    return buildFeed(getTodayPool(goals, isPremium), recentIds);
}
/** Append an id to the recent history, keeping it bounded. */
function pushRecent(recentIds, id) {
    const next = recentIds.filter((r) => r !== id);
    next.push(id);
    return next.slice(-appConfig_1.RECENT_HISTORY_SIZE);
}
/** A random accessible affirmation, e.g. for notification bodies. */
function randomAffirmation(goals, isPremium) {
    const pool = getTodayPool(goals, isPremium);
    return pool[Math.floor(Math.random() * pool.length)] ?? affirmations_1.AFFIRMATIONS[0];
}
