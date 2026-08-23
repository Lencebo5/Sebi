package android.util;
public final class Log {
    public static int e(String tag, String msg) { System.out.println("LOG_E " + tag + ": " + msg); return 0; }
    public static int e(String tag, String msg, Throwable t) { System.out.println("LOG_E " + tag + ": " + msg + " (" + t + ")"); return 0; }
    public static int w(String tag, String msg) { System.out.println("LOG_W " + tag + ": " + msg); return 0; }
}
