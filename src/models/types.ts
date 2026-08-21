/** Category identifiers — stable keys used in content, preferences and routing. */
export type CategoryId =
  | 'today'
  | 'confidence'
  | 'motivation'
  | 'self_love'
  | 'calm'
  | 'gratitude'
  | 'work'
  | 'money'
  | 'relationships'
  | 'habits'
  | 'hard_days'
  | 'sleep'
  | 'morning';

export interface Affirmation {
  id: string;
  category: Exclude<CategoryId, 'today'>;
  text: string;
  premium: boolean;
  tags: string[];
}

export interface Category {
  id: CategoryId;
  /** User-facing name (Serbian Latin). */
  name: string;
  /** Short user-facing description. */
  description: string;
  premium: boolean;
  /** Whether the category can be picked as a goal during onboarding. */
  goal: boolean;
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
  onboardingCompleted: boolean;
  /** Category ids picked as goals during onboarding. */
  goals: CategoryId[];
  /** Desired feelings picked during onboarding (free-form keys). */
  feelings: string[];
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
  onboarding_completed: { goals: string[] };
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
