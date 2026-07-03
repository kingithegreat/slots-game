import { useMemo, useState } from 'react';
import { pickBonusPrize } from '../engine/engine.js';

/**
 * Pick-a-box bonus (Phase 3): triggered by a TIKI on each of reels 2–4.
 * Three boxes, each holding an independently drawn prize; the player keeps
 * the one they open. Prizes are multiples of total bet.
 */
export default function PickABox({ totalBet, onFinish }) {
  const prizes = useMemo(() => [pickBonusPrize(), pickBonusPrize(), pickBonusPrize()], []);
  const [picked, setPicked] = useState(null);

  const prize = picked === null ? 0 : prizes[picked] * totalBet;

  return (
    <div className="bonus-overlay" role="dialog" aria-label="Pick a box bonus">
      <div className="bonus-card">
        <h2 className="bonus-title">🗿 TIKI TRIO BONUS</h2>
        <p className="bonus-sub">
          {picked === null ? 'Pick a box to reveal your prize!' : `You won ${prize.toLocaleString()} coins!`}
        </p>
        <div className="bonus-boxes">
          {prizes.map((mult, i) => (
            <button
              key={i}
              type="button"
              className={`bonus-box${picked === i ? ' picked' : ''}${picked !== null ? ' revealed' : ''}`}
              disabled={picked !== null}
              onClick={() => setPicked(i)}
            >
              {picked === null ? '🎁' : `${mult}×`}
            </button>
          ))}
        </div>
        {picked !== null && (
          <button type="button" className="spin-btn bonus-collect" onClick={() => onFinish(prize)}>
            COLLECT {prize.toLocaleString()}
          </button>
        )}
      </div>
    </div>
  );
}
