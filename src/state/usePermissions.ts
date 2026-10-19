import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking } from 'react-native';

import { canSchedule, getPermissions, requestPermissions, type PermissionState } from '@/services/notifications';

/** Notification permission, re-checked whenever the app comes back from Settings. */
export function usePermissions() {
  const [state, setState] = useState<PermissionState | null>(null);

  const refresh = useCallback(() => {
    getPermissions().then(setState).catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    return () => sub.remove();
  }, [refresh]);

  /** Asks if the system still lets us; otherwise opens the app's settings. */
  const fix = useCallback(async () => {
    if (state?.notifications === 'denied') {
      await Linking.openSettings();
      return;
    }
    await requestPermissions();
    refresh();
  }, [state, refresh]);

  return { state, supported: canSchedule, refresh, fix };
}
