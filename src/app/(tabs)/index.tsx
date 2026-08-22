import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';

import { AffirmationExperience } from '@/components/AffirmationExperience';
import { buildTodayFeed } from '@/services/dailyContent';
import { usePreferences } from '@/state/PreferencesContext';
import { useSubscription } from '@/state/SubscriptionContext';

/** Home — the personalized "Za danas" experience. */
export default function Home() {
  const router = useRouter();
  const { profile, recentIds } = usePreferences();
  const { isPremium } = useSubscription();

  // The feed is built once per mount (recency comes from persisted history);
  // recentIds changes as the user browses, so it must not re-trigger.
  const feed = useMemo(
    () => buildTodayFeed(profile, isPremium, recentIds),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile, isPremium],
  );

  return (
    <AffirmationExperience
      feed={feed}
      showStreak
      onFavoriteLimit={() => router.push('/paywall?source=favorites')}
    />
  );
}
