// RTP simulation for the Pokie Palace engine.
// Usage: node src/engine/simulate.js [spins]
// Verifies the maths model against the design targets:
//   RTP 92–96%, hit frequency ~35%, free spins ~1 in 100 spins.

import { playSpin, LINES } from './engine.js';

const spins = Number(process.argv[2]) || 1_000_000;
const betPerLine = 1;
const totalBet = betPerLine * LINES;

let totalWagered = 0;
let totalWon = 0;
let hits = 0;
let scatterTriggers = 0;
let maxWin = 0;
let lineWon = 0;
let scatterWon = 0;

for (let i = 0; i < spins; i++) {
  const r = playSpin(betPerLine);
  totalWagered += totalBet;
  totalWon += r.totalWin;
  scatterWon += r.scatter.win;
  lineWon += r.totalWin - r.scatter.win;
  if (r.totalWin > 0) hits++;
  if (r.freeSpinsAwarded > 0) scatterTriggers++;
  if (r.totalWin > maxWin) maxWin = r.totalWin;
}

const rtp = (totalWon / totalWagered) * 100;
console.log(`spins:            ${spins.toLocaleString()}`);
console.log(`RTP:              ${rtp.toFixed(2)}%  (target 92–96%)`);
console.log(`  line RTP:       ${((lineWon / totalWagered) * 100).toFixed(2)}%`);
console.log(`  scatter RTP:    ${((scatterWon / totalWagered) * 100).toFixed(2)}%`);
console.log(`hit frequency:    ${((hits / spins) * 100).toFixed(2)}%`);
console.log(`free spins:       1 in ${(spins / scatterTriggers).toFixed(0)} spins`);
console.log(`max win:          ${(maxWin / totalBet).toFixed(1)}x total bet`);
