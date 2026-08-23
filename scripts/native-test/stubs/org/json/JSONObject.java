package org.json;

import java.util.Map;

/** Test stub over MiniJson matching the org.json surface the widget uses. */
public class JSONObject {
    final Map<String, Object> values;

    JSONObject(Map<String, Object> values) { this.values = values; }

    @SuppressWarnings("unchecked")
    public JSONObject(String source) throws JSONException {
        Object parsed = MiniJson.parse(source);
        if (!(parsed instanceof Map)) throw new JSONException("not an object");
        this.values = (Map<String, Object>) parsed;
    }

    public String optString(String key, String fallback) {
        Object v = values.get(key);
        if (v == null) return fallback;
        return v instanceof String ? (String) v : String.valueOf(v);
    }

    /** Test-harness convenience (not used by shipped widget code). */
    @SuppressWarnings("unchecked")
    public JSONArray optJSONArray(String key) {
        Object v = values.get(key);
        return v instanceof java.util.List ? new JSONArray((java.util.List<Object>) v) : null;
    }
}
