// Haptics: native Capacitor Haptics inside the Android shell, Web Vibration
// API in the browser, silent no-op where neither exists.
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

const isNative = Capacitor.isNativePlatform();
const canVibrate = typeof navigator !== 'undefined' && 'vibrate' in navigator;

const impact = (style) => Haptics.impact({ style }).catch(() => {});

export const haptics = {
  reelStop: () => {
    if (isNative) impact(ImpactStyle.Light);
    else if (canVibrate) navigator.vibrate(15);
  },
  win: () => {
    if (isNative) impact(ImpactStyle.Medium);
    else if (canVibrate) navigator.vibrate([30, 40, 30]);
  },
  bigWin: () => {
    if (isNative) Haptics.vibrate({ duration: 300 }).catch(() => {});
    else if (canVibrate) navigator.vibrate([60, 40, 60, 40, 120]);
  },
  // Distinct from bigWin — longer, builds in intensity, so a mega win reads
  // as clearly bigger on the wrist/pocket, not just a repeat of a big win.
  megaWin: () => {
    if (isNative) {
      impact(ImpactStyle.Heavy)
        .then(() => new Promise((r) => setTimeout(r, 120)))
        .then(() => Haptics.vibrate({ duration: 400 }))
        .catch(() => {});
    } else if (canVibrate) {
      navigator.vibrate([50, 30, 50, 30, 80, 30, 220]);
    }
  },
};
