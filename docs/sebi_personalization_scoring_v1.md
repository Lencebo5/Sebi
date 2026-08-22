# Sebi — Personalization scoring v1

## Principle
Personalization should feel relevant without trapping a user inside a narrow feed.

The user's answers are **signals**, not hard filters. Most neutral messages remain eligible.

## Signal priority

1. **Current challenge** — strongest short-term signal
2. **Selected goal categories** — strongest long-term signal
3. **Life context** — contextual boost
4. **Time of day** — contextual boost
5. **Preferred delivery style** — tone boost
6. **Age range** — small soft boost only
7. **Address mode** — eligibility for future masculine/feminine variants, never a psychological stereotype

## Suggested score

Start every eligible message at `0`.

- `+7` if `category` is one of the user's selected goals
- `+8` for each matching `personalization.needTags` current challenge
- `+3` if `lifeContextAffinity` matches
- `+2` if `ageAffinity` matches
- `+3` if `deliveryStyles` contains the selected delivery style
- `+3` if `timeOfDay` matches the current period
- `+2` for a contextual category (`morning`, `bedtime`, `hard_days`) when context strongly calls for it
- `-100` if the message is in recent history
- `-8` if the exact subcategory was shown in either of the previous 2 messages
- `-5` if the same category was shown 3 times in a row

Then choose randomly from the top-scoring pool rather than always taking rank #1.

Recommended:
1. calculate score for all eligible messages
2. take top 20–35 candidates
3. weighted-random sample among them

This keeps the feed personal but prevents it from becoming repetitive.

## Important combinations

### User selected `difficult_period`
- strongly boost `hard_days`
- boost `gentle` and `grounded`
- suppress `activating` messages unless the user also selected `motivational`
- do not force gratitude content
- avoid messaging that implies the user simply needs more discipline

### User selected `low_energy_motivation`
Prefer:
- small steps
- low-pressure return
- rest without guilt
- realistic routine
- gentle motivation

Avoid repeatedly serving:
- aggressive productivity messages
- "push harder" framing
- shame-based discipline

### User selected `worry_overthinking`
Prefer:
- uncertainty
- what can/cannot be controlled
- present moment
- postponing unnecessary late-night analysis
- distinguishing facts from predictions

### User selected `focus_attention`
Prefer:
- one task
- reduced distractions
- environment
- priorities
- small concrete starts

Do **not** imply ADHD diagnosis.

### User selected `emotional_overwhelm`
Prefer:
- pause before reacting
- naming boundaries
- allowing emotion without making it a verdict
- conflict de-escalation
- reducing pressure

### User selected `self_criticism`
Prefer:
- believable self-talk
- mistakes without identity labels
- boundaries
- body neutrality
- self-worth independent of output

### User selected `loneliness_disconnection`
Prefer:
- honest reaching out
- closeness
- being understood
- relationship quality
- asking for support

Do not imply that loneliness is solved simply by "thinking positively."

### User selected `stress_overload`
Prefer:
- reducing scope
- boundaries
- rest
- priorities
- not treating everything as urgent

## Delivery style

### `gentle`
Supportive, low-pressure, emotionally safe.
Especially suitable for difficult periods, low energy, evenings.

### `direct`
Shorter, clearer, firmer messages.
Do not make "direct" mean rude or shaming.

### `motivational`
Action-oriented, momentum, small steps, discipline, starting again.

### `grounded`
Realistic perspective shifts, no hype, no grand promises.

### `mixed`
Do not apply a style boost; keep normal diversity.

## Age range
Age is deliberately a **small boost**.

Never infer:
- relationship status
- parenthood
- income
- career success
- health
from age alone.

Life-context answers are more important than age.

## Address mode
The existing 1,460-message base is neutral and can be shown to everyone.

If the user chooses:
- masculine
- feminine

future targeted variants may use natural Serbian gendered forms such as:
- `Ponosan sam...`
- `Ponosna sam...`

But content topics must **not** be selected based on gender stereotypes.

## Feed diversity rules

Within the recent window:
- no exact repeat for at least 20 messages
- avoid same subcategory twice in a row
- avoid same category more than 3 times in a row
- mix short / medium / long
- mix direct / first-person / perspective constructions
- do not show multiple heavy `hard_days` messages in a row unless the user explicitly chose a difficult-period focus

## Re-personalization
Users should be able to change:
- goals
- current challenges
- life context
- delivery style
- address mode
- reminders

from Settings without repeating onboarding.
