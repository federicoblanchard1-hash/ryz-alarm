import AsyncStorage from '@react-native-async-storage/async-storage';

import { defaultSettings, emptyData, newAlarm } from '@/core/defaults';
import { migrateTopicIds } from '@/core/news';
import type { AppData, Settings } from '@/core/types';

const KEY = 'ryz/data/v1';

/** Whether this phone shows a 24-hour clock. */
export function prefers24h(): boolean {
  try {
    return new Date(2020, 0, 1, 13).toLocaleTimeString().includes('13');
  } catch {
    return false;
  }
}

/** Fahrenheit where people use it, Celsius everywhere else. */
export function preferredTempUnit(): Settings['tempUnit'] {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    return /-(US|LR|MM|BS|BZ|KY|PW)\b/.test(locale) ? 'F' : 'C';
  } catch {
    return 'C';
  }
}

export async function loadData(): Promise<AppData> {
  const fallback = emptyData(prefers24h(), preferredTempUnit());
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return fallback;
    const saved = JSON.parse(raw) as Partial<AppData>;
    return {
      // Fill in fields added since the alarm was saved.
      alarms: (saved.alarms ?? []).map((a) => ({ ...newAlarm(a.id), ...a })),
      settings: (() => {
        const defaults = defaultSettings(prefers24h(), preferredTempUnit());
        const settings = { ...defaults, ...saved.settings, profile: { ...defaults.profile, ...saved.settings?.profile } };
        // Topics that moved category keep working.
        return settings.newsTopics ? { ...settings, newsTopics: migrateTopicIds(settings.newsTopics) } : settings;
      })(),
      sleep: saved.sleep ?? [],
      sleepingSince: saved.sleepingSince ?? null,
      pending: saved.pending ?? [],
      handled: saved.handled ?? {},
      xp: saved.xp ?? { earned: 0, spent: 0, events: [] },
      proUntil: saved.proUntil ?? null,
    };
  } catch {
    return fallback;
  }
}

export async function saveData(data: AppData): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(data));
}
