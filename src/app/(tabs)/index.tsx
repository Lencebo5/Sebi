import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';

import { AffirmationExperience } from '@/components/AffirmationExperience';
import { NotificationOptIn } from '@/components/NotificationOptIn';
import { buildTodayFeed, withFocusedAffirmation } from '@/services/dailyContent';
import { consumeDanasFocus, subscribeDanasFocus } from '@/services/danas-focus';
import { effectiveTopics } from '@/services/topics';
import { usePreferences } from '@/state/PreferencesContext';
import { useSubscription } from '@/state/SubscriptionContext';

/** Home — the personalized "Za danas" experience. */
export default function Home() {
  const router = useRouter();
  const { profile, preferences, recentIds } = usePreferences();
  const { isPremium } = useSubscription();

  // Deep-linked affirmation (notification/widget tap). Consumed once on
  // mount (cold start sets the focus before Danas exists) and via
  // subscription while mounted (tap arriving with the app already open).
  const [focusId, setFocusId] = useState<string | null>(() => consumeDanasFocus());
  useEffect(
    () =>
      subscribeDanasFocus(() => {
        const id = consumeDanasFocus();
        if (id) setFocusId(id);
      }),
    [],
  );

  const feedTopics = useMemo(
    () => effectiveTopics('personalized_feed', preferences.topics, isPremium),
    [preferences.topics, isPremium],
  );

  // The feed is built once per mount (recency comes from persisted history);
  // recentIds changes as the user browses, so it must not re-trigger. Topic
  // changes DO re-trigger, so a new preference is reflected immediately.
  // A deep-linked affirmation goes first; swiping continues through the
  // normal personalized feed (no duplicate of the focused message).
  const feed = useMemo(
    () =>
      withFocusedAffirmation(buildTodayFeed(profile, isPremium, recentIds, feedTopics), focusId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile, isPremium, feedTopics, focusId],
  );

  return (
    <>
      <AffirmationExperience
        // Remount on a new deep link so the focused card is the visible one
        // — everything else (favorites, share, streak, history) is the
        // untouched normal Danas experience.
        key={focusId ?? 'feed'}
        feed={feed}
        showStreak
        onFavoriteLimit={() => router.push('/paywall?source=favorites')}
      />
      <NotificationOptIn />
    </>
  );
}
