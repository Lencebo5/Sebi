import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import type { CategoryId } from '@/models/types';

/**
 * Sebi icon set — thin consistent line icons (Lucide style, stroke 1.7 on a
 * 24×24 grid), paths taken verbatim from the design handoff so the app
 * matches the mockups exactly.
 */

type Element =
  | { d: string }
  | { circle: [number, number, number] }
  | { rect: [number, number, number, number, number] };

const ICONS = {
  // Navigation & chrome
  chevronLeft: [{ d: 'M14.5 5 8 12l6.5 7' }],
  chevronRight: [{ d: 'M9.5 5 16 12l-6.5 7' }],
  close: [{ d: 'M6 6l12 12M18 6 6 18' }],
  check: [{ d: 'M4.5 12.5 10 18 19.5 7' }],
  plus: [{ d: 'M12 6v12M6 12h12' }],
  minus: [{ d: 'M6 12h12' }],
  // Actions
  heart: [
    {
      d: 'M12 20.3C7.2 16.5 3.8 13.3 3.8 9.6c0-2.6 2-4.7 4.5-4.7 1.5 0 2.9.7 3.7 1.9.8-1.2 2.2-1.9 3.7-1.9 2.5 0 4.5 2.1 4.5 4.7 0 3.7-3.4 6.9-8.2 10.7z',
    },
  ],
  share: [
    { d: 'M8 8H6.5A2.5 2.5 0 0 0 4 10.5v8A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5v-8A2.5 2.5 0 0 0 17.5 8H16' },
    { d: 'M12 14V3.5' },
    { d: 'M8.5 6.5 12 3l3.5 3.5' },
  ],
  lock: [
    { rect: [5.5, 10.5, 13, 9.5, 2.5] },
    { d: 'M8.5 10.5V7.8a3.5 3.5 0 0 1 7 0v2.7' },
  ],
  bell: [
    { d: 'M6 16v-5a6 6 0 0 1 12 0v5l1.5 2.5H4.5L6 16z' },
    { d: 'M10 21a2.3 2.3 0 0 0 4 0' },
  ],
  // Streak spark & tab bar
  spark: [{ d: 'M12 4c.6 3.6 2.4 5.4 6 6-3.6.6-5.4 2.4-6 6-.6-3.6-2.4-5.4-6-6 3.6-.6 5.4-2.4 6-6z' }],
  sun: [
    { circle: [12, 12, 4] },
    { d: 'M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M18.7 5.3l-1.8 1.8M7.1 16.9l-1.8 1.8' },
  ],
  grid: [{ d: 'M4.5 4.5h6v6h-6zM13.5 4.5h6v6h-6zM4.5 13.5h6v6h-6zM13.5 13.5h6v6h-6z' }],
  sliders: [
    { d: 'M4 8h8M17.5 8H20M4 16h4M12.5 16H20' },
    { circle: [14.5, 8, 2.2] },
    { circle: [9.5, 16, 2.2] },
  ],
  // Goal icons
  trendingUp: [{ d: 'M3.5 17 9.5 11l4 4 7-8' }, { d: 'M15.5 7h5v5' }],
  waves: [
    { d: 'M3 9.5c3 0 3 2 6 2s3-2 6-2 3 2 6 2' },
    { d: 'M3 14.5c3 0 3 2 6 2s3-2 6-2 3 2 6 2' },
  ],
  briefcase: [
    { d: 'M5.5 8.5h13a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-7.5a2 2 0 0 1 2-2z' },
    { d: 'M9.5 8.5V6.7A1.7 1.7 0 0 1 11.2 5h1.6a1.7 1.7 0 0 1 1.7 1.7v1.8' },
  ],
  coin: [
    { d: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z' },
    { d: 'M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9z' },
  ],
  circles: [
    { d: 'M9 15.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9z' },
    { d: 'M15 15.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9z' },
  ],
  leaf: [
    { d: 'M19 5c-9 .5-13.5 5-14 14 8.5-.5 13-5 14-14z' },
    { d: 'M5 19c3-6 7-9.5 11.5-11.5' },
  ],
} satisfies Record<string, Element[]>;

export type IconName = keyof typeof ICONS;

/** Goal-category icons for the 2×4 selection grid. */
export const GOAL_ICONS: Partial<Record<CategoryId, IconName>> = {
  confidence: 'spark',
  motivation: 'trendingUp',
  calm: 'waves',
  self_love: 'heart',
  work: 'briefcase',
  money: 'coin',
  relationships: 'circles',
  habits: 'leaf',
};

export function Icon({
  name,
  size = 22,
  color,
  strokeWidth = 1.7,
  fill = 'none',
  style,
}: {
  name: IconName;
  size?: number;
  color: string;
  strokeWidth?: number;
  /** Pass a color to fill the shape (e.g. the active heart). */
  fill?: string;
  style?: object;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}>
      {ICONS[name].map((el, i) => {
        if ('d' in el) return <Path key={i} d={el.d} fill={fill} />;
        if ('circle' in el) {
          const [cx, cy, r] = el.circle;
          return <Circle key={i} cx={cx} cy={cy} r={r} fill={fill} />;
        }
        const [x, y, width, height, rx] = el.rect;
        return <Rect key={i} x={x} y={y} width={width} height={height} rx={rx} fill={fill} />;
      })}
    </Svg>
  );
}
