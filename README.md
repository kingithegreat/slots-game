# 🎰 Pokie Palace — NZ Social Slots Game

A social casino slots game with an NZ-native theme — pōhutukawa, tiki, kiwi and
pāua shell symbols.

**Virtual coins only.** Coins can never be cashed out or exchanged for anything
of real-world value (one-way flow: entertainment only). Same model as Coin
Master / Slotomania; store listings use a simulated-gambling content rating.

## Stack

React 19 + Vite + Zustand (localStorage persistence). Capacitor, Tone.js,
AdMob and Google Play Billing arrive in later phases.

## Run it

```sh
npm install
npm run dev      # local dev server
npm run build    # production build to dist/
```

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

Verify the maths after any paytable/strip change:

```sh
node src/engine/simulate.js 2000000
```

Current tuning (independent 2M-spin runs, full game cycle):

| Metric | Value | Target |
| --- | --- | --- |
| RTP combined | 94.0–94.5% | 92–96% |
| — base game | ~75.4% | — |
| — free spins | ~15.6% | — |
| — pick-a-box | ~3.2% | — |
| Hit frequency (base) | ~38% | ~35% |
| Free-spins trigger | 1 in ~107 spins | ~1 in 104 |
| Pick-a-box trigger | 1 in ~345 spins | — |
| Max observed win | 278× total bet | — |

## Roadmap

- [x] **Phase 1 — Core slot engine**: maths core, RTP sim, React grid UI,
  spin loop with staggered reel stops, coin balance + bet sizing
- [x] **Phase 2 — Feel & polish**: anticipation holds on the last reel when a
  feature is one symbol away, win celebration tiers (chime / coin fountain /
  full-screen mega takeover with counter roll-up), synthesized sound design
  (Tone.js, no audio assets) with mute toggle, vibration haptics
- [x] **Phase 3 — Feature spins**: auto-running free spins (×2 multiplier,
  retriggers, survive a reload), Tiki Trio pick-a-box mini game
- [ ] Phase 4 — Retention & economy: daily bonus wheel, level/XP, second machine
- [ ] Phase 5 — Monetisation: rewarded ads, coin pack IAP, piggy bank
- [ ] Phase 6 — Ship: Capacitor Android build, Play Store listing, analytics
