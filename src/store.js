import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LINES } from './engine/engine.js';
import { MACHINES, DEFAULT_MACHINE } from './engine/machines.js';

export const BET_STEPS = [1, 2, 5, 10, 25, 50, 100];
export const STARTING_BALANCE = 100_000;

// --- Level / XP curve: XP = coins wagered. Cumulative need grows linearly
// per level, so early levels come fast and the pace settles down.
export const xpForNextLevel = (level) => 1200 * level;

// --- Daily wheel: 8 segments, multiples of a level-scaled base.
export const WHEEL_SEGMENTS = [1, 2, 3, 4, 5, 8, 12, 25];
export const wheelBase = (level) => 1000 + 250 * (level - 1);
export const DAY_MS = 24 * 60 * 60 * 1000;

// --- Hourly top-up
export const HOUR_MS = 60 * 60 * 1000;
export const hourlyAmount = (level) => 2000 + 500 * (level - 1);

// --- Out-of-coins rewarded "ad" (stubbed until AdMob lands in Phase 5)
export const AD_REWARD = 50_000;

export const useGameStore = create(
  persist(
    (set, get) => ({
      balance: STARTING_BALANCE,
      betIndex: 2, // bet per line = 5
      lastWin: 0,
      muted: false,
      machineId: DEFAULT_MACHINE,
      level: 1,
      xp: 0, // progress within the current level
      lastDailyClaim: 0, // epoch ms
      lastHourlyClaim: 0, // epoch ms
      // Free spins survive a reload: count + the bet they were triggered at.
      freeSpinsLeft: 0,
      freeSpinBet: 0,

      betPerLine: () => BET_STEPS[get().betIndex],
      totalBet: () => BET_STEPS[get().betIndex] * LINES,

      betUp: () =>
        set((s) => ({ betIndex: Math.min(s.betIndex + 1, BET_STEPS.length - 1) })),
      betDown: () => set((s) => ({ betIndex: Math.max(s.betIndex - 1, 0) })),
      toggleMuted: () => set((s) => ({ muted: !s.muted })),

      selectMachine: (id) => {
        const m = MACHINES[id];
        if (!m || get().level < m.unlockLevel) return false;
        // No switching mid free-spin session — the bet/strips belong to the
        // machine that triggered them.
        if (get().freeSpinsLeft > 0) return false;
        set({ machineId: id });
        return true;
      },

      /** Wagering earns XP; returns the number of levels gained. */
      grantXp: (amount) => {
        let { level, xp } = get();
        xp += amount;
        let gained = 0;
        while (xp >= xpForNextLevel(level)) {
          xp -= xpForNextLevel(level);
          level++;
          gained++;
        }
        set({ level, xp });
        return gained;
      },

      placeBet: () => {
        const cost = get().totalBet();
        if (get().balance < cost) return false;
        set((s) => ({ balance: s.balance - cost, lastWin: 0 }));
        return true;
      },

      settleWin: (amount) =>
        set((s) => ({ balance: s.balance + amount, lastWin: amount })),

      addWin: (amount) =>
        set((s) => ({ balance: s.balance + amount, lastWin: s.lastWin + amount })),

      startFreeSpins: (count, betPerLine) =>
        set({ freeSpinsLeft: count, freeSpinBet: betPerLine }),
      addFreeSpins: (count) => set((s) => ({ freeSpinsLeft: s.freeSpinsLeft + count })),
      useFreeSpin: () => set((s) => ({ freeSpinsLeft: Math.max(0, s.freeSpinsLeft - 1) })),
      endFreeSpins: () => set({ freeSpinsLeft: 0, freeSpinBet: 0 }),

      dailyReady: (now = Date.now()) => now - get().lastDailyClaim >= DAY_MS,
      claimDaily: (segmentIndex, now = Date.now()) => {
        if (!get().dailyReady(now)) return 0;
        const prize = WHEEL_SEGMENTS[segmentIndex] * wheelBase(get().level);
        set((s) => ({ balance: s.balance + prize, lastDailyClaim: now }));
        return prize;
      },

      hourlyReady: (now = Date.now()) => now - get().lastHourlyClaim >= HOUR_MS,
      claimHourly: (now = Date.now()) => {
        if (!get().hourlyReady(now)) return 0;
        const prize = hourlyAmount(get().level);
        set((s) => ({ balance: s.balance + prize, lastHourlyClaim: now }));
        return prize;
      },

      /** Rewarded-ad stub payout (real AdMob flow lands in Phase 5). */
      claimAdReward: () => set((s) => ({ balance: s.balance + AD_REWARD })),
    }),
    {
      name: 'pokie-palace',
      partialize: (s) => ({
        balance: s.balance,
        betIndex: s.betIndex,
        muted: s.muted,
        machineId: s.machineId,
        level: s.level,
        xp: s.xp,
        lastDailyClaim: s.lastDailyClaim,
        lastHourlyClaim: s.lastHourlyClaim,
        freeSpinsLeft: s.freeSpinsLeft,
        freeSpinBet: s.freeSpinBet,
      }),
    }
  )
);
