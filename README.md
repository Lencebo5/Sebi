# Danas

Aplikacija za dnevne afirmacije na srpskom jeziku (latinica). "Danas" je radno
ime — finalno ime se menja u `src/constants/appConfig.ts` i `app.json`.

Jedna misao dnevno, lepe teme, podsetnici, favoriti i deljenje — bez naloga,
bez servera. Sve se čuva lokalno na uređaju.

## Tehnologije

- **Expo SDK 57** / React Native 0.86 / TypeScript (strict)
- **Expo Router** — file-based navigacija (`src/app/`)
- **AsyncStorage** — lokalna perzistencija (podešavanja, favoriti, streak)
- **Expo Notifications** — lokalno zakazani podsetnici (bez servera)
- **RevenueCat** (`react-native-purchases`) — pretplate, iza apstrakcije sa
  mock/dev režimom
- **react-native-view-shot + expo-sharing** — generisanje share kartice
  1080×1350

## Pokretanje

```bash
npm install
npm start          # Expo dev server (QR kod za Expo Go)
npm run android    # otvori na Android uređaju/emulatoru
npm run ios        # otvori na iOS-u (potreban macOS)
```

Provere:

```bash
npx tsc --noEmit   # TypeScript
npm run lint       # ESLint
```

U **Expo Go** aplikacija radi u celosti sa mock pretplatama (kupovina odmah
"uspe" i čuva se lokalno). Za prave pretplate je potreban development build
(`npx expo run:ios` / `run:android` ili EAS), jer RevenueCat ima nativni kod.

## Struktura

```
src/
  app/                 # rute (Expo Router)
    _layout.tsx        #   provideri, fontovi, raspored notifikacija
    onboarding.tsx     #   onboarding u 5 koraka
    paywall.tsx        #   premium ekran (modal)
    viewer/[categoryId].tsx  # full-screen prikaz kategorije/favorita
    (tabs)/            #   Danas · Kategorije · Omiljene · Podešavanja
    settings/          #   ciljevi, podsetnici, izgled
  components/          # UI komponente (AffirmationExperience je centralna)
  content/             # afirmacije i kategorije — sadržaj odvojen od UI
  models/              # TypeScript modeli
  services/            # storage, notifikacije, pretplate, deljenje, analitika
  state/               # PreferencesContext, SubscriptionContext
  theme/               # teme (themes.ts) i dizajn tokeni (tokens.ts)
  constants/           # appConfig.ts — ime, limiti, ključevi, URL-ovi
```

## Konfiguracija

- **RevenueCat**: upiši javne API ključeve u `REVENUECAT_API_KEYS`
  (`src/constants/appConfig.ts`). Dok su prazni, koristi se mock adapter.
  Entitlement u RevenueCat-u mora da se zove `premium`, a offering treba da
  ima `annual` i `monthly` pakete. Cene na paywall-u dolaze iz prodavnice —
  ništa nije hardkodovano.
- **Premium kategorije**: `premium` flag u `src/content/categories.ts`.
- **Besplatne teme**: prve 3 u nizu `THEMES` (`src/theme/themes.ts`);
  limiti su u `FREE_LIMITS` (`src/constants/appConfig.ts`).
- **Novi sadržaj**: dodaj afirmacije u `src/content/affirmations.ts`
  (id-jevi su stabilni — ne menjati postojeće).
- **Pravne stranice i store linkovi**: `PRIVACY_URL`, `TERMS_URL`,
  `APP_STORE_URL`, `PLAY_STORE_URL` u `appConfig.ts` — zameniti pre objave.

## Kako rade notifikacije

Lokalne notifikacije ne mogu da biraju novu afirmaciju u trenutku okidanja,
pa se unapred zakazuje narednih 7 dana (svaki termin sa drugom afirmacijom).
Raspored se ponovo gradi pri svakom otvaranju aplikacije i pri svakoj promeni
podešavanja. Besplatan plan: 1 podsetnik dnevno; Premium: do 10.

## Analitika

`src/services/analytics.ts` je tanka apstrakcija — u razvoju loguje u
konzolu. Pravi provajder se kasnije priključuje kroz `setAnalyticsSink`.
