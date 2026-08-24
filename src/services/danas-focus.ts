/**
 * Consume-once handoff of a deep-linked affirmation id to the Danas screen.
 *
 * Both external surfaces route through here: the native widget's deep link
 * (sebi://danas?affirmationId=… → app/danas.tsx) and notification taps
 * (observeNotificationTaps in _layout). Danas consumes the id exactly once
 * — no stale route params, no duplicate navigation after cold start — and
 * a subscription covers the case where Danas is already mounted when a new
 * tap arrives.
 */

let pendingFocusId: string | null = null;
let listeners: (() => void)[] = [];

export function setDanasFocus(affirmationId: string): void {
  if (!affirmationId) return;
  pendingFocusId = affirmationId;
  for (const listener of [...listeners]) listener();
}

/** Returns the pending id at most once; later calls return null. */
export function consumeDanasFocus(): string | null {
  const id = pendingFocusId;
  pendingFocusId = null;
  return id;
}

export function subscribeDanasFocus(listener: () => void): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}
