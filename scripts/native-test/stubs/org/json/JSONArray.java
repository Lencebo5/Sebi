package org.json;

import java.util.List;
import java.util.Map;

/** Test stub over MiniJson matching the org.json surface the widget uses. */
public class JSONArray {
    private final List<Object> values;

    JSONArray(List<Object> values) { this.values = values; }

    @SuppressWarnings("unchecked")
    public JSONArray(String source) throws JSONException {
        Object parsed = MiniJson.parse(source);
        if (!(parsed instanceof List)) throw new JSONException("not an array");
        this.values = (List<Object>) parsed;
    }

    public int length() { return values.size(); }

    @SuppressWarnings("unchecked")
    public JSONObject optJSONObject(int index) {
        if (index < 0 || index >= values.size()) return null;
        Object v = values.get(index);
        return v instanceof Map ? new JSONObject((Map<String, Object>) v) : null;
    }
}
