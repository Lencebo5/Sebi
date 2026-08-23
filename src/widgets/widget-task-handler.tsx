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
 */

/** Launcher-reported dp width below which the 2×2 layout is used. */
const SMALL_MAX_WIDTH_DP = 220;

export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  const { widgetAction, widgetInfo, renderWidget } = props;

  if (widgetAction === 'WIDGET_DELETED') return;
  if (widgetInfo.widgetName !== 'Sebi') return;

  const layout = widgetInfo.width > 0 && widgetInfo.width < SMALL_MAX_WIDTH_DP ? 'small' : 'medium';

  try {
    const display = await getWidgetDisplay();
    renderWidget(
      <SebiWidget
        layout={layout}
        text={display.affirmation.text}
        label={display.label}
        surface={display.surface}
      />,
    );
  } catch {
    renderWidget(<SebiWidgetFallback layout={layout} />);
  }
}
