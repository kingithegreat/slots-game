// Full game-cycle RTP simulation for the Pokie Palace engine — base spins,
// free spins (x2 multiplier, retriggers) and the pick-a-box bonus, mirroring
// exactly what the UI pays.
//
// Usage: node src/engine/simulate.js [paidSpins] [machineId|all]
// Targets: combined RTP 92–96%, hit frequency ~35%, free spins ~1 in 100.

import { playSpin, pickBonusPrize, LINES, FREE_SPIN_MULTIPLIER } from './engine.js';
import { MACHINES, MACHINE_IDS } from './machines.js';

const paidSpins = Number(process.argv[2]) || 1_000_000;
const which = process.argv[3] || 'all';
const betPerLine = 1;
const totalBet = betPerLine * LINES;

function simulate(machine) {
  let totalWagered = 0;
  let baseWon = 0;
  let freeSpinWon = 0;
  let bonusWon = 0;
  let hits = 0;
  let freeSpinTriggers = 0;
  let retriggers = 0;
  let bonusTriggers = 0;
  let totalFreeSpins = 0;
  let maxWin = 0;

  for (let i = 0; i < paidSpins; i++) {
    const r = playSpin(machine, betPerLine);
    totalWagered += totalBet;
    baseWon += r.totalWin;
    if (r.totalWin > 0) hits++;
    if (r.totalWin > maxWin) maxWin = r.totalWin;

    if (r.bonusTriggered) {
      bonusTriggers++;
      bonusWon += pickBonusPrize() * totalBet;
    }

    if (r.freeSpinsAwarded > 0) {
      freeSpinTriggers++;
      let remaining = r.freeSpinsAwarded;
      while (remaining > 0) {
        remaining--;
        totalFreeSpins++;
        const f = playSpin(machine, betPerLine, LINES, Math.random, {
          multiplier: FREE_SPIN_MULTIPLIER,
          allowBonus: false,
        });
        freeSpinWon += f.totalWin;
        if (f.totalWin > maxWin) maxWin = f.totalWin;
        if (f.freeSpinsAwarded > 0) {
          retriggers++;
          remaining += f.freeSpinsAwarded;
        }
      }
    }
  }

  const totalWon = baseWon + freeSpinWon + bonusWon;
  const pct = (x) => ((x / totalWagered) * 100).toFixed(2) + '%';

  console.log(`=== ${machine.name} (${machine.id}) — ${paidSpins.toLocaleString()} paid spins`);
  console.log(`RTP (combined):    ${pct(totalWon)}  (target 92–96%)`);
  console.log(`  base game:       ${pct(baseWon)}`);
  console.log(`  free spins:      ${pct(freeSpinWon)}`);
  console.log(`  pick-a-box:      ${pct(bonusWon)}`);
  console.log(`hit frequency:     ${((hits / paidSpins) * 100).toFixed(2)}% (base spins)`);
  console.log(`free spins:        1 in ${(paidSpins / freeSpinTriggers).toFixed(0)} spins, ${(totalFreeSpins / freeSpinTriggers).toFixed(1)} avg spins/trigger, ${retriggers} retriggers`);
  console.log(`pick-a-box:        1 in ${(paidSpins / bonusTriggers).toFixed(0)} spins`);
  console.log(`max single win:    ${(maxWin / totalBet).toFixed(1)}x total bet`);
  console.log('');
}

const ids = which === 'all' ? MACHINE_IDS : [which];
for (const id of ids) {
  if (!MACHINES[id]) {
    console.error(`Unknown machine "${id}". Known: ${MACHINE_IDS.join(', ')}`);
    process.exit(1);
  }
  simulate(MACHINES[id]);
}
