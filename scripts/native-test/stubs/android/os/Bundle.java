package android.os;
import java.util.HashMap;
import java.util.Map;
public class Bundle {
    public final Map<String, Object> values = new HashMap<>();
    public void putInt(String key, int value) { values.put(key, value); }
    public int getInt(String key, int def) {
        Object v = values.get(key);
        return v instanceof Integer ? (Integer) v : def;
    }
}
