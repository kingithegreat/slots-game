import { useEffect, useMemo } from 'react';
import RollUp from './RollUp.jsx';

function CoinShower({ count }) {
  const coins = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: 5 + Math.random() * 90,
        delay: Math.random() * 0.8,
        dur: 1.2 + Math.random() * 1.2,
        drift: -40 + Math.random() * 80,
        size: 18 + Math.random() * 18,
      })),
    [count]
  );
  return (
    <div className="coin-shower" aria-hidden="true">
      {coins.map((c) => (
        <span
          key={c.id}
          className="coin"
          style={{
            left: `${c.left}%`,
            fontSize: c.size,
            animationDelay: `${c.delay}s`,
            animationDuration: `${c.dur}s`,
            '--drift': `${c.drift}px`,
          }}
        >
          🪙
        </span>
      ))}
    </div>
  );
}

function SparkleBurst() {
  const sparkles = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => ({
        id: i,
        angle: (360 / 8) * i + (Math.random() * 20 - 10),
        delay: Math.random() * 0.1,
      })),
    []
  );
  return (
    <div className="sparkle-burst" aria-hidden="true">
      {sparkles.map((s) => (
        <span
          key={s.id}
          className="sparkle"
          style={{
            '--angle': `${s.angle}deg`,
            animationDelay: `${s.delay}s`,
          }}
        >
          ✨
        </span>
      ))}
    </div>
  );
}

/**
 * Win celebration tiers:
 *   small → quick sparkle burst, auto-dismisses fast — every winning spin
 *           gets *something*, but it never slows down the next spin
 *   big   → coin fountain over the machine
 *   mega  → full-screen takeover with counter roll-up
 */
export default function WinCelebration({ tier, amount, onDone }) {
  useEffect(() => {
    if (!tier) return undefined;
    const durations = { small: 900, big: 2400, mega: 3600 };
    const t = setTimeout(onDone, durations[tier] ?? 2400);
    return () => clearTimeout(t);
  }, [tier, onDone]);

  if (!tier) return null;

  if (tier === 'mega') {
    return (
      <div className="mega-overlay" onClick={onDone} role="presentation">
        <CoinShower count={60} />
        <div className="mega-card">
          <div className="mega-title">💥 MEGA WIN 💥</div>
          <div className="mega-amount">
            <RollUp value={amount} duration={1800} />
          </div>
          <div className="mega-sub">coins</div>
        </div>
      </div>
    );
  }

  if (tier === 'small') {
    return <SparkleBurst />;
  }

  return <CoinShower count={26} />;
}
