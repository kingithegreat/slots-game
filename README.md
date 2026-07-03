# 🎰 Pokie Palace — NZ Social Slots Game

A social casino slots game with an NZ-native theme — pōhutukawa, tiki, kiwi and
pāua shell symbols.

**Virtual coins only.** Coins can never be cashed out or exchanged for anything
of real-world value (one-way flow: entertainment only). Same model as Coin
Master / Slotomania; store listings use a simulated-gambling content rating.

## Stack

React 19 + Vite + Zustand (localStorage persistence) + Tone.js (synthesized
audio) + Capacitor (Android shell). AdMob and Google Play Billing arrive in
Phase 5.

## Run it

```sh
npm install
npm run dev      # local dev server
npm run build    # production build to dist/
```

### Android (Capacitor)

The `android/` project is scaffolded (`appId: nz.pokiepalace.app`). With an
Android SDK installed:

```sh
npm run build && npx cap sync android
npx cap open android   # or: cd android && ./gradlew assembleDebug
```

Haptics automatically use the native Capacitor plugin inside the shell and
fall back to the Web Vibration API in browsers.

### Analytics

`src/analytics.js` buffers events locally (spin count, session length, coin
sink/source, feature triggers, ad/IAP conversion points) and mirrors them to
`console.debug` in dev. Wire a real backend in Phase 6 with `setSink(fn)` —
every event flows through it. `getSummary()` aggregates the local buffer.

## Machines

Two machines share the engine (`src/engine/machines.js`) — each has its own
symbols, paytable, strip composition and colour theme:

| Machine | Unlock | Feel |
| --- | --- | --- |
| 🌺 Pōhutukawa Beach | Level 1 | The original, coastal teal |
| ✨ Glowworm Grotto | Level 5 | Higher top pays, cave purple |

## Economy (Phase 4)

- **Level/XP**: wagering earns XP 1:1; each level needs `1200 × level`.
  Level 5 unlocks Glowworm Grotto.
- **Daily bonus wheel**: one spin per 24h, 8 segments, prizes scale with level.
- **Hourly top-up**: level-scaled free coins every hour.
- **Out-of-coins flow**: rewarded-ad stub (+50k after a 5s placeholder — AdMob
  replaces it in Phase 5) and a display-only coin-pack shop.

## Maths model (`src/engine/`)

- **Weighted virtual reel strips** (58 symbols per reel) — the RNG picks stop
  positions, never outcomes.
- **3×5 grid, 20 fixed paylines**, evaluated left-to-right with wild
  substitution. TIKI 🗿 wild appears on reels 2–4 only.
- **PAUA 🐚 scatter** pays anywhere on total bet; 3+ awards 10 free spins with
  **all wins ×2** (retriggers add 10 more).
- **Tiki Trio pick-a-box bonus**: a TIKI on each of reels 2, 3 and 4 opens a
  three-box pick, prizes 5×–50× total bet.
- Scatters are spaced ≥3 apart on each strip so one window never shows two.

Verify the maths after any paytable/strip change (per machine or `all`):

```sh
node src/engine/simulate.js 2000000 all
```

Current tuning (independent 2M-spin full-cycle runs per machine):

| Metric | Beach | Grotto | Target |
| --- | --- | --- | --- |
| RTP combined | 94.0–94.5% | ~94.6% | 92–96% |
| — base game | ~75.4% | ~75.1% | — |
| — free spins | ~15.6% | ~15.4% | — |
| — pick-a-box | ~3.2% | ~4.1% | — |
| Hit frequency (base) | ~38% | ~38% | ~35% |
| Free-spins trigger | 1 in ~107 | 1 in ~107 | ~1 in 104 |
| Pick-a-box trigger | 1 in ~345 | 1 in ~270 | — |

## Roadmap

- [x] **Phase 1 — Core slot engine**: maths core, RTP sim, React grid UI,
  spin loop with staggered reel stops, coin balance + bet sizing
- [x] **Phase 2 — Feel & polish**: anticipation holds on the last reel when a
  feature is one symbol away, win celebration tiers (chime / coin fountain /
  full-screen mega takeover with counter roll-up), synthesized sound design
  (Tone.js, no audio assets) with mute toggle, vibration haptics
- [x] **Phase 3 — Feature spins**: auto-running free spins (×2 multiplier,
  retriggers, survive a reload), Tiki Trio pick-a-box mini game
- [x] **Phase 4 — Retention & economy**: daily bonus wheel, hourly top-up,
  level/XP progression, second themed machine (Glowworm Grotto), out-of-coins
  flow with rewarded-ad stub + coin-shop preview
- [ ] Phase 5 — Monetisation: rewarded ads (AdMob), coin pack IAP, piggy-bank
  smash purchase (accrual of 5% of every win is already live)
- [ ] Phase 6 — Ship: Play Store listing + signed release build (Capacitor
  Android scaffold, native haptics and the analytics event layer are done;
  remaining: signing key, store listing, analytics backend via `setSink`)
