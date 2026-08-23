package android.content;
public class ComponentName {
    public final Context context; public final Class<?> cls;
    public ComponentName(Context context, Class<?> cls) { this.context = context; this.cls = cls; }
}
