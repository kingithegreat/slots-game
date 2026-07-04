import { useState } from 'react';
import { AD_REWARD, useGameStore } from '../store.js';
import { showRewardedAd } from '../ads.js';
import { COIN_PACKS, billingAvailable, purchaseProduct } from '../billing.js';
import * as sound from '../sound.js';
import { track } from '../analytics.js';

/**
 * Out-of-coins flow: AdMob rewarded video, or the coin-pack shop (Google
 * Play Billing via RevenueCat). Packs stay a preview off-native or before a
 * store API key is configured — same UI, no purchase call is made.
 */
export default function OutOfCoins({ onClose }) {
  const [adSecondsLeft, setAdSecondsLeft] = useState(null); // null = not watching
  const [pending, setPending] = useState(null); // productId mid-purchase

  async function watchAd() {
    setAdSecondsLeft(5);
    const earned = await showRewardedAd({ onTick: setAdSecondsLeft });
    setAdSecondsLeft(null);
    if (!earned) return;
    useGameStore.getState().claimAdReward();
    track('ad_reward', { prize: AD_REWARD });
    sound.winBig();
    onClose();
  }

  async function buyPack(pack) {
    if (!billingAvailable() || pending) return;
    setPending(pack.productId);
    const bought = await purchaseProduct(pack.productId);
    setPending(null);
    if (!bought) return;
    useGameStore.getState().creditCoinPack(pack.coins);
    track('iap_purchase', { productId: pack.productId, coins: pack.coins });
    sound.winBig();
    onClose();
  }

  if (adSecondsLeft !== null) {
    return (
      <div className="bonus-overlay" role="dialog" aria-label="Rewarded ad">
        <div className="bonus-card">
          <h2 className="bonus-title">📺 YOUR REWARD IS COMING</h2>
          <p className="bonus-sub">Hang tight — the video is playing</p>
          <div className="ad-countdown">{adSecondsLeft}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bonus-overlay" role="dialog" aria-label="Out of coins">
      <div className="bonus-card">
        <h2 className="bonus-title">😅 OUT OF COINS</h2>
        <p className="bonus-sub">No worries e hoa — grab a refill:</p>
        <button type="button" className="spin-btn bonus-collect" onClick={watchAd}>
          📺 WATCH AD · +{AD_REWARD.toLocaleString()}
        </button>
        <div className="packs">
          {COIN_PACKS.map((p) => (
            <button
              key={p.productId}
              type="button"
              className="pack"
              disabled={!billingAvailable() || pending !== null}
              title={billingAvailable() ? undefined : 'Preview only — arrives with the Play Store release'}
              onClick={() => buyPack(p)}
            >
              <span className="pack-coins">🪙 {p.coins.toLocaleString()}</span>
              <span className="pack-price">{pending === p.productId ? '…' : p.price}</span>
            </button>
          ))}
        </div>
        {!billingAvailable() && (
          <p className="paytable-note">Coin packs go live with the Play Store release.</p>
        )}
        <button type="button" className="text-btn visible" onClick={onClose}>
          Not now
        </button>
      </div>
    </div>
  );
}
