package android.content;

import android.net.Uri;

public class Intent {
    public static final String ACTION_VIEW = "android.intent.action.VIEW";
    public static final int FLAG_ACTIVITY_NEW_TASK = 0x10000000;
    public static final int FLAG_ACTIVITY_RESET_TASK_IF_NEEDED = 0x00200000;
    public String action;
    public Uri data;
    public String packageName;
    public int flags;

    public Intent() {}

    public Intent(String action, Uri data) {
        this.action = action;
        this.data = data;
    }

    public Intent setPackage(String packageName) { this.packageName = packageName; return this; }

    public Intent setFlags(int flags) { this.flags = flags; return this; }
}
