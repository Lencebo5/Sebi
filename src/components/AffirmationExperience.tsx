import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { FadeIn, FadeOut, runOnJS } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ShareCard } from '@/components/ShareCard';
import { ThemedBackground } from '@/components/ThemedBackground';
import { getCategory } from '@/content/categories';
import type { Affirmation } from '@/models/types';
import { track } from '@/services/analytics';
import { shareAffirmationCard } from '@/services/share';
import { usePreferences } from '@/state/PreferencesContext';
import { fonts, spacing } from '@/theme/tokens';

/**
 * Full-screen affirmation viewer: one thought at a time, tap or swipe for
 * the next, heart to save, share to generate a card. Used by Home and by
 * category/favorite feeds.
 */
export function AffirmationExperience({
  feed,
  initialIndex = 0,
  showStreak = false,
  showCategoryLabel = true,
  onFavoriteLimit,
  onClose,
}: {
  feed: Affirmation[];
  initialIndex?: number;
  showStreak?: boolean;
  showCategoryLabel?: boolean;
  /** Called when the free favorites cap is reached (open paywall). */
  onFavoriteLimit: () => void;
  /** When set, a close chevron is shown (viewer mode). */
  onClose?: () => void;
}) {
  const { theme, streak, toggleFavorite, isFavorite, markShown } = usePreferences();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(() =>
    feed.length > 0 ? Math.min(initialIndex, feed.length - 1) : 0,
  );
  const shareCardRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);

  const affirmation = feed.length > 0 ? feed[index % feed.length] : null;

  useEffect(() => {
    if (affirmation) {
      markShown(affirmation.id);
      track('affirmation_viewed', { id: affirmation.id, category: affirmation.category });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [affirmation?.id]);

  const goNext = useCallback(() => {
    if (feed.length < 2) return;
    setIndex((i) => (i + 1) % feed.length);
  }, [feed.length]);

  const goPrev = useCallback(() => {
    if (feed.length < 2) return;
    setIndex((i) => (i - 1 + feed.length) % feed.length);
  }, [feed.length]);

  const tap = Gesture.Tap()
    .maxDuration(300)
    .onEnd(() => {
      runOnJS(goNext)();
    });
  const pan = Gesture.Pan()
    .activeOffsetX([-24, 24])
    .onEnd((event) => {
      if (event.translationX <= -24) runOnJS(goNext)();
      else if (event.translationX >= 24) runOnJS(goPrev)();
    });
  const gesture = Gesture.Exclusive(pan, tap);

  const handleFavorite = useCallback(() => {
    if (!affirmation) return;
    const result = toggleFavorite(affirmation.id);
    if (result === 'limit') {
      onFavoriteLimit();
      return;
    }
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [affirmation, toggleFavorite, onFavoriteLimit]);

  const handleShare = useCallback(async () => {
    if (!affirmation || sharing) return;
    setSharing(true);
    try {
      await shareAffirmationCard(shareCardRef, affirmation);
    } catch {
      // Sharing was dismissed or failed — nothing to do.
    } finally {
      setSharing(false);
    }
  }, [affirmation, sharing]);

  if (!affirmation) {
    return (
      <ThemedBackground theme={theme}>
        <View style={styles.center}>
          <Text style={[styles.emptyText, { color: theme.subtle }]}>Nema sadržaja.</Text>
        </View>
      </ThemedBackground>
    );
  }

  const favorite = isFavorite(affirmation.id);
  const category = getCategory(affirmation.category);

  return (
    <ThemedBackground theme={theme}>
      <View style={[styles.container, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.topRow}>
          {onClose ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Zatvori"
              onPress={onClose}
              hitSlop={12}
              style={styles.topButton}>
              <Ionicons name="chevron-down" size={26} color={theme.subtle} />
            </Pressable>
          ) : (
            <View style={styles.topButton} />
          )}
          {showStreak && streak.current > 0 ? (
            <Text style={[styles.streak, { color: theme.subtle }]}>
              {'\u{1F525}'} {streak.current} {dayWord(streak.current)}
            </Text>
          ) : (
            <View />
          )}
        </View>

        <GestureDetector gesture={gesture}>
          <View style={styles.hero} collapsable={false}>
            <Animated.View
              key={affirmation.id}
              entering={FadeIn.duration(400)}
              exiting={FadeOut.duration(180)}
              style={styles.heroInner}>
              {showCategoryLabel && (
                <Text style={[styles.categoryLabel, { color: theme.subtle }]}>
                  {category.name.toUpperCase()}
                </Text>
              )}
              <Text style={[styles.affirmationText, { color: theme.text }]}>
                {affirmation.text}
              </Text>
            </Animated.View>
          </View>
        </GestureDetector>

        <View style={[styles.actions, { paddingBottom: insets.bottom + spacing.xl }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={favorite ? 'Ukloni iz omiljenih' : 'Sačuvaj u omiljene'}
            onPress={handleFavorite}
            hitSlop={12}
            style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}>
            <Ionicons
              name={favorite ? 'heart' : 'heart-outline'}
              size={26}
              color={favorite ? '#E0708A' : theme.subtle}
            />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Podeli"
            onPress={handleShare}
            hitSlop={12}
            style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}>
            <Ionicons name="share-outline" size={25} color={theme.subtle} />
          </Pressable>
        </View>
      </View>

      {/* Offscreen composition captured for sharing. */}
      <View pointerEvents="none" style={styles.shareCardHost}>
        <ShareCard ref={shareCardRef} affirmation={affirmation} theme={theme} />
      </View>
    </ThemedBackground>
  );
}

function dayWord(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return 'dan';
  return 'dana';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: fonts.sans,
    fontSize: 15,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 32,
  },
  topButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streak: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
  },
  heroInner: {
    gap: spacing.lg,
  },
  categoryLabel: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 12,
    letterSpacing: 2.4,
    textAlign: 'center',
  },
  affirmationText: {
    fontFamily: fonts.serif,
    fontSize: 32,
    lineHeight: 46,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xxl,
  },
  actionButton: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
    transform: [{ scale: 0.94 }],
  },
  shareCardHost: {
    position: 'absolute',
    left: -10000,
    top: 0,
  },
});
