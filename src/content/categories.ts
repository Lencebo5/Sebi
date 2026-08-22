import type { Category, CategoryId } from '@/models/types';

/**
 * Category catalogue, ordered as in the design's Kategorije screen.
 * `premium` is data-driven — flip a flag to change which categories are
 * free. "today" is a virtual category: its feed is built from the user's
 * goals in dailyContent.ts.
 */
export const CATEGORIES: Category[] = [
  {
    id: 'today',
    name: 'Za danas',
    description: 'Tvoj lični izbor za današnji dan',
    premium: false,
    goal: false,
  },
  {
    id: 'confidence',
    name: 'Samopouzdanje',
    description: 'Veruj sebi malo više nego juče',
    premium: false,
    goal: true,
  },
  {
    id: 'motivation',
    name: 'Motivacija',
    description: 'Za dane kada treba krenuti',
    premium: false,
    goal: true,
  },
  {
    id: 'self_love',
    name: 'Ljubav prema sebi',
    description: 'Budi blag prema sebi',
    premium: false,
    goal: true,
  },
  {
    id: 'calm',
    name: 'Mir i stres',
    goalName: 'Mir i manje stresa',
    description: 'Kada je svega previše',
    premium: false,
    goal: true,
  },
  {
    id: 'gratitude',
    name: 'Zahvalnost',
    description: 'Primeti ono što već imaš',
    premium: false,
    goal: false,
  },
  {
    id: 'work',
    name: 'Posao i uspeh',
    description: 'Fokus, granice i napredak',
    premium: true,
    goal: true,
  },
  {
    id: 'money',
    name: 'Novac',
    description: 'Mirniji odnos prema novcu',
    premium: true,
    goal: true,
  },
  {
    id: 'relationships',
    name: 'Odnosi',
    description: 'Bliskost, granice i razumevanje',
    premium: true,
    goal: true,
  },
  {
    id: 'habits',
    name: 'Zdravije navike',
    description: 'Mali koraci koji ostaju',
    premium: false,
    goal: true,
  },
  {
    id: 'hard_days',
    name: 'Teški dani',
    description: 'Kada ništa ne ide od ruke',
    premium: true,
    goal: false,
  },
  {
    id: 'sleep',
    name: 'Pred spavanje',
    description: 'Spusti dan i odmori se',
    premium: true,
    goal: false,
  },
  {
    id: 'morning',
    name: 'Dobro jutro',
    description: 'Miran i jasan početak dana',
    premium: false,
    goal: false,
  },
];

export function getCategory(id: CategoryId): Category {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0];
}

/** Order of the 2×4 goal grid in onboarding and "Moji ciljevi". */
const GOAL_ORDER: CategoryId[] = [
  'confidence',
  'motivation',
  'calm',
  'self_love',
  'work',
  'money',
  'relationships',
  'habits',
];

/** Categories offered as goals, in design order. */
export const GOAL_CATEGORIES = GOAL_ORDER.map((id) => getCategory(id)).filter((c) => c.goal);

/** Onboarding "How do you want to feel?" options. */
export const FEELING_OPTIONS = [
  { id: 'calmer', label: 'Smirenije' },
  { id: 'stronger', label: 'Snažnije' },
  { id: 'motivated', label: 'Motivisanije' },
  { id: 'grateful', label: 'Zahvalnije' },
  { id: 'confident', label: 'Sigurnije u sebe' },
] as const;
