// AdMob rewarded ads: native Capacitor plugin inside the Android shell, a
// timed stub in the browser (dev/preview has no ad SDK to call).
//
// Ad unit IDs below are Google's public test IDs — safe to ship to dev
// builds, but MUST be swapped for the real AdMob app/unit IDs before a
// production release (see README > Monetisation config).
import { Capacitor } from '@capacitor/core';
import { AdMob, RewardAdPluginEvents } from '@capacitor-community/admob';

const isNative = Capacitor.isNativePlatform();

const TEST_APP_ID = 'ca-app-pub-3940256099942544~3347511713';
const TEST_REWARDED_UNIT_ID = 'ca-app-pub-3940256099942544/5224354917';

export const ADMOB_APP_ID = import.meta.env?.VITE_ADMOB_APP_ID || TEST_APP_ID;
export const REWARDED_UNIT_ID = import.meta.env?.VITE_ADMOB_REWARDED_UNIT_ID || TEST_REWARDED_UNIT_ID;

let initPromise = null;

/** Boots the AdMob SDK once; no-op (and cheap to call repeatedly) off-native. */
export function initAds() {
  if (!isNative) return Promise.resolve();
  if (!initPromise) {
    initPromise = AdMob.initialize({
      testingDevices: [],
      initializeForTesting: REWARDED_UNIT_ID === TEST_REWARDED_UNIT_ID,
    }).catch(() => {});
  }
  return initPromise;
}

/**
 * Shows a rewarded ad and resolves `true` only once the viewer earns the
 * reward. Off-native (browser dev/preview) falls back to a 5s countdown
 * stub so the flow stays testable without a device.
 */
export async function showRewardedAd({ onTick, seconds = 5 } = {}) {
  if (!isNative) return stubRewardedAd({ onTick, seconds });

  await initAds();
  try {
    await AdMob.prepareRewardVideoAd({ adId: REWARDED_UNIT_ID });
  } catch {
    return false;
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (earned) => {
      if (settled) return;
      settled = true;
      rewardListener.remove();
      dismissListener.remove();
      failListener.remove();
      resolve(earned);
    };
    const rewardListener = AdMob.addListener(RewardAdPluginEvents.Rewarded, () => finish(true));
    const dismissListener = AdMob.addListener(RewardAdPluginEvents.Dismissed, () => finish(false));
    const failListener = AdMob.addListener(RewardAdPluginEvents.FailedToShow, () => finish(false));
    AdMob.showRewardVideoAd().catch(() => finish(false));
  });
}

function stubRewardedAd({ onTick, seconds }) {
  return new Promise((resolve) => {
    let left = seconds;
    onTick?.(left);
    const tick = setInterval(() => {
      left -= 1;
      onTick?.(left);
      if (left <= 0) {
        clearInterval(tick);
        resolve(true);
      }
    }, 1000);
  });
}
