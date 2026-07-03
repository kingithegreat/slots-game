import { useEffect, useRef, useState } from 'react';
import { REELS, LINES, spin, playSpin } from './engine/engine.js';
import { useGameStore, BET_STEPS } from './store.js';
import Reel from './components/Reel.jsx';
import Paytable from './components/Paytable.jsx';
import './App.css';

const FIRST_STOP_MS = 900; // reel 1 stops here...
const STAGGER_MS = 280; // ...then one reel every 280ms

function winMessage(result, totalBet) {
  if (result.freeSpinsAwarded > 0) {
    return {
      text: `🐚 ${result.scatter.count} pāua! ${result.freeSpinsAwarded} free spins coming in Phase 3 — scatter pays ${result.scatter.win.toLocaleString()}`,
      tier: 'jackpot',
    };
  }
  if (result.totalWin === 0) return { text: 'So close! Spin again', tier: 'lose' };
  const mult = result.totalWin / totalBet;
  if (mult >= 25) return { text: `💥 MEGA WIN — ${result.totalWin.toLocaleString()} coins!`, tier: 'jackpot' };
  if (mult >= 5) return { text: `🎉 BIG WIN — ${result.totalWin.toLocaleString()} coins!`, tier: 'win' };
  return { text: `You win ${result.totalWin.toLocaleString()} coins`, tier: 'win' };
}

export default function App() {
  const balance = useGameStore((s) => s.balance);
  const betIndex = useGameStore((s) => s.betIndex);
  const lastWin = useGameStore((s) => s.lastWin);
  const { betUp, betDown, placeBet, settleWin, topUp } = useGameStore.getState();

  const betPerLine = BET_STEPS[betIndex];
  const totalBet = betPerLine * LINES;

  const [grid, setGrid] = useState(() => spin().grid);
  const [spinningReels, setSpinningReels] = useState(() => Array(REELS).fill(false));
  const [highlights, setHighlights] = useState(new Set());
  const [message, setMessage] = useState({ text: 'Kia ora! Place your bet and spin', tier: '' });
  const [busy, setBusy] = useState(false);

  const timers = useRef([]);
  const paytableRef = useRef(null);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const canSpin = !busy && balance >= totalBet;
  const broke = balance < BET_STEPS[0] * LINES;

  function handleSpin() {
    if (!canSpin || !placeBet()) return;

    const result = playSpin(betPerLine);
    setBusy(true);
    setHighlights(new Set());
    setMessage({ text: 'Good luck…', tier: '' });
    setSpinningReels(Array(REELS).fill(true));

    for (let r = 0; r < REELS; r++) {
      timers.current.push(
        setTimeout(() => {
          setGrid((g) => g.map((col, i) => (i === r ? result.grid[r] : col)));
          setSpinningReels((s) => s.map((v, i) => (i === r ? false : v)));
        }, FIRST_STOP_MS + r * STAGGER_MS)
      );
    }

    timers.current.push(
      setTimeout(() => {
        settleWin(result.totalWin);
        const cells = new Set(
          [...result.lineWins.flatMap((w) => w.cells), ...result.scatter.cells].map(
            ([reel, row]) => `${reel},${row}`
          )
        );
        setHighlights(cells);
        setMessage(winMessage(result, totalBet));
        setBusy(false);
      }, FIRST_STOP_MS + (REELS - 1) * STAGGER_MS + 350)
    );
  }

  return (
    <main className="machine">
      <header className="machine-top">
        <h1 className="title">🎰 Pokie Palace</h1>
        <button className="pill-btn" type="button" onClick={() => paytableRef.current?.showModal()}>
          Paytable
        </button>
      </header>

      <section className={`display${highlights.size > 0 ? ' win' : ''}`}>
        <div className="reels">
          {grid.map((symbols, i) => (
            <Reel
              key={i}
              index={i}
              spinning={spinningReels[i]}
              symbols={symbols}
              highlights={highlights}
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
            onClick={betDown}
            disabled={busy || betIndex === 0}
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
            onClick={betUp}
            disabled={busy || betIndex === BET_STEPS.length - 1}
          >
            +
          </button>
        </div>
        <div className="stat">
          <span className="stat-label">Win</span>
          <span className="stat-value">{lastWin.toLocaleString()}</span>
        </div>
      </section>

      <button className="spin-btn" type="button" onClick={handleSpin} disabled={!canSpin}>
        {busy ? '···' : 'SPIN'}
      </button>

      {broke && !busy && (
        <button className="text-btn visible" type="button" onClick={topUp}>
          Out of coins — grab a free top-up
        </button>
      )}

      <footer className="legal-note">
        Virtual coins only. Coins have no real-world value and cannot be cashed out.
      </footer>

      <Paytable dialogRef={paytableRef} />
    </main>
  );
}
