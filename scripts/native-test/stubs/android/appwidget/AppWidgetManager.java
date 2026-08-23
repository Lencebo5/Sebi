package android.appwidget;
import android.content.ComponentName;
import android.content.Context;
import android.os.Bundle;
import android.widget.RemoteViews;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
/** Test stub: recording fake, one shared instance per test run. */
public class AppWidgetManager {
    public static final String OPTION_APPWIDGET_MIN_WIDTH = "appWidgetMinWidth";
    public static AppWidgetManager instance = new AppWidgetManager();
    public int[] widgetIds = new int[] {1};
    public final Map<Integer, Bundle> options = new HashMap<>();
    public final List<int[]> updates = new ArrayList<>(); // [widgetId] with views recorded below
    public final Map<Integer, RemoteViews> lastViews = new HashMap<>();
    public static AppWidgetManager getInstance(Context context) { return instance; }
    public int[] getAppWidgetIds(ComponentName provider) { return widgetIds; }
    public Bundle getAppWidgetOptions(int widgetId) { return options.get(widgetId); }
    public void updateAppWidget(int widgetId, RemoteViews views) {
        updates.add(new int[] {widgetId});
        lastViews.put(widgetId, views);
    }
}
