import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useEffect } from 'react';

/**
 * Keeps the screen on while mounted. Unlike `useKeepAwake`, closing the screen
 * before the lock is granted (fast on web) is not an error.
 */
export function useScreenAwake(tag: string) {
  useEffect(() => {
    const activated = activateKeepAwakeAsync(tag).catch(() => {});
    return () => {
      activated.then(() => deactivateKeepAwake(tag)).catch(() => {});
    };
  }, [tag]);
}
