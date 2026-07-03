import { useGameStore, PIGGY_RATE } from '../store.js';

/**
 * Piggy bank preview: accrual is live (a cut of every win), smashing it is a
 * small IAP that arrives with Google Play Billing in Phase 5.
 */
export default function PiggyBank({ onClose }) {
  const piggyBank = useGameStore((s) => s.piggyBank);

  return (
    <div className="bonus-overlay" role="dialog" aria-label="Piggy bank">
      <div className="bonus-card">
        <h2 className="bonus-title">🐷 PIGGY BANK</h2>
        <p className="bonus-sub">
          {Math.round(PIGGY_RATE * 100)}% of every win drops in here, locked away.
        </p>
        <div className="ad-countdown">🐷 {piggyBank.toLocaleString()}</div>
        <button type="button" className="spin-btn bonus-collect" disabled title="Coming in Phase 5">
          🔨 SMASH · NZ$2.99
        </button>
        <p className="paytable-note">Smashing unlocks with Google Play Billing in Phase 5.</p>
        <button type="button" className="text-btn visible" onClick={onClose}>
          Keep saving
        </button>
      </div>
    </div>
  );
}
