/** Category identifiers — stable keys used in content, preferences and routing. */
export type CategoryId =
  | 'today'
  | 'confidence'
  | 'motivation'
  | 'self_love'
  | 'calm'
  | 'gratitude'
  | 'work_success'
  | 'money'
  | 'relationships'
  | 'healthy_habits'
  | 'hard_days'
  | 'bedtime'
  | 'morning';

/** Categories that carry content ("today" is a virtual personalized feed). */
export type ContentCategoryId = Exclude<CategoryId, 'today'>;

// ── Content metadata vocabulary (from the v1.1 personalization corpus) ──

export type StyleType = 'direct' | 'ja' | 'perspective';
export type MessageLength = 'short' | 'medium' | 'long';
export type TimeOfDay = 'any' | 'morning' | 'evening' | 'night';
export type EmotionalIntensity = 'gentle' | 'balanced' | 'activating';

export type NeedTag =
  | 'worry_overthinking'
  | 'focus_attention'
  | 'emotional_overwhelm'
  | 'low_energy_motivation'
  | 'self_criticism'
  | 'loneliness_disconnection'
  | 'stress_overload'
  | 'difficult_period';

export type LifeContext =
  | 'student_early_career'
  | 'career_business'
  | 'relationship'
  | 'family_children'
  | 'major_change'
  | 'focus_on_self';

export type AgeRange = '18_24' | '25_34' | '35_44' | '45_54' | '55_plus';

export type DeliveryStyle = 'gentle' | 'direct' | 'motivational' | 'grounded';

export type AddressMode = 'neutral' | 'masculine' | 'feminine';

export interface AffirmationPersonalization {
  /** Current-challenge tags — the strongest short-term signal. */
  needTags: NeedTag[];
  /** Soft boost only, never a filter. */
  lifeContextAffinity: LifeContext[];
  /** Soft boost only, never a filter. */
  ageAffinity: AgeRange[];
  deliveryStyles: DeliveryStyle[];
  emotionalIntensity: EmotionalIntensity;
  /** Which address modes the text is written for (v1.1 corpus: all neutral). */
  addressModes: AddressMode[];
  primaryGoalEligible: boolean;
}

export interface Affirmation {
  id: string;
  /** Approved editorial content — never rewritten or generated at runtime. */
  text: string;
  category: ContentCategoryId;
  subcategory: string;
  styleType: StyleType;
  length: MessageLength;
  tone: string;
  timeOfDay: TimeOfDay[];
  charCount: number;
  /**
   * Entitlement flag, normalized at load time to the app's category-level
   * Free/Premium configuration — the imported per-message flag is ignored.
   */
  premium: boolean;
  /** Editorial pipeline stage of the source message. */
  status: string;
  editorialFlags?: string[];
  /** v2 audit verdict for messages carried over from the v1 corpus. */
  editorialStatus?: string;
  /** Segment a targeted v2 message was written for (metadata only —
   * selection happens exclusively through the scoring signals). */
  targetSegment?: string;
  /** Editorial provenance, when present. */
  source?: string;
  personalization: AffirmationPersonalization;
}

export interface Category {
  id: CategoryId;
  /** User-facing name (Serbian Latin). */
  name: string;
  /** Label in the goal grid when it differs from the category name. */
  goalName?: string;
  /** Short user-facing description. */
  description: string;
  premium: boolean;
  /** Whether the category can be picked as a goal during onboarding. */
  goal: boolean;
}

// ── Personalization profile (persisted locally, no backend) ──

export interface PersonalizationProfile {
  /** Optional — stored only as a range, never a birth date. */
  ageRange?: AgeRange;
  /** Selected goal categories, 1–3. */
  goals: CategoryId[];
  /** Current challenges, 1–2. Experiences, not diagnoses. */
  currentChallenges: NeedTag[];
  /** Life contexts, 0–2. */
  lifeContexts: LifeContext[];
  addressMode: AddressMode;
  deliveryStyle: DeliveryStyle | 'mixed';
}

export interface NotificationSettings {
  enabled: boolean;
  /** Times of day as "HH:MM" (24h), sorted, unique. */
  times: string[];
}

export interface StreakState {
  current: number;
  longest: number;
  /** Local calendar date "YYYY-MM-DD" of the last counted open. */
  lastActiveDate: string | null;
}

export interface Preferences {
  /** Persisted-schema version; bump alongside migrations in PreferencesContext. */
  version: 2;
  onboardingCompleted: boolean;
  profile: PersonalizationProfile;
  themeId: string;
  notifications: NotificationSettings;
}

export type SubscriptionPlan = 'monthly' | 'annual';

export interface PlanOffering {
  plan: SubscriptionPlan;
  /** Localized price string coming from the store (e.g. "3,99 €"). */
  priceString: string;
  /** Localized price of the annual plan expressed per month, when available. */
  perMonthPriceString?: string;
}

export interface AnalyticsEventMap {
  app_open: undefined;
  onboarding_started: undefined;
  onboarding_age_selected: { ageRange: string | 'skipped' };
  onboarding_goals_selected: { goals: string[] };
  onboarding_challenges_selected: { challenges: string[] };
  onboarding_life_context_selected: { contexts: string[] };
  onboarding_address_mode_selected: { mode: string };
  onboarding_style_selected: { style: string };
  onboarding_completed: { goals: string[]; challenges: string[] };
  affirmation_viewed: { id: string; category: string };
  affirmation_favorited: { id: string };
  affirmation_shared: { id: string };
  category_opened: { category: string };
  notification_enabled: { times: number };
  paywall_viewed: { source: string };
  subscription_started: { plan: string };
  subscription_restored: undefined;
}

export type AnalyticsEvent = keyof AnalyticsEventMap;
