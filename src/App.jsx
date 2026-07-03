import { useEffect, useRef, useState } from 'react';
import {
  REELS,
  LINES,
  SCATTER,
  WILD,
  FREE_SPIN_MULTIPLIER,
  spin,
  playSpin,
} from './engine/engine.js';
import { MACHINES, MACHINE_IDS } from './engine/machines.js';
import { useGameStore, BET_STEPS, xpForNextLevel, HOUR_MS, hourlyAmount } from './store.js';
import * as sound from './sound.js';
import { haptics } from './haptics.js';
import Reel from './components/Reel.jsx';
import RollUp from './components/RollUp.jsx';
import Paytable from './components/Paytable.jsx';
import WinCelebration from './components/WinCelebration.jsx';
import PickABox from './components/PickABox.jsx';
import DailyWheel from './components/DailyWheel.jsx';
import OutOfCoins from './components/OutOfCoins.jsx';
import './App.css';

const FIRST_STOP_MS = 900; // reel 1 stops here...
const STAGGER_MS = 280; // ...then one reel every 280ms
const ANTICIPATION_MS = 1600; // extra spin time when a feature is one reel away
const FREE_SPIN_GAP_MS = 1150; // pause between auto free spins

function tierFor(win, totalBet) {
  if (win <= 0) return null;
  const mult = win / totalBet;
  if (mult >= 25) return 'mega';
  if (mult >= 5) return 'big';
  return 'small';
}

