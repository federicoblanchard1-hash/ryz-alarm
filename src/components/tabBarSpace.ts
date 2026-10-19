import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TAB_BAR_HEIGHT, space } from '@/theme';

/**
 * Room to leave at the bottom of a tab screen so nothing hides behind the tab
 * bar: iOS's floating bar sits over the content, Android's sits below it, and
 * the web preview's pill floats like iOS's.
 */
export function useTabBarSpace(): number {
  const insets = useSafeAreaInsets();
  if (Platform.OS === 'android') return space.lg;
  if (Platform.OS === 'ios') return insets.bottom + 64;
  return Math.max(insets.bottom, space.md) + TAB_BAR_HEIGHT + space.sm;
}
