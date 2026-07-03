import { useState } from 'react';
import { useGameStore, PIGGY_RATE } from '../store.js';
import { billingAvailable, purchaseProduct, PIGGY_SMASH_PRODUCT_ID, PIGGY_SMASH_PRICE } from '../billing.js';
import * as sound from '../sound.js';
import { track } from '../analytics.js';

/**
 * Piggy bank: accrual is a cut of every win; smashing it is a small IAP
 * (Google Play Billing via RevenueCat). Stays a preview off-native or
 * before a store API key is configured.
 */
export default function PiggyBank({ onClose }) {
  const piggyBank = useGameStore((s) => s.piggyBank);
  const [buying, setBuying] = useState(false);

  async function smash() {
    if (!billingAvailable() || buying) return;
    setBuying(true);
    const bought = await purchaseProduct(PIGGY_SMASH_PRODUCT_ID);
    setBuying(false);
    if (!bought) return;
    const emptied = useGameStore.getState().piggyBank;
    useGameStore.getState().smashPiggyBank();
    track('piggy_smash', { coins: emptied });
    sound.winBig();
    onClose();
  }

  return (
    <div className="bonus-overlay" role="dialog" aria-label="Piggy bank">
      <div className="bonus-card">
        <h2 className="bonus-title">🐷 PIGGY BANK</h2>
        <p className="bonus-sub">
          {Math.round(PIGGY_RATE * 100)}% of every win drops in here, locked away.
        </p>
        <div className="ad-countdown">🐷 {piggyBank.toLocaleString()}</div>
        <button
          type="button"
          className="spin-btn bonus-collect"
          disabled={!billingAvailable() || buying}
          title={billingAvailable() ? undefined : 'Preview only — arrives with the Play Store release'}
          onClick={smash}
        >
          🔨 SMASH · {PIGGY_SMASH_PRICE}
        </button>
        {!billingAvailable() && (
          <p className="paytable-note">Smashing goes live with the Play Store release.</p>
        )}
        <button type="button" className="text-btn visible" onClick={onClose}>
          Keep saving
        </button>
      </div>
    </div>
  );
}
