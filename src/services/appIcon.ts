import { Platform } from 'react-native';

import { APP_ICONS, type AppIconId } from '@/core/appIcons';

// Switching the app icon needs native code (expo-alternate-app-icons), so it
// works in a development or store build, not in Expo Go or on the web. The
// module is loaded lazily so Expo Go never touches it.

type Module = typeof import('expo-alternate-app-icons');

function load(): Module | null {
  if (Platform.OS === 'web') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded only where the native module exists
    return require('expo-alternate-app-icons') as Module;
  } catch {
    return null;
  }
}

const mod = load();

/** Whether this build can change its icon. */
export function canChangeIcon(): boolean {
  try {
    return Boolean(mod?.supportsAlternateIcons);
  } catch {
    return false;
  }
}

/** The icon that's on now. */
export function currentIcon(): AppIconId {
  try {
    const name = mod?.getAppIconName() ?? null;
    return APP_ICONS.find((i) => i.native === name)?.id ?? 'default';
  } catch {
    return 'default';
  }
}

/** Switches the icon. iPhone shows a short "You have changed the icon" message; that's the system, not Ryz. */
export async function setIcon(id: AppIconId): Promise<boolean> {
  if (!mod || !canChangeIcon()) return false;
  const icon = APP_ICONS.find((i) => i.id === id);
  await mod.setAlternateAppIcon(icon?.native ?? null);
  return true;
}
