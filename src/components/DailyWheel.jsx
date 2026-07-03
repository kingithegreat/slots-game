import { useState } from 'react';
import { WHEEL_SEGMENTS, wheelBase, useGameStore } from '../store.js';
import * as sound from '../sound.js';
import { track } from '../analytics.js';

const SEG_ANGLE = 360 / WHEEL_SEGMENTS.length;
const WHEEL_COLORS = ['#f5c542', '#1a4459', '#e8834a', '#235a75', '#f5c542', '#1a4459', '#e8834a', '#235a75'];

/**
 * Daily bonus wheel (Phase 4): one free spin per 24h. The landing segment is
 * chosen up-front; the wheel animates to it with CSS rotation.
 */
export default function DailyWheel({ onClose }) {
  const level = useGameStore((s) => s.level);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [prize, setPrize] = useState(null);

  const base = wheelBase(level);

  function spinWheel() {
    if (spinning || prize !== null) return;
    sound.spinStart();
    const seg = Math.floor(Math.random() * WHEEL_SEGMENTS.length);
    // 5 full turns, then land mid-segment (pointer at top = 0deg).
    const target = 5 * 360 + (360 - seg * SEG_ANGLE - SEG_ANGLE / 2);
    setSpinning(true);
    setRotation(target);
    setTimeout(() => {
      sound.spinEnd();
      const won = useGameStore.getState().claimDaily(seg);
      track('daily_wheel', { prize: won });
      setPrize(won);
      setSpinning(false);
      sound.winBig();
    }, 3300);
  }

  const gradient = WHEEL_SEGMENTS.map(
    (_, i) => `${WHEEL_COLORS[i]} ${i * SEG_ANGLE}deg ${(i + 1) * SEG_ANGLE}deg`
  ).join(', ');

  return (
    <div className="bonus-overlay" role="dialog" aria-label="Daily bonus wheel">
      <div className="bonus-card">
        <h2 className="bonus-title">🎡 DAILY WHEEL</h2>
        <p className="bonus-sub">
          {prize === null
            ? 'One free spin every day — give it a whirl!'
            : `You won ${prize.toLocaleString()} coins!`}
        </p>
        <div className="wheel-wrap">
          <div className="wheel-pointer" aria-hidden="true">▼</div>
          <div
            className="wheel"
            style={{
              background: `conic-gradient(${gradient})`,
              transform: `rotate(${rotation}deg)`,
              transition: spinning ? 'transform 3.2s cubic-bezier(0.15, 0.9, 0.25, 1)' : 'none',
            }}
          >
            {WHEEL_SEGMENTS.map((mult, i) => (
              <span
                key={i}
                className="wheel-label"
                style={{ transform: `rotate(${i * SEG_ANGLE + SEG_ANGLE / 2}deg) translateY(-58px)` }}
              >
                {(mult * base) / 1000}k
              </span>
            ))}
          </div>
        </div>
        {prize === null ? (
          <button type="button" className="spin-btn bonus-collect" onClick={spinWheel} disabled={spinning}>
            {spinning ? '···' : 'SPIN THE WHEEL'}
          </button>
        ) : (
          <button type="button" className="spin-btn bonus-collect" onClick={onClose}>
            COLLECT
          </button>
        )}
      </div>
    </div>
  );
}
