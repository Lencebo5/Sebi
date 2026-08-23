import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

/**
 * TEMPORARY isolation ladder for the invisible-widget diagnosis — each
 * stage adds exactly ONE feature, in the agreed order. Remove after the
 * root cause is confirmed.
 */

const INK = '#3A342B';
const QUOTE = 'Umor nije isto što i lenjost.';

/** Stage 0 — the exact minimal white/black test widget. */
function Stage0() {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        width: 'match_parent',
        height: 'match_parent',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <TextWidget text="SEBI TEST" style={{ color: '#000000', fontSize: 24 }} />
    </FlexWidget>
  );
}

/** Stage 1 — solid Linen background instead of white. */
function Stage1() {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        width: 'match_parent',
        height: 'match_parent',
        backgroundColor: '#F6F1E7',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <TextWidget text="SEBI TEST" style={{ color: '#000000', fontSize: 24 }} />
    </FlexWidget>
  );
}

/** Stage 2 — real affirmation text, system font, ink color. */
function Stage2() {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        width: 'match_parent',
        height: 'match_parent',
        backgroundColor: '#F6F1E7',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <TextWidget text={QUOTE} style={{ color: INK, fontSize: 16 }} />
    </FlexWidget>
  );
}

/** Stage 3 — adds label and brand texts (solid hex colors, system font). */
function Stage3() {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        width: 'match_parent',
        height: 'match_parent',
        backgroundColor: '#F6F1E7',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'center',
      }}>
      <TextWidget text="ZA DANAS" style={{ color: '#8A857C', fontSize: 9 }} />
      <TextWidget text={QUOTE} style={{ color: INK, fontSize: 16 }} />
      <TextWidget text="Sebi" style={{ color: '#938D82', fontSize: 10 }} />
    </FlexWidget>
  );
}

/** Stage 4 — production layout: padding, column, spacer to the bottom. */
function Stage4({ radius = 0 }: { radius?: number }) {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        width: 'match_parent',
        height: 'match_parent',
        backgroundColor: '#F6F1E7',
        flexDirection: 'column',
        alignItems: 'flex-start',
        padding: 16,
        borderRadius: radius,
      }}>
      <TextWidget text="ZA DANAS" style={{ color: '#8A857C', fontSize: 9, marginBottom: 8 }} />
      <TextWidget
        text={QUOTE}
        style={{ color: INK, fontSize: 16, width: 'match_parent', textAlign: 'left' }}
      />
      <FlexWidget style={{ flex: 1, width: 'match_parent' }} />
      <TextWidget text="Sebi" style={{ color: '#938D82', fontSize: 10.5 }} />
    </FlexWidget>
  );
}

/** Stage 6/7 — custom fonts, one at a time. */
function StageFonts({ literata, schibsted }: { literata: boolean; schibsted: boolean }) {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        width: 'match_parent',
        height: 'match_parent',
        backgroundColor: '#F6F1E7',
        flexDirection: 'column',
        alignItems: 'flex-start',
        padding: 16,
        borderRadius: 24,
      }}>
      <TextWidget
        text="ZA DANAS"
        style={{
          color: '#8A857C',
          fontSize: 9,
          marginBottom: 8,
          ...(schibsted ? { fontFamily: 'SchibstedGrotesk_600SemiBold' } : {}),
        }}
      />
      <TextWidget
        text={QUOTE}
        style={{
          color: INK,
          fontSize: 16,
          width: 'match_parent',
          textAlign: 'left',
          ...(literata ? { fontFamily: 'Literata_400Regular' } : {}),
        }}
      />
      <FlexWidget style={{ flex: 1, width: 'match_parent' }} />
      <TextWidget
        text="Sebi"
        style={{
          color: '#938D82',
          fontSize: 10.5,
          ...(literata ? { fontFamily: 'Literata_400Regular' } : {}),
        }}
      />
    </FlexWidget>
  );
}

/** Stage 8 — backgroundGradient replaces the solid color. */
function Stage8() {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        width: 'match_parent',
        height: 'match_parent',
        flexDirection: 'column',
        alignItems: 'flex-start',
        padding: 16,
        borderRadius: 24,
        backgroundGradient: { from: '#F8F4EB', to: '#EDE4D2', orientation: 'TOP_BOTTOM' },
      }}>
      <TextWidget
        text="ZA DANAS"
        style={{ color: '#8A857C', fontSize: 9, marginBottom: 8, fontFamily: 'SchibstedGrotesk_600SemiBold' }}
      />
      <TextWidget
        text={QUOTE}
        style={{ color: INK, fontSize: 16, width: 'match_parent', textAlign: 'left', fontFamily: 'Literata_400Regular' }}
      />
      <FlexWidget style={{ flex: 1, width: 'match_parent' }} />
      <TextWidget text="Sebi" style={{ color: '#938D82', fontSize: 10.5, fontFamily: 'Literata_400Regular' }} />
    </FlexWidget>
  );
}

/** Stage 9 — remaining production styling: rgba, letterSpacing, the dot. */
function Stage9() {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      accessibilityLabel={`Sebi. ${QUOTE}`}
      style={{
        width: 'match_parent',
        height: 'match_parent',
        flexDirection: 'column',
        alignItems: 'flex-start',
        padding: 20,
        borderRadius: 24,
        backgroundGradient: { from: '#F8F4EB', to: '#EDE4D2', orientation: 'TOP_BOTTOM' },
      }}>
      <TextWidget
        text="ZA DANAS"
        style={{
          color: 'rgba(58, 52, 43, 0.5)',
          fontSize: 9,
          letterSpacing: 1.8,
          marginBottom: 8,
          fontFamily: 'SchibstedGrotesk_600SemiBold',
        }}
      />
      <TextWidget
        text={QUOTE}
        style={{
          color: INK,
          fontSize: 19,
          lineHeight: 26,
          width: 'match_parent',
          textAlign: 'left',
          fontFamily: 'Literata_400Regular',
        }}
      />
      <FlexWidget style={{ flex: 1, width: 'match_parent' }} />
      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
        <TextWidget
          text="Sebi"
          style={{ color: 'rgba(58, 52, 43, 0.45)', fontSize: 11, fontFamily: 'Literata_400Regular' }}
        />
        <FlexWidget
          style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(58, 52, 43, 0.35)' }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}

export function renderWidgetStage(stage: number): React.JSX.Element {
  switch (stage) {
    case 0:
      return <Stage0 />;
    case 1:
      return <Stage1 />;
    case 2:
      return <Stage2 />;
    case 3:
      return <Stage3 />;
    case 4:
      return <Stage4 />;
    case 5:
      return <Stage4 radius={24} />;
    case 6:
      return <StageFonts literata schibsted={false} />;
    case 7:
      return <StageFonts literata schibsted />;
    case 8:
      return <Stage8 />;
    default:
      return <Stage9 />;
  }
}
