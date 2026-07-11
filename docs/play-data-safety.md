# Play Console — Data Safety answers (Pokie Palace)

Fill these into the Play Console **Data safety** form. Answers reflect the
shipped build: no first-party collection, AdMob advertising SDK present.

## Does your app collect or share any of the required user data types?
**Yes** — via the Google AdMob SDK (advertising). The app itself has no
backend and collects nothing first-party.

## Data types (collected by AdMob, shared with Google as an ad network)

| Data type | Collected | Shared | Purpose | Processed by |
|---|---|---|---|---|
| Device or other IDs (advertising ID) | Yes | Yes | Advertising / marketing | Google AdMob |
| App activity (in-app interactions) | Yes | Yes | Advertising, analytics | Google AdMob |
| App info & performance (diagnostics) | Yes | No | Analytics | Google AdMob |
| Approx. location (from IP) | Yes | Yes | Advertising | Google AdMob |

- **Is all collected data encrypted in transit?** Yes (AdMob uses HTTPS).
- **Do you provide a way to request data deletion?** No account/first-party
  data exists; on-device data is removed by uninstalling. Advertising-ID
  reset is available in Android system settings.
- **Is data collection required, or can users opt out?** Rewarded ads are
  optional; ad personalisation can be limited via Android Ads settings.

## Ads declaration (App content → Ads)
**Yes, this app contains ads.**

## Target audience & content
- Target age: **not** directed to children; select adult age band(s).
- Content rating questionnaire: simulated gambling (social casino, no real
  money) → expect a Mature / 17+ rating (e.g. ESRB Teen+/Mature, PEGI 18,
  or the equivalent for simulated gambling in your territory).

## Before production
- [ ] Swap Google **test** ad unit IDs for real AdMob IDs (env vars
      `VITE_ADMOB_APP_ID`, `VITE_ADMOB_REWARDED_UNIT_ID`,
      `VITE_ADMOB_INTERSTITIAL_UNIT_ID`) — see `src/ads.js`.
- [ ] Link the AdMob app to this Play listing in the AdMob console.
