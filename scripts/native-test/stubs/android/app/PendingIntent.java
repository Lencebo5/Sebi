package android.app;
import android.content.Context;
import android.content.Intent;
public class PendingIntent {
    public static final int FLAG_UPDATE_CURRENT = 0x08000000;
    public static final int FLAG_IMMUTABLE = 0x04000000;
    public final Intent intent; public final int flags;
    private PendingIntent(Intent intent, int flags) { this.intent = intent; this.flags = flags; }
    public static PendingIntent getActivity(Context ctx, int req, Intent intent, int flags) {
        return new PendingIntent(intent, flags);
    }
}
