import AsyncStorage from '@react-native-async-storage/async-storage';

import { defaultSettings, emptyData } from '@/core/defaults';
import type { AppData } from '@/core/types';

const KEY = 'ryz/data/v1';

/** Whether this phone shows a 24-hour clock. */
export function prefers24h(): boolean {
  try {
    return new Date(2020, 0, 1, 13).toLocaleTimeString().includes('13');
  } catch {
    return false;
  }
}

export async function loadData(): Promise<AppData> {
  const fallback = emptyData(prefers24h());
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return fallback;
    const saved = JSON.parse(raw) as Partial<AppData>;
    return {
      alarms: saved.alarms ?? [],
      settings: { ...defaultSettings(prefers24h()), ...saved.settings },
      pending: saved.pending ?? [],
      handled: saved.handled ?? {},
    };
  } catch {
    return fallback;
  }
}

export async function saveData(data: AppData): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(data));
}
