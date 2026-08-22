import type {
  AddressMode,
  AgeRange,
  DeliveryStyle,
  LifeContext,
  NeedTag,
} from '@/models/types';

/**
 * Onboarding and settings option catalogue, taken from
 * `sebi_onboarding_personalization_v2.json` (docs/SEBI_INTEGRATION_README.md).
 * Labels are approved copy — do not reword.
 *
 * Challenge options describe current experiences, not medical conditions —
 * never present them as diagnoses.
 */

export const MAX_GOALS = 3;
export const MAX_CHALLENGES = 2;
export const MAX_LIFE_CONTEXTS = 2;

export const AGE_OPTIONS: { id: AgeRange; label: string }[] = [
  { id: '18_24', label: '18–24' },
  { id: '25_34', label: '25–34' },
  { id: '35_44', label: '35–44' },
  { id: '45_54', label: '45–54' },
  { id: '55_plus', label: '55+' },
];

export const CHALLENGE_OPTIONS: { id: NeedTag; label: string; description: string }[] = [
  {
    id: 'worry_overthinking',
    label: 'Previše brinem i razmišljam',
    description: 'Teško mi je da isključim misli i opustim se.',
  },
  {
    id: 'focus_attention',
    label: 'Teško mi je da se fokusiram',
    description: 'Pažnja mi lako odluta i teško završavam ono što započnem.',
  },
  {
    id: 'emotional_overwhelm',
    label: 'Emocije me lako preplave',
    description: 'Teško mi je da se smirim kada me nešto pogodi.',
  },
  {
    id: 'low_energy_motivation',
    label: 'Nedostaje mi volje i energije',
    description: 'Teško mi je da se pokrenem i stvari mi često deluju teže nego inače.',
  },
  {
    id: 'self_criticism',
    label: 'Previše pritiskam sebe',
    description: 'Često imam osećaj da ne radim dovoljno ili da moram više.',
  },
  {
    id: 'loneliness_disconnection',
    label: 'Osećam se usamljeno ili neshvaćeno',
    description: 'Fali mi više bliskosti, podrške ili osećaja da me neko razume.',
  },
  {
    id: 'stress_overload',
    label: 'Imam previše stresa i obaveza',
    description: 'Teško mi je da usporim i odvojim vreme za sebe.',
  },
  {
    id: 'difficult_period',
    label: 'Nešto teško mi se trenutno dešava',
    description: 'Prolazim kroz promenu, gubitak, raskid, problem ili težak period.',
  },
];

export const LIFE_CONTEXT_OPTIONS: { id: LifeContext; label: string }[] = [
  { id: 'student_early_career', label: 'Studiram ili sam na početku karijere' },
  { id: 'career_business', label: 'Posao ili karijera su mi sada važni' },
  { id: 'relationship', label: 'U vezi ili braku sam' },
  { id: 'family_children', label: 'Imam porodicu i decu' },
  { id: 'major_change', label: 'Prolazim kroz veliku promenu' },
  { id: 'focus_on_self', label: 'Želim više da se fokusiram na sebe' },
];

/** "Ništa od ovoga" is exclusive: selecting it clears every real context. */
export const LIFE_CONTEXT_NONE_LABEL = 'Ništa od ovoga';

export const ADDRESS_MODE_OPTIONS: {
  id: AddressMode;
  label: string;
  description?: string;
}[] = [
  { id: 'neutral', label: 'Neutralno', description: 'Preporučeno' },
  { id: 'masculine', label: 'U muškom rodu' },
  { id: 'feminine', label: 'U ženskom rodu' },
];

export const DELIVERY_STYLE_OPTIONS: {
  id: DeliveryStyle | 'mixed';
  label: string;
  description?: string;
}[] = [
  { id: 'gentle', label: 'Nežno i podržavajuće' },
  { id: 'direct', label: 'Direktno i kratko' },
  { id: 'motivational', label: 'Motivaciono' },
  { id: 'grounded', label: 'Realno i prizemno' },
  { id: 'mixed', label: 'Mešano', description: 'Od svega pomalo' },
];
