package android.content;
import android.content.pm.PackageManager;
/** Test stub: recording fake configured by the harness. */
public class Context {
    public static final int MODE_PRIVATE = 0;
    public SharedPreferences sharedPreferences;
    public PackageManager packageManager = new PackageManager();
    public String packageName = "com.sebi.app";
    public SharedPreferences getSharedPreferences(String name, int mode) { return sharedPreferences; }
    public PackageManager getPackageManager() { return packageManager; }
    public String getPackageName() { return packageName; }
}