export default function App() {
  const balance = useGameStore((s) => s.balance);
  const betIndex = useGameStore((s) => s.betIndex);
  const lastWin = useGameStore((s) => s.lastWin);
  const muted = useGameStore((s) => s.muted);
  const freeSpinsLeft = useGameStore((s) => s.freeSpinsLeft);
  const machineId = useGameStore((s) => s.machineId);
  const level = useGameStore((s) => s.level);
  const xp = useGameStore((s) => s.xp);

  const machine = MACHINES[machineId];
  const betPerLine = BET_STEPS[betIndex];
  const totalBet = betPerLine * LINES;

  // Grid is tagged with its machine — on a machine switch the reset happens
  // during render, so old symbols never render against the new symbol set.
  const [gridState, setGridState] = useState(() => ({ machineId, grid: spin(machine).grid }));
  if (gridState.machineId !== machineId) {
    setGridState({ machineId, grid: spin(machine).grid });
  }
  const grid = gridState.grid;
  const setGrid = (updater) =>
    setGridState((gs) => ({ ...gs, grid: typeof updater === 'function' ? updater(gs.grid) : updater }));
  const [spinningReels, setSpinningReels] = useState(() => Array(REELS).fill(false));
  const [anticipatingReel, setAnticipatingReel] = useState(null);
  const [highlights, setHighlights] = useState(new Set());
  const [message, setMessage] = useState({ text: 'Kia ora! Place your bet and spin', tier: '' });
  const [busy, setBusy] = useState(false);
  const [celebration, setCelebration] = useState(null); // { tier, amount }
  const [bonusBet, setBonusBet] = useState(null); // total bet of the triggering spin
  const [inFreeSession, setInFreeSession] = useState(false);
  const [showWheel, setShowWheel] = useState(false);
  const [showOutOfCoins, setShowOutOfCoins] = useState(false);
  const [clock, setClock] = useState(Date.now()); // for claim countdowns

  const timers = useRef([]);
  const freeTotalRef = useRef(0);
  // Ref mirrors inFreeSession for the async spin flow — timeout callbacks
  // capture stale state, the ref is always current.
  const freeSessionRef = useRef(false);
  // The machine free spins were triggered on — switching is blocked during a
  // session, but a reload could land elsewhere; spins must use this machine.
  const machineRef = useRef(machine);
  machineRef.current = machine;
  const paytableRef = useRef(null);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => sound.setMuted(muted), [muted]);
  useEffect(() => {
    const t = setInterval(() => setClock(Date.now()), 20_000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (freeSpinsLeft > 0 && !busy && !inFreeSession) {
      setMessage({
        text: `🐚 ${freeSpinsLeft} free spins waiting — press SPIN`,
        tier: 'jackpot',
      });
    }
    // Resume prompt on reload only; the running session manages its own text.
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));

  function setFreeSession(active) {
    freeSessionRef.current = active;
    setInFreeSession(active);
    if (active) freeTotalRef.current = 0;
  }

  const store = useGameStore.getState();
  const dailyReady = store.dailyReady(clock);
  const hourlyReady = store.hourlyReady(clock);
  const hourlyWaitMin = Math.ceil((HOUR_MS - (clock - useGameStore((s) => s.lastHourlyClaim))) / 60_000);

  const canSpin = !busy && bonusBet === null && (freeSpinsLeft > 0 || balance >= totalBet);
  const broke = balance < BET_STEPS[0] * LINES && freeSpinsLeft === 0;

  function handleSpinClick() {
    if (!canSpin) return;
    sound.unlock();
    if (freeSpinsLeft > 0) {
      if (!freeSessionRef.current) setFreeSession(true);
      runSpin(true);
    } else {
      runSpin(false);
    }
  }

  function runSpin(isFree) {
    const s = useGameStore.getState();
    const m = machineRef.current;
    const bet = isFree ? s.freeSpinBet : BET_STEPS[s.betIndex];
    const spinTotalBet = bet * LINES;

    if (isFree) s.useFreeSpin();
    else {
      if (!s.placeBet()) return;
      const levelsGained = s.grantXp(spinTotalBet);
      if (levelsGained > 0) {
        const newLevel = useGameStore.getState().level;
        later(() => {
          sound.winBig();
          setMessage({ text: `⬆️ LEVEL ${newLevel}! ${MACHINES.grotto.unlockLevel === newLevel ? 'Glowworm Grotto unlocked!' : ''}`, tier: 'jackpot' });
        }, 300);
      }
    }

    const result = playSpin(
      m,
      bet,
      LINES,
      Math.random,
      isFree ? { multiplier: FREE_SPIN_MULTIPLIER, allowBonus: false } : {}
    );

    setBusy(true);
    setHighlights(new Set());
    setCelebration(null);
    setMessage(
      isFree
        ? { text: `FREE SPIN ×${FREE_SPIN_MULTIPLIER} — ${useGameStore.getState().freeSpinsLeft} left after this`, tier: 'jackpot' }
        : { text: 'Good luck…', tier: '' }
    );
    setSpinningReels(Array(REELS).fill(true));
    sound.spinStart();

    // Anticipation: hold the last reel when a feature is one symbol away.
    // Scatter (needs 3 anywhere) checks reels 1–4; TIKI trio checks reels 2+3.
    const scattersFirst4 = result.grid
      .slice(0, 4)
      .reduce((n, col) => n + col.filter((sym) => sym === SCATTER).length, 0);
    let anticipateTarget = null;
    if (scattersFirst4 >= 2) anticipateTarget = 4;
    else if (!isFree && result.grid[1].includes(WILD) && result.grid[2].includes(WILD))
      anticipateTarget = 3;

    const delays = [];
    for (let r = 0; r < REELS; r++) {
      delays[r] = FIRST_STOP_MS + r * STAGGER_MS;
      if (anticipateTarget !== null && r >= anticipateTarget) delays[r] += ANTICIPATION_MS;
    }

    for (let r = 0; r < REELS; r++) {
      later(() => {
        setGrid((g) => g.map((col, i) => (i === r ? result.grid[r] : col)));
        setSpinningReels((sp) => sp.map((v, i) => (i === r ? false : v)));
        sound.reelStop(r);
        haptics.reelStop();
        if (result.grid[r].includes(SCATTER)) sound.scatterLand();
        if (anticipateTarget !== null && r === anticipateTarget - 1) {
          setAnticipatingReel(anticipateTarget);
          sound.anticipation();
        }
      }, delays[r]);
    }

    later(() => settle(result, isFree, spinTotalBet), delays[REELS - 1] + 380);
  }

  function settle(result, isFree, spinTotalBet) {
    const s = useGameStore.getState();
    setAnticipatingReel(null);
    sound.spinEnd();

    const cells = new Set(
      [
        ...result.lineWins.flatMap((w) => w.cells),
        ...result.scatter.cells,
        ...(result.bonusTriggered ? result.wildCells : []),
      ].map(([reel, row]) => `${reel},${row}`)
    );
    setHighlights(cells);

    if (isFree) {
      s.addWin(result.totalWin);
      freeTotalRef.current += result.totalWin;
    } else {
      s.settleWin(result.totalWin);
    }

    const tier = tierFor(result.totalWin, spinTotalBet);
    if (tier === 'mega') {
      sound.winMega();
      haptics.bigWin();
      setCelebration({ tier: 'mega', amount: result.totalWin });
      setMessage({ text: `💥 MEGA WIN — ${result.totalWin.toLocaleString()} coins!`, tier: 'jackpot' });
    } else if (tier === 'big') {
      sound.winBig();
      haptics.bigWin();
      setCelebration({ tier: 'big', amount: result.totalWin });
      setMessage({ text: `🎉 BIG WIN — ${result.totalWin.toLocaleString()} coins!`, tier: 'win' });
    } else if (tier === 'small') {
      sound.winSmall();
      haptics.win();
      setMessage({ text: `You win ${result.totalWin.toLocaleString()} coins`, tier: 'win' });
    } else {
      setMessage(
        isFree
          ? { text: 'Free spin — no win', tier: '' }
          : { text: 'So close! Spin again', tier: 'lose' }
      );
    }

    if (result.freeSpinsAwarded > 0) {
      if (isFree) {
        s.addFreeSpins(result.freeSpinsAwarded);
        setMessage({ text: `🐚 RETRIGGER! +${result.freeSpinsAwarded} free spins`, tier: 'jackpot' });
      } else {
        s.startFreeSpins(result.freeSpinsAwarded, spinTotalBet / LINES);
        setMessage({
          text: `🐚 ${result.scatter.count} pāua — ${result.freeSpinsAwarded} FREE SPINS ×${FREE_SPIN_MULTIPLIER}!`,
          tier: 'jackpot',
        });
      }
    }

    // Hold the flow while the mega takeover plays so the next auto spin
    // doesn't clear it from under the player.
    const holdMs = tier === 'mega' ? 3000 : 0;

    if (result.bonusTriggered) {
      later(() => {
        sound.bonusOpen();
        setBonusBet(spinTotalBet);
      }, 1400 + holdMs);
      return; // flow resumes in handleBonusFinish
    }

    continueFlow(isFree || result.freeSpinsAwarded > 0, holdMs);
  }

  function handleBonusFinish(prize) {
    useGameStore.getState().addWin(prize);
    sound.winBig();
    haptics.bigWin();
    setBonusBet(null);
    setMessage({ text: `🗿 Bonus pays ${prize.toLocaleString()} coins!`, tier: 'win' });
    continueFlow(true);
  }

  function continueFlow(freeSessionActive, holdMs = 0) {
    const left = useGameStore.getState().freeSpinsLeft;
    if (left > 0) {
      if (!freeSessionRef.current) setFreeSession(true);
      later(() => runSpin(true), FREE_SPIN_GAP_MS + holdMs);
      return;
    }
    if (freeSessionActive && freeSessionRef.current) {
      const total = freeTotalRef.current;
      setFreeSession(false);
      useGameStore.getState().endFreeSpins();
      if (total > 0) {
        setMessage({ text: `🐚 Free spins paid ${total.toLocaleString()} coins total!`, tier: 'jackpot' });
      }
    }
    setBusy(false);
  }

  function handleMachineSelect(id) {
    if (busy || id === machineId) return;
    if (!useGameStore.getState().selectMachine(id)) {
      setMessage({
        text: `🔒 ${MACHINES[id].name} unlocks at level ${MACHINES[id].unlockLevel}`,
        tier: 'lose',
      });
      return;
    }
    setHighlights(new Set());
    setMessage({ text: `${MACHINES[id].name} — ${MACHINES[id].tagline}`, tier: '' });
  }

  function handleHourly() {
    sound.unlock();
    const prize = useGameStore.getState().claimHourly();
    if (prize > 0) {
      sound.winSmall();
      setClock(Date.now());
      setMessage({ text: `⏱ Hourly top-up: +${prize.toLocaleString()} coins`, tier: 'win' });
    }
  }

  return (
    <main className="machine" style={machine.theme}>
      <header className="machine-top">
        <h1 className="title">🎰 Pokie Palace</h1>
        <div className="top-buttons">
          <button
            className="pill-btn"
            type="button"
            aria-label={muted ? 'Unmute' : 'Mute'}
            onClick={() => {
              sound.unlock();
              useGameStore.getState().toggleMuted();
            }}
          >
            {muted ? '🔇' : '🔊'}
          </button>
          <button className="pill-btn" type="button" onClick={() => paytableRef.current?.showModal()}>
            Paytable
          </button>
        </div>
      </header>

      <div className="meta-row">
        <div className="level-chip" title={`${xp.toLocaleString()} / ${xpForNextLevel(level).toLocaleString()} XP`}>
          <span className="level-num">LV {level}</span>
          <span className="xp-bar">
            <span className="xp-fill" style={{ width: `${Math.min(100, (xp / xpForNextLevel(level)) * 100)}%` }} />
          </span>
        </div>
        <div className="claims">
          <button
            className="pill-btn claim-btn"
            type="button"
            disabled={!dailyReady || busy}
            onClick={() => {
              sound.unlock();
              setShowWheel(true);
            }}
          >
            🎡 {dailyReady ? 'Daily wheel!' : 'Tomorrow'}
          </button>
          <button
            className="pill-btn claim-btn"
            type="button"
            disabled={!hourlyReady || busy}
            onClick={handleHourly}
          >
            ⏱ {hourlyReady ? `+${hourlyAmount(level).toLocaleString()}` : `${hourlyWaitMin}m`}
          </button>
        </div>
      </div>

      <nav className="machine-tabs">
        {MACHINE_IDS.map((id) => {
          const m = MACHINES[id];
          const locked = level < m.unlockLevel;
          return (
            <button
              key={id}
              type="button"
              className={`machine-tab${id === machineId ? ' active' : ''}`}
              disabled={busy || freeSpinsLeft > 0}
              onClick={() => handleMachineSelect(id)}
            >
              {locked ? '🔒 ' : ''}{m.name}
              {locked && <span className="tab-lock"> · LV {m.unlockLevel}</span>}
            </button>
          );
        })}
      </nav>

      {(freeSpinsLeft > 0 || inFreeSession) && (
        <div className="freespin-banner">
          🐚 FREE SPINS — {freeSpinsLeft} left · all wins ×{FREE_SPIN_MULTIPLIER}
        </div>
      )}

      <section className={`display${highlights.size > 0 ? ' win' : ''}`}>
        <div className="reels">
          {grid.map((symbols, i) => (
            <Reel
              key={`${machineId}-${i}`}
              machine={machine}
              index={i}
              spinning={spinningReels[i]}
              symbols={symbols}
              highlights={highlights}
              anticipating={anticipatingReel === i && spinningReels[i]}
            />
          ))}
        </div>
      </section>

      <section className={`message ${message.tier}`} role="status">
        {message.text}
      </section>

      <section className="controls">
        <div className="stat">
          <span className="stat-label">Balance</span>
          <span className="stat-value">{balance.toLocaleString()}</span>
        </div>
        <div className="bet-controls">
          <button
            className="round-btn"
            type="button"
            aria-label="Decrease bet"
            onClick={useGameStore.getState().betDown}
            disabled={busy || freeSpinsLeft > 0 || betIndex === 0}
          >
            −
          </button>
          <div className="stat">
            <span className="stat-label">Bet / line</span>
            <span className="stat-value">{betPerLine}</span>
            <span className="stat-sub">{LINES} lines · total {totalBet.toLocaleString()}</span>
          </div>
          <button
            className="round-btn"
            type="button"
            aria-label="Increase bet"
            onClick={useGameStore.getState().betUp}
            disabled={busy || freeSpinsLeft > 0 || betIndex === BET_STEPS.length - 1}
          >
            +
          </button>
        </div>
        <div className="stat">
          <span className="stat-label">Win</span>
          <span className="stat-value">
            <RollUp value={lastWin} />
          </span>
        </div>
      </section>

      <button className="spin-btn" type="button" onClick={handleSpinClick} disabled={!canSpin}>
        {busy ? '···' : freeSpinsLeft > 0 ? `FREE SPIN (${freeSpinsLeft})` : 'SPIN'}
      </button>

      {broke && !busy && (
        <button className="text-btn visible" type="button" onClick={() => setShowOutOfCoins(true)}>
          Out of coins — get a refill
        </button>
      )}

      <footer className="legal-note">
        Virtual coins only. Coins have no real-world value and cannot be cashed out.
      </footer>

      <Paytable machine={machine} dialogRef={paytableRef} />

      {celebration && (
        <WinCelebration
          tier={celebration.tier}
          amount={celebration.amount}
          onDone={() => setCelebration(null)}
        />
      )}

      {bonusBet !== null && <PickABox totalBet={bonusBet} onFinish={handleBonusFinish} />}
      {showWheel && <DailyWheel onClose={() => setShowWheel(false)} />}
      {showOutOfCoins && <OutOfCoins onClose={() => setShowOutOfCoins(false)} />}
    </main>
  );
}
