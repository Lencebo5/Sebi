import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { SebiWidget, SebiWidgetFallback } from '@/widgets/SebiWidget';
import { getWidgetDisplay } from '@/widgets/widget-content';
import { getWidgetStage, WIDGET_DEBUG } from '@/widgets/widget-debug';
import { renderWidgetStage } from '@/widgets/widget-stages';

/**
 * Headless handler for the "Sebi" Android widget. Renders the approved
 * small (2×2) or medium (4×2) layout depending on the actual size the
 * launcher reports — one adaptive provider, resized horizontally.
 *
 * Taps use the native OPEN_APP click action (declared on the widget root),
 * so no WIDGET_CLICK handling is needed here.
 *
 * TEMPORARY: verbose [SEBI_WIDGET] logging plus a staged test render
 * (widget-debug.ts / widget-stages.tsx) while diagnosing invisible
 * rendering on device. Collect with:
 *   adb logcat | grep -i -E "SEBI_WIDGET|ReactNativeJS|RNWidget"
 */

/** Launcher-reported dp width below which the 2×2 layout is used. */
const SMALL_MAX_WIDTH_DP = 220;

export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  const { widgetAction, widgetInfo, renderWidget } = props;

  console.log(
    `[SEBI_WIDGET] action=${widgetAction} id=${widgetInfo.widgetId} name=${widgetInfo.widgetName} ` +
      `size=${widgetInfo.width}x${widgetInfo.height}dp density=${widgetInfo.screenInfo?.density}`,
  );

  if (widgetAction === 'WIDGET_DELETED') return;
  if (widgetInfo.widgetName !== 'Sebi') return;

  const layout = widgetInfo.width > 0 && widgetInfo.width < SMALL_MAX_WIDTH_DP ? 'small' : 'medium';

  try {
    if (WIDGET_DEBUG) {
      const stage = await getWidgetStage();
      console.log(`[SEBI_WIDGET] DEBUG stage=${stage} — rendering test stage`);
      if (stage < 10) {
        renderWidget(renderWidgetStage(stage));
        console.log(`[SEBI_WIDGET] render requested (stage ${stage})`);
        return;
      }
    }

    console.log('[SEBI_WIDGET] loading personalized content…');
    const display = await getWidgetDisplay();
    console.log(
      `[SEBI_WIDGET] content id=${display.affirmation.id} label=${display.label} surface=${display.surface} layout=${layout}`,
    );
    renderWidget(
      <SebiWidget
        layout={layout}
        text={display.affirmation.text}
        label={display.label}
        surface={display.surface}
      />,
    );
    console.log('[SEBI_WIDGET] render requested (production)');
  } catch (error) {
    console.error('[SEBI_WIDGET] render failed', error);
    try {
      renderWidget(<SebiWidgetFallback layout={layout} />);
      console.log('[SEBI_WIDGET] fallback render requested');
    } catch (fallbackError) {
      console.error('[SEBI_WIDGET] fallback render failed', fallbackError);
    }
  }
}
