// Pokie Palace — core slot engine (Phase 1)
//
// Maths model: weighted virtual reel strips. The RNG picks a stop position on
// each physical strip — it never picks outcomes. RTP is tuned by strip
// composition + paytable and verified by simulate.js (target band 92–96%).

export const ROWS = 3;
export const REELS = 5;
export const LINES = 20;

export const SYMBOLS = {
  KIWI: { id: 'KIWI', label: 'Kiwi', emoji: '🥝' },
  POHUTUKAWA: { id: 'POHUTUKAWA', label: 'Pōhutukawa', emoji: '🌺' },
  FERN: { id: 'FERN', label: 'Silver Fern', emoji: '🌿' },
  KORU: { id: 'KORU', label: 'Koru', emoji: '🌀' },
  A: { id: 'A', label: 'A', letter: 'A' },
  K: { id: 'K', label: 'K', letter: 'K' },
  Q: { id: 'Q', label: 'Q', letter: 'Q' },
  J: { id: 'J', label: 'J', letter: 'J' },
  TIKI: { id: 'TIKI', label: 'Tiki (Wild)', emoji: '🗿' },
  PAUA: { id: 'PAUA', label: 'Pāua (Scatter)', emoji: '🐚' },
};

export const WILD = 'TIKI'; // appears on reels 2–4 only, substitutes for all line symbols
export const SCATTER = 'PAUA'; // pays anywhere, on total bet; 3+ triggers free spins

// Line payouts, as multiples of bet-per-line, for 3 / 4 / 5 of a kind
// (left-to-right). Tuned via simulate.js — RTP 93.1–93.4% across independent
// 2M-spin runs (band 92–96%), hit frequency ~38%, free spins ~1 in 107.
export const PAYTABLE = {
  KIWI: [125, 500, 1600],
  POHUTUKAWA: [80, 240, 650],
  FERN: [50, 125, 400],
  KORU: [30, 80, 240],
  A: [17, 49, 160],
  K: [16, 41, 128],
  Q: [10, 33, 102],
  J: [6, 26, 82],
};

// Scatter payouts, as multiples of TOTAL bet, for 3 / 4 / 5 anywhere on grid.
export const SCATTER_PAYTABLE = { 3: 2, 4: 10, 5: 50 };
export const FREE_SPINS_TRIGGER_COUNT = 3;
export const FREE_SPINS_AWARDED = 10;

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

// Strip composition per reel (symbol -> count). Wild only on reels 2–4.
const STRIP_COUNTS = [
  { KIWI: 3, POHUTUKAWA: 4, FERN: 5, KORU: 6, A: 8, K: 9, Q: 10, J: 11, PAUA: 2 },
  { KIWI: 3, POHUTUKAWA: 4, FERN: 5, KORU: 6, A: 8, K: 8, Q: 9, J: 10, TIKI: 3, PAUA: 2 },
  { KIWI: 3, POHUTUKAWA: 4, FERN: 5, KORU: 6, A: 8, K: 8, Q: 9, J: 10, TIKI: 3, PAUA: 2 },
  { KIWI: 3, POHUTUKAWA: 4, FERN: 5, KORU: 6, A: 8, K: 8, Q: 9, J: 10, TIKI: 3, PAUA: 2 },
  { KIWI: 3, POHUTUKAWA: 4, FERN: 5, KORU: 6, A: 8, K: 9, Q: 10, J: 11, PAUA: 2 },
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

export const REEL_STRIPS = STRIP_COUNTS.map((counts, i) => buildStrip(counts, 0xc0ffee + i * 101));

/**
 * Spin: pick a stop position per reel, read ROWS consecutive symbols.
 * @param {() => number} rng - returns a float in [0, 1)
 * @returns {{ stops: number[], grid: string[][] }} grid[reel][row]
 */
export function spin(rng = Math.random) {
  const stops = REEL_STRIPS.map((strip) => Math.floor(rng() * strip.length));
  const grid = REEL_STRIPS.map((strip, r) =>
    Array.from({ length: ROWS }, (_, row) => strip[(stops[r] + row) % strip.length])
  );
  return { stops, grid };
}

/**
 * Evaluate a grid.
 * @param {string[][]} grid - grid[reel][row]
 * @param {number} betPerLine
 * @param {number} lines - number of active paylines (fixed at 20 in the game)
 * @returns {{
 *   totalWin: number,
 *   lineWins: Array<{ line: number, symbol: string, count: number, win: number, cells: Array<[number, number]> }>,
 *   scatter: { count: number, win: number, cells: Array<[number, number]> },
 *   freeSpinsAwarded: number,
 * }}
 */
export function evaluate(grid, betPerLine, lines = LINES) {
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
    const pays = PAYTABLE[symbol];
    if (!pays) continue;
    const win = pays[count - 3] * betPerLine;
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
  const scatterWin = (SCATTER_PAYTABLE[Math.min(scatterCount, 5)] || 0) * totalBet;

  const freeSpinsAwarded = scatterCount >= FREE_SPINS_TRIGGER_COUNT ? FREE_SPINS_AWARDED : 0;

  const totalWin = lineWins.reduce((sum, w) => sum + w.win, 0) + scatterWin;
  return {
    totalWin,
    lineWins,
    scatter: { count: scatterCount, win: scatterWin, cells: scatterCells },
    freeSpinsAwarded,
  };
}

/** Convenience: spin + evaluate in one call. */
export function playSpin(betPerLine, lines = LINES, rng = Math.random) {
  const { stops, grid } = spin(rng);
  const result = evaluate(grid, betPerLine, lines);
  return { stops, grid, ...result };
}
