import { FREE_LIMITS } from '@/constants/appConfig';

/**
 * Visual themes. Backgrounds are gradients with an optional soft "glow"
 * accent — no photography, everything is generated locally.
 *
 * The first FREE_LIMITS.themes entries in THEMES are free; the rest are
 * premium. Reorder the array to change which themes are free.
 */
export interface AppTheme {
  id: string;
  name: string;
  /** Background gradient stops, top → bottom. */
  gradient: [string, string, ...string[]];
  /** Soft radial glow color drawn behind the affirmation (transparent-capable). */
  glow: string;
  /** Main affirmation text color. */
  text: string;
  /** Secondary/label text color on the hero background. */
  subtle: string;
  /** Whether the hero background is dark (drives status-bar style). */
  dark: boolean;
  /** Surface tokens for list/settings screens so the whole app matches. */
  surface: {
    background: string;
    card: string;
    border: string;
    text: string;
    subtext: string;
    accent: string;
  };
}

const darkSurface = {
  background: '#15161D',
  card: '#1F212B',
  border: '#2C2E3A',
  text: '#F2F1EC',
  subtext: '#9DA0AE',
  accent: '#D8C9A3',
};

const lightSurface = {
  background: '#F7F4EE',
  card: '#FFFFFF',
  border: '#E5E0D5',
  text: '#23241F',
  subtext: '#7B7A72',
  accent: '#5B6650',
};

export const THEMES: AppTheme[] = [
  {
    id: 'midnight',
    name: 'Ponoć',
    gradient: ['#12131C', '#1B1D2E', '#252137'],
    glow: 'rgba(120, 110, 200, 0.16)',
    text: '#F0EEE6',
    subtle: 'rgba(240, 238, 230, 0.55)',
    dark: true,
    surface: darkSurface,
  },
  {
    id: 'warm_sand',
    name: 'Topli pesak',
    gradient: ['#F3EADC', '#EBDCC4', '#E2CBA8'],
    glow: 'rgba(255, 255, 255, 0.45)',
    text: '#3D3428',
    subtle: 'rgba(61, 52, 40, 0.55)',
    dark: false,
    surface: lightSurface,
  },
  {
    id: 'minimal_light',
    name: 'Svetlo',
    gradient: ['#FAF9F6', '#F3F1EC'],
    glow: 'rgba(0, 0, 0, 0.02)',
    text: '#26261F',
    subtle: 'rgba(38, 38, 31, 0.5)',
    dark: false,
    surface: lightSurface,
  },
  {
    id: 'forest',
    name: 'Šuma',
    gradient: ['#17251E', '#1E332A', '#27412F'],
    glow: 'rgba(140, 190, 140, 0.12)',
    text: '#EDF2E9',
    subtle: 'rgba(237, 242, 233, 0.55)',
    dark: true,
    surface: darkSurface,
  },
  {
    id: 'lavender',
    name: 'Lavanda',
    gradient: ['#E9E4F2', '#DDD4EC', '#CFC2E3'],
    glow: 'rgba(255, 255, 255, 0.4)',
    text: '#3A3247',
    subtle: 'rgba(58, 50, 71, 0.55)',
    dark: false,
    surface: lightSurface,
  },
  {
    id: 'sunrise',
    name: 'Svitanje',
    gradient: ['#F6E3D3', '#F2CDB4', '#E8AE93'],
    glow: 'rgba(255, 245, 230, 0.5)',
    text: '#46312A',
    subtle: 'rgba(70, 49, 42, 0.55)',
    dark: false,
    surface: lightSurface,
  },
  {
    id: 'ocean',
    name: 'Okean',
    gradient: ['#0F1E2A', '#14293A', '#1B3A4E'],
    glow: 'rgba(110, 180, 210, 0.14)',
    text: '#EAF2F4',
    subtle: 'rgba(234, 242, 244, 0.55)',
    dark: true,
    surface: darkSurface,
  },
  {
    id: 'minimal_dark',
    name: 'Tamno',
    gradient: ['#121212', '#181818'],
    glow: 'rgba(255, 255, 255, 0.03)',
    text: '#EDEBE4',
    subtle: 'rgba(237, 235, 228, 0.5)',
    dark: true,
    surface: darkSurface,
  },
];

export const DEFAULT_THEME_ID = THEMES[0].id;

export function getTheme(id: string): AppTheme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

export function isThemeFree(id: string): boolean {
  const index = THEMES.findIndex((t) => t.id === id);
  return index >= 0 && index < FREE_LIMITS.themes;
}
