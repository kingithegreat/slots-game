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
- **PAUA 🐚 scatter** pays anywhere on total bet; 3+ triggers free spins
  (bonus round ships in Phase 3).
- Scatters are spaced ≥3 apart on each strip so one window never shows two.

Verify the maths after any paytable/strip change:

```sh
node src/engine/simulate.js 2000000
```

Current tuning (independent 2M-spin runs):

| Metric | Value | Target |
| --- | --- | --- |
| RTP | 93.1–93.4% | 92–96% |
| Hit frequency | ~38% | ~35% |
| Free-spins trigger | 1 in ~107 spins | ~1 in 104 |
| Max observed win | 237× total bet | — |

## Roadmap

- [x] **Phase 1 — Core slot engine**: maths core, RTP sim, React grid UI,
  spin loop with staggered reel stops, coin balance + bet sizing
- [ ] Phase 2 — Feel & polish: anticipation stops, win celebration tiers,
  sound (Tone.js) + haptics
- [ ] Phase 3 — Feature spins: free spins bonus, pick-a-box mini game
- [ ] Phase 4 — Retention & economy: daily bonus wheel, level/XP, second machine
- [ ] Phase 5 — Monetisation: rewarded ads, coin pack IAP, piggy bank
- [ ] Phase 6 — Ship: Capacitor Android build, Play Store listing, analytics
