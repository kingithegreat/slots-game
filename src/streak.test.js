// Plain node:test suite (repo convention — no test runner configured; see
// analytics-sink.test.js). Run directly:
//
//   node --test src/streak.test.js
//
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STREAK_CAP,
  STREAK_RESET_MS,
  STREAK_STEP,
  streakMultiplier,
  nextStreakValue,
} from './streak.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

test('streakMultiplier: day 1 is ×1.0, then +10% per day', () => {
  assert.equal(streakMultiplier(1), 1);
  assert.equal(Math.round(streakMultiplier(2) * 100) / 100, 1.1);
  assert.equal(Math.round(streakMultiplier(3) * 100) / 100, 1.2);
});

test('streakMultiplier: caps at STREAK_CAP', () => {
  const capped = streakMultiplier(STREAK_CAP);
  assert.equal(Math.round(capped * 100) / 100, Math.round((1 + STREAK_STEP * (STREAK_CAP - 1)) * 100) / 100);
  // Anything beyond the cap does not grow further.
  assert.equal(streakMultiplier(STREAK_CAP + 1), capped);
  assert.equal(streakMultiplier(100), capped);
});

test('streakMultiplier: never drops below ×1 for junk/low input', () => {
  assert.equal(streakMultiplier(0), 1);
  assert.equal(streakMultiplier(-5), 1);
});

test('nextStreakValue: first ever claim starts at 1', () => {
  assert.equal(nextStreakValue(0, 0, Date.now()), 1);
});

test('nextStreakValue: claiming the next day continues the streak', () => {
  const last = 1_000_000_000_000;
  // 25h later — past the 24h cooldown, well within the 48h reset window.
  assert.equal(nextStreakValue(last, 3, last + DAY_MS + HOUR), 4);
});

test('nextStreakValue: just under the reset window still continues', () => {
  const last = 1_000_000_000_000;
  assert.equal(nextStreakValue(last, 5, last + STREAK_RESET_MS - 1), 6);
});

test('nextStreakValue: a lapse at/over the reset window resets to 1', () => {
  const last = 1_000_000_000_000;
  assert.equal(nextStreakValue(last, 5, last + STREAK_RESET_MS), 1);
  assert.equal(nextStreakValue(last, 9, last + 5 * DAY_MS), 1);
});

test('nextStreakValue: missing current streak is treated as 0', () => {
  const last = 1_000_000_000_000;
  assert.equal(nextStreakValue(last, undefined, last + DAY_MS + HOUR), 1);
});
