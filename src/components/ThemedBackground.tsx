import React, { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Defs, Line, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

import { defaultLayers, type AppTheme, type BackgroundLayer, type GradientStop } from '@/theme/themes';

/**
 * Full-bleed layered theme background. Free themes are a single radial
 * wash (a → b); premium themes stack soft glows, horizons and grain —
 * everything drawn locally, no images.
 *
 * Layers follow the prototype's CSS ordering (`layers[0]` on top), so they
 * are rendered in reverse.
 *
 * IMPORTANT (real-device rendering): everything is expressed in
 * `userSpaceOnUse` pixel coordinates computed from the measured layout.
 * Percentage radii in objectBoundingBox units silently fail in
 * react-native-svg on native Android/iOS — the unresolved gradient paints
 * the rect BLACK, which turned the whole app near-black on real phones
 * while looking correct in web previews. Never reintroduce percentage
 * based gradients here.
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
  const [size, setSize] = useState({ w: 0, h: 0 });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width !== size.w || height !== size.h) setSize({ w: width, h: height });
  };

  return (
    <View
      onLayout={onLayout}
      style={[styles.fill, { backgroundColor: theme.b }, style]}>
      {size.w > 0 && size.h > 0 && (
        <Svg
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
          width={size.w}
          height={size.h}>
          <Defs>
            {layers.map((layer, i) =>
              layer.kind === 'grain' ? null : (
                <LayerDef key={i} id={`${theme.id}-l${i}`} layer={layer} w={size.w} h={size.h} />
              ),
            )}
          </Defs>
          {[...layers].reverse().map((layer, i) => {
            const index = layers.length - 1 - i;
            if (layer.kind === 'grain') {
              return <GrainLines key={index} layer={layer} w={size.w} h={size.h} />;
            }
            return (
              <Rect
                key={index}
                x={0}
                y={0}
                width={size.w}
                height={size.h}
                fill={`url(#${theme.id}-l${index})`}
              />
            );
          })}
        </Svg>
      )}
      {children}
    </View>
  );
}

function LayerDef({
  id,
  layer,
  w,
  h,
}: {
  id: string;
  layer: Exclude<BackgroundLayer, { kind: 'grain' }>;
  w: number;
  h: number;
}) {
  if (layer.kind === 'linear') {
    // All design layers run top → bottom.
    return (
      <LinearGradient id={id} x1={0} y1={0} x2={0} y2={h} gradientUnits="userSpaceOnUse">
        {layer.stops.map((stop, i) => (
          <GradientStopEl key={i} stop={stop} />
        ))}
      </LinearGradient>
    );
  }
  // Radial glows fade to transparent past the last stop.
  const stops: GradientStop[] = [
    ...layer.stops,
    { color: transparentEdge(last(layer.stops).color), pos: 1 },
  ];
  return (
    <RadialGradient
      id={id}
      cx={layer.cx * w}
      cy={layer.cy * h}
      rx={(layer.w / 2) * w}
      ry={(layer.h / 2) * h}
      fx={layer.cx * w}
      fy={layer.cy * h}
      gradientUnits="userSpaceOnUse">
      {stops.map((stop, i) => (
        <GradientStopEl key={i} stop={stop} />
      ))}
    </RadialGradient>
  );
}

/**
 * Fine paper grain (Papir): thin parallel strokes at an angle, drawn as
 * explicit lines instead of an SVG <Pattern> — patterns share the same
 * unreliable-native-brush problem as percentage gradients.
 */
function GrainLines({
  layer,
  w,
  h,
}: {
  layer: Extract<BackgroundLayer, { kind: 'grain' }>;
  w: number;
  h: number;
}) {
  const { hex, alpha } = parseColor(layer.color);
  const rad = (layer.angle * Math.PI) / 180;
  // CSS gradient axis for angle θ (0deg = up); stripes run perpendicular.
  const axis = { x: Math.sin(rad), y: -Math.cos(rad) };
  const along = { x: Math.cos(rad), y: Math.sin(rad) };
  const pitch = layer.on + layer.off;
  const range = Math.abs(w * axis.x) + Math.abs(h * axis.y);
  const count = Math.min(700, Math.ceil(range / pitch) + 1);
  const half = Math.sqrt(w * w + h * h) / 2 + pitch;
  const cx = w / 2;
  const cy = h / 2;

  const lines = [];
  for (let k = 0; k < count; k++) {
    const offset = k * pitch - range / 2;
    const px = cx + axis.x * offset;
    const py = cy + axis.y * offset;
    lines.push(
      <Line
        key={k}
        x1={px - along.x * half}
        y1={py - along.y * half}
        x2={px + along.x * half}
        y2={py + along.y * half}
        stroke={hex}
        strokeOpacity={alpha}
        strokeWidth={layer.on}
      />,
    );
  }
  return <>{lines}</>;
}

function GradientStopEl({ stop }: { stop: GradientStop }) {
  const { hex, alpha } = parseColor(stop.color);
  return <Stop offset={stop.pos} stopColor={hex} stopOpacity={alpha} />;
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
