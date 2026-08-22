# Sebi — Content + Personalization Integration Pack

This pack is the source of truth for the new onboarding and affirmation personalization work.

## Files

- `sebi_content_personalized_v1_1460.json`
  - 1,460 original Serbian Latin messages.
  - Includes the existing category/subcategory metadata plus personalization tags.

- `sebi_onboarding_personalization_v2.json`
  - Final onboarding structure for this implementation.
  - Reminder frequency is intentionally NOT part of onboarding.

- `sebi_personalization_scoring_v1.md`
  - Recommended ranking / feed personalization logic.
  - Signals are boosts, not hard filters.

- `sebi_personalization_v1_coverage.md`
  - Coverage report showing where the existing corpus is strong/weak.

- `sebi_content_FINAL_1460.json`
  - Clean pre-personalization final content corpus.
  - Keep as reference / backup.

- `sebi_content_FINAL_QA.md`
  - Final editorial QA results for the 1,460-message corpus.

- `sebi_content_bible_v1.md`
  - Editorial rules and tone guide.

## Final onboarding order

1. Age range
2. Goals — up to 3
3. Current challenges — up to 2
4. Life context — up to 2
5. Address mode — neutral / masculine / feminine
6. Delivery style — one choice
7. Personalized result / first message

No reminder-frequency step.

## Important product rules

- Do not ask for notification permission during onboarding.
- Do not ask the user to choose a notification time during onboarding.
- The app may later prompt for reminders only after the user has experienced some value.
- Age and life context are soft personalization signals, never hard filters.
- Current challenge and selected goals are the strongest content signals.
- Do not diagnose or imply ADHD, anxiety disorder, depression, or another medical condition.
- `hard_days` content must remain low-pressure and non-judgmental.
- Existing functionality outside this onboarding/content work should be preserved.
