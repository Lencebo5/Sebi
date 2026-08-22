/**
 * Sebi visual themes — 12 "moods" of the same product, from the Claude
 * Design handoff (`Sebi Prototip.dc.html` / `Sebi Spec.dc.html`).
 *
 * Each theme defines three anchor colors — `a` (surface / lightest tone),
 * `b` (deeper edge tone) and `ink` (text) — everything else is derived in
 * tokens.ts (sub = ink 55%, faint = ink 38%, line = ink 13%, ghost = ink 6%,
 * tab bar = a 72% + blur, CTA = ink with `a`/`b` foreground).
 *
 * Free themes use a simple radial wash (a → b). Premium themes carry richer,
 * layered backgrounds (dawn horizon, dusk glow, misty ridges, warm ember…)
 * described as ordered gradient layers and rendered by ThemedBackground with
 * react-native-svg. Layers follow the CSS convention of the prototype:
 * `layers[0]` paints on TOP.
 */

export type GradientStop = { color: string; pos: number };

export type BackgroundLayer =
  | { kind: 'linear'; stops: GradientStop[] }
  /** Soft elliptical glow sized w×h (fractions of the screen) at (cx, cy). */
  | { kind: 'radial'; w: number; h: number; cx: number; cy: number; stops: GradientStop[] }
  /** Hairline grain: `on` px of `color`, `off` px gap, rotated by `angle`°. */
  | { kind: 'grain'; angle: number; color: string; on: number; off: number };

export interface AppTheme {
  id: string;
  /** User-facing name (Serbian Latin). */
  name: string;
  /** Surface / lightest tone. CTA text on light themes; sheet backgrounds. */
  a: string;
  /** Deeper edge tone. CTA text on dark themes. */
  b: string;
  /** Main text color — every other tint derives from it. */
  ink: string;
  /** Whether the background is dark (drives status-bar style). */
  dark: boolean;
  premium: boolean;
  /** Layered background; omitted on free themes (default radial a → b). */
  layers?: BackgroundLayer[];
}

/** Free-theme background: radial-gradient(140% 105% at 50% -5%, a, b). */
export function defaultLayers(a: string, b: string): BackgroundLayer[] {
  return [
    {
      kind: 'radial',
      w: 1.4,
      h: 1.05,
      cx: 0.5,
      cy: -0.05,
      stops: [
        { color: a, pos: 0 },
        { color: b, pos: 1 },
      ],
    },
  ];
}

