// Web Vibration API wrapper — no-op on desktop. Swapped for Capacitor
// Haptics when the Android build lands (Phase 6).
const canVibrate = typeof navigator !== 'undefined' && 'vibrate' in navigator;

export const haptics = {
  reelStop: () => canVibrate && navigator.vibrate(15),
  win: () => canVibrate && navigator.vibrate([30, 40, 30]),
  bigWin: () => canVibrate && navigator.vibrate([60, 40, 60, 40, 120]),
};
