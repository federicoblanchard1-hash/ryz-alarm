import AsyncStorage from '@react-native-async-storage/async-storage';

import { defaultSettings, emptyData, newAlarm } from '@/core/defaults';
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

/** The phone's language and region, e.g. "fr-CH". */
export function deviceLocale(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale;
  } catch {
    return undefined;
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
        // Older versions also kept news topics; they're simply left out now.
        const { newsTopics: _topics, news: _news, ...rest } = (saved.settings ?? {}) as Partial<AppData['settings']> & { newsTopics?: unknown; news?: unknown };
        return { ...defaults, ...rest, profile: { ...defaults.profile, ...rest.profile } };
      })(),
      sleep: saved.sleep ?? [],
      sleepingSince: saved.sleepingSince ?? null,
      pending: saved.pending ?? [],
      handled: saved.handled ?? {},
      xp: saved.xp ?? { earned: 0, spent: 0, events: [] },
      proUntil: saved.proUntil ?? null,
      trialStartedAt: saved.trialStartedAt ?? null,
      trialEndSeen: saved.trialEndSeen ?? false,
      offer: saved.offer ?? null,
    };
  } catch {
    return fallback;
  }
}

export async function saveData(data: AppData): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(data));
}
