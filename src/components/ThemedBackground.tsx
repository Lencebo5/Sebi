import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  Pattern,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

import { defaultLayers, type AppTheme, type BackgroundLayer, type GradientStop } from '@/theme/themes';

/**
 * Full-bleed layered theme background. Free themes are a single radial
 * wash (a → b); premium themes stack soft glows, horizons and grain —
 * everything drawn locally, no images.
 *
 * Layers follow the prototype's CSS ordering (`layers[0]` on top), so they
 * are rendered in reverse.
 */
export function ThemedBackground({
  theme,
  children,
  style,
}: {
  theme: AppTheme;
  children?: React.ReactNode;
  style?: object;
}) {
  const layers = theme.layers ?? defaultLayers(theme.a, theme.b);

  return (
    <View style={[styles.fill, { backgroundColor: theme.b }, style]}>
      <Svg
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
        width="100%"
        height="100%"
        preserveAspectRatio="none">
        <Defs>
          {layers.map((layer, i) => (
            <LayerDef key={i} id={`${theme.id}-l${i}`} layer={layer} />
          ))}
        </Defs>
        {[...layers].reverse().map((layer, i) => {
          const index = layers.length - 1 - i;
          return (
            <Rect
              key={index}
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill={`url(#${theme.id}-l${index})`}
            />
          );
        })}
      </Svg>
      {children}
    </View>
  );
}

function LayerDef({ id, layer }: { id: string; layer: BackgroundLayer }) {
  if (layer.kind === 'linear') {
    // All design layers run top → bottom.
    return (
      <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        {layer.stops.map((stop, i) => (
          <GradientStopEl key={i} stop={stop} />
        ))}
      </LinearGradient>
    );
  }
  if (layer.kind === 'radial') {
    // Radial glows fade to transparent past the last stop.
    const stops: GradientStop[] = [
      ...layer.stops,
      { color: transparentEdge(last(layer.stops).color), pos: 1 },
    ];
    return (
      <RadialGradient
        id={id}
        cx={pct(layer.cx)}
        cy={pct(layer.cy)}
        rx={pct(layer.w / 2)}
        ry={pct(layer.h / 2)}
        fx={pct(layer.cx)}
        fy={pct(layer.cy)}
        gradientUnits="objectBoundingBox">
        {stops.map((stop, i) => (
          <GradientStopEl key={i} stop={stop} />
        ))}
      </RadialGradient>
    );
  }
  // Grain — thin repeating stripes at an angle (Papir's paper texture).
  const tile = layer.on + layer.off;
  const { hex, alpha } = parseColor(layer.color);
  return (
    <Pattern
      id={id}
      patternUnits="userSpaceOnUse"
      width={tile}
      height={tile * 3}
      patternTransform={`rotate(${layer.angle})`}>
      <Rect x="0" y="0" width={layer.on} height={tile * 3} fill={hex} fillOpacity={alpha} />
    </Pattern>
  );
}

function GradientStopEl({ stop }: { stop: GradientStop }) {
  const { hex, alpha } = parseColor(stop.color);
  return <Stop offset={`${stop.pos * 100}%`} stopColor={hex} stopOpacity={alpha} />;
}

function pct(fraction: number): string {
  return `${fraction * 100}%`;
}

function last<T>(items: T[]): T {
  return items[items.length - 1];
}

/** The same hue as `color`, fully transparent. */
function transparentEdge(color: string): string {
  const { hex } = parseColor(color);
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},0)`;
}

/** Split '#RRGGBB' or 'rgba(r,g,b,a)' into a hex color + opacity. */
function parseColor(color: string): { hex: string; alpha: number } {
  if (color.startsWith('#')) return { hex: color, alpha: 1 };
  const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!match) return { hex: '#000000', alpha: 1 };
  const toHex = (v: string) => Number(v).toString(16).padStart(2, '0');
  return {
    hex: `#${toHex(match[1])}${toHex(match[2])}${toHex(match[3])}`,
    alpha: match[4] === undefined ? 1 : Number(match[4]),
  };
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    overflow: 'hidden',
  },
});
