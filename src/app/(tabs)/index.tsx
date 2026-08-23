import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';

import { AffirmationExperience } from '@/components/AffirmationExperience';
import { NotificationOptIn } from '@/components/NotificationOptIn';
import { buildTodayFeed } from '@/services/dailyContent';
import { effectiveTopics } from '@/services/topics';
import { usePreferences } from '@/state/PreferencesContext';
import { useSubscription } from '@/state/SubscriptionContext';

/** Home — the personalized "Za danas" experience. */
export default function Home() {
  const router = useRouter();
  const { profile, preferences, recentIds } = usePreferences();
  const { isPremium } = useSubscription();

  const feedTopics = useMemo(
    () => effectiveTopics('personalized_feed', preferences.topics, isPremium),
    [preferences.topics, isPremium],
  );

  // The feed is built once per mount (recency comes from persisted history);
  // recentIds changes as the user browses, so it must not re-trigger. Topic
  // changes DO re-trigger, so a new preference is reflected immediately.
  const feed = useMemo(
    () => buildTodayFeed(profile, isPremium, recentIds, feedTopics),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile, isPremium, feedTopics],
  );

  return (
    <>
      <AffirmationExperience
        feed={feed}
        showStreak
        onFavoriteLimit={() => router.push('/paywall?source=favorites')}
      />
      <NotificationOptIn />
    </>
  );
}
