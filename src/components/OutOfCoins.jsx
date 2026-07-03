import { useEffect, useState } from 'react';
import { AD_REWARD, useGameStore } from '../store.js';
import * as sound from '../sound.js';

const AD_SECONDS = 5;

// Coin pack tiers, display-only until Google Play Billing lands (Phase 5).
const PACKS = [
  { coins: 200_000, price: 'NZ$1.99' },
  { coins: 1_200_000, price: 'NZ$9.99' },
  { coins: 15_000_000, price: 'NZ$99' },
];

/**
 * Out-of-coins flow (Phase 4): rewarded "ad" (stub timer — AdMob replaces it
 * in Phase 5) or the coin shop preview.
 */
export default function OutOfCoins({ onClose }) {
  const [adLeft, setAdLeft] = useState(null); // null = not watching

  useEffect(() => {
    if (adLeft === null) return undefined;
    if (adLeft === 0) {
      useGameStore.getState().claimAdReward();
      sound.winBig();
      onClose();
      return undefined;
    }
    const t = setTimeout(() => setAdLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [adLeft, onClose]);

  if (adLeft !== null) {
    return (
      <div className="bonus-overlay" role="dialog" aria-label="Rewarded ad">
        <div className="bonus-card">
          <h2 className="bonus-title">📺 YOUR REWARD IS COMING</h2>
          <p className="bonus-sub">Ad placeholder — AdMob rewarded video lands in Phase 5</p>
          <div className="ad-countdown">{adLeft}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bonus-overlay" role="dialog" aria-label="Out of coins">
      <div className="bonus-card">
        <h2 className="bonus-title">😅 OUT OF COINS</h2>
        <p className="bonus-sub">No worries e hoa — grab a refill:</p>
        <button
          type="button"
          className="spin-btn bonus-collect"
          onClick={() => setAdLeft(AD_SECONDS)}
        >
          📺 WATCH AD · +{AD_REWARD.toLocaleString()}
        </button>
        <div className="packs">
          {PACKS.map((p) => (
            <button key={p.price} type="button" className="pack" disabled title="Coming in Phase 5">
              <span className="pack-coins">🪙 {p.coins.toLocaleString()}</span>
              <span className="pack-price">{p.price}</span>
            </button>
          ))}
        </div>
        <p className="paytable-note">Coin packs arrive with Google Play Billing in Phase 5.</p>
        <button type="button" className="text-btn visible" onClick={onClose}>
          Not now
        </button>
      </div>
    </div>
  );
}
