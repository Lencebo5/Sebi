import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { SebiWidget, SebiWidgetFallback } from '@/widgets/SebiWidget';
import { getWidgetDisplay } from '@/widgets/widget-content';

/**
 * Headless handler for the "Sebi" Android widget. Renders the approved
 * small (2×2) or medium (4×2) layout depending on the actual size the
 * launcher reports — one adaptive provider, resized horizontally.
 *
 * Taps use the native OPEN_APP click action (declared on the widget root),
 * so no WIDGET_CLICK handling is needed here.
 *
 * Every action and failure is logged ([SEBI_WIDGET] in logcat) and the
 * production render is wrapped so a failure ALWAYS falls back to a
 * dependency-free visible widget — never the transparent initial layout.
 */

/** Launcher-reported dp width below which the 2×2 layout is used. */
const SMALL_MAX_WIDTH_DP = 220;

export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  const { widgetAction, widgetInfo, renderWidget } = props;

  console.log(
    `[SEBI_WIDGET] action=${widgetAction} id=${widgetInfo.widgetId} name=${widgetInfo.widgetName} ` +
      `size=${widgetInfo.width}x${widgetInfo.height}dp`,
  );

  if (widgetAction === 'WIDGET_DELETED') return;
  if (widgetInfo.widgetName !== 'Sebi') return;

  const layout = widgetInfo.width > 0 && widgetInfo.width < SMALL_MAX_WIDTH_DP ? 'small' : 'medium';

  try {
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
    console.error('[SEBI_WIDGET] production render failed', error);
    renderWidget(<SebiWidgetFallback layout={layout} />);
    console.log('[SEBI_WIDGET] fallback render requested');
  }
}
