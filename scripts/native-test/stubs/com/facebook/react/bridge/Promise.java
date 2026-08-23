package com.facebook.react.bridge;
/** Test stub: records the outcome for assertions. */
public class Promise {
    public Object resolved; public String rejectCode; public String rejectMessage; public Throwable rejectError;
    public boolean settled;
    public void resolve(Object value) { resolved = value; settled = true; }
    public void reject(String code, String message) { rejectCode = code; rejectMessage = message; settled = true; }
    public void reject(String code, Throwable error) { rejectCode = code; rejectError = error; settled = true; }
}
