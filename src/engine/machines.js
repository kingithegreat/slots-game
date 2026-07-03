// Machine definitions — each is a reskin of the shared engine: its own
// symbols, paytable, strip composition and look. TIKI (wild) and PAUA
// (scatter) are shared across every machine, as are the feature rules.
//
// Every machine's maths must be verified with simulate.js after any change:
//   node src/engine/simulate.js 2000000 <machineId>

const ROYALS = {
  A: { id: 'A', label: 'A', letter: 'A' },
  K: { id: 'K', label: 'K', letter: 'K' },
  Q: { id: 'Q', label: 'Q', letter: 'Q' },
  J: { id: 'J', label: 'J', letter: 'J' },
};

const SHARED = {
  TIKI: { id: 'TIKI', label: 'Tiki (Wild)', emoji: '🗿' },
  PAUA: { id: 'PAUA', label: 'Pāua (Scatter)', emoji: '🐚' },
};

export const MACHINES = {
  // The original — combined RTP 94.0–94.5% over independent 2M-spin
  // full-cycle sims: base ~75.4% + free spins ~15.6% + pick-a-box ~3.2%.
  beach: {
    id: 'beach',
    name: 'Pōhutukawa Beach',
    tagline: 'Summer on the coast',
    unlockLevel: 1,
    symbols: {
      KIWI: { id: 'KIWI', label: 'Kiwi', emoji: '🥝' },
      POHUTUKAWA: { id: 'POHUTUKAWA', label: 'Pōhutukawa', emoji: '🌺' },
      FERN: { id: 'FERN', label: 'Silver Fern', emoji: '🌿' },
      KORU: { id: 'KORU', label: 'Koru', emoji: '🌀' },
      ...ROYALS,
      ...SHARED,
    },
    paytable: {
      KIWI: [100, 400, 1250],
      POHUTUKAWA: [65, 190, 500],
      FERN: [40, 100, 320],
      KORU: [25, 65, 190],
      A: [13, 40, 130],
      K: [13, 33, 100],
      Q: [8, 26, 80],
      J: [5, 21, 65],
    },
    stripCounts: [
      { KIWI: 3, POHUTUKAWA: 4, FERN: 5, KORU: 6, A: 8, K: 9, Q: 10, J: 11, PAUA: 2 },
      { KIWI: 3, POHUTUKAWA: 4, FERN: 5, KORU: 6, A: 8, K: 8, Q: 9, J: 10, TIKI: 3, PAUA: 2 },
      { KIWI: 3, POHUTUKAWA: 4, FERN: 5, KORU: 6, A: 8, K: 8, Q: 9, J: 10, TIKI: 3, PAUA: 2 },
      { KIWI: 3, POHUTUKAWA: 4, FERN: 5, KORU: 6, A: 8, K: 8, Q: 9, J: 10, TIKI: 3, PAUA: 2 },
      { KIWI: 3, POHUTUKAWA: 4, FERN: 5, KORU: 6, A: 8, K: 9, Q: 10, J: 11, PAUA: 2 },
    ],
    stripSeed: 0xc0ffee,
    theme: {
      '--machine': '#123242',
      '--machine-edge': '#2a6478',
      '--machine-deep': '#0c2230',
      '--reel-face': 'linear-gradient(180deg, #e8f4f8 0%, #b9d4de 50%, #e8f4f8 100%)',
      '--muted': '#9fc3d0',
    },
  },

  // Higher volatility night machine — bigger top pays, unlocked at level 5.
  grotto: {
    id: 'grotto',
    name: 'Glowworm Grotto',
    tagline: 'Deep in the caves',
    unlockLevel: 5,
    symbols: {
      TUATARA: { id: 'TUATARA', label: 'Tuatara', emoji: '🦎' },
      KEA: { id: 'KEA', label: 'Kea', emoji: '🦜' },
      GLOWWORM: { id: 'GLOWWORM', label: 'Glowworm', emoji: '✨' },
      POUNAMU: { id: 'POUNAMU', label: 'Pounamu', emoji: '💚' },
      ...ROYALS,
      ...SHARED,
    },
    paytable: {
      TUATARA: [140, 550, 2200],
      KEA: [70, 210, 560],
      GLOWWORM: [40, 100, 330],
      POUNAMU: [22, 60, 180],
      A: [12, 36, 120],
      K: [12, 30, 92],
      Q: [7, 24, 72],
      J: [5, 19, 58],
    },
    stripCounts: [
      { TUATARA: 3, KEA: 4, GLOWWORM: 5, POUNAMU: 6, A: 8, K: 9, Q: 10, J: 11, PAUA: 2 },
      { TUATARA: 3, KEA: 4, GLOWWORM: 5, POUNAMU: 6, A: 8, K: 8, Q: 9, J: 10, TIKI: 3, PAUA: 2 },
      { TUATARA: 3, KEA: 4, GLOWWORM: 5, POUNAMU: 6, A: 8, K: 8, Q: 9, J: 10, TIKI: 3, PAUA: 2 },
      { TUATARA: 3, KEA: 4, GLOWWORM: 5, POUNAMU: 6, A: 8, K: 8, Q: 9, J: 10, TIKI: 3, PAUA: 2 },
      { TUATARA: 3, KEA: 4, GLOWWORM: 5, POUNAMU: 6, A: 8, K: 9, Q: 10, J: 11, PAUA: 2 },
    ],
    stripSeed: 0x9e1da,
    theme: {
      '--machine': '#1b1440',
      '--machine-edge': '#4a3a8c',
      '--machine-deep': '#100b28',
      '--reel-face': 'linear-gradient(180deg, #e9e4fa 0%, #c3b8e8 50%, #e9e4fa 100%)',
      '--muted': '#b0a6d8',
    },
  },
};

export const MACHINE_IDS = Object.keys(MACHINES);
export const DEFAULT_MACHINE = 'beach';
