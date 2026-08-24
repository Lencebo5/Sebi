package com.sebi.app.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;
import android.util.TypedValue;
import android.widget.RemoteViews;

import com.sebi.app.R;

import java.util.Calendar;
import java.util.Locale;

/**
 * Native Sebi home-screen widget: plain RemoteViews over real TextViews.
 *
 * No JavaScript, no Hermes wake-up, no bitmaps, no ContentProvider: updates
 * read the precomputed queue from SharedPreferences (written by the app via
 * SebiWidgetStorageModule) and set text on native layouts. Rotation happens
 * on the OS update tick (updatePeriodMillis) — selection is deterministic by
 * (local date, local period), so repeated ticks in one period are stable.
 *
 * This class never touches app storage (favorites, streak, recents live in
 * AsyncStorage and are owned by the app) and never decides Free/Premium —
 * the queue only contains entitled messages.
 */
public class SebiWidgetProvider extends AppWidgetProvider {
    private static final String TAG = "SebiWidget";

    static final String PREFS_NAME = "sebi_widget";
    static final String KEY_QUEUE = "queue_json";
    static final String KEY_GENERATED_AT = "generated_at";
    static final String KEY_LAST_SLOT = "last_slot_key";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            renderWidget(context, appWidgetManager, appWidgetId);
        }
    }

    @Override
    public void onAppWidgetOptionsChanged(Context context, AppWidgetManager appWidgetManager,
                                          int appWidgetId, Bundle newOptions) {
        // Resize: re-render immediately so the layout class can switch.
        renderWidget(context, appWidgetManager, appWidgetId);
    }

    /** Re-render every placed Sebi widget (called after the app writes a new queue). */
    static void renderAll(Context context) {
        try {
            AppWidgetManager manager = AppWidgetManager.getInstance(context);
            if (manager == null) return;
            int[] ids = manager.getAppWidgetIds(new ComponentName(context, SebiWidgetProvider.class));
            if (ids == null) return;
            for (int id : ids) {
                renderWidget(context, manager, id);
            }
        } catch (Throwable t) {
            Log.e(TAG, "renderAll failed", t);
        }
    }

    static void renderWidget(Context context, AppWidgetManager manager, int appWidgetId) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String queueJson = prefs.getString(KEY_QUEUE, null);

            Calendar now = Calendar.getInstance();
            String today = String.format(Locale.US, "%04d-%02d-%02d",
                    now.get(Calendar.YEAR), now.get(Calendar.MONTH) + 1, now.get(Calendar.DAY_OF_MONTH));
            SebiWidgetLogic.RenderSpec spec = SebiWidgetLogic.choose(
                    queueJson, today, now.get(Calendar.HOUR_OF_DAY), now.get(Calendar.DAY_OF_YEAR));

            boolean small = SebiWidgetLogic.useSmallLayout(minWidthDp(manager, appWidgetId));
            RemoteViews views = new RemoteViews(context.getPackageName(),
                    small ? R.layout.sebi_widget_small : R.layout.sebi_widget_medium);

            views.setTextViewText(R.id.sebi_widget_label, spec.label);
            views.setTextViewText(R.id.sebi_widget_quote, spec.text);
            views.setTextViewTextSize(R.id.sebi_widget_quote, TypedValue.COMPLEX_UNIT_SP,
                    small ? spec.smallSp : spec.mediumSp);
            views.setInt(R.id.sebi_widget_root, "setBackgroundResource", backgroundFor(spec.period));
            views.setContentDescription(R.id.sebi_widget_root, "Sebi. " + spec.text);

            PendingIntent openApp = openAffirmationIntent(context, spec.id, appWidgetId);
            if (openApp == null) openApp = launchAppIntent(context);
            if (openApp != null) {
                views.setOnClickPendingIntent(R.id.sebi_widget_root, openApp);
            }

            manager.updateAppWidget(appWidgetId, views);
            prefs.edit().putString(KEY_LAST_SLOT, spec.slotKey).apply();
            if (spec.usedFallback) {
                Log.w(TAG, "rendered built-in fallback (queue missing/empty/corrupt) slot=" + spec.slotKey);
            }
        } catch (Throwable t) {
            // Never leave a broken widget: the small layout carries baked-in
            // fallback text (label + real Free message + brand) as defaults.
            Log.e(TAG, "render failed, applying layout defaults", t);
            try {
                manager.updateAppWidget(appWidgetId,
                        new RemoteViews(context.getPackageName(), R.layout.sebi_widget_small));
            } catch (Throwable inner) {
                Log.e(TAG, "default layout update failed", inner);
            }
        }
    }

    private static int minWidthDp(AppWidgetManager manager, int appWidgetId) {
        try {
            Bundle options = manager.getAppWidgetOptions(appWidgetId);
            return options != null ? options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0) : 0;
        } catch (Throwable t) {
            return 0;
        }
    }

    private static int backgroundFor(String period) {
        if ("morning".equals(period)) return R.drawable.sebi_widget_bg_morning;
        if ("day".equals(period)) return R.drawable.sebi_widget_bg_linen;
        if ("evening".equals(period)) return R.drawable.sebi_widget_bg_paper;
        return R.drawable.sebi_widget_bg_night;
    }

    /**
     * Tap opens Danas showing the EXACT affirmation currently rendered:
     * sebi://danas?affirmationId=<id> through the app's URL scheme
     * (app/danas.tsx). Only the stable id travels — never message text.
     *
     * Stale-PendingIntent safety: Android caches PendingIntents by Intent
     * filterEquals, which INCLUDES the data URI — so when the widget
     * rotates from message A to B the URI differs and a fresh
     * PendingIntent is created; FLAG_UPDATE_CURRENT + FLAG_IMMUTABLE and a
     * per-widget requestCode keep updates well-defined. A tap can never
     * open an earlier message's id.
     */
    private static PendingIntent openAffirmationIntent(Context context, String affirmationId, int appWidgetId) {
        try {
            if (affirmationId == null || affirmationId.isEmpty()) return null;
            Uri uri = Uri.parse("sebi://danas?affirmationId=" + Uri.encode(affirmationId));
            Intent intent = new Intent(Intent.ACTION_VIEW, uri);
            intent.setPackage(context.getPackageName());
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED);
            return PendingIntent.getActivity(context, appWidgetId, intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        } catch (Throwable t) {
            Log.e(TAG, "deep-link intent failed, falling back to app launch", t);
            return null;
        }
    }

    /** Fallback tap when no id is available: plain app launch (normal Danas). */
    private static PendingIntent launchAppIntent(Context context) {
        try {
            Intent launch = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
            if (launch == null) return null;
            launch.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED);
            return PendingIntent.getActivity(context, 0, launch,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        } catch (Throwable t) {
            Log.e(TAG, "launch intent failed", t);
            return null;
        }
    }
}
