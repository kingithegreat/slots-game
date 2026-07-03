// Pokie Palace — core slot engine.
//
// Maths model: weighted virtual reel strips. The RNG picks a stop position on
// each physical strip — it never picks outcomes. RTP is tuned per machine by
// strip composition + paytable (src/engine/machines.js) and verified by
// simulate.js (target band 92–96%).

import { MACHINES } from './machines.js';

export const ROWS = 3;
export const REELS = 5;
export const LINES = 20;

export const WILD = 'TIKI'; // appears on reels 2–4 only, substitutes for all line symbols
export const SCATTER = 'PAUA'; // pays anywhere, on total bet; 3+ triggers free spins

// Scatter payouts, as multiples of TOTAL bet, for 3 / 4 / 5 anywhere on grid.
export const SCATTER_PAYTABLE = { 3: 2, 4: 10, 5: 50 };
export const FREE_SPINS_TRIGGER_COUNT = 3;
export const FREE_SPINS_AWARDED = 10;
export const FREE_SPIN_MULTIPLIER = 2; // all wins doubled during free spins

// Pick-a-box bonus: a TIKI visible on each of reels 2, 3 AND 4 (base game
// only). Player picks one of three boxes; prizes are multiples of total bet.
export const BONUS_PRIZES = [
  { mult: 5, weight: 50 },
  { mult: 10, weight: 30 },
  { mult: 20, weight: 15 },
  { mult: 50, weight: 5 },
];

export function pickBonusPrize(rng = Math.random) {
  const total = BONUS_PRIZES.reduce((s, p) => s + p.weight, 0);
  let roll = rng() * total;
  for (const p of BONUS_PRIZES) {
    roll -= p.weight;
    if (roll < 0) return p.mult;
  }
  return BONUS_PRIZES[BONUS_PRIZES.length - 1].mult;
}

// 20 fixed paylines: row index (0 top, 1 middle, 2 bottom) per reel.
export const PAYLINES = [
  [1, 1, 1, 1, 1],
  [0, 0, 0, 0, 0],
  [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
  [0, 0, 1, 0, 0],
  [2, 2, 1, 2, 2],
  [1, 0, 0, 0, 1],
  [1, 2, 2, 2, 1],
  [1, 0, 1, 0, 1],
  [1, 2, 1, 2, 1],
  [0, 1, 0, 1, 0],
  [2, 1, 2, 1, 2],
  [1, 1, 0, 1, 1],
  [1, 1, 2, 1, 1],
  [0, 1, 1, 1, 0],
  [2, 1, 1, 1, 2],
  [0, 2, 0, 2, 0],
  [2, 0, 2, 0, 2],
  [0, 2, 2, 2, 0],
];

// Deterministic PRNG for strip layout only, so strips are identical on every
// load (spins use the injected RNG, Math.random by default).
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Scatters must sit at least ROWS positions apart (circularly) so a single
// window never shows two — keeps the free-spins trigger rate at ~1 in 100.
function scattersSpaced(strip) {
  const positions = [];
  strip.forEach((s, i) => {
    if (s === SCATTER) positions.push(i);
  });
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const d = Math.abs(positions[i] - positions[j]);
      if (Math.min(d, strip.length - d) < ROWS) return false;
    }
  }
  return true;
}

function buildStrip(counts, seed) {
  const base = [];
  for (const [sym, n] of Object.entries(counts)) {
    for (let i = 0; i < n; i++) base.push(sym);
  }
  // Fisher–Yates with a seeded PRNG for a stable layout; bump the seed until
  // the scatter-spacing constraint holds (deterministic, converges fast).
  for (let attempt = 0; ; attempt++) {
    const symbols = base.slice();
    const rand = mulberry32(seed + attempt);
    for (let i = symbols.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [symbols[i], symbols[j]] = [symbols[j], symbols[i]];
    }
    if (scattersSpaced(symbols)) return symbols;
  }
}

const stripCache = new Map();

/** Reel strips for a machine (built once, deterministic per machine). */
export function reelStrips(machine) {
  let strips = stripCache.get(machine.id);
  if (!strips) {
    strips = machine.stripCounts.map((counts, i) => buildStrip(counts, machine.stripSeed + i * 101));
    stripCache.set(machine.id, strips);
  }
  return strips;
}

