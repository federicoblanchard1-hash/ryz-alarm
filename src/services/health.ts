import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

import { nightsFromIntervals } from '@/core/sleep';
import type { SleepRecord } from '@/core/types';

// Sleep from a smartwatch, through Apple Health (iPhone, Apple Watch and any
// watch that writes to Health) or Health Connect (Android: Galaxy Watch,
// Pixel Watch, Fitbit, Garmin…). Both need native code, so they work in a
// development or store build, not in Expo Go. The modules are loaded lazily
// so Expo Go and web never touch them.

export type HealthState = 'ready' | 'needs-build' | 'unavailable' | 'denied';

export const HEALTH_APP = Platform.OS === 'ios' ? 'Apple Health' : 'Health Connect';

const inExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

type HealthKit = typeof import('@kingstinct/react-native-healthkit');
type HealthConnect = typeof import('react-native-health-connect');

function load<T>(get: () => T): T | null {
  try {
    return get();
  } catch {
    return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded only where the native module exists
const healthKit = (): HealthKit | null => (Platform.OS === 'ios' && !inExpoGo ? load(() => require('@kingstinct/react-native-healthkit') as HealthKit) : null);
// eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded only where the native module exists
const healthConnect = (): HealthConnect | null => (Platform.OS === 'android' && !inExpoGo ? load(() => require('react-native-health-connect') as HealthConnect) : null);

const SLEEP = 'HKCategoryTypeIdentifierSleepAnalysis' as const;
// HKCategoryValueSleepAnalysis: 1 asleep, 3 core, 4 deep, 5 REM (0 is in bed, 2 awake).
const ASLEEP = new Set([1, 3, 4, 5]);

/** Whether this phone can read sleep from a watch right now, without asking. */
export async function healthState(): Promise<HealthState> {
  if (Platform.OS === 'web') return 'unavailable';
  if (inExpoGo) return 'needs-build';
  if (Platform.OS === 'ios') {
    const hk = healthKit();
    if (!hk) return 'needs-build';
    return (await hk.isHealthDataAvailableAsync().catch(() => false)) ? 'ready' : 'unavailable';
  }
  const hc = healthConnect();
  if (!hc) return 'needs-build';
  const status = await hc.getSdkStatus().catch(() => 0);
  if (status !== hc.SdkAvailabilityStatus.SDK_AVAILABLE) return 'unavailable';
  return (await hc.initialize().catch(() => false)) ? 'ready' : 'unavailable';
}

/** Asks for permission to read sleep. True when granted (iOS never says if reading was refused; it just returns no data). */
export async function connectHealth(): Promise<HealthState> {
  const state = await healthState();
  if (state !== 'ready') return state;
  try {
    if (Platform.OS === 'ios') {
      await healthKit()!.requestAuthorization({ toRead: [SLEEP] });
      return 'ready';
    }
    const granted = await healthConnect()!.requestPermission([{ accessType: 'read', recordType: 'SleepSession' }]);
    return granted.some((p) => 'recordType' in p && p.recordType === 'SleepSession') ? 'ready' : 'denied';
  } catch {
    return 'denied';
  }
}

// Health Connect names the app that wrote the data; these are the common watch apps.
const WATCH_APPS: Record<string, string> = {
  'com.fitbit.FitbitMobile': 'Fitbit',
  'com.google.android.apps.fitness': 'Pixel Watch',
  'com.sec.android.app.shealth': 'Galaxy Watch',
  'com.garmin.android.apps.connectmobile': 'Garmin',
  'com.ouraring.oura': 'Oura Ring',
  'com.withings.wiscale2': 'Withings',
  'com.xiaomi.wearable': 'Xiaomi',
  'com.huawei.health': 'Huawei',
};

/** Nights the watch recorded between two times (ms), and the name of the watch that recorded the latest one. */
export async function readWatchNights(from: number, to: number): Promise<{ nights: SleepRecord[]; device: string | null }> {
  if (Platform.OS === 'ios') {
    const hk = healthKit();
    if (!hk) return { nights: [], device: null };
    const samples = await hk.queryCategorySamples(SLEEP, { limit: -1, ascending: true, filter: { date: { startDate: new Date(from), endDate: new Date(to) } } });
    const asleep = samples.filter((s) => ASLEEP.has(Number(s.value)));
    const last = asleep.at(-1);
    // "Federico's Apple Watch": the source's name is what the person called their watch.
    const device = last ? (last.sourceRevision?.source?.name || last.device?.name || null) : null;
    return { nights: nightsFromIntervals(asleep.map((s) => ({ start: s.startDate.getTime(), end: s.endDate.getTime() }))), device };
  }
  const hc = healthConnect();
  if (!hc) return { nights: [], device: null };
  const result = await hc.readRecords('SleepSession', { timeRangeFilter: { operator: 'between', startTime: new Date(from).toISOString(), endTime: new Date(to).toISOString() } });
  const meta = result.records.at(-1)?.metadata;
  const model = [meta?.device?.manufacturer, meta?.device?.model].filter(Boolean).join(' ');
  const device = model || (meta?.dataOrigin ? (WATCH_APPS[meta.dataOrigin] ?? meta.dataOrigin) : null);
  return { nights: nightsFromIntervals(result.records.map((r) => ({ start: Date.parse(r.startTime), end: Date.parse(r.endTime) }))), device };
}
