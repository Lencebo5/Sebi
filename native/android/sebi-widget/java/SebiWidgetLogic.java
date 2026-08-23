package com.sebi.app.widget;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Pure widget logic — no Android imports, so it is compiled and unit-tested
 * on the JVM by scripts/verify-widget.js (Gradle is not available in the
 * authoring environment). Everything the provider decides lives here:
 * period mapping, queue-slot matching, typography tiers, layout choice and
 * the built-in fallback content.
 *
 * The queue is written by the app's TypeScript personalization engine (see
 * src/widgets/widget-queue.ts) into SharedPreferences as a JSON array of
 * slots: {"id","text","label","period","date","tier"}. This class never
 * decides Free/Premium eligibility — the queue only ever contains entitled
 * messages — and it never invents or rewrites editorial text: fallbacks are
 * verbatim Free messages from the production corpus.
 */
public final class SebiWidgetLogic {

    private SebiWidgetLogic() {}

    /** Widgets narrower than this render the small (2×2) layout. */
    public static final int SMALL_MAX_WIDTH_DP = 220;

    /**
     * Built-in fallbacks: verbatim Free-category messages from
     * sebi_content_FINAL_v2_1609.json (verified by verify-widget.js).
     * Shown only when the queue is missing, empty or corrupt — the widget
     * must never be blank and never show just the brand name.
     */
    public static final String[] FALLBACK_TEXTS = {
        "Ne mora sve da bude gotovo da bi dan bio dobar.",   // motivation_008
        "Raspoloženje nije uslov da počnem.",      // motivation_001
        "Ne moram svima da budem po volji.",                  // confidence_001
        "Ono što još nije stiglo ne traži današnje rešenje.", // calm_001
        "Nije svaki osećaj hitan zadatak.",              // calm_003
        "Tuđe mišljenje nije konačna presuda o meni.", // confidence_002
    };

    public static final String FALLBACK_LABEL = "ZA DANAS";

    /** One entry of the precomputed queue. */
    public static final class Slot {
        public final String id;
        public final String text;
        public final String label;
        public final String period;
        public final String date; // YYYY-MM-DD, device-local
        public final String tier; // short | mid | long | xl

        Slot(String id, String text, String label, String period, String date, String tier) {
            this.id = id;
            this.text = text;
            this.label = label;
            this.period = period;
            this.date = date;
            this.tier = tier;
        }
    }

    /** Everything the provider needs to draw one widget update. */
    public static final class RenderSpec {
        public final String id;
        public final String text;
        public final String label;
        public final String period;
        public final float smallSp;
        public final float mediumSp;
        public final boolean usedFallback;
        public final String slotKey;

        RenderSpec(String id, String text, String label, String period,
                   float smallSp, float mediumSp, boolean usedFallback, String slotKey) {
            this.id = id;
            this.text = text;
            this.label = label;
            this.period = period;
            this.smallSp = smallSp;
            this.mediumSp = mediumSp;
            this.usedFallback = usedFallback;
            this.slotKey = slotKey;
        }
    }

    /** Mirrors periodForHour in src/services/personalization.ts exactly. */
    public static String periodForHour(int hour) {
        if (hour >= 5 && hour < 11) return "morning";
        if (hour >= 11 && hour < 17) return "day";
        if (hour >= 17 && hour < 22) return "evening";
        return "night";
    }

    static int periodRank(String period) {
        if ("morning".equals(period)) return 0;
        if ("day".equals(period)) return 1;
        if ("evening".equals(period)) return 2;
        if ("night".equals(period)) return 3;
        return -1;
    }

    /** Lexicographically comparable slot key: "YYYY-MM-DD#rank". */
    static String slotKey(String date, String period) {
        return date + "#" + periodRank(period);
    }

    /** True when the widget host reports a width needing the 2×2 layout. */
    public static boolean useSmallLayout(int minWidthDp) {
        return minWidthDp > 0 && minWidthDp < SMALL_MAX_WIDTH_DP;
    }

    /** Same length breakpoints as src/widgets/widget-queue.ts. */
    public static String tierForLength(int charCount) {
        if (charCount <= 45) return "short";
        if (charCount <= 62) return "mid";
        if (charCount <= 95) return "long";
        return "xl";
    }