/**
 * Spin: pick a stop position per reel, read ROWS consecutive symbols.
 * @param {object} machine - a MACHINES entry
 * @param {() => number} rng - returns a float in [0, 1)
 * @returns {{ stops: number[], grid: string[][] }} grid[reel][row]
 */
export function spin(machine, rng = Math.random) {
  const strips = reelStrips(machine);
  const stops = strips.map((strip) => Math.floor(rng() * strip.length));
  const grid = strips.map((strip, r) =>
    Array.from({ length: ROWS }, (_, row) => strip[(stops[r] + row) % strip.length])
  );
  return { stops, grid };
}

/**
 * Evaluate a grid against a machine's paytable.
 * @param {object} machine - a MACHINES entry
 * @param {string[][]} grid - grid[reel][row]
 * @param {number} betPerLine
 * @param {number} lines - number of active paylines (fixed at 20 in the game)
 * @param {object} [opts]
 * @param {number} [opts.multiplier=1] - applied to line + scatter wins (free spins)
 * @param {boolean} [opts.allowBonus=true] - pick-a-box can trigger (base game only)
 * @returns {{
 *   totalWin: number,
 *   lineWins: Array<{ line: number, symbol: string, count: number, win: number, cells: Array<[number, number]> }>,
 *   scatter: { count: number, win: number, cells: Array<[number, number]> },
 *   freeSpinsAwarded: number,
 *   bonusTriggered: boolean,
 *   wildCells: Array<[number, number]>,
 * }}
 */
export function evaluate(machine, grid, betPerLine, lines = LINES, opts = {}) {
  const { multiplier = 1, allowBonus = true } = opts;
  const paytable = machine.paytable;
  const totalBet = betPerLine * lines;
  const lineWins = [];

  for (let li = 0; li < lines; li++) {
    const line = PAYLINES[li];
    // First non-wild symbol along the line determines the paying symbol.
    let symbol = null;
    let count = 0;
    for (let r = 0; r < REELS; r++) {
      const s = grid[r][line[r]];
      if (s === SCATTER) break; // scatter never pays on lines
      if (s === WILD) {
        count++;
        continue;
      }
      if (symbol === null) {
        symbol = s;
        count++;
      } else if (s === symbol) {
        count++;
      } else {
        break;
      }
    }
    // A run of only wilds can't happen on lines (no wild on reel 1), so a
    // null symbol means the line started with a scatter — no win.
    if (symbol === null || count < 3) continue;
    const pays = paytable[symbol];
    if (!pays) continue;
    const win = pays[count - 3] * betPerLine * multiplier;
    if (win > 0) {
      lineWins.push({
        line: li,
        symbol,
        count,
        win,
        cells: line.slice(0, count).map((row, r) => [r, row]),
      });
    }
  }

  const scatterCells = [];
  for (let r = 0; r < REELS; r++) {
    for (let row = 0; row < ROWS; row++) {
      if (grid[r][row] === SCATTER) scatterCells.push([r, row]);
    }
  }
  const scatterCount = scatterCells.length;
  const scatterWin =
    (SCATTER_PAYTABLE[Math.min(scatterCount, 5)] || 0) * totalBet * multiplier;

  const freeSpinsAwarded = scatterCount >= FREE_SPINS_TRIGGER_COUNT ? FREE_SPINS_AWARDED : 0;

  const wildCells = [];
  for (let r = 0; r < REELS; r++) {
    for (let row = 0; row < ROWS; row++) {
      if (grid[r][row] === WILD) wildCells.push([r, row]);
    }
  }
  // TIKI trio: at least one wild visible on each of reels 2, 3 and 4.
  const bonusTriggered =
    allowBonus && [1, 2, 3].every((r) => grid[r].includes(WILD));

  const totalWin = lineWins.reduce((sum, w) => sum + w.win, 0) + scatterWin;
  return {
    totalWin,
    lineWins,
    scatter: { count: scatterCount, win: scatterWin, cells: scatterCells },
    freeSpinsAwarded,
    bonusTriggered,
    wildCells,
  };
}

/** Convenience: spin + evaluate in one call. */
export function playSpin(machine, betPerLine, lines = LINES, rng = Math.random, opts = {}) {
  const { stops, grid } = spin(machine, rng);
  const result = evaluate(machine, grid, betPerLine, lines, opts);
  return { stops, grid, ...result };
}

export { MACHINES };
