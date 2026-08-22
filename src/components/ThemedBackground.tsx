import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Ellipse, Line } from 'react-native-svg';

import { defaultLayers, type AppTheme, type BackgroundLayer } from '@/theme/themes';

/**
 * Full-bleed layered theme background. Free themes are a soft wash (a → b);
 * premium themes stack glows, horizons and grain — everything drawn
 * locally, no images.
 *
 * Layers follow the prototype's CSS ordering (`layers[0]` on top), so they
 * are rendered in reverse.
 *
 * IMPORTANT (real-device rendering): this component deliberately uses NO
 * SVG gradient brushes (<Defs> + url(#…) fills). On real Android builds of
 * this app they fail to resolve and react-native-svg paints the referencing
 * shape BLACK — which turned the whole app near-black on device while web
 * previews looked fine. Instead:
 *   - linear layers use expo-linear-gradient (independent native module);
 *   - translucent radial glows are stacks of plain-fill ellipses with tiny
 *     per-ring opacity steps (plain fills are the same reliable path the
 *     app's icons already render through);
 *   - opaque radial washes (the free themes' a → b base) render as a
 *     vertical expo-linear-gradient, which is visually equivalent;
 *   - paper grain is plain-stroke lines.
 * Do not reintroduce SVG gradient/pattern brushes here.
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
    <View onLayout={onLayout} style={[styles.fill, { backgroundColor: theme.b }, style]}>
      {size.w > 0 &&
        size.h > 0 &&
        [...layers].reverse().map((layer, i) => (
          <LayerView key={layers.length - 1 - i} layer={layer} w={size.w} h={size.h} />
        ))}
      {children}
    </View>
  );
}

function LayerView({ layer, w, h }: { layer: BackgroundLayer; w: number; h: number }) {
  if (layer.kind === 'linear') {
    return (
      <ExpoLinearGradient
        pointerEvents="none"
        colors={layer.stops.map((s) => s.color) as [string, string, ...string[]]}
        locations={layer.stops.map((s) => s.pos) as [number, number, ...number[]]}
        style={StyleSheet.absoluteFill}
      />
    );
  }
  if (layer.kind === 'grain') {
    return (
      <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width={w} height={h}>
        <GrainLines layer={layer} w={w} h={h} />
      </Svg>
    );
  }
  // Radial. Fully opaque washes (free-theme base) → vertical native
  // gradient; translucent glows → concentric plain-fill ellipse stack.
  const parsed = layer.stops.map((s) => ({ pos: s.pos, ...parseColor(s.color) }));
  if (parsed.every((s) => s.alpha >= 1)) {
    return (
      <ExpoLinearGradient
        pointerEvents="none"
        colors={parsed.map((s) => s.hex) as [string, string, ...string[]]}
        locations={parsed.map((s) => s.pos) as [number, number, ...number[]]}
        style={StyleSheet.absoluteFill}
      />
    );
  }
  return (
    <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width={w} height={h}>
      <GlowEllipses layer={layer} stops={parsed} w={w} h={h} />
    </Svg>
  );
}

interface ParsedStop {
  pos: number;
  hex: string;
  alpha: number;
}

/**
 * Soft radial glow approximated by N concentric ellipses painted largest
 * first. Ring k covers radius ≤ r_k and adds just enough opacity that the
 * cumulative coverage at its radius matches the gradient's target alpha —
 * per-ring deltas stay ≈0.03, far below visible banding on these subtle
 * washes.
 */
function GlowEllipses({
  layer,
  stops,
  w,
  h,
}: {
  layer: Extract<BackgroundLayer, { kind: 'radial' }>;
  stops: ParsedStop[];
  w: number;
  h: number;
}) {
  const RINGS = 32;
  const cx = layer.cx * w;
  const cy = layer.cy * h;
  const rx = (layer.w / 2) * w;
  const ry = (layer.h / 2) * h;

  // Target alpha/color along t∈[0,1]; past the last stop it fades to 0.
  const track: ParsedStop[] = [...stops];
  if (track[track.length - 1].alpha > 0 || track[track.length - 1].pos < 1) {
    track.push({ pos: 1, hex: track[track.length - 1].hex, alpha: 0 });
  }
  const sample = (t: number): { hex: string; alpha: number } => {
    if (t <= track[0].pos) return track[0];
    for (let i = 1; i < track.length; i++) {
      if (t <= track[i].pos) {
        const a = track[i - 1];
        const b = track[i];
        const f = b.pos === a.pos ? 0 : (t - a.pos) / (b.pos - a.pos);
        return { hex: mixHex(a.hex, b.hex, f), alpha: a.alpha + (b.alpha - a.alpha) * f };
      }
    }
    return track[track.length - 1];
  };

  const rings = [];
  // Largest → smallest; cumulative alpha after painting ring at radius t
  // must equal sample(t).alpha, so each ring adds the increment relative
  // to what is already painted beneath it.
  let covered = 0;
  for (let k = RINGS; k >= 1; k--) {
    const t = k / RINGS;
    const target = sample(t === 1 ? 1 : t);
    const remaining = 1 - covered;
    const delta = remaining <= 0 ? 0 : (target.alpha - covered) / remaining;
    if (delta > 0.001) {
      rings.push(
        <Ellipse
          key={k}
          cx={cx}
          cy={cy}
          rx={rx * t}
          ry={ry * t}
          fill={target.hex}
          fillOpacity={Math.min(delta, 1)}
        />,
      );
      covered = covered + remaining * Math.min(delta, 1);
    }
  }
  return <>{rings}</>;
}

/**
 * Fine paper grain (Papir): thin parallel plain strokes at an angle —
 * never an SVG <Pattern>, which is another unreliable native brush.
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

/** Linear-interpolate two '#RRGGBB' colors. */
function mixHex(a: string, b: string, f: number): string {
  const na = parseInt(a.slice(1), 16);
  const nb = parseInt(b.slice(1), 16);
  const ch = (sa: number, sb: number) => Math.round(sa + (sb - sa) * f);
  const r = ch((na >> 16) & 255, (nb >> 16) & 255);
  const g = ch((na >> 8) & 255, (nb >> 8) & 255);
  const bl = ch(na & 255, nb & 255);
  return `#${((r << 16) | (g << 8) | bl).toString(16).padStart(6, '0')}`;
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
