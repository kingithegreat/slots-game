import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LINES } from './engine/engine.js';

export const BET_STEPS = [1, 2, 5, 10, 25, 50, 100];
export const STARTING_BALANCE = 100_000;
// Free out-of-coins top-up for now; Phase 4/5 replaces this with the
// rewarded-ad / IAP flow.
export const TOP_UP_AMOUNT = 50_000;

export const useGameStore = create(
  persist(
    (set, get) => ({
      balance: STARTING_BALANCE,
      betIndex: 2, // bet per line = 5
      lastWin: 0,

      betPerLine: () => BET_STEPS[get().betIndex],
      totalBet: () => BET_STEPS[get().betIndex] * LINES,

      betUp: () =>
        set((s) => ({ betIndex: Math.min(s.betIndex + 1, BET_STEPS.length - 1) })),
      betDown: () => set((s) => ({ betIndex: Math.max(s.betIndex - 1, 0) })),

      placeBet: () => {
        const cost = get().totalBet();
        if (get().balance < cost) return false;
        set((s) => ({ balance: s.balance - cost, lastWin: 0 }));
        return true;
      },

      settleWin: (amount) =>
        set((s) => ({ balance: s.balance + amount, lastWin: amount })),

      topUp: () => set((s) => ({ balance: s.balance + TOP_UP_AMOUNT })),
    }),
    {
      name: 'pokie-palace',
      partialize: (s) => ({ balance: s.balance, betIndex: s.betIndex }),
    }
  )
);
