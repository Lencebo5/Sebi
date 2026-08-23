package android.widget;
import android.app.PendingIntent;
import java.util.HashMap;
import java.util.Map;
/** Test stub: records everything the provider sets so tests can assert on it. */
public class RemoteViews {
    public final String packageName; public final int layoutId;
    public final Map<Integer, CharSequence> texts = new HashMap<>();
    public final Map<Integer, Float> textSizesSp = new HashMap<>();
    public final Map<Integer, Integer> backgroundResources = new HashMap<>();
    public final Map<Integer, CharSequence> contentDescriptions = new HashMap<>();
    public final Map<Integer, PendingIntent> clickIntents = new HashMap<>();
    public RemoteViews(String packageName, int layoutId) { this.packageName = packageName; this.layoutId = layoutId; }
    public void setTextViewText(int viewId, CharSequence text) { texts.put(viewId, text); }
    public void setTextViewTextSize(int viewId, int unit, float size) { textSizesSp.put(viewId, size); }
    public void setInt(int viewId, String method, int value) {
        if ("setBackgroundResource".equals(method)) backgroundResources.put(viewId, value);
    }
    public void setContentDescription(int viewId, CharSequence text) { contentDescriptions.put(viewId, text); }
    public void setOnClickPendingIntent(int viewId, PendingIntent intent) { clickIntents.put(viewId, intent); }
}
