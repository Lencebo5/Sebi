import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';

import { AffirmationExperience } from '@/components/AffirmationExperience';
import { getAffirmation } from '@/content/affirmations';
import { CATEGORIES } from '@/content/categories';
import type { Affirmation, CategoryId } from '@/models/types';
import { buildCategoryFeed, buildTodayFeed } from '@/services/dailyContent';
import { usePreferences } from '@/state/PreferencesContext';
import { useSubscription } from '@/state/SubscriptionContext';

/**
 * Full-screen affirmation viewer for a category feed. Also serves the
 * favorites feed via the pseudo-id "favorites" (with ?start=<id>).
 */
export default function Viewer() {
  const router = useRouter();
  const { categoryId, start } = useLocalSearchParams<{ categoryId: string; start?: string }>();
  const { preferences, favorites, recentIds } = usePreferences();
  const { isPremium } = useSubscription();

  const feed: Affirmation[] = useMemo(() => {
    if (categoryId === 'favorites') {
      return favorites
        .map((id) => getAffirmation(id))
        .filter((a): a is Affirmation => a != null)
        .reverse();
    }
    if (categoryId === 'today') {
      return buildTodayFeed(preferences.goals, isPremium, recentIds);
    }
    const known = CATEGORIES.some((c) => c.id === categoryId);
    if (!known) return [];
    return buildCategoryFeed(categoryId as CategoryId, recentIds);
    // Feed is intentionally built once per open — browsing must not reshuffle it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId]);

  const initialIndex = useMemo(() => {
    if (!start) return 0;
    const index = feed.findIndex((a) => a.id === start);
    return index >= 0 ? index : 0;
  }, [feed, start]);

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  return (
    <AffirmationExperience
      feed={feed}
      initialIndex={initialIndex}
      showCategoryLabel
      onClose={close}
      onFavoriteLimit={() => router.push('/paywall?source=favorites')}
    />
  );
}
