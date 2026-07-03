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

/**
 * Win celebration tiers (Phase 2):
 *   big  → coin fountain over the machine
 *   mega → full-screen takeover with counter roll-up
 */
export default function WinCelebration({ tier, amount, onDone }) {
  useEffect(() => {
    if (!tier) return undefined;
    const t = setTimeout(onDone, tier === 'mega' ? 3600 : 2400);
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

  return <CoinShower count={26} />;
}
