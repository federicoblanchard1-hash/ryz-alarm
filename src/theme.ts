import { cubicBezier } from 'react-native-reanimated';

// Black and white. The only colour in the app is red, for errors and Delete.
export const colors = {
  bg: '#000000',
  // Cards and controls in iOS's dark greys, like Alarmy's layout.
  surface: '#1C1C1E',
  surfaceRaised: '#2C2C2E',
  border: '#2C2C2E',
  borderStrong: '#48484A',
  text: '#FFFFFF',
  textMuted: '#9A9A9F',
  textFaint: '#636366',
  accent: '#FFFFFF',
  onAccent: '#000000',
  danger: '#FF453A',
  dangerSoft: 'rgba(255, 69, 58, 0.12)',
  /** Panels laid over the weather scene. */
  glass: 'rgba(255, 255, 255, 0.08)',
  glassBorder: 'rgba(255, 255, 255, 0.14)',
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
/** The floating tab bar; tab screens leave this much room (plus the safe area) at the bottom. */
export const TAB_BAR_HEIGHT = 68;

export const radius = { sm: 10, md: 14, lg: 28, pill: 999 };

/** Strong ease-out for UI (animate-expo skill). Reanimated's CSS easing takes this object, not a 'cubic-bezier()' string. */
export const EASE_OUT = cubicBezier(0.23, 1, 0.32, 1);
