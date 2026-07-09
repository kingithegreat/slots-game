// Daily login streak (Phase 6 engagement): consecutive daily-wheel claims
// escalate a small multiplier on the wheel prize, capping at STREAK_CAP days.
//
// A claim continues the streak when it lands within STREAK_RESET_MS of the
// previous claim — a full extra day of grace on top of the 24h wheel cooldown,
// so "come back tomorrow" keeps the run alive but skipping a whole day resets
// it. All logic here is pure (no store, no localStorage) so it runs under
// `node --test`, matching the repo's node:test convention (see
// analytics-sink.test.js).

const DAY_MS = 24 * 60 * 60 * 1000;

// The multiplier stops growing once the streak reaches this many days.
export const STREAK_CAP = 7;

// Miss window: if more than this elapses since the last claim, the streak
// resets to 1. 48h = the 24h cooldown plus a full day of slack.
export const STREAK_RESET_MS = 2 * DAY_MS;

// Extra prize per streak day, before the cap (10% per day).
export const STREAK_STEP = 0.1;

/**
 * Multiplier applied to the daily wheel prize for a given streak length.
 * Day 1 = ×1.00, Day 2 = ×1.10 … Day 7+ = ×1.60 (capped at STREAK_CAP).
 * @param {number} streak - 1-based streak length
 * @returns {number} multiplier ≥ 1
 */
export function streakMultiplier(streak) {
  const capped = Math.min(Math.max(streak, 1), STREAK_CAP);
  return 1 + STREAK_STEP * (capped - 1);
}

/**
 * The streak length a claim *right now* would produce, given the last claim
 * time and the current streak. A missing/zero last-claim (first ever) or a
 * lapse of at least STREAK_RESET_MS starts a fresh streak at 1; otherwise the
 * streak increments by one.
 * @param {number} lastClaim - epoch ms of the previous claim (0 if never)
 * @param {number} currentStreak - stored streak length
 * @param {number} now - epoch ms of the claim being made
 * @returns {number} the new streak length (≥ 1)
 */
export function nextStreakValue(lastClaim, currentStreak, now) {
  if (!lastClaim) return 1;
  if (now - lastClaim >= STREAK_RESET_MS) return 1;
  return (currentStreak || 0) + 1;
}
