package com.sebi.app.widget;

import android.content.Context;
import android.content.SharedPreferences;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

/**
 * Tiny bridge between the TypeScript personalization engine and the native
 * widget: the app precomputes a queue of future widget slots and hands the
 * finished JSON here. Storage is plain SharedPreferences (never AsyncStorage
 * internals), so the native provider can read it with zero React involvement.
 *
 * Privacy contract: the queue carries only resulting messages and their
 * presentation metadata (id, text, label, period, date, tier) — never the
 * user's goals, challenges, age or life context.
 */
public class SebiWidgetStorageModule extends ReactContextBaseJavaModule {
    public static final String NAME = "SebiWidgetStorage";

    public SebiWidgetStorageModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return NAME;
    }

    /**
     * Replace the widget queue and immediately re-render any placed widgets.
     * Rejects (rather than silently storing garbage) when the payload has no
     * valid slots — the provider would only ever see fallbacks from it.
     */
    @ReactMethod
    public void setQueue(String queueJson, Promise promise) {
        try {
            int validSlots = SebiWidgetLogic.parseQueue(queueJson).size();
            if (validSlots == 0) {
                promise.reject("E_EMPTY_QUEUE", "widget queue has no valid slots");
                return;
            }
            Context context = getReactApplicationContext();
            SharedPreferences prefs =
                    context.getSharedPreferences(SebiWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE);
            boolean committed = prefs.edit()
                    .putString(SebiWidgetProvider.KEY_QUEUE, queueJson)
                    .putLong(SebiWidgetProvider.KEY_GENERATED_AT, System.currentTimeMillis())
                    .commit();
            if (!committed) {
                promise.reject("E_WRITE_FAILED", "SharedPreferences commit failed");
                return;
            }
            SebiWidgetProvider.renderAll(context);
            promise.resolve(validSlots);
        } catch (Throwable t) {
            promise.reject("E_WIDGET_QUEUE", t);
        }
    }
}
