package android.content;
import java.util.HashMap;
import java.util.Map;
/** Test stub: in-memory implementation with commit tracking. */
public class SharedPreferences {
    public final Map<String, Object> values = new HashMap<>();
    public boolean commitResult = true;
    public String getString(String key, String def) {
        Object v = values.get(key);
        return v instanceof String ? (String) v : def;
    }
    public Editor edit() { return new Editor(); }
    public class Editor {
        private final Map<String, Object> pending = new HashMap<>();
        public Editor putString(String key, String value) { pending.put(key, value); return this; }
        public Editor putLong(String key, long value) { pending.put(key, value); return this; }
        public boolean commit() { if (commitResult) values.putAll(pending); return commitResult; }
        public void apply() { values.putAll(pending); }
    }
}
