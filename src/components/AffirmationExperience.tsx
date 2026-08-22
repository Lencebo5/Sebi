import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { FadeInDown, FadeOutUp, runOnJS } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { ShareCard, type ShareTemplate } from '@/components/ShareCard';
import { ShareSheet } from '@/components/ShareSheet';
import { ThemedBackground } from '@/components/ThemedBackground';
import { getCategory } from '@/content/categories';
import type { Affirmation } from '@/models/types';
import { track } from '@/services/analytics';
import { shareAffirmationCard } from '@/services/share';
import { usePreferences } from '@/state/PreferencesContext';
import {
  AFFIRMATION_LINE_HEIGHT,
  AFFIRMATION_MAX_WIDTH,
  affirmationFontSize,
  fonts,
  spacing,
  TAB_BAR_CONTENT_INSET,
  type,
} from '@/theme/tokens';

/**
 * Full-screen affirmation experience — the centerpiece of Sebi. The whole
 * screen is the canvas for one thought: quiet streak line up top, serif
 * affirmation sized to its length, two quiet actions, tap or swipe for the
 * next. Used by Home and by category/favorite viewers.
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
  /** When set, a back chevron + category header is shown (viewer mode). */
  onClose?: () => void;
}) {
  const { theme, tokens, streak, toggleFavorite, isFavorite, markShown } = usePreferences();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(() =>
    feed.length > 0 ? Math.min(initialIndex, feed.length - 1) : 0,
  );
  const [advanced, setAdvanced] = useState(false);
  const shareCardRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [template, setTemplate] = useState<ShareTemplate>('theme');

  const isViewer = onClose != null;
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
    setAdvanced(true);
    setIndex((i) => (i + 1) % feed.length);
  }, [feed.length]);

  const goPrev = useCallback(() => {
    if (feed.length < 2) return;
    setAdvanced(true);
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
    setShareOpen(false);
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
          <Text style={[styles.emptyText, { color: tokens.sub }]}>Nema sadržaja.</Text>
        </View>
      </ThemedBackground>
    );
  }

  const favorite = isFavorite(affirmation.id);
  const category = getCategory(affirmation.category);
  const fontSize = affirmationFontSize(affirmation.text);

  return (
    <ThemedBackground theme={theme}>
      <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
        {isViewer ? (
          <View style={styles.viewerHeader}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Nazad"
              onPress={onClose}
              hitSlop={12}
              style={styles.backButton}>
              <Icon name="chevronLeft" size={19} color={tokens.ink} style={{ opacity: 0.75 }} />
            </Pressable>
            <Text style={[styles.viewerTitle, { color: tokens.ink }]}>{category.name}</Text>
          </View>
        ) : (
          showStreak &&
          streak.current > 0 && (
            <View style={styles.streakRow}>
              <Icon name="spark" size={13} color={tokens.ink} strokeWidth={1.6} />
              <Text style={[styles.streakText, { color: tokens.ink }]}>
                {streak.current} {dayWord(streak.current)} zaredom
              </Text>
            </View>
          )
        )}

        <GestureDetector gesture={gesture}>
          <View style={styles.hero} collapsable={false}>
            <Animated.View
              key={affirmation.id}
              entering={FadeInDown.duration(240)}
              exiting={FadeOutUp.duration(200)}
              style={styles.heroInner}>
              {showCategoryLabel && !isViewer && (
                <Text style={[styles.categoryLabel, { color: tokens.sub }]}>
                  {category.name.toUpperCase()}
                </Text>
              )}
              <Text
                style={[
                  styles.affirmationText,
                  {
                    color: tokens.ink,
                    fontSize,
                    lineHeight: Math.round(fontSize * AFFIRMATION_LINE_HEIGHT),
                  },
                ]}>
                {affirmation.text}
              </Text>
            </Animated.View>
          </View>
        </GestureDetector>

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={favorite ? 'Ukloni iz omiljenih' : 'Sačuvaj u omiljene'}
            onPress={handleFavorite}
            hitSlop={8}
            style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}>
            <Icon
              name="heart"
              size={26}
              color={tokens.ink}
              strokeWidth={1.6}
              fill={favorite ? tokens.ink : 'none'}
              style={{ opacity: 0.8 }}
            />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Podeli"
            onPress={() => setShareOpen(true)}
            hitSlop={8}
            style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}>
            <Icon name="share" size={24} color={tokens.ink} strokeWidth={1.6} style={{ opacity: 0.8 }} />
          </Pressable>
        </View>

        <Text
          style={[
            styles.hint,
            { color: tokens.faint, opacity: !isViewer && !advanced && feed.length > 1 ? 0.9 : 0 },
          ]}>
          dodirni za sledeću misao
        </Text>
        <View style={{ height: isViewer ? insets.bottom + spacing.lg : TAB_BAR_CONTENT_INSET }} />
      </View>

      <ShareSheet
        visible={shareOpen}
        text={affirmation.text}
        template={template}
        onPick={setTemplate}
        onShare={() => void handleShare()}
        onClose={() => setShareOpen(false)}
      />

      {/* Offscreen composition captured for sharing. */}
      <View pointerEvents="none" style={styles.shareCardHost}>
        <ShareCard ref={shareCardRef} affirmation={affirmation} theme={theme} template={template} />
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
  viewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.smd,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerTitle: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 14,
    letterSpacing: 0.3,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: spacing.smd,
    opacity: 0.6,
  },
  streakText: {
    fontFamily: fonts.sansMedium,
    fontSize: 12.5,
    letterSpacing: 0.3,
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  heroInner: {
    alignItems: 'center',
    gap: spacing.md + 2,
  },
  categoryLabel: {
    ...type.contextLabel,
    textAlign: 'center',
  },
  affirmationText: {
    fontFamily: fonts.serif,
    textAlign: 'center',
    maxWidth: AFFIRMATION_MAX_WIDTH,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 44,
    paddingBottom: spacing.sm,
  },
  actionButton: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
    transform: [{ scale: 0.94 }],
  },
  hint: {
    fontFamily: fonts.sans,
    fontSize: 11.5,
    textAlign: 'center',
    paddingBottom: spacing.smd,
  },
  shareCardHost: {
    position: 'absolute',
    left: -10000,
    top: 0,
  },
});