export const THEMES: AppTheme[] = [
  // ── Free ──────────────────────────────────────────────────────────────
  { id: 'linen', name: 'Linen', a: '#F6F1E7', b: '#EAE1CF', ink: '#3A342B', dark: false, premium: false },
  { id: 'midnight', name: 'Midnight', a: '#1A2130', b: '#10151F', ink: '#E9ECF3', dark: true, premium: false },
  { id: 'sage', name: 'Sage', a: '#E9EEE2', b: '#D8E0CC', ink: '#333A2D', dark: false, premium: false },
  { id: 'rose', name: 'Rose', a: '#F3EAE5', b: '#E7D6CF', ink: '#3F3330', dark: false, premium: false },

  // ── Premium ───────────────────────────────────────────────────────────
  {
    // Zora — dawn: grey-lilac sky, warm light being born on the horizon.
    id: 'zora', name: 'Zora', a: '#F1DCC4', b: '#C7C1D1', ink: '#43362C', dark: false, premium: true,
    layers: [
      {
        kind: 'radial', w: 0.75, h: 0.3, cx: 0.5, cy: 0.64,
        stops: [
          { color: 'rgba(255,236,208,0.85)', pos: 0 },
          { color: 'rgba(255,236,208,0)', pos: 0.7 },
        ],
      },
      {
        kind: 'linear',
        stops: [
          { color: '#C7C1D1', pos: 0 },
          { color: '#DCC6BC', pos: 0.38 },
          { color: '#F1DCC4', pos: 0.66 },
          { color: '#F3DFC6', pos: 1 },
        ],
      },
    ],
  },
  {
    // Sumrak — dusk: deep indigo sky, last warm light at the bottom.
    id: 'sumrak', name: 'Sumrak', a: '#2A2440', b: '#1C1930', ink: '#ECE7F2', dark: true, premium: true,
    layers: [
      {
        kind: 'radial', w: 0.8, h: 0.35, cx: 0.5, cy: 1.02,
        stops: [
          { color: 'rgba(224,158,132,0.28)', pos: 0 },
          { color: 'rgba(224,158,132,0)', pos: 0.65 },
        ],
      },
      {
        kind: 'linear',
        stops: [
          { color: '#211E33', pos: 0 },
          { color: '#2B2542', pos: 0.55 },
          { color: '#4B3A55', pos: 0.88 },
          { color: '#59435C', pos: 1 },
        ],
      },
    ],
  },
  {
    // Planina — cool sky fading into haze, two soft ridges in the mist.
    id: 'planina', name: 'Planina', a: '#EDF1F5', b: '#C4D2DD', ink: '#2E3944', dark: false, premium: true,
    layers: [
      {
        kind: 'radial', w: 0.7, h: 0.38, cx: 0.18, cy: 1.04,
        stops: [
          { color: 'rgba(84,104,122,0.45)', pos: 0 },
          { color: 'rgba(84,104,122,0)', pos: 0.6 },
        ],
      },
      {
        kind: 'radial', w: 0.8, h: 0.45, cx: 0.82, cy: 1.08,
        stops: [
          { color: 'rgba(104,124,142,0.35)', pos: 0 },
          { color: 'rgba(104,124,142,0)', pos: 0.62 },
        ],
      },
      {
        kind: 'radial', w: 1.2, h: 0.3, cx: 0.5, cy: 1,
        stops: [
          { color: 'rgba(140,158,172,0.3)', pos: 0 },
          { color: 'rgba(140,158,172,0)', pos: 0.7 },
        ],
      },
      {
        kind: 'linear',
        stops: [
          { color: '#EDF1F5', pos: 0 },
          { color: '#D9E2EA', pos: 0.6 },
          { color: '#C4D2DD', pos: 1 },
        ],
      },
    ],
  },
  {
    // Žar — dark charcoal with a strong amber ember at the very bottom.
    id: 'zar', name: 'Žar', a: '#1D1D1C', b: '#17150F', ink: '#EDEAE3', dark: true, premium: true,
    layers: [
      {
        kind: 'radial', w: 0.8, h: 0.45, cx: 0.5, cy: 1.02,
        stops: [
          { color: 'rgba(226,158,84,0.5)', pos: 0 },
          { color: 'rgba(216,148,78,0.16)', pos: 0.48 },
          { color: 'rgba(216,148,78,0)', pos: 0.74 },
        ],
      },
      {
        kind: 'radial', w: 0.36, h: 0.18, cx: 0.5, cy: 1.01,
        stops: [
          { color: 'rgba(255,196,120,0.5)', pos: 0 },
          { color: 'rgba(255,196,120,0)', pos: 0.75 },
        ],
      },
      {
        kind: 'linear',
        stops: [
          { color: '#1D1D1C', pos: 0 },
          { color: '#17150F', pos: 1 },
        ],
      },
    ],
  },
  {
    // Pesak — warm dunes: soft tonal shapes low, bright light up top.
    id: 'pesak', name: 'Pesak', a: '#F4E8D3', b: '#E6D2AF', ink: '#4A3B28', dark: false, premium: true,
    layers: [
      {
        kind: 'radial', w: 0.95, h: 0.42, cx: 0.12, cy: 0.92,
        stops: [
          { color: 'rgba(199,166,120,0.42)', pos: 0 },
          { color: 'rgba(199,166,120,0)', pos: 0.62 },
        ],
      },
      {
        kind: 'radial', w: 1.1, h: 0.48, cx: 0.95, cy: 1.04,
        stops: [
          { color: 'rgba(180,144,98,0.38)', pos: 0 },
          { color: 'rgba(180,144,98,0)', pos: 0.6 },
        ],
      },
      {
        kind: 'radial', w: 0.8, h: 0.35, cx: 0.5, cy: -0.08,
        stops: [
          { color: 'rgba(255,248,235,0.8)', pos: 0 },
          { color: 'rgba(255,248,235,0)', pos: 0.55 },
        ],
      },
      {
        kind: 'linear',
        stops: [
          { color: '#F4E8D3', pos: 0 },
          { color: '#E6D2AF', pos: 1 },
        ],
      },
    ],
  },
  {
    // Magla — three broad, soft bands of white morning fog.
    id: 'magla', name: 'Magla', a: '#EDF1F1', b: '#D5DCDD', ink: '#333B3C', dark: false, premium: true,
    layers: [
      {
        kind: 'radial', w: 1.4, h: 0.14, cx: 0.5, cy: 0.38,
        stops: [
          { color: 'rgba(255,255,255,0.85)', pos: 0 },
          { color: 'rgba(255,255,255,0)', pos: 1 },
        ],
      },
      {
        kind: 'radial', w: 1.5, h: 0.16, cx: 0.5, cy: 0.62,
        stops: [
          { color: 'rgba(255,255,255,0.7)', pos: 0 },
          { color: 'rgba(255,255,255,0)', pos: 1 },
        ],
      },
      {
        kind: 'radial', w: 1.6, h: 0.18, cx: 0.5, cy: 0.86,
        stops: [
          { color: 'rgba(255,255,255,0.55)', pos: 0 },
          { color: 'rgba(255,255,255,0)', pos: 1 },
        ],
      },
      {
        kind: 'linear',
        stops: [
          { color: '#EDF1F1', pos: 0 },
          { color: '#D5DCDD', pos: 1 },
        ],
      },
    ],
  },
  {
    // Papir — rough kraft paper: crossed grain plus soft light and shade.
    id: 'papir', name: 'Papir', a: '#F7F2E7', b: '#EBE3D0', ink: '#3D372C', dark: false, premium: true,
    layers: [
      { kind: 'grain', angle: 65, color: 'rgba(120,104,76,0.035)', on: 1, off: 2 },
      { kind: 'grain', angle: -25, color: 'rgba(120,104,76,0.03)', on: 1, off: 3 },
      {
        kind: 'radial', w: 0.6, h: 0.4, cx: 0.28, cy: 0.22,
        stops: [
          { color: 'rgba(255,255,255,0.5)', pos: 0 },
          { color: 'rgba(255,255,255,0)', pos: 0.6 },
        ],
      },
      {
        kind: 'radial', w: 0.8, h: 0.6, cx: 0.78, cy: 0.92,
        stops: [
          { color: 'rgba(168,148,110,0.14)', pos: 0 },
          { color: 'rgba(168,148,110,0)', pos: 0.55 },
        ],
      },
      {
        kind: 'linear',
        stops: [
          { color: '#F7F2E7', pos: 0 },
          { color: '#EBE3D0', pos: 1 },
        ],
      },
    ],
  },
  {
    // Maslina — dark olive: leafy light at the top, deep shade below.
    id: 'maslina', name: 'Maslina', a: '#262C21', b: '#161B12', ink: '#E7EBDA', dark: true, premium: true,
    layers: [
      {
        kind: 'radial', w: 0.8, h: 0.4, cx: 0.5, cy: -0.08,
        stops: [
          { color: 'rgba(209,224,175,0.16)', pos: 0 },
          { color: 'rgba(209,224,175,0)', pos: 0.6 },
        ],
      },
      {
        kind: 'radial', w: 0.7, h: 0.32, cx: 0.5, cy: 1.06,
        stops: [
          { color: 'rgba(0,0,0,0.5)', pos: 0 },
          { color: 'rgba(0,0,0,0)', pos: 0.6 },
        ],
      },
      {
        kind: 'linear',
        stops: [
          { color: '#29301F', pos: 0 },
          { color: '#161B12', pos: 1 },
        ],
      },
    ],
  },
];

export const DEFAULT_THEME_ID = 'linen';

export function getTheme(id: string): AppTheme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

export function isThemeFree(id: string): boolean {
  return !getTheme(id).premium;
}
