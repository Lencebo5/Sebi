import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedBackground } from '@/components/ThemedBackground';
import { SHARE_BRAND } from '@/constants/appConfig';
import type { ShareTemplate } from '@/components/ShareCard';
import { usePreferences } from '@/state/PreferencesContext';
import { fonts, radius, spacing, withAlpha } from '@/theme/tokens';

/**
 * Bottom sheet for picking one of the three share-card templates before
 * opening the native share dialog, mirroring the design's "Podeli misao"
 * sheet with live mini previews in the active theme.
 */
export function ShareSheet({
  visible,
  text,
  template,
  onPick,
  onShare,
  onClose,
}: {
  visible: boolean;
  /** Affirmation text, shortened for the previews. */
  text: string;
  template: ShareTemplate;
  onPick: (template: ShareTemplate) => void;
  onShare: () => void;
  onClose: () => void;
}) {
  const { theme, tokens } = usePreferences();
  const insets = useSafeAreaInsets();
  const short = text.length > 60 ? `${text.slice(0, 60)}…` : text;

  const ring = (active: boolean) => ({
    borderWidth: active ? 2 : StyleSheet.hairlineWidth,
    borderColor: active ? withAlpha(theme.ink, 0.9) : tokens.line,
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.host}>
        <Pressable accessibilityLabel="Zatvori" style={styles.backdrop} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            { backgroundColor: tokens.surface, paddingBottom: insets.bottom + spacing.mlg },
          ]}>
          <View style={[styles.handle, { backgroundColor: tokens.line }]} />
          <Text style={[styles.title, { color: tokens.ink }]}>Podeli misao</Text>

          <View style={styles.previews}>
            {/* Theme — centered on the live theme background */}
            <Pressable
              accessibilityRole="radio"
              accessibilityLabel="Šablon: tema"
              accessibilityState={{ selected: template === 'theme' }}
              onPress={() => onPick('theme')}
              style={[styles.preview, ring(template === 'theme')]}>
              <ThemedBackground theme={theme} style={styles.previewFill}>
                <View style={styles.previewCenter}>
                  <Text style={[styles.miniSerif, { color: theme.ink }]} numberOfLines={4}>
                    {short}
                  </Text>
                  <Text style={[styles.miniBrand, { color: tokens.sub }]}>{SHARE_BRAND}</Text>
                </View>
              </ThemedBackground>
            </Pressable>

            {/* Ink — editorial quote card */}
            <Pressable
              accessibilityRole="radio"
              accessibilityLabel="Šablon: editorijal"
              accessibilityState={{ selected: template === 'ink' }}
              onPress={() => onPick('ink')}
              style={[styles.preview, ring(template === 'ink'), { backgroundColor: tokens.ctaBg }]}>
              <View style={styles.previewInk}>
                <Text style={[styles.miniQuote, { color: withAlpha(theme.dark ? theme.b : theme.a, 0.5) }]}>
                  „
                </Text>
                <Text style={[styles.miniItalic, { color: tokens.ctaFg }]} numberOfLines={4}>
                  {short}
                </Text>
                <Text style={[styles.miniCaps, { color: withAlpha(theme.dark ? theme.b : theme.a, 0.55) }]}>
                  {SHARE_BRAND.toUpperCase()}
                </Text>
              </View>
            </Pressable>

            {/* Framed — thin border and the brand dot */}
            <Pressable
              accessibilityRole="radio"
              accessibilityLabel="Šablon: okvir"
              accessibilityState={{ selected: template === 'framed' }}
              onPress={() => onPick('framed')}
              style={[styles.preview, ring(template === 'framed'), { backgroundColor: tokens.surface }]}>
              <View pointerEvents="none" style={[styles.miniFrame, { borderColor: tokens.line }]} />
              <View style={styles.previewCenter}>
                <View style={[styles.miniDot, { backgroundColor: theme.ink }]} />
                <Text style={[styles.miniSerif, { color: theme.ink }]} numberOfLines={4}>
                  {short}
                </Text>
              </View>
            </Pressable>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={onShare}
            style={({ pressed }) => [
              styles.cta,
              { backgroundColor: tokens.ctaBg },
              pressed && { transform: [{ scale: 0.985 }] },
            ]}>
            <Text style={[styles.ctaLabel, { color: tokens.ctaFg }]}>Podeli</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  host: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  sheet: {
    borderTopLeftRadius: radius.modal,
    borderTopRightRadius: radius.modal,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.mlg,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: radius.pill,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 15,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  previews: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.smd,
    marginBottom: spacing.mlg,
  },
  preview: {
    width: 94,
    height: 118,
    borderRadius: 10,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  previewFill: {
    borderRadius: 10,
  },
  previewCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  previewInk: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  miniSerif: {
    fontFamily: fonts.serif,
    fontSize: 7.5,
    lineHeight: 11,
    textAlign: 'center',
  },
  miniBrand: {
    fontFamily: fonts.serif,
    fontSize: 6.5,
    marginTop: 9,
  },
  miniQuote: {
    fontFamily: fonts.serif,
    fontSize: 9,
    lineHeight: 9,
  },
  miniItalic: {
    fontFamily: fonts.serifItalic,
    fontSize: 7.5,
    lineHeight: 11,
  },
  miniCaps: {
    fontFamily: fonts.sansMedium,
    fontSize: 5.5,
    letterSpacing: 1,
    marginTop: 9,
  },
  miniFrame: {
    position: 'absolute',
    top: 6,
    left: 6,
    right: 6,
    bottom: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 6,
  },
  miniDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginBottom: 7,
  },
  cta: {
    height: 50,
    borderRadius: radius.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaLabel: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 15,
  },
});
