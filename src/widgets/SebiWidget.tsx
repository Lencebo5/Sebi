import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

import { affirmationTier, type WidgetSurface } from '@/widgets/widget-select';

/**
 * The Sebi home-screen widget, from the approved design (`Sebi Widgeti
 * .dc.html`): small 2×2 = ref 1b (Papir, left aligned), medium 4×2 = ref 1d
 * (Linen, left aligned, tiny dot), morning/evening = surface states of the
 * same widget (ref 1f). Ink #3A342B; label caps 9/1.8 @50%; brand Literata
 * @45%; radius 24; padding 16/20.
 *
 * Android widget primitives can't do radial gradients or the paper grain
 * texture — surfaces are approximated with the library's two-stop vertical
 * gradients using the design's end colors (documented compromise).
 */

const INK = '#3A342B';
const LABEL_COLOR = 'rgba(58, 52, 43, 0.5)' as const;
const BRAND_COLOR = 'rgba(58, 52, 43, 0.45)' as const;
const DOT_COLOR = 'rgba(58, 52, 43, 0.35)' as const;

const SURFACES: Record<WidgetSurface, { from: `#${string}`; to: `#${string}` }> = {
  morning: { from: '#FBEFDC', to: '#EFE2CB' }, // 1f — warm morning light
  linen: { from: '#F8F4EB', to: '#EDE4D2' }, // 1d — Linen
  paper: { from: '#F7F2E7', to: '#EDE5D2' }, // 1b — Papir
  night: { from: '#F3EDE0', to: '#E7DCC9' }, // subtly dimmer Papir
};

export function SebiWidget({
  text,
  label,
  surface,
  layout,
}: {
  text: string;
  label: string;
  surface: WidgetSurface;
  layout: 'small' | 'medium';
}) {
  const small = layout === 'small';
  const tier = affirmationTier(text.length, layout);
  const colors = SURFACES[surface];

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      accessibilityLabel={`Sebi. ${text}`}
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        alignItems: 'flex-start',
        padding: small ? 16 : 20,
        borderRadius: 24,
        backgroundGradient: {
          from: colors.from,
          to: colors.to,
          orientation: 'TOP_BOTTOM',
        },
      }}>
      <TextWidget
        text={label}
        style={{
          fontSize: 9,
          fontFamily: 'SchibstedGrotesk_600SemiBold',
          letterSpacing: 1.8,
          color: LABEL_COLOR,
          marginBottom: 8,
        }}
      />
      <TextWidget
        text={text}
        style={{
          fontSize: tier.fontSize,
          lineHeight: tier.lineHeight,
          fontFamily: 'Literata_400Regular',
          color: INK,
          textAlign: 'left',
          width: 'match_parent',
        }}
      />
      <FlexWidget style={{ flex: 1, width: 'match_parent' }} />
      {small ? (
        <TextWidget
          text="Sebi"
          style={{ fontSize: 10.5, fontFamily: 'Literata_400Regular', color: BRAND_COLOR }}
        />
      ) : (
        <FlexWidget
          style={{
            width: 'match_parent',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
          <TextWidget
            text="Sebi"
            style={{ fontSize: 11, fontFamily: 'Literata_400Regular', color: BRAND_COLOR }}
          />
          <FlexWidget
            style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: DOT_COLOR }}
          />
        </FlexWidget>
      )}
    </FlexWidget>
  );
}

/**
 * Last-resort render when the production path throws — deliberately free of
 * every failure-prone dependency: no AsyncStorage, no personalization, no
 * custom fonts, no gradient. Solid Linen, system font, one approved Free
 * message (corpus id motivation_001). It must be nearly impossible for this
 * not to render — the user must never see a transparent widget.
 */
export function SebiWidgetFallback({ layout }: { layout: 'small' | 'medium' }) {
  const small = layout === 'small';
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      accessibilityLabel="Sebi. Raspoloženje nije uslov da počnem."
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        alignItems: 'flex-start',
        padding: small ? 16 : 20,
        borderRadius: 24,
        backgroundColor: '#F6F1E7',
      }}>
      <TextWidget
        text="ZA DANAS"
        style={{ fontSize: 9, letterSpacing: 1.8, color: '#8A857C', marginBottom: 8 }}
      />
      <TextWidget
        text="Raspoloženje nije uslov da počnem."
        style={{
          fontSize: small ? 15 : 18,
          lineHeight: small ? 21 : 25,
          color: INK,
          textAlign: 'left',
          width: 'match_parent',
        }}
      />
      <FlexWidget style={{ flex: 1, width: 'match_parent' }} />
      <TextWidget text="Sebi" style={{ fontSize: small ? 10.5 : 11, color: '#938D82' }} />
    </FlexWidget>
  );
}
