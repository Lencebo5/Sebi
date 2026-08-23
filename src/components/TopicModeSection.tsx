import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { GoalChip } from '@/components/SelectableCard';
import { useToast } from '@/components/Toast';
import { CATEGORIES } from '@/content/categories';
import type { SurfaceTopicSelection } from '@/models/types';
import { toggleTopic, TOPIC_CATEGORY_IDS } from '@/services/topics';
import { usePreferences } from '@/state/PreferencesContext';
import { fonts, spacing } from '@/theme/tokens';

/**
 * Shared widget/reminder topic control (task §12–13): "Prati Za danas"
 * (default, everyone) or "Izaberi teme" (Premium, 1–5 categories). A Free
 * user tapping custom goes through the existing paywall flow; a lapsed
 * Premium's saved custom picks are kept but shown as inactive.
 */
export function TopicModeSection({
  title,
  selection,
  isPremium,
  seedCategoryIds,
  onChange,
  onLockedCustom,
}: {
  title: string;
  selection: SurfaceTopicSelection;
  isPremium: boolean;
  /** Used to pre-fill an empty custom selection (usually the feed topics). */
  seedCategoryIds: string[];
  onChange(selection: SurfaceTopicSelection): void;
  onLockedCustom(): void;
}) {
  const { tokens } = usePreferences();
  const { showToast } = useToast();
  const customActive = selection.mode === 'custom' && isPremium;

  const chooseFollowFeed = () => {
    if (selection.mode !== 'follow_feed') {
      onChange({ ...selection, mode: 'follow_feed' });
    }
  };

  const chooseCustom = () => {
    if (!isPremium) {
      onLockedCustom();
      return;
    }
    if (selection.mode !== 'custom') {
      onChange({
        mode: 'custom',
        categoryIds:
          selection.categoryIds.length > 0
            ? selection.categoryIds
            : (seedCategoryIds.slice(0, 5) as SurfaceTopicSelection['categoryIds']),
      });
    }
  };

  const toggleCategory = (id: SurfaceTopicSelection['categoryIds'][number]) => {
    const { next, result } = toggleTopic(selection.categoryIds, id);
    if (result === 'limit') showToast('Najviše 5 tema.');
    if (result === 'last') showToast('Bar jedna tema ostaje izabrana.');
    if (result === 'added' || result === 'removed') {
      onChange({ mode: 'custom', categoryIds: next });
    }
  };

  const renderModeRow = ({
    label,
    active,
    locked,
    onPress,
  }: {
    label: string;
    active: boolean;
    locked?: boolean;
    onPress: () => void;
  }) => (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [styles.modeRow, pressed && { opacity: 0.7 }]}>
      <View
        style={[
          styles.radio,
          { borderColor: active ? tokens.ink : tokens.outline },
          active && { backgroundColor: tokens.ink },
        ]}>
        {active && <Icon name="check" size={11} color={tokens.surface} strokeWidth={2.4} />}
      </View>
      <Text style={[styles.modeLabel, { color: tokens.ink }]}>{label}</Text>
      {locked && <Icon name="lock" size={14} color={tokens.faint} strokeWidth={1.7} />}
    </Pressable>
  );

  return (
    <View style={styles.section}>
      <Text style={[styles.title, { color: tokens.sub }]}>{title.toUpperCase()}</Text>
      {renderModeRow({ label: 'Prati Za danas', active: !customActive, onPress: chooseFollowFeed })}
      {renderModeRow({
        label: 'Izaberi teme',
        active: customActive,
        locked: !isPremium,
        onPress: chooseCustom,
      })}
      {customActive && (
        <View style={styles.chips}>
          {TOPIC_CATEGORY_IDS.map((id) => {
            const category = CATEGORIES.find((c) => c.id === id);
            if (!category) return null;
            return (
              <GoalChip
                key={id}
                categoryId={id}
                label={category.goalName ?? category.name}
                selected={selection.categoryIds.includes(id)}
                onPress={() => toggleCategory(id)}
              />
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: spacing.lg,
  },
  title: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 11,
    letterSpacing: 1.6,
    marginBottom: spacing.xs,
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeLabel: {
    fontFamily: fonts.sans,
    fontSize: 15.5,
    flex: 1,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: spacing.xs,
  },
});
