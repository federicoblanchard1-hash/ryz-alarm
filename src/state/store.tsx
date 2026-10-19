import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState, StyleSheet, View } from 'react-native';

import { emptyData } from '@/core/defaults';
import { buildPlan } from '@/core/plan';
import { cleanup, defaultAlarmFor } from '@/core/ring';
import { nextClock } from '@/core/time';
import type { Alarm, AppData, Settings } from '@/core/types';
import { setupNotifications, syncSchedule } from '@/services/notifications';
import { loadData, preferredTempUnit, prefers24h, saveData } from './storage';

interface Store {
  ready: boolean;
  data: AppData;
  saveAlarm: (alarm: Alarm) => void;
  deleteAlarm: (id: string) => void;
  setEnabled: (id: string, enabled: boolean) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  /** Delete every alarm, setting and sleep record. */
  reset: () => void;
  /** For ring actions: stop, snooze, confirm awake, test. */
  update: (fn: (data: AppData, now: number) => AppData) => void;
}

const StoreContext = createContext<Store | null>(null);

/** A one-time alarm gets a concrete date when it's switched on. */
function withDate(alarm: Alarm, now: number): Alarm {
  if (alarm.days.length > 0 || !alarm.enabled) return { ...alarm, date: undefined };
  return { ...alarm, date: nextClock(alarm.hour, alarm.minute, now) };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<AppData>(() => emptyData(prefers24h(), preferredTempUnit()));
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadData(), setupNotifications()]).then(([loaded]) => {
      if (cancelled) return;
      setData(cleanup(loaded, Date.now()));
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Save and reschedule after every change. Debounced so a burst of edits
  // reschedules once.
  useEffect(() => {
    if (!ready) return;
    saveData(data).catch((error) => console.warn('Ryz: could not save', error));
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      const plan = buildPlan(data, Date.now());
      syncSchedule(plan, (id) => (id ? defaultAlarmFor(data, id)?.vibrate ?? true : true));
    }, 400);
  }, [data, ready]);

  // Coming back to the app: drop what's expired and re-plan, which also moves
  // follow-ups on to each alarm's next ring.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setData((d) => ({ ...cleanup(d, Date.now()) }));
    });
    return () => sub.remove();
  }, []);

  const update = useCallback((fn: (d: AppData, now: number) => AppData) => setData((d) => fn(d, Date.now())), []);

  const store = useMemo<Store>(
    () => ({
      ready,
      data,
      update,
      saveAlarm: (alarm) =>
        update((d, now) => {
          const saved = withDate(alarm, now);
          const exists = d.alarms.some((a) => a.id === alarm.id);
          return { ...d, alarms: exists ? d.alarms.map((a) => (a.id === alarm.id ? saved : a)) : [...d.alarms, saved] };
        }),
      deleteAlarm: (id) =>
        update((d) => ({ ...d, alarms: d.alarms.filter((a) => a.id !== id), pending: d.pending.filter((e) => e.alarmId !== id) })),
      setEnabled: (id, enabled) =>
        update((d, now) => ({ ...d, alarms: d.alarms.map((a) => (a.id === id ? withDate({ ...a, enabled }, now) : a)) })),
      updateSettings: (patch) => update((d) => ({ ...d, settings: { ...d.settings, ...patch } })),
      reset: () => setData(emptyData(prefers24h(), preferredTempUnit())),
    }),
    [ready, data, update],
  );

  // Screens read saved alarms as they open (the ringing screen decides what's
  // ringing from them), so nothing renders until they're loaded.
  return <StoreContext.Provider value={store}>{ready ? children : <View style={styles.loading} />}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside StoreProvider');
  return store;
}

export function sortedAlarms(alarms: Alarm[]): Alarm[] {
  return [...alarms].sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute));
}

const styles = StyleSheet.create({ loading: { flex: 1, backgroundColor: '#000000' } });
