import { create } from 'zustand';
import { useFinanceStore } from '../../finance/store/financeStore';

export type GameSpeed = 0 | 1 | 2 | 5 | 10;

interface TimeState {
  sunTime: number; // 0.0 to 1.0 (Midnight to Midnight)
  dayOfWeek: number; // 1 to 7 (Monday to Sunday)
  gameSpeed: GameSpeed;
  sunIntensity: number;
  setSunTime: (time: number) => void;
  setDayOfWeek: (day: number) => void;
  setGameSpeed: (speed: GameSpeed) => void;
  setSunIntensity: (intensity: number) => void;
  advanceTime: (dt: number) => void; // dt in seconds
}

export const useTimeStore = create<TimeState>((set, get) => ({
  sunTime: 0.25, // Starting at 6:00 AM
  dayOfWeek: 1, // Monday
  gameSpeed: 1,
  sunIntensity: 10.0,

  setSunTime: (time) => set({ sunTime: time % 1 }),
  setDayOfWeek: (day) => set({ dayOfWeek: ((day - 1) % 7) + 1 }),
  setGameSpeed: (speed) => set({ gameSpeed: speed }),
  setSunIntensity: (intensity) => set({ sunIntensity: intensity }),

  advanceTime: (dt) => {
    const { sunTime, gameSpeed, dayOfWeek } = get();
    if (gameSpeed === 0) return;

    // 144 seconds = 24 hours (86400 seconds)
    // 1 real second = 600 in-game seconds (10 minutes)
    // sunTime increment per real second = 1 / 144
    const delta = (dt / 144) * gameSpeed;
    let nextSunTime = sunTime + delta;

    if (nextSunTime >= 1.0) {
      nextSunTime %= 1.0;
      set({ 
        sunTime: nextSunTime,
        dayOfWeek: (dayOfWeek % 7) + 1 
      });
    } else {
      set({ sunTime: nextSunTime });
    }

    // Trigger Financial Payday on Friday at 17:00 (17 / 24 = 0.708333)
    const paydayThreshold = 17 / 24;
    if (dayOfWeek === 5 && sunTime < paydayThreshold && nextSunTime >= paydayThreshold) {
      useFinanceStore.getState().processWeeklyFinances();
    }
  },
}));