    /** Deterministic small-layout type scale — never ellipsized. */
    public static float smallSp(String tier) {
        if ("short".equals(tier)) return 17f;
        if ("mid".equals(tier)) return 16f;
        if ("long".equals(tier)) return 15f;
        return 14.5f;
    }

    /** Deterministic medium-layout type scale — never ellipsized. */
    public static float mediumSp(String tier) {
        if ("short".equals(tier)) return 20f;
        if ("mid".equals(tier)) return 19f;
        if ("long".equals(tier)) return 18f;
        return 17f;
    }

    private static boolean validDate(String date) {
        if (date == null || date.length() != 10) return false;
        for (int i = 0; i < 10; i++) {
            char c = date.charAt(i);
            if (i == 4 || i == 7) {
                if (c != '-') return false;
            } else if (c < '0' || c > '9') {
                return false;
            }
        }
        return true;
    }

    /**
     * Strict, forgiving parse: any malformed document yields an empty list,
     * and individual malformed slots are skipped. Never throws.
     */
    public static List<Slot> parseQueue(String queueJson) {
        List<Slot> slots = new ArrayList<>();
        if (queueJson == null || queueJson.isEmpty()) return slots;
        try {
            JSONArray array = new JSONArray(queueJson);
            for (int i = 0; i < array.length(); i++) {
                JSONObject o = array.optJSONObject(i);
                if (o == null) continue;
                String id = o.optString("id", "");
                String text = o.optString("text", "");
                String label = o.optString("label", "");
                String period = o.optString("period", "");
                String date = o.optString("date", "");
                String tier = o.optString("tier", "");
                if (id.isEmpty() || text.trim().isEmpty() || label.isEmpty()) continue;
                if (periodRank(period) < 0 || !validDate(date)) continue;
                if (!"short".equals(tier) && !"mid".equals(tier)
                        && !"long".equals(tier) && !"xl".equals(tier)) {
                    tier = tierForLength(text.length());
                }
                slots.add(new Slot(id, text, label, period, date, tier));
            }
        } catch (Throwable ignored) {
            return new ArrayList<>();
        }
        return slots;
    }

    /**
     * Pick what the widget should show right now.
     *
     * Selection is deterministic by (local date, local period): repeated
     * update ticks inside one period re-render the same message, period
     * boundaries rotate to the next slot, and a stale queue degrades to the
     * most recent past slot instead of going blank. Only a missing/empty/
     * corrupt queue falls back to the built-in Free messages.
     */
    public static RenderSpec choose(String queueJson, String todayIsoDate, int hourOfDay, int dayOfYear) {
        String period = periodForHour(hourOfDay);
        try {
            List<Slot> slots = parseQueue(queueJson);
            String nowKey = slotKey(todayIsoDate, period);
            Slot best = null;
            String bestKey = null;
            for (Slot slot : slots) {
                String key = slotKey(slot.date, slot.period);
                if (key.compareTo(nowKey) <= 0 && (bestKey == null || key.compareTo(bestKey) > 0)) {
                    best = slot;
                    bestKey = key;
                }
            }
            if (best == null && !slots.isEmpty()) {
                // Queue lies entirely in the future (clock skew): first slot.
                best = slots.get(0);
                bestKey = slotKey(best.date, best.period);
            }
            if (best != null) {
                return new RenderSpec(best.id, best.text, best.label, period,
                        smallSp(best.tier), mediumSp(best.tier), false, bestKey);
            }
        } catch (Throwable ignored) {
            // fall through to fallback
        }
        return fallbackSpec(period, dayOfYear);
    }

    /** Deterministic built-in fallback: rotates by day and period. */
    public static RenderSpec fallbackSpec(String period, int dayOfYear) {
        int rank = Math.max(0, periodRank(period));
        int index = Math.abs(dayOfYear * 4 + rank) % FALLBACK_TEXTS.length;
        String text = FALLBACK_TEXTS[index];
        String tier = tierForLength(text.length());
        return new RenderSpec("fallback_" + index, text, FALLBACK_LABEL, period,
                smallSp(tier), mediumSp(tier), true, "fallback#" + index);
    }
}
