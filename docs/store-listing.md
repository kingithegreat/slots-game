# 🎰 Pokie Palace — Play Store Launch Pack (draft)

Draft for the Phase 6 Play Console listing. Sync to Notion when the
connector is back.

## Basics

- **App name:** Pokie Palace — NZ Slots
- **Package:** `nz.pokiepalace.app`
- **Type:** Game · **Category:** Casino
- **Content rating:** complete the IARC questionnaire and declare
  **simulated gambling** (no real-money gambling, no cash-out). Expect a
  Teen/Mature-adjacent rating depending on region — same as Slotomania/Coin
  Master.
- **Ads / IAP declarations:** none at launch; MUST be updated to "contains
  ads" + "in-app purchases" when Phase 5 (AdMob + Play Billing) ships.

## Short description (≤80 chars)

> Kiwi-as slots! Spin pāua, tiki & kiwi reels. Free coins daily. No cash-out.

## Full description

Kia ora! Welcome to **Pokie Palace** — the slots game that actually feels
like home. No pyramids, no fruit machines: spin reels packed with pāua
shells, pōhutukawa, silver ferns, koru, tiki and one very cheeky kiwi.

🎰 **Two machines, one palace**
- **Pōhutukawa Beach** — sunny coastal spins to get you started
- **Glowworm Grotto** — unlock at level 5 for bigger wins in the dark

🐚 **Features on features**
- FREE SPINS — land 3+ pāua for 10 free spins with ALL WINS DOUBLED
- TIKI TRIO — three tiki open the pick-a-box bonus, up to 50× your bet
- Mega win celebrations, coin fountains and proper poker-machine feel

🎁 **Free coins, all day**
- Daily bonus wheel and hourly top-ups
- Level up as you play to unlock more

**Virtual coins only.** Coins are for entertainment, have no real-world
value, and can never be cashed out or exchanged. Pokie Palace is a social
casino game intended for adult players; it does not offer real-money
gambling or opportunities to win real money or prizes. Practice or success
at social casino gaming does not imply future success at real-money
gambling.

## Keywords / tags

pokies, slots, social casino, NZ, New Zealand, kiwi, pāua, free spins,
casino games, coin games

## Asset checklist

- [ ] App icon 512×512 (tiki + gold on pāua teal)
- [ ] Feature graphic 1024×500
- [ ] 4–8 phone screenshots (base game, free spins, Tiki Trio, mega win,
  daily wheel, Glowworm Grotto)
- [ ] Privacy policy URL (host `docs/privacy-policy.md` — see that file)

## Pre-launch checklist

- [ ] Signing key generated + Play App Signing enrolled
- [ ] `versionCode`/`versionName` set in `android/app/build.gradle`
- [ ] Release build: `npm run build && npx cap sync android && cd android && ./gradlew bundleRelease`
- [ ] Data-safety form (currently: no data collected — update with Phase 5)
- [ ] Update ads/IAP declarations when Phase 5 ships
