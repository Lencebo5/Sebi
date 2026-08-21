import type { AnalyticsEvent, AnalyticsEventMap } from '@/models/types';

/**
 * Lightweight analytics abstraction. Swap the sink for a real provider
 * later (e.g. PostHog, Amplitude) without touching call sites.
 */
type Sink = (event: AnalyticsEvent, props?: Record<string, unknown>) => void;

let sink: Sink = (event, props) => {
  if (__DEV__) {
    console.log(`[analytics] ${event}`, props ?? '');
  }
};

export function setAnalyticsSink(nextSink: Sink) {
  sink = nextSink;
}

export function track<E extends AnalyticsEvent>(
  event: E,
  ...args: AnalyticsEventMap[E] extends undefined ? [] : [AnalyticsEventMap[E]]
) {
  sink(event, args[0] as Record<string, unknown> | undefined);
}
