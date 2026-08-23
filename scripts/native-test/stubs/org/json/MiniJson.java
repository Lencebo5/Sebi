package org.json;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Test-only strict JSON parser backing the JSONArray/JSONObject stubs so the
 * shipped widget code can run on the JVM. On device the real android
 * org.json implementation is used; the queue payload is machine-generated
 * (JSON.stringify), so this subset — objects, arrays, strings with escapes,
 * numbers, booleans, null — covers it entirely, and anything else throws.
 */
final class MiniJson {
    private final String src;
    private int pos;

    private MiniJson(String src) { this.src = src; }

    static Object parse(String src) throws JSONException {
        if (src == null) throw new JSONException("null input");
        MiniJson p = new MiniJson(src);
        p.skipWhitespace();
        Object value = p.parseValue();
        p.skipWhitespace();
        if (p.pos != src.length()) throw new JSONException("trailing data at " + p.pos);
        return value;
    }

    private Object parseValue() throws JSONException {
        if (pos >= src.length()) throw new JSONException("unexpected end");
        char c = src.charAt(pos);
        switch (c) {
            case '{': return parseObject();
            case '[': return parseArray();
            case '"': return parseString();
            case 't': expect("true"); return Boolean.TRUE;
            case 'f': expect("false"); return Boolean.FALSE;
            case 'n': expect("null"); return null;
            default: return parseNumber();
        }
    }

    private Map<String, Object> parseObject() throws JSONException {
        Map<String, Object> map = new HashMap<>();
        pos++; // {
        skipWhitespace();
        if (peek() == '}') { pos++; return map; }
        while (true) {
            skipWhitespace();
            if (peek() != '"') throw new JSONException("expected key at " + pos);
            String key = parseString();
            skipWhitespace();
            if (peek() != ':') throw new JSONException("expected ':' at " + pos);
            pos++;
            skipWhitespace();
            map.put(key, parseValue());
            skipWhitespace();
            char c = peek();
            if (c == ',') { pos++; continue; }
            if (c == '}') { pos++; return map; }
            throw new JSONException("expected ',' or '}' at " + pos);
        }
    }

    private List<Object> parseArray() throws JSONException {
        List<Object> list = new ArrayList<>();
        pos++; // [
        skipWhitespace();
        if (peek() == ']') { pos++; return list; }
        while (true) {
            skipWhitespace();
            list.add(parseValue());
            skipWhitespace();
            char c = peek();
            if (c == ',') { pos++; continue; }
            if (c == ']') { pos++; return list; }
            throw new JSONException("expected ',' or ']' at " + pos);
        }
    }

    private String parseString() throws JSONException {
        StringBuilder sb = new StringBuilder();
        pos++; // opening quote
        while (true) {
            if (pos >= src.length()) throw new JSONException("unterminated string");
            char c = src.charAt(pos++);
            if (c == '"') return sb.toString();
            if (c == '\\') {
                if (pos >= src.length()) throw new JSONException("bad escape");
                char e = src.charAt(pos++);
                switch (e) {
                    case '"': sb.append('"'); break;
                    case '\\': sb.append('\\'); break;
                    case '/': sb.append('/'); break;
                    case 'b': sb.append('\b'); break;
                    case 'f': sb.append('\f'); break;
                    case 'n': sb.append('\n'); break;
                    case 'r': sb.append('\r'); break;
                    case 't': sb.append('\t'); break;
                    case 'u':
                        if (pos + 4 > src.length()) throw new JSONException("bad \\u escape");
                        sb.append((char) Integer.parseInt(src.substring(pos, pos + 4), 16));
                        pos += 4;
                        break;
                    default: throw new JSONException("bad escape '\\" + e + "'");
                }
            } else {
                sb.append(c);
            }
        }
    }

    private Object parseNumber() throws JSONException {
        int start = pos;
        while (pos < src.length() && "+-0123456789.eE".indexOf(src.charAt(pos)) >= 0) pos++;
        if (start == pos) throw new JSONException("unexpected character at " + pos);
        String raw = src.substring(start, pos);
        try {
            if (raw.indexOf('.') < 0 && raw.indexOf('e') < 0 && raw.indexOf('E') < 0) {
                return Long.parseLong(raw);
            }
            return Double.parseDouble(raw);
        } catch (NumberFormatException e) {
            throw new JSONException("bad number '" + raw + "'");
        }
    }

    private void expect(String literal) throws JSONException {
        if (!src.startsWith(literal, pos)) throw new JSONException("bad literal at " + pos);
        pos += literal.length();
    }

    private char peek() throws JSONException {
        if (pos >= src.length()) throw new JSONException("unexpected end");
        return src.charAt(pos);
    }

    private void skipWhitespace() {
        while (pos < src.length() && Character.isWhitespace(src.charAt(pos))) pos++;
    }
}
