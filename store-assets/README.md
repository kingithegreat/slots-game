# Store assets — Pokie Palace

## Screenshots (5, Google Play compliant)

Generated **headlessly from the real game** — no device, no emulator, no mockups.
Every frame is a genuine state produced by actually playing the built app.

| File | Shows |
|---|---|
| `01-lobby-level6.png` | Seeded to a real mid-progression player: **LV 6** (so both machines are unlocked), daily wheel ready, hourly bonus, piggy bank, 4-day streak, 8,450 balance |
| `02-reels-spinning.png` | Mid-spin, reels in motion |
| `03-win-1060-coins.png` | **A real 1,060-coin win** — landed by the actual RNG engine, not staged |
| `04-glowworm-grotto.png` | The second machine (unlocks at level 5) |
| `05-paytable.png` | Paytable — shows the game has depth |

All 1080×1920 portrait (correct for this phone-shaped UI). Play requires
320–3840px per side with the long edge ≤2× the short edge.

Note frame 01 includes the responsible-gambling disclaimer ("Virtual coins only.
Coins have no real-world value and cannot be cashed out") — worth keeping visible
in the store listing, since simulated-gambling apps get extra review scrutiny.

## Regenerating

```bash
npm ci && npm run build
python3 tools/generate-store-screenshots.py
```

**Why it seeds state first:** a slots game screenshotted at its default starting
state looks dead — one locked machine, no streak, no piggy bank, empty win field.
The script seeds a level-6 player (a state any real player reaches), then spins
for real and captures whichever spin actually lands the biggest win. Nothing is
faked; the losing spins just aren't shipped.

## Still needed before submission

- [ ] **Feature graphic** (1024×500) — required by Play, not yet generated
