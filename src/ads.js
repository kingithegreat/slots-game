// AdMob rewarded + interstitial ads: native Capacitor plugin inside the
// Android shell, a stub in the browser (dev/preview has no ad SDK to call).
//
// Ad unit IDs below are Google's public test IDs — safe to ship to dev
// builds, but MUST be swapped for the real AdMob app/unit IDs before a
// production release (see README > Monetisation config).
import { Capacitor } from '@capacitor/core';
import { AdMob, RewardAdPluginEvents, InterstitialAdPluginEvents } from '@capacitor-community/admob';

const isNative = Capacitor.isNativePlatform();

const TEST_APP_ID = 'ca-app-pub-3940256099942544~3347511713';
const TEST_REWARDED_UNIT_ID = 'ca-app-pub-3940256099942544/5224354917';
const TEST_INTERSTITIAL_UNIT_ID = 'ca-app-pub-3940256099942544/1033173712';

export const ADMOB_APP_ID = import.meta.env?.VITE_ADMOB_APP_ID || TEST_APP_ID;
export const REWARDED_UNIT_ID = import.meta.env?.VITE_ADMOB_REWARDED_UNIT_ID || TEST_REWARDED_UNIT_ID;
export const INTERSTITIAL_UNIT_ID = import.meta.env?.VITE_ADMOB_INTERSTITIAL_UNIT_ID || TEST_INTERSTITIAL_UNIT_ID;

// Machine-switch interstitials are "light" by design (roadmap: between
// machine switches only, never mid-session spam) — cap to at most once per
// this many ms, and never on the very first switch of a session so a
// player isn't greeted by an ad before they've even seen the new machine.
export const INTERSTITIAL_COOLDOWN_MS = 90_000;

/**
 * Pure gate for the interstitial frequency cap — no ad SDK, no timers,
 * trivially reviewable/testable in isolation. `lastShownAt` is
 * `null`/`undefined` for "never shown yet this session", which always
 * returns false (so the first switch is always skipped).
 */
export function canShowInterstitial(lastShownAt, now, cooldownMs = INTERSTITIAL_COOLDOWN_MS) {
  if (lastShownAt == null) return false;
  return now - lastShownAt >= cooldownMs;
}

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

/**
 * Shows an interstitial at a machine-switch transition. Fire-and-forget —
 * there's no reward outcome, it just resolves once the ad is
 * dismissed/skipped/failed so the caller can move on. Off-native (browser
 * dev/preview) resolves immediately after a console note, since there's no
 * ad SDK to simulate against and nothing for the player to wait on.
 */
export async function showInterstitialAd() {
  if (!isNative) {
    console.info('[ads] interstitial would show here (native only)');
    return;
  }

  await initAds();
  try {
    await AdMob.prepareInterstitial({ adId: INTERSTITIAL_UNIT_ID });
  } catch {
    return;
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      dismissListener.remove();
      failListener.remove();
      resolve();
    };
    const dismissListener = AdMob.addListener(InterstitialAdPluginEvents.Dismissed, finish);
    const failListener = AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, finish);
    AdMob.showInterstitial().catch(finish);
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
