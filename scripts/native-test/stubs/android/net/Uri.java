package android.net;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

/** Test stub: string-backed Uri sufficient for deep-link assertions. */
public class Uri {
    private final String value;

    private Uri(String value) { this.value = value; }

    public static Uri parse(String value) { return new Uri(value); }

    public static String encode(String value) {
        try {
            return URLEncoder.encode(value, StandardCharsets.UTF_8.name());
        } catch (Exception e) {
            return value;
        }
    }

    @Override
    public String toString() { return value; }
}
