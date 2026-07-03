// Analytics event layer (Phase 6 prep). Events are buffered locally and
// mirrored to console.debug; swap in a real backend (Firebase/GA4) by
// calling setSink() — every event flows through it.
//
// Tracked per the plan: spin count, session length, coin sink/source
// balance, feature triggers, and ad/IAP conversion points.

const KEY = 'pokie-palace-analytics';
const BUFFER_CAP = 500;

const sessionId = `s${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
const sessionStart = Date.now();

let sink = null;

/** Route events to a real analytics backend (Firebase etc. in Phase 6). */
export function setSink(fn) {
  sink = fn;
}

function readBuffer() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
}

export function track(event, props = {}) {
  const entry = {
    event,
    ...props,
    sessionId,
    sessionSeconds: Math.round((Date.now() - sessionStart) / 1000),
    at: Date.now(),
  };
  try {
    const buffer = readBuffer();
    buffer.push(entry);
    if (buffer.length > BUFFER_CAP) buffer.splice(0, buffer.length - BUFFER_CAP);
    localStorage.setItem(KEY, JSON.stringify(buffer));
  } catch {
    /* storage full or unavailable — analytics must never break the game */
  }
  if (sink) {
    try {
      sink(entry);
    } catch {
      /* sink errors are the backend's problem, not the game's */
    }
  }
  if (import.meta.env?.DEV) console.debug('[analytics]', event, props);
}

/** Aggregate view of the local buffer — coin sink/source balance at a glance. */
export function getSummary() {
  const buffer = readBuffer();
  const spins = buffer.filter((e) => e.event === 'spin');
  const sum = (arr, k) => arr.reduce((n, e) => n + (e[k] || 0), 0);
  const count = (name) => buffer.filter((e) => e.event === name).length;
  return {
    events: buffer.length,
    spins: spins.length,
    coinsWagered: sum(spins.filter((e) => !e.isFree), 'bet'),
    coinsWon: sum(spins, 'win'),
    coinsFromClaims:
      sum(buffer.filter((e) => ['daily_wheel', 'hourly_claim', 'ad_reward', 'bonus_collect'].includes(e.event)), 'prize'),
    freeSpinTriggers: count('free_spins_trigger'),
    bonusTriggers: count('bonus_trigger'),
    outOfCoinsShown: count('out_of_coins_shown'),
    adRewards: count('ad_reward'),
    levelUps: count('level_up'),
  };
}
