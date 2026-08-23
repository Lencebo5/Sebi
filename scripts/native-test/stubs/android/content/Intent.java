package android.content;
public class Intent {
    public static final int FLAG_ACTIVITY_NEW_TASK = 0x10000000;
    public static final int FLAG_ACTIVITY_RESET_TASK_IF_NEEDED = 0x00200000;
    public int flags;
    public Intent setFlags(int flags) { this.flags = flags; return this; }
}
