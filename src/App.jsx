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
import { useGameStore, BET_STEPS } from './store.js';
import * as sound from './sound.js';
import { haptics } from './haptics.js';
import Reel from './components/Reel.jsx';
import RollUp from './components/RollUp.jsx';
import Paytable from './components/Paytable.jsx';
import WinCelebration from './components/WinCelebration.jsx';
import PickABox from './components/PickABox.jsx';
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

  const betPerLine = BET_STEPS[betIndex];
  const totalBet = betPerLine * LINES;

  const [grid, setGrid] = useState(() => spin().grid);
  const [spinningReels, setSpinningReels] = useState(() => Array(REELS).fill(false));
  const [anticipatingReel, setAnticipatingReel] = useState(null);
  const [highlights, setHighlights] = useState(new Set());
  const [message, setMessage] = useState({ text: 'Kia ora! Place your bet and spin', tier: '' });
  const [busy, setBusy] = useState(false);
  const [celebration, setCelebration] = useState(null); // { tier, amount }
  const [bonusBet, setBonusBet] = useState(null); // total bet of the triggering spin
  const [inFreeSession, setInFreeSession] = useState(false);

  const timers = useRef([]);
  const freeTotalRef = useRef(0);
  // Ref mirrors inFreeSession for the async spin flow — timeout callbacks
  // capture stale state, the ref is always current.
  const freeSessionRef = useRef(false);
  const paytableRef = useRef(null);

  function setFreeSession(active) {
    freeSessionRef.current = active;
    setInFreeSession(active);
    if (active) freeTotalRef.current = 0;
  }

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => sound.setMuted(muted), [muted]);
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
    const store = useGameStore.getState();
    const bet = isFree ? store.freeSpinBet : BET_STEPS[store.betIndex];
    const spinTotalBet = bet * LINES;

    if (isFree) store.useFreeSpin();
    else if (!store.placeBet()) return;

    const result = playSpin(
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
      .reduce((n, col) => n + col.filter((s) => s === SCATTER).length, 0);
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
        setSpinningReels((s) => s.map((v, i) => (i === r ? false : v)));
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
    const store = useGameStore.getState();
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
      store.addWin(result.totalWin);
      freeTotalRef.current += result.totalWin;
    } else {
      store.settleWin(result.totalWin);
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
        store.addFreeSpins(result.freeSpinsAwarded);
        setMessage({ text: `🐚 RETRIGGER! +${result.freeSpinsAwarded} free spins`, tier: 'jackpot' });
      } else {
        store.startFreeSpins(result.freeSpinsAwarded, spinTotalBet / LINES);
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

  return (
    <main className="machine">
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

      {(freeSpinsLeft > 0 || inFreeSession) && (
        <div className="freespin-banner">
          🐚 FREE SPINS — {freeSpinsLeft} left · all wins ×{FREE_SPIN_MULTIPLIER}
        </div>
      )}

      <section className={`display${highlights.size > 0 ? ' win' : ''}`}>
        <div className="reels">
          {grid.map((symbols, i) => (
            <Reel
              key={i}
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
        <button className="text-btn visible" type="button" onClick={useGameStore.getState().topUp}>
          Out of coins — grab a free top-up
        </button>
      )}

      <footer className="legal-note">
        Virtual coins only. Coins have no real-world value and cannot be cashed out.
      </footer>

      <Paytable dialogRef={paytableRef} />

      {celebration && (
        <WinCelebration
          tier={celebration.tier}
          amount={celebration.amount}
          onDone={() => setCelebration(null)}
        />
      )}

      {bonusBet !== null && <PickABox totalBet={bonusBet} onFinish={handleBonusFinish} />}
    </main>
  );
}
