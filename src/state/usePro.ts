import { router } from 'expo-router';

import { proStatus, type ProFeature } from '@/core/pro';
import { useNow } from './useNow';
import { useStore } from './store';

/** Pro or trial status, and `unlock(feature)` to open the paywall about that feature. */
export function usePro() {
  const { data } = useStore();
  const now = useNow(60_000);
  const status = proStatus(data, now);
  const unlock = (feature: ProFeature) => router.push({ pathname: '/pro', params: { feature } });
  return { pro: status.kind !== 'free', status, unlock };
}
