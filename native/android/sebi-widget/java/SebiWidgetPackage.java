package com.sebi.app.widget;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

import java.util.Collections;
import java.util.List;

/**
 * Registers SebiWidgetStorageModule. A classic ReactPackage is intentional:
 * the New Architecture interop layer exposes it to JS as
 * NativeModules.SebiWidgetStorage without TurboModule codegen, keeping the
 * bridge as small and boring as the widget itself.
 */
public class SebiWidgetPackage implements ReactPackage {
    @Override
    public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
        return Collections.<NativeModule>singletonList(new SebiWidgetStorageModule(reactContext));
    }

    @Override
    public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
        return Collections.emptyList();
    }
}
